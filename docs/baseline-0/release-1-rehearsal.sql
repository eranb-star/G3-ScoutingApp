-- RELEASE 1 migration rehearsal: recovery project only.

-- SOURCE: project_review_evidence_20260913.sql
-- Release 1 foundation. Extends existing review submission; old APK RPC remains valid.
begin;
alter table public.project_review_submissions add column if not exists evidence_items jsonb not null default '[]'::jsonb;

create or replace function public.submit_project_review_evidence(
 p_task uuid,p_revision text,p_items jsonb,p_expected_submission uuid,p_notes text default ''
) returns void language plpgsql security definer set search_path=public as $$
declare item jsonb; current_id uuid; normalized jsonb:='[]'::jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select current_submission into current_id from public.project_review_gates where task_id=p_task;
 if current_id is distinct from p_expected_submission then raise exception 'The review changed. Refresh before submitting';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Add evidence for review';end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>12 then raise exception 'Add between 1 and 12 evidence items';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(trim(item->>'title')),0) not between 1 and 160
   or coalesce(length(trim(item->>'revision')),0) not between 1 and 120
   or coalesce(length(item->>'url'),0)>2048
   or coalesce(item->>'url','') !~ '^https://[^[:space:]/]+(/[^[:space:]]*)?$'
  then raise exception 'Each evidence item needs a title, exact revision and HTTPS link';end if;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('title',trim(item->>'title'),'revision',trim(item->>'revision'),'url',item->>'url'));
 end loop;
 -- Existing RPC performs actor, reviewer, task and project authorization and source synchronization.
 perform public.submit_project_review(p_task,p_revision,normalized->0->>'url',p_notes);
 update public.project_review_submissions set evidence_items=normalized
 where id=(select current_submission from public.project_review_gates where task_id=p_task);
end $$;
revoke all on function public.submit_project_review_evidence(uuid,text,jsonb,uuid,text) from public,anon;
grant execute on function public.submit_project_review_evidence(uuid,text,jsonb,uuid,text) to authenticated;
commit;


-- SOURCE: project_review_requirements_20260913.sql
-- Structured authoring over the existing immutable criteria snapshot.
-- Existing clients continue using configure_project_review unchanged.
begin;
alter table public.project_review_gates add column if not exists requirements jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists requirements jsonb not null default '[]';
create or replace function public.snapshot_review_requirements() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select requirements into new.requirements from public.project_review_gates where task_id=new.task_id and criteria=new.criteria;
 new.requirements:=coalesce(new.requirements,'[]'::jsonb);return new;
end $$;
drop trigger if exists snapshot_review_requirements on public.project_review_submissions;
create trigger snapshot_review_requirements before insert on public.project_review_submissions for each row execute function public.snapshot_review_requirements();
create or replace function public.clear_changed_review_requirements() returns trigger language plpgsql set search_path=public as $$
begin
 if new.criteria is distinct from old.criteria then new.requirements:='[]'::jsonb;end if;return new;
end $$;
drop trigger if exists clear_changed_review_requirements on public.project_review_gates;
create trigger clear_changed_review_requirements before update of criteria on public.project_review_gates for each row execute function public.clear_changed_review_requirements();
create or replace function public.configure_project_review_requirements(
 p_task uuid,p_reviewer uuid,p_requirements jsonb,p_reason text default ''
) returns void language plpgsql security definer set search_path=public as $$
declare r jsonb; criteria text:=''; n integer:=0; normalized jsonb:='[]';
begin
 if p_requirements is null or jsonb_typeof(p_requirements)<>'array' then raise exception 'Add milestone requirements';end if;
 if jsonb_array_length(p_requirements)<1 or jsonb_array_length(p_requirements)>10 then raise exception 'Add between 1 and 10 requirements';end if;
 for r in select value from jsonb_array_elements(p_requirements) loop
  if jsonb_typeof(r)<>'object'
   or coalesce(length(trim(r->>'requirement')),0) not between 3 and 160
   or coalesce(length(trim(r->>'acceptance')),0) not between 3 and 600
   or coalesce(r->>'method','') not in ('inspection','test','analysis','demonstration')
  then raise exception 'Each requirement needs a description, measurable acceptance criterion and verification method';end if;
  n:=n+1; normalized:=normalized||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'requirement',trim(r->>'requirement'),'acceptance',trim(r->>'acceptance'),'method',r->>'method'));
  criteria:=criteria||case when n>1 then E'\n\n' else '' end||'R'||n||': '||trim(r->>'requirement')||E'\nAcceptance: '||trim(r->>'acceptance')||E'\nVerification: '||(r->>'method');
 end loop;
 if length(criteria)>4000 then raise exception 'Keep the combined requirements within 4000 characters';end if;
 -- Existing authorization, audit, revision invalidation and dependent-task blocking remain authoritative.
 perform public.configure_project_review(p_task,p_reviewer,criteria,p_reason);
 update public.project_review_gates set requirements=normalized where task_id=p_task and requirements='[]'::jsonb;
