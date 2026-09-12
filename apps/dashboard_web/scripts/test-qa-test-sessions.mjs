import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import ts from '../node_modules/typescript/lib/typescript.js';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const admin='00000000-0000-0000-0000-000000000001', student='00000000-0000-0000-0000-000000000002', real='00000000-0000-0000-0000-000000000003';
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;
create function public.is_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
create table team_members(id uuid primary key,email text,display_name text,role text,active boolean);
insert into team_members values('${admin}','admin@example.com','Admin','admin',true),('${student}','qa.student.20260905@g3-test.invalid','QA Student','member',true),('${real}','real@example.com','QA Mentor','mentor',true);
create table project_tasks(id uuid primary key default gen_random_uuid(),title text);
grant usage on schema auth to authenticated;grant select on team_members to authenticated;grant all on project_tasks to authenticated;`);
const migration=fs.readFileSync(new URL('../../../backend/supabase/qa_test_sessions_20260912.sql',import.meta.url),'utf8');
await db.exec(migration); await db.exec(migration);
const rows=async q=>(await db.query(q)).rows;
assert.equal((await rows('select * from qa_test_accounts')).length,1,'Display name must not designate a real member');
await db.exec(`set role authenticated;set test.uid='${student}'`);
assert.equal((await rows('select * from available_qa_test_accounts()')).length,0);
await assert.rejects(db.exec(`update qa_test_accounts set enabled=false`));
await db.exec(`set test.uid='${admin}'`);
assert.equal((await rows('select * from available_qa_test_accounts()')).length,1);
await db.exec(`reset role;update team_members set active=false where id='${student}'`);
assert.equal((await rows('select * from available_qa_test_accounts()')).length,0);
await db.exec(`update team_members set active=true,role='admin' where id='${student}'`);
assert.equal((await rows('select * from available_qa_test_accounts()')).length,0);
await db.exec(`update team_members set role='member' where id='${student}';insert into qa_test_sessions(administrator_id,target_id,auth_session_id,expires_at,status) values('${admin}','${student}','00000000-0000-0000-0000-000000000010',now()+interval '1 hour','active');set role authenticated;set test.uid='${student}';set test.jwt='{"session_id":"00000000-0000-0000-0000-000000000010"}';insert into project_tasks(title)values('QA work');reset role;`);
assert.equal((await rows('select * from qa_test_changes')).length,1);
await db.exec(`set test.uid='${real}';insert into project_tasks(title)values('Other session');`);
assert.equal((await rows('select * from qa_test_changes')).length,1,'Actor and session must both match');
await db.close();

// Execute the actual Edge handler against bounded auth/database mocks.
let handler, mode='ok', issued=0, revoked=0;
const token = `a.${Buffer.from(JSON.stringify({session_id:'session-1',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.z`;
const member={id:student,email:'qa.student.20260905@g3-test.invalid',display_name:'QA Student',role:'member',active:true};
const service={auth:{getUser:async()=>({data:{user:{id:admin}}}),admin:{
 getUserById:async()=>({data:{user:{email:mode==='identity-mismatch'?'real@example.com':member.email}}}),
 generateLink:async()=>{issued++;return {data:{properties:{hashed_token:'otp'}}};},
 signOut:async()=>{revoked++;return {};}
}},from(table){let inserted=false;const chain={select(){return chain;},eq(){return chain;},insert(){inserted=true;return chain;},async single(){
 if(table==='team_members')return {data:inserted?null:chain.target?member:(mode==='nonadmin'?{role:'member',active:true}:{role:'admin',active:true})};
 if(table==='qa_test_accounts')return {data:mode==='disabled'?null:{email:member.email,expected_role:'member'}};
 if(table==='qa_test_sessions')return mode==='audit-fail'?{error:new Error('audit')}: {data:{id:'test-1'}};
},target:false};chain.eq=(key,value)=>{if(table==='team_members'&&value===student)chain.target=true;return chain;};return chain;}};
const verifier={auth:{verifyOtp:async()=>({data:{session:{access_token:token,refresh_token:'refresh'},user:{id:student}}})}};
const source=fs.readFileSync(new URL('../../../supabase/functions/qa-test-session/index.ts',import.meta.url),'utf8').replace(/^import .*\n/,'');
const js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None});
new Function('createClient','Deno',js)((url,key)=>key==='service'?service:verifier,{env:{get:key=>key==='SUPABASE_SERVICE_ROLE_KEY'?'service':'anon'},serve:fn=>{handler=fn;}});
for(const [scenario,status] of [['nonadmin',403],['disabled',403],['identity-mismatch',403],['audit-fail',400],['ok',200]]){
 mode=scenario;const response=await handler(new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer valid'},body:JSON.stringify({action:'start',targetId:student})}));
 assert.equal(response.status,status,scenario);
 const data=await response.json();if(status!==200)assert.equal(data.session,undefined);else assert.equal(data.test.targetId,student);
}
assert.equal(issued,2,'Rejected identities must never issue credentials');assert.equal(revoked,1,'Audit failure must revoke issued session');
console.log('QA allowlist, RLS, attribution, identity checks and fail-closed session issuance passed.');
