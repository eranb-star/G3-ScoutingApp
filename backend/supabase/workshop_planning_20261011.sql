begin;
-- Scheduled attendance obligations and the actual open-door window are separate.
alter table public.team_meetings add column if not exists attendance_closes_at timestamptz;
create or replace function public.default_workshop_cutoff() returns trigger language plpgsql set search_path=public as $$
begin
 if new.attendance_closes_at is null then
  new.attendance_closes_at:=case when new.meeting_type='workshop' and not new.is_ad_hoc and extract(dow from new.starts_at at time zone 'Asia/Jerusalem') in (0,3)
   then greatest(new.ends_at,((new.starts_at at time zone 'Asia/Jerusalem')::date+time '23:00') at time zone 'Asia/Jerusalem') else new.ends_at end;
 end if;
 if new.attendance_closes_at<new.ends_at then raise exception 'Attendance cutoff must not precede the scheduled end'; end if;
 return new;
end$$;
drop trigger if exists workshop_default_cutoff on public.team_meetings;
create trigger workshop_default_cutoff before insert or update of attendance_closes_at,ends_at on public.team_meetings for each row execute function public.default_workshop_cutoff();
update public.team_meetings set attendance_closes_at=case when status in ('open','scheduled') and meeting_type='workshop' and not is_ad_hoc and extract(dow from starts_at at time zone 'Asia/Jerusalem') in (0,3)
 then greatest(ends_at,((starts_at at time zone 'Asia/Jerusalem')::date+time '23:00') at time zone 'Asia/Jerusalem') else ends_at end where attendance_closes_at is null;
alter table public.team_meetings alter column attendance_closes_at set not null;
create or replace function public.guard_workshop_checkin_after_close() returns trigger language plpgsql security definer set search_path=public as $$
declare m public.team_meetings;
begin
 if new.checked_out_at is null and new.check_in_method<>'admin' then
  select * into m from public.team_meetings where id=new.meeting_id for update;
  if not found or m.status<>'open' or m.attendance_closes_at<=now() then raise exception 'Workshop is closed. Refresh attendance before trying again';end if;
 end if;
 return new;
end$$;

create or replace function public.close_stale_workshop_sessions() returns integer language plpgsql security definer set search_path=public as $$
declare m public.team_meetings; n integer:=0;
begin
 for m in select * from public.team_meetings where status='open' and attendance_closes_at<=now() order by id for update loop
  update public.attendance_records set checked_out_at=greatest(checked_in_at,m.attendance_closes_at),check_out_method='automatic',updated_at=now() where meeting_id=m.id and checked_out_at is null;
  update public.team_meetings set status='closed',closed_at=now() where id=m.id;
  n:=n+1;
 end loop;
 return n;
end$$;

-- Calendar edits/cancellations must follow the linked official workshop.
create or replace function public.sync_official_workshop_calendar() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if pg_trigger_depth()>1 then return new;end if;
 if exists(select 1 from public.team_meetings where calendar_event_id=new.id and status in ('open','closed'))
 and (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.cancelled is distinct from old.cancelled) then
  raise exception 'This workshop has already started. Use attendance administration instead of changing its calendar dates';
 end if;
 update public.team_meetings set title=new.title,starts_at=new.starts_at,ends_at=new.ends_at,
  meeting_date=(new.starts_at at time zone 'Asia/Jerusalem')::date,
  attendance_closes_at=greatest(attendance_closes_at+(new.starts_at-old.starts_at),new.ends_at),status=case when new.cancelled then 'cancelled' else status end
 where calendar_event_id=new.id and status='scheduled';
 return new;
end$$;
drop trigger if exists official_workshop_calendar_update on public.team_calendar_events;
create trigger official_workshop_calendar_update after update of title,starts_at,ends_at,cancelled on public.team_calendar_events for each row execute function public.sync_official_workshop_calendar();

