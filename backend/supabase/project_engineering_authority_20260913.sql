begin;
insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)values
 ('submit_engineering_review','Engineering','Submit engineering evidence','הגשת ראיות הנדסיות','Submit assigned work; self-review and task ownership checks still apply.',false,210),
 ('decide_engineering_review','Engineering','Decide engineering review','החלטה בביקורת הנדסית','Decide assigned reviews; independent reviewer checks still apply.',false,211),
 ('reopen_engineering_review','Engineering','Reopen engineering review','פתיחת ביקורת מחדש','Reopen engineering work with reason and existing project scope.',false,212),
 ('authorize_engineering_override','Engineering','Authorize scoped engineering override','אישור חריגה הנדסית מוגדרת','Authorize a bounded expiring exception without changing failed evidence into a pass.',true,213)
 on conflict(permission_key)do nothing;
insert into public.role_permissions(role,permission_key,allowed)
 select role,key,case when key='submit_engineering_review' then true when key='authorize_engineering_override' then role='admin' else role in ('mentor','admin') end
 from unnest(array['member','team_leader','mentor','admin'])role cross join unnest(array['submit_engineering_review','decide_engineering_review','reopen_engineering_review','authorize_engineering_override'])key on conflict do nothing;
alter table public.project_review_submissions add column if not exists override_scope jsonb;
create or replace function public.guard_engineering_reopen()returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.decision_type<>'legacy_review' and old.current_submission is not null and new.current_submission is null
 and not public.has_permission('reopen_engineering_review') then raise exception 'Engineering reopen capability is required';end if;
 return new;
end $$;
drop trigger if exists z_guard_engineering_reopen on public.project_review_gates;
create trigger z_guard_engineering_reopen before update on public.project_review_gates for each row execute function public.guard_engineering_reopen();
create or replace function public.guard_engineering_authority()returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.decision_type='legacy_review' then return new;end if;
 if tg_op='INSERT' then
  if not public.has_permission('submit_engineering_review') then raise exception 'Engineering submission capability is required';end if;
 elsif (new.status is distinct from old.status or new.reviewer_decisions is distinct from old.reviewer_decisions)
 and (new.status in ('approved','changes_requested','overridden') or new.reviewer_decisions->auth.uid()::text->>'decision' in ('approved','changes_requested','overridden')) then
  if new.status='overridden' then
   if not public.has_permission('authorize_engineering_override') then raise exception 'Engineering override capability is required';end if;
   if new.override_scope is null or new.override_scope->>'submission_id'<>new.id::text
    or new.override_scope->>'decision_type'<>new.decision_type
    or coalesce(length(trim(new.override_scope->>'risk')),0)<3
    or coalesce(length(trim(new.override_scope->>'configuration')),0)<3
    or not coalesce((new.override_scope->>'expires_at')::timestamptz>now(),false)
   then raise exception 'A current scoped override with risk, configuration and expiry is required';end if;
  elsif not public.has_permission('decide_engineering_review') then raise exception 'Engineering decision capability is required';end if;
  if new.status='approved' and new.decision_type in ('prototype_validated','qc_accepted','installed','verified_on_robot','competition_ready') then
   if not exists(select 1 from jsonb_array_elements(new.requirements) r where r->>'method' in ('test','demonstration'))
   or exists(select 1 from jsonb_array_elements(new.requirements) r where r->>'method' in ('test','demonstration') and new.requirement_results->(r->>'id')->'measurement' is null)
   then raise exception 'This stage requires structured physical evidence';end if;
  end if;
 end if;return new;
end $$;
drop trigger if exists z_guard_engineering_authority on public.project_review_submissions;
create trigger z_guard_engineering_authority before insert or update of status on public.project_review_submissions for each row execute function public.guard_engineering_authority();

