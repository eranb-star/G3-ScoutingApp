import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createResearchFixture,researchAdmin} from './robot-research-fixture.mjs';
import {batches,generation} from '../../../docs/research/prepare-corpus-release.mjs';
const db=await createResearchFixture();
await db.exec(fs.readFileSync(new URL('../../../backend/supabase/knowledge_corpus_20260921.sql',import.meta.url),'utf8'));
for(let i=0;i<batches.length;i++){await db.exec(batches[i]);if(i%20===0)console.log('Imported batch',i+1);}
await db.exec(`set role authenticated;set test.allowed='yes';set test.uid='${researchAdmin}'`);
const report=[];
for(const q of ['PID','elevator','turret','drivetrain','gripper']){
 const start=performance.now();const result=(await db.query('select search_frc_corpus($1) result',[q])).rows[0].result;
 assert.ok(result.count>0);assert.equal(result.rows.length,10);assert.equal(result.generation,generation);
 assert.ok(result.rows.every(r=>r.url.startsWith('https://')&&r.body&&r.version));
 report.push({q,count:result.count,ms:Math.round(performance.now()-start),sourcesOnFirstPage:new Set(result.rows.map(r=>r.title)).size});
}
const topic=(await db.query("select search_frc_corpus('',array['pid']) result")).rows[0].result;assert.ok(topic.count>=805);
console.log(JSON.stringify(report,null,2));
fs.writeFileSync(new URL('../../../docs/staging/corpus-release.local/search-validation.json',import.meta.url),JSON.stringify({generation,report,topicCount:topic.count},null,2));
await db.close();
