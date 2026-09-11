-- Opt-in mentor review checkpoints. Existing tasks are not converted.
begin;
create table if not exists public.project_review_gates(
 task_id uuid primary key references public.project_tasks(id) on delete restrict,
 reviewer_id uuid not null references public.team_members(id) on delete restrict,
 criteria text not null check(length(trim(criteria)) between 3 and 4000),current_submission uuid,
 created_by uuid not null default auth.uid(),created_at timestamptz not null default now()
);
alter table public.project_review_gates add column if not exists enabled boolean not null default true;
create table if not exists public.project_review_submissions(
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.project_review_gates(task_id) on delete restrict,
 revision text not null check(length(trim(revision)) between 1 and 120),evidence_url text not null check(evidence_url ~ '^https://[^[:space:]]+$'),
 notes text not null default '' check(length(notes)<=5000),criteria text not null,reviewer_id uuid not null,
 submitted_by uuid not null,submitted_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','changes_requested','overridden')),
 decided_by uuid,decided_at timestamptz,decision_note text,
 unique(task_id,revision)
);
create table if not exists public.project_review_audit(
 id bigint generated always as identity primary key,task_id uuid not null references public.project_review_gates(task_id) on delete restrict,
 action text not null,actor_id uuid not null,note text not null,created_at timestamptz not null default now()
);
alter table public.project_review_gates drop constraint if exists review_current_submission;
alter table public.project_review_gates add constraint review_current_submission foreign key(current_submission) references public.project_review_submissions(id) on delete restrict;
alter table public.project_review_gates enable row level security;
alter table public.project_review_submissions enable row level security;
alter table public.project_review_audit enable row level security;
drop policy if exists review_gate_read on public.project_review_gates;
create policy review_gate_read on public.project_review_gates for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id));
drop policy if exists review_submission_read on public.project_review_submissions;
create policy review_submission_read on public.project_review_submissions for select to authenticated using(exists(select 1 from public.project_review_gates g where g.task_id=project_review_submissions.task_id));
drop policy if exists review_audit_read on public.project_review_audit;
create policy review_audit_read on public.project_review_audit for select to authenticated using(exists(select 1 from public.project_review_gates g where g.task_id=project_review_audit.task_id));
grant select on public.project_review_gates,public.project_review_submissions,public.project_review_audit to authenticated;
revoke insert,update,delete on public.project_review_gates,public.project_review_submissions,public.project_review_audit from authenticated,anon;

create or replace function public.project_review_passed(p_task uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission and s.task_id=g.task_id
 where g.task_id=p_task and g.enabled and s.status in ('approved','overridden'));
$$;
revoke all on function public.project_review_passed(uuid) from public,anon,authenticated;

create or replace function public.configure_project_review(p_task uuid,p_reviewer uuid,p_criteria text,p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare t public.project_tasks%rowtype;p public.team_projects%rowtype;g public.project_review_gates%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;select * into p from public.team_projects where id=t.project_id;
 if t.id is null or t.archived or p.status='archived' or not public.has_permission('assign_team_work',p.subteam)
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Project review configuration is not permitted';end if;
 if p.status='completed' then raise exception 'Reopen the completed project before changing review checkpoints';end if;
 if not exists(select 1 from public.team_members where id=p_reviewer and active and role in ('mentor','admin')) then raise exception 'Choose an active mentor or administrator as reviewer';end if;
 select * into g from public.project_review_gates where task_id=p_task;
 if g.task_id is null or not g.enabled then
 if t.status='done' or exists(select 1 from public.project_task_dependencies d join public.project_tasks c on c.id=d.task_id where d.prerequisite_id=p_task and c.status in ('in_progress','done')) then raise exception 'Configure the checkpoint before dependent work starts; reopen completed work deliberately first';end if;
 insert into public.project_review_gates(task_id,reviewer_id,criteria)values(p_task,p_reviewer,trim(p_criteria))
 on conflict(task_id) do update set enabled=true,reviewer_id=excluded.reviewer_id,criteria=excluded.criteria;
 else
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Explain the reviewer or criteria change';end if;
 -- Submitted criteria are immutable. Changing criteria requires a fresh revision.
 update public.project_review_gates set reviewer_id=p_reviewer,criteria=trim(p_criteria),
 current_submission=case when criteria is distinct from trim(p_criteria) then null else current_submission end where task_id=p_task;
 if g.criteria is distinct from trim(p_criteria) then update public.project_tasks set status='in_progress',completed_at=null,updated_at=now() where id=p_task;end if;
 end if;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'configured',auth.uid(),coalesce(nullif(trim(p_reason),''),'Review checkpoint enabled')||' | reviewer='||(select display_name from public.team_members where id=p_reviewer)||' | criteria='||trim(p_criteria));
end$$;

