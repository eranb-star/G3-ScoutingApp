-- Material identity and usable geometry supplement (not replace) shared stock units.
begin;
create table if not exists public.robot_build_stock_specs(
 part_id uuid primary key references public.frc_parts_inventory(id),
 specification jsonb not null,revision integer not null default 1,
 recorded_by uuid not null references public.team_members(id),recorded_at timestamptz not null default now()
);
alter table public.robot_build_materials add column if not exists required_spec jsonb;
alter table public.robot_build_materials add column if not exists stock_spec_revision integer;
create table if not exists public.robot_build_spec_events(
 id uuid primary key,part_id uuid not null references public.frc_parts_inventory(id),
 material_id uuid references public.robot_build_materials(id),actor_id uuid not null references public.team_members(id),
 expected_revision integer not null,specification jsonb not null,note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_stock_specs enable row level security;
alter table public.robot_build_spec_events enable row level security;
revoke all on public.robot_build_stock_specs,public.robot_build_spec_events from public,anon,authenticated;
grant select on public.robot_build_stock_specs,public.robot_build_spec_events to authenticated;
drop policy if exists stock_spec_read on public.robot_build_stock_specs;
create policy stock_spec_read on public.robot_build_stock_specs for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.frc_parts_inventory where id=part_id));
drop policy if exists material_spec_event_read on public.robot_build_spec_events;
create policy material_spec_event_read on public.robot_build_spec_events for select to authenticated using(
 exists(select 1 from public.robot_build_stock_specs where part_id=robot_build_spec_events.part_id)
 and (material_id is null or exists(select 1 from public.robot_build_materials where id=material_id)));

create or replace function public.valid_robot_build_spec(s jsonb) returns boolean
language plpgsql immutable set search_path=public,pg_temp as $$
declare k text;v jsonb;
begin
 if s is null or jsonb_typeof(s)<>'object' or not(s ?& array['material','condition','shape','profile','length_mm','width_mm','thickness_mm']) then return false;end if;
 if s->>'shape' not in ('sheet','bar','tube','filament','other') then return false;end if;
 for k,v in select * from jsonb_each(s) loop
  if k in ('material','condition','profile','shape') then
   if jsonb_typeof(v)<>'string' or length(trim(s->>k)) not between 1 and 120 then return false;end if;
  elsif k in ('length_mm','width_mm','thickness_mm') then
   if jsonb_typeof(v)<>'number' or (s->>k)::numeric<=0 or (s->>k)::numeric>1000000 then return false;end if;
  else return false;
  end if;
 end loop;
 return true;
end$$;
create or replace function public.robot_build_spec_fits(stock jsonb,required jsonb) returns boolean
language sql immutable set search_path=public,pg_temp as $$
 select case when public.valid_robot_build_spec(stock) and public.valid_robot_build_spec(required) then
 stock->>'material'=required->>'material' and stock->>'condition'=required->>'condition'
 and stock->>'shape'=required->>'shape' and stock->>'profile'=required->>'profile'
 and (stock->>'length_mm')::numeric >= (required->>'length_mm')::numeric
 and (stock->>'width_mm')::numeric >= (required->>'width_mm')::numeric
 and (stock->>'thickness_mm')::numeric = (required->>'thickness_mm')::numeric
 else false end;
$$;

