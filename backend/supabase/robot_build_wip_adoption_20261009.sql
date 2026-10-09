-- Initial workshop reconciliation is not newly performed work, stock or qualification.
begin;
alter table public.robot_build_jobs add column if not exists initial_wip_quantity integer;
alter table public.robot_build_jobs add column if not exists initial_wip_note text;
alter table public.robot_build_jobs add column if not exists initial_wip_observed_at timestamptz;
create table if not exists public.robot_build_wip_adoptions(
 id uuid primary key,job_id uuid not null unique references public.robot_build_jobs(id),
 actor_id uuid not null references public.team_members(id),quantity integer not null check(quantity>0),
 note text not null,observed_at timestamptz not null,created_at timestamptz not null default now()
);
alter table public.robot_build_wip_adoptions enable row level security;
revoke all on public.robot_build_wip_adoptions from public,anon,authenticated;
grant select on public.robot_build_wip_adoptions to authenticated;
drop policy if exists wip_adoption_read on public.robot_build_wip_adoptions;
create policy wip_adoption_read on public.robot_build_wip_adoptions for select to authenticated using(exists(select 1 from public.robot_build_jobs where id=job_id));
create or replace function public.adopt_robot_build_wip(p_job uuid,p_quantity integer,p_note text,p_observed timestamptz,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;e public.robot_build_wip_adoptions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into j from public.robot_build_jobs where id=p_job for update;select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project leader required';end if;
 select * into e from public.robot_build_wip_adoptions where id=p_request;
 if e.id is not null then
  if e.job_id=p_job and e.actor_id=auth.uid() and e.quantity=p_quantity and e.note=trim(p_note) and e.observed_at=p_observed then return 2;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or p_quantity is null or p_quantity not between 1 and j.required_quantity or p_observed is null or p_observed>now() or p_observed<'1992-01-01' or length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'Record the counted existing quantity, observation date and history gaps';end if;
 if t.archived or t.status='done' or j.revision<>1 or j.completed_quantity<>0 or j.initial_wip_quantity is not null
 or exists(select 1 from public.robot_build_progress where job_id=j.id)
 or exists(select 1 from public.robot_build_work_events where job_id=j.id)
 or exists(select 1 from public.robot_build_lots where job_id=j.id)
 or exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null)
 then raise exception 'Initial WIP can only be recorded once before job reporting or inspection begins';end if;
 if not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.robot_build_review_usable(task_id)) then raise exception 'Review the current manufacturing revision before adopting existing pieces';end if;
 insert into public.robot_build_wip_adoptions(id,job_id,actor_id,quantity,note,observed_at)values(p_request,j.id,auth.uid(),p_quantity,trim(p_note),p_observed);
 update public.robot_build_jobs set initial_wip_quantity=p_quantity,initial_wip_note=trim(p_note),initial_wip_observed_at=p_observed,completed_quantity=p_quantity,revision=revision+1 where id=j.id;
 update public.project_tasks set status='in_progress',updated_at=now() where id=t.id;
 return 2;
end$$;
revoke all on function public.adopt_robot_build_wip(uuid,integer,text,timestamptz,uuid) from public,anon;
grant execute on function public.adopt_robot_build_wip(uuid,integer,text,timestamptz,uuid) to authenticated;
commit;
