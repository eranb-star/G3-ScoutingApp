-- Additive manufacturing records. No stock writes and no new access grants to CAD.
begin;
create table if not exists public.robot_build_jobs(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null unique references public.project_tasks(id) on delete restrict,
 release_task_id uuid not null references public.project_tasks(id) on delete restrict,
 release_submission_id uuid not null references public.project_review_submissions(id) on delete restrict,
 part_name text not null check(length(trim(part_name)) between 1 and 180),
 part_revision text not null check(length(trim(part_revision)) between 1 and 120),
 instructions text not null check(length(trim(instructions)) between 3 and 8000),
 required_quantity integer not null check(required_quantity between 1 and 100000),
 completed_quantity integer not null default 0,
 revision integer not null default 1,
 created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 check(task_id<>release_task_id),check(completed_quantity between 0 and required_quantity)
);
create table if not exists public.robot_build_progress(
 id uuid primary key,job_id uuid not null references public.robot_build_jobs(id) on delete restrict,
 actor_id uuid not null references public.team_members(id),expected_revision integer not null,
 previous_quantity integer not null,completed_quantity integer not null,
 note text not null check(length(trim(note)) between 3 and 2000),
 created_at timestamptz not null default now()
);
alter table public.robot_build_jobs enable row level security;
alter table public.robot_build_progress enable row level security;
revoke all on public.robot_build_jobs,public.robot_build_progress from public,anon,authenticated;
grant select on public.robot_build_jobs,public.robot_build_progress to authenticated;
drop policy if exists build_job_read on public.robot_build_jobs;
create policy build_job_read on public.robot_build_jobs for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.project_tasks t where t.id=task_id));
drop policy if exists build_progress_read on public.robot_build_progress;
create policy build_progress_read on public.robot_build_progress for select to authenticated using(
 exists(select 1 from public.robot_build_jobs j where j.id=job_id));