create or replace function public.save_official_workshop(p_id uuid,p_title text,p_start timestamptz,p_end timestamptz,p_cutoff timestamptz,p_location text,p_notes text,p_target text,p_value text,p_mandatory boolean,p_cancel boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare m public.team_meetings; event_id uuid; result_id uuid; role_name text:=public.current_team_role();
begin
 if coalesce(role_name,'') not in ('admin','mentor','team_leader') then raise exception 'Workshop supervisor required';end if;
 perform pg_advisory_xact_lock(hashtext('g3-official-workshop-planning'));
 if p_id is not null then
  select * into m from public.team_meetings where id=p_id for update;
  if not found or m.rule_id is not null or m.status<>'scheduled' or (role_name='team_leader' and m.created_by is distinct from auth.uid()) then raise exception 'Only your own upcoming one-time workshops can be changed';end if;
  if exists(select 1 from public.attendance_records where meeting_id=m.id) then raise exception 'Attendance already exists; ask an admin to correct the meeting';end if;
  event_id:=m.calendar_event_id;
 end if;
 if p_cancel then
  if p_id is null then raise exception 'Choose a workshop';end if;
  update public.team_meetings set status='cancelled' where id=p_id;
  update public.team_calendar_events set cancelled=true where id=event_id;
  return p_id;
 end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 160 or p_start is null or p_start<=now() or p_end is null or p_end<=p_start or p_cutoff is null or p_cutoff<p_end or p_cutoff>p_start+interval '24 hours' then raise exception 'Choose a future workshop, valid hours and a cutoff within 24 hours of its start';end if;
 if p_target not in ('all','subteam') or (p_target='subteam' and not exists(select 1 from public.team_members where active and subteam=p_value)) then raise exception 'Choose the whole team or an existing subteam';end if;
 if exists(select 1 from public.team_meetings where status in ('scheduled','open') and meeting_type='workshop' and id is distinct from p_id and starts_at<p_end and ends_at>p_start) then raise exception 'Another workshop overlaps these hours. Use the existing workshop or choose another time';end if;
 if event_id is null then
  insert into public.team_calendar_events(title,description,event_type,starts_at,ends_at,location,target_type,target_value,mandatory,created_by)
  values(trim(p_title),p_notes,'meeting',p_start,p_end,p_location,p_target,case when p_target='all' then null else p_value end,p_mandatory,auth.uid()) returning id into event_id;
 else
  update public.team_calendar_events set title=trim(p_title),description=p_notes,starts_at=p_start,ends_at=p_end,location=p_location,target_type=p_target,target_value=case when p_target='all' then null else p_value end,mandatory=p_mandatory where id=event_id;
 end if;
 if p_id is null then
  insert into public.team_meetings(title,meeting_date,starts_at,ends_at,attendance_closes_at,meeting_type,status,notes,created_by,calendar_event_id)
  values(trim(p_title),(p_start at time zone 'Asia/Jerusalem')::date,p_start,p_end,p_cutoff,'workshop','scheduled',p_notes,auth.uid(),event_id) returning id into result_id;
 else
  update public.team_meetings set title=trim(p_title),meeting_date=(p_start at time zone 'Asia/Jerusalem')::date,starts_at=p_start,ends_at=p_end,attendance_closes_at=p_cutoff,notes=p_notes,calendar_event_id=event_id where id=p_id;
  result_id:=p_id;
 end if;
 return result_id;
end$$;
revoke all on function public.save_official_workshop(uuid,text,timestamptz,timestamptz,timestamptz,text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.save_official_workshop(uuid,text,timestamptz,timestamptz,timestamptz,text,text,text,text,boolean,boolean) to authenticated;
create or replace function public.cancel_linked_workshop_calendar() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='cancelled' and old.status<>'cancelled' and new.calendar_event_id is not null then
  update public.team_calendar_events set cancelled=true where id=new.calendar_event_id and not cancelled;
 end if;
 return new;
end$$;
drop trigger if exists workshop_cancel_calendar on public.team_meetings;
create trigger workshop_cancel_calendar after update of status on public.team_meetings for each row execute function public.cancel_linked_workshop_calendar();
create or replace function public.open_due_workshops() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if coalesce(auth.role(),'')<>'service_role' and session_user<>'postgres' then raise exception 'Scheduler access required'; end if;
 insert into public.team_meetings(rule_id,meeting_date,title,starts_at,ends_at,meeting_type)
 select r.id,d::date,r.title,(d::date+r.start_time) at time zone r.timezone,(d::date+r.end_time) at time zone r.timezone,'workshop'
 from public.meeting_rules r cross join generate_series((now() at time zone 'Asia/Jerusalem')::date,(now() at time zone 'Asia/Jerusalem')::date+120,interval '1 day') d
 where r.active and extract(dow from d)::smallint=r.day_of_week
 on conflict(rule_id,meeting_date) do nothing;
 update public.team_meetings set status='open',opened_by=null
 where status='scheduled' and meeting_type='workshop' and starts_at<=now()+interval '1 hour' and attendance_closes_at>now();
 get diagnostics n=row_count; return n;
end $$;
create or replace function public.open_verified_workshop(p_member_id uuid) returns public.team_meetings
language plpgsql security definer set search_path=public as $$
declare m public.team_meetings;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Verified attendance service required'; end if;
 if not exists(select 1 from public.team_members where id=p_member_id and active and not must_change_password) then raise exception 'Active member required'; end if;
 perform pg_advisory_xact_lock(hashtext('g3-workshop-opening'));
 select * into m from public.team_meetings where status='open' and starts_at<=now()+interval '1 hour' and attendance_closes_at>now() order by starts_at limit 1;
 if found then return m; end if;
 select * into m from public.team_meetings where status='scheduled' and meeting_type='workshop' and starts_at<=now()+interval '1 hour' and attendance_closes_at>now() order by starts_at limit 1 for update;
 if found then
   update public.team_meetings set status='open',opened_by=p_member_id where id=m.id returning * into m;
 else
   insert into public.team_meetings(meeting_date,title,starts_at,ends_at,status,meeting_type,is_ad_hoc,created_by,opened_by)
   values((now() at time zone 'Asia/Jerusalem')::date,'Member-opened workshop',now(),now()+interval '12 hours','open','workshop',true,p_member_id,p_member_id) returning * into m;
 end if;
 return m;
end $$;
create or replace function public.manage_workshop_session(p_meeting_id uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
declare m public.team_meetings;
begin
 if coalesce(public.current_team_role(),'') not in ('admin','mentor','team_leader') then raise exception 'Workshop supervisor required'; end if;
 select * into m from public.team_meetings where id=p_meeting_id for update;
 if not found or m.status<>'open' then raise exception 'Open workshop not found'; end if;
 if p_action='extend' then
   update public.team_meetings set attendance_closes_at=greatest(attendance_closes_at,now())+interval '1 hour' where id=m.id;
   insert into public.workshop_session_history(meeting_id,action,actor_id,automatic,previous_end,new_end) values(m.id,'attendance_extended',auth.uid(),false,m.attendance_closes_at,greatest(m.attendance_closes_at,now())+interval '1 hour');
 elsif p_action='close' then
   if exists(select 1 from public.attendance_records where meeting_id=m.id and checked_out_at is null) then
     raise exception 'People are still checked in. Ask them to check out before closing, or extend the session.';
   end if;
   update public.team_meetings set status='closed' where id=m.id;
 else raise exception 'Invalid workshop action'; end if;
end $$;
commit;