end $$;
revoke all on function public.configure_project_review_requirements(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.configure_project_review_requirements(uuid,uuid,jsonb,text) to authenticated;
commit;


-- SOURCE: project_review_results_20260913.sql
begin;
alter table public.project_review_submissions add column if not exists requirement_results jsonb not null default '{}';

create or replace function public.record_project_requirement_result(
 p_submission uuid,p_requirement uuid,p_result text,p_evidence integer,p_note text,
 p_configuration text default '',p_expires_at timestamptz default null
) returns void language plpgsql security definer set search_path=public as $$
declare s public.project_review_submissions%rowtype;g public.project_review_gates%rowtype;r jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into s from public.project_review_submissions where id=p_submission;
 select * into g from public.project_review_gates where task_id=s.task_id;
 if s.id is null or g.current_submission is distinct from s.id or not g.enabled or s.status<>'pending'
 or s.submitted_by=auth.uid() or not exists(select 1 from public.team_members where id=auth.uid() and active and role in ('mentor','admin'))
 or not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=s.task_id and not t.archived and p.status not in ('archived','completed'))
 then raise exception 'Only a current pending review can be assessed; self-review is not allowed';end if;
 if p_result='waived' then
  if not coalesce(public.is_admin(),false) then raise exception 'Only an administrator may waive a requirement';end if;
  if p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'Waiver expiry must be within the next 30 days';end if;
 elsif g.reviewer_id is distinct from auth.uid() then raise exception 'Only the assigned reviewer may record a result';end if;
 if p_result is null or p_result not in ('passed','failed','waived') or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'A result and findings are required';end if;
 select value into r from jsonb_array_elements(s.requirements) where value->>'id'=p_requirement::text;
 if r is null then raise exception 'Requirement does not belong to this revision';end if;
 if p_evidence is null or p_evidence<0 or p_evidence>=jsonb_array_length(s.evidence_items) then raise exception 'Select submitted evidence for this finding';end if;
 if r->>'method' in ('test','demonstration') and length(trim(coalesce(p_configuration,''))) not between 3 and 240 then raise exception 'Identify the exact robot/prototype and configuration tested';end if;
 update public.project_review_submissions set requirement_results=jsonb_set(requirement_results,array[p_requirement::text],jsonb_build_object(
 'result',p_result,'evidence',p_evidence,'note',trim(p_note),'configuration',trim(coalesce(p_configuration,'')),
 'actor_id',auth.uid(),'recorded_at',now(),'expires_at',case when p_result='waived' then p_expires_at else null end)) where id=s.id;
 insert into public.project_review_audit(task_id,action,actor_id,note) values(s.task_id,'requirement_'||p_result,auth.uid(),s.revision||' | '||p_requirement||' | '||trim(p_note)||' | configuration='||coalesce(p_configuration,'')||' | expiry='||coalesce(p_expires_at::text,''));
end $$;
revoke all on function public.record_project_requirement_result(uuid,uuid,text,integer,text,text,timestamptz) from public,anon;
grant execute on function public.record_project_requirement_result(uuid,uuid,text,integer,text,text,timestamptz) to authenticated;

create or replace function public.requirement_results_pass(p_requirements jsonb,p_results jsonb,p_allow_waiver boolean)
returns boolean language sql stable set search_path=public as $$
 select not exists(select 1 from jsonb_array_elements(p_requirements) r where
 coalesce(p_results->(r->>'id')->>'result','pending')<>'passed'
 and not (p_allow_waiver and coalesce(p_results->(r->>'id')->>'result','pending')='waived'
 and coalesce((p_results->(r->>'id')->>'expires_at')::timestamptz>now(),false)));
$$;
create or replace function public.guard_requirement_release() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status in ('approved','overridden') and new.status is distinct from old.status
 and not public.requirement_results_pass(new.requirements,new.requirement_results,new.status='overridden')
 then raise exception 'Resolve every requirement before release. Waived requirements require an explicit override';end if;
 return new;
