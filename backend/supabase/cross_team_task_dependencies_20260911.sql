begin;
create table if not exists public.project_task_dependencies(
 task_id uuid not null references public.project_tasks(id) on delete cascade,
 prerequisite_id uuid not null references public.project_tasks(id) on delete restrict,
 created_by uuid not null default auth.uid() references public.team_members(id),
 created_at timestamptz not null default now(),
 primary key(task_id,prerequisite_id),check(task_id<>prerequisite_id));
create index if not exists task_dependency_upstream_idx on public.project_task_dependencies(prerequisite_id);
alter table public.project_task_dependencies enable row level security;
drop policy if exists dependency_read on public.project_task_dependencies;
create policy dependency_read on public.project_task_dependencies for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id));
drop policy if exists dependency_add on public.project_task_dependencies;
create policy dependency_add on public.project_task_dependencies for insert to authenticated with check(created_by=auth.uid()
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and not t.archived and p.status<>'archived' and public.has_permission('assign_team_work',p.subteam))
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=prerequisite_id and not t.archived and p.status<>'archived'));
drop policy if exists dependency_remove on public.project_task_dependencies;
create policy dependency_remove on public.project_task_dependencies for delete to authenticated using(
 exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and public.has_permission('assign_team_work',p.subteam)));
grant select,insert,delete on public.project_task_dependencies to authenticated;
revoke update on public.project_task_dependencies from authenticated,anon;
-- Serialize graph mutations before traversing the complete graph. A competing lock
-- upgrade may abort with a deadlock; it cannot commit a cyclic graph.
create or replace function public.guard_task_dependency_cycle() returns trigger language plpgsql security definer set search_path=public as $$
begin
 lock table public.project_task_dependencies in share row exclusive mode;
 if new.task_id=new.prerequisite_id or exists(
 with recursive ancestors(id) as (
 select new.prerequisite_id union select d.prerequisite_id from project_task_dependencies d join ancestors a on d.task_id=a.id
 ) select 1 from ancestors where id=new.task_id) then raise exception 'A task cannot depend on itself or form a dependency cycle' using errcode='23514';end if;
 return new;
end$$;
revoke all on function public.guard_task_dependency_cycle() from public,anon,authenticated;
drop trigger if exists prevent_task_dependency_cycle on public.project_task_dependencies;
create trigger prevent_task_dependency_cycle before insert or update on public.project_task_dependencies for each row execute function public.guard_task_dependency_cycle();
create or replace function public.task_dependency_context(p_home boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by task_id,prerequisite_id),'[]'::jsonb) from (
 select d.task_id,d.prerequisite_id,t.status as task_status,
 u.title,u.status,case when u.id is not null and q.id is not null then u.archived or q.status='archived' else true end as unavailable,
 u.assignee_id,m.display_name as owner,q.subteam,u.due_at,
 case when u.id is not null and q.id is not null then '/projects?project='||u.project_id||'&task='||u.id else null end as href,
 not coalesce(u.status='done' and not u.archived and q.status<>'archived',false) as waiting
 from project_task_dependencies d join project_tasks t on t.id=d.task_id join team_projects p on p.id=t.project_id
 left join project_tasks u on u.id=d.prerequisite_id left join team_projects q on q.id=u.project_id left join team_members m on m.id=u.assignee_id
 where not t.archived and p.status<>'archived'
 and (not p_home or t.assignee_id=auth.uid() or (has_permission('view_team_risks') and has_permission('assign_team_work',p.subteam)))
 ) x;
$$;
revoke all on function public.task_dependency_context(boolean) from public,anon;
grant execute on function public.task_dependency_context(boolean) to authenticated;
create or replace function public.home_readiness_context() returns jsonb language sql stable security invoker set search_path=public as $$
 with contexts as (
 select c.id,c.title,c.event_type,c.home_priority,c.competition_event_id,
 case when c.competition_event_id is not null then e.start_date else (c.starts_at at time zone 'Asia/Jerusalem')::date end as start_day,
 case when c.competition_event_id is not null then coalesce(e.end_date,e.start_date) else (c.ends_at at time zone 'Asia/Jerusalem')::date end as end_day,
 c.home_countdown_days
 from public.team_calendar_events c left join public.events e on e.id=c.competition_event_id
 where c.home_featured and not c.cancelled and exists(select 1 from public.team_members m where m.id=auth.uid() and m.active)
 and (c.competition_event_id is null or (e.active and e.start_date is not null))
 ), eligible as (
 select *,start_day-(now() at time zone 'Asia/Jerusalem')::date as days_until from contexts
 where end_day>=(now() at time zone 'Asia/Jerusalem')::date
 and start_day<=(now() at time zone 'Asia/Jerusalem')::date+home_countdown_days
 )
 select jsonb_build_object('as_of',now(),'task_dependencies',public.task_dependency_context(true),'approval_aging',public.purchase_approval_aging(),'overdue_tasks',public.overdue_project_tasks(),'purchases',public.readiness_purchase_context(),'event',(select to_jsonb(x)||jsonb_build_object('checklist',public.competition_checklist_progress(x.id)) from (
 select * from eligible order by
 case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,
 home_priority desc,start_day,id limit 1) x),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('checklist',public.competition_checklist_progress(e.id)) order by case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,home_priority desc,start_day,id) from eligible e),'[]'::jsonb),
 'risks',coalesce((select jsonb_agg(to_jsonb(s) order by case severity when 'critical' then 0 when 'high' then 1 else 2 end,opened_at) from public.system_signals s where s.status='active'),'[]'::jsonb));
$$;
revoke all on function public.home_readiness_context() from public,anon;
grant execute on function public.home_readiness_context() to authenticated;

commit;