create or replace function public.submit_project_review(p_task uuid,p_revision text,p_url text,p_notes text default '') returns void
language plpgsql security definer set search_path=public as $$
declare t public.project_tasks%rowtype;p public.team_projects%rowtype;g public.project_review_gates%rowtype;submission uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;select * into p from public.team_projects where id=t.project_id;
 select * into g from public.project_review_gates where task_id=p_task;
 if g.task_id is null or not g.enabled or t.archived or p.status='archived' or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not coalesce(t.assignee_id=auth.uid() or t.created_by=auth.uid() or public.has_permission('assign_team_work',p.subteam),false) then raise exception 'Submission is not permitted';end if;
 if p.status='completed' then raise exception 'Reopen the completed project before submitting a new revision';end if;
 if g.reviewer_id=auth.uid() then raise exception 'Choose a different mentor; self-approval is not permitted';end if;
 if not exists(select 1 from public.team_members where id=g.reviewer_id and active and role in ('mentor','admin')) then raise exception 'Assign an active mentor before submission';end if;
 insert into public.project_review_submissions(task_id,revision,evidence_url,notes,criteria,reviewer_id,submitted_by)
 values(p_task,trim(p_revision),trim(p_url),coalesce(p_notes,''),g.criteria,g.reviewer_id,auth.uid()) returning id into submission;
 update public.project_review_gates set current_submission=submission where task_id=p_task;
 update public.project_tasks set status='in_progress',completed_at=null,updated_at=now() where id=p_task;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'submitted',auth.uid(),trim(p_revision));
end$$;

create or replace function public.decide_project_review(p_task uuid,p_submission uuid,p_decision text,p_note text) returns void
language plpgsql security definer set search_path=public as $$
declare g public.project_review_gates%rowtype;s public.project_review_submissions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into g from public.project_review_gates where task_id=p_task;
 select * into s from public.project_review_submissions where id=p_submission and task_id=p_task;
 if g.task_id is null or not g.enabled or g.current_submission is distinct from p_submission or s.id is null then raise exception 'This submission is no longer current. Refresh before deciding';end if;
 if not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=p_task and not t.archived and p.status<>'archived') then raise exception 'Checkpoint is archived or unavailable';end if;
 if p_decision not in ('approved','changes_requested','overridden') or length(trim(coalesce(p_note,'')))<3 then raise exception 'A decision and explanation are required';end if;
 if p_decision='overridden' then
 if not public.is_admin() or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Only an active administrator may override';end if;
 else
 if g.reviewer_id<>auth.uid() or s.submitted_by=auth.uid() or s.status<>'pending'
 or not exists(select 1 from public.team_members where id=auth.uid() and active and role in ('mentor','admin')) then raise exception 'Only the assigned mentor may decide a pending submission; no self-approval';end if;
 end if;
 if s.status in ('approved','overridden') then raise exception 'The decision is already final. Submit a new revision to change it';end if;
 update public.project_review_submissions set status=p_decision,decided_by=auth.uid(),decided_at=now(),decision_note=trim(p_note) where id=p_submission;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,p_decision,auth.uid(),s.revision||' | '||trim(p_note));
 if p_decision in ('approved','overridden') then update public.project_tasks set status='done',completed_at=now(),updated_at=now() where id=p_task;end if;
end$$;

-- Direct API status updates must obey the same gate as the UI.
create or replace function public.enforce_project_review() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and old.status='done' and new.status<>'done' and exists(select 1 from public.project_review_gates where task_id=new.id and enabled) then
 perform pg_advisory_xact_lock(6740,911);
 if exists(select 1 from public.team_projects where id=new.project_id and status='completed') then raise exception 'Reopen the completed project before reopening its review checkpoint';end if;
 if public.project_review_passed(new.id) then
 update public.project_review_gates set current_submission=null where task_id=new.id;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(new.id,'reopened',auth.uid(),'Checkpoint reopened; a fresh revision must be submitted');
 end if;
 end if;
 if new.status in ('in_progress','done') and (tg_op='INSERT' or new.status is distinct from old.status) then
 perform pg_advisory_xact_lock(6740,911);
 if new.status='done' and exists(select 1 from public.project_review_gates where task_id=new.id and enabled) and not public.project_review_passed(new.id) then raise exception 'Mentor approval is required before completing this review checkpoint';end if;
 if exists(select 1 from public.project_task_dependencies d join public.project_review_gates g on g.task_id=d.prerequisite_id
 join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id
 where d.task_id=new.id and g.enabled and (t.archived or p.status='archived' or not public.project_review_passed(g.task_id))) then raise exception 'A prerequisite requires mentor approval before this stage can start or complete';end if;
 end if;return new;
end$$;
drop trigger if exists enforce_project_review on public.project_tasks;
create trigger enforce_project_review before insert or update of status on public.project_tasks for each row execute function public.enforce_project_review();
create or replace function public.protect_review_dependency() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if tg_op='DELETE' then
 if exists(select 1 from public.project_review_gates where task_id=old.prerequisite_id and enabled) and exists(select 1 from public.project_tasks where id=old.task_id) then raise exception 'Review checkpoint links cannot be removed to bypass approval';end if;
 return old;
 end if;
 if exists(select 1 from public.project_review_gates where task_id=new.prerequisite_id and enabled) and exists(select 1 from public.project_tasks where id=new.task_id and status in ('in_progress','done')) then raise exception 'Link a review checkpoint before starting the dependent task';end if;
 return new;
