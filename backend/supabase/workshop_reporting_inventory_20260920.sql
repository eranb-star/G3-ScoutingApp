begin;

-- Preserve scheduled-rule uniqueness but permit more than one ad-hoc session per day.
alter table public.team_meetings drop constraint if exists team_meetings_rule_id_meeting_date_key;
alter table public.team_meetings add constraint team_meetings_rule_id_meeting_date_key unique(rule_id,meeting_date);

-- Inventory is shared stock, not a subteam-owned project. Preserve all delete boundaries.
create or replace function public.can_manage_shared_inventory() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.team_members m
 join public.role_permissions p on p.role=m.role and p.permission_key='manage_inventory' and p.allowed
 where m.id=auth.uid() and m.active)
$$;
revoke all on function public.can_manage_shared_inventory() from public;
grant execute on function public.can_manage_shared_inventory() to authenticated;
drop policy if exists "authorized members add parts" on public.frc_parts_inventory;
create policy "authorized members add parts" on public.frc_parts_inventory for insert to authenticated
 with check(public.can_manage_shared_inventory());
drop policy if exists "authorized members edit parts" on public.frc_parts_inventory;
create policy "authorized members edit parts" on public.frc_parts_inventory for update to authenticated
 using(public.can_manage_shared_inventory()) with check(public.can_manage_shared_inventory());
drop policy if exists "authorized members add equipment" on public.workshop_tools;
create policy "authorized members add equipment" on public.workshop_tools for insert to authenticated
 with check(public.can_manage_shared_inventory());

alter table public.team_meetings add column if not exists closed_by uuid references public.team_members(id) on delete set null;
alter table public.team_meetings add column if not exists opened_automatically boolean not null default false;
alter table public.team_meetings add column if not exists closed_automatically boolean not null default false;
alter table public.team_meetings add column if not exists calendar_event_id uuid references public.team_calendar_events(id) on delete set null;
-- Only link unambiguous historical calendar entries; never guess from date alone.
update public.team_meetings m set calendar_event_id=c.id from public.team_calendar_events c
 where m.calendar_event_id is null and c.title=m.title and c.starts_at=m.starts_at
 and (select count(*) from public.team_calendar_events x where x.title=m.title and x.starts_at=m.starts_at)=1;

create table if not exists public.workshop_session_history(
 id uuid primary key default gen_random_uuid(),meeting_id uuid not null references public.team_meetings(id) on delete cascade,
 action text not null,actor_id uuid references public.team_members(id) on delete set null,
 automatic boolean not null,occurred_at timestamptz not null default now(),previous_end timestamptz,new_end timestamptz);
alter table public.workshop_session_history enable row level security;
drop policy if exists "members read session history" on public.workshop_session_history;
create policy "members read session history" on public.workshop_session_history for select to authenticated using(public.current_team_role() is not null);
create or replace function public.audit_workshop_session() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; action_name text;
begin
 if tg_op='INSERT' then
   if new.status<>'open' then return new; end if;
   actor:=coalesce(auth.uid(),new.opened_by); action_name:='open';
 elsif new.status is distinct from old.status then
   actor:=coalesce(auth.uid(),case when new.status='open' and new.opened_by is distinct from old.opened_by then new.opened_by end); action_name:=new.status;
 else
   if new.ends_at is not distinct from old.ends_at then return new; end if;
   insert into public.workshop_session_history(meeting_id,action,actor_id,automatic,previous_end,new_end)
   values(new.id,'extended',auth.uid(),auth.uid() is null,old.ends_at,new.ends_at); return new;
 end if;
 if new.status='open' then
   new.opened_by:=actor; new.opened_at:=now(); new.opened_automatically:=actor is null;
   new.closed_by:=null; new.closed_at:=null; new.closed_automatically:=false;
 elsif new.status='closed' then
   new.closed_by:=actor; new.closed_at:=now(); new.closed_automatically:=actor is null;
 end if;
 insert into public.workshop_session_history(meeting_id,action,actor_id,automatic)
 values(new.id,action_name,actor,actor is null);
 return new;
end $$;
-- Deferred FK permits history to be inserted in the BEFORE INSERT trigger.
alter table public.workshop_session_history alter constraint workshop_session_history_meeting_id_fkey deferrable initially deferred;
drop trigger if exists audit_workshop_session on public.team_meetings;
create trigger audit_workshop_session before insert or update of status,ends_at on public.team_meetings
 for each row execute function public.audit_workshop_session();

-- Open scheduled workshops only. No student checkout or departure tracking changes.
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
 where status='scheduled' and meeting_type='workshop' and starts_at<=now()+interval '1 hour' and ends_at>now();
 get diagnostics n=row_count; return n;
end $$;
revoke all on function public.open_due_workshops() from public,authenticated,anon;
grant execute on function public.open_due_workshops() to service_role;

