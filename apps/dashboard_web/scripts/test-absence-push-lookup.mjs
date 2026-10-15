import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {PGlite}=await import(process.argv[2]||'@electric-sql/pglite');
const db=new PGlite();
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
try {
 await db.exec(`create role authenticated;create role anon;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table team_members(id uuid primary key,role text,active boolean);
 create table absence_requests(id uuid primary key,member_id uuid);
 create table team_actions(id uuid primary key,source_id uuid,source_table text,cancelled boolean,target_value text);
 insert into team_members values('${id(1)}','member',true),('${id(2)}','member',true),('${id(3)}','mentor',true),('${id(4)}','admin',true),('${id(5)}','mentor',false);
 insert into absence_requests values('${id(10)}','${id(1)}');
 insert into team_actions values('${id(20)}','${id(10)}','absence_review_${id(3)}',false,'${id(3)}'),('${id(21)}','${id(10)}','other',false,'${id(3)}'),('${id(22)}','${id(10)}','absence_review_cancelled',true,'${id(3)}'),('${id(23)}','${id(10)}','absenceXreviewXother',false,'${id(3)}');
 alter table team_actions enable row level security;
 create policy target_only on team_actions for select to authenticated using(target_value=auth.uid()::text);
 grant usage on schema public,auth to authenticated;
 grant select on team_actions to authenticated;`);
 await db.exec(await fs.readFile(new URL('../../../backend/supabase/absence_push_lookup_20261015.sql',import.meta.url),'utf8'));
 await db.exec(`set role authenticated;set test.uid='${id(1)}'`);
 assert.equal((await db.query('select id from team_actions')).rows.length,0,'student cannot read reviewer actions');
 const lookup=()=>db.query(`select * from absence_notification_action_ids('${id(10)}')`);
 assert.deepEqual((await lookup()).rows,[{action_id:id(20)}],'owner gets only eligible delivery identifiers');
 for(const n of [2,5]) {await db.exec(`set test.uid='${id(n)}'`);assert.equal((await lookup()).rows.length,0);}
 for(const n of [3,4]) {await db.exec(`set test.uid='${id(n)}'`);assert.equal((await lookup()).rows.length,1);}
 await db.exec('reset role');
 await db.exec(`update team_actions set cancelled=true where id='${id(20)}';insert into team_actions values('${id(24)}','${id(10)}','absence_request_status',false,'${id(1)}');set role authenticated;set test.uid='${id(3)}'`);
 assert.deepEqual((await lookup()).rows,[{action_id:id(24)}],'decision targets member, not old reviewers');
 await db.exec('reset role;set role anon');await assert.rejects(lookup(),/permission denied/);
 console.log('PASS absence push lookup: reproduced RLS failure; owner/reviewer lookup, unrelated/inactive/anonymous denial, cancellation and decision scope');
} finally {await db.close();}
