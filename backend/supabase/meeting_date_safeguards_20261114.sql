begin;
-- Additive: no update/delete of existing meetings, attendance or requests.
create or replace function public.audit_calendar_schedule() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and new.starts_at is not distinct from old.starts_at and new.ends_at is not distinct from old.ends_at then return new; end if;
 if tg_op='UPDATE' and exists(
  select 1 from public.team_meetings m join public.attendance_records a on a.meeting_id=m.id where m.calendar_event_id=new.id
 ) then raise exception 'Attendance already exists; use attendance administration instead of moving this event'; end if;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case when tg_op='INSERT' then 'calendar_schedule_created' else 'calendar_schedule_changed' end,'team_calendar_events',new.id::text,
 jsonb_build_object('previous',case when tg_op='UPDATE' then jsonb_build_object('title',old.title,'starts_at',old.starts_at,'ends_at',old.ends_at) else null end,
 'new',jsonb_build_object('title',new.title,'starts_at',new.starts_at,'ends_at',new.ends_at),'timezone','Asia/Jerusalem'));
 return new;
end $$;
drop trigger if exists calendar_schedule_audit on public.team_calendar_events;
create trigger calendar_schedule_audit before insert or update of starts_at,ends_at on public.team_calendar_events for each row execute function public.audit_calendar_schedule();
create or replace function public.audit_workshop_schedule() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and new.starts_at is not distinct from old.starts_at and new.ends_at is not distinct from old.ends_at and new.attendance_closes_at is not distinct from old.attendance_closes_at then return new; end if;
 if tg_op='UPDATE' and (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at)
 and exists(select 1 from public.attendance_records where meeting_id=new.id) then raise exception 'Attendance already exists; use attendance administration instead of moving this workshop'; end if;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case when tg_op='INSERT' then 'workshop_schedule_created' else 'workshop_schedule_changed' end,'team_meetings',new.id::text,
 jsonb_build_object('previous',case when tg_op='UPDATE' then jsonb_build_object('starts_at',old.starts_at,'ends_at',old.ends_at,'attendance_closes_at',old.attendance_closes_at) else null end,
 'new',jsonb_build_object('starts_at',new.starts_at,'ends_at',new.ends_at,'attendance_closes_at',new.attendance_closes_at),'calendar_event_id',new.calendar_event_id));
 return new;
end $$;
drop trigger if exists workshop_schedule_audit on public.team_meetings;
create trigger workshop_schedule_audit after insert or update of starts_at,ends_at,attendance_closes_at on public.team_meetings for each row execute function public.audit_workshop_schedule();
revoke all on function public.audit_calendar_schedule(), public.audit_workshop_schedule() from public,anon,authenticated;
commit;
