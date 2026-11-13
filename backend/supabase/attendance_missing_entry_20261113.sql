begin;
create or replace function public.admin_add_missing_attendance(p_meeting uuid,p_member uuid,p_in timestamptz,p_out timestamptz,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare m public.team_meetings; saved public.attendance_records;
begin
 if not (coalesce(public.is_admin(),false) or public.has_permission('correct_attendance')) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Attendance correction permission required' using errcode='42501';end if;
 if length(trim(coalesce(p_reason,'')))<4 or length(p_reason)>1000 then raise exception 'Enter a correction reason between 4 and 1000 characters';end if;
 if p_in is null or not isfinite(p_in) or p_in>now() or (p_out is not null and (not isfinite(p_out) or p_out<p_in or p_out>now() or p_out-p_in>interval '24 hours')) then raise exception 'Enter valid actual attendance times, not future times';end if;
 perform pg_advisory_xact_lock(6740,1015);
 select * into m from public.team_meetings where id=p_meeting for share;
 if not found or m.status not in ('open','closed') then raise exception 'Choose an existing open or closed meeting';end if;
 if (p_in at time zone 'Asia/Jerusalem')::date<>(m.starts_at at time zone 'Asia/Jerusalem')::date then raise exception 'Arrival must be on the selected meeting date (Israel time)';end if;
 if p_out is null and (m.status<>'open' or coalesce(m.attendance_closes_at,m.ends_at)<=now()) then raise exception 'Enter departure time for a finished meeting';end if;
 if not exists(select 1 from public.team_members where id=p_member and role in ('member','team_leader')) or exists(select 1 from public.qa_test_accounts where member_id=p_member) then raise exception 'Choose a student, not a mentor or QA account';end if;
 if exists(select 1 from public.attendance_records where meeting_id=p_meeting and member_id=p_member) then raise exception 'Attendance already exists. Refresh and use Correct times.';end if;
 if exists(select 1 from public.attendance_records a where a.member_id=p_member and ((a.checked_out_at is null and p_out is null) or tstzrange(a.checked_in_at,coalesce(a.checked_out_at,now()),'[)') && tstzrange(p_in,coalesce(p_out,now()),'[)'))) then raise exception 'These times overlap another attendance record. Review that record first.';end if;
 insert into public.attendance_records(meeting_id,member_id,checked_in_at,checked_out_at,check_in_method,check_out_method,corrected_by,correction_reason)
 values(p_meeting,p_member,p_in,p_out,'admin',case when p_out is null then null else 'admin' end,auth.uid(),trim(p_reason)) returning * into saved;
 insert into public.attendance_audit_log(attendance_id,actor_id,action,reason,previous_values,new_values)
 values(saved.id,auth.uid(),'add_missing_attendance',trim(p_reason),null,to_jsonb(saved));
 return saved.id;
exception when unique_violation then raise exception 'Attendance already exists. Refresh and use Correct times.';
end$$;
revoke all on function public.admin_add_missing_attendance(uuid,uuid,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.admin_add_missing_attendance(uuid,uuid,timestamptz,timestamptz,text) to authenticated;
commit;
