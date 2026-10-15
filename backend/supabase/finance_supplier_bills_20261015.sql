-- Supplier documents reference the existing expense/payment ledger; no legacy rows are rewritten.
begin;
create table public.finance_supplier_bills(
 id uuid primary key,vendor text not null,reference text not null,document_date date not null,
 amount numeric(12,2) not null check(amount>=0),currency text not null check(currency~'^[A-Z]{3}$'),
 kind text not null check(kind in ('invoice','advance')),revision integer not null default 1,
 note text not null,receipt_path text,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 unique(vendor,reference,currency)
);
create table public.finance_bill_payments(
 id uuid not null default gen_random_uuid() unique,
 bill_id uuid not null references public.finance_supplier_bills(id),expense_id uuid not null references public.finance_expenses(id),
 amount numeric(12,2) not null check(amount>0),primary key(bill_id,expense_id)
);
create table public.finance_bill_orders(
 id uuid not null default gen_random_uuid() unique,
 bill_id uuid not null references public.finance_supplier_bills(id),order_id uuid not null references public.purchase_confirmed_orders(id),
 amount numeric(12,2) not null check(amount>0),primary key(bill_id,order_id)
);
create table public.finance_bill_events(
 id uuid primary key,bill_id uuid not null references public.finance_supplier_bills(id),actor_id uuid not null references public.team_members(id),
 created_at timestamptz not null default now(),payload jsonb not null,before_values jsonb,after_values jsonb not null
);
do $$declare t text;begin foreach t in array array['finance_supplier_bills','finance_bill_payments','finance_bill_orders','finance_bill_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using(public.is_admin() and exists(select 1 from public.team_members where id=auth.uid() and active))',t);
end loop;end$$;
create function public.save_supplier_bill(p_id uuid,p_revision integer,p_values jsonb,p_payments jsonb,p_orders jsonb,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare b public.finance_supplier_bills;e public.finance_expenses;o public.purchase_confirmed_orders;prior public.finance_bill_events;
 payload jsonb;v jsonb;allocated numeric;total numeric;paid numeric:=0;covered numeric:=0;bill_currency text;kind text;before_values jsonb;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_id is null or p_request is null or p_revision is null or p_values is null or jsonb_typeof(p_values)<>'object' or p_payments is null or jsonb_typeof(p_payments)<>'array' or p_orders is null or jsonb_typeof(p_orders)<>'array' or jsonb_array_length(p_orders)>100 or jsonb_array_length(p_payments)>100 then raise exception 'Invalid supplier document';end if;
 total:=(p_values->>'amount')::numeric;bill_currency:=p_values->>'currency';kind:=p_values->>'kind';
 if total is null or total::text in ('NaN','Infinity','-Infinity') or total<0 or total<>round(total,2) or bill_currency is null or bill_currency!~'^[A-Z]{3}$' or kind is null or kind not in ('invoice','advance') or length(trim(coalesce(p_values->>'vendor','')))=0 or length(trim(coalesce(p_values->>'reference','')))=0 or (p_values->>'document_date')::date is null or (p_values->>'document_date')::date>(now() at time zone 'Asia/Jerusalem')::date or length(trim(coalesce(p_values->>'note','')))<4 then raise exception 'Enter supplier, reference, amount, currency, date and explanation';end if;
 payload:=jsonb_build_object('id',p_id,'revision',p_revision,'values',p_values,'payments',p_payments,'orders',p_orders);
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.finance_bill_events where id=p_request;
 if found then if prior.payload<>payload then raise exception 'Request ID already used';end if;return prior.bill_id;end if;
 select * into b from public.finance_supplier_bills where id=p_id for update;
 if (found and b.revision<>p_revision) or (not found and p_revision<>0) then raise exception 'Supplier document changed. Reload before saving.';end if;
 if b.id is not null and (b.currency<>bill_currency or (b.kind='invoice' and kind='advance')) then raise exception 'Posted invoice currency and document type cannot be reversed';end if;
 if exists(select 1 from public.finance_supplier_bills x where x.id<>p_id and lower(trim(x.vendor))=lower(trim(p_values->>'vendor')) and lower(trim(x.reference))=lower(trim(p_values->>'reference')) and x.currency=bill_currency) then raise exception 'Supplier document already exists';end if;
 if (select count(*) from jsonb_array_elements(p_payments))<>(select count(distinct value->>'expense_id') from jsonb_array_elements(p_payments)) or (select count(*) from jsonb_array_elements(p_orders))<>(select count(distinct value->>'order_id') from jsonb_array_elements(p_orders)) then raise exception 'Select each payment and order once';end if;
 for v in select value from jsonb_array_elements(p_payments) loop
  select * into e from public.finance_expenses where id=(v->>'expense_id')::uuid for update;allocated:=(v->>'amount')::numeric;
  if not found or e.duplicate_of is not null or e.currency<>bill_currency or allocated is null or allocated::text in ('NaN','Infinity','-Infinity') or allocated<=0 or allocated<>round(allocated,2) or e.updated_at is distinct from (v->>'expected_updated_at')::timestamptz then raise exception 'Payment evidence changed or is invalid';end if;
  if e.purchase_id is not null or exists(select 1 from public.purchase_expense_allocations where expense_id=e.id) then raise exception 'This expense already covers a purchase directly. Reconcile its existing order link before allocating it to a supplier document.';end if;
  if allocated+coalesce((select sum(x.amount) from public.finance_bill_payments x where x.expense_id=e.id and x.bill_id<>p_id),0)>e.amount then raise exception 'Payment allocated above its actual expense value';end if;
  paid:=paid+allocated;
 end loop;
 if paid>total then raise exception 'Payments exceed this document. Record the supplier credit or corrected invoice first.';end if;
 for v in select value from jsonb_array_elements(p_orders) loop
  select * into o from public.purchase_confirmed_orders where id=(v->>'order_id')::uuid for update;allocated:=(v->>'amount')::numeric;
  if not found or o.currency<>bill_currency or allocated is null or allocated::text in ('NaN','Infinity','-Infinity') or allocated<=0 or allocated<>round(allocated,2) or o.revision is distinct from (v->>'expected_revision')::integer then raise exception 'Order changed or allocation is invalid';end if;
  if allocated+coalesce((select sum(x.amount) from public.finance_bill_orders x where x.order_id=o.id and x.bill_id<>p_id),0)+coalesce((select sum(x.amount) from public.purchase_expense_allocations x where x.order_id=o.id),0)>o.total-o.cancelled_amount then raise exception 'Invoice and expense allocations exceed the confirmed order';end if;
  covered:=covered+allocated;
 end loop;
 if covered>total then raise exception 'Order allocation exceeds the supplier document amount';end if;
 before_values:=jsonb_build_object('bill',to_jsonb(b),'payments',(select coalesce(jsonb_agg(x),'[]') from public.finance_bill_payments x where bill_id=p_id),'orders',(select coalesce(jsonb_agg(x),'[]') from public.finance_bill_orders x where bill_id=p_id));
 if nullif(p_values->>'receipt_path','') is not null then
  if p_values->>'receipt_path' not like 'bills/'||p_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='finance-receipts' and name=p_values->>'receipt_path') then raise exception 'Upload the receipt to this supplier document first';end if;
 end if;
 insert into public.finance_supplier_bills(id,vendor,reference,document_date,amount,currency,kind,note,receipt_path,created_by)
 values(p_id,trim(p_values->>'vendor'),trim(p_values->>'reference'),(p_values->>'document_date')::date,total,bill_currency,kind,trim(p_values->>'note'),nullif(p_values->>'receipt_path',''),auth.uid())
 on conflict(id) do update set vendor=excluded.vendor,reference=excluded.reference,document_date=excluded.document_date,amount=excluded.amount,kind=excluded.kind,note=excluded.note,receipt_path=excluded.receipt_path,revision=finance_supplier_bills.revision+1;
 delete from public.finance_bill_payments where bill_id=p_id;delete from public.finance_bill_orders where bill_id=p_id;
 insert into public.finance_bill_payments(bill_id,expense_id,amount) select p_id,(x->>'expense_id')::uuid,(x->>'amount')::numeric from jsonb_array_elements(p_payments) x;
 insert into public.finance_bill_orders(bill_id,order_id,amount) select p_id,(x->>'order_id')::uuid,(x->>'amount')::numeric from jsonb_array_elements(p_orders) x;
 insert into public.finance_bill_events values(p_request,p_id,auth.uid(),now(),payload,before_values,jsonb_build_object('bill',p_values,'payments',p_payments,'orders',p_orders));
 return p_id;
