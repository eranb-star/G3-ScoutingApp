begin;
create table if not exists public.purchase_approval_settings(id boolean primary key default true check(id),threshold_hours integer not null default 72 check(threshold_hours between 1 and 8760));
insert into public.purchase_approval_settings(id) values(true) on conflict do nothing;
alter table public.purchase_approval_settings enable row level security;
drop policy if exists approval_settings_read on public.purchase_approval_settings;
create policy approval_settings_read on public.purchase_approval_settings for select to authenticated using(public.is_admin());
drop policy if exists approval_settings_update on public.purchase_approval_settings;
create policy approval_settings_update on public.purchase_approval_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,update on public.purchase_approval_settings to authenticated;
create index if not exists purchase_requested_age_idx on public.frc_purchase_requests(created_at) where status='requested';
create or replace function public.purchase_approval_aging() returns jsonb language sql stable security invoker set search_path=public as $$
 select case when public.is_admin() then jsonb_build_object('threshold_hours',s.threshold_hours,'requests',coalesce((select jsonb_agg(to_jsonb(x) order by created_at,id) from (
 select p.id,p.item_name,p.created_at,floor(extract(epoch from (now()-p.created_at))/3600)::integer as waiting_hours
 from frc_purchase_requests p where p.status='requested' and p.created_at<=now()-make_interval(hours=>s.threshold_hours) order by p.created_at,p.id limit 100) x),'[]'::jsonb)) else null end
 from purchase_approval_settings s where s.id;
$$;
revoke all on function public.purchase_approval_aging() from public,anon;
grant execute on function public.purchase_approval_aging() to authenticated;
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
 select jsonb_build_object('as_of',now(),'approval_aging',public.purchase_approval_aging(),'overdue_tasks',public.overdue_project_tasks(),'purchases',public.readiness_purchase_context(),'event',(select to_jsonb(x)||jsonb_build_object('checklist',public.competition_checklist_progress(x.id)) from (
 select * from eligible order by
 case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,
 home_priority desc,start_day,id limit 1) x),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('checklist',public.competition_checklist_progress(e.id)) order by case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,home_priority desc,start_day,id) from eligible e),'[]'::jsonb),
 'risks',coalesce((select jsonb_agg(to_jsonb(s) order by case severity when 'critical' then 0 when 'high' then 1 else 2 end,opened_at) from public.system_signals s where s.status='active'),'[]'::jsonb));
$$;
revoke all on function public.home_readiness_context() from public,anon;
grant execute on function public.home_readiness_context() to authenticated;

commit;
