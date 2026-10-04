import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const moduleUrl=code=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{target:99,module:99}}).outputText).toString('base64');
const root='../../backend/supabase/functions/onshape-connector/';
const security=moduleUrl(fs.readFileSync(root+'security.ts','utf8'));
const {captureSnapshot,inspectEvidence}=await import(moduleUrl(fs.readFileSync(root+'snapshot.ts','utf8').replace("'./security.ts'",JSON.stringify(security))));
const source={document_id:'111111111111111111111111',element_id:'222222222222222222222222',reference_id:'333333333333333333333333',reference_type:'w',element_type:'PARTSTUDIO',configuration:'size=small'};
const microversion='444444444444444444444444',calls=[];
const snapshot=await captureSnapshot(source,async path=>{calls.push(path);if(path.endsWith('/currentmicroversion'))return {microversion};assert.ok(path.includes('/m/'+microversion+'/'));assert.ok(path.includes('configuration=size%3Dsmall'));return path.includes('/features?')?{features:[{featureId:'sketch1',featureType:'newSketch',name:'Sketch 1'}],featureStates:{sketch1:{featureStatus:'OK'}}}:[];});
assert.equal(snapshot.microversion,microversion);assert.equal(calls.length,3);
assert.equal(inspectEvidence(snapshot).observations[0].status,'OK');
assert.equal(snapshot.evidence.parts.length,0); // A sketch-only design remains valid evidence.
let partialCalls=0;
const partial=await captureSnapshot({...source,reference_type:'m',reference_id:microversion},async path=>{partialCalls++;if(path.includes('/parts/'))throw Error('unavailable');return {features:[]};});
assert.equal(partialCalls,2);assert.equal(partial.coverage[1].status,'unavailable');
await assert.rejects(()=>captureSnapshot({...source,reference_type:'m'},async()=>{throw Error('fail');}),e=>e.code==='SOURCE_UNAVAILABLE');
console.log('PASS: immutable revision across evidence, configuration preserved, sketch-only support and explicit partial/no-evidence behavior');
