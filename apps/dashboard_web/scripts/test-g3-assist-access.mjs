import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { PGlite } from '../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
const migration = fs.readFileSync(new URL('../../../backend/supabase/g3_assist_permission_20260920.sql', import.meta.url), 'utf8');
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create table team_members(id uuid primary key,role text,active boolean);
create table app_permissions(permission_key text primary key,permission_group text,label text,label_he text,description text,protected boolean,sort_order int);
create table role_permissions(role text,permission_key text,allowed boolean,primary key(role,permission_key));
create function current_member_leads_team(text)returns boolean language sql as $$select false$$;
create function is_admin()returns boolean language sql security definer as $$select exists(select 1 from team_members where id=auth.uid() and role='admin' and active)$$;`);
const rolesSql = fs.readFileSync(new URL('../../../backend/supabase/roles_permissions_multi_team_20260904.sql', import.meta.url), 'utf8');
await db.exec(rolesSql.match(/create or replace function public.has_permission[\s\S]*?\$\$;/)[0]);
await db.exec(migration);
for (const [i, role] of ['member', 'team_leader', 'mentor', 'admin'].entries()) {
  const id = `00000000-0000-4000-8000-00000000000${i+1}`;
  await db.exec(`insert into team_members values('${id}','${role}',true); set test.uid='${id}';`);
  const allowed = async () => (await db.query("select has_permission('use_g3_assist') as allowed")).rows[0].allowed;
  assert.equal(await allowed(), ['mentor','admin'].includes(role));
  await db.exec(`update role_permissions set allowed=true where role='${role}' and permission_key='use_g3_assist'`);
  assert.equal(await allowed(), true);
  await db.exec(`update role_permissions set allowed=false where role='${role}' and permission_key='use_g3_assist'`);
  await db.exec(migration); // Re-running must not undo an administrator decision.
  assert.equal(await allowed(), false);
  await db.exec(`update role_permissions set allowed=true where role='${role}' and permission_key='use_g3_assist';update team_members set active=false where id='${id}'`);
  assert.equal(await allowed(), false);
}
assert.ok((await db.query('select count(*)::int as n from g3_assist_permission_audit')).rows[0].n >= 8);
await db.exec('set role authenticated');
assert.equal((await db.query('select * from g3_assist_permission_audit')).rows.length, 0);
await assert.rejects(db.exec("insert into g3_assist_permission_audit(role,allowed) values('member',true)"));
await db.close();

let handler, permission = false, rpcError = false, active = true, paidCalls = 0, protectedReads = 0;
const client = {
  auth: { getUser: async () => ({data:{user:{id:'synthetic'}},error:null}) },
  rpc: async () => ({data:permission,error:rpcError ? new Error('unavailable') : null}),
  from(table) {
    if (table !== 'team_members') { protectedReads++; throw new Error('Denied request reached protected context'); }
    const q = {select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{active}})}; return q;
  },
};
globalThis.__assistClient = () => client;
globalThis.__assistDeno = {env:{get:key=>key==='G3_ASSIST_EXECUTION_MODE'?'legacy':'synthetic'},serve:fn=>handler=fn};
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { paidCalls++; throw new Error('No real provider calls permitted'); };
try {
  const original = fs.readFileSync(new URL('../../../backend/supabase/functions/frc-assistant/index.ts', import.meta.url), 'utf8');
  const evidenceCode=ts.transpileModule(fs.readFileSync(new URL('../../../backend/supabase/functions/frc-assistant/evidence-context.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const evidenceUrl='data:text/javascript;base64,'+Buffer.from(evidenceCode).toString('base64');
  const officialCode=ts.transpileModule(fs.readFileSync(new URL('../../../backend/supabase/functions/frc-assistant/official-season.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const officialUrl='data:text/javascript;base64,'+Buffer.from(officialCode.replace("'./evidence-context.ts'",JSON.stringify(evidenceUrl))).toString('base64');
  const softwareCode=ts.transpileModule(fs.readFileSync(new URL('../../../backend/supabase/functions/frc-assistant/software-context.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const softwareUrl='data:text/javascript;base64,'+Buffer.from(softwareCode).toString('base64');
  const code = original.replace("'./software-context.ts'",JSON.stringify(softwareUrl)).replace("'./official-season.ts'",JSON.stringify(officialUrl)).replace("'./evidence-context.ts'",JSON.stringify(evidenceUrl)).replace(/import \{ createClient \} from "[^"]+";/, 'const createClient=globalThis.__assistClient; const Deno=globalThis.__assistDeno;')
    .replace('import("./budgeted-gemini.ts")','Promise.resolve(globalThis.__assistBudgetModule)')
    .replace("import('./team-purpose.ts')",'Promise.resolve(globalThis.__assistPurposeModule)');
  const compiled = ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  await import('data:text/javascript;base64,'+Buffer.from(compiled.outputText).toString('base64'));
  const call = body => handler(new Request('https://test.invalid/assistant',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify(body)}));
  for (const body of [{action:'prepare-software',repository:'GlueGunAndGlitter/6740_robot_2024',ref:'main'},{message:'PID'}, {conversationId:'saved',message:'follow-up'}, {contextIssueId:'issue',image:{data:'test'}}]) {
    assert.equal((await call(body)).status,403);
  }
  rpcError=true; assert.equal((await call({message:'PID'})).status,503);
  rpcError=false; permission=true; assert.equal((await call({})).status,400);
  active=false; assert.equal((await call({message:'PID'})).status,403);
  assert.equal(paidCalls,0); assert.equal(protectedReads,0);
  active=true; permission=false;
  globalThis.__assistDeno.env.get=key=>key==='GEMINI_API_KEY'?undefined:'synthetic';
  assert.equal((await call({message:'PID'})).status,403);
  permission=true;
  assert.equal((await call({})).status,400);
  const noProvider=await call({message:'PID'});
  assert.equal(noProvider.status,503);
  assert.equal((await noProvider.json()).code,'PROVIDER_NOT_CONFIGURED');
  assert.equal(protectedReads,0); assert.equal(paidCalls,0);
  globalThis.__assistDeno.env.get=key=>key==='G3_ASSIST_EXECUTION_MODE'?'legacy':'synthetic';
  active=true;
  let accessChecks=0;
  client.rpc=async name=>name==='search_frc_team_knowledge'?{data:[],error:null}:name==='search_frc_corpus'?{data:{rows:[]},error:null}:{data:++accessChecks < 3,error:null};
  let trustedRole="mentor";
  client.from=table=>{
    const result=table==='team_members'?{data:{active:true,role:trustedRole}}:table==='ai_conversations'?{data:{id:'conversation'}}:{data:[],count:0};
    const q=new Proxy({}, {get:(_,key)=>key==='insert'?(rows)=>{if(table==='ai_messages'){assert.deepEqual(Object.keys(rows[0]).sort(),Object.keys(rows[1]).sort());assert.ok(rows.every(r=>Array.isArray(r.citations)&&Number.isFinite(r.input_tokens)&&Number.isFinite(r.output_tokens)));}return q;}:key==='then'?(done,fail)=>Promise.resolve(result).then(done,fail):()=>q});
    return q;
  };
  globalThis.fetch=async()=>{paidCalls++;return new Response(JSON.stringify({error:{message:'quota exhausted'}}),{status:429});};
  // First call is permitted; permission is revoked before the fallback call.
  assert.equal((await call({message:'Explain PID'})).status,403);
  assert.equal(paidCalls,1); assert.equal(accessChecks,3);
  client.rpc=async name=>({data:name==='search_frc_corpus'?{rows:[]}:name==='claim_g3_assist_execution'?{claimed:true}:true,error:null});
  globalThis.__assistPurposeModule={checkTeamPurpose:async()=>({decision:'allow',category:'engineering'})};
  globalThis.__assistDeno.env.get=key=>key==='G3_ASSIST_EXECUTION_MODE'?'budgeted-text-v1':'synthetic';
  assert.equal((await call({message:'PID'})).status,400);
  assert.equal((await call({message:'PID',image:{data:'x'}})).status,400);
  class BudgetExecutionError extends Error {constructor(code,status){super(code);this.code=code;this.status=status;}}
  globalThis.__assistBudgetModule={BudgetExecutionError,executeBudgetedText:async options=>{
    assert.equal(options.memberId,'synthetic');assert.ok(options.prompt.includes('Explain PID'));
    throw new BudgetExecutionError('TEAM_MONTHLY_BUDGET_EXHAUSTED',429);
  }};
  const exhausted=await call({message:'Explain PID',requestId:crypto.randomUUID()});
  assert.equal(exhausted.status,429);assert.equal((await exhausted.json()).code,'TEAM_MONTHLY_BUDGET_EXHAUSTED');
  assert.equal(paidCalls,1); // Budget failure never falls back to the legacy provider loop.
  for(const [code,english,hebrew] of [
    ['MEMBER_DAILY_BUDGET_EXHAUSTED','Your daily','היומי שלכם'],
    ['TEAM_DAILY_BUDGET_EXHAUSTED',"team's daily",'היומי של הקבוצה'],
    ['PURPOSE_BUDGET_EXHAUSTED','relevance checks','לבדיקות רלוונטיות'],
    ['PROVIDER_RATE_LIMIT','one minute','דקה'],
    ['PROVIDER_COOLDOWN','five minutes','חמש דקות']
  ]){
    globalThis.__assistBudgetModule.executeBudgetedText=async()=>{throw new BudgetExecutionError(code,429);};
    for(const [language,expected] of [['en',english],['he',hebrew]]){
      const response=await call({message:'Explain PID',language,requestId:crypto.randomUUID()});
      assert.equal(response.status,429);const body=await response.json();assert.equal(body.code,code);assert.ok(body.error.includes(expected));
    }
  }
  assert.equal(paidCalls,1);
  let answerCalls=0;
  globalThis.__assistBudgetModule.executeBudgetedText=async()=>{answerCalls++;return {model:'synthetic',answer:'test',usage:{}};};
  for(const decision of ['decline','clarify']){
    globalThis.__assistPurposeModule.checkTeamPurpose=async()=>({decision});
    assert.equal((await call({message:'Unrelated request',requestId:crypto.randomUUID()})).status,422);
  }
  assert.equal(answerCalls,0);
  // A client role claim cannot skip the gate; only the database role can.
  assert.equal((await call({message:'General question',role:'admin',requestId:crypto.randomUUID()})).status,422);
  trustedRole='admin';
  globalThis.__assistBudgetModule.executeBudgetedText=async options=>{assert.ok(options.systemInstruction.includes('may ask general questions'));throw new BudgetExecutionError('TEAM_MONTHLY_BUDGET_EXHAUSTED',429);};
  assert.equal((await call({message:'General question',requestId:crypto.randomUUID()})).status,429);
  const missingRules=await call({message:'Based on the 2026 challenge, from strategy perspective, should we build a climbing mechanism?',requestId:crypto.randomUUID()});
  assert.equal(missingRules.status,503);assert.equal((await missingRules.json()).code,'OFFICIAL_EVIDENCE_UNAVAILABLE');
  globalThis.__assistBudgetModule.executeBudgetedText=async()=>({model:'synthetic',answer:'Test answer',usage:{inputTokens:10,outputTokens:10,thoughtTokens:0}});
  assert.equal((await call({message:'Explain PID',requestId:crypto.randomUUID()})).status,200);
  // Real handler: code context persists, survives JSONB key reordering, and
  // cannot silently switch revisions on an existing conversation.
  const revision='a'.repeat(40),repository='GlueGunAndGlitter/6740_robot_2024';
  const software={repository,revision,paths:['src/Intake.java'],mode:'explain'};
  let savedContext=null,softwareCalls=0;
  client.from=table=>{const result=table==='team_members'?{data:{active:true,role:'admin'}}:table==='ai_conversations'?{data:{id:'conversation',software_context:savedContext}}:{data:[],count:0};
   const q=new Proxy({}, {get:(_,key)=>key==='insert'?rows=>{if(table==='ai_conversations')savedContext=rows.software_context;return q;}:key==='then'?(done,fail)=>Promise.resolve(result).then(done,fail):()=>q});return q;};
  globalThis.fetch=async url=>{let data;if(url.endsWith(repository))data={private:false,full_name:repository};else if(url.includes('/commits/'))data={sha:revision,commit:{tree:{sha:revision}}};else if(url.includes('/git/trees/'))data={truncated:false,tree:[{path:'src/Intake.java',mode:'100644',type:'blob',sha:revision,size:20}]};else if(url.includes('/git/blobs/'))data={encoding:'base64',content:btoa('class Intake {}')};else throw Error('Unexpected network request');return Response.json(data);};
  globalThis.__assistBudgetModule.executeBudgetedText=async options=>{softwareCalls++;assert.ok(options.prompt.includes('class Intake'));return {model:'synthetic',answer:'The selected class is empty [C1:L1].',usage:{inputTokens:10,outputTokens:10,thoughtTokens:0}};};
  let result=await call({message:'Explain 2024 robot climb code',software,requestId:crypto.randomUUID()});assert.equal(result.status,200);assert.deepEqual(JSON.parse(JSON.stringify(savedContext)),software);assert.equal((await result.json()).citations[0].url.endsWith('#L1-L1'),true);
  savedContext={mode:'explain',paths:software.paths,revision,repository};
  result=await call({message:'Explain intake',software,conversationId:'conversation',requestId:crypto.randomUUID()});assert.equal(result.status,200);
  result=await call({message:'Explain intake',software:{...software,revision:'b'.repeat(40)},conversationId:'conversation',requestId:crypto.randomUUID()});assert.equal(result.status,409);assert.equal(softwareCalls,2);
  globalThis.__assistBudgetModule.executeBudgetedText=async()=>({model:'synthetic',answer:'Unsupported claim [C1:L999].',usage:{}});
  result=await call({message:'Explain 2024 robot climb code',software,requestId:crypto.randomUUID()});assert.equal(result.status,502);
  trustedRole='mentor';

  client.rpc=async name=>({data:name==='claim_g3_assist_execution'?{claimed:false,state:'completed',result:{status:200,body:{answer:'recovered'}}}:true,error:null});
  assert.equal((await (await call({message:'Previously answered',requestId:crypto.randomUUID()})).json()).answer,'recovered');
  assert.equal(answerCalls,0);
  console.log('PASS: real permission SQL defaults, grants, revocation, inactive members, rerun preservation, audit isolation; actual Edge handler denies text/history/image/issue requests before context or provider work and fails closed on permission errors.');
} finally { globalThis.fetch=oldFetch; delete globalThis.__assistClient; delete globalThis.__assistDeno; delete globalThis.__assistBudgetModule; delete globalThis.__assistPurposeModule; }