create or replace function public.create_robot_build_job(p_task uuid,p_release_task uuid,p_submission uuid,p_name text,p_revision text,p_instructions text,p_quantity integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.project_tasks%rowtype;p public.team_projects%rowtype; existing public.robot_build_jobs%rowtype; result uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task for update;
 select * into p from public.team_projects where id=t.project_id;
 if t.id is null or t.archived or p.status in ('archived','completed')
 or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not coalesce(public.has_permission('assign_team_work',p.subteam),false) then raise exception 'Build setup is not permitted';end if;
 select * into existing from public.robot_build_jobs where task_id=p_task;
 if existing.id is not null then
  if existing.release_task_id=p_release_task and existing.release_submission_id=p_submission
   and existing.part_name=trim(p_name) and existing.part_revision=trim(p_revision)
   and existing.instructions=trim(p_instructions) and existing.required_quantity=p_quantity then return existing.id;end if;
  raise exception 'This task already has a different build job';
 end if;
 if t.status='done' then raise exception 'Reopen completed work before attaching a build job';end if;
 if not exists(select 1 from public.project_tasks rt join public.project_review_gates g on g.task_id=rt.id
  join public.project_review_submissions s on s.id=g.current_submission
  where rt.id=p_release_task and rt.project_id=t.project_id and not rt.archived and rt.id<>t.id
  and g.enabled and g.decision_type='released_for_manufacturing' and s.id=p_submission
  and s.revision=trim(p_revision) and public.project_review_passed(rt.id))
 then raise exception 'Select the current approved manufacturing release with this revision from the same project';end if;
 if not exists(select 1 from public.project_review_gates where task_id=t.id and enabled and decision_type='qc_accepted')
 then raise exception 'Configure the existing task inspection checkpoint before attaching manufacturing quantities';end if;
 insert into public.robot_build_jobs(task_id,release_task_id,release_submission_id,part_name,part_revision,instructions,required_quantity,created_by)
 values(p_task,p_release_task,p_submission,trim(p_name),trim(p_revision),trim(p_instructions),p_quantity,auth.uid()) returning id into result;
 return result;
end$$;

create or replace function public.record_robot_build_progress(p_job uuid,p_expected_revision integer,p_completed integer,p_note text,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;p public.team_projects%rowtype;prior public.robot_build_progress%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if p_request is null then raise exception 'Request identity required';end if;
 select * into j from public.robot_build_jobs where id=p_job for update;
 select * into t from public.project_tasks where id=j.task_id for update;
 select * into p from public.team_projects where id=t.project_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not coalesce(t.assignee_id=auth.uid() or public.has_permission('assign_team_work',p.subteam),false)
 then raise exception 'Only the assigned worker or project manager can record this work';end if;
 select * into prior from public.robot_build_progress where id=p_request;
 if prior.id is not null then
  if prior.job_id=p_job and prior.actor_id=auth.uid() and prior.expected_revision=p_expected_revision
   and prior.completed_quantity=p_completed and prior.note=trim(p_note) then return prior.expected_revision+1;end if;
  raise exception 'This request was already used with different values';
 end if;
 if t.archived or p.status in ('archived','completed') or t.status='done' then raise exception 'Reopen the work before recording a correction';end if;
 if j.revision<>p_expected_revision then raise exception 'Progress changed. Reload before saving';end if;
 if p_completed is null or p_completed<0 or p_completed>j.required_quantity then raise exception 'Quantity must be between zero and the required quantity';end if;
 if p_note is null or length(trim(p_note)) not between 3 and 2000 then raise exception 'Record the work or explain the correction';end if;
 if not exists(select 1 from public.project_review_gates g where g.task_id=j.release_task_id and g.enabled
  and g.decision_type='released_for_manufacturing' and g.current_submission=j.release_submission_id
  and public.project_review_passed(g.task_id)) then raise exception 'The manufacturing release needs review before continuing';end if;
 -- An inspection submission snapshots the reported quantity. Reopen it deliberately before correcting.
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null)
 then raise exception 'Reopen the inspection checkpoint before changing its submitted quantities';end if;
 insert into public.robot_build_progress(id,job_id,actor_id,expected_revision,previous_quantity,completed_quantity,note)
 values(p_request,j.id,auth.uid(),j.revision,j.completed_quantity,p_completed,trim(p_note));
 update public.robot_build_jobs set completed_quantity=p_completed,revision=revision+1 where id=j.id;
 update public.project_tasks set status='in_progress',updated_at=now() where id=t.id;
 return j.revision+1;
end$$;

create or replace function public.guard_robot_build_completion() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;
begin
 if new.status<>'done' then return new;end if;
 select * into j from public.robot_build_jobs where task_id=new.id;
 if j.id is null then return new;end if;
 if j.completed_quantity<>j.required_quantity then raise exception 'Record all required manufacturing quantities before completion';end if;
 if not exists(select 1 from public.project_review_gates g where g.task_id=j.release_task_id and g.enabled
  and g.decision_type='released_for_manufacturing' and g.current_submission=j.release_submission_id
  and public.project_review_passed(g.task_id)) then raise exception 'The pinned manufacturing release is no longer current';end if;
 if not exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission
  where g.task_id=new.id and g.enabled and g.decision_type='qc_accepted' and s.revision=j.part_revision
  and public.project_review_passed(new.id)) then raise exception 'Inspection of this revision is required before completion';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_completion on public.project_tasks;
create trigger guard_robot_build_completion before update of status on public.project_tasks for each row execute function public.guard_robot_build_completion();
revoke all on function public.create_robot_build_job(uuid,uuid,uuid,text,text,text,integer) from public,anon;
revoke all on function public.record_robot_build_progress(uuid,integer,integer,text,uuid) from public,anon;
revoke all on function public.guard_robot_build_completion() from public,anon,authenticated;
grant execute on function public.create_robot_build_job(uuid,uuid,uuid,text,text,text,integer) to authenticated;
grant execute on function public.record_robot_build_progress(uuid,integer,integer,text,uuid) to authenticated;
commit;
