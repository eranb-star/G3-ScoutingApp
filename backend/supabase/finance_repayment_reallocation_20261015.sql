begin;
-- Reclassify an existing payment; never create or delete cash movements.
create table public.finance_repayment_corrections(
 id uuid primary key, actor_id uuid not null references public.team_members(id),
 created_at timestamptz not null default now(), reason text not null,
 request_payload jsonb not null, before_values jsonb not null, after_values jsonb not null
);
alter table public.finance_repayment_corrections enable row level security;
revoke all on public.finance_repayment_corrections from public,anon,authenticated;
grant select on public.finance_repayment_corrections to authenticated;
create policy repayment_correction_admin_read on public.finance_repayment_corrections for select to authenticated using(public.is_admin());
-- Multiple original allocations in the same batch may now cover the surviving
-- expense. Preserve their IDs, dates and amounts rather than merging ledger rows.
drop index if exists public.finance_batch_expense_unique;
create function public.guard_repayment_batch_allocation() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,916);
 if new.batch_id is not null and exists(select 1 from public.finance_reimbursements where batch_id=new.batch_id and expense_id=new.expense_id) then raise exception 'This batch already includes that expense';end if;
 return new;
end$$;
create trigger guard_repayment_batch_allocation before insert on public.finance_reimbursements for each row execute function public.guard_repayment_batch_allocation();
create function public.reallocate_duplicate_repayments(p_expense uuid,p_survivor uuid,p_expected timestamptz,p_survivor_expected timestamptz,p_reason text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.finance_expenses;s public.finance_expenses;prior public.finance_repayment_corrections;
 payload jsonb;before_data jsonb;moved numeric;survivor_paid numeric;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_expense is null or p_survivor is null or p_expense=p_survivor or length(trim(coalesce(p_reason,''))) not between 4 and 1000 then raise exception 'Choose two expenses and explain the correction';end if;
 payload:=jsonb_build_object('expense',p_expense,'survivor',p_survivor,'expected',p_expected,'survivor_expected',p_survivor_expected,'reason',trim(p_reason));
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.finance_repayment_corrections where id=p_request;
 if found then if prior.request_payload<>payload then raise exception 'Request ID already used for different values';end if;return p_expense;end if;
 lock table public.finance_expenses,public.finance_reimbursements in share row exclusive mode;
 select * into e from public.finance_expenses where id=p_expense for update;
 if not found or p_expected is null or e.updated_at is distinct from p_expected then raise exception 'Expense changed. Reload before correcting.';end if;
 select * into s from public.finance_expenses where id=p_survivor for update;
 if not found or p_survivor_expected is null or s.updated_at is distinct from p_survivor_expected then raise exception 'Surviving expense changed. Reload before correcting.';end if;
 if e.duplicate_of is not null or s.duplicate_of is not null or e.payment_source<>'personal' or s.payment_source<>'personal' or e.paid_by is null or e.paid_by is distinct from s.paid_by or e.currency<>s.currency then raise exception 'Choose active personal expenses for the same member and currency';end if;
 if exists(select 1 from public.purchase_expense_allocations where expense_id=e.id) then raise exception 'Correct the duplicate expense order allocations first';end if;
 select coalesce(sum(amount),0) into moved from public.finance_reimbursements where expense_id=e.id;
 select coalesce(sum(amount),0) into survivor_paid from public.finance_reimbursements where expense_id=s.id;
 if moved<=0 or moved<>e.reimbursed_amount or survivor_paid<>s.reimbursed_amount then raise exception 'Repayment ledger and expense balances require review';end if;
 if moved+survivor_paid>s.amount then raise exception 'Combined repayments exceed the surviving expense. Review the actual overpayment; no money was changed.';end if;
 before_data:=jsonb_build_object('duplicate',to_jsonb(e),'survivor',to_jsonb(s),'payments',(select jsonb_agg(to_jsonb(r)) from public.finance_reimbursements r where expense_id in(e.id,s.id)));
 update public.finance_reimbursements set expense_id=s.id where expense_id=e.id;
 update public.finance_expenses set reimbursed_amount=0,reimbursement_status='owed',updated_at=now() where id=e.id;
 update public.finance_expenses set reimbursed_amount=survivor_paid+moved,reimbursement_status=case when survivor_paid+moved=amount then 'reimbursed' else 'partial' end,updated_at=now() where id=s.id;
 perform public.correct_duplicate_expense(e.id,s.id,(select updated_at from public.finance_expenses where id=e.id),trim(p_reason),p_request);
 insert into public.finance_repayment_corrections values(p_request,auth.uid(),now(),trim(p_reason),payload,before_data,jsonb_build_object('expenses',(select jsonb_agg(to_jsonb(x)) from public.finance_expenses x where id in(e.id,s.id)),'payments',(select jsonb_agg(to_jsonb(r)) from public.finance_reimbursements r where expense_id=s.id)));
 return e.id;
end$$;
revoke all on function public.reallocate_duplicate_repayments(uuid,uuid,timestamptz,timestamptz,text,uuid) from public,anon;
grant execute on function public.reallocate_duplicate_repayments(uuid,uuid,timestamptz,timestamptz,text,uuid) to authenticated;
commit;
