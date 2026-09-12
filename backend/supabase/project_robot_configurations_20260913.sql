begin;
create table if not exists public.project_robot_configurations(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.team_projects(id) on delete restrict,
 name text not null check(length(trim(name)) between 3 and 120),revision text not null check(length(trim(revision)) between 1 and 120),
 configuration_kind text not null check(configuration_kind in ('designed','approved','as_built','as_installed')),
 details text not null check(length(trim(details)) between 3 and 4000),created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),
 unique(project_id,name,revision)
);
alter table public.project_robot_configurations enable row level security;
drop policy if exists configuration_read on public.project_robot_configurations;
create policy configuration_read on public.project_robot_configurations for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.team_projects where id=project_id));
revoke all on public.project_robot_configurations from public,anon,authenticated;
grant select on public.project_robot_configurations to authenticated;
create or replace function public.create_project_configuration(p_project uuid,p_name text,p_revision text,p_kind text,p_details text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not exists(select 1 from public.team_projects p where p.id=p_project and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam))
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Only an authorized team manager can register a configuration';end if;
 if p_kind='approved' then raise exception 'Register the designed or physical configuration; review approval is recorded by its checkpoint';end if;
 insert into public.project_robot_configurations(project_id,name,revision,configuration_kind,details) values(p_project,trim(p_name),trim(p_revision),p_kind,trim(p_details)) returning id into result;
 return result;
end $$;
revoke all on function public.create_project_configuration(uuid,text,text,text,text) from public,anon;
grant execute on function public.create_project_configuration(uuid,text,text,text,text) to authenticated;

create or replace function public.record_configured_requirement_result(
 p_submission uuid,p_requirement uuid,p_result text,p_evidence integer,p_note text,p_configuration_id uuid default null,p_expires_at timestamptz default null
) returns void language plpgsql security definer set search_path=public as $$
declare c public.project_robot_configurations%rowtype; method text;
begin
 perform pg_advisory_xact_lock(6740,911);
 select r->>'method' into method from public.project_review_submissions s cross join lateral jsonb_array_elements(s.requirements) r where s.id=p_submission and r->>'id'=p_requirement::text;
 if method in ('test','demonstration') then
  select c1.* into c from public.project_robot_configurations c1 join public.project_tasks t on t.project_id=c1.project_id join public.project_review_submissions s on s.task_id=t.id
  where s.id=p_submission and c1.id=p_configuration_id and c1.configuration_kind in ('as_built','as_installed');
  if c.id is null then raise exception 'Select a saved physical configuration from this project';end if;
 end if;
 perform public.record_project_requirement_result(p_submission,p_requirement,p_result,p_evidence,p_note,coalesce(c.name||' / '||c.revision,''),p_expires_at);
 if c.id is not null then
  update public.project_review_submissions set requirement_results=jsonb_set(requirement_results,array[p_requirement::text,'configuration_snapshot'],to_jsonb(c)) where id=p_submission;
 end if;
end $$;
revoke all on function public.record_configured_requirement_result(uuid,uuid,text,integer,text,uuid,timestamptz) from public,anon;
grant execute on function public.record_configured_requirement_result(uuid,uuid,text,integer,text,uuid,timestamptz) to authenticated;
create or replace function public.guard_physical_requirement_release() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status in ('approved','overridden') and new.status is distinct from old.status and exists(
 select 1 from jsonb_array_elements(new.requirements) r where r->>'method' in ('test','demonstration')
 and new.requirement_results->(r->>'id')->'configuration_snapshot'->>'id' is null)
 then raise exception 'Physical findings must reference a saved configuration';end if;return new;
end $$;
drop trigger if exists guard_physical_requirement_release on public.project_review_submissions;
create trigger guard_physical_requirement_release before update of status on public.project_review_submissions for each row execute function public.guard_physical_requirement_release();
commit;
