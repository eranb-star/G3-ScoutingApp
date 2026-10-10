-- Phase 1 assembly identity and requirement membership. Existing quantities remain build totals.
begin;
create table if not exists public.robot_build_assemblies(
 id uuid primary key, project_id uuid not null references public.team_projects(id),
 parent_id uuid references public.robot_build_assemblies(id), name text not null,
 quantity integer not null check(quantity between 1 and 100000), owner_id uuid references public.team_members(id),
 due_at date, revision integer not null default 1, updated_by uuid not null references public.team_members(id), updated_at timestamptz not null default now()
);
create table if not exists public.robot_build_assembly_requirements(
 assembly_id uuid not null references public.robot_build_assemblies(id),line_id uuid not null references public.robot_build_bom_lines(id),
 quantity integer not null check(quantity>0),primary key(assembly_id,line_id)
);
create table if not exists public.robot_build_assembly_events(
 id uuid primary key,assembly_id uuid not null references public.robot_build_assemblies(id),actor_id uuid not null references public.team_members(id),
 payload jsonb not null,result_revision integer not null,created_at timestamptz not null default now()
);
alter table public.robot_build_assemblies enable row level security;
alter table public.robot_build_assembly_requirements enable row level security;
alter table public.robot_build_assembly_events enable row level security;
revoke all on public.robot_build_assemblies,public.robot_build_assembly_requirements,public.robot_build_assembly_events from public,anon,authenticated;
grant select on public.robot_build_assemblies,public.robot_build_assembly_requirements,public.robot_build_assembly_events to authenticated;
drop policy if exists assembly_scope_read on public.robot_build_assemblies;
create policy assembly_scope_read on public.robot_build_assemblies for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.team_projects where id=project_id));
drop policy if exists assembly_requirement_read on public.robot_build_assembly_requirements;
create policy assembly_requirement_read on public.robot_build_assembly_requirements for select to authenticated using(exists(select 1 from public.robot_build_assemblies where id=assembly_id) and exists(select 1 from public.robot_build_bom_lines where id=line_id));
drop policy if exists assembly_history_read on public.robot_build_assembly_events;
create policy assembly_history_read on public.robot_build_assembly_events for select to authenticated using(exists(select 1 from public.robot_build_assemblies where id=assembly_id));
create or replace function public.save_robot_build_assembly(p_project uuid,p_id uuid,p_parent uuid,p_name text,p_quantity integer,p_owner uuid,p_due date,p_expected integer,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.robot_build_assemblies%rowtype;e public.robot_build_assembly_events%rowtype;payload jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active build leader required';end if;
 payload:=jsonb_build_object('project',p_project,'parent',p_parent,'name',trim(p_name),'quantity',p_quantity,'owner',p_owner,'due',p_due,'expected',p_expected);
 select * into e from public.robot_build_assembly_events where id=p_request;
 if found then if e.assembly_id=p_id and e.actor_id=auth.uid() and e.payload=payload then return e.result_revision;end if;raise exception 'Request already used with different values';end if;
 if p_id is null or p_request is null or p_expected is null or p_expected<0 or length(trim(coalesce(p_name,''))) not between 2 and 180 or p_quantity is null or p_quantity not between 1 and 100000 then raise exception 'Enter assembly name and positive total quantity';end if;
 if p_owner is not null and not exists(select 1 from public.team_members where id=p_owner and active) then raise exception 'Choose an active responsible member';end if;
 if p_parent is not null and (p_parent=p_id or not exists(select 1 from public.robot_build_assemblies where id=p_parent and project_id=p_project)) then raise exception 'Choose a parent assembly in this build';end if;
 if exists(with recursive ancestors as(select id,parent_id from public.robot_build_assemblies where id=p_parent union all select a.id,a.parent_id from public.robot_build_assemblies a join ancestors x on a.id=x.parent_id)select 1 from ancestors where id=p_id) then raise exception 'Assembly hierarchy cannot contain a cycle';end if;
 select * into previous from public.robot_build_assemblies where id=p_id for update;
 if (previous.id is not null and previous.project_id<>p_project) or coalesce(previous.revision,0)<>p_expected then raise exception 'Assembly changed. Reload before saving';end if;
 -- Membership quantities are explicit total-build quantities, not silently rescaled by hierarchy edits.
 insert into public.robot_build_assemblies(id,project_id,parent_id,name,quantity,owner_id,due_at,revision,updated_by)values(p_id,p_project,p_parent,trim(p_name),p_quantity,p_owner,p_due,p_expected+1,auth.uid())
 on conflict(id)do update set parent_id=excluded.parent_id,name=excluded.name,quantity=excluded.quantity,owner_id=excluded.owner_id,due_at=excluded.due_at,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 insert into public.robot_build_assembly_events(id,assembly_id,actor_id,payload,result_revision)values(p_request,p_id,auth.uid(),payload,p_expected+1);
 return p_expected+1;
end$$;
create or replace function public.assign_robot_build_requirement(p_assembly uuid,p_line uuid,p_quantity integer,p_expected integer,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.robot_build_assemblies%rowtype;l public.robot_build_bom_lines%rowtype;e public.robot_build_assembly_events%rowtype;payload jsonb;other_quantity integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into a from public.robot_build_assemblies where id=p_assembly for update;
 if a.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=a.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active build leader required';end if;
 payload:=jsonb_build_object('line',p_line,'quantity',p_quantity,'expected',p_expected);
 select * into e from public.robot_build_assembly_events where id=p_request;
 if found then if e.assembly_id=p_assembly and e.actor_id=auth.uid() and e.payload=payload then return e.result_revision;end if;raise exception 'Request already used with different values';end if;
 if p_request is null or p_expected is distinct from a.revision or p_quantity is null or p_quantity<0 then raise exception 'Reload assembly and enter a nonnegative total quantity';end if;
 select x.* into l from public.robot_build_bom_lines x join public.robot_build_boms b on b.id=x.bom_id where x.id=p_line and b.project_id=a.project_id and b.shared_at is not null;
 if l.id is null then raise exception 'Choose a shared requirement from this build';end if;
 select coalesce(sum(quantity),0) into other_quantity from public.robot_build_assembly_requirements where line_id=p_line and assembly_id<>p_assembly;
 if other_quantity+p_quantity>l.required_quantity then raise exception 'Assembly quantities exceed the existing build requirement. Review demand first';end if;
 if p_quantity=0 then delete from public.robot_build_assembly_requirements where assembly_id=p_assembly and line_id=p_line;
 else insert into public.robot_build_assembly_requirements values(p_assembly,p_line,p_quantity)on conflict(assembly_id,line_id)do update set quantity=excluded.quantity;end if;
 update public.robot_build_assemblies set revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=p_assembly;
 insert into public.robot_build_assembly_events(id,assembly_id,actor_id,payload,result_revision)values(p_request,p_assembly,auth.uid(),payload,a.revision+1);
 return a.revision+1;
end$$;
create or replace function public.guard_robot_build_assembly_demand()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.required_quantity<(select coalesce(sum(quantity),0) from public.robot_build_assembly_requirements where line_id=new.id) then raise exception 'Review assembly quantities before reducing total build demand';end if;return new;
end$$;
drop trigger if exists guard_assembly_demand on public.robot_build_bom_lines;
create trigger guard_assembly_demand before update on public.robot_build_bom_lines for each row execute function public.guard_robot_build_assembly_demand();
revoke all on function public.save_robot_build_assembly(uuid,uuid,uuid,text,integer,uuid,date,integer,uuid),public.assign_robot_build_requirement(uuid,uuid,integer,integer,uuid) from public,anon;
revoke all on function public.guard_robot_build_assembly_demand() from public,anon,authenticated;
grant execute on function public.save_robot_build_assembly(uuid,uuid,uuid,text,integer,uuid,date,integer,uuid),public.assign_robot_build_requirement(uuid,uuid,integer,integer,uuid) to authenticated;
commit;
-- Atomic manual requirement creation in assembly context.
begin;
create or replace function public.add_robot_build_assembly_requirement(p_project uuid,p_assembly uuid,p_name text,p_quantity integer,p_source text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.robot_build_assemblies%rowtype;e public.robot_build_assembly_events%rowtype;l uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into a from public.robot_build_assemblies where id=p_assembly and project_id=p_project for update;
 if a.id is null then raise exception 'Choose an assembly in this build';end if;
 l:=public.add_robot_build_requirement(p_project,p_name,p_quantity,p_source,p_request);
 select * into e from public.robot_build_assembly_events where id=p_request;
 if found then
  if e.assembly_id<>p_assembly or e.actor_id<>auth.uid() or e.payload->>'line'<>l::text or (e.payload->>'quantity')::integer<>p_quantity then raise exception 'Request already used with different assembly';end if;
  return l;
 end if;
 perform public.assign_robot_build_requirement(p_assembly,l,p_quantity,a.revision,p_request);
 return l;
end$$;
revoke all on function public.add_robot_build_assembly_requirement(uuid,uuid,text,integer,text,uuid) from public,anon;
grant execute on function public.add_robot_build_assembly_requirement(uuid,uuid,text,integer,text,uuid) to authenticated;
commit;
