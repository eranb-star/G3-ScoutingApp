import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const root='../../backend/supabase/functions/onshape-connector/';
const url=code=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{target:99,module:99}}).outputText).toString('base64');
const security=url(fs.readFileSync(root+'security.ts','utf8'));
const geometry=url(fs.readFileSync(root+'geometry.ts','utf8').replace("'./security.ts'",JSON.stringify(security)));
const {assemblyGeometryPlan,assemblyGeometryPart,finalizeAssemblyGeometry}=await import(url(fs.readFileSync(root+'assemblyGeometry.ts','utf8').replace("'./security.ts'",JSON.stringify(security)).replace("'./geometry.ts'",JSON.stringify(geometry))));
const {providerReader}=await import(security);
const transform=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],id='a'.repeat(24);
const instances=Array.from({length:70},(_,i)=>({id:'i'+i,type:'Part',partId:'p'+i,documentId:id,documentMicroversion:id,elementId:id,name:'Part '+i}));
instances.push({...instances[0],id:'repeat'});
const snapshot={id:'snapshot',evidence:{assembly:{rootAssembly:{instances,occurrences:instances.map(p=>({path:[p.id],transform}))}}}};
const plan=assemblyGeometryPlan(snapshot);assert.equal(plan.parts.length,70);assert.equal(plan.meshes.length,71);assert.equal(plan.meshes.at(-1).partIndex,0);
const files=new Map([['owner/previous-v3.json','existing imported design']]);let reads=0,fail=false;
const bucket={download:async path=>files.has(path)?{data:new Blob([files.get(path)])}:{error:{statusCode:'404',message:'not found'}},upload:async(path,content,options)=>{assert.equal(options.upsert,false);if(files.has(path))return {error:{message:'already exists'}};files.set(path,content);return {};},createSignedUrl:async path=>files.has(path)?{data:{signedUrl:'https://hnqwhuuxlqfyawqymaaz.supabase.co/storage/v1/object/sign/cad-design-assets/'+path}}:{error:{message:'not found'}}};
const read=async path=>{reads++;assert.ok(path.includes('/m/'+id));if(fail)throw Error('temporary provider error');return {bodies:[{faces:[{facets:[{vertices:[[0,0,0],[1,0,0],[0,1,0]]}]}]}]};};
await assert.rejects(()=>assemblyGeometryPart(snapshot,-1,bucket,'owner',read));assert.equal(reads,0);
await assemblyGeometryPart(snapshot,0,bucket,'owner',read);await assemblyGeometryPart(snapshot,0,bucket,'owner',read);assert.equal(reads,1,'retry reuses successful chunk');
fail=true;await assert.rejects(()=>assemblyGeometryPart(snapshot,1,bucket,'owner',read));assert.equal(files.has('owner/snapshot-v3.json'),false);
await assert.rejects(()=>finalizeAssemblyGeometry(snapshot,bucket,'owner'),e=>e.code==='INCOMPLETE_GEOMETRY');
fail=false;for(let i=1;i<70;i++)await assemblyGeometryPart(snapshot,i,bucket,'owner',read);
await finalizeAssemblyGeometry(snapshot,bucket,'owner');const saved=files.get('owner/snapshot-v3.json');const model=JSON.parse(saved);assert.equal(model.meshes.length,71);assert.deepEqual(model.meshes.at(-1).positions,model.meshes[0].positions);
await finalizeAssemblyGeometry(snapshot,bucket,'owner');assert.equal(files.get('owner/snapshot-v3.json'),saved);assert.equal(files.get('owner/previous-v3.json'),'existing imported design');
const huge=JSON.stringify({padding:'x'.repeat(4_100_000)}),reader=providerReader('test',async()=>new Response(huge));
await reader('/parts/d/'+id+'/tessellatedfaces?outputIndexTable=false');
await assert.rejects(()=>reader('/documents?offset=0'),e=>e.code==='SOURCE_TOO_LARGE');
// Frontend: each distinct part once, pinned identity, repeated placements share
// data; failure never returns a partial model and stops scheduling new work.
const {loadCadGeometry,expandCadGeometry}=await import(url(fs.readFileSync('src/lib/cadGeometryLoad.ts','utf8')));
const repeated=Array.from({length:20},(_,i)=>({...instances[0],id:'r'+i}));
const compact={id:'compact',evidence:{assembly:{rootAssembly:{instances:repeated,occurrences:repeated.map(p=>({path:[p.id],transform}))}}}};
files.set('owner/compact-parts-v1/0.json',JSON.stringify({positions:Array(90_000).fill(0.12345678912345678)}));
await finalizeAssemblyGeometry(compact,bucket,'owner');const compactFile=JSON.parse(files.get('owner/compact-v3.json'));
assert.equal(compactFile.format,'shared-meshes-v1');assert.ok(files.get('owner/compact-v3.json').length<2_000_000);
const expanded=expandCadGeometry(compactFile);assert.equal(expanded.meshes.length,20);assert.equal(expanded.meshes[0].positions,expanded.meshes[19].positions);
assert.throws(()=>expandCadGeometry({...compactFile,meshes:[{...compactFile.meshes[0],partIndex:99}]}));
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({positions:[0,0,0,1,0,0,0,1,0]});
const requested=[];const call=async(_action,body)=>{assert.equal(body.snapshotId,'snapshot');if(body.finalize)return {snapshotId:'snapshot'};if(body.partIndex===undefined)return {format:'assembly-parts-v1',snapshotId:'snapshot',partCount:70,meshes:plan.meshes};requested.push(body.partIndex);return {snapshotId:'snapshot',partIndex:body.partIndex,url:'https://hnqwhuuxlqfyawqymaaz.supabase.co/storage/v1/object/sign/cad-design-assets/test'};};
try{const result=await loadCadGeometry(call,{snapshotId:'snapshot'});assert.equal(requested.length,70);assert.equal(result.meshes[0].positions,result.meshes.at(-1).positions);await assert.rejects(()=>loadCadGeometry(async(a,b)=>b.partIndex===1?{snapshotId:'wrong'}:call(a,b),{snapshotId:'snapshot'}));}finally{globalThis.fetch=originalFetch;}
console.log('PASS: 70 unique/71 placed parts, pinned identity, resumable failed chunk, no partial finalization, immutable existing imports, bounded geometry response and frontend assembly');
