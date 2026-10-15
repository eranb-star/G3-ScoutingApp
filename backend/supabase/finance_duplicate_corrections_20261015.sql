begin;
alter table public.finance_expenses add column duplicate_of uuid references public.finance_expenses(id) on delete restrict,add column duplicate_original_amount numeric(12,2);
create table public.finance_expense_corrections(
 id uuid primary key,expense_id uuid not null references public.finance_expenses(id),actor_id uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 reason text not null,before_values jsonb not null,after_values jsonb not null,request_payload jsonb not null
);
alter table public.finance_expense_corrections enable row level security;
revoke all on public.finance_expense_corrections from public,anon,authenticated;
grant select on public.finance_expense_corrections to authenticated;
create policy "admin read expense corrections" on public.finance_expense_corrections for select to authenticated using(public.is_admin());
create function public.correct_duplicate_expense(p_expense uuid,p_survivor uuid,p_expected timestamptz,p_reason text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.finance_expenses;s public.finance_expenses;prior public.finance_expense_corrections;payload jsonb;before_data jsonb;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_expected is null or length(trim(coalesce(p_reason,'')))<4 then raise exception 'Review the expense and give a correction reason';end if;
 payload:=jsonb_build_object('expense',p_expense,'survivor',p_survivor,'expected',p_expected,'reason',trim(p_reason));
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.finance_expense_corrections where id=p_request;
 if found then
  if prior.request_payload<>payload then raise exception 'Request ID already used for different values';end if;
  return prior.expense_id;
 end if;
 select * into e from public.finance_expenses where id=p_expense for update;
 if not found or e.updated_at is distinct from p_expected then raise exception 'Expense changed. Reload before correcting.';end if;
 if exists(select 1 from public.finance_reimbursements where expense_id=e.id) or e.reimbursed_amount<>0 then raise exception 'This expense has repayments. Resolve the repayment allocation before marking a duplicate; no money was changed.';end if;
 if exists(select 1 from public.purchase_expense_allocations where expense_id=e.id) then raise exception 'This expense covers an order. Correct its order allocations first.';end if;
 before_data:=to_jsonb(e);
 if p_survivor is null then
  if e.duplicate_of is null or e.duplicate_original_amount is null then raise exception 'This expense is not marked as a duplicate';end if;
  update public.finance_expenses set amount=duplicate_original_amount,duplicate_original_amount=null,duplicate_of=null,reimbursement_status=case when payment_source='personal' then 'owed' else 'not_required' end,updated_at=now() where id=e.id;
 else
  if e.duplicate_of is not null or p_survivor=e.id then raise exception 'Choose a different active expense';end if;
  if exists(select 1 from public.finance_expenses where duplicate_of=e.id) then raise exception 'Other duplicates reference this expense. Resolve them first.';end if;
  select * into s from public.finance_expenses where id=p_survivor for update;
  if not found or s.duplicate_of is not null or s.currency<>e.currency or s.paid_by is distinct from e.paid_by or s.payment_source<>e.payment_source then raise exception 'Duplicate and surviving expense must have the same currency, payer and payment source';end if;
  update public.finance_expenses set duplicate_original_amount=amount,amount=0,duplicate_of=s.id,reimbursement_status='not_required',updated_at=now() where id=e.id;
 end if;
 insert into public.finance_expense_corrections values(p_request,e.id,auth.uid(),now(),trim(p_reason),before_data,(select to_jsonb(x) from public.finance_expenses x where x.id=e.id),payload);
 return e.id;
end$$;
revoke all on function public.correct_duplicate_expense(uuid,uuid,timestamptz,text,uuid) from public,anon;
grant execute on function public.correct_duplicate_expense(uuid,uuid,timestamptz,text,uuid) to authenticated;

create function public.guard_duplicate_expense() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='DELETE' then
  if old.duplicate_of is not null or exists(select 1 from public.finance_expense_corrections where expense_id=old.id) then raise exception 'Corrected expenses retain their history and cannot be deleted';end if;
  return old;
 end if;
 if tg_op='INSERT' then
  if new.duplicate_of is not null or new.duplicate_original_amount is not null then raise exception 'Use the reviewed duplicate correction';end if;
 else
  if current_user in ('authenticated','anon') and (new.duplicate_of,new.duplicate_original_amount) is distinct from (old.duplicate_of,old.duplicate_original_amount) then raise exception 'Use the reviewed duplicate correction';end if;
  if old.duplicate_of is not null and new.duplicate_of is not null and (new.amount,new.paid_by,new.payment_source,new.currency,new.reimbursed_amount) is distinct from (old.amount,old.paid_by,old.payment_source,old.currency,old.reimbursed_amount) then raise exception 'Restore the duplicate before changing its financial values';end if;
 end if;
 return new;
end$$;
create trigger guard_duplicate_expense before insert or update or delete on public.finance_expenses for each row execute function public.guard_duplicate_expense();
commit;
