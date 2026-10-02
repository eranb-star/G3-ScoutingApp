-- Enrich existing absence notifications without changing recipients, RLS or review RPCs.
begin;
create or replace function public.stamp_absence_action_date() returns trigger
language plpgsql set search_path=public as $$
declare event_row record; body text;
begin
 if new.source_table is distinct from 'absence_request_status' and left(coalesce(new.source_table,''),15)<>'absence_review_' then return new; end if;
 select e.starts_at,e.ends_at,e.cancelled into event_row from public.absence_requests r join public.team_calendar_events e on e.id=r.calendar_event_id where r.id=new.source_id;
 if not found then return new; end if;
 body:=regexp_replace(coalesce(new.details,''),'^Absence for [(]Israel[)]:[^\n]*\n','');
 new.details:='Absence for (Israel): '||to_char(event_row.starts_at at time zone 'Asia/Jerusalem','YYYY-MM-DD HH24:MI')||' – '||to_char(event_row.ends_at at time zone 'Asia/Jerusalem','YYYY-MM-DD HH24:MI')||case when event_row.cancelled then ' · CANCELLED' else '' end||E'\n'||body;
 return new;
end $$;
drop trigger if exists absence_action_meeting_date on public.team_actions;
create trigger absence_action_meeting_date before insert or update of details,source_table,source_id on public.team_actions for each row execute function public.stamp_absence_action_date();
create or replace function public.refresh_absence_action_dates() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 update public.team_actions a set details=a.details where (a.source_table='absence_request_status' or left(a.source_table,15)='absence_review_') and a.source_id in(select r.id from public.absence_requests r where r.calendar_event_id=new.id);
 return new;
end $$;
revoke all on function public.stamp_absence_action_date() from public,anon,authenticated;
revoke all on function public.refresh_absence_action_dates() from public,anon,authenticated;
drop trigger if exists absence_actions_follow_event_dates on public.team_calendar_events;
create trigger absence_actions_follow_event_dates after update of starts_at,ends_at,cancelled on public.team_calendar_events for each row when(old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at or old.cancelled is distinct from new.cancelled) execute function public.refresh_absence_action_dates();
update public.team_actions set details=details where source_table='absence_request_status' or left(source_table,15)='absence_review_';
commit;
select 'absence notification dates installed' as result;
