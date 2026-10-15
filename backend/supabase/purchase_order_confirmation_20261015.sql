-- Apply after purchase_reconciliation_20261015.sql.
begin;
alter table public.frc_purchase_requests add column approved_total_limit numeric(12,2) check(approved_total_limit>=0), add column approved_currency text check(approved_currency ~ '^[A-Z]{3}$');
alter table public.purchase_confirmed_orders add column order_details jsonb;

create function public.approve_purchase_budget(p_purchase uuid,p_revision integer,p_quantity numeric,p_remainder text,p_note text,p_limit numeric,p_currency text)
returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_limit is null or p_limit::text in ('NaN','Infinity','-Infinity') or p_limit<0 or p_limit<>round(p_limit,2) or p_currency is null or p_currency!~'^[A-Z]{3}$' then raise exception 'Enter the authorized total and currency';end if;
 perform pg_advisory_xact_lock(6740,916);
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or p_revision is null or r.revision<>p_revision then raise exception 'Approval changed. Reload before editing.';end if;
 if r.status='approved' then
  if p_quantity is distinct from r.approved_quantity or length(trim(coalesce(p_note,'')))<4 then raise exception 'Keep the approved quantity and explain the spending amendment';end if;
  if exists(select 1 from public.purchase_confirmed_orders where purchase_id=p_purchase) then raise exception 'This order is already confirmed; use its amendment workflow';end if;
 else
  r:=public.approve_purchase_revision(p_purchase,p_revision,p_quantity,p_remainder,p_note);
 end if;
 update public.frc_purchase_requests set approved_total_limit=p_limit,approved_currency=p_currency where id=p_purchase returning * into r;
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by)
 values(p_purchase,'approved','approved','Spending ceiling: '||p_currency||' '||p_limit::text||'. '||coalesce(p_note,''),auth.uid());
 return r;
end$$;
revoke all on function public.approve_purchase_budget(uuid,integer,numeric,text,text,numeric,text) from public,anon;
grant execute on function public.approve_purchase_budget(uuid,integer,numeric,text,text,numeric,text) to authenticated;

create function public.guard_purchase_spending_ceiling() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user in ('authenticated','anon') and (new.approved_total_limit is not null or new.approved_currency is not null) then
  if tg_op='INSERT' then raise exception 'Use the spending approval action';end if;
  if (new.approved_total_limit,new.approved_currency) is distinct from (old.approved_total_limit,old.approved_currency) then raise exception 'Use the spending approval action';end if;
 end if;
 if tg_op='UPDATE' and current_user in ('authenticated','anon') and (new.approved_total_limit,new.approved_currency) is distinct from (old.approved_total_limit,old.approved_currency) then raise exception 'Use the spending approval action';end if;
 return new;
end$$;
create trigger purchase_spending_ceiling_guard before insert or update on public.frc_purchase_requests for each row execute function public.guard_purchase_spending_ceiling();

create function public.confirm_purchase_order(p_purchase uuid,p_revision integer,p_quantity numeric,p_unit_price numeric,p_shipping numeric,p_discount numeric,p_currency text,p_supplier text,p_reference text,p_order_date date,p_expected_date date,p_reason text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests; total numeric; details jsonb; prior public.purchase_confirmed_orders; result uuid;
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
 if not found or p_revision is null or r.revision<>p_revision or r.status<>'approved' then raise exception 'Approval changed. Reload before ordering.';end if;
 if p_quantity>coalesce(r.approved_quantity,0) then raise exception 'Ordered quantity exceeds approved quantity. Amend approval first.';end if;
 if r.approved_total_limit is not null and (p_currency is distinct from r.approved_currency or total>r.approved_total_limit) then raise exception 'Order exceeds the authorized spending ceiling or currency. Amend approval first.';end if;
 result:=public.reconcile_purchase_order(p_purchase,p_revision,p_quantity,total,p_currency,'[]',p_reason,p_request);
 update public.purchase_confirmed_orders set supplier=trim(p_supplier),order_details=details where id=result;
 perform public.transition_purchase_revision(p_purchase,p_revision,'ordered','Confirmed actual order: '||p_currency||' '||total::text||'. '||trim(p_reason));
 return result;
end$$;
revoke all on function public.confirm_purchase_order(uuid,integer,numeric,numeric,numeric,numeric,text,text,text,date,date,text,uuid) from public,anon;
grant execute on function public.confirm_purchase_order(uuid,integer,numeric,numeric,numeric,numeric,text,text,text,date,date,text,uuid) to authenticated;
commit;
