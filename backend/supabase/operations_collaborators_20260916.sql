begin;

-- One accountable owner stays on project_tasks. Contributors do not gain owner powers.
create table if not exists public.project_task_collaborators(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.project_tasks(id) on delete cascade,
 member_id uuid not null references public.team_members(id) on delete cascade,
 added_by uuid not null default auth.uid() references public.team_members(id),
 created_at timestamptz not null default now(), unique(task_id,member_id)
);
alter table public.project_task_collaborators enable row level security;
drop policy if exists "members read collaborators" on public.project_task_collaborators;
create policy "members read collaborators" on public.project_task_collaborators for select to authenticated
 using(exists(select 1 from public.project_tasks t where t.id=task_id));
grant select on public.project_task_collaborators to authenticated;
revoke insert,update,delete on public.project_task_collaborators from authenticated;

create or replace function public.set_task_collaborators(p_task uuid,p_members uuid[]) returns void
language plpgsql security definer set search_path=public as $$
declare t public.project_tasks; team text;
begin
 select * into t from project_tasks where id=p_task for update;
 if not found or t.archived then raise exception 'Active task not found';end if;
 select subteam into team from team_projects where id=t.project_id and status not in ('archived','completed');
 if not found or not coalesce(has_permission('assign_team_work',team),false) or not exists(select 1 from team_members where id=auth.uid() and active) then raise exception 'Not authorized to assign this task';end if;
 if exists(select 1 from unnest(coalesce(p_members,'{}'::uuid[])) m where m is null or not exists(select 1 from team_members where id=m and active)) then raise exception 'Choose active team members';end if;
 delete from project_task_collaborators where task_id=p_task and (not(member_id=any(coalesce(p_members,'{}'::uuid[]))) or member_id=t.assignee_id);
 insert into project_task_collaborators(task_id,member_id) select p_task,m from (select distinct unnest(coalesce(p_members,'{}'::uuid[])) m) selected where m<>t.assignee_id on conflict(task_id,member_id) do nothing;
end$$;
revoke all on function public.set_task_collaborators(uuid,uuid[]) from public,anon;
grant execute on function public.set_task_collaborators(uuid,uuid[]) to authenticated;

