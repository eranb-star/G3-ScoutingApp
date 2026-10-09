-- Project-backed build context. No new project, asset, task or CAD grant is created implicitly.
begin;
create table if not exists public.robot_build_scopes(
 project_id uuid primary key references public.team_projects(id) on delete restrict,
 purpose text not null check(purpose in ('season','offseason','prototype','subsystem')),
 season integer check(season between 1992 and 2200),
 description text not null check(length(trim(description)) between 3 and 2000),
 physical_asset_id uuid references public.project_physical_assets(id) on delete restrict,
 revision integer not null default 1 check(revision>0),
 updated_by uuid not null references public.team_members(id),updated_at timestamptz not null default now()
);
create table if not exists public.robot_build_scope_events(
 id uuid primary key,project_id uuid not null references public.robot_build_scopes(project_id) on delete restrict,
 actor_id uuid not null references public.team_members(id),expected_revision integer not null,
 payload jsonb not null,result_revision integer not null,created_at timestamptz not null default now()
);
alter table public.robot_build_scopes enable row level security;
alter table public.robot_build_scope_events enable row level security;
revoke all on public.robot_build_scopes,public.robot_build_scope_events from public,anon,authenticated;
grant select on public.robot_build_scopes,public.robot_build_scope_events to authenticated;
drop policy if exists build_scope_read on public.robot_build_scopes;
create policy build_scope_read on public.robot_build_scopes for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.team_projects where id=project_id));
drop policy if exists build_scope_event_read on public.robot_build_scope_events;
create policy build_scope_event_read on public.robot_build_scope_events for select to authenticated using(
 exists(select 1 from public.robot_build_scopes where project_id=robot_build_scope_events.project_id));

create or replace function public.save_robot_build_scope(p_project uuid,p_expected integer,p_purpose text,p_season integer,p_description text,p_asset uuid,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare scope public.robot_build_scopes%rowtype;previous public.robot_build_scope_events%rowtype;payload jsonb;result integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required to configure this build';end if;
 payload:=jsonb_build_object('purpose',p_purpose,'season',p_season,'description',trim(p_description),'asset',p_asset);
 select * into previous from public.robot_build_scope_events where id=p_request;
 if previous.id is not null then
  if previous.project_id=p_project and previous.actor_id=auth.uid() and previous.expected_revision=p_expected and previous.payload=payload then return previous.result_revision;end if;
  raise exception 'Request identity already used with different values';
 end if;
 if p_request is null or p_expected is null or p_expected<0 or p_purpose is null or p_purpose not in ('season','offseason','prototype','subsystem')
 or (p_season is not null and p_season not between 1992 and 2200)
 or length(trim(coalesce(p_description,''))) not between 3 and 2000 then raise exception 'Choose build purpose, valid season and a short description';end if;
 if p_asset is not null and not exists(select 1 from public.project_physical_assets where id=p_asset and project_id=p_project) then raise exception 'Choose a registered physical asset in this project. Cross-project identity needs explicit reconciliation';end if;
 select * into scope from public.robot_build_scopes where project_id=p_project for update;
 if coalesce(scope.revision,0)<>p_expected then raise exception 'Build details changed. Reload before saving';end if;
 result:=p_expected+1;
 insert into public.robot_build_scopes(project_id,purpose,season,description,physical_asset_id,revision,updated_by)
 values(p_project,p_purpose,p_season,trim(p_description),p_asset,result,auth.uid())
 on conflict(project_id) do update set purpose=excluded.purpose,season=excluded.season,description=excluded.description,
 physical_asset_id=excluded.physical_asset_id,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 insert into public.robot_build_scope_events(id,project_id,actor_id,expected_revision,payload,result_revision)
 values(p_request,p_project,auth.uid(),p_expected,payload,result);
 return result;
end$$;
revoke all on function public.save_robot_build_scope(uuid,integer,text,integer,text,uuid,uuid) from public,anon;
grant execute on function public.save_robot_build_scope(uuid,integer,text,integer,text,uuid,uuid) to authenticated;
commit;