create or replace function public.open_verified_workshop(p_member_id uuid) returns public.team_meetings
language plpgsql security definer set search_path=public as $$
declare m public.team_meetings;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Verified attendance service required'; end if;
 if not exists(select 1 from public.team_members where id=p_member_id and active and not must_change_password) then raise exception 'Active member required'; end if;
 perform pg_advisory_xact_lock(hashtext('g3-workshop-opening'));
 select * into m from public.team_meetings where status='open' and starts_at<=now()+interval '1 hour' and ends_at>now() order by starts_at limit 1;
 if found then return m; end if;
 select * into m from public.team_meetings where status='scheduled' and meeting_type='workshop' and starts_at<=now()+interval '1 hour' and ends_at>now() order by starts_at limit 1 for update;
 if found then
   update public.team_meetings set status='open',opened_by=p_member_id where id=m.id returning * into m;
 else
   insert into public.team_meetings(meeting_date,title,starts_at,ends_at,status,meeting_type,is_ad_hoc,created_by,opened_by)
   values((now() at time zone 'Asia/Jerusalem')::date,'Member-opened workshop',now(),now()+interval '12 hours','open','workshop',true,p_member_id,p_member_id) returning * into m;
 end if;
 return m;
end $$;
revoke all on function public.open_verified_workshop(uuid) from public,authenticated,anon;
grant execute on function public.open_verified_workshop(uuid) to service_role;
-- Database scheduler runs even when nobody has the website open.
do $$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
   if not exists(select 1 from cron.job where jobname='g3-open-due-workshops') then
     perform cron.schedule('g3-open-due-workshops','* * * * *','select public.open_due_workshops()');
   end if;
 end if;
end $$;

create or replace function public.manage_workshop_session(p_meeting_id uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
declare m public.team_meetings;
begin
 if coalesce(public.current_team_role(),'') not in ('admin','mentor','team_leader') then raise exception 'Workshop supervisor required'; end if;
 select * into m from public.team_meetings where id=p_meeting_id for update;
 if not found or m.status<>'open' then raise exception 'Open workshop not found'; end if;
 if p_action='extend' then
   update public.team_meetings set ends_at=greatest(ends_at,now())+interval '1 hour' where id=m.id;
 elsif p_action='close' then
   if exists(select 1 from public.attendance_records where meeting_id=m.id and checked_out_at is null) then
     raise exception 'People are still checked in. Ask them to check out before closing, or extend the session.';
   end if;
   update public.team_meetings set status='closed' where id=m.id;
 else raise exception 'Invalid workshop action'; end if;
end $$;
revoke all on function public.manage_workshop_session(uuid,text) from public;
grant execute on function public.manage_workshop_session(uuid,text) to authenticated;

alter table public.team_media add column if not exists edited_by uuid references public.team_members(id) on delete set null;
-- Roster corrections add/remove manual entries; they never overwrite measured times.
create or replace function public.save_meeting_attendance_roster(p_meeting_id uuid,p_present_members uuid[],p_note text) returns integer
language plpgsql security definer set search_path=public as $$
declare m public.team_meetings; target uuid; row_id uuid; old_record record; saved integer:=0;
begin
 if not coalesce(public.has_permission('correct_attendance'),false) and coalesce(public.current_team_role(),'')<>'mentor' then raise exception 'Not authorized to record attendance'; end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'A roster audit note is required'; end if;
 select * into m from public.team_meetings where id=p_meeting_id for update;
 if not found or m.ends_at>now() then raise exception 'Choose a completed meeting'; end if;
 for old_record in select * from public.attendance_records where meeting_id=m.id and check_in_method='admin'
 and not(member_id=any(coalesce(p_present_members,'{}'::uuid[]))) loop
   insert into public.attendance_audit_log(attendance_id,actor_id,action,reason,previous_values)
   values(old_record.id,auth.uid(),'roster_absent',trim(p_note),to_jsonb(old_record));
   delete from public.attendance_records where id=old_record.id;
 end loop;
 foreach target in array coalesce(p_present_members,'{}'::uuid[]) loop
   row_id:=null;
   insert into public.attendance_records(meeting_id,member_id,checked_in_at,checked_out_at,check_in_method,check_out_method,corrected_by,correction_reason)
   values(m.id,target,m.starts_at,m.ends_at,'admin','admin',auth.uid(),trim(p_note))
   on conflict(meeting_id,member_id) do nothing returning id into row_id;
   if row_id is not null then
     insert into public.attendance_audit_log(attendance_id,actor_id,action,reason,new_values)
     values(row_id,auth.uid(),'roster_present',trim(p_note),jsonb_build_object('meeting_id',m.id,'member_id',target));
     saved:=saved+1;
   end if;
 end loop;
 return saved;
end $$;
create or replace function public.media_search_text(p_title text,p_caption text,p_tags text[]) returns text
language sql immutable set search_path=public as $$select coalesce(p_title,'')||' '||coalesce(p_caption,'')||' '||coalesce(array_to_string(p_tags,' '),'')$$;
alter table public.team_media add column if not exists search_text text generated always as
 (public.media_search_text(title,caption,tags)) stored;
alter table public.team_media add column if not exists library_date date generated always as
 (coalesce(event_date,(created_at at time zone 'Asia/Jerusalem')::date)) stored;
create index if not exists team_media_library_date_idx on public.team_media(library_date desc,id desc);
create or replace function public.stamp_team_media_edit() returns trigger language plpgsql set search_path=public as $$
begin new.edited_by:=auth.uid(); new.updated_at:=now(); return new; end $$;
drop trigger if exists stamp_team_media_edit on public.team_media;
create trigger stamp_team_media_edit before update on public.team_media for each row execute function public.stamp_team_media_edit();
commit;
