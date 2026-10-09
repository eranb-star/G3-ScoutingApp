begin;
create table if not exists public.robot_build_event_handoffs(
 id uuid primary key,project_id uuid not null references public.team_projects(id),
 event_id uuid not null references public.events(id),configuration_id uuid not null references public.project_robot_configurations(id),
 packing_item_id uuid references public.frc_operational_items(id),kit_id uuid references public.robot_build_kits(id),
 note text not null check(length(trim(note)) between 3 and 2000),
 created_by uuid not null references public.team_members(id),created_at timestamptz not null default now()
);
alter table public.robot_build_event_handoffs enable row level security;
revoke all on public.robot_build_event_handoffs from public,anon,authenticated;
grant select on public.robot_build_event_handoffs to authenticated;
drop policy if exists build_event_handoff_read on public.robot_build_event_handoffs;
create policy build_event_handoff_read on public.robot_build_event_handoffs for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.team_projects where id=project_id)
 and exists(select 1 from public.events where id=event_id)
 and exists(select 1 from public.project_robot_configurations where id=configuration_id));
create or replace function public.record_robot_build_handoff(p_project uuid,p_event uuid,p_configuration uuid,p_packing uuid,p_kit uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.robot_build_event_handoffs%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project leader required';end if;
 select * into old from public.robot_build_event_handoffs where id=p_request;
 if old.id is not null then
  if old.project_id=p_project and old.event_id=p_event and old.configuration_id=p_configuration and old.packing_item_id is not distinct from p_packing and old.kit_id is not distinct from p_kit and old.note=trim(p_note) and old.created_by=auth.uid() then return old.id;end if;
  raise exception 'Request identity already used with different values';
 end if;
 if not exists(select 1 from public.events where id=p_event and active) then raise exception 'Choose an active competition event';end if;
 if not exists(select 1 from public.project_robot_configurations where id=p_configuration and project_id=p_project and configuration_kind in ('as_built','as_installed') and identity_snapshot #>> '{asset,id}' is not null) then raise exception 'Choose a recorded physical configuration in this build';end if;
 if p_packing is not null and not exists(select 1 from public.frc_operational_items where id=p_packing and area='packing' and not archived) then raise exception 'Choose an existing active packing item';end if;
 if p_kit is not null and not exists(select 1 from public.robot_build_kits k join public.project_tasks t on t.id=k.task_id where k.id=p_kit and t.project_id=p_project and not t.archived and k.retired_at is null) then raise exception 'Choose a current kit in this build';end if;
 if p_request is null or p_note is null then raise exception 'Handoff identity and scope note required';end if;
 insert into public.robot_build_event_handoffs(id,project_id,event_id,configuration_id,packing_item_id,kit_id,note,created_by)
 values(p_request,p_project,p_event,p_configuration,p_packing,p_kit,trim(p_note),auth.uid());
 return p_request;
end$$;
revoke all on function public.record_robot_build_handoff(uuid,uuid,uuid,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.record_robot_build_handoff(uuid,uuid,uuid,uuid,uuid,text,uuid) to authenticated;
commit;
