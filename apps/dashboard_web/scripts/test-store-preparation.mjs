import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createReviewStore} from './review-fixtures.mjs';
const app=path.resolve(import.meta.dirname,'..');
const a=createReviewStore(),b=createReviewStore();
const before=await a.supabase.from('attendance_records').select('*');assert.equal(before.data.length,0);
assert.ok((await a.supabase.from('private_unknown_table').select('*')).error);
assert.ok((await a.supabase.functions.invoke('onshape-connector',{body:{}})).error);
assert.ok((await a.supabase.rpc('delete_member')).error);
const call=(action,latitude=0)=>a.supabase.functions.invoke('attendance',{body:{action,latitude,meetingId:'review-meeting'}});
assert.ok((await call('check_out')).error);
assert.ok((await call('check_in',1)).data.error);
const arrived=await call('check_in');assert.equal(arrived.error,null);
assert.ok((await call('check_out',1)).data.error);
const stillInside=await a.supabase.from('attendance_records').select('*').maybeSingle();assert.equal(stillInside.data.checked_out_at,null);
assert.equal((await call('check_out')).data.attendance.checked_in_at,arrived.data.attendance.checked_in_at);
assert.equal((await b.supabase.from('attendance_records').select('*')).data.length,0);
assert.ok((await a.supabase.from('team_projects').delete()).error);
assert.ok((await a.supabase.from('project_tasks').update({assignee_id:'real-user'})).error);
await a.supabase.from('project_tasks').update({status:'done'}).eq('id','review-task');
assert.equal((await a.supabase.from('project_tasks').select('*').maybeSingle()).data.status,'done');
const frame=fs.readFileSync(path.join(app,'public/store-review/frame.html'),'utf8');
const wrapper=fs.readFileSync(path.join(app,'public/store-review/index.html'),'utf8');
assert.ok(wrapper.includes('sandbox="allow-scripts"'));assert.ok(!wrapper.includes('allow-same-origin'));
assert.ok(frame.includes("connect-src 'none'"));
// Shared product code can contain provider URL constants; CSP denies their use.
// The build separately rejects inclusion of Supabase/native client implementations.
const config=JSON.parse(fs.readFileSync(path.join(app,'vercel.json'),'utf8'));
const policy=config.headers.find(h=>h.source==='/store-review/frame.html');
assert.ok(policy.headers.some(h=>h.value.includes('sandbox allow-scripts;')));
for(const name of ['privacy.html','data-requests.html']){
 const html=fs.readFileSync(path.join(app,'public',name),'utf8');
 assert.ok(html.includes('lang="he"'));assert.ok(html.includes('lang="en"'));
 assert.ok(html.includes('eran.bongart@gmail.com'));assert.ok(!html.includes('<script'));
 for(const match of html.matchAll(/href="(\/[^"#?]+)(?:#[^"]*)?"/g)){
  if(match[1]==='/login')continue;
  assert.ok(fs.existsSync(path.join(app,'public',match[1])),`Missing public link ${match[1]}`);
 }
}
console.log('PASS: isolated record transitions, no cross-session records, denied services/writes, public links, bilingual pages and sandbox/CSP configuration.');