end $$;
drop trigger if exists guard_requirement_release on public.project_review_submissions;
create trigger guard_requirement_release before update of status on public.project_review_submissions for each row execute function public.guard_requirement_release();
create or replace function public.project_review_passed(p_task uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission and s.task_id=g.task_id
 where g.task_id=p_task and g.enabled and s.status in ('approved','overridden')
 and public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden'));
$$;
create or replace function public.task_dependency_context(p_home boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by task_id,prerequisite_id),'[]'::jsonb) from (
 select d.task_id,d.prerequisite_id,t.status as task_status,
 u.title,u.status,case when u.id is not null and q.id is not null then u.archived or q.status='archived' else true end as unavailable,
 u.assignee_id,m.display_name as owner,q.subteam,u.due_at,
 case when u.id is not null and q.id is not null then '/projects?project='||u.project_id||'&task='||u.id else null end as href,
 not coalesce(u.status='done' and not u.archived and q.status<>'archived' and not exists(
 select 1 from public.project_review_gates rg left join public.project_review_submissions rs on rs.id=rg.current_submission
 where rg.task_id=u.id and rg.enabled and (rs.id is null or rs.status not in ('approved','overridden')
 or not public.requirement_results_pass(rs.requirements,rs.requirement_results,rs.status='overridden'))
 ),false) as waiting
 from project_task_dependencies d join project_tasks t on t.id=d.task_id join team_projects p on p.id=t.project_id
 left join project_tasks u on u.id=d.prerequisite_id left join team_projects q on q.id=u.project_id left join team_members m on m.id=u.assignee_id
 where not t.archived and p.status<>'archived'
 and (not p_home or t.assignee_id=auth.uid() or (has_permission('view_team_risks') and has_permission('assign_team_work',p.subteam)))
 ) x;
$$;

commit;


-- SOURCE: project_review_change_impact_20260913.sql
begin;
-- Traverse the complete dependency graph; UNION makes traversal cycle-safe.
create or replace function public.task_upstream_blocked(p_task uuid) returns boolean
language sql stable security definer set search_path=public as $$
 with recursive upstream(id) as (
 select prerequisite_id from public.project_task_dependencies where task_id=p_task
 union select d.prerequisite_id from public.project_task_dependencies d join upstream u on d.task_id=u.id
 ) select exists(select 1 from upstream u left join public.project_tasks t on t.id=u.id
 left join public.team_projects p on p.id=t.project_id
 where t.id is null or t.archived or p.status='archived' or t.status<>'done'
 or exists(select 1 from public.project_review_gates g where g.task_id=t.id and g.enabled and not public.project_review_passed(t.id)));
$$;
revoke all on function public.task_upstream_blocked(uuid) from public,anon,authenticated;
create or replace function public.enforce_upstream_release() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('in_progress','done') and (tg_op='INSERT' or new.status is distinct from old.status) then
  perform pg_advisory_xact_lock(6740,911);
  if public.task_upstream_blocked(new.id) then raise exception 'Upstream work changed or requires approval. Resolve prerequisite stages before starting or completing this task';end if;
 end if;return new;
end $$;
drop trigger if exists enforce_upstream_release on public.project_tasks;
create trigger enforce_upstream_release before insert or update of status on public.project_tasks for each row execute function public.enforce_upstream_release();
-- RLS-aware read for the UI: only disclose task IDs already visible to the caller.
create or replace function public.task_change_impact() returns jsonb
language sql stable security invoker set search_path=public as $$
 with recursive paths(task_id,upstream_id) as (
 select task_id,prerequisite_id from public.project_task_dependencies
 union select p.task_id,d.prerequisite_id from paths p join public.project_task_dependencies d on d.task_id=p.upstream_id
 ) select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select distinct t.id as task_id,t.title,t.status,t.project_id,
 '/projects?project='||t.project_id||'&task='||t.id as href
 from paths d join public.project_tasks t on t.id=d.task_id join public.team_projects p on p.id=t.project_id
 left join public.project_tasks u on u.id=d.upstream_id left join public.team_projects q on q.id=u.project_id
 where not t.archived and p.status<>'archived' and (
 u.id is null or u.archived or q.status='archived' or u.status<>'done' or exists(
 select 1 from public.project_review_gates g left join public.project_review_submissions s on s.id=g.current_submission
 where g.task_id=u.id and g.enabled and (s.id is null or s.status not in ('approved','overridden')
 or not public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden'))))
 ) x;
$$;
revoke all on function public.task_change_impact() from public,anon;
grant execute on function public.task_change_impact() to authenticated;
commit;


-- SOURCE: project_robot_configurations_20260913.sql
begin;
create table if not exists public.project_robot_configurations(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.team_projects(id) on delete restrict,
 name text not null check(length(trim(name)) between 3 and 120),revision text not null check(length(trim(revision)) between 1 and 120),
 configuration_kind text not null check(configuration_kind in ('designed','approved','as_built','as_installed')),
 details text not null check(length(trim(details)) between 3 and 4000),created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),
 unique(project_id,name,revision)
);
alter table public.project_robot_configurations enable row level security;
drop policy if exists configuration_read on public.project_robot_configurations;
create policy configuration_read on public.project_robot_configurations for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.team_projects where id=project_id));
revoke all on public.project_robot_configurations from public,anon,authenticated;
grant select on public.project_robot_configurations to authenticated;
create or replace function public.create_project_configuration(p_project uuid,p_name text,p_revision text,p_kind text,p_details text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not exists(select 1 from public.team_projects p where p.id=p_project and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam))
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Only an authorized team manager can register a configuration';end if;
 if p_kind='approved' then raise exception 'Register the designed or physical configuration; review approval is recorded by its checkpoint';end if;
 insert into public.project_robot_configurations(project_id,name,revision,configuration_kind,details) values(p_project,trim(p_name),trim(p_revision),p_kind,trim(p_details)) returning id into result;
 return result;
