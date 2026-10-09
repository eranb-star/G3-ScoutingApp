import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const code=fs.readFileSync('../../backend/supabase/functions/onshape-connector/buildFreshness.ts','utf8');
const {checkBuildSource}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{target:99,module:99}}).outputText).toString('base64'));
const id='11111111-1111-1111-1111-111111111111',pin='a'.repeat(24),current='b'.repeat(24),doc='c'.repeat(24),ref='d'.repeat(24);
let owner=true,claim=true,type='w',state={checked_at:'old-success'},paths=[],writes=[];
const db={rpc:async()=>({data:claim}),from(table){let values;const q={select:()=>q,eq:()=>q,is:()=>q,update:v=>(values=v,q),single:async()=>({data:{source_id:'source',microversion:pin}}),maybeSingle:async()=>{
 if(table==='robot_build_boms')return{data:owner?{snapshot_id:'snapshot'}:null};
 if(table==='cad_sources')return{data:{document_id:doc,reference_id:ref,reference_type:type}};
 writes.push(values);Object.assign(state,values);return{data:{bom_id:id}};
 },then(resolve){writes.push(values);Object.assign(state,values);return Promise.resolve({error:null}).then(resolve);}};return q;}};
const read=async path=>(paths.push(path),{microversion:current});
assert.equal((await checkBuildSource(db,read,'actor','connection',id)).changed,true);
assert.deepEqual(paths,[`/documents/d/${doc}/w/${ref}/currentmicroversion`]);assert.equal(state.current_microversion,current);assert.equal(state.pinned_microversion,pin);
owner=false;await assert.rejects(checkBuildSource(db,read,'actor','connection',id),/unavailable/);owner=true;
claim=false;const count=writes.length;assert.equal((await checkBuildSource(db,read,'actor','connection',id)).cached,true);assert.equal(writes.length,count);claim=true;
const last=state.checked_at;await assert.rejects(checkBuildSource(db,async()=>{throw Error('provider secret');},'actor','connection',id),/Source check failed/);assert.equal(state.checked_at,last);assert.ok(!state.error.includes('provider secret'));assert.equal(state.checking_until,null);
type='m';paths=[];assert.equal((await checkBuildSource(db,read,'actor','connection',id)).fixedReference,true);assert.equal(paths.length,0);assert.equal(state.current_microversion,ref);
await assert.rejects(checkBuildSource(db,read,'actor','connection','bad'),/Choose/);
console.log('PASS source freshness: actual handler module, owner boundary, exact provider path, cooldown, immutable import, fixed reference, failed-check provenance');
