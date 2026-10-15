-- Split supplier orders share one approved quantity and spending ceiling. No historical values are rewritten.
begin;
create function public.refresh_purchase_delivery_state(p_purchase uuid) returns void language plpgsql security definer set search_path=public as $$
declare expected numeric;accepted numeric;
begin
 select coalesce(sum(quantity-cancelled_quantity),0) into expected from public.purchase_confirmed_orders where purchase_id=p_purchase;
 select coalesce(sum(d.accepted_quantity),0) into accepted from public.purchase_deliveries d join public.purchase_confirmed_orders o on o.id=d.order_id where o.purchase_id=p_purchase;
 update public.frc_purchase_requests set actual_quantity=accepted,status=case when accepted>=expected then 'received' else 'ordered' end,received_at=case when accepted>=expected then now() else null end,updated_at=now() where id=p_purchase;
end$$;
revoke all on function public.refresh_purchase_delivery_state(uuid) from public,anon,authenticated;
create function public.refresh_cancelled_purchase_state() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.refresh_purchase_delivery_state(new.purchase_id);return new;end$$;
create trigger cancelled_delivery_state after update of cancelled_quantity on public.purchase_confirmed_orders for each row when(old.cancelled_quantity is distinct from new.cancelled_quantity) execute function public.refresh_cancelled_purchase_state();
create or replace function public.confirm_purchase_order(p_purchase uuid,p_revision integer,p_quantity numeric,p_unit_price numeric,p_shipping numeric,p_discount numeric,p_currency text,p_supplier text,p_reference text,p_order_date date,p_expected_date date,p_reason text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests; total numeric; details jsonb; prior public.purchase_confirmed_orders; result uuid; used_quantity numeric; used_total numeric;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity') or p_quantity<=0 or p_quantity<>round(p_quantity,2)
 or p_unit_price is null or p_unit_price::text in ('NaN','Infinity','-Infinity') or p_unit_price<0 or p_unit_price<>round(p_unit_price,2)
 or p_shipping is null or p_shipping::text in ('NaN','Infinity','-Infinity') or p_shipping<0 or p_shipping<>round(p_shipping,2)
 or p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount<>round(p_discount,2)
 or p_order_date is null or p_order_date>(now() at time zone 'Asia/Jerusalem')::date or p_expected_date<p_order_date
 or length(trim(coalesce(p_supplier,'')))=0 or length(trim(coalesce(p_reason,'')))<4 then raise exception 'Confirm actual order details, date and reason';end if;
 total:=round(p_quantity*p_unit_price,2)+p_shipping-p_discount;
 if total<0 then raise exception 'Discount exceeds order value';end if;
 details:=jsonb_build_object('purchase',p_purchase,'revision',p_revision,'quantity',p_quantity,'unit_price',p_unit_price,'shipping',p_shipping,'discount',p_discount,'currency',p_currency,'supplier',trim(p_supplier),'reference',trim(coalesce(p_reference,'')),'order_date',p_order_date,'expected_date',p_expected_date,'reason',trim(p_reason),'tax_basis','inclusive');
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.purchase_confirmed_orders where id=p_request;
 if found then
  if prior.order_details is distinct from details then raise exception 'Request ID already used for different values';end if;
  return prior.id;
 end if;
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or p_revision is null or r.revision<>p_revision or r.status not in ('approved','ordered','received') then raise exception 'Approval changed. Reload before ordering.';end if;
 select coalesce(sum(quantity-cancelled_quantity),0),coalesce(sum(purchase_confirmed_orders.total-cancelled_amount),0) into used_quantity,used_total from public.purchase_confirmed_orders where purchase_id=p_purchase;
 if exists(select 1 from public.purchase_confirmed_orders where purchase_id=p_purchase and currency is distinct from p_currency) then raise exception 'Split orders must use the approval currency';end if;
 if p_quantity+used_quantity>coalesce(r.approved_quantity,0) then raise exception 'Ordered quantity exceeds approved quantity. Amend approval first.';end if;
 if r.approved_total_limit is not null and (p_currency is distinct from r.approved_currency or total+used_total>r.approved_total_limit) then raise exception 'Order exceeds the authorized spending ceiling or currency. Amend approval first.';end if;
 if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Valid currency required';end if;
 result:=p_request;
 insert into public.purchase_confirmed_orders(id,purchase_id,quantity,total,currency,supplier,confirmed_by,reason,request_payload,order_details)
 values(result,p_purchase,p_quantity,total,p_currency,trim(p_supplier),auth.uid(),trim(p_reason),details,details);
 update public.frc_purchase_requests set status='ordered',updated_at=now() where id=p_purchase;
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by)
 values(p_purchase,r.status,'ordered','Confirmed supplier order '||coalesce(p_reference,'')||': '||p_currency||' '||total||'. '||trim(p_reason),auth.uid());
 return result;
