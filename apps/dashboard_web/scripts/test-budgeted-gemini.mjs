import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import {PGlite} from '../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js';
const source=fs.readFileSync(new URL('../../../backend/supabase/functions/frc-assistant/budgeted-gemini.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {executeBudgetedText,costMicros,PRICE}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const db=new PGlite(), member=randomUUID();
await db.exec(`create role anon;create role authenticated;create role service_role;
create table team_members(id uuid primary key,role text,active boolean);
create table role_permissions(role text,permission_key text,allowed boolean);
create function is_admin()returns boolean language sql as $$select false$$;
insert into team_members values('${member}','mentor',true);
insert into role_permissions values('mentor','use_g3_assist',true);`);
await db.exec(fs.readFileSync(new URL('../../../backend/supabase/g3_assist_budget_20260920.sql',import.meta.url),'utf8'));
const rpc=async(name,args)=>{
  assert.ok(['reserve_g3_assist_budget','dispatch_g3_assist_budget','stop_g3_assist_budget','settle_g3_assist_budget'].includes(name));
  try {
    const values=Object.values(args), placeholders=values.map((_,i)=>`$${i+1}`).join(',');
    const data=(await db.query(`select to_jsonb(${name}(${placeholders})) result`,values)).rows[0].result;
    return {data,error:null};
  } catch(error) {return {data:null,error};}
};
let calls=[], scenario='ok', beforeDispatch;
const send=async(url,init)=>{
  calls.push(url);const body=JSON.parse(init.body);
  assert.equal(init.headers['x-goog-api-key'],'not-a-real-key');
  if(url.endsWith(':countTokens')) {
    assert.equal(body.generateContentRequest.model,'models/gemini-3.6-flash');
    if(beforeDispatch) await beforeDispatch();
    return new Response(JSON.stringify({totalTokens:scenario==='oversize'?17000:100}));
  }
  assert.ok(url.endsWith(':generateContent'));
  assert.equal(body.generationConfig.maxOutputTokens,8192);
  assert.equal(body.tools,undefined);assert.equal(body.cachedContent,undefined);
  if(scenario==='timeout') throw new Error('Synthetic ambiguous timeout');
  if(scenario==='quota') return new Response('{}',{status:429});
  const payload={responseId:'test-response',usageMetadata:{promptTokenCount:100,candidatesTokenCount:100,thoughtsTokenCount:50,totalTokenCount:250},
    candidates:[{finishReason:scenario==='incomplete'?'MAX_TOKENS':'STOP',content:{parts:[{text:'Hidden thought',thought:true},{text:'Test the elevator encoder direction.'}]}}]};
  if(scenario==='missing') delete payload.usageMetadata.thoughtsTokenCount;
  return new Response(JSON.stringify(payload));
};
const run=(overrides={},now=()=>PRICE.validFrom+1000)=>executeBudgetedText({rpc,memberId:member,requestId:randomUUID(),apiKey:'not-a-real-key',prompt:'Our elevator oscillates.',systemInstruction:'FRC team engineering.',...overrides},{fetch:send,now});
const latest=async()=>(await db.query('select * from g3_assist_budget_attempts order by created_at desc limit 1')).rows[0];
assert.equal(costMicros(1,1),5);
await assert.rejects(run(),/BUDGET_SERVICE_UNAVAILABLE/);assert.equal(calls.length,0);
await db.exec('update g3_assist_budget_policy set enabled=true');
await assert.rejects(run({},()=>PRICE.validUntil),/PRICE_REVIEW_REQUIRED/);assert.equal(calls.length,0);
await assert.rejects(run({requestId:'invalid'}),/REQUEST_ID_REQUIRED/);assert.equal(calls.length,0);
const requestId=randomUUID();
const answer=await run({requestId});
assert.equal(answer.answer,'Test the elevator encoder direction.');
assert.equal(answer.actualMicrousd,638); // Thinking billed; rounded upward.
assert.equal((await latest()).state,'settled');
assert.equal(calls.length,2);
await assert.rejects(run({requestId}),/REQUEST_ALREADY_PROCESSED/);assert.equal(calls.length,2);
await assert.rejects(run({requestId,prompt:'Changed input'}),/IDEMPOTENCY_CONFLICT/);assert.equal(calls.length,2);
for(const kind of ['missing','timeout','quota']) {
  scenario=kind;const previous=calls.length;
  await assert.rejects(run());
  assert.equal((await latest()).state,'uncertain');
  assert.equal(calls.length-previous,2); // No retry or fallback.
}
scenario='incomplete';await assert.rejects(run(),/ANSWER_INCOMPLETE/);
assert.equal((await latest()).state,'settled'); // Cost survives unusable answer.
scenario='ok';
beforeDispatch=()=>db.exec("update role_permissions set allowed=false where role='mentor'");
const before=calls.length;await assert.rejects(run(),/DISPATCH_NOT_AUTHORIZED/);
assert.equal(calls.length-before,1);assert.equal((await latest()).state,'released');
beforeDispatch=null;await db.exec("update role_permissions set allowed=true where role='mentor'");
const abort=new AbortController();abort.abort();const abortBefore=calls.length;
await assert.rejects(run({signal:abort.signal}),/CANCELLED/);assert.equal(calls.length,abortBefore);
scenario='oversize';await assert.rejects(run(),/CONTEXT_TOO_LARGE/);
assert.equal((await latest()).state,'reserved'); // No worker can refund another's claim.
await db.exec("update g3_assist_budget_attempts set dispatch_by=clock_timestamp()-interval '1 second' where state='reserved'");
scenario='ok';await run();
assert.equal((await db.query("select count(*)::int n from g3_assist_budget_attempts where state='reserved'")).rows[0].n,0);
const duplicateId=randomUUID();const generationBefore=calls.filter(x=>x.endsWith(':generateContent')).length;
const duplicates=await Promise.allSettled([run({requestId:duplicateId}),run({requestId:duplicateId})]);
assert.equal(duplicates.filter(x=>x.status==='fulfilled').length,1);
assert.equal(calls.filter(x=>x.endsWith(':generateContent')).length-generationBefore,1);
assert.equal((await latest()).state,'settled');
await db.exec('update g3_assist_budget_policy set monthly_limit_microusd=0');
const exhaustedBefore=calls.length;await assert.rejects(run(),/TEAM_MONTHLY_BUDGET_EXHAUSTED/);
assert.equal(calls.length,exhaustedBefore);
await db.close();
console.log('PASS: actual ledger + text provider adapter; disabled/stale/exhausted configuration sends no requests; thought billing, duplicates, altered requests, uncertain charges, quota without retries, incomplete-answer settlement, revocation, cancellation and safe reservation expiry. All network responses synthetic.');
