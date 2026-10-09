-- Explicit physical identity and protected issue/retest handoff. Run after release holds.
begin;
create table if not exists public.robot_build_component_links(
 id uuid primary key,kit_id uuid not null references public.robot_build_kits(id) on delete restrict,
 component_id uuid not null references public.robot_components(id) on delete restrict,
 configuration_id uuid not null references public.project_robot_configurations(id) on delete restrict,
 identity_snapshot jsonb not null,note text not null,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 unique(kit_id,component_id)
);
create table if not exists public.robot_build_issue_links(
 issue_id uuid primary key references public.robot_issues(id) on delete restrict,
 component_link_id uuid not null references public.robot_build_component_links(id) on delete restrict,
 repair_task_id uuid references public.project_tasks(id) on delete restrict,
 retest_task_id uuid references public.project_tasks(id) on delete restrict,
 target_kit_id uuid references public.robot_build_kits(id) on delete restrict,
 revision integer not null default 1,note text not null,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now()
);
create table if not exists public.robot_build_maintenance_events(
 id uuid primary key,issue_id uuid not null references public.robot_build_issue_links(issue_id) on delete restrict,
 actor_id uuid not null references public.team_members(id),payload jsonb not null,created_at timestamptz not null default now()
);
alter table public.robot_build_issue_links add column if not exists verified_submission_id uuid references public.project_review_submissions(id) on delete restrict;
alter table public.robot_build_issue_links add column if not exists verified_configuration_id uuid references public.project_robot_configurations(id) on delete restrict;
alter table public.robot_build_issue_links add column if not exists verified_at timestamptz;
alter table public.robot_build_issue_links add column if not exists verification_required_after timestamptz not null default now();
alter table public.robot_build_component_links enable row level security;
alter table public.robot_build_issue_links enable row level security;
alter table public.robot_build_maintenance_events enable row level security;
revoke all on public.robot_build_component_links,public.robot_build_issue_links,public.robot_build_maintenance_events from public,anon,authenticated;
grant select on public.robot_build_component_links,public.robot_build_issue_links,public.robot_build_maintenance_events to authenticated;
drop policy if exists build_component_read on public.robot_build_component_links;
create policy build_component_read on public.robot_build_component_links for select to authenticated using(exists(select 1 from public.robot_build_kits where id=kit_id) and exists(select 1 from public.robot_components where id=component_id));
drop policy if exists build_issue_read on public.robot_build_issue_links;
create policy build_issue_read on public.robot_build_issue_links for select to authenticated using(exists(select 1 from public.robot_build_component_links where id=component_link_id) and exists(select 1 from public.robot_issues where id=issue_id));
drop policy if exists build_maintenance_event_read on public.robot_build_maintenance_events;
create policy build_maintenance_event_read on public.robot_build_maintenance_events for select to authenticated using(exists(select 1 from public.robot_build_issue_links where issue_id=robot_build_maintenance_events.issue_id));

create or replace function public.link_robot_build_component(p_kit uuid,p_component uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;c public.robot_components%rowtype;l public.robot_build_component_links%rowtype;cfg public.project_robot_configurations%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into k from public.robot_build_kits where id=p_kit;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=k.task_id and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam) and public.has_permission('manage_robot_reliability',p.subteam)) then raise exception 'Build and reliability leader access required';end if;
 select * into l from public.robot_build_component_links where id=p_request;
 if l.id is not null then
  if l.kit_id=p_kit and l.component_id=p_component and l.created_by=auth.uid() and l.note=trim(p_note) then return l.id;end if;
  raise exception 'Request identity already used';end if;
 select * into c from public.robot_components where id=p_component for update;
 select * into cfg from public.project_robot_configurations where id=k.configuration_id;
 if k.installed_at is null or k.retired_at is not null or cfg.id is null or cfg.identity_snapshot#>>'{asset,id}' is null then raise exception 'Choose a recorded current installation with physical identity';end if;
 if c.id is null or c.status<>'installed' then raise exception 'Choose an existing maintenance component recorded as installed';end if;
 if exists(select 1 from public.robot_build_component_links x join public.robot_build_kits oldkit on oldkit.id=x.kit_id where x.component_id=c.id and oldkit.retired_at is null) then raise exception 'This component is already linked to a current installation';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 5 and 2000 then raise exception 'Record how the physical identity was checked';end if;
 insert into public.robot_build_component_links(id,kit_id,component_id,configuration_id,identity_snapshot,note,created_by)
 values(p_request,k.id,c.id,cfg.id,jsonb_build_object('component',jsonb_build_object('id',c.id,'name',c.name,'serial_number',c.serial_number,'part_number',c.part_number),'configuration',cfg.identity_snapshot,'revision',cfg.revision),trim(p_note),auth.uid());
 return p_request;
