-- Run inside a transaction, after the migration. Roll back all fixtures.
do $$
#variable_conflict use_variable
declare leader_id uuid; member_id uuid; workshop_id uuid; event_id uuid; open_id uuid:=gen_random_uuid(); expired_id uuid:=gen_random_uuid(); n integer;
begin
 select id into leader_id from team_members where active and role='team_leader' limit 1;
 select id into member_id from team_members where active and role='member' limit 1;
 if leader_id is null or member_id is null then raise exception 'Missing test roles';end if;
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 begin perform save_official_workshop(null,'Rollback QA','2080-01-06 12:00+02','2080-01-06 15:00+02','2080-01-06 23:00+02','Workshop','','all',null,true);raise exception 'FAIL member can schedule';exception when others then if sqlerrm='FAIL member can schedule' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',leader_id::text,true);
 workshop_id:=save_official_workshop(null,'Rollback QA','2080-01-06 12:00+02','2080-01-06 15:00+02','2080-01-06 23:00+02','Workshop','Fixture instructions','all',null,true);
 select calendar_event_id into event_id from team_meetings where id=workshop_id;
 if not exists(select 1 from team_calendar_events where id=event_id and mandatory and title='Rollback QA') then raise exception 'FAIL linked calendar';end if;
 perform save_official_workshop(workshop_id,'Rollback QA edited','2080-01-07 12:00+02','2080-01-07 15:00+02','2080-01-07 23:00+02','Workshop','Updated','all',null,true);
 if (select calendar_event_id from team_meetings where id=workshop_id)<>event_id or (select title from team_calendar_events where id=event_id)<>'Rollback QA edited' then raise exception 'FAIL edit identity';end if;
 perform save_official_workshop(workshop_id,'',null,null,null,'','','all',null,true,true);
 if not (select cancelled from team_calendar_events where id=event_id) or (select status from team_meetings where id=workshop_id)<>'cancelled' then raise exception 'FAIL cancel synchronization';end if;
 insert into team_meetings(id,meeting_date,title,starts_at,ends_at,attendance_closes_at,status,created_by) values(open_id,current_date,'Rollback still open',now()-interval '3 hours',now()-interval '1 hour',now()+interval '1 hour','open',leader_id),(expired_id,current_date,'Rollback expired',now()-interval '3 hours',now()-interval '2 hours',now()-interval '1 hour','open',leader_id);
 insert into attendance_records(meeting_id,member_id,checked_in_at,check_in_method) values(open_id,member_id,now()-interval '2 hours','admin'),(expired_id,member_id,now()-interval '2 hours','admin');
 perform close_stale_workshop_sessions();
 if (select status from team_meetings where id=open_id)<>'open' or exists(select 1 from attendance_records where meeting_id=open_id and checked_out_at is not null) then raise exception 'FAIL scheduled end closed attendance';end if;
 if (select status from team_meetings where id=expired_id)<>'closed' or not exists(select 1 from attendance_records where meeting_id=expired_id and checked_out_at=now()-interval '1 hour' and check_out_method='automatic') then raise exception 'FAIL cutoff closure';end if;
 perform manage_workshop_session(open_id,'extend');
 if (select ends_at from team_meetings where id=open_id)<>now()-interval '1 hour' then raise exception 'FAIL extension changed scheduled hours';end if;
end $$;
select 'Workshop planning role, linkage, reschedule, cancel, cutoff and extension checks passed' as result;