end $$;
revoke all on function public.create_project_configuration(uuid,text,text,text,text) from public,anon;
grant execute on function public.create_project_configuration(uuid,text,text,text,text) to authenticated;

create or replace function public.record_configured_requirement_result(
 p_submission uuid,p_requirement uuid,p_result text,p_evidence integer,p_note text,p_configuration_id uuid default null,p_expires_at timestamptz default null
) returns void language plpgsql security definer set search_path=public as $$
declare c public.project_robot_configurations%rowtype; method text;
begin
 perform pg_advisory_xact_lock(6740,911);
 select r->>'method' into method from public.project_review_submissions s cross join lateral jsonb_array_elements(s.requirements) r where s.id=p_submission and r->>'id'=p_requirement::text;
 if method in ('test','demonstration') then
  select c1.* into c from public.project_robot_configurations c1 join public.project_tasks t on t.project_id=c1.project_id join public.project_review_submissions s on s.task_id=t.id
  where s.id=p_submission and c1.id=p_configuration_id and c1.configuration_kind in ('as_built','as_installed');
  if c.id is null then raise exception 'Select a saved physical configuration from this project';end if;
 end if;
 perform public.record_project_requirement_result(p_submission,p_requirement,p_result,p_evidence,p_note,coalesce(c.name||' / '||c.revision,''),p_expires_at);
 if c.id is not null then
  update public.project_review_submissions set requirement_results=jsonb_set(requirement_results,array[p_requirement::text,'configuration_snapshot'],to_jsonb(c)) where id=p_submission;
 end if;
end $$;
revoke all on function public.record_configured_requirement_result(uuid,uuid,text,integer,text,uuid,timestamptz) from public,anon;
grant execute on function public.record_configured_requirement_result(uuid,uuid,text,integer,text,uuid,timestamptz) to authenticated;
create or replace function public.guard_physical_requirement_release() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status in ('approved','overridden') and new.status is distinct from old.status and exists(
 select 1 from jsonb_array_elements(new.requirements) r where r->>'method' in ('test','demonstration')
 and new.requirement_results->(r->>'id')->'configuration_snapshot'->>'id' is null)
 then raise exception 'Physical findings must reference a saved configuration';end if;return new;
end $$;
drop trigger if exists guard_physical_requirement_release on public.project_review_submissions;
create trigger guard_physical_requirement_release before update of status on public.project_review_submissions for each row execute function public.guard_physical_requirement_release();
commit;


-- SOURCE: project_review_consensus_20260913.sql
begin;
alter table public.project_review_gates add column if not exists reviewer_ids jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists required_reviewers jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists reviewer_decisions jsonb not null default '{}';
create or replace function public.reset_changed_reviewers() returns trigger language plpgsql set search_path=public as $$
begin
 if new.reviewer_id is distinct from old.reviewer_id then new.reviewer_ids:='[]';new.current_submission:=null;end if;return new;
