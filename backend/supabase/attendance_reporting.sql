create or replace function public.admin_correct_attendance(
  target_meeting uuid,
  target_member uuid,
  correction_action text,
  correction_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare record_id uuid; old_values jsonb; new_values jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(correction_note,''))) < 4 then raise exception 'A correction reason is required'; end if;
  select id, to_jsonb(a) into record_id, old_values from public.attendance_records a
  where meeting_id = target_meeting and member_id = target_member;
  if correction_action = 'check_in' then
    if record_id is null then
      insert into public.attendance_records (meeting_id, member_id, check_in_method, corrected_by, correction_reason)
      values (target_meeting, target_member, 'admin', auth.uid(), correction_note) returning id into record_id;
    else
      update public.attendance_records set checked_out_at = null, check_out_method = null, corrected_by = auth.uid(), correction_reason = correction_note, updated_at = now() where id = record_id;
    end if;
  elsif correction_action = 'check_out' then
    if record_id is null then raise exception 'Member is not checked in'; end if;
    update public.attendance_records set checked_out_at = now(), check_out_method = 'admin', corrected_by = auth.uid(), correction_reason = correction_note, updated_at = now() where id = record_id;
  else raise exception 'Invalid correction action';
  end if;
  select to_jsonb(a) into new_values from public.attendance_records a where id = record_id;
  insert into public.attendance_audit_log (attendance_id, actor_id, action, reason, previous_values, new_values)
  values (record_id, auth.uid(), correction_action, correction_note, old_values, new_values);
  return record_id;
end;
$$;
grant execute on function public.admin_correct_attendance(uuid,uuid,text,text) to authenticated;

