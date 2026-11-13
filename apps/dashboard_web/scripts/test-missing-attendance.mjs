import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE||'../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite(),id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select current_setting('test.uid')::uuid$$;
 create table team_members(id uuid primary key,role text,active boolean);
 create function is_admin() returns boolean language sql as $$select role='admin' from team_members where id=auth.uid()$$;
 create function has_permission(text) returns boolean language sql as $$select false$$;
 create table qa_test_accounts(member_id uuid);
 create table team_meetings(id uuid primary key,starts_at timestamptz,ends_at timestamptz,attendance_closes_at timestamptz,status text);
 create table attendance_records(id uuid primary key default gen_random_uuid(),meeting_id uuid,member_id uuid,checked_in_at timestamptz,checked_out_at timestamptz,check_in_method text,check_out_method text,corrected_by uuid,correction_reason text,unique(meeting_id,member_id));
 create table attendance_audit_log(attendance_id uuid,actor_id uuid,action text,reason text,previous_values jsonb,new_values jsonb);
 insert into team_members values('${id(1)}','admin',true),('${id(2)}','member',true),('${id(3)}','team_leader',true),('${id(4)}','mentor',true),('${id(5)}','member',true);
 insert into qa_test_accounts values('${id(5)}');
 insert into team_meetings values('${id(10)}','2025-01-20T14:00Z','2025-01-20T17:00Z','2025-01-20T21:00Z','closed'),('${id(11)}','2025-01-20T14:00Z','2025-01-20T17:00Z','2025-01-20T21:00Z','closed'),('${id(12)}',now(),now()+interval '2 hours',now()+interval '3 hours','open');
 set test.uid='${id(1)}';grant usage on schema public,auth to authenticated;`);
 await db.exec(await fs.readFile(new URL('../../../backend/supabase/attendance_missing_entry_20261113.sql',import.meta.url),'utf8'));
 const add=(meeting=10,member=2,start='2025-01-20T14:10Z',end='2025-01-20T16:40Z',reason='Confirmed by mentor')=>db.query('select admin_add_missing_attendance($1,$2,$3,$4,$5) id',[id(meeting),id(member),start,end,reason]);
 await db.exec(`set role authenticated;set test.uid='${id(2)}'`);await assert.rejects(add(),/permission/);
 await db.exec(`set test.uid='${id(1)}'`);
 await assert.rejects(add(10,2,undefined,undefined,'x'),/reason/);
 await assert.rejects(add(10,2,'2025-01-21T14:10Z','2025-01-21T16:40Z'),/selected meeting date/);
 await assert.rejects(add(10,2,'2099-01-20T14:10Z'),/not future/);
 await assert.rejects(add(10,2,'2025-01-20T14:10Z','2025-01-20T13:10Z'),/valid actual/);
 await assert.rejects(add(10,2,undefined,null),/departure time/);
 await assert.rejects(add(10,4),/student/);await assert.rejects(add(10,5),/QA/);
 await add();await assert.rejects(add(),/already exists/);await assert.rejects(add(11),/overlap/);
 await db.exec('reset role');const row=(await db.query('select * from attendance_records')).rows[0];assert.equal(row.check_in_method,'admin');assert.equal(row.check_out_method,'admin');assert.equal(row.corrected_by,id(1));
 const audit=(await db.query('select * from attendance_audit_log')).rows;assert.equal(audit.length,1);assert.equal(audit[0].action,'add_missing_attendance');assert.equal(audit[0].previous_values,null);
 // Current session can stay open; historical entry never silently guesses departure.
 const current=(await db.query('select starts_at::text t from team_meetings where id=$1',[id(12)])).rows[0].t;
 await db.exec('set role authenticated');await add(12,3,current,null);
 await db.exec(`reset role;update team_members set active=false where id='${id(1)}';set role authenticated`);await assert.rejects(add(11,3),/permission/);
 console.log('PASS missing attendance: permissions, actual times, meeting date, closed/open sessions, student/QA boundaries, duplicate/overlap rejection and audit; existing records preserved');
}finally{await db.close();}
