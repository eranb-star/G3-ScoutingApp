-- G3 governed receiving and private administrator finance ledger.
begin;

alter table public.frc_purchase_requests add column if not exists actual_quantity numeric(12,2);
alter table public.frc_purchase_requests add column if not exists actual_cost numeric(12,2);
alter table public.frc_purchase_requests add column if not exists received_part_id uuid references public.frc_parts_inventory(id) on delete set null;
alter table public.frc_purchase_requests add column if not exists inventory_disposition text;
alter table public.frc_purchase_requests drop constraint if exists frc_purchase_inventory_disposition_check;
alter table public.frc_purchase_requests add constraint frc_purchase_inventory_disposition_check check(inventory_disposition is null or inventory_disposition in ('existing','new','expense_only'));

create table if not exists public.finance_expenses(
  id uuid primary key default gen_random_uuid(), purchase_id uuid unique references public.frc_purchase_requests(id) on delete set null,
  expense_date date not null default current_date, category text not null, vendor text, description text not null,
  amount numeric(12,2) not null check(amount>=0), currency text not null default 'ILS',
  paid_by uuid references public.team_members(id) on delete set null, payment_source text not null default 'personal' check(payment_source in ('personal','team_account','cash','other')),
  reimbursement_status text not null default 'not_required' check(reimbursement_status in ('not_required','owed','partial','reimbursed')),
  reimbursed_amount numeric(12,2) not null default 0 check(reimbursed_amount>=0 and reimbursed_amount<=amount),
  notes text, receipt_path text, created_by uuid not null references public.team_members(id) on delete restrict default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.finance_reimbursements(
  id uuid primary key default gen_random_uuid(), expense_id uuid not null references public.finance_expenses(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0), reimbursed_on date not null default current_date,
  payment_method text, funding_source text, notes text, recorded_by uuid not null references public.team_members(id) on delete restrict default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.finance_budgets(
  id uuid primary key default gen_random_uuid(), season integer not null, category text not null, allocated_amount numeric(12,2) not null check(allocated_amount>=0), currency text not null default 'ILS', notes text,
  created_by uuid not null references public.team_members(id) on delete restrict default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season,category)
);
create table if not exists public.finance_income(
  id uuid primary key default gen_random_uuid(), received_on date not null default current_date, source_type text not null check(source_type in ('fundraising','sponsorship','grant','donation','dues','other')),
  source_name text, amount numeric(12,2) not null check(amount>0), currency text not null default 'ILS', notes text,
  created_by uuid not null references public.team_members(id) on delete restrict default auth.uid(), created_at timestamptz not null default now()
);
create index if not exists finance_expenses_date_idx on public.finance_expenses(expense_date desc);
create index if not exists finance_expenses_reimbursement_idx on public.finance_expenses(reimbursement_status,paid_by);
create index if not exists finance_reimbursements_expense_idx on public.finance_reimbursements(expense_id,reimbursed_on desc);

alter table public.finance_expenses enable row level security;
alter table public.finance_reimbursements enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_income enable row level security;
drop policy if exists "members view purchase requests" on public.frc_purchase_requests;
drop policy if exists "requesters and admins view purchases" on public.frc_purchase_requests;
create policy "requesters and admins view purchases" on public.frc_purchase_requests for select to authenticated using(requested_by=auth.uid() or public.is_admin());
do $$ declare table_name text; begin foreach table_name in array array['finance_expenses','finance_reimbursements','finance_budgets','finance_income'] loop
  execute format('drop policy if exists "admins manage %1$s" on public.%1$I',table_name);
  execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using(public.is_admin()) with check(public.is_admin())',table_name);
end loop; end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('finance-receipts','finance-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "admins read finance receipts" on storage.objects;
create policy "admins read finance receipts" on storage.objects for select to authenticated using(bucket_id='finance-receipts' and public.is_admin());
drop policy if exists "admins upload finance receipts" on storage.objects;
create policy "admins upload finance receipts" on storage.objects for insert to authenticated with check(bucket_id='finance-receipts' and public.is_admin());
drop policy if exists "admins delete finance receipts" on storage.objects;
create policy "admins delete finance receipts" on storage.objects for delete to authenticated using(bucket_id='finance-receipts' and public.is_admin());

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

create or replace function public.record_finance_reimbursement(p_expense_id uuid,p_amount numeric,p_date date,p_method text,p_source text,p_note text default null)
returns public.finance_expenses language plpgsql security definer set search_path=public as $$
declare expense public.finance_expenses; new_total numeric;
begin
  if not public.is_admin() then raise exception 'Only administrators can record reimbursements'; end if;
  select * into expense from public.finance_expenses where id=p_expense_id for update;
  if not found or expense.payment_source<>'personal' then raise exception 'Personal expense not found'; end if;
  new_total:=expense.reimbursed_amount+p_amount;
  if p_amount<=0 or new_total>expense.amount then raise exception 'Reimbursement exceeds outstanding balance'; end if;
  insert into public.finance_reimbursements(expense_id,amount,reimbursed_on,payment_method,funding_source,notes,recorded_by) values(expense.id,p_amount,p_date,p_method,p_source,nullif(trim(coalesce(p_note,'')),''),auth.uid());
  update public.finance_expenses set reimbursed_amount=new_total,reimbursement_status=case when new_total=amount then 'reimbursed' else 'partial' end,updated_at=now() where id=expense.id returning * into expense;
  return expense;
end$$;
grant execute on function public.record_finance_reimbursement(uuid,numeric,date,text,text,text) to authenticated;

commit;