create or replace function public.save_robot_build_stock_spec(p_part uuid,p_spec jsonb,p_expected integer,p_note text,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.robot_build_stock_specs%rowtype;e public.robot_build_spec_events%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or not public.has_permission('manage_inventory',null)
 or not exists(select 1 from public.frc_parts_inventory where id=p_part and not archived) then raise exception 'Active inventory manager and material required';end if;
 select * into e from public.robot_build_spec_events where id=p_request;
 if e.id is not null then
  if e.part_id=p_part and e.material_id is null and e.actor_id=auth.uid() and e.expected_revision=p_expected and e.specification=p_spec and e.note=trim(p_note) then return p_expected+1;end if;
  raise exception 'Request identity already used';
 end if;
 if p_request is null or not public.valid_robot_build_spec(p_spec) or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Complete material, condition, shape, profile and measured dimensions in mm';end if;
 select * into s from public.robot_build_stock_specs where part_id=p_part for update;
 if p_expected is null or coalesce(s.revision,0)<>p_expected then raise exception 'Stock specification changed; reload';end if;
 if exists(select 1 from public.robot_build_materials where part_id=p_part and (stock_spec_revision is not null or consumed>0 or reserved>0)) then
  raise exception 'This stock identity is already used. Create a distinct inventory item for changed material or dimensions';end if;
 insert into public.robot_build_stock_specs(part_id,specification,revision,recorded_by)values(p_part,p_spec,p_expected+1,auth.uid())
 on conflict(part_id)do update set specification=excluded.specification,revision=excluded.revision,recorded_by=excluded.recorded_by,recorded_at=now();
 insert into public.robot_build_spec_events(id,part_id,actor_id,expected_revision,specification,note)values(p_request,p_part,auth.uid(),p_expected,p_spec,trim(p_note));
 return p_expected+1;
end$$;

create or replace function public.set_robot_build_material_spec(p_material uuid,p_required jsonb,p_expected integer,p_note text,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.robot_build_materials%rowtype;j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;s public.robot_build_stock_specs%rowtype;e public.robot_build_spec_events%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into m from public.robot_build_materials where id=p_material for update;
 select * into j from public.robot_build_jobs where id=m.job_id;select * into t from public.project_tasks where id=j.task_id;
 if m.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and status not in ('completed','archived')) then raise exception 'Active project leader required';end if;
 select * into e from public.robot_build_spec_events where id=p_request;
 if e.id is not null then
  if e.material_id=p_material and e.actor_id=auth.uid() and e.expected_revision=p_expected and e.specification=p_required and e.note=trim(p_note) then return p_expected+1;end if;
  raise exception 'Request identity already used';end if;
 if p_request is null or p_expected is null or m.revision<>p_expected then raise exception 'Material plan changed; reload';end if;
 if t.archived or t.status='done' or m.consumed>0 or m.reserved>0 or exists(select 1 from public.robot_build_work_events where material_id=m.id) then raise exception 'Reconcile active material before changing its specification';end if;
 select * into s from public.robot_build_stock_specs where part_id=m.part_id;
 if not public.robot_build_spec_fits(s.specification,p_required) then raise exception 'Stock does not match the required material, condition, profile or dimensions';end if;
 if length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record the released drawing or requirement used for this specification';end if;
 update public.robot_build_materials set required_spec=p_required,stock_spec_revision=s.revision,revision=revision+1 where id=m.id;
 insert into public.robot_build_spec_events(id,part_id,material_id,actor_id,expected_revision,specification,note)values(p_request,m.part_id,m.id,auth.uid(),p_expected,p_required,trim(p_note));
 return p_expected+1;
end$$;

create or replace function public.guard_robot_build_material_spec()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.robot_build_stock_specs%rowtype;
begin
 if new.reserved>old.reserved or new.consumed>old.consumed then
  select * into s from public.robot_build_stock_specs where part_id=new.part_id;
  if s.part_id is not null and (new.stock_spec_revision is distinct from s.revision or not public.robot_build_spec_fits(s.specification,new.required_spec)) then
   raise exception 'Confirm a compatible required material specification before reserving or consuming this stock';end if;
 end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_material_spec on public.robot_build_materials;
create trigger guard_robot_build_material_spec before update on public.robot_build_materials for each row execute function public.guard_robot_build_material_spec();
create or replace function public.guard_robot_build_stock_spec_unit()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.unit is distinct from old.unit and exists(select 1 from public.robot_build_stock_specs where part_id=old.id) then
 raise exception 'Material specification uses this inventory unit; create a distinct item instead of relabelling quantities';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_stock_spec_unit on public.frc_parts_inventory;
create trigger guard_robot_build_stock_spec_unit before update of unit on public.frc_parts_inventory for each row execute function public.guard_robot_build_stock_spec_unit();
revoke all on function public.guard_robot_build_stock_spec_unit() from public,anon,authenticated;
revoke all on function public.valid_robot_build_spec(jsonb),public.robot_build_spec_fits(jsonb,jsonb),public.guard_robot_build_material_spec() from public,anon,authenticated;
revoke all on function public.save_robot_build_stock_spec(uuid,jsonb,integer,text,uuid),public.set_robot_build_material_spec(uuid,jsonb,integer,text,uuid) from public,anon;
grant execute on function public.save_robot_build_stock_spec(uuid,jsonb,integer,text,uuid),public.set_robot_build_material_spec(uuid,jsonb,integer,text,uuid) to authenticated;
commit;
