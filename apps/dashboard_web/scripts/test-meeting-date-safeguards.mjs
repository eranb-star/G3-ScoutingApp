import assert from 'node:assert/strict';import fs from 'node:fs';import{createRequire}from'node:module';const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const out=await build({entryPoints:['src/lib/meetingDates.ts'],bundle:true,platform:'node',format:'esm',write:false});const lib=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
for(const tz of ['Asia/Jerusalem','America/Los_Angeles','UTC']){process.env.TZ=tz;assert.equal(lib.israelTimeToUtc('2026-11-14T14:00'),'2026-11-14T12:00:00.000Z');}
for(const date of ['','2026-03-27T02:30','2026-10-25T01:30'])assert.throws(()=>lib.israelTimeToUtc(date));
assert.equal(lib.titleDateMismatch('המשך עבודה - שבת 14/11','2026-11-10T14:00'),true);assert.equal(lib.titleDateMismatch('המשך עבודה - שבת 14/11','2026-11-14T14:00'),false);assert.equal(lib.titleDateMismatch('Workshop Saturday','2026-11-10T14:00'),true);assert.match(lib.meetingDateLabel('2026-11-14T14:00'),/Saturday/);
const planner=fs.readFileSync('src/components/WorkshopPlanner.tsx','utf8');assert.match(planner,/start:'',end:'',cutoff:''/);assert.doesNotMatch(planner,/Date.now\(\)\+86400000/);assert.match(planner,/function reset\(\)\{setId\(null\)/);
const{PGlite}=await import(process.argv[2]);const db=new PGlite();try{
await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid()returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
create table team_calendar_events(id uuid primary key default gen_random_uuid(),title text,starts_at timestamptz,ends_at timestamptz);
create table team_meetings(id uuid primary key default gen_random_uuid(),starts_at timestamptz,ends_at timestamptz,attendance_closes_at timestamptz,calendar_event_id uuid references team_calendar_events);
create table attendance_records(id uuid primary key default gen_random_uuid(),meeting_id uuid references team_meetings);
create table absence_requests(id uuid primary key default gen_random_uuid(),calendar_event_id uuid references team_calendar_events,status text);
create table audit_log(actor_id uuid,action text,entity_type text,entity_id text,details jsonb,created_at timestamptz default now());`);
const sql=fs.readFileSync('../../backend/supabase/meeting_date_safeguards_20261114.sql','utf8');await db.exec(sql);await db.exec(sql);
const e=(await db.query(`insert into team_calendar_events(title,starts_at,ends_at)values('Saturday','2026-11-14T12:00Z','2026-11-14T16:00Z')returning id`)).rows[0].id;
const m=(await db.query(`insert into team_meetings(starts_at,ends_at,attendance_closes_at,calendar_event_id)values('2026-11-14T12:00Z','2026-11-14T16:00Z','2026-11-14T21:00Z','${e}')returning id`)).rows[0].id;
await db.exec(`insert into absence_requests(calendar_event_id,status)values('${e}','approved')`);const before=(await db.query('select * from absence_requests')).rows;
await db.exec(`update team_calendar_events set starts_at=starts_at+interval '1 hour' where id='${e}'`);assert.deepEqual((await db.query('select * from absence_requests')).rows,before);assert.equal((await db.query('select * from audit_log')).rows.length,3);
await db.exec(`update team_calendar_events set starts_at=starts_at where id='${e}'`);assert.equal((await db.query('select * from audit_log')).rows.length,3);
await db.exec(`insert into attendance_records(meeting_id)values('${m}')`);const attendance=(await db.query('select * from attendance_records')).rows;
await assert.rejects(db.exec(`update team_calendar_events set starts_at=starts_at+interval '1 hour' where id='${e}'`),/Attendance already exists/);
await assert.rejects(db.exec(`update team_meetings set starts_at=starts_at+interval '1 hour' where id='${m}'`),/Attendance already exists/);
await db.exec(`update team_meetings set attendance_closes_at=attendance_closes_at+interval '1 hour' where id='${m}'`);assert.deepEqual((await db.query('select * from attendance_records')).rows,attendance);assert.deepEqual((await db.query('select * from absence_requests')).rows,before);
console.log('PASS timezone/DST/title/date reset; audit/idempotence; absence identity/status; attendance move protection; cutoff extension');}finally{await db.close();}
