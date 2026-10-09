-- Property observations can change independently of geometry. Never rewrite imported evidence.
begin;
alter table public.cad_part_metadata add column if not exists observation_id uuid not null default '00000000-0000-0000-0000-000000000000';
alter table public.cad_part_metadata drop constraint if exists cad_part_metadata_pkey;
alter table public.cad_part_metadata add primary key(snapshot_id,group_key,observation_id);
alter table public.robot_build_boms add column if not exists metadata_observation uuid not null default '00000000-0000-0000-0000-000000000000';
alter table public.robot_build_boms drop constraint if exists robot_build_boms_project_id_snapshot_id_key;
create unique index if not exists build_bom_observation_identity on public.robot_build_boms(project_id,snapshot_id,metadata_observation);
create or replace function public.import_robot_build_bom_observation(p_actor uuid,p_project uuid,p_snapshot uuid,p_rows jsonb,p_observation uuid)
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
 select id into result from public.robot_build_boms where project_id=p_project and snapshot_id=p_snapshot and metadata_observation=p_observation;
 if p_observation is null then raise exception 'Metadata observation required';end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>100000 then raise exception 'A nonempty resolved assembly is required';end if;
 if result is not null then
  if (select count(*) from public.robot_build_bom_lines where bom_id=result)<>jsonb_array_length(p_rows)
   or exists(select 1 from jsonb_array_elements(p_rows) x where not exists(select 1 from public.robot_build_bom_lines l where l.bom_id=result and l.source_key=x->>'key' and l.design_quantity=(x->>'quantity')::integer and l.occurrence_paths=x->'paths'))
   then raise exception 'This snapshot was already imported with different assembly boundaries; its reviewed records were preserved';end if;
  return result;
 end if;
 insert into public.robot_build_boms(project_id,snapshot_id,owner_id,name,metadata_observation) values(p_project,p_snapshot,p_actor,source_name,p_observation) returning id into result;
 for r in select value from jsonb_array_elements(p_rows) loop
  insert into public.robot_build_bom_lines(bom_id,source_key,source_identity,occurrence_paths,name,design_quantity,required_quantity)
  values(result,r->>'key',r-'paths'-'quantity'-'name',r->'paths',r->>'name',(r->>'quantity')::integer,(r->>'quantity')::integer);
 end loop;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail) values(result,p_actor,'imported',jsonb_build_object('snapshot',p_snapshot));
 return result;
end$$;
revoke all on function public.import_robot_build_bom_observation(uuid,uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.import_robot_build_bom_observation(uuid,uuid,uuid,jsonb,uuid) to service_role;

-- Preserve the original four-argument API and its original observation identity.
create or replace function public.import_robot_build_bom(p_actor uuid,p_project uuid,p_snapshot uuid,p_rows jsonb)
returns uuid language sql security definer set search_path=public,pg_temp as $$
 select public.import_robot_build_bom_observation(p_actor,p_project,p_snapshot,p_rows,'00000000-0000-0000-0000-000000000000');
$$;
revoke all on function public.import_robot_build_bom(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.import_robot_build_bom(uuid,uuid,uuid,jsonb) to service_role;
commit;
