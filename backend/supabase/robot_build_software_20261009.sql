begin;
create table if not exists public.robot_build_software_references(
 id uuid primary key,project_id uuid not null references public.team_projects(id),
 repository text not null check(repository in ('GlueGunAndGlitter/OFFSEASON_2026','GlueGunAndGlitter/Rebuilt_Practise','GlueGunAndGlitter/Rebuilt_2026')),
 commit_sha text not null check(commit_sha ~ '^[a-f0-9]{40}$'),
 note text not null check(length(trim(note)) between 3 and 2000),
 created_by uuid not null references public.team_members(id),created_at timestamptz not null default now()
);
alter table public.robot_build_software_references enable row level security;
revoke all on public.robot_build_software_references from public,anon,authenticated;
grant select on public.robot_build_software_references to authenticated;
drop policy if exists build_software_read on public.robot_build_software_references;
create policy build_software_read on public.robot_build_software_references for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and public.has_permission('use_private_robot_code',null)
 and exists(select 1 from public.team_projects where id=project_id));
create or replace function public.record_robot_build_software(p_project uuid,p_repository text,p_commit text,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.robot_build_software_references%rowtype;
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not public.has_permission('use_private_robot_code',null)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Project leader and private robot code permission required';end if;
 select * into old from public.robot_build_software_references where id=p_request;
 if old.id is not null then
  if old.project_id=p_project and old.repository=p_repository and old.commit_sha=lower(trim(p_commit)) and old.note=trim(p_note) and old.created_by=auth.uid() then return old.id;end if;
  raise exception 'Request identity already used with different values';
 end if;
 if p_request is null or p_repository is null or p_commit is null or p_note is null then raise exception 'Repository, full commit and intended use are required';end if;
 insert into public.robot_build_software_references(id,project_id,repository,commit_sha,note,created_by)
 values(p_request,p_project,p_repository,lower(trim(p_commit)),trim(p_note),auth.uid());
 return p_request;
end$$;
revoke all on function public.record_robot_build_software(uuid,text,text,text,uuid) from public,anon;
grant execute on function public.record_robot_build_software(uuid,text,text,text,uuid) to authenticated;
commit;
