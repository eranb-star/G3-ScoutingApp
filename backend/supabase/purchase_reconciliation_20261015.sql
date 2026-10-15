-- Additive reconciliation foundation. No historical money or stock is rewritten.
begin;
create table public.purchase_confirmed_orders (
 id uuid primary key, purchase_id uuid not null references public.frc_purchase_requests(id) on delete restrict,
 quantity numeric(12,2) not null check(quantity>0), total numeric(12,2) not null check(total>=0),
 currency text not null check(currency ~ '^[A-Z]{3}$'), supplier text,
 cancelled_amount numeric(12,2) not null default 0 check(cancelled_amount>=0 and cancelled_amount<=total),
 cancelled_quantity numeric(12,2) not null default 0 check(cancelled_quantity>=0 and cancelled_quantity<=quantity),
 revision integer not null default 1, confirmed_by uuid not null references public.team_members(id),
 confirmed_at timestamptz not null default now(), reason text not null,
 request_payload jsonb not null
);
create table public.purchase_expense_allocations (
 order_id uuid not null references public.purchase_confirmed_orders(id) on delete restrict,
 expense_id uuid not null references public.finance_expenses(id) on delete restrict,
 amount numeric(12,2) not null check(amount>0),
 primary key(order_id,expense_id)
);
create table public.purchase_reconciliation_events (
 id uuid primary key, purchase_id uuid not null references public.frc_purchase_requests(id),
 actor_id uuid not null references public.team_members(id), created_at timestamptz not null default now(),
 reason text not null, before_values jsonb not null, after_values jsonb not null, request_payload jsonb not null
);
alter table public.purchase_confirmed_orders enable row level security;
alter table public.purchase_expense_allocations enable row level security;
alter table public.purchase_reconciliation_events enable row level security;
revoke all on public.purchase_confirmed_orders,public.purchase_expense_allocations,public.purchase_reconciliation_events from public,anon,authenticated;
grant select on public.purchase_confirmed_orders,public.purchase_expense_allocations,public.purchase_reconciliation_events to authenticated;
create policy "admin read confirmed orders" on public.purchase_confirmed_orders for select to authenticated using(public.is_admin());
create policy "admin read expense allocations" on public.purchase_expense_allocations for select to authenticated using(public.is_admin());
create policy "admin read reconciliation events" on public.purchase_reconciliation_events for select to authenticated using(public.is_admin());