create or replace function public.create_task_with_collaborators(p_project uuid,p_title text,p_owner uuid,p_due timestamptz,p_members uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;team text;
begin
 select subteam into team from team_projects where id=p_project and status not in ('archived','completed');
 if not found or not coalesce(has_permission('assign_team_work',team),false) or not exists(select 1 from team_members where id=auth.uid() and active) then raise exception 'Not authorized to create this task';end if;
 if nullif(trim(p_title),'') is null or not exists(select 1 from team_members where id=p_owner and active) then raise exception 'Task title and active owner required';end if;
 insert into project_tasks(project_id,title,assignee_id,due_at,created_by,status) values(p_project,trim(p_title),p_owner,p_due,auth.uid(),'todo') returning id into result;
 perform set_task_collaborators(result,p_members);return result;
end$$;
revoke all on function public.create_task_with_collaborators(uuid,text,uuid,timestamptz,uuid[]) from public,anon;
grant execute on function public.create_task_with_collaborators(uuid,text,uuid,timestamptz,uuid[]) to authenticated;

create or replace function public.sync_collaborator_actions(p_task uuid) returns void
language plpgsql security definer set search_path=public as $$
declare t public.project_tasks;p public.team_projects;c public.project_task_collaborators;
begin
 select * into t from project_tasks where id=p_task;
 select * into p from team_projects where id=t.project_id;
 for c in select * from project_task_collaborators where task_id=p_task loop
 perform sync_team_action('project_task_collaborators',c.id,t.title,'Collaborator · '||p.name,'assignment','member',c.member_id::text,t.due_at,coalesce(t.priority,'normal'),'/projects?project='||t.project_id||'&task='||t.id,c.added_by,
 t.archived or t.status='done' or p.status='archived' or c.member_id=t.assignee_id);
 end loop;
end$$;
revoke all on function public.sync_collaborator_actions(uuid) from public,anon,authenticated;
create or replace function public.collaborator_action_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' then delete from team_actions where source_table='project_task_collaborators' and source_id=old.id;
 else perform sync_collaborator_actions(new.task_id);end if;return null;
end$$;
drop trigger if exists collaborator_action_change on public.project_task_collaborators;
create trigger collaborator_action_change after insert or delete on public.project_task_collaborators for each row execute function public.collaborator_action_change();
create or replace function public.task_collaborator_change() returns trigger language plpgsql security definer set search_path=public as $$
begin perform sync_collaborator_actions(new.id);return null;end$$;
drop trigger if exists task_collaborator_change on public.project_tasks;
create trigger task_collaborator_change after update on public.project_tasks for each row execute function public.task_collaborator_change();
create or replace function public.project_collaborator_change() returns trigger language plpgsql security definer set search_path=public as $$
declare t uuid;begin for t in select id from project_tasks where project_id=new.id loop perform sync_collaborator_actions(t);end loop;return null;end$$;
drop trigger if exists project_collaborator_change on public.team_projects;
create trigger project_collaborator_change after update of status,name on public.team_projects for each row execute function public.project_collaborator_change();

alter table public.finance_reimbursements add column if not exists request_id uuid unique;

-- Existing repayment ledger remains the source of truth. No second expense is created.
create or replace function public.reimburse_from_team_funds(p_expense uuid,p_amount numeric,p_date date,p_method text,p_source text,p_note text,p_request uuid) returns void
language plpgsql security definer set search_path=public as $$
declare available numeric; expense_row public.finance_expenses;
begin
 if not public.is_admin() or not exists(select 1 from team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 perform pg_advisory_xact_lock(6740,916);
 if exists(select 1 from finance_reimbursements where request_id=p_request) then return;end if;
 if p_request is null or p_amount is null or p_amount<=0 or p_amount::text='NaN' or p_date is null or nullif(trim(p_method),'') is null or nullif(trim(p_source),'') is null then raise exception 'Amount, date, method and funding source are required';end if;
 if not exists(select 1 from finance_expenses where id=p_expense and currency='ILS') then raise exception 'ILS expense required';end if;
 select coalesce((select sum(amount) from finance_income where currency='ILS'),0)-coalesce((select sum(amount) from finance_expenses where currency='ILS' and payment_source in ('team_account','cash')),0)-coalesce((select sum(r.amount) from finance_reimbursements r join finance_expenses e on e.id=r.expense_id where e.currency='ILS'),0) into available;
 if p_amount>available then raise exception 'Insufficient recorded team funds. Record missing income before repayment.';end if;
 select * into expense_row from finance_expenses where id=p_expense for update;
 if expense_row.payment_source<>'personal' or p_amount>expense_row.amount-expense_row.reimbursed_amount then raise exception 'Reimbursement exceeds outstanding personal balance';end if;
 insert into finance_reimbursements(expense_id,amount,reimbursed_on,payment_method,funding_source,notes,recorded_by,request_id) values(p_expense,p_amount,p_date,trim(p_method),trim(p_source),nullif(trim(p_note),''),auth.uid(),p_request);
 update finance_expenses set reimbursed_amount=reimbursed_amount+p_amount,reimbursement_status=case when reimbursed_amount+p_amount=amount then 'reimbursed' else 'partial' end,updated_at=now() where id=p_expense;
end$$;
alter table public.finance_reimbursements add column if not exists request_id uuid unique;
revoke all on function public.reimburse_from_team_funds(uuid,numeric,date,text,text,text,uuid) from public,anon;
grant execute on function public.reimburse_from_team_funds(uuid,numeric,date,text,text,text,uuid) to authenticated;
commit;

