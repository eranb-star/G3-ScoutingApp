begin;
create or replace function public.admin_correct_attendance_times(p_record uuid,p_expected_in timestamptz,p_expected_out timestamptz,p_in timestamptz,p_out timestamptz,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.attendance_records; after_record public.attendance_records;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required' using errcode='42501';end if;
 if p_in is null or not isfinite(p_in) or p_in>now() or (p_out is not null and (not isfinite(p_out) or p_out<p_in or p_out>now())) then raise exception 'Enter valid actual attendance times, not future times';end if;
 if length(trim(coalesce(p_reason,'')))<4 or length(p_reason)>1000 then raise exception 'Enter a correction reason between 4 and 1000 characters';end if;
 -- Serialize admin corrections for overlap checks, including different sessions.
 perform pg_advisory_xact_lock(6740,1015);
 select * into r from public.attendance_records where id=p_record for update;
 if not found then raise exception 'Attendance record not found';end if;
 if r.checked_in_at is distinct from p_expected_in or r.checked_out_at is distinct from p_expected_out then raise exception 'Attendance changed. Refresh before correcting it.';end if;
 if r.checked_in_at=p_in and r.checked_out_at is not distinct from p_out then return r.id;end if;
 if p_out is null and r.checked_out_at is not null then raise exception 'Use workshop check-in to reopen attendance; a correction must retain a departure time';end if;
 if exists(select 1 from public.attendance_records a where a.member_id=r.member_id and a.id<>r.id and tstzrange(a.checked_in_at,coalesce(a.checked_out_at,now()),'[)') && tstzrange(p_in,coalesce(p_out,now()),'[)')) then raise exception 'These times overlap another attendance record. Review that record first.';end if;
 update public.attendance_records set checked_in_at=p_in,checked_out_at=p_out,
 check_in_method=case when checked_in_at is distinct from p_in then 'admin' else check_in_method end,
 check_out_method=case when p_out is not null then 'admin' else check_out_method end,
 corrected_by=auth.uid(),correction_reason=trim(p_reason),updated_at=now() where id=r.id returning * into after_record;
 insert into public.attendance_audit_log(attendance_id,actor_id,action,reason,previous_values,new_values)
 values(r.id,auth.uid(),'correct_times',trim(p_reason),to_jsonb(r),to_jsonb(after_record));
 return r.id;
end$$;
revoke all on function public.admin_correct_attendance_times(uuid,timestamptz,timestamptz,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.admin_correct_attendance_times(uuid,timestamptz,timestamptz,timestamptz,timestamptz,text) to authenticated;
commit;
