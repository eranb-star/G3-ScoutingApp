begin;
create table if not exists public.robot_studio_proposals(
 id uuid primary key,scene_id uuid not null references robot_studio_scenes(id),scene_revision integer not null,
 project_id uuid not null references team_projects(id),option_id text not null,items jsonb not null,
 created_by uuid not null references team_members(id),created_at timestamptz not null default now(),
 applied_by uuid references team_members(id),applied_at timestamptz,
 foreign key(scene_id,scene_revision)references robot_studio_versions(scene_id,revision)
);
create table if not exists public.robot_studio_build_mappings(
 scene_id uuid not null references robot_studio_scenes(id),project_id uuid not null references team_projects(id),
 option_id text not null,instance_id text not null,line_id uuid not null references robot_build_bom_lines(id),
 definition jsonb not null,proposal_id uuid not null references robot_studio_proposals(id),
 primary key(scene_id,project_id,option_id,instance_id)
);
alter table robot_studio_proposals enable row level security;
alter table robot_studio_build_mappings enable row level security;
revoke all on robot_studio_proposals,robot_studio_build_mappings from public,anon,authenticated;
grant select on robot_studio_proposals,robot_studio_build_mappings to authenticated;
drop policy if exists studio_proposal_read on robot_studio_proposals;
create policy studio_proposal_read on robot_studio_proposals for select to authenticated using(studio_access(scene_id) and exists(select 1 from team_projects where id=project_id));
drop policy if exists studio_mapping_read on robot_studio_build_mappings;
create policy studio_mapping_read on robot_studio_build_mappings for select to authenticated using(studio_access(scene_id) and exists(select 1 from team_projects where id=project_id));
create or replace function public.propose_robot_studio(p_id uuid,p_scene uuid,p_revision integer,p_project uuid,p_option text,p_items jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d jsonb;o jsonb;item jsonb;part jsonb;old robot_studio_proposals%rowtype;
begin
 if not studio_access(p_scene,true) then raise exception 'Design editor required';end if;
 if p_id is null or not exists(select 1 from team_projects p where p.id=p_project and p.status not in ('completed','archived')
 and (public.has_permission('assign_team_work',p.subteam) or p.id in (select project_id from project_tasks where assignee_id=auth.uid())))
 then raise exception 'Choose an active build you manage or have assigned work in';end if;
 select document into d from robot_studio_versions where scene_id=p_scene and revision=p_revision;
 if d is null or not studio_source_access(d) then raise exception 'Save an accessible version first';end if;
 select value into o from jsonb_array_elements(d->'options') x where x->>'id'=p_option;
 if o is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid alternative or proposal';end if;
 if jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>500 then raise exception 'Choose parts to propose';end if;
 if (select count(distinct value->>'instance') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Duplicate instance';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  select value into part from jsonb_array_elements(o->'parts') x where x->>'id'=item->>'instance';
  if part is null or (coalesce((part->>'reference')::boolean,false) or coalesce((part->>'group')::boolean,false) or coalesce((part->>'nonvisual')::boolean,false)) then raise exception 'Only physical instances can be proposed';end if;
  if coalesce(item->>'action','') not in ('new','match') then raise exception 'Choose new or matched requirement';end if;
  if item->>'assembly' is not null and (item->>'action'<>'new' or not exists(select 1 from robot_build_assemblies where id::text=item->>'assembly' and project_id=p_project and revision=(item->>'assemblyRevision')::integer)) then raise exception 'Choose a current assembly for a new requirement';end if;
  if item->>'action'='match' and not exists(select 1 from robot_build_bom_lines l join robot_build_boms b on b.id=l.bom_id where l.id::text=item->>'line' and b.project_id=p_project and (b.owner_id=auth.uid() or b.shared_at is not null)) then raise exception 'Requirement not accessible';end if;
 end loop;
 select * into old from robot_studio_proposals where id=p_id;
 if old.id is not null then if old.created_by=auth.uid() and old.scene_id=p_scene and old.scene_revision=p_revision and old.project_id=p_project and old.option_id=p_option and old.items=p_items then return old.id;end if;raise exception 'Proposal identity already used';end if;
 insert into robot_studio_proposals(id,scene_id,scene_revision,project_id,option_id,items,created_by)values(p_id,p_scene,p_revision,p_project,p_option,p_items,auth.uid());return p_id;
end$$;
create or replace function public.apply_robot_studio_proposal(p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p robot_studio_proposals%rowtype;d jsonb;o jsonb;i jsonb;part jsonb;part_definition jsonb;m robot_studio_build_mappings%rowtype;l robot_build_bom_lines%rowtype;line uuid;proof text;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into p from robot_studio_proposals where id=p_id for update;
 if p.id is null or not studio_access(p.scene_id) or not exists(select 1 from team_projects where id=p.project_id and status not in ('completed','archived') and has_permission('assign_team_work',subteam))then raise exception 'Accessible design and active build leader required';end if;
 if p.applied_at is not null then return;end if;
 if not exists(select 1 from robot_studio_scenes where id=p.scene_id and revision=p.scene_revision)then raise exception 'Design has changed; review a new proposal';end if;
 select document into d from robot_studio_versions where scene_id=p.scene_id and revision=p.scene_revision;
 select value into o from jsonb_array_elements(d->'options') x where x->>'id'=p.option_id;
 -- Check all assembly revisions before any requirement increments an assembly revision.
 for i in select value from jsonb_array_elements(p.items) loop
  if i->>'assembly' is not null and not exists(select 1 from robot_build_assemblies where id::text=i->>'assembly' and project_id=p.project_id and revision=(i->>'assemblyRevision')::integer) then raise exception 'Assembly changed; review a new proposal';end if;
 end loop;
 for i in select value from jsonb_array_elements(p.items) loop
  select value into part from jsonb_array_elements(o->'parts') x where x->>'id'=i->>'instance';
  part_definition:=jsonb_build_object('shape',part->'shape','asset',part->'assetId','material',part->'material','note',part->'note');
  select * into m from robot_studio_build_mappings where scene_id=p.scene_id and project_id=p.project_id and option_id=p.option_id and instance_id=i->>'instance';
  if m.line_id is not null then
   if m.definition<>part_definition then
    if i->>'action'<>'match' or not exists(select 1 from robot_build_change_decisions c where c.line_id=m.line_id and c.candidate_id::text=i->>'line' and c.decision in ('adopt_unstarted','rework') and c.activated_at is not null and c.review_submission_id is not null and robot_build_change_review_valid(c.review_task_id) and exists(select 1 from project_review_gates g join project_review_submissions sub on sub.id=g.current_submission where g.task_id=c.review_task_id and g.enabled and g.decision_type='design_review_passed' and sub.id=c.review_submission_id and sub.revision='CHG-'||c.id::text and not(sub.required_reviewers @> jsonb_build_array(c.proposed_by))) and not exists(select 1 from robot_build_change_decisions newer where newer.line_id=c.line_id and newer.sequence>c.sequence)) then raise exception 'Changed adopted part: first approve its candidate in build change review, then match that candidate here';end if;
    select x.* into l from robot_build_bom_lines x join robot_build_boms b on b.id=x.bom_id where x.id::text=i->>'line' and b.project_id=p.project_id and (b.owner_id=auth.uid() or b.shared_at is not null) for update of x;
    if l.id is null or l.revision is distinct from (i->>'expected')::integer then raise exception 'Candidate requirement changed; review again';end if;
    update robot_studio_build_mappings set line_id=l.id,definition=part_definition,proposal_id=p.id where scene_id=p.scene_id and project_id=p.project_id and option_id=p.option_id and instance_id=i->>'instance';
    continue;
   end if;
   if i->>'action'='match' and m.line_id::text<>i->>'line' then raise exception 'Instance already mapped to another requirement';end if;
   continue;
  end if;
  if i->>'action'='match' then
   select x.* into l from robot_build_bom_lines x join robot_build_boms b on b.id=x.bom_id where x.id::text=i->>'line' and b.project_id=p.project_id and (b.owner_id=auth.uid() or b.shared_at is not null) for update of x;
   if l.id is null or l.revision is distinct from (i->>'expected')::integer then raise exception 'Build requirement changed; review a new proposal';end if;
   if (select count(distinct instance) from (select x->>'instance' instance from jsonb_array_elements(p.items) x where x->>'line'=l.id::text union select instance_id from robot_studio_build_mappings where scene_id=p.scene_id and project_id=p.project_id and option_id=p.option_id and line_id=l.id) mapped)>l.required_quantity then raise exception 'Mapped instances exceed requirement quantity';end if;
   line:=l.id;
  else
   proof:='3D concept '||p.scene_id||' version '||p.scene_revision||', instance '||(part->>'id')||'. Needs detailed CAD/review. Finished component, not raw-stock purchase. '||left(part_definition::text,1200);
   if i->>'assembly' is not null then
    line:=add_robot_build_assembly_requirement(p.project_id,(i->>'assembly')::uuid,left(part->>'name',180),1,proof,gen_random_uuid());
   else line:=add_robot_build_requirement(p.project_id,left(part->>'name',180),1,proof,gen_random_uuid());end if;
  end if;
  insert into robot_studio_build_mappings values(p.scene_id,p.project_id,p.option_id,part->>'id',line,part_definition,p.id);
 end loop;
 update robot_studio_proposals set applied_by=auth.uid(),applied_at=now() where id=p.id;
end$$;
revoke all on function public.propose_robot_studio(uuid,uuid,integer,uuid,text,jsonb),public.apply_robot_studio_proposal(uuid) from public,anon;
grant execute on function public.propose_robot_studio(uuid,uuid,integer,uuid,text,jsonb),public.apply_robot_studio_proposal(uuid) to authenticated;
commit;
