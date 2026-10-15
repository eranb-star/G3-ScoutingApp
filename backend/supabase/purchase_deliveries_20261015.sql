-- Actual deliveries are independent of bills and payments.
begin;
create table public.purchase_deliveries(
 id uuid primary key,order_id uuid not null references public.purchase_confirmed_orders(id),
 accepted_quantity numeric(12,2) not null check(accepted_quantity>=0),rejected_quantity numeric(12,2) not null check(rejected_quantity>=0),
 part_id uuid references public.frc_parts_inventory(id),stock_quantity numeric(12,3) not null check(stock_quantity>=0),stock_unit text,
 received_on date not null,recorded_by uuid not null references public.team_members(id),recorded_at timestamptz not null default now(),
 note text not null,request_payload jsonb not null,check(accepted_quantity+rejected_quantity>0)
);
alter table public.purchase_deliveries enable row level security;
revoke all on public.purchase_deliveries from public,anon,authenticated;
grant select on public.purchase_deliveries to authenticated;
create policy "admins read deliveries" on public.purchase_deliveries for select to authenticated using(public.is_admin());
create function public.guard_received_order_quantity() returns trigger language plpgsql set search_path=public as $$
begin
 if new.quantity<(select coalesce(sum(accepted_quantity),0) from public.purchase_deliveries where order_id=new.id) then raise exception 'Order quantity cannot be less than accepted deliveries';end if;
 return new;
end$$;
create trigger received_order_quantity_guard before update of quantity on public.purchase_confirmed_orders for each row execute function public.guard_received_order_quantity();

create function public.receive_confirmed_order(p_order uuid,p_revision integer,p_accepted numeric,p_rejected numeric,p_part uuid,p_stock_quantity numeric,p_stock_unit text,p_date date,p_note text,p_request uuid)
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
 if r.status<>'ordered' then raise exception 'Only open ordered purchases accept deliveries';end if;
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
 update public.frc_purchase_requests set actual_quantity=received+p_accepted,status=case when received+p_accepted=o.quantity-o.cancelled_quantity then 'received' else 'ordered' end,received_at=case when received+p_accepted=o.quantity-o.cancelled_quantity then now() else received_at end,updated_at=now() where id=r.id;
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by) values(r.id,'ordered',case when received+p_accepted=o.quantity-o.cancelled_quantity then 'received' else 'ordered' end,'Delivery: accepted '||p_accepted||', rejected '||p_rejected||'. No payment recorded. '||trim(p_note),auth.uid());
 return p_request;
end$$;
revoke all on function public.receive_confirmed_order(uuid,integer,numeric,numeric,uuid,numeric,text,date,text,uuid) from public,anon;
grant execute on function public.receive_confirmed_order(uuid,integer,numeric,numeric,uuid,numeric,text,date,text,uuid) to authenticated;

-- Old receiving/payment clients must not create or overwrite a bill for a
-- confirmed order. Their entire transaction rolls back, including any stock.
create function public.guard_legacy_confirmed_order_expense() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.purchase_id is not null and exists(select 1 from public.purchase_confirmed_orders where purchase_id=new.purchase_id) then
  raise exception 'This order uses separate delivery and expense records. Open the updated Purchasing / Finance workspace.';
 end if;
 return new;
end$$;
create trigger guard_legacy_confirmed_order_expense before insert on public.finance_expenses for each row execute function public.guard_legacy_confirmed_order_expense();
commit;
