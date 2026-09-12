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
