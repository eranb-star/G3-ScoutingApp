begin;
-- Payment header preserves who was paid and total balances at payment time.
-- Existing reimbursement rows remain the allocation ledger and are not rewritten.
create table if not exists public.finance_repayment_batches(
 id uuid primary key, recipient_id uuid not null references public.team_members(id) on delete restrict,
 recipient_name text not null, amount numeric(12,2) not null check(amount>0),currency text not null default 'ILS' check(currency='ILS'),
 paid_on date not null,method text not null,funding_source text not null,notes text,
 recorded_by uuid not null references public.team_members(id) on delete restrict,created_at timestamptz not null default now(),
 recipient_balance_before numeric(12,2) not null,recipient_balance_after numeric(12,2) not null,
 funds_after numeric(12,2) not null,request_payload jsonb not null
);
alter table public.finance_repayment_batches enable row level security;
drop policy if exists "admins read repayment batches" on public.finance_repayment_batches;
create policy "admins read repayment batches" on public.finance_repayment_batches for select to authenticated using(public.is_admin());
revoke all on public.finance_repayment_batches from anon,authenticated;
grant select on public.finance_repayment_batches to authenticated;
alter table public.finance_reimbursements add column if not exists batch_id uuid references public.finance_repayment_batches(id) on delete restrict;
create unique index if not exists finance_batch_expense_unique on public.finance_reimbursements(batch_id,expense_id) where batch_id is not null;

create or replace function public.record_recipient_repayment(
 p_recipient uuid,p_amount numeric,p_allocations jsonb,p_date date,p_method text,p_source text,p_note text,
 p_expected_balance numeric,p_expected_funds numeric,p_request uuid
) returns uuid language plpgsql security definer set search_path=public as $$
declare recipient text;balance numeric;funds numeric;total numeric;item record;expense_row public.finance_expenses;
 payload jsonb;previous public.finance_repayment_batches;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from team_members where id=auth.uid() and active) then raise exception 'Active administrator required' using errcode='42501';end if;
 if p_request is null or p_recipient is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>round(p_amount,2) or p_date is null or p_date>(now() at time zone 'Asia/Jerusalem')::date or nullif(trim(p_method),'') is null or nullif(trim(p_source),'') is null then raise exception 'Choose a recipient, valid payment date, amount, method and source';end if;
 if p_allocations is null or jsonb_typeof(p_allocations)<>'array' then raise exception 'Choose expenses to cover';end if;
 if jsonb_array_length(p_allocations)=0 or jsonb_array_length(p_allocations)>100 then raise exception 'Choose between 1 and 100 expenses';end if;
 payload=jsonb_build_object('recipient',p_recipient,'amount',p_amount,'allocations',p_allocations,'date',p_date,'method',trim(p_method),'source',trim(p_source),'note',nullif(trim(p_note),''));
 perform pg_advisory_xact_lock(6740,916);
 select * into previous from finance_repayment_batches where id=p_request;
 if found then
   if previous.request_payload<>payload then raise exception 'This request was already used for a different payment';end if;
   return previous.id;
 end if;
 -- Stabilize all cash and debt inputs, including legacy direct writers, until commit.
 lock table finance_expenses,finance_income,finance_reimbursements in share row exclusive mode;
 select display_name into recipient from team_members where id=p_recipient;
 if not found then raise exception 'Recipient not found';end if;
 select coalesce(sum(greatest(0,amount-reimbursed_amount)),0) into balance from finance_expenses where paid_by=p_recipient and payment_source='personal' and currency='ILS';
 select coalesce((select sum(amount) from finance_income where currency='ILS'),0)-coalesce((select sum(amount) from finance_expenses where currency='ILS' and payment_source in ('team_account','cash')),0)-coalesce((select sum(r.amount) from finance_reimbursements r join finance_expenses e on e.id=r.expense_id where e.currency='ILS'),0) into funds;
 if p_expected_balance is null or p_expected_funds is null or p_expected_balance<>balance or p_expected_funds<>funds then raise exception 'Balances changed. Close this dialog, refresh Finance and review the repayment again.';end if;
 if p_amount>balance then raise exception 'Payment exceeds the recipient total outstanding balance';end if;
 if p_amount>funds then raise exception 'Insufficient recorded team funds. Record missing income first.';end if;
 if exists(select 1 from jsonb_to_recordset(p_allocations) as a(expense_id uuid,amount numeric) where expense_id is null or amount is null or amount<=0 or amount::text in ('NaN','Infinity','-Infinity') or amount<>round(amount,2)) then raise exception 'Invalid expense allocation';end if;
 if (select count(*)<>count(distinct expense_id) from jsonb_to_recordset(p_allocations) as a(expense_id uuid,amount numeric)) then raise exception 'An expense can appear only once';end if;
 select sum(amount) into total from jsonb_to_recordset(p_allocations) as a(expense_id uuid,amount numeric);
 if total<>p_amount then raise exception 'Expense allocations must equal the repayment amount';end if;
 -- Validate every allocation before writing any ledger entry.
 for item in select * from jsonb_to_recordset(p_allocations) as a(expense_id uuid,amount numeric) order by expense_id loop
   select * into expense_row from finance_expenses where id=item.expense_id for update;
   if not found or expense_row.paid_by is distinct from p_recipient or expense_row.payment_source<>'personal' or expense_row.currency<>'ILS' then raise exception 'Each expense must belong to the selected recipient and be a personal ILS expense';end if;
   if item.amount>expense_row.amount-expense_row.reimbursed_amount then raise exception 'Allocation exceeds an expense outstanding balance';end if;
 end loop;
 insert into finance_repayment_batches(id,recipient_id,recipient_name,amount,paid_on,method,funding_source,notes,recorded_by,recipient_balance_before,recipient_balance_after,funds_after,request_payload)
 values(p_request,p_recipient,coalesce(recipient,'Unnamed member'),p_amount,p_date,trim(p_method),trim(p_source),nullif(trim(p_note),''),auth.uid(),balance,balance-p_amount,funds-p_amount,payload);
 for item in select * from jsonb_to_recordset(p_allocations) as a(expense_id uuid,amount numeric) loop
   insert into finance_reimbursements(expense_id,amount,reimbursed_on,payment_method,funding_source,notes,recorded_by,batch_id)
   values(item.expense_id,item.amount,p_date,trim(p_method),trim(p_source),nullif(trim(p_note),''),auth.uid(),p_request);
   update finance_expenses set reimbursed_amount=reimbursed_amount+item.amount,reimbursement_status=case when reimbursed_amount+item.amount=amount then 'reimbursed' else 'partial' end,updated_at=now() where id=item.expense_id;
 end loop;
 return p_request;
end$$;
revoke all on function public.record_recipient_repayment(uuid,numeric,jsonb,date,text,text,text,numeric,numeric,uuid) from public,anon;
grant execute on function public.record_recipient_repayment(uuid,numeric,jsonb,date,text,text,text,numeric,numeric,uuid) to authenticated;
commit;
