begin;

-- A dismissed/read announcement is the same personal fact on Home and Updates.
create or replace function public.sync_announcement_receipt_from_action() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status in ('acknowledged','completed') then
  insert into public.announcement_reads(announcement_id,member_id)
  select a.source_id,new.member_id from public.team_actions a
  join public.announcements n on n.id=a.source_id
  where a.id=new.action_id and a.source_table='announcements'
  on conflict(announcement_id,member_id) do nothing;
 end if;
 return new;
end$$;
create or replace function public.sync_announcement_action_from_receipt() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.team_action_states(action_id,member_id,status,acknowledged_at,updated_at)
 select a.id,new.member_id,'acknowledged',new.read_at,now() from public.team_actions a
 where a.source_table='announcements' and a.source_id=new.announcement_id
 on conflict(action_id,member_id) do update set status='acknowledged',acknowledged_at=excluded.acknowledged_at,updated_at=now()
 where team_action_states.status not in ('completed','acknowledged','snoozed');
 return new;
end$$;
create or replace trigger sync_announcement_receipt_after_action after insert or update of status on public.team_action_states
 for each row execute function public.sync_announcement_receipt_from_action();
create or replace trigger sync_announcement_action_after_receipt after insert on public.announcement_reads
 for each row execute function public.sync_announcement_action_from_receipt();
insert into public.announcement_reads(announcement_id,member_id)
 select a.source_id,s.member_id from public.team_action_states s join public.team_actions a on a.id=s.action_id
 join public.announcements n on n.id=a.source_id
 where a.source_table='announcements' and s.status in ('acknowledged','completed')
 on conflict(announcement_id,member_id) do nothing;

-- Serialize late self check-ins against an admin closing the meeting.
create or replace function public.guard_workshop_checkin_after_close() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare session_status text;
begin
 if new.checked_out_at is null and new.check_in_method<>'admin' then
  select status into session_status from public.team_meetings where id=new.meeting_id for update;
  if session_status is distinct from 'open' then raise exception 'Workshop is closed. Ask an administrator to correct attendance.';end if;
 end if;
 return new;
end$$;
create or replace trigger guard_workshop_checkin_after_close before insert on public.attendance_records
 for each row execute function public.guard_workshop_checkin_after_close();

create or replace function public.admin_close_workshop(p_meeting uuid,p_checkout_at timestamptz,p_reason text) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.team_meetings; r public.attendance_records; updated public.attendance_records; affected integer:=0;
begin
 if coalesce(public.current_team_role(),'')<>'admin' then raise exception 'Active administrator required' using errcode='42501';end if;
 if p_checkout_at is null or p_checkout_at>now() then raise exception 'Choose an actual departure time, not a future time';end if;
 if length(trim(coalesce(p_reason,''))) not between 4 and 1000 then raise exception 'A correction reason of 4–1000 characters is required';end if;
 select * into m from public.team_meetings where id=p_meeting for update;
 if not found or m.status not in ('open','closed') then raise exception 'Choose an open or ended workshop';end if;
 for r in select * from public.attendance_records where meeting_id=m.id and checked_out_at is null order by id for update loop
  if p_checkout_at<r.checked_in_at then raise exception 'Departure time is before a remaining attendee checked in. Adjust the time or correct that attendee separately.';end if;
  update public.attendance_records set checked_out_at=p_checkout_at,check_out_method='admin',corrected_by=auth.uid(),correction_reason=trim(p_reason),updated_at=now()
   where id=r.id returning * into updated;
  insert into public.attendance_audit_log(attendance_id,actor_id,action,reason,previous_values,new_values)
   values(r.id,auth.uid(),'check_out',trim(p_reason),to_jsonb(r),to_jsonb(updated));
  affected:=affected+1;
 end loop;
 if m.status='open' then update public.team_meetings set status='closed' where id=m.id;end if;
 return affected;
end$$;
revoke all on function public.admin_close_workshop(uuid,timestamptz,text) from public,anon;
grant execute on function public.admin_close_workshop(uuid,timestamptz,text) to authenticated;

-- Preserve existing assignment, Assist provenance and duplicate-request checks.
create or replace function public.create_described_project_task(p_project uuid,p_title text,p_owner uuid,p_due timestamptz,p_members uuid[],p_description text,
 p_message uuid default null,p_request uuid default null,p_summary text default null,p_criterion text default null) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid; prior uuid;
begin
 if length(coalesce(p_description,''))>10000 then raise exception 'Task explanation must be at most 10,000 characters';end if;
 if p_request is not null then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));
  select task_id into prior from public.project_task_assist_context where created_by=auth.uid() and request_id=p_request;
 end if;
 if p_message is null then result:=public.create_task_with_collaborators(p_project,p_title,p_owner,p_due,p_members);
 elsif p_summary is not null then result:=public.create_reviewed_software_task(p_message,p_request,p_project,p_title,p_owner,p_due,p_members,p_summary,p_criterion);
 else result:=public.create_task_from_assist(p_message,p_request,p_project,p_title,p_owner,p_due,p_members);end if;
 if prior is not null then
  if (select coalesce(description,'') from public.project_tasks where id=result)<>coalesce(p_description,'') then raise exception 'Request already saved with a different explanation. Open the existing task to edit it.';end if;
 else update public.project_tasks set description=nullif(p_description,'') where id=result;end if;
 return result;
end$$;
revoke all on function public.create_described_project_task(uuid,text,uuid,timestamptz,uuid[],text,uuid,uuid,text,text) from public,anon;
grant execute on function public.create_described_project_task(uuid,text,uuid,timestamptz,uuid[],text,uuid,uuid,text,text) to authenticated;

create or replace function public.set_project_task_description(p_task uuid,p_description text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare team text;
begin
 select p.subteam into team from public.project_tasks t join public.team_projects p on p.id=t.project_id
 where t.id=p_task and not coalesce(t.archived,false) and p.status not in ('archived','completed') for update of t;
 if not found or public.current_team_role() is null or not coalesce(public.has_permission('assign_team_work',team),false) then raise exception 'Task assignment permission required' using errcode='42501';end if;
 if length(coalesce(p_description,''))>10000 then raise exception 'Task explanation must be at most 10,000 characters';end if;
 update public.project_tasks set description=nullif(p_description,''),updated_at=now() where id=p_task;
end$$;
revoke all on function public.set_project_task_description(uuid,text) from public,anon;
grant execute on function public.set_project_task_description(uuid,text) to authenticated;
revoke all on function public.sync_announcement_receipt_from_action(),public.sync_announcement_action_from_receipt(),public.guard_workshop_checkin_after_close() from public,anon,authenticated;
commit;