end $$;
drop trigger if exists reset_changed_reviewers on public.project_review_gates;
create trigger reset_changed_reviewers before update of reviewer_id on public.project_review_gates for each row execute function public.reset_changed_reviewers();
create or replace function public.configure_project_reviewers(p_task uuid,p_reviewers uuid[],p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare g public.project_review_gates%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if coalesce(cardinality(p_reviewers),0) not between 1 and 5 or (select count(distinct id) from unnest(p_reviewers) id)<>cardinality(p_reviewers)
 or exists(select 1 from unnest(p_reviewers) as j(value) where not exists(select 1 from public.team_members m where m.id=j.value and m.active and m.role in ('mentor','admin')))
 then raise exception 'Choose 1 to 5 different active mentors';end if;
 select * into g from public.project_review_gates where task_id=p_task;
 if g.task_id is null then raise exception 'Configure milestone criteria first';end if;
 perform public.configure_project_review(p_task,p_reviewers[1],g.criteria,p_reason);
 if g.reviewer_ids is distinct from to_jsonb(p_reviewers) then
  update public.project_review_gates set reviewer_ids=to_jsonb(p_reviewers),current_submission=null where task_id=p_task;
  update public.project_tasks set status='in_progress',completed_at=null,updated_at=now() where id=p_task;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'required_reviewers_changed',auth.uid(),p_reason||' | '||to_jsonb(p_reviewers)::text);
 end if;
end $$;
revoke all on function public.configure_project_reviewers(uuid,uuid[],text) from public,anon;
grant execute on function public.configure_project_reviewers(uuid,uuid[],text) to authenticated;
create or replace function public.snapshot_required_reviewers() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select case when reviewer_ids='[]'::jsonb then jsonb_build_array(reviewer_id) else reviewer_ids end into new.required_reviewers from public.project_review_gates where task_id=new.task_id;
 if new.required_reviewers @> jsonb_build_array(new.submitted_by) then raise exception 'A required reviewer cannot submit their own work';end if;
 if exists(select 1 from jsonb_array_elements_text(new.required_reviewers) as j(value) where not exists(select 1 from public.team_members m where m.id::text=j.value and m.active and m.role in ('mentor','admin'))) then raise exception 'Replace unavailable reviewers before submitting';end if;
 return new;
end $$;
drop trigger if exists snapshot_required_reviewers on public.project_review_submissions;
create trigger snapshot_required_reviewers before insert on public.project_review_submissions for each row execute function public.snapshot_required_reviewers();
create or replace function public.invalidate_changed_findings_votes() returns trigger language plpgsql set search_path=public as $$
begin
 if new.requirement_results is distinct from old.requirement_results then new.reviewer_decisions:='{}'::jsonb;end if;return new;
end $$;
drop trigger if exists invalidate_changed_findings_votes on public.project_review_submissions;
create trigger invalidate_changed_findings_votes before update of requirement_results on public.project_review_submissions for each row execute function public.invalidate_changed_findings_votes();
create or replace function public.decide_project_review(p_task uuid,p_submission uuid,p_decision text,p_note text) returns void
language plpgsql security definer set search_path=public as $$
declare g public.project_review_gates%rowtype;s public.project_review_submissions%rowtype;required jsonb;votes jsonb;complete boolean:=false;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into g from public.project_review_gates where task_id=p_task;
 select * into s from public.project_review_submissions where id=p_submission and task_id=p_task;
 if s.id is null or not g.enabled or g.current_submission is distinct from s.id or s.status<>'pending' then raise exception 'Review is no longer pending. Refresh before deciding';end if;
 if not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=p_task and not t.archived and p.status not in ('archived','completed')) then raise exception 'Checkpoint unavailable';end if;
 if s.submitted_by=auth.uid() or not exists(select 1 from public.team_members where id=auth.uid() and active and role in ('mentor','admin')) then raise exception 'An active independent reviewer is required';end if;
 required:=case when s.required_reviewers='[]'::jsonb then jsonb_build_array(g.reviewer_id) else s.required_reviewers end;
 if p_decision='overridden' then
  if not coalesce(public.is_admin(),false) then raise exception 'Only an administrator may override';end if;
 elsif not required @> jsonb_build_array(auth.uid()) then raise exception 'Only a required reviewer may decide';end if;
 if p_decision is null or p_decision not in ('approved','changes_requested','overridden') or length(trim(coalesce(p_note,''))) not between 3 and 5000 then raise exception 'A decision and reason are required';end if;
 if p_decision in ('approved','overridden') and not public.requirement_results_pass(s.requirements,s.requirement_results,p_decision='overridden') then raise exception 'Resolve every requirement before release';end if;
 votes:=jsonb_set(s.reviewer_decisions,array[auth.uid()::text],jsonb_build_object('decision',p_decision,'note',trim(p_note),'at',now()));
 complete:=p_decision in ('changes_requested','overridden') or not exists(select 1 from jsonb_array_elements_text(required) id where coalesce(votes->id->>'decision','')<>'approved');
 update public.project_review_submissions set reviewer_decisions=votes,status=case when complete then p_decision else 'pending' end,
 decided_by=case when complete then auth.uid() else null end,decided_at=case when complete then now() else null end,decision_note=case when complete then trim(p_note) else null end where id=s.id;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'reviewer_'||p_decision,auth.uid(),s.revision||' | '||trim(p_note));
 if complete and p_decision in ('approved','overridden') then update public.project_tasks set status='done',completed_at=now(),updated_at=now() where id=p_task;end if;
