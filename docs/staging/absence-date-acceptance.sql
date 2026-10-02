begin;
do $$
declare event_id uuid; action_id uuid; before_count integer; after_text text;
begin
 select r.calendar_event_id,a.id into event_id,action_id from public.absence_requests r join public.team_actions a on a.source_id=r.id where left(a.source_table,15)='absence_review_' or a.source_table='absence_request_status' limit 1;
 if event_id is null then raise exception 'No existing absence notification available for rollback test'; end if;
 select count(*) into before_count from public.team_actions;
 update public.team_calendar_events set starts_at=starts_at+interval '1 day',ends_at=ends_at+interval '1 day' where id=event_id;
 select a.details into after_text from public.team_actions a where a.id=action_id;
 if not exists(select 1 from public.team_calendar_events e where e.id=event_id and after_text like 'Absence for (Israel): '||to_char(e.starts_at at time zone 'Asia/Jerusalem','YYYY-MM-DD HH24:MI')||'%') then raise exception 'Notification does not track meeting date'; end if;
 update public.team_actions set details=details where id=action_id;
 if (select details from public.team_actions where id=action_id)<>after_text then raise exception 'Date enrichment is not idempotent'; end if;
 if (select count(*) from public.team_actions)<>before_count then raise exception 'Unexpected additional notifications'; end if;
end $$;
rollback;
select 'PASS rescheduling, idempotence, no additional notifications; all test changes rolled back' as result;
