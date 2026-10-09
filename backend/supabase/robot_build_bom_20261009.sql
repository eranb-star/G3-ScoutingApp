-- Run after robot_build_jobs_20261009.sql. Imports stay private until explicitly shared.
begin;
create table if not exists public.robot_build_boms(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.team_projects(id) on delete restrict,
 snapshot_id uuid not null references public.cad_snapshots(id) on delete restrict,
 owner_id uuid not null references public.team_members(id),name text not null,
 revision integer not null default 1,shared_at timestamptz,created_at timestamptz not null default now(),
 unique(project_id,snapshot_id)
);
create table if not exists public.robot_build_bom_lines(
 id uuid primary key default gen_random_uuid(),bom_id uuid not null references public.robot_build_boms(id) on delete restrict,
 source_key text not null,source_identity jsonb not null,occurrence_paths jsonb not null,
 name text not null,design_quantity integer not null check(design_quantity>0),
 disposition text not null default 'review' check(disposition in ('review','make','buy','reuse','exclude')),
 required_quantity integer not null check(required_quantity>=0),
 inventory_id uuid references public.frc_parts_inventory(id) on delete restrict,
 job_id uuid unique references public.robot_build_jobs(id) on delete restrict,
 review_note text not null default '',revision integer not null default 1,
 unique(bom_id,source_key)
);
create table if not exists public.robot_build_bom_audit(
 id bigint generated always as identity primary key,bom_id uuid not null references public.robot_build_boms(id),
 actor_id uuid not null references public.team_members(id),action text not null,
 detail jsonb not null,created_at timestamptz not null default now()
);
alter table public.robot_build_boms enable row level security;
alter table public.robot_build_bom_lines enable row level security;
alter table public.robot_build_bom_audit enable row level security;
revoke all on public.robot_build_boms,public.robot_build_bom_lines,public.robot_build_bom_audit from public,anon,authenticated;
grant select on public.robot_build_boms,public.robot_build_bom_lines,public.robot_build_bom_audit to authenticated;
drop policy if exists bom_read on public.robot_build_boms;
create policy bom_read on public.robot_build_boms for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and (owner_id=auth.uid() or (shared_at is not null and exists(select 1 from public.team_projects where id=project_id))));
drop policy if exists bom_line_read on public.robot_build_bom_lines;
create policy bom_line_read on public.robot_build_bom_lines for select to authenticated using(exists(select 1 from public.robot_build_boms where id=bom_id));
drop policy if exists bom_audit_read on public.robot_build_bom_audit;
create policy bom_audit_read on public.robot_build_bom_audit for select to authenticated using(exists(select 1 from public.robot_build_boms where id=bom_id));

-- Only the connector may supply normalized rows. Never trust browser-supplied CAD quantities.
create or replace function public.import_robot_build_bom(p_actor uuid,p_project uuid,p_snapshot uuid,p_rows jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;source_name text;r jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=p_actor and active and role='admin')
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('archived','completed'))
 then raise exception 'Active admin and active project required';end if;
 select s.name into source_name from public.cad_snapshots sn join public.cad_sources s on s.id=sn.source_id
 join public.cad_connections c on c.id=s.connection_id
 where sn.id=p_snapshot and c.member_id=p_actor and c.disconnected_at is null and s.archived_at is null and s.element_type='ASSEMBLY';
 if source_name is null then raise exception 'Snapshot does not belong to this connected admin';end if;
 select id into result from public.robot_build_boms where project_id=p_project and snapshot_id=p_snapshot;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>100000 then raise exception 'A nonempty resolved assembly is required';end if;
 if result is not null then
  if (select count(*) from public.robot_build_bom_lines where bom_id=result)<>jsonb_array_length(p_rows)
   or exists(select 1 from jsonb_array_elements(p_rows) x where not exists(select 1 from public.robot_build_bom_lines l where l.bom_id=result and l.source_key=x->>'key' and l.design_quantity=(x->>'quantity')::integer and l.occurrence_paths=x->'paths'))
   then raise exception 'This snapshot was already imported with different assembly boundaries; its reviewed records were preserved';end if;
  return result;
 end if;
 insert into public.robot_build_boms(project_id,snapshot_id,owner_id,name) values(p_project,p_snapshot,p_actor,source_name) returning id into result;
 for r in select value from jsonb_array_elements(p_rows) loop
  insert into public.robot_build_bom_lines(bom_id,source_key,source_identity,occurrence_paths,name,design_quantity,required_quantity)
  values(result,r->>'key',r-'paths'-'quantity'-'name',r->'paths',r->>'name',(r->>'quantity')::integer,(r->>'quantity')::integer);
 end loop;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail) values(result,p_actor,'imported',jsonb_build_object('snapshot',p_snapshot));
 return result;
