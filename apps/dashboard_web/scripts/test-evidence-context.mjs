import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const code=ts.transpileModule(fs.readFileSync(new URL('../../../backend/supabase/functions/frc-assistant/evidence-context.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {historyWithoutCitationIds,retrieveEvidence,validatedCitations,retrievalQuery,evidencePrompt}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const evidence={id:4,url:'https://example.org/post/4',title:'PID reference',body:'Measured oscillation',version:'hash',seasons:[2024],source_class:'team'};
assert.equal(retrievalQuery('How can we tune our elevator PID?'),'"tune" OR "elevator" OR "pid"');
assert.throws(()=>validatedCitations('Claim [S99]',[evidence]),/UNSUPPORTED/);
assert.deepEqual(validatedCitations('Evidence [S4], again [S4]',[evidence]).map(x=>x.id),['S4']);
assert.equal(validatedCitations('A proposed test',[]).length,0);
assert.ok(evidencePrompt([evidence]).includes('Unreviewed'));
await assert.rejects(()=>retrieveEvidence({rpc:async()=>({error:{message:'denied'}})},'PID',{generation:'g',ids:[4]}),/UNAVAILABLE/);
assert.deepEqual(await retrieveEvidence({rpc:async()=>({error:{message:'denied'}})},'PID'),[]);
let calls=[];const caller={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='search_frc_corpus'?{generation:'g',rows:[evidence]}:[evidence]};}};
assert.deepEqual(await retrieveEvidence(caller,'PID'),[evidence]);assert.equal(calls[1].name,'resolve_frc_corpus');
console.log('Evidence retrieval uses caller access, bounded IDs and validated citations.');

assert.equal(historyWithoutCitationIds('Earlier [S1000212] and [S12, S13]'), 'Earlier [prior source reference; recheck current evidence] and [prior source reference; recheck current evidence]');
