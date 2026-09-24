// Exercise the actual Edge handler with isolated service/caller and publisher doubles.
import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const root=new URL('../../../backend/supabase/functions/knowledge-source-check/',import.meta.url);
let permitted=true,signedIn=true,lease=null,fetchCount=0,handler;
const id='00000000-0000-4000-8000-000000000001',token='00000000-0000-4000-8000-000000000002';
const listing='https://www.firstinspires.org/resources/library/frc/season-materials',pdf='https://firstfrc.blob.core.windows.net/frc2026/Manual/example.pdf';
const run={id,season:2026,status:'running'};let items=[{id:'listing',check_id:id,kind:'listing',url:listing,title:'Season materials',status:'pending'}];
const clients={auth:{getUser:async()=>({data:{user:signedIn?{id}:null},error:null})},rpc:async(name,args)=>{
 if(name==='can_manage_frc_sources')return{data:permitted,error:null};
 if(name==='start_frc_source_check'||name==='retry_frc_source_check')return{data:id,error:null};
 if(name==='lease_frc_source_check'){if(lease)return{data:null,error:null};lease=token;return{data:token,error:null};}
 if(name==='finish_frc_document_ingestion'){const item=items.find(i=>i.id===args.p_item);Object.assign(item,{status:args.p_error?'failed':'new',note:args.p_error??'Indexed',bytes:args.p_bytes,sha256:args.p_sha});return{data:true,error:null};}
 if(name==='finish_frc_check_item'){const item=items.find(i=>i.id===args.p_item);Object.assign(item,{status:args.p_status==='fetched'?'new':args.p_status,note:args.p_note,bytes:args.p_bytes,sha256:args.p_sha});return{data:true,error:null};}
 if(name==='release_frc_source_check'){lease=null;if(!items.some(i=>i.status==='pending'))run.status=items.some(i=>i.status==='failed'||i.status==='skipped')?'attention':'complete';return{data:null,error:null};}
 throw new Error('Unexpected RPC '+name);
},from(table){let conditions=[],single=false,limit=Infinity,upsert;
 const q=new Proxy({}, {get(_,key){if(key==='then')return (done,fail)=>Promise.resolve().then(()=>{if(upsert){for(const row of upsert)if(!items.some(i=>i.url===row.url))items.push({...row,id:'item-'+items.length});return{data:null,error:null};}let rows=table==='frc_knowledge_checks'?[{...run,lease_token:lease}]:table==='frc_knowledge_documents'?[]:items;for(const [k,v]of conditions)rows=rows.filter(row=>row[k]===v);rows=rows.slice(0,limit);return{data:single?rows[0]:rows,error:null};}).then(done,fail);return(...args)=>{if(key==='eq')conditions.push(args);if(key==='single')single=true;if(key==='limit')limit=args[0];if(key==='upsert')upsert=args[0];return q;};}});return q;}};
globalThis.__pdf=async()=>({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:'Synthetic official text for handler integration testing only.',hasEOL:true}]}),cleanup(){}}),destroy:async()=>{}});
globalThis.__knowledgeClient=()=>clients;globalThis.__knowledgeDeno={env:{get:()=> 'test-only'},serve:fn=>{handler=fn;}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{fetchCount++;if(url===listing)return new Response(`<a href="${pdf}">Example manual</a>`,{headers:{'content-type':'text/html'}});if(url===pdf)return new Response('%PDF-1.7 synthetic',{headers:{'content-type':'application/pdf'}});throw new Error('Unexpected publisher URL '+url);};
try{
 let code=fs.readFileSync(new URL('index.ts',root),'utf8').replace(/import \{createClient\} from '[^']+';/,"const createClient=globalThis.__knowledgeClient; const Deno=globalThis.__knowledgeDeno;").replace("'./discovery.mjs'",JSON.stringify(new URL('discovery.mjs',root).href)).replace("'./extraction.mjs'",JSON.stringify(new URL('extraction.mjs',root).href)).replace(/import \{getDocumentProxy\} from '[^']+';/,'const getDocumentProxy=globalThis.__pdf;');
 const compiled=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});assert.equal(compiled.diagnostics.length,0);
 await import('data:text/javascript;base64,'+Buffer.from(compiled.outputText).toString('base64'));
 const call=(body,authorization=true)=>handler(new Request('https://local.test/check',{method:'POST',headers:authorization?{Authorization:'Bearer synthetic'}:{},body:JSON.stringify(body)}));
 assert.equal((await call({action:'start',season:2026},false)).status,401);
 signedIn=false;assert.equal((await call({action:'start',season:2026})).status,401);signedIn=true;
 permitted=false;assert.equal((await call({action:'start',season:2026})).status,403);permitted=true;
 assert.equal((await call({action:'start',season:3000})).status,400);assert.equal(fetchCount,0);
 assert.equal((await (await call({action:'start',season:2026})).json()).checkId,id);
 const first=await (await call({action:'advance',checkId:id})).json();assert.equal(first.status,'running');assert.equal(items.length,2);assert.equal(fetchCount,1);
 lease=token;assert.equal((await (await call({action:'advance',checkId:id})).json()).status,'busy');assert.equal(fetchCount,1);lease=null;
 const second=await (await call({action:'advance',checkId:id})).json();assert.equal(second.status,'complete');assert.equal(items[1].status,'new');assert.match(items[1].sha256,/^[0-9a-f]{64}$/);assert.equal(fetchCount,2);
 await call({action:'advance',checkId:id});assert.equal(fetchCount,2);
 run.status='running';items=[{id:'denied',check_id:id,kind:'document',url:pdf,title:'Example',status:'pending'}];permitted=false;assert.equal((await call({action:'advance',checkId:id})).status,403);assert.equal(fetchCount,2);
 permitted=true;globalThis.fetch=async()=>{fetchCount++;return new Response('<html>Maintenance</html>',{headers:{'content-type':'text/html'}});};
 await call({action:'advance',checkId:id});assert.equal(items[0].status,'failed');assert.equal(run.status,'attention');assert.equal(lease,null);
 console.log('PASS: actual Edge handler authentication, admin gate, validated start, discovery, leased duplicate exclusion, PDF fingerprints, terminal no-op, failure recovery, bounded requests.');
}finally{globalThis.fetch=originalFetch;delete globalThis.__knowledgeClient;delete globalThis.__knowledgeDeno;}