end$$;

create or replace function public.plan_robot_build_repair(p_link uuid,p_issue uuid,p_repair uuid,p_retest uuid,p_target uuid,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_component_links%rowtype;k public.robot_build_kits%rowtype;target public.robot_build_kits%rowtype;old public.robot_build_issue_links%rowtype;e public.robot_build_maintenance_events%rowtype;project uuid;payload jsonb;asset text;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_component_links where id=p_link;select * into k from public.robot_build_kits where id=l.kit_id;
 select project_id into project from public.project_tasks where id=k.task_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_robot_reliability',subteam)) then raise exception 'Build and reliability leader access required';end if;
 payload:=jsonb_build_object('link',p_link,'issue',p_issue,'repair',p_repair,'retest',p_retest,'target',p_target,'expected',p_expected,'note',trim(p_note));
 select * into e from public.robot_build_maintenance_events where id=p_request;
 if e.id is not null then if e.actor_id=auth.uid() and e.payload=payload then return;end if;raise exception 'Request identity already used';end if;
 select * into old from public.robot_build_issue_links where issue_id=p_issue for update;
 if coalesce(old.revision,0)<>p_expected then raise exception 'Repair plan changed. Reload before saving';end if;
 if old.issue_id is not null and old.component_link_id<>p_link then raise exception 'Issue already belongs to another physical component';end if;
 if not exists(select 1 from public.robot_issues where id=p_issue and project_id=project and not archived and status<>'resolved') then raise exception 'Choose an open issue assigned to this same project';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 5 and 2000 then raise exception 'Describe the repair and verification plan';end if;
 if p_repair is not null and not exists(select 1 from public.project_tasks where id=p_repair and project_id=project and not archived) then raise exception 'Choose a repair task in this project';end if;
 if p_retest is not null and (p_retest=p_repair or not exists(select 1 from public.project_tasks t join public.project_review_gates g on g.task_id=t.id where t.id=p_retest and t.project_id=project and not t.archived and g.enabled and g.decision_type in ('verified_on_robot','competition_ready'))) then raise exception 'Choose a separate robot verification checkpoint in this project';end if;
 if p_target is not null then
  select * into target from public.robot_build_kits where id=p_target;
  select identity_snapshot#>>'{asset,id}' into asset from public.project_robot_configurations where id=k.configuration_id;
  if target.id is null or target.installed_at is null or target.retired_at is not null or not exists(select 1 from public.project_tasks where id=target.task_id and project_id=project) or not exists(select 1 from public.project_robot_configurations where id=target.configuration_id and identity_snapshot#>>'{asset,id}'=asset) then raise exception 'Target must be a current installation on the same physical asset';end if;
 end if;
 insert into public.robot_build_issue_links(issue_id,component_link_id,repair_task_id,retest_task_id,target_kit_id,note,created_by)
 values(p_issue,p_link,p_repair,p_retest,p_target,trim(p_note),auth.uid())
 on conflict(issue_id)do update set repair_task_id=p_repair,retest_task_id=p_retest,target_kit_id=p_target,note=trim(p_note),revision=robot_build_issue_links.revision+1,
 verification_required_after=case when robot_build_issue_links.repair_task_id is distinct from p_repair or robot_build_issue_links.retest_task_id is distinct from p_retest or robot_build_issue_links.target_kit_id is distinct from p_target then now() else robot_build_issue_links.verification_required_after end;
 insert into public.robot_build_maintenance_events(id,issue_id,actor_id,payload)values(p_request,p_issue,auth.uid(),payload);
end$$;

-- Older issue screens cannot close a linked fault without current physical retest evidence.
create or replace function public.guard_robot_build_issue_resolution()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_issue_links%rowtype;k public.robot_build_kits%rowtype;s public.project_review_submissions%rowtype;
begin
 select * into l from public.robot_build_issue_links where issue_id=old.id;
 if l.issue_id is null then return new;end if;
 if new.project_id is distinct from old.project_id then raise exception 'Linked build issue must retain its project identity';end if;
 if new.created_at is distinct from old.created_at then raise exception 'Linked build issue discovery time is retained';end if;
 if old.status='resolved' and new.status<>'resolved' then update public.robot_build_issue_links set verification_required_after=now() where issue_id=l.issue_id;end if;
 if (new.status='resolved' and old.status<>'resolved') or (new.archived and not old.archived) then
  select * into k from public.robot_build_kits where id=l.target_kit_id;
  if k.id is null or k.retired_at is not null or k.installed_at is null or not public.robot_build_review_usable(k.task_id) then raise exception 'Record a current inspected installation before closing this build issue';end if;
  if l.repair_task_id is null or not exists(select 1 from public.project_tasks where id=l.repair_task_id and status='done' and completed_at is not null and not archived) then raise exception 'Complete the linked repair task first';end if;
  select sub.* into s from public.project_review_gates g join public.project_review_submissions sub on sub.id=g.current_submission where g.task_id=l.retest_task_id and g.enabled and g.decision_type in ('verified_on_robot','competition_ready') and public.robot_build_review_usable(g.task_id);
  if s.id is null or s.submitted_at<greatest(old.created_at,l.created_at,l.verification_required_after) or not exists(select 1 from jsonb_each(s.requirement_results) r where r.value->>'result'='passed' and r.value->'configuration_snapshot'->>'id'=k.configuration_id::text) then raise exception 'Approve a new physical retest for the exact target installation before resolving this issue';end if;
  if s.submitted_at<(select completed_at from public.project_tasks where id=l.repair_task_id) then raise exception 'The physical retest must be submitted after the repair was completed';end if;
  if exists(select 1 from jsonb_each(s.requirement_results) r where r.value->'configuration_snapshot'->>'id' is not null and r.value->'configuration_snapshot'->>'id'<>k.configuration_id::text) then raise exception 'Retest contains findings for a different physical configuration';end if;
  update public.robot_build_issue_links set verified_submission_id=s.id,verified_configuration_id=k.configuration_id,verified_at=now() where issue_id=l.issue_id;
 end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_issue_resolution on public.robot_issues;
create trigger guard_robot_build_issue_resolution before update on public.robot_issues for each row execute function public.guard_robot_build_issue_resolution();
revoke all on function public.guard_robot_build_issue_resolution() from public,anon,authenticated;
-- Removal is one transaction with kit replacement. It does not create available stock.
create or replace function public.sync_robot_build_component_removal()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_component_links%rowtype;
begin
 if new.retired_at is not null and old.retired_at is null then
  for l in select * from public.robot_build_component_links where kit_id=new.id loop
   update public.robot_components set status=case when status in ('failed','retired') then status else 'service_due' end,updated_at=now() where id=l.component_id;
   insert into public.robot_component_events(component_id,event_type,notes,performed_by)
   values(l.component_id,'removed','Build installation removed; inspect before reuse. Kit '||new.id||' | '||coalesce(new.retirement_note,''),auth.uid());
  end loop;
 end if;
 return new;
end$$;
drop trigger if exists sync_robot_build_component_removal on public.robot_build_kits;
create trigger sync_robot_build_component_removal after update of retired_at on public.robot_build_kits for each row execute function public.sync_robot_build_component_removal();
revoke all on function public.sync_robot_build_component_removal() from public,anon,authenticated;
create or replace function public.guard_robot_build_component_identity()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare component uuid;
begin
 if tg_table_name='robot_components' then
  if new.serial_number is not distinct from old.serial_number and new.part_number is not distinct from old.part_number and (new.status is not distinct from old.status or new.status not in ('spare','retired')) then return new;end if;
  component:=old.id;
 else
  if new.event_type not in ('removed','retired','installed') then return new;end if;
  component:=new.component_id;
 end if;
 if exists(select 1 from public.robot_build_component_links l join public.robot_build_kits k on k.id=l.kit_id where l.component_id=component and k.retired_at is null) then raise exception 'This component belongs to a current Robot Build installation. Record its replacement there before changing physical identity or removal status';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_component_identity on public.robot_components;
create trigger guard_robot_build_component_identity before update on public.robot_components for each row execute function public.guard_robot_build_component_identity();
drop trigger if exists guard_robot_build_component_event on public.robot_component_events;
create trigger guard_robot_build_component_event before insert on public.robot_component_events for each row execute function public.guard_robot_build_component_identity();
revoke all on function public.guard_robot_build_component_identity() from public,anon,authenticated;
create or replace function public.report_robot_build_fault(p_link uuid,p_note text,p_context text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_component_links%rowtype;c public.robot_components%rowtype;project uuid;e public.robot_build_maintenance_events%rowtype;payload jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_component_links where id=p_link;
 select t.project_id into project from public.robot_build_kits k join public.project_tasks t on t.id=k.task_id join public.team_projects p on p.id=t.project_id where k.id=l.kit_id and k.retired_at is null and p.status not in ('archived','completed');
 if project is null or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active member and current build installation required';end if;
 payload:=jsonb_build_object('action','fault','link',p_link,'note',trim(p_note),'context',p_context);
 select * into e from public.robot_build_maintenance_events where id=p_request;
 if e.id is not null then if e.actor_id=auth.uid() and e.payload=payload then return e.issue_id;end if;raise exception 'Request identity already used';end if;
 if p_request is null or p_context is null or p_context not in ('workshop','testing','inspection','match','pit','other') or length(trim(coalesce(p_note,''))) not between 5 and 2000 then raise exception 'Describe the fault and where it was found';end if;
 if exists(select 1 from public.robot_build_issue_links x join public.robot_issues i on i.id=x.issue_id where x.component_link_id=p_link and i.status<>'resolved' and not i.archived) then raise exception 'This component already has an open linked issue. Add findings to that issue rather than create another';end if;
 select * into c from public.robot_components where id=l.component_id for update;
 insert into public.robot_issues(id,title,description,subsystem,severity,discovered_context,reporter_id,project_id)
 values(p_request,left('Component failure: '||c.name,160),trim(p_note),case when c.category in ('electrical','controller','sensor') then 'electrical' when c.category='radio' then 'controls' else 'mechanical' end,'high',p_context,auth.uid(),project);
 insert into public.robot_build_issue_links(issue_id,component_link_id,note,created_by)values(p_request,l.id,'Fault reported; assign repair and physical retest before closure',auth.uid());
 insert into public.robot_component_events(id,component_id,event_type,notes,issue_id,performed_by)values(p_request,c.id,'failed',trim(p_note),p_request,auth.uid());
 update public.robot_components set status='failed',updated_at=now() where id=c.id;
 insert into public.robot_build_maintenance_events(id,issue_id,actor_id,payload)values(p_request,p_request,auth.uid(),payload);
 return p_request;
end$$;
revoke all on function public.report_robot_build_fault(uuid,text,text,uuid) from public,anon;
grant execute on function public.report_robot_build_fault(uuid,text,text,uuid) to authenticated;
revoke all on function public.link_robot_build_component(uuid,uuid,text,uuid),public.plan_robot_build_repair(uuid,uuid,uuid,uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function public.link_robot_build_component(uuid,uuid,text,uuid),public.plan_robot_build_repair(uuid,uuid,uuid,uuid,uuid,integer,text,uuid) to authenticated;
commit;
