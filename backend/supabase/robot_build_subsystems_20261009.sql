-- Subsystems group existing work and evidence; they do not introduce completion flags.
begin;
create table if not exists public.robot_build_subsystems(
 id uuid primary key,project_id uuid not null references public.team_projects(id),
 name text not null,description text not null,revision integer not null default 1,
 updated_by uuid not null references public.team_members(id),updated_at timestamptz not null default now()
);
create unique index if not exists build_subsystem_name on public.robot_build_subsystems(project_id,lower(name));
create table if not exists public.robot_build_subsystem_tasks(
 subsystem_id uuid not null references public.robot_build_subsystems(id),task_id uuid not null references public.project_tasks(id),primary key(subsystem_id,task_id)
);
create table if not exists public.robot_build_subsystem_events(
 id uuid primary key,subsystem_id uuid not null references public.robot_build_subsystems(id),actor_id uuid not null references public.team_members(id),
 payload jsonb not null,expected_revision integer not null,result_revision integer not null,created_at timestamptz not null default now()
);
alter table public.robot_build_subsystems enable row level security;
alter table public.robot_build_subsystem_tasks enable row level security;
alter table public.robot_build_subsystem_events enable row level security;
revoke all on public.robot_build_subsystems,public.robot_build_subsystem_tasks,public.robot_build_subsystem_events from public,anon,authenticated;
grant select on public.robot_build_subsystems,public.robot_build_subsystem_tasks,public.robot_build_subsystem_events to authenticated;
drop policy if exists subsystem_read on public.robot_build_subsystems;
create policy subsystem_read on public.robot_build_subsystems for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.team_projects where id=project_id));
drop policy if exists subsystem_task_read on public.robot_build_subsystem_tasks;
create policy subsystem_task_read on public.robot_build_subsystem_tasks for select to authenticated using(exists(select 1 from public.robot_build_subsystems where id=subsystem_id) and exists(select 1 from public.project_tasks where id=task_id));
drop policy if exists subsystem_event_read on public.robot_build_subsystem_events;
create policy subsystem_event_read on public.robot_build_subsystem_events for select to authenticated using(exists(select 1 from public.robot_build_subsystems where id=subsystem_id));
create or replace function public.save_robot_build_subsystem(p_project uuid,p_subsystem uuid,p_expected integer,p_name text,p_description text,p_tasks uuid[],p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.robot_build_subsystems%rowtype;e public.robot_build_subsystem_events%rowtype;payload jsonb;result integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project leader required';end if;
 payload:=jsonb_build_object('project',p_project,'name',trim(p_name),'description',trim(p_description),'tasks',p_tasks);
 select * into e from public.robot_build_subsystem_events where id=p_request;
 if e.id is not null then
  if e.subsystem_id=p_subsystem and e.actor_id=auth.uid() and e.expected_revision=p_expected and e.payload=payload then return e.result_revision;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_subsystem is null or p_request is null or p_expected is null or p_expected<0 or length(trim(coalesce(p_name,''))) not between 2 and 100 or length(trim(coalesce(p_description,''))) not between 3 and 2000 or p_tasks is null or cardinality(p_tasks)>10000 then raise exception 'Enter subsystem name, scope and its existing tasks';end if;
 if exists(select 1 from unnest(p_tasks) x where x is null or not exists(select 1 from public.project_tasks where id=x and project_id=p_project and not archived)) or cardinality(p_tasks)<>(select count(distinct x) from unnest(p_tasks) x) then raise exception 'Choose distinct active tasks from this project';end if;
 select * into s from public.robot_build_subsystems where id=p_subsystem for update;
 if (s.id is not null and s.project_id<>p_project) or coalesce(s.revision,0)<>p_expected then raise exception 'Subsystem changed. Reload before saving';end if;
 result:=p_expected+1;
 insert into public.robot_build_subsystems(id,project_id,name,description,revision,updated_by)values(p_subsystem,p_project,trim(p_name),trim(p_description),result,auth.uid())
 on conflict(id)do update set name=excluded.name,description=excluded.description,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 delete from public.robot_build_subsystem_tasks where subsystem_id=p_subsystem;
 insert into public.robot_build_subsystem_tasks(subsystem_id,task_id)select p_subsystem,x from unnest(p_tasks) x;
 insert into public.robot_build_subsystem_events(id,subsystem_id,actor_id,payload,expected_revision,result_revision)values(p_request,p_subsystem,auth.uid(),payload,p_expected,result);
 return result;
end$$;
revoke all on function public.save_robot_build_subsystem(uuid,uuid,integer,text,text,uuid[],uuid) from public,anon;
grant execute on function public.save_robot_build_subsystem(uuid,uuid,integer,text,text,uuid[],uuid) to authenticated;
commit;
