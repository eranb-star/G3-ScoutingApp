begin;
create or replace function public.task_dependency_context(p_home boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by task_id,prerequisite_id),'[]'::jsonb) from (
 select d.task_id,d.prerequisite_id,t.status as task_status,
 u.title,u.status,case when u.id is not null and q.id is not null then u.archived or q.status='archived' else true end as unavailable,
 u.assignee_id,m.display_name as owner,q.subteam,u.due_at,
 case when u.id is not null and q.id is not null then '/projects?project='||u.project_id||'&task='||u.id else null end as href,
 not coalesce(u.status='done' and not u.archived and q.status<>'archived' and not exists(
 select 1 from public.project_review_gates rg left join public.project_review_submissions rs on rs.id=rg.current_submission
 where rg.task_id=u.id and rg.enabled and (rs.id is null or rs.status not in ('approved','overridden')
 or not public.requirement_results_pass(rs.requirements,rs.requirement_results,rs.status='overridden') or not public.engineering_snapshot_current(rs.engineering_snapshot))
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
 union select task_id,task_id from public.project_review_gates where enabled
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
 or not public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden') or not public.engineering_snapshot_current(s.engineering_snapshot))))
 ) x;
$$;
create or replace function public.project_review_context(p_task uuid default null,p_all boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('task_id',g.task_id,'project_id',t.project_id,'title',t.title,'due_at',t.due_at,'reviewer_id',g.reviewer_id,'reviewer',m.display_name,'criteria',g.criteria,'reviewer_ids',g.reviewer_ids,
 'submission',(select to_jsonb(s)||jsonb_build_object('valid_current',public.engineering_snapshot_current(s.engineering_snapshot),'submitted_by_name',a.display_name,'decided_by_name',d.display_name) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.id=g.current_submission),
 'history',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('valid_current',public.engineering_snapshot_current(s.engineering_snapshot),'submitted_by_name',a.display_name,'decided_by_name',d.display_name) order by s.submitted_at desc),'[]'::jsonb) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.task_id=g.task_id) end,
 'audit',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('actor_name',m.display_name) order by a.created_at desc),'[]'::jsonb) from public.project_review_audit a left join public.team_members m on m.id=a.actor_id where a.task_id=g.task_id) end)
 order by g.created_at),'[]'::jsonb)
 from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id left join public.team_members m on m.id=g.reviewer_id
 where g.enabled and ((p_task is not null and g.task_id=p_task) or (p_task is null and p_all) or (p_task is null and not p_all and not t.archived and p.status<>'archived' and (g.reviewer_id=auth.uid() or g.reviewer_ids @> jsonb_build_array(auth.uid()))
 and exists(select 1 from public.project_review_submissions s where s.id=g.current_submission and s.status='pending')));
$$;
commit;
