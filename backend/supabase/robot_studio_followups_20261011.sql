begin;
create table if not exists robot_studio_followups(
 id uuid primary key,scene_id uuid not null,revision integer not null,option_id text not null,
 request_body jsonb not null,task_id uuid not null unique references project_tasks(id) on delete cascade,
 project_id uuid not null references team_projects(id),brief text not null check(length(trim(brief)) between 1 and 4000),
 created_by uuid not null references team_members(id),created_at timestamptz not null default now(),
 foreign key(scene_id,revision) references robot_studio_versions(scene_id,revision)
);
alter table robot_studio_followups enable row level security;
revoke all on robot_studio_followups from public,anon,authenticated;
grant select on robot_studio_followups to authenticated;
drop policy if exists studio_followups_read on robot_studio_followups;
create policy studio_followups_read on robot_studio_followups for select to authenticated using(studio_access(scene_id) and exists(select 1 from robot_studio_versions v where v.scene_id=robot_studio_followups.scene_id and v.revision=robot_studio_followups.revision));
create or replace function create_robot_studio_followup(p_id uuid,p_scene uuid,p_revision integer,p_option text,p_project uuid,p_title text,p_owner uuid,p_due timestamptz,p_brief text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d jsonb;result uuid;old robot_studio_followups%rowtype;payload jsonb:=jsonb_build_object('title',p_title,'owner',p_owner,'due',p_due);
begin
 if not studio_access(p_scene) or not exists(select 1 from team_projects p where p.id=p_project and p.status not in ('completed','archived') and has_permission('assign_team_work',p.subteam)) then raise exception 'Design access and project assignment permission required';end if;
 select document into d from robot_studio_versions where scene_id=p_scene and revision=p_revision;
 if d is null or not studio_source_access(d) or not exists(select 1 from jsonb_array_elements(d->'options') x where x->>'id'=p_option) then raise exception 'Accessible saved alternative required';end if;
 if not exists(select 1 from team_members m where m.id=p_owner and m.active) or not exists(select 1 from robot_studio_scenes s where s.id=p_scene and (s.owner_id=p_owner or exists(select 1 from robot_studio_members m where m.scene_id=p_scene and m.member_id=p_owner))) or exists(select 1 from jsonb_array_elements(d->'assets') a where a->>'kind'='onshape' and not exists(select 1 from cad_snapshots sn join cad_sources src on src.id=sn.source_id where sn.id::text=a->>'snapshotId' and src.id::text=a->>'sourceId' and ((src.archived_at is null and cad_connection_access(p_owner,src.connection_id)) or studio_approved_cad(sn.id::text)))) then raise exception 'Share this design with the task owner before assigning it';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into old from robot_studio_followups where id=p_id;
 if old.id is not null then
  if old.created_by=auth.uid() and old.scene_id=p_scene and old.revision=p_revision and old.option_id=p_option and old.project_id=p_project and old.brief=trim(p_brief) and old.request_body=payload then return old.task_id;end if;
  raise exception 'Follow-up request identity already used';
 end if;
 result:=create_task_with_collaborators(p_project,p_title,p_owner,p_due,'{}'::uuid[]);
 insert into robot_studio_followups(id,scene_id,revision,option_id,request_body,task_id,project_id,brief,created_by) values(p_id,p_scene,p_revision,p_option,payload,result,p_project,trim(p_brief),auth.uid());
 return result;
end$$;
revoke all on function create_robot_studio_followup(uuid,uuid,integer,text,uuid,text,uuid,timestamptz,text) from public,anon;
grant execute on function create_robot_studio_followup(uuid,uuid,integer,text,uuid,text,uuid,timestamptz,text) to authenticated;
commit;
