import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {PGlite}=await import(process.argv[2]||process.env.PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000001',student='00000000-0000-0000-0000-000000000002',id='00000000-0000-0000-0000-000000000003';
try{
await db.exec(`create role authenticated;create role anon;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create table team_members(id uuid primary key,active boolean,role text);create function is_admin() returns boolean language sql as $$select exists(select 1 from team_members where id=auth.uid() and role='admin')$$;
create table attendance_records(id uuid primary key,member_id uuid,checked_in_at timestamptz,checked_out_at timestamptz,check_in_method text,check_out_method text,corrected_by uuid,correction_reason text,updated_at timestamptz);
create table attendance_audit_log(attendance_id uuid,actor_id uuid,action text,reason text,previous_values jsonb,new_values jsonb);
insert into team_members values('${admin}',true,'admin'),('${student}',true,'member');
insert into attendance_records(id,member_id,checked_in_at,checked_out_at,check_in_method,check_out_method) values('${id}','${student}','2026-09-01T13:00Z','2026-09-01T20:00Z','location','automatic');
grant usage on schema public,auth to authenticated;set test.uid='${admin}';`);
await db.exec(await fs.readFile(new URL('../../../backend/supabase/attendance_time_corrections_20261015.sql',import.meta.url),'utf8'));
const sql=`select admin_correct_attendance_times('${id}','2026-09-01T13:00Z','2026-09-01T20:00Z','2026-09-01T13:00Z','2026-09-01T16:30Z','Student confirmed actual departure')`;
await db.exec(`set role authenticated;set test.uid='${student}'`);await assert.rejects(db.exec(sql),/administrator/);
await db.exec(`set test.uid='${admin}'`);await assert.rejects(db.exec(sql.replace('16:30','12:30')),/valid/);
await db.exec(sql);await assert.rejects(db.exec(sql),/changed/);await db.exec('reset role');
const r=(await db.query('select * from attendance_records')).rows[0];assert.equal(r.check_out_method,'admin');assert.equal(r.check_in_method,'location');
assert.equal((await db.query('select extract(epoch from checked_out_at-checked_in_at)/3600 hours from attendance_records')).rows[0].hours,'3.5000000000000000');
assert.equal((await db.query('select * from attendance_audit_log')).rows.length,1);
await db.exec(`insert into attendance_records(id,member_id,checked_in_at,checked_out_at)values('00000000-0000-0000-0000-000000000004','${student}','2026-09-01T17:00Z','2026-09-01T18:00Z'),('00000000-0000-0000-0000-000000000005','${admin}','2026-09-01T13:00Z',null);set role authenticated;`);
const corrected=`select admin_correct_attendance_times('${id}','2026-09-01T13:00Z','2026-09-01T16:30Z','2026-09-01T13:00Z',`;
await assert.rejects(db.exec(corrected+`'2026-09-01T17:30Z','Overlap must fail')`),/overlap/);
await assert.rejects(db.exec(corrected+`null,'Cannot reopen history')`),/reopen/);
await assert.rejects(db.exec(corrected+`now()+interval '1 day','Future must fail')`),/future/);
await db.exec(`select admin_correct_attendance_times('00000000-0000-0000-0000-000000000005','2026-09-01T13:00Z',null,'2026-09-01T13:00Z','2026-09-01T16:00Z','Actual remote checkout');reset role;`);
assert.equal((await db.query('select checked_out_at from attendance_records where id=$1',[id])).rows[0].checked_out_at.toISOString(),'2026-09-01T16:30:00.000Z','another person checkout does not alter historical correction');
console.log('PASS individual historical attendance: actual departure, audit, hours, stale correction and role denial');
}finally{await db.close();}