end $$;
create or replace function public.project_review_context(p_task uuid default null,p_all boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('task_id',g.task_id,'project_id',t.project_id,'title',t.title,'due_at',t.due_at,'reviewer_id',g.reviewer_id,'reviewer',m.display_name,'criteria',g.criteria,'reviewer_ids',g.reviewer_ids,
 'submission',(select to_jsonb(s)||jsonb_build_object('submitted_by_name',a.display_name,'decided_by_name',d.display_name) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.id=g.current_submission),
 'history',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('submitted_by_name',a.display_name,'decided_by_name',d.display_name) order by s.submitted_at desc),'[]'::jsonb) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.task_id=g.task_id) end,
 'audit',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('actor_name',m.display_name) order by a.created_at desc),'[]'::jsonb) from public.project_review_audit a left join public.team_members m on m.id=a.actor_id where a.task_id=g.task_id) end)
 order by g.created_at),'[]'::jsonb)
 from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id left join public.team_members m on m.id=g.reviewer_id
 where g.enabled and ((p_task is not null and g.task_id=p_task) or (p_task is null and p_all) or (p_task is null and not p_all and not t.archived and p.status<>'archived' and (g.reviewer_id=auth.uid() or g.reviewer_ids @> jsonb_build_array(auth.uid()))
 and exists(select 1 from public.project_review_submissions s where s.id=g.current_submission and s.status='pending')));
$$;

create or replace function public.configure_project_review(p_task uuid,p_reviewer uuid,p_criteria text,p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare t public.project_tasks%rowtype;p public.team_projects%rowtype;g public.project_review_gates%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;select * into p from public.team_projects where id=t.project_id;
 if t.id is null or t.archived or p.status='archived' or not public.has_permission('assign_team_work',p.subteam)
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Project review configuration is not permitted';end if;
 if p.status='completed' then raise exception 'Reopen the completed project before changing review checkpoints';end if;
 if not exists(select 1 from public.team_members where id=p_reviewer and active and role in ('mentor','admin')) then raise exception 'Choose an active mentor or administrator as reviewer';end if;
 select * into g from public.project_review_gates where task_id=p_task;
 if g.task_id is null or not g.enabled then
 if t.status='done' or exists(select 1 from public.project_task_dependencies d join public.project_tasks c on c.id=d.task_id where d.prerequisite_id=p_task and c.status in ('in_progress','done')) then raise exception 'Configure the checkpoint before dependent work starts; reopen completed work deliberately first';end if;
 insert into public.project_review_gates(task_id,reviewer_id,criteria)values(p_task,p_reviewer,trim(p_criteria))
 on conflict(task_id) do update set enabled=true,reviewer_id=excluded.reviewer_id,criteria=excluded.criteria;
 else
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Explain the reviewer or criteria change';end if;
 -- Submitted criteria are immutable. Changing criteria requires a fresh revision.
 update public.project_review_gates set reviewer_id=p_reviewer,criteria=trim(p_criteria),
 current_submission=case when criteria is distinct from trim(p_criteria) then null else current_submission end where task_id=p_task;
 if g.criteria is distinct from trim(p_criteria) or g.reviewer_id is distinct from p_reviewer then update public.project_tasks set status='in_progress',completed_at=null,updated_at=now() where id=p_task;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'required_reviewers_changed',auth.uid(),p_reason||' | '||to_jsonb(p_reviewers)::text);end if;
 end if;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'configured',auth.uid(),coalesce(nullif(trim(p_reason),''),'Review checkpoint enabled')||' | reviewer='||(select display_name from public.team_members where id=p_reviewer)||' | criteria='||trim(p_criteria));
end$$;


commit;
