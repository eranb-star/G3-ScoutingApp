-- Requires member_workflow_fixes_20261011.sql. All fixture changes roll back.
begin;
do $$
#variable_conflict use_variable
declare admin_id uuid;member_id uuid;leader_id uuid;meeting_id uuid:=gen_random_uuid();project_id uuid:=gen_random_uuid();task_id uuid;announcement_id uuid:=gen_random_uuid();action_id uuid; n integer;
begin
 select id into admin_id from team_members where active and role='admin' limit 1;
 select id into member_id from team_members where active and role='member' limit 1;
 select id into leader_id from team_members where active and role='team_leader' limit 1;
 if admin_id is null or member_id is null or leader_id is null then raise exception 'Required QA role unavailable';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 insert into team_meetings(id,meeting_date,title,starts_at,ends_at,status,created_by) values(meeting_id,current_date,'ROLLBACK QA workshop',now()-interval '3 hours',now()-interval '1 hour','open',admin_id);
 insert into attendance_records(meeting_id,member_id,checked_in_at,check_in_method) values(meeting_id,member_id,now()-interval '2 hours','admin');
 insert into attendance_records(meeting_id,member_id,checked_in_at,checked_out_at,check_in_method,check_out_method) values(meeting_id,leader_id,now()-interval '2 hours',now()-interval '90 minutes','admin','admin');
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 begin perform admin_close_workshop(meeting_id,now()-interval '1 hour','QA reason');raise exception 'FAIL member allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 begin perform admin_close_workshop(meeting_id,now()+interval '1 hour','QA reason');raise exception 'FAIL future allowed';exception when others then if sqlerrm='FAIL future allowed' then raise;end if;end;
 begin perform admin_close_workshop(meeting_id,now()-interval '4 hours','QA reason');raise exception 'FAIL early allowed';exception when others then if sqlerrm='FAIL early allowed' then raise;end if;end;
 if (select status from team_meetings where id=meeting_id)<>'open' then raise exception 'FAIL failed close changed status';end if;
 n:=admin_close_workshop(meeting_id,now()-interval '1 hour','QA forgotten checkout');
 if n<>1 or (select status from team_meetings where id=meeting_id)<>'closed' then raise exception 'FAIL close count/status';end if;
 if (select checked_out_at from attendance_records a where a.meeting_id=meeting_id and a.member_id=leader_id limit 1) is distinct from now()-interval '90 minutes' then raise exception 'FAIL existing checkout';end if;
 if (select count(*) from attendance_audit_log l join attendance_records a on a.id=l.attendance_id where a.meeting_id=meeting_id and l.action='check_out')<>1 then raise exception 'FAIL audit count';end if;
 begin insert into attendance_records(meeting_id,member_id,check_in_method) values(meeting_id,admin_id,'location');raise exception 'FAIL late checkin';exception when others then if sqlerrm='FAIL late checkin' then raise;end if;end;
 if admin_close_workshop(meeting_id,now()-interval '1 hour','QA retry')<>0 then raise exception 'FAIL retry';end if;
 insert into team_projects(id,name,status,created_by,owner_id) values(project_id,'ROLLBACK QA task','active',admin_id,admin_id);
 task_id:=create_described_project_task(project_id,'QA explained task',member_id,null,'{}',E'Build bracket.\nCheck hole spacing.');
 if (select description from project_tasks where id=task_id)<>E'Build bracket.\nCheck hole spacing.' then raise exception 'FAIL description';end if;
 perform set_project_task_description(task_id,'Revised explanation');
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 begin perform set_project_task_description(task_id,'Unauthorized edit');raise exception 'FAIL member edit';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 insert into announcements(id,title,body,priority,audience,created_by) values(announcement_id,'ROLLBACK QA update','QA only','urgent','all',admin_id);
 select id into action_id from team_actions where source_table='announcements' and source_id=announcement_id;
 if action_id is null then raise exception 'FAIL missing generated action';end if;
 insert into team_action_states(action_id,member_id,status) values(action_id,member_id,'completed');
 if not exists(select 1 from announcement_reads r where r.announcement_id=announcement_id and r.member_id=member_id) then raise exception 'FAIL dismiss receipt';end if;
 insert into team_action_states(action_id,member_id,status,snoozed_until) values(action_id,admin_id,'snoozed',now()+interval '1 day');
 insert into announcement_reads(announcement_id,member_id) values(announcement_id,admin_id);
 if not exists(select 1 from team_action_states s where s.action_id=action_id and s.member_id=admin_id and s.status='snoozed') then raise exception 'FAIL defer lost';end if;
 insert into announcement_reads(announcement_id,member_id) values(announcement_id,leader_id);
 if not exists(select 1 from team_action_states s where s.action_id=action_id and s.member_id=leader_id and status='acknowledged') then raise exception 'FAIL reverse read';end if;
end$$;
select 'PASS: admin close-out, time validation, retry, task explanations, role restrictions and announcement synchronization. All fixtures rolled back.' as result;
rollback;