end$$;
revoke all on function public.save_supplier_bill(uuid,integer,jsonb,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.save_supplier_bill(uuid,integer,jsonb,jsonb,jsonb,uuid) to authenticated;
create function public.settle_supplier_bill(p_bill uuid,p_revision integer,p_amount numeric,p_source text,p_payer uuid,p_date date,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare b public.finance_supplier_bills;pay jsonb;orders jsonb;values jsonb;existing public.finance_expenses;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 perform pg_advisory_xact_lock(6740,916);
 select * into b from public.finance_supplier_bills where id=p_bill for update;
 if not found then raise exception 'Supplier document not found';end if;
 values:=jsonb_build_object('expense_date',p_date,'category','Robot parts','vendor',b.vendor,'description','Supplier document '||b.reference,'amount',p_amount,'currency',b.currency,'payment_source',p_source,'paid_by',p_payer,'notes',p_note,'bill_id',p_bill);
 select * into existing from public.finance_expenses where id=p_request;
 if found then
  if existing.entry_payload is distinct from values or not exists(select 1 from public.finance_bill_payments where bill_id=p_bill and expense_id=p_request) then raise exception 'Request ID already used';end if;
  return p_request;
 end if;
 if b.revision is distinct from p_revision then raise exception 'Supplier document changed. Reload before payment.';end if;
 if p_amount is null or p_amount<=0 or length(trim(coalesce(p_note,'')))<4 then raise exception 'Enter payment amount and evidence';end if;
 perform public.record_finance_expense(p_request,values);
 select coalesce(jsonb_agg(jsonb_build_object('expense_id',x.expense_id,'amount',x.amount,'expected_updated_at',e.updated_at)),'[]') into pay from public.finance_bill_payments x join public.finance_expenses e on e.id=x.expense_id where bill_id=p_bill;
 select pay||jsonb_build_array(jsonb_build_object('expense_id',p_request,'amount',p_amount,'expected_updated_at',updated_at)) into pay from public.finance_expenses where id=p_request;
 select coalesce(jsonb_agg(jsonb_build_object('order_id',x.order_id,'amount',x.amount,'expected_revision',o.revision)),'[]') into orders from public.finance_bill_orders x join public.purchase_confirmed_orders o on o.id=x.order_id where bill_id=p_bill;
 perform public.save_supplier_bill(p_bill,p_revision,to_jsonb(b),pay,orders,p_request);
 return p_request;
end$$;
revoke all on function public.settle_supplier_bill(uuid,integer,numeric,text,uuid,date,text,uuid) from public,anon;
grant execute on function public.settle_supplier_bill(uuid,integer,numeric,text,uuid,date,text,uuid) to authenticated;
-- Protect links even when an older client edits an expense or an order.
create function public.guard_supplier_bill_links() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='finance_expenses' then
  if exists(select 1 from public.finance_bill_payments where expense_id=old.id) and (tg_op='DELETE' or (new.amount,new.currency,new.paid_by,new.payment_source,new.purchase_id,new.duplicate_of) is distinct from (old.amount,old.currency,old.paid_by,old.payment_source,old.purchase_id,old.duplicate_of)) then raise exception 'Expense is supplier-document payment evidence. Correct document allocations first.';end if;
 elsif tg_table_name='purchase_expense_allocations' then
  if exists(select 1 from public.finance_bill_payments where expense_id=new.expense_id) then raise exception 'Expense is already linked through a supplier document';end if;
  if new.amount+coalesce((select sum(amount) from public.finance_bill_orders where order_id=new.order_id),0)+coalesce((select sum(amount) from public.purchase_expense_allocations where order_id=new.order_id and expense_id<>new.expense_id),0)>(select total-cancelled_amount from public.purchase_confirmed_orders where id=new.order_id) then raise exception 'Combined coverage exceeds the confirmed order';end if;
 else
  if new.total-new.cancelled_amount<coalesce((select sum(amount) from public.finance_bill_orders where order_id=new.id),0)+coalesce((select sum(amount) from public.purchase_expense_allocations where order_id=new.id),0) then raise exception 'Order amendment or cancellation overlaps recorded supplier documents';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create trigger supplier_payment_guard before update or delete on public.finance_expenses for each row execute function public.guard_supplier_bill_links();
create trigger supplier_order_coverage_guard before insert or update on public.purchase_expense_allocations for each row execute function public.guard_supplier_bill_links();
create trigger supplier_order_amendment_guard before update on public.purchase_confirmed_orders for each row execute function public.guard_supplier_bill_links();
commit;
