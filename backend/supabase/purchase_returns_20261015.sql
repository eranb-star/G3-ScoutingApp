begin;
create table public.purchase_returns(id uuid primary key,delivery_id uuid not null references public.purchase_deliveries(id),quantity numeric(12,2) not null check(quantity>0),stock_quantity numeric(12,3) not null check(stock_quantity>=0),returned_on date not null,note text not null,recorded_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),request_payload jsonb not null);
alter table public.purchase_returns enable row level security;
revoke all on public.purchase_returns from public,anon,authenticated;
grant select on public.purchase_returns to authenticated;
create policy admin_return_read on public.purchase_returns for select to authenticated using(public.is_admin() and exists(select 1 from public.team_members where id=auth.uid() and active));
create function public.return_purchase_delivery(p_delivery uuid,p_quantity numeric,p_date date,p_note text,p_request uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare d public.purchase_deliveries;prior public.purchase_returns;payload jsonb;returned numeric;stock_returned numeric;delta numeric;available numeric;unit text;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity') or p_quantity<=0 or p_quantity<>round(p_quantity,2) or p_date is null or p_date>(now() at time zone 'Asia/Jerusalem')::date or length(trim(coalesce(p_note,'')))<4 then raise exception 'Enter actual returned quantity, date and reason';end if;
 payload:=jsonb_build_object('delivery',p_delivery,'quantity',p_quantity,'date',p_date,'note',trim(p_note));perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.purchase_returns where id=p_request;if found then if prior.request_payload<>payload then raise exception 'Request ID already used';end if;return prior.id;end if;
 select * into d from public.purchase_deliveries where id=p_delivery for update;if not found or d.accepted_quantity<=0 or p_date<d.received_on then raise exception 'Choose an accepted delivery and a date on or after receipt';end if;
 select coalesce(sum(quantity),0),coalesce(sum(stock_quantity),0) into returned,stock_returned from public.purchase_returns where delivery_id=p_delivery;
 if returned+p_quantity>d.accepted_quantity then raise exception 'Return exceeds accepted quantity not already returned';end if;
 delta:=case when returned+p_quantity=d.accepted_quantity then d.stock_quantity-stock_returned else round(d.stock_quantity*p_quantity/d.accepted_quantity,3) end;
 if d.part_id is not null then
  select quantity,i.unit into available,unit from public.frc_parts_inventory i where id=d.part_id for update;
  if not found or unit is distinct from d.stock_unit or available<delta then raise exception 'Not enough stock, or inventory unit changed. Review inventory before returning.';end if;
  if delta<=0 then raise exception 'Return is below inventory precision';end if;
  update public.frc_parts_inventory set quantity=quantity-delta,updated_at=now() where id=d.part_id;
  insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id) values(d.part_id,-delta,'returned','Supplier return for delivery '||d.id||': '||trim(p_note),auth.uid());
 end if;
 insert into public.purchase_returns values(p_request,p_delivery,p_quantity,delta,p_date,trim(p_note),auth.uid(),now(),payload);
 -- A return never silently reorders, creates a refund, or rewrites accepted history.
 return p_request;
end$$;
revoke all on function public.return_purchase_delivery(uuid,numeric,date,text,uuid) from public,anon;
grant execute on function public.return_purchase_delivery(uuid,numeric,date,text,uuid) to authenticated;
commit;