end$$;
drop trigger if exists protect_review_dependency on public.project_task_dependencies;
create trigger protect_review_dependency before insert or delete on public.project_task_dependencies for each row execute function public.protect_review_dependency();

-- An accidentally enabled, unused checkpoint can be withdrawn with an audit reason.
create or replace function public.withdraw_unused_project_review(p_task uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if not public.is_admin() or not exists(select 1 from public.team_members where id=auth.uid() and active) or length(trim(coalesce(p_reason,'')))<3 then raise exception 'An active administrator and a reason are required';end if;
 if exists(select 1 from public.project_review_submissions where task_id=p_task) then raise exception 'Submitted checkpoints retain their review history and cannot be withdrawn';end if;
 if not exists(select 1 from public.project_review_gates where task_id=p_task and enabled) then raise exception 'Checkpoint unavailable';end if;
 update public.project_review_gates set enabled=false where task_id=p_task;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'withdrawn_unused',auth.uid(),trim(p_reason));
end$$;
revoke all on function public.withdraw_unused_project_review(uuid,text) from public,anon;
grant execute on function public.withdraw_unused_project_review(uuid,text) to authenticated;
create or replace function public.enforce_project_review_completion() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='completed' and new.status is distinct from old.status then
 perform pg_advisory_xact_lock(6740,911);
 if exists(select 1 from public.project_tasks t join public.project_review_gates g on g.task_id=t.id where t.project_id=new.id and g.enabled and not public.project_review_passed(t.id))
 then raise exception 'Complete mentor review before completing this project';end if;
 end if;return new;
end$$;
drop trigger if exists enforce_project_review_completion on public.team_projects;
create trigger enforce_project_review_completion before update of status on public.team_projects for each row execute function public.enforce_project_review_completion();

create or replace function public.project_review_context(p_task uuid default null,p_all boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('task_id',g.task_id,'project_id',t.project_id,'title',t.title,'due_at',t.due_at,'reviewer_id',g.reviewer_id,'reviewer',m.display_name,'criteria',g.criteria,
 'submission',(select to_jsonb(s)||jsonb_build_object('submitted_by_name',a.display_name,'decided_by_name',d.display_name) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.id=g.current_submission),
 'history',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('submitted_by_name',a.display_name,'decided_by_name',d.display_name) order by s.submitted_at desc),'[]'::jsonb) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.task_id=g.task_id) end,
 'audit',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('actor_name',m.display_name) order by a.created_at desc),'[]'::jsonb) from public.project_review_audit a left join public.team_members m on m.id=a.actor_id where a.task_id=g.task_id) end)
 order by g.created_at),'[]'::jsonb)
 from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id left join public.team_members m on m.id=g.reviewer_id
 where g.enabled and ((p_task is not null and g.task_id=p_task) or (p_task is null and p_all) or (p_task is null and not p_all and not t.archived and p.status<>'archived' and g.reviewer_id=auth.uid()
 and exists(select 1 from public.project_review_submissions s where s.id=g.current_submission and s.status='pending')));
$$;
revoke all on function public.configure_project_review(uuid,uuid,text,text),public.submit_project_review(uuid,text,text,text),public.decide_project_review(uuid,uuid,text,text),public.project_review_context(uuid,boolean) from public,anon;
grant execute on function public.configure_project_review(uuid,uuid,text,text),public.submit_project_review(uuid,text,text,text),public.decide_project_review(uuid,uuid,text,text),public.project_review_context(uuid,boolean) to authenticated;
create or replace function public.task_dependency_context(p_home boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by task_id,prerequisite_id),'[]'::jsonb) from (
 select d.task_id,d.prerequisite_id,t.status as task_status,
 u.title,u.status,case when u.id is not null and q.id is not null then u.archived or q.status='archived' else true end as unavailable,
 u.assignee_id,m.display_name as owner,q.subteam,u.due_at,
 case when u.id is not null and q.id is not null then '/projects?project='||u.project_id||'&task='||u.id else null end as href,
 g.task_id is not null as review_required,s.status as review_status,
 not coalesce(u.status='done' and not u.archived and q.status<>'archived' and (g.task_id is null or s.status in ('approved','overridden')),false) as waiting
 from project_task_dependencies d join project_tasks t on t.id=d.task_id join team_projects p on p.id=t.project_id
 left join project_tasks u on u.id=d.prerequisite_id left join team_projects q on q.id=u.project_id left join team_members m on m.id=u.assignee_id
 left join project_review_gates g on g.task_id=u.id and g.enabled left join project_review_submissions s on s.id=g.current_submission
 where not t.archived and p.status<>'archived'
 and (not p_home or t.assignee_id=auth.uid() or (has_permission('view_team_risks') and has_permission('assign_team_work',p.subteam)))
 ) x;
$$;

commit;
