-- Connect ordered purchases to the private finance ledger without waiting for delivery.
begin;

create or replace function public.record_purchase_payment(p_purchase_id uuid,p_amount numeric,p_paid_on date,p_payment_source text,p_paid_by uuid default null,p_note text default null)
returns public.finance_expenses language plpgsql security definer set search_path=public as $$
declare request public.frc_purchase_requests; expense public.finance_expenses; expense_status text;
begin
  if not public.is_admin() then raise exception 'Only administrators can record purchase payments'; end if;
  if p_amount is null or p_amount<0 then raise exception 'Actual paid amount is required'; end if;
  if p_payment_source not in ('personal','team_account','cash','other') then raise exception 'Choose a valid payment source'; end if;
  if p_payment_source='personal' and p_paid_by is null then raise exception 'Choose who paid personally'; end if;
  select * into request from public.frc_purchase_requests where id=p_purchase_id for update;
  if not found or request.status not in ('ordered','received') then raise exception 'Only ordered or received purchases can be paid'; end if;
  expense_status:=case when p_payment_source='personal' then 'owed' else 'not_required' end;
  insert into public.finance_expenses(purchase_id,expense_date,category,vendor,description,amount,paid_by,payment_source,reimbursement_status,notes,created_by)
  values(request.id,p_paid_on,'Purchasing',request.supplier,request.item_name,p_amount,case when p_payment_source='personal' then p_paid_by else null end,p_payment_source,expense_status,nullif(trim(coalesce(p_note,'')),''),auth.uid())
  on conflict(purchase_id) do update set expense_date=excluded.expense_date,vendor=excluded.vendor,description=excluded.description,amount=excluded.amount,paid_by=excluded.paid_by,payment_source=excluded.payment_source,reimbursement_status=case when finance_expenses.reimbursed_amount>=excluded.amount then 'reimbursed' when finance_expenses.reimbursed_amount>0 then 'partial' else excluded.reimbursement_status end,notes=coalesce(excluded.notes,finance_expenses.notes),updated_at=now()
  returning * into expense;
  update public.frc_purchase_requests set actual_cost=p_amount,updated_at=now() where id=request.id;
  return expense;
end$$;
grant execute on function public.record_purchase_payment(uuid,numeric,date,text,uuid,text) to authenticated;

create or replace function public.receive_purchase_request(
  p_purchase_id uuid,p_quantity numeric,p_actual_cost numeric,p_disposition text,p_existing_part_id uuid default null,
  p_category text default null,p_part_number text default null,p_unit text default 'pcs',p_location text default null,
  p_payment_source text default 'personal',p_paid_by uuid default null,p_note text default null
) returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare request public.frc_purchase_requests; target_part uuid; expense_status text; old_status text;
begin
  if not public.is_admin() then raise exception 'Only administrators can receive purchases'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Received quantity must be greater than zero'; end if;
  if p_actual_cost is null or p_actual_cost<0 then raise exception 'Actual cost is required'; end if;
  if p_disposition not in ('existing','new','expense_only') then raise exception 'Choose an inventory disposition'; end if;
  select * into request from public.frc_purchase_requests where id=p_purchase_id for update;
  if not found or request.status<>'ordered' then raise exception 'Only an ordered purchase can be received'; end if;
  old_status:=request.status;
  if p_disposition='existing' then
    target_part:=coalesce(p_existing_part_id,request.part_id);
    if target_part is null then raise exception 'Choose an inventory item'; end if;
    update public.frc_parts_inventory set quantity=quantity+p_quantity,unit_cost=case when p_quantity>0 then p_actual_cost/p_quantity else unit_cost end,updated_at=now() where id=target_part;
    if not found then raise exception 'Inventory item not found'; end if;
    insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id) values(target_part,p_quantity,'received',coalesce(p_note,'Purchase '||p_purchase_id),auth.uid());
  elsif p_disposition='new' then
    if length(trim(coalesce(p_category,'')))<2 or length(trim(coalesce(p_location,'')))<1 then raise exception 'Category and storage location are required for a new inventory item'; end if;
    insert into public.frc_parts_inventory(name,category,part_number,quantity,minimum_quantity,unit,location,supplier,unit_cost,created_by)
    values(request.item_name,trim(p_category),nullif(trim(coalesce(p_part_number,'')),''),p_quantity,0,coalesce(nullif(trim(p_unit),''),'pcs'),trim(p_location),request.supplier,case when p_quantity>0 then p_actual_cost/p_quantity else null end,auth.uid()) returning id into target_part;
    insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id) values(target_part,p_quantity,'received',coalesce(p_note,'Purchase '||p_purchase_id),auth.uid());
  end if;
  expense_status:=case when p_payment_source='personal' then 'owed' else 'not_required' end;
  insert into public.finance_expenses(purchase_id,category,vendor,description,amount,paid_by,payment_source,reimbursement_status,notes,created_by)
  values(request.id,coalesce(nullif(trim(coalesce(p_category,'')),''),'Purchasing'),request.supplier,request.item_name,p_actual_cost,case when p_payment_source='personal' then coalesce(p_paid_by,auth.uid()) else p_paid_by end,p_payment_source,expense_status,nullif(trim(coalesce(p_note,'')),''),auth.uid())
  on conflict(purchase_id) do update set category=excluded.category,vendor=excluded.vendor,description=excluded.description,amount=excluded.amount,paid_by=excluded.paid_by,payment_source=excluded.payment_source,reimbursement_status=case when finance_expenses.reimbursed_amount>=excluded.amount then 'reimbursed' when finance_expenses.reimbursed_amount>0 then 'partial' else excluded.reimbursement_status end,notes=coalesce(excluded.notes,finance_expenses.notes),updated_at=now();
  update public.frc_purchase_requests set status='received',actual_quantity=p_quantity,actual_cost=p_actual_cost,received_part_id=target_part,inventory_disposition=p_disposition,received_at=now(),updated_at=now() where id=request.id returning * into request;
  insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by) values(request.id,old_status,'received',coalesce(nullif(trim(coalesce(p_note,'')),''),'Received and financially recorded'),auth.uid());
  perform public.sync_team_action('purchase_request_status',request.id,'Purchase request received: '||request.item_name,'Received quantity: '||p_quantity||'.','announcement','member',request.requested_by::text,null,'normal','/tools?tab=purchasing&purchase='||request.id,auth.uid(),false);
  return request;
end$$;
grant execute on function public.receive_purchase_request(uuid,numeric,numeric,text,uuid,text,text,text,text,text,uuid,text) to authenticated;

commit;