create or replace function public.decide_engineering_review(p_task uuid,p_submission uuid,p_decision text,p_note text,p_override jsonb default null) returns void
language plpgsql security definer set search_path=public as $$
declare stage text; expiry timestamptz;
begin
 perform pg_advisory_xact_lock(6740,911);
 if p_decision='overridden' then
  if not public.has_permission('authorize_engineering_override') then raise exception 'Engineering override capability is required';end if;
  if p_override is null or jsonb_typeof(p_override)<>'object' then raise exception 'Specify override scope';end if;
  expiry:=(p_override->>'expires_at')::timestamptz;
  if expiry is null or expiry<=now() or expiry>now()+interval '30 days' then raise exception 'Override expiry must be within 30 days';end if;
  select decision_type into stage from public.project_review_submissions where id=p_submission and task_id=p_task;
  update public.project_review_submissions set override_scope=jsonb_build_object('submission_id',p_submission,'decision_type',stage,'risk',p_override->>'risk','configuration',p_override->>'configuration','expires_at',expiry,'authorizer',auth.uid(),'reason',p_note)
  where id=p_submission and task_id=p_task;
 end if;
 perform public.decide_project_review(p_task,p_submission,p_decision,p_note);
end $$;
revoke all on function public.decide_engineering_review(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.decide_engineering_review(uuid,uuid,text,text,jsonb) to authenticated;
create or replace function public.engineering_override_current(p_scope jsonb)returns boolean language sql stable set search_path=public as $$
 select p_scope is null or coalesce((p_scope->>'expires_at')::timestamptz>now(),false);
$$;
create or replace function public.project_review_passed(p_task uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission and s.task_id=g.task_id
 where g.task_id=p_task and g.enabled and s.status in ('approved','overridden')
 and public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden')
 and public.engineering_snapshot_current(s.engineering_snapshot) and public.engineering_override_current(s.override_scope));
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
 or not public.requirement_results_pass(rs.requirements,rs.requirement_results,rs.status='overridden') or not public.engineering_snapshot_current(rs.engineering_snapshot) or not public.engineering_override_current(rs.override_scope))
 ),false) as waiting
 from project_task_dependencies d join project_tasks t on t.id=d.task_id join team_projects p on p.id=t.project_id
 left join project_tasks u on u.id=d.prerequisite_id left join team_projects q on q.id=u.project_id left join team_members m on m.id=u.assignee_id
 where not t.archived and p.status<>'archived'
 and (not p_home or t.assignee_id=auth.uid() or (has_permission('view_team_risks') and has_permission('assign_team_work',p.subteam)))
 ) x;
$$;
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
 or not public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden') or not public.engineering_snapshot_current(s.engineering_snapshot) or not public.engineering_override_current(s.override_scope))))
 ) x;
$$;
create or replace function public.project_review_context(p_task uuid default null,p_all boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('task_id',g.task_id,'project_id',t.project_id,'title',t.title,'due_at',t.due_at,'reviewer_id',g.reviewer_id,'reviewer',m.display_name,'criteria',g.criteria,'reviewer_ids',g.reviewer_ids,
 'submission',(select to_jsonb(s)||jsonb_build_object('valid_current',public.engineering_snapshot_current(s.engineering_snapshot) and public.engineering_override_current(s.override_scope),'submitted_by_name',a.display_name,'decided_by_name',d.display_name) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.id=g.current_submission),
 'history',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('valid_current',public.engineering_snapshot_current(s.engineering_snapshot) and public.engineering_override_current(s.override_scope),'submitted_by_name',a.display_name,'decided_by_name',d.display_name) order by s.submitted_at desc),'[]'::jsonb) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.task_id=g.task_id) end,
 'audit',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('actor_name',m.display_name) order by a.created_at desc),'[]'::jsonb) from public.project_review_audit a left join public.team_members m on m.id=a.actor_id where a.task_id=g.task_id) end)
 order by g.created_at),'[]'::jsonb)
 from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id left join public.team_members m on m.id=g.reviewer_id
 where g.enabled and ((p_task is not null and g.task_id=p_task) or (p_task is null and p_all) or (p_task is null and not p_all and not t.archived and p.status<>'archived' and (g.reviewer_id=auth.uid() or g.reviewer_ids @> jsonb_build_array(auth.uid()))
 and exists(select 1 from public.project_review_submissions s where s.id=g.current_submission and s.status='pending')));
$$;


commit;
