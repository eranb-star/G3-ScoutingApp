begin;
create index if not exists project_tasks_overdue_readiness_idx on public.project_tasks(due_at) where not archived and status<>'done';
create or replace function public.overdue_project_tasks() returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by due_at,id),'[]'::jsonb) from (
 select t.id,t.title,t.assignee_id,m.display_name as owner,t.due_at,t.priority,t.created_at,
 greatest(0,(now() at time zone 'Asia/Jerusalem')::date-(t.due_at at time zone 'Asia/Jerusalem')::date) as days_overdue,
 '/projects?project='||t.project_id||'&task='||t.id as href
 from project_tasks t join team_projects p on p.id=t.project_id left join team_members m on m.id=t.assignee_id
 where not t.archived and t.status<>'done' and t.due_at<now() and p.status not in ('archived','completed')
 and exists(select 1 from team_members me where me.id=auth.uid() and me.active)
 and (t.assignee_id=auth.uid() or (has_permission('view_team_risks') and has_permission('assign_team_work',p.subteam)))
 order by t.due_at,t.id limit 100) x;
$$;
revoke all on function public.overdue_project_tasks() from public,anon;
grant execute on function public.overdue_project_tasks() to authenticated;
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
 select jsonb_build_object('as_of',now(),'overdue_tasks',public.overdue_project_tasks(),'purchases',public.readiness_purchase_context(),'event',(select to_jsonb(x)||jsonb_build_object('checklist',public.competition_checklist_progress(x.id)) from (
 select * from eligible order by
 case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,
 home_priority desc,start_day,id limit 1) x),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('checklist',public.competition_checklist_progress(e.id)) order by case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,home_priority desc,start_day,id) from eligible e),'[]'::jsonb),
 'risks',coalesce((select jsonb_agg(to_jsonb(s) order by case severity when 'critical' then 0 when 'high' then 1 else 2 end,opened_at) from public.system_signals s where s.status='active'),'[]'::jsonb));
$$;
revoke all on function public.home_readiness_context() from public,anon;
grant execute on function public.home_readiness_context() to authenticated;

commit;
