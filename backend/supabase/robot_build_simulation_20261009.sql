begin;
create table if not exists public.robot_build_simulation_references(
 id uuid primary key,project_id uuid not null references public.team_projects(id),
 bom_id uuid not null references public.robot_build_boms(id),bom_revision integer not null,
 plan_id uuid not null,plan_revision integer not null,
 note text not null check(length(trim(note)) between 3 and 2000),
 created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 foreign key(plan_id,plan_revision) references public.engineering_plan_versions(plan_id,revision)
);
alter table public.robot_build_simulation_references enable row level security;
revoke all on public.robot_build_simulation_references from public,anon,authenticated;
grant select on public.robot_build_simulation_references to authenticated;
drop policy if exists build_simulation_read on public.robot_build_simulation_references;
create policy build_simulation_read on public.robot_build_simulation_references for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.team_projects where id=project_id)
 and exists(select 1 from public.robot_build_boms where id=bom_id)
 and exists(select 1 from public.engineering_plan_versions where plan_id=robot_build_simulation_references.plan_id and revision=plan_revision));
create or replace function public.link_robot_build_simulation(p_project uuid,p_bom uuid,p_expected integer,p_plan uuid,p_revision integer,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.robot_build_boms%rowtype;old public.robot_build_simulation_references%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or public.can_use_engineering_plans() is not true
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project leader and simulator permission required';end if;
 select * into b from public.robot_build_boms where id=p_bom and project_id=p_project and (owner_id=auth.uid() or shared_at is not null);
 if b.id is null or b.snapshot_id is null then raise exception 'Choose an accessible imported CAD parts list in this build';end if;
 if not exists(select 1 from public.engineering_plan_versions v join public.engineering_plans p on p.id=v.plan_id where p.id=p_plan and v.revision=p_revision and (p.owner_id=auth.uid() or p.shared)) then raise exception 'Exact saved simulation revision is not accessible';end if;
 select * into old from public.robot_build_simulation_references where id=p_request;
 if old.id is not null then
  if old.project_id=p_project and old.bom_id=p_bom and old.bom_revision=p_expected and old.plan_id=p_plan and old.plan_revision=p_revision and old.note=trim(p_note) and old.created_by=auth.uid() then return old.id;end if;
  raise exception 'Request identity already used with different values';
 end if;
 if b.revision is distinct from p_expected then raise exception 'Parts list changed; reload before linking';end if;
 if p_request is null or p_note is null then raise exception 'Reference identity and assumptions are required';end if;
 insert into public.robot_build_simulation_references(id,project_id,bom_id,bom_revision,plan_id,plan_revision,note,created_by)
 values(p_request,p_project,p_bom,p_expected,p_plan,p_revision,trim(p_note),auth.uid());
 return p_request;
end$$;
revoke all on function public.link_robot_build_simulation(uuid,uuid,integer,uuid,integer,text,uuid) from public,anon;
grant execute on function public.link_robot_build_simulation(uuid,uuid,integer,uuid,integer,text,uuid) to authenticated;
commit;
