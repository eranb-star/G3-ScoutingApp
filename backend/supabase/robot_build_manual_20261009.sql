begin;
alter table public.robot_build_boms alter column snapshot_id drop not null;
create unique index if not exists robot_build_manual_project on public.robot_build_boms(project_id) where snapshot_id is null;
create or replace function public.add_robot_build_requirement(p_project uuid,p_name text,p_quantity integer,p_source text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare b uuid;prior public.robot_build_bom_lines%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam))
 then raise exception 'Active project management permission required';end if;
 if p_request is null or length(trim(coalesce(p_name,''))) not between 1 and 180 or p_quantity is null or p_quantity not between 1 and 100000
 or length(trim(coalesce(p_source,''))) not between 3 and 2000 then raise exception 'Enter a name, positive quantity and source or reason for this requirement';end if;
 select * into prior from public.robot_build_bom_lines where id=p_request;
 if prior.id is not null then
  if prior.source_identity->>'created_by'=auth.uid()::text and prior.source_identity->>'project_id'=p_project::text and prior.name=trim(p_name) and prior.design_quantity=p_quantity and prior.source_identity->>'provenance'=trim(p_source) then return prior.id;end if;
  raise exception 'Request identity was already used with different values';
 end if;
 select id into b from public.robot_build_boms where project_id=p_project and snapshot_id is null;
 if b is null then
  insert into public.robot_build_boms(project_id,owner_id,name,shared_at)values(p_project,auth.uid(),'Workshop requirements',now())returning id into b;
 end if;
 insert into public.robot_build_bom_lines(id,bom_id,source_key,source_identity,occurrence_paths,name,design_quantity,required_quantity)
 values(p_request,b,'manual:'||p_request,jsonb_build_object('kind','manual','created_by',auth.uid(),'project_id',p_project,'provenance',trim(p_source)),'[]',trim(p_name),p_quantity,p_quantity);
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b,auth.uid(),'manual_requirement_added',jsonb_build_object('line',p_request,'source',trim(p_source)));
 return p_request;
end$$;
revoke all on function public.add_robot_build_requirement(uuid,text,integer,text,uuid) from public,anon;
grant execute on function public.add_robot_build_requirement(uuid,text,integer,text,uuid) to authenticated;
commit;
