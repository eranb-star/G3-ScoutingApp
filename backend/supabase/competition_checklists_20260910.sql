begin;
create table if not exists public.competition_checklist_tasks(
 calendar_event_id uuid not null references public.team_calendar_events(id) on delete cascade,
 task_id uuid not null references public.project_tasks(id) on delete cascade,
 created_by uuid not null default auth.uid() references public.team_members(id),
 created_at timestamptz not null default now(), primary key(calendar_event_id,task_id));
alter table public.competition_checklist_tasks enable row level security;
drop policy if exists checklist_read on public.competition_checklist_tasks;
create policy checklist_read on public.competition_checklist_tasks for select to authenticated using(
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled and c.event_type='competition')
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and not t.archived and p.status<>'archived'));
drop policy if exists checklist_add on public.competition_checklist_tasks;
create policy checklist_add on public.competition_checklist_tasks for insert to authenticated with check(created_by=auth.uid() and
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled and c.event_type='competition' and public.has_permission('manage_team_calendar',case when c.target_type='subteam' then c.target_value else null end))
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and not t.archived and p.status<>'archived' and public.has_permission('assign_team_work',p.subteam)));
drop policy if exists checklist_remove on public.competition_checklist_tasks;
create policy checklist_remove on public.competition_checklist_tasks for delete to authenticated using(
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and public.has_permission('manage_team_calendar',case when c.target_type='subteam' then c.target_value else null end))
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and public.has_permission('assign_team_work',p.subteam)));
grant select,insert,delete on public.competition_checklist_tasks to authenticated;
revoke update on public.competition_checklist_tasks from authenticated;
create or replace function public.competition_checklist(p_event uuid) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'status',t.status,'due_at',t.due_at,'assignee_id',t.assignee_id,'owner',m.display_name,'project_id',t.project_id,'subteam',p.subteam) order by (t.status='done'),t.due_at nulls last,t.id),'[]'::jsonb)
 from competition_checklist_tasks l join project_tasks t on t.id=l.task_id join team_projects p on p.id=t.project_id left join team_members m on m.id=t.assignee_id where l.calendar_event_id=p_event;
$$;
create or replace function public.create_competition_task(p_event uuid,p_project uuid,p_title text,p_owner uuid,p_due timestamptz) returns uuid language plpgsql security invoker set search_path=public as $$
declare task uuid;begin
 if length(trim(coalesce(p_title,'')))=0 or p_due is null or not exists(select 1 from team_members where id=p_owner and active) then raise exception 'Title, active owner and due date are required';end if;
 if not exists(select 1 from team_projects where id=p_project and status<>'archived' and has_permission('assign_team_work',subteam)) then raise exception 'Project assignment not permitted';end if;
 insert into project_tasks(project_id,title,assignee_id,due_at,created_by,status) values(p_project,trim(p_title),p_owner,p_due,auth.uid(),'todo') returning id into task;
 insert into competition_checklist_tasks(calendar_event_id,task_id) values(p_event,task);
 return task;
end$$;
revoke all on function public.competition_checklist(uuid),public.create_competition_task(uuid,uuid,text,uuid,timestamptz) from public,anon;
grant execute on function public.competition_checklist(uuid),public.create_competition_task(uuid,uuid,text,uuid,timestamptz) to authenticated;
create or replace function public.competition_checklist_progress(p_event uuid) returns jsonb language sql stable security invoker set search_path=public as $$
select jsonb_build_object('total',count(*),'done',count(*) filter(where t.status='done'),'overdue',count(*) filter(where t.status<>'done' and t.due_at<now())) from competition_checklist_tasks l join project_tasks t on t.id=l.task_id where l.calendar_event_id=p_event;
$$;
revoke all on function public.competition_checklist_progress(uuid) from public,anon;
grant execute on function public.competition_checklist_progress(uuid) to authenticated;
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
 select jsonb_build_object('as_of',now(),'purchases',public.readiness_purchase_context(),'event',(select to_jsonb(x)||jsonb_build_object('checklist',public.competition_checklist_progress(x.id)) from (
 select * from eligible order by
 case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,
 home_priority desc,start_day,id limit 1) x),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('checklist',public.competition_checklist_progress(e.id)) order by case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,home_priority desc,start_day,id) from eligible e),'[]'::jsonb),
 'risks',coalesce((select jsonb_agg(to_jsonb(s) order by case severity when 'critical' then 0 when 'high' then 1 else 2 end,opened_at) from public.system_signals s where s.status='active'),'[]'::jsonb));
$$;
revoke all on function public.home_readiness_context() from public,anon;
grant execute on function public.home_readiness_context() to authenticated;

commit;
