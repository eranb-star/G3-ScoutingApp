-- Explicit admin opt-in: one team CAD catalogue, no browser access to credentials.
begin;
alter table public.cad_connections add column if not exists team_shared boolean not null default false;
create unique index if not exists cad_one_team_connection on public.cad_connections(team_shared) where team_shared;
create or replace function public.cad_connection_access(p_actor uuid,p_connection uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from cad_connections c join team_members owner on owner.id=c.member_id
 join team_members actor on actor.id=p_actor
 where c.id=p_connection and c.disconnected_at is null and owner.active and owner.role='admin' and actor.active
 and ((actor.role='admin' and c.member_id=p_actor) or (c.team_shared and actor.role in ('admin','team_leader'))));
$$;
revoke all on function public.cad_connection_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cad_connection_access(uuid,uuid) to service_role;
create or replace function public.cad_build_manage(p_actor uuid,p_project uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from team_projects p join team_members m on m.id=p_actor
 where p.id=p_project and p.status not in ('archived','completed') and m.active and
 (m.role='admin' or (m.role='team_leader'
 and exists(select 1 from role_permissions rp where rp.role=m.role and rp.permission_key='assign_team_work' and rp.allowed)
 and exists(select 1 from unnest(m.leader_subteams) t where normalize_team(t)=normalize_team(p.subteam)))));
$$;
revoke all on function public.cad_build_manage(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cad_build_manage(uuid,uuid) to service_role;
create or replace function public.import_robot_build_bom_observation(p_actor uuid,p_project uuid,p_snapshot uuid,p_rows jsonb,p_observation uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;source_name text;r jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not public.cad_build_manage(p_actor,p_project) then raise exception 'Project management permission required';end if;
 select s.name into source_name from public.cad_snapshots sn join public.cad_sources s on s.id=sn.source_id
 join public.cad_connections c on c.id=s.connection_id
 where sn.id=p_snapshot and public.cad_connection_access(p_actor,c.id) and s.archived_at is null and s.element_type='ASSEMBLY';
 if source_name is null then raise exception 'Snapshot is not available through an authorized connection';end if;
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


create or replace function public.share_robot_build_bom(p_bom uuid,p_expected integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.robot_build_boms%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into b from public.robot_build_boms where id=p_bom for update;
 if b.id is null or b.owner_id<>auth.uid() or not public.cad_build_manage(auth.uid(),b.project_id) then raise exception 'Only the importing authorized project leader can share this parts list';end if;
 if b.shared_at is not null then return;end if;
 if b.revision<>p_expected then raise exception 'BOM changed. Reload before sharing';end if;
 update public.robot_build_boms set shared_at=now(),revision=revision+1 where id=b.id;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b.id,auth.uid(),'shared_with_project',jsonb_build_object('project',b.project_id));
end$$;
revoke all on function public.share_robot_build_bom(uuid,integer) from public,anon;
grant execute on function public.share_robot_build_bom(uuid,integer) to authenticated;

create or replace function public.claim_robot_build_source_check(p_actor uuid,p_bom uuid,p_request uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_request is null or not exists(select 1 from robot_build_boms b join cad_snapshots sn on sn.id=b.snapshot_id
 join cad_sources s on s.id=sn.source_id where b.id=p_bom and s.archived_at is null
 and public.cad_connection_access(p_actor,s.connection_id)
 and (b.owner_id=p_actor or (b.shared_at is not null and public.cad_build_manage(p_actor,b.project_id))))
 then raise exception 'Authorized source and build access required';end if;
 insert into public.robot_build_source_checks(bom_id,attempted_at)values(p_bom,'epoch')on conflict do nothing;
 update public.robot_build_source_checks set attempted_at=now(),checking_until=now()+interval '45 seconds',request_id=p_request
 where bom_id=p_bom and (checking_until is null or checking_until<now()) and attempted_at<now()-interval '30 seconds';
 return found;
end$$;
revoke all on function public.claim_robot_build_source_check(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_robot_build_source_check(uuid,uuid,uuid) to service_role;
commit;

