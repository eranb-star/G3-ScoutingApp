begin;
create table public.finance_expense_refunds(
 id uuid primary key,expense_id uuid not null references public.finance_expenses(id),amount numeric(12,2) not null check(amount<>0),
 destination text not null check(destination in ('team_account','cash','original_payer')),refunded_on date not null,note text not null,
 recorded_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 reverses uuid unique references public.finance_expense_refunds(id),payload jsonb not null
);
create table public.finance_refund_recoveries(
 id uuid primary key,member_id uuid not null references public.team_members(id),amount numeric(12,2) not null check(amount>0),
 received_on date not null,source text not null,note text not null,recorded_by uuid not null references public.team_members(id),
 created_at timestamptz not null default now(),payload jsonb not null,income_id uuid not null references public.finance_income(id)
);
do $$declare t text;begin foreach t in array array['finance_expense_refunds','finance_refund_recoveries'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_refund_read on public.%I for select to authenticated using(public.is_admin() and exists(select 1 from public.team_members where id=auth.uid() and active))',t);
end loop;end$$;
create function public.record_finance_refund(p_expense uuid,p_amount numeric,p_destination text,p_date date,p_note text,p_request uuid,p_reverses uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.finance_expenses;r public.finance_expense_refunds;prior public.finance_expense_refunds;payload jsonb;signed_amount numeric;net numeric;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>round(p_amount,2) or p_destination is null or p_destination not in ('team_account','cash','original_payer') or p_date is null or p_date>(now() at time zone 'Asia/Jerusalem')::date or length(trim(coalesce(p_note,'')))<4 then raise exception 'Enter actual refund amount, destination, date and evidence';end if;
 payload:=jsonb_build_object('expense',p_expense,'amount',p_amount,'destination',p_destination,'date',p_date,'note',trim(p_note),'reverses',p_reverses);
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.finance_expense_refunds where id=p_request;
 if found then if prior.payload<>payload then raise exception 'Request ID already used';end if;return prior.id;end if;
 select * into e from public.finance_expenses where id=p_expense for update;
 if not found or e.duplicate_of is not null then raise exception 'Choose a retained expense';end if;
 if p_destination='original_payer' and (e.payment_source<>'personal' or e.paid_by is null) then raise exception 'Original payer refunds require a named personal payer';end if;
 signed_amount:=p_amount;
 if p_reverses is not null then
  select * into r from public.finance_expense_refunds where id=p_reverses;
  if not found or r.amount<>p_amount or r.amount<=0 or r.expense_id<>p_expense or r.destination<>p_destination or exists(select 1 from public.finance_expense_refunds where reverses=p_reverses) then raise exception 'Choose the exact unreversed refund';end if;
  signed_amount:=-p_amount;
 end if;
 select coalesce(sum(amount),0) into net from public.finance_expense_refunds where expense_id=p_expense;
 if net+signed_amount<0 or net+signed_amount>e.amount then raise exception 'Net refunds must stay within the original expense';end if;
 insert into public.finance_expense_refunds values(p_request,p_expense,signed_amount,p_destination,p_date,trim(p_note),auth.uid(),now(),p_reverses,payload);
 return p_request;
end$$;
revoke all on function public.record_finance_refund(uuid,numeric,text,date,text,uuid,uuid) from public,anon;
grant execute on function public.record_finance_refund(uuid,numeric,text,date,text,uuid,uuid) to authenticated;
create function public.recover_member_refund_credit(p_member uuid,p_amount numeric,p_date date,p_source text,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare balance numeric;payload jsonb;prior public.finance_refund_recoveries;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>round(p_amount,2) or p_date is null or p_date>(now() at time zone 'Asia/Jerusalem')::date or p_source is null or p_source not in ('team_account','cash') or length(trim(coalesce(p_note,'')))<4 then raise exception 'Enter actual returned credit and evidence';end if;
 payload:=jsonb_build_object('member',p_member,'amount',p_amount,'date',p_date,'source',p_source,'note',trim(p_note));
 perform pg_advisory_xact_lock(6740,916);select * into prior from public.finance_refund_recoveries where id=p_request;
 if found then if prior.payload<>payload then raise exception 'Request ID already used';end if;return prior.id;end if;
 select coalesce(sum(e.amount-e.reimbursed_amount),0)-coalesce((select sum(r.amount) from public.finance_expense_refunds r join public.finance_expenses x on x.id=r.expense_id where x.paid_by=p_member and x.currency='ILS' and r.destination='original_payer'),0)+coalesce((select sum(amount) from public.finance_refund_recoveries where member_id=p_member),0) into balance from public.finance_expenses e where e.paid_by=p_member and e.payment_source='personal' and e.currency='ILS';
 if p_amount>greatest(0,-balance) then raise exception 'Returned amount exceeds the member refund credit';end if;
 insert into public.finance_income(id,received_on,source_type,source_name,amount,currency,notes) values(p_request,p_date,'other','Returned member refund credit',p_amount,'ILS',trim(p_note));
 insert into public.finance_refund_recoveries values(p_request,p_member,p_amount,p_date,p_source,trim(p_note),auth.uid(),now(),payload,p_request);
 return p_request;
end$$;
revoke all on function public.recover_member_refund_credit(uuid,numeric,date,text,text,uuid) from public,anon;
grant execute on function public.recover_member_refund_credit(uuid,numeric,date,text,text,uuid) to authenticated;
create function public.guard_refunded_expense() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.finance_expense_refunds where expense_id=old.id) and (tg_op='DELETE' or (new.amount,new.currency,new.paid_by,new.payment_source,new.duplicate_of) is distinct from (old.amount,old.currency,old.paid_by,old.payment_source,old.duplicate_of)) then raise exception 'Refund history exists. Reverse or reconcile the refund before changing this expense.';end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create trigger refund_expense_guard before update or delete on public.finance_expenses for each row execute function public.guard_refunded_expense();
-- Legacy single-expense repayment cannot ignore refund offsets.
create function public.guard_refund_repayment() returns trigger language plpgsql security definer set search_path=public as $$
declare e public.finance_expenses;balance numeric;
begin
 perform pg_advisory_xact_lock(6740,916);select * into e from public.finance_expenses where id=new.expense_id;
 select coalesce(sum(x.amount-x.reimbursed_amount),0)-coalesce((select sum(r.amount) from public.finance_expense_refunds r join public.finance_expenses y on y.id=r.expense_id where y.paid_by=e.paid_by and y.currency=e.currency and r.destination='original_payer'),0)+case when e.currency='ILS' then coalesce((select sum(amount) from public.finance_refund_recoveries where member_id=e.paid_by),0) else 0 end into balance from public.finance_expenses x where x.paid_by=e.paid_by and x.payment_source='personal' and x.currency=e.currency;
 if new.amount>greatest(0,balance) then raise exception 'Repayment exceeds the member balance after supplier refunds';end if;
 return new;
end$$;
create trigger refund_repayment_guard before insert on public.finance_reimbursements for each row execute function public.guard_refund_repayment();
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
 balance:=balance-coalesce((select sum(r.amount) from finance_expense_refunds r join finance_expenses e on e.id=r.expense_id where e.paid_by=p_recipient and e.currency='ILS' and r.destination='original_payer'),0)+coalesce((select sum(amount) from finance_refund_recoveries where member_id=p_recipient),0);
 funds:=funds+coalesce((select sum(r.amount) from finance_expense_refunds r join finance_expenses e on e.id=r.expense_id where e.currency='ILS' and r.destination in ('team_account','cash')),0);
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