-- Explicit administrator confirmation only. Preview carries purchase revision and
-- expense amount/update timestamps to reject a stale reconciliation.
create function public.reconcile_purchase_order(p_purchase uuid,p_revision integer,p_quantity numeric,p_total numeric,p_currency text,p_allocations jsonb,p_reason text,p_request uuid,p_order uuid default null,p_order_revision integer default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests; e public.finance_expenses; a jsonb; payload jsonb; previous public.purchase_reconciliation_events;
 covered numeric:=0; allocated numeric; old_values jsonb; existing_order public.purchase_confirmed_orders; order_id uuid;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required' using errcode='42501';end if;
 if p_request is null or p_revision is null or p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity') or p_quantity<=0 or p_quantity<>round(p_quantity,2)
 or p_total is null or p_total::text in ('NaN','Infinity','-Infinity') or p_total<0 or p_total<>round(p_total,2)
 or p_currency is null or p_currency !~ '^[A-Z]{3}$' or length(trim(coalesce(p_reason,'')))<4 then raise exception 'Confirm quantity, total, currency and reason';end if;
 if p_allocations is null or jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)>100 then raise exception 'Invalid expense allocations';end if;
 payload:=jsonb_build_object('purchase',p_purchase,'revision',p_revision,'quantity',p_quantity,'total',p_total,'currency',p_currency,'allocations',p_allocations,'reason',trim(p_reason),'order',p_order,'order_revision',p_order_revision);
 -- Same lock as reimbursements: prevent changes while preview values are checked.
 perform pg_advisory_xact_lock(6740,916);
 select * into previous from public.purchase_reconciliation_events where id=p_request;
 if found then
  if previous.request_payload<>payload then raise exception 'Request ID already used for different values';end if;
  return (previous.after_values->>'order_id')::uuid;
 end if;
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or r.revision<>p_revision then raise exception 'Purchase changed. Refresh and review again.';end if;
 if r.status not in ('approved','ordered','received') then raise exception 'Only approved, ordered or received purchases can be reconciled';end if;
 if p_order is null then
  if exists(select 1 from public.purchase_confirmed_orders where purchase_id=p_purchase) then raise exception 'Order already confirmed. Use an order amendment instead.';end if;
  order_id:=p_request;
 else
  select * into existing_order from public.purchase_confirmed_orders where id=p_order and purchase_id=p_purchase for update;
  if not found or p_order_revision is null or existing_order.revision<>p_order_revision then raise exception 'Order changed. Refresh and review again.';end if;
  if (existing_order.cancelled_amount>0 or existing_order.cancelled_quantity>0) and (p_quantity,p_total,p_currency) is distinct from (existing_order.quantity,existing_order.total,existing_order.currency) then raise exception 'Cancelled order scope is fixed; you may still correct expense links';end if;
  order_id:=p_order;
 end if;
 if (select count(*) from jsonb_array_elements(p_allocations))<>(select count(distinct value->>'expense_id') from jsonb_array_elements(p_allocations)) then raise exception 'Select each expense once';end if;
 old_values:=jsonb_build_object('purchase',to_jsonb(r),'order',to_jsonb(existing_order),'allocations',(select coalesce(jsonb_agg(x),'[]') from public.purchase_expense_allocations x where x.order_id=p_order));
 for a in select value from jsonb_array_elements(p_allocations) loop
  select * into e from public.finance_expenses where id=(a->>'expense_id')::uuid for update;
  if not found or e.currency<>p_currency then raise exception 'Expense not found or currency differs';end if;
  if e.amount is distinct from (a->>'expected_amount')::numeric or e.updated_at is distinct from (a->>'expected_updated_at')::timestamptz then raise exception 'Expense changed. Refresh the reconciliation preview.';end if;
  allocated:=(a->>'amount')::numeric;
  if allocated is null or allocated::text in ('NaN','Infinity','-Infinity') or allocated<=0 or allocated<>round(allocated,2) then raise exception 'Enter a valid allocation';end if;
  -- A legacy link to another purchase is already reserved. Do not silently move it.
  if e.purchase_id is not null and e.purchase_id<>p_purchase then raise exception 'Expense is linked to another purchase. Resolve that link first.';end if;
  if allocated+coalesce((select sum(x.amount) from public.purchase_expense_allocations x where x.expense_id=e.id and x.order_id is distinct from p_order),0)>e.amount then raise exception 'Allocation exceeds expense value';end if;
  covered:=covered+allocated;
 end loop;
 if covered>p_total-coalesce(existing_order.cancelled_amount,0) then raise exception 'Expense allocations exceed the uncancelled confirmed total';end if;
 if p_order is null then
  insert into public.purchase_confirmed_orders(id,purchase_id,quantity,total,currency,supplier,confirmed_by,reason,request_payload)
  values(order_id,r.id,p_quantity,p_total,p_currency,r.supplier,auth.uid(),trim(p_reason),payload);
 else
  update public.purchase_confirmed_orders set quantity=p_quantity,total=p_total,currency=p_currency,revision=revision+1,reason=trim(p_reason) where id=p_order;
  delete from public.purchase_expense_allocations x where x.order_id=p_order;
 end if;
 insert into public.purchase_expense_allocations(order_id,expense_id,amount)
 select order_id,(value->>'expense_id')::uuid,(value->>'amount')::numeric from jsonb_array_elements(p_allocations);
 insert into public.purchase_reconciliation_events(id,purchase_id,actor_id,reason,before_values,after_values,request_payload)
 values(p_request,r.id,auth.uid(),trim(p_reason),old_values,jsonb_build_object('order_id',order_id,'quantity',p_quantity,'total',p_total,'covered',covered,'remaining',p_total-coalesce(existing_order.cancelled_amount,0)-covered,'expense_change',0,'reimbursement_change',0),payload);
 return order_id;
end$$;
revoke all on function public.reconcile_purchase_order(uuid,integer,numeric,numeric,text,jsonb,text,uuid,uuid,integer) from public,anon;
grant execute on function public.reconcile_purchase_order(uuid,integer,numeric,numeric,text,jsonb,text,uuid,uuid,integer) to authenticated;

-- Once allocated, old clients cannot overwrite financial evidence with a later
-- receive/payment upsert. Dedicated amendment support must preserve this guard.
create function public.guard_allocated_expense() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from public.purchase_expense_allocations where expense_id=old.id) and
 (tg_op='DELETE' or (new.amount,new.currency,new.purchase_id,new.paid_by,new.payment_source) is distinct from (old.amount,old.currency,old.purchase_id,old.paid_by,old.payment_source)) then
  raise exception 'This expense is reconciled. Use the finance amendment workflow; existing allocations and repayments must be preserved.';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create trigger guard_allocated_expense before update or delete on public.finance_expenses for each row execute function public.guard_allocated_expense();
commit;
