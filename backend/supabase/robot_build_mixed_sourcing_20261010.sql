-- A mixed-source requirement is partitioned into conserved, traceable execution lines.
-- Existing stock/job/kit identities stay unchanged; only uncommitted planning demand can split.
begin;
create table if not exists public.robot_build_sourcing_groups(
 id uuid primary key,original_line_id uuid not null unique references public.robot_build_bom_lines(id),
 name text not null,total_quantity integer not null check(total_quantity>0),
 request_payload jsonb not null,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now()
);
alter table public.robot_build_bom_lines add column if not exists sourcing_group_id uuid references public.robot_build_sourcing_groups(id);
alter table public.robot_build_sourcing_groups enable row level security;
revoke all on public.robot_build_sourcing_groups from public,anon,authenticated;
grant select on public.robot_build_sourcing_groups to authenticated;
drop policy if exists sourcing_group_read on public.robot_build_sourcing_groups;
create policy sourcing_group_read on public.robot_build_sourcing_groups for select to authenticated using(exists(select 1 from public.robot_build_bom_lines where id=original_line_id));
create or replace function public.robot_build_overlap_ids(p_line uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(x.id order by x.id),'[]') from public.robot_build_bom_lines l
 join public.robot_build_boms b on b.id=l.bom_id
 join public.robot_build_boms other on other.project_id=b.project_id
 join public.robot_build_bom_lines x on x.bom_id=other.id and x.id<>l.id
 where l.id=p_line and (l.sourcing_group_id is null or x.sourcing_group_id is distinct from l.sourcing_group_id) and (
  (l.source_identity->>'documentId' is not null and x.source_identity->>'documentId'=l.source_identity->>'documentId'
   and x.source_identity->>'elementId'=l.source_identity->>'elementId'
   and x.source_identity->>'partId'=l.source_identity->>'partId'
   and coalesce(x.source_identity->>'configuration','')=coalesce(l.source_identity->>'configuration',''))
  or (b.snapshot_id is not null and other.snapshot_id is not null and exists(
   select 1 from public.cad_snapshots a join public.cad_sources sa on sa.id=a.source_id,
   public.cad_snapshots z join public.cad_sources sz on sz.id=z.source_id
   where a.id=b.snapshot_id and z.id=other.snapshot_id and sa.document_id=sz.document_id and sa.element_id=sz.element_id and sa.configuration=sz.configuration
   and l.source_identity->>'partId'=x.source_identity->>'partId'))
  or (b.snapshot_id is not null and other.snapshot_id is not null and exists(
   select 1 from public.cad_snapshots a join public.cad_sources sa on sa.id=a.source_id,
   public.cad_snapshots z join public.cad_sources sz on sz.id=z.source_id
   where a.id=b.snapshot_id and z.id=other.snapshot_id and (
    exists(select 1 from jsonb_array_elements(coalesce(a.evidence#>'{assembly,subAssemblies}','[]')||coalesce(a.evidence#>'{assembly,rootAssembly,instances}','[]')) sub where sub->>'documentId'=sz.document_id and sub->>'elementId'=sz.element_id)
    or exists(select 1 from jsonb_array_elements(coalesce(z.evidence#>'{assembly,subAssemblies}','[]')||coalesce(z.evidence#>'{assembly,rootAssembly,instances}','[]')) sub where sub->>'documentId'=sa.document_id and sub->>'elementId'=sa.element_id)))));
$$;

create or replace function public.split_robot_build_sourcing(p_line uuid,p_expected integer,p_routes jsonb,p_note text,p_request uuid,p_assemblies jsonb default '[]')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;g public.robot_build_sourcing_groups%rowtype;r jsonb;payload jsonb;total integer;position integer:=0;new_id uuid;assignment jsonb;route_ids jsonb:='{}';
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;
 select * into b from public.robot_build_boms where id=l.bom_id;
 if l.id is null or b.shared_at is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active build leader and shared requirement required';end if;
 payload:=jsonb_build_object('line',p_line,'expected',p_expected,'routes',p_routes,'note',trim(p_note),'assemblies',p_assemblies);
 select * into g from public.robot_build_sourcing_groups where id=p_request;
 if found then if g.created_by=auth.uid() and g.request_payload=payload then return g.id;end if;raise exception 'Request already used with different values';end if;
 if l.revision<>p_expected then raise exception 'Requirement changed. Reload before splitting';end if;
 if l.sourcing_group_id is not null or l.job_id is not null or l.covered_by is not null
 or exists(select 1 from public.robot_build_preparations where line_id=l.id)
 or exists(select 1 from public.robot_build_allocations where line_id=l.id)
 or exists(select 1 from public.robot_build_purchases where line_id=l.id)
 or exists(select 1 from public.robot_build_kit_requirements where line_id=l.id)
 then raise exception 'This requirement has sourcing or execution history. Preserve it; plan additional demand separately';end if;
 if jsonb_typeof(p_assemblies) is distinct from 'array' then raise exception 'Provide assembly allocations';end if;
 if exists(select 1 from jsonb_array_elements(p_assemblies)x where coalesce((x->>'quantity')::integer,0)<=0 or x->>'route' not in ('make','reuse','buy') or not exists(select 1 from public.robot_build_assembly_requirements ar where ar.line_id=l.id and ar.assembly_id=(x->>'assembly')::uuid)) then raise exception 'Choose existing assembly allocations with positive quantities';end if;
 if exists(select 1 from public.robot_build_assembly_requirements ar where ar.line_id=l.id and ar.quantity<>(select coalesce(sum((x->>'quantity')::integer),0) from jsonb_array_elements(p_assemblies)x where x->>'assembly'=ar.assembly_id::text)) then raise exception 'Preserve each assembly total when splitting sources';end if;
 if exists(select 1 from jsonb_array_elements(p_assemblies)x group by x->>'assembly',x->>'route' having count(*)>1) then raise exception 'Duplicate assembly source';end if;
 if exists(select 1 from (select x->>'route' route,sum((x->>'quantity')::integer) quantity from jsonb_array_elements(p_assemblies)x group by x->>'route') allocation where allocation.quantity>coalesce((select (route_row->>'quantity')::integer from jsonb_array_elements(p_routes)route_row where route_row->>'route'=allocation.route),0)) then raise exception 'Assembly allocations exceed a source quantity';end if;
 if p_request is null or jsonb_typeof(p_routes) is distinct from 'array' or jsonb_array_length(p_routes) not between 2 and 3 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose two or three sourcing routes and explain the plan';end if;
 if exists(select 1 from jsonb_array_elements(p_routes) x where x->>'route' not in ('make','buy','reuse') or x->>'route' is null or coalesce((x->>'quantity')::integer,0) not between 1 and 100000)
 or (select count(distinct x->>'route') from jsonb_array_elements(p_routes)x)<>jsonb_array_length(p_routes) then raise exception 'Each source must be unique with a positive whole quantity';end if;
 select sum((x->>'quantity')::integer) into total from jsonb_array_elements(p_routes)x;
 if total<>l.required_quantity then raise exception 'Sourcing quantities must exactly equal the existing requirement';end if;
 for r in select value from jsonb_array_elements(p_routes) loop
  if r->>'route' in ('buy','reuse') and not exists(select 1 from public.frc_parts_inventory where id=(r->>'inventory')::uuid and not archived and unit='pcs') then raise exception 'Match stock and purchased sources to an active piece-counted inventory item';end if;
 end loop;
 insert into public.robot_build_sourcing_groups(id,original_line_id,name,total_quantity,request_payload,created_by)values(p_request,l.id,l.name,total,payload,auth.uid());
 delete from public.robot_build_assembly_requirements where line_id=l.id;
 for r in select value from jsonb_array_elements(p_routes) loop
  position:=position+1;
  if position=1 then
   new_id:=l.id;
   update public.robot_build_bom_lines set sourcing_group_id=p_request,required_quantity=(r->>'quantity')::integer,disposition=r->>'route',inventory_id=nullif(r->>'inventory','')::uuid,review_note=trim(p_note),revision=revision+1 where id=l.id;
  else
   insert into public.robot_build_bom_lines(bom_id,source_key,source_identity,occurrence_paths,name,design_quantity,required_quantity,disposition,inventory_id,review_note,sourcing_group_id)
   values(l.bom_id,l.source_key||':source:'||p_request||':'||position,l.source_identity,l.occurrence_paths,l.name,l.design_quantity,(r->>'quantity')::integer,r->>'route',nullif(r->>'inventory','')::uuid,trim(p_note),p_request) returning id into new_id;
  end if;
  route_ids:=route_ids||jsonb_build_object(r->>'route',new_id);
 end loop;
 for assignment in select value from jsonb_array_elements(p_assemblies) loop
  insert into public.robot_build_assembly_requirements(assembly_id,line_id,quantity)values((assignment->>'assembly')::uuid,(route_ids->>(assignment->>'route'))::uuid,(assignment->>'quantity')::integer);
 end loop;
 update public.robot_build_assemblies set revision=revision+1,updated_by=auth.uid(),updated_at=now() where id in(select (x->>'assembly')::uuid from jsonb_array_elements(p_assemblies)x);
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b.id,auth.uid(),'sourcing_split',payload||jsonb_build_object('group',p_request,'total',total));
 return p_request;
end$$;
create or replace function public.guard_robot_build_source_total()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare group_id uuid;planned integer;actual integer;
begin
 group_id:=coalesce(new.sourcing_group_id,old.sourcing_group_id);
 if tg_op='UPDATE' and old.sourcing_group_id is not null and new.sourcing_group_id is distinct from old.sourcing_group_id then raise exception 'Sourcing identity cannot be reassigned';end if;
 if group_id is not null then
  select total_quantity into planned from public.robot_build_sourcing_groups where id=group_id;
  select coalesce(sum(required_quantity),0) into actual from public.robot_build_bom_lines where sourcing_group_id=group_id;
  if actual<>planned then raise exception 'Mixed-source quantities must preserve the total requirement';end if;
 end if;
 return null;
end$$;
drop trigger if exists guard_robot_build_source_total on public.robot_build_bom_lines;
create constraint trigger guard_robot_build_source_total after insert or update or delete on public.robot_build_bom_lines deferrable initially deferred for each row execute function public.guard_robot_build_source_total();
revoke all on function public.split_robot_build_sourcing(uuid,integer,jsonb,text,uuid,jsonb) from public,anon;
grant execute on function public.split_robot_build_sourcing(uuid,integer,jsonb,text,uuid,jsonb) to authenticated;
revoke all on function public.guard_robot_build_source_total() from public,anon,authenticated;
commit;