end$$;
create or replace function public.receive_confirmed_order(p_order uuid,p_revision integer,p_accepted numeric,p_rejected numeric,p_part uuid,p_stock_quantity numeric,p_stock_unit text,p_date date,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare o public.purchase_confirmed_orders;r public.frc_purchase_requests;prior public.purchase_deliveries;payload jsonb;received numeric;unit text;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_accepted is null or p_rejected is null or p_stock_quantity is null or p_accepted::text in ('NaN','Infinity','-Infinity') or p_rejected::text in ('NaN','Infinity','-Infinity') or p_stock_quantity::text in ('NaN','Infinity','-Infinity')
 or p_accepted<0 or p_rejected<0 or p_accepted+p_rejected<=0 or p_accepted<>round(p_accepted,2) or p_rejected<>round(p_rejected,2) or p_stock_quantity<0 or p_stock_quantity<>round(p_stock_quantity,3)
 or p_date is null or p_date>(now() at time zone 'Asia/Jerusalem')::date or length(trim(coalesce(p_note,'')))<4 then raise exception 'Enter valid delivery quantities, date and note';end if;
 if (p_part is null and p_stock_quantity<>0) or (p_part is not null and (p_accepted<=0 or p_stock_quantity<=0)) then raise exception 'Choose no stock for services, or enter accepted stock quantity and inventory item';end if;
 payload:=jsonb_build_object('order',p_order,'revision',p_revision,'accepted',p_accepted,'rejected',p_rejected,'part',p_part,'stock',p_stock_quantity,'unit',p_stock_unit,'date',p_date,'note',trim(p_note));
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.purchase_deliveries where id=p_request;
 if found then
  if prior.request_payload<>payload then raise exception 'Request ID already used for different values';end if;
  return prior.id;
 end if;
 select * into o from public.purchase_confirmed_orders where id=p_order for update;
 if not found or p_revision is null or o.revision<>p_revision then raise exception 'Order changed. Refresh before receiving.';end if;
 select * into r from public.frc_purchase_requests where id=o.purchase_id for update;
 if r.status not in ('ordered','received') then raise exception 'Only open ordered purchases accept deliveries';end if;
 select coalesce(sum(accepted_quantity),0) into received from public.purchase_deliveries where order_id=p_order;
 if received+p_accepted>o.quantity-o.cancelled_quantity then raise exception 'Accepted quantity exceeds the remaining order';end if;
 if p_part is not null then
  select i.unit into unit from public.frc_parts_inventory i where i.id=p_part for update;
  if not found or unit is distinct from p_stock_unit then raise exception 'Inventory item or unit changed. Check the conversion.';end if;
  update public.frc_parts_inventory set quantity=quantity+p_stock_quantity,updated_at=now() where id=p_part;
  insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id) values(p_part,p_stock_quantity,'received','Order '||p_order||': '||trim(p_note),auth.uid());
 end if;
 insert into public.purchase_deliveries values(p_request,p_order,p_accepted,p_rejected,p_part,p_stock_quantity,p_stock_unit,p_date,auth.uid(),now(),trim(p_note),payload);
 update public.purchase_confirmed_orders set revision=revision+1 where id=p_order;
 perform public.refresh_purchase_delivery_state(r.id);
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by) select r.id,r.status,status,'Delivery accepted '||p_accepted||', rejected '||p_rejected||'. No payment recorded. '||trim(p_note),auth.uid() from public.frc_purchase_requests where id=r.id;
 return p_request;
end$$;
create or replace function public.approve_purchase_budget(p_purchase uuid,p_revision integer,p_quantity numeric,p_remainder text,p_note text,p_limit numeric,p_currency text)
returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_limit is null or p_limit::text in ('NaN','Infinity','-Infinity') or p_limit<0 or p_limit<>round(p_limit,2) or p_currency is null or p_currency!~'^[A-Z]{3}$' then raise exception 'Enter the authorized total and currency';end if;
 perform pg_advisory_xact_lock(6740,916);
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or p_revision is null or r.revision<>p_revision then raise exception 'Approval changed. Reload before editing.';end if;
 if r.status in ('approved','ordered','received') then
  if p_quantity is distinct from r.approved_quantity or length(trim(coalesce(p_note,'')))<4 then raise exception 'Keep the approved quantity and explain the spending amendment';end if;
  if exists(select 1 from public.purchase_confirmed_orders where purchase_id=p_purchase and currency<>p_currency) or p_limit<(select coalesce(sum(total-cancelled_amount),0) from public.purchase_confirmed_orders where purchase_id=p_purchase) then raise exception 'Approval cannot be below confirmed obligations or change their currency';end if;
 else
  r:=public.approve_purchase_revision(p_purchase,p_revision,p_quantity,p_remainder,p_note);
 end if;
 update public.frc_purchase_requests set approved_total_limit=p_limit,approved_currency=p_currency where id=p_purchase returning * into r;
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by)
 values(p_purchase,r.status,r.status,'Spending ceiling: '||p_currency||' '||p_limit::text||'. '||coalesce(p_note,''),auth.uid());
 return r;
end$$;
commit;


