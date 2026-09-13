begin;
create table if not exists public.project_physical_assets(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.team_projects(id) on delete restrict,
 serial text not null check(length(trim(serial)) between 3 and 120),name text not null check(length(trim(name)) between 3 and 160),
 asset_kind text not null check(asset_kind in ('robot','prototype','component','instrument')),
 created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),unique(project_id,serial)
);
alter table public.project_physical_assets enable row level security;
drop policy if exists physical_asset_read on public.project_physical_assets;
create policy physical_asset_read on public.project_physical_assets for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.team_projects where id=project_id));
revoke all on public.project_physical_assets from public,anon,authenticated;
grant select on public.project_physical_assets to authenticated;
alter table public.project_robot_configurations add column if not exists identity_snapshot jsonb;
create or replace function public.register_project_asset(p_project uuid,p_serial text,p_name text,p_kind text)returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=p_project and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Asset registration requires management access to an active project';end if;
 insert into public.project_physical_assets(project_id,serial,name,asset_kind) values(p_project,trim(p_serial),trim(p_name),p_kind) returning id into result;
 return result;
end $$;
revoke all on function public.register_project_asset(uuid,text,text,text) from public,anon;
grant execute on function public.register_project_asset(uuid,text,text,text) to authenticated;
create or replace function public.create_tracked_configuration(p_project uuid,p_name text,p_revision text,p_kind text,p_details text,p_asset uuid,p_parent uuid,p_software text,p_calibration text) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;a public.project_physical_assets%rowtype;parent public.project_robot_configurations%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if p_parent is not null then
  select * into parent from public.project_robot_configurations where id=p_parent and project_id=p_project;
  if parent.id is null then raise exception 'Select a parent configuration in this project';end if;
 end if;
 if p_kind in ('as_built','as_installed') then
  select * into a from public.project_physical_assets where id=p_asset and project_id=p_project;
  if a.id is null then raise exception 'Register and select the exact physical asset';end if;
  if length(trim(coalesce(p_software,''))) not between 3 and 500 or length(trim(coalesce(p_calibration,''))) not between 3 and 500 then raise exception 'Record exact software and calibration references, or explain why not applicable';end if;
  if parent.id is null or (p_kind='as_installed' and parent.configuration_kind<>'as_built') then raise exception 'Link the design/built configuration; installed configuration requires an as-built parent';end if;
 end if;
 result:=public.create_project_configuration(p_project,p_name,p_revision,p_kind,p_details);
 update public.project_robot_configurations set identity_snapshot=jsonb_build_object('asset',case when a.id is null then null else to_jsonb(a) end,'parent_configuration_id',parent.id,'parent_revision',parent.revision,'software_reference',trim(p_software),'calibration_reference',trim(p_calibration)) where id=result;
 return result;
end $$;
revoke all on function public.create_tracked_configuration(uuid,text,text,text,text,uuid,uuid,text,text) from public,anon;
grant execute on function public.create_tracked_configuration(uuid,text,text,text,text,uuid,uuid,text,text) to authenticated;
create or replace function public.guard_physical_asset_identity() returns trigger language plpgsql set search_path=public as $$
begin
 if new.artifact_policy_version>0 and new.status is distinct from old.status and new.status in ('approved','overridden') and exists(
 select 1 from jsonb_array_elements(new.requirements) r where r->>'method' in ('test','demonstration') and (
 new.requirement_results->(r->>'id')->'configuration_snapshot'->'identity_snapshot'->'asset'->>'id' is null
 or new.requirement_results->(r->>'id')->'measurement'->>'asset' is distinct from new.requirement_results->(r->>'id')->'configuration_snapshot'->'identity_snapshot'->'asset'->>'serial'))
 then raise exception 'Physical evidence must identify the registered asset serial and its tracked configuration';end if;
 return new;
end $$;
drop trigger if exists guard_physical_asset_identity on public.project_review_submissions;
create trigger guard_physical_asset_identity before update of status on public.project_review_submissions for each row execute function public.guard_physical_asset_identity();
drop trigger if exists guard_asset_controls on public.project_physical_assets;
create trigger guard_asset_controls before insert on public.project_physical_assets for each row execute function public.guard_engineering_controls();
drop trigger if exists guard_configuration_controls on public.project_robot_configurations;
create trigger guard_configuration_controls before insert on public.project_robot_configurations for each row execute function public.guard_engineering_controls();
commit;
