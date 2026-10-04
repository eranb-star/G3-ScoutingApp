import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
let handler,allowed=false,active=true,auth=true,privateReads=0;
const client={auth:{getUser:async()=>({data:{user:auth?{id:'test'}:null}})},rpc:async()=>({data:allowed}),from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{active}})};return q;}};
globalThis.__repoClient=()=>client;globalThis.__repoDeno={env:{get:k=>k==='G3_ROBOT_GITHUB_TOKEN'?'test-secret':'test'},serve:fn=>handler=fn};
const source=fs.readFileSync('../../backend/supabase/functions/frc-assistant/software-context.ts','utf8');
const moduleUrl='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:99,module:99}}).outputText).toString('base64');
let code=fs.readFileSync('../../supabase/functions/github-repositories/index.ts','utf8').replace(/import \{ createClient \} from "[^"]+";/,'const createClient=globalThis.__repoClient;const Deno=globalThis.__repoDeno;').replace("'../../../backend/supabase/functions/frc-assistant/software-context.ts'",JSON.stringify(moduleUrl));
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{
 if(url.includes('/users/')){assert.equal(opts.headers.Authorization,undefined);return Response.json([{id:1,name:'public',owner:{login:url.includes('GlueGunAndGlitter')?'GlueGunAndGlitter':'GlueGunGlitter'},full_name:'GlueGunAndGlitter/public',private:false,default_branch:'main'},{id:2,name:'hidden',private:true}]);}
 privateReads++;assert.equal(opts.headers.Authorization,'Bearer test-secret');const full_name=url.split('/repos/')[1];return Response.json({id:10+privateReads,name:full_name.split('/')[1],owner:{login:'GlueGunAndGlitter'},full_name,private:true,default_branch:'main'});
};
try{
 await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{target:99,module:99}}).outputText).toString('base64'));
 const call=()=>handler(new Request('https://test.invalid',{headers:{Authorization:'Bearer test'}}));
 let response=await call(),data=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(data.privateAccessStatus,'permission-required');assert.ok(data.repositories.every(r=>!r.private));assert.equal(privateReads,0);
 allowed=true;data=await (await call()).json();assert.equal(data.privateAccessStatus,'connected');assert.equal(data.repositories.filter(r=>r.private).length,3);assert.equal(privateReads,3);assert.ok(!JSON.stringify(data).includes('test-secret'));
 active=false;assert.equal((await call()).status,403);assert.equal(privateReads,3);
 auth=false;assert.equal((await call()).status,401);assert.equal(privateReads,3);
 console.log('PASS: actual catalogue handler hides private data without permission, limits token to three repos, requires active membership and disables HTTP caching');
}finally{globalThis.fetch=originalFetch;}