end$$;
revoke all on function public.import_robot_build_bom(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.import_robot_build_bom(uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.review_robot_build_line(p_line uuid,p_expected integer,p_disposition text,p_quantity integer,p_inventory uuid,p_note text)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;
 select * into b from public.robot_build_boms where id=l.bom_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects p where p.id=b.project_id and p.status not in ('completed','archived')
 and public.has_permission('assign_team_work',p.subteam))
 or not (b.owner_id=auth.uid() or b.shared_at is not null) then raise exception 'BOM review is not permitted';end if;
 if l.revision<>p_expected then raise exception 'Part review changed. Reload before saving';end if;
 if l.job_id is not null then raise exception 'This line is linked to manufacturing. Preserve it and review changes in a new BOM revision';end if;
 if p_disposition is null or p_disposition not in ('make','buy','reuse','exclude') or p_quantity is null or p_quantity<0 or p_quantity>100000
 or (p_disposition='exclude' and p_quantity<>0) or (p_disposition<>'exclude' and p_quantity=0)
 then raise exception 'Choose a valid disposition and quantity';end if;
 if length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Explain the quantity and make/buy/reuse decision';end if;
 if p_inventory is not null and not exists(select 1 from public.frc_parts_inventory where id=p_inventory and not archived and unit='pcs')
 then raise exception 'Choose an active inventory item measured in pieces; raw material recipes are separate';end if;
 if p_disposition in ('buy','reuse') and p_inventory is null then raise exception 'Match purchased or reused components to an inventory item';end if;
 update public.robot_build_bom_lines set disposition=p_disposition,required_quantity=p_quantity,inventory_id=p_inventory,review_note=trim(p_note),revision=revision+1 where id=l.id;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail) values(b.id,auth.uid(),'line_reviewed',jsonb_build_object('before',to_jsonb(l),'disposition',p_disposition,'quantity',p_quantity,'inventory',p_inventory,'note',trim(p_note)));
 return l.revision+1;
end$$;
revoke all on function public.review_robot_build_line(uuid,integer,text,integer,uuid,text) from public,anon;
grant execute on function public.review_robot_build_line(uuid,integer,text,integer,uuid,text) to authenticated;

create or replace function public.share_robot_build_bom(p_bom uuid,p_expected integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.robot_build_boms%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into b from public.robot_build_boms where id=p_bom for update;
 if b.id is null or b.owner_id<>auth.uid() or not exists(select 1 from public.team_members where id=auth.uid() and active and role='admin') then raise exception 'Only the importing active admin can share this parts list';end if;
 if b.shared_at is not null then return;end if;
 if b.revision<>p_expected then raise exception 'BOM changed. Reload before sharing';end if;
 update public.robot_build_boms set shared_at=now(),revision=revision+1 where id=b.id;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b.id,auth.uid(),'shared_with_project',jsonb_build_object('project',b.project_id));
end$$;
revoke all on function public.share_robot_build_bom(uuid,integer) from public,anon;
grant execute on function public.share_robot_build_bom(uuid,integer) to authenticated;
create or replace function public.link_robot_build_line(p_line uuid,p_expected integer,p_job uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;j public.robot_build_jobs%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;
 select * into b from public.robot_build_boms where id=l.bom_id;
 select * into j from public.robot_build_jobs where id=p_job;
 if l.id is null or b.shared_at is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam))
 then raise exception 'Share the reviewed parts list and use an authorized project manager';end if;
 if l.job_id=p_job then return;end if;
 if l.revision<>p_expected or l.job_id is not null then raise exception 'Part changed or already linked';end if;
 if l.disposition<>'make' or j.required_quantity<>l.required_quantity or j.id is null
 or not exists(select 1 from public.project_tasks where id=j.task_id and project_id=b.project_id)
 then raise exception 'Choose a manufacturing job in this project with the reviewed quantity';end if;
 update public.robot_build_bom_lines set job_id=j.id,revision=revision+1 where id=l.id;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b.id,auth.uid(),'job_linked',jsonb_build_object('line',l.id,'job',j.id,'revision',j.part_revision));
end$$;
revoke all on function public.link_robot_build_line(uuid,integer,uuid) from public,anon;
grant execute on function public.link_robot_build_line(uuid,integer,uuid) to authenticated;
commit;
