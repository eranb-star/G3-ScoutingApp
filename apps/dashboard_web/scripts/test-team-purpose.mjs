import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const url=file=>new URL('../../../backend/supabase/functions/frc-assistant/'+file,import.meta.url);
const compile=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const adapter=compile(fs.readFileSync(url('budgeted-gemini.ts'),'utf8'));
const purpose=fs.readFileSync(url('team-purpose.ts'),'utf8').replace("'./budgeted-gemini.ts'",JSON.stringify(adapter));
const {parsePurpose}=await import(compile(purpose));
for(const [decision,categories] of Object.entries({allow:['engineering','frc_rules','scouting_strategy','team_learning','team_operations'],clarify:['ambiguous'],decline:['unrelated','disallowed_tool']}))
 for(const category of categories)assert.deepEqual(parsePurpose(JSON.stringify({decision,category})),{decision,category});
for(const invalid of ['null','[]','"allow"','{}','{"decision":"allow","category":"unrelated"}','{"decision":"allow","category":"engineering","extra":true}','```json\n{"decision":"allow","category":"engineering"}\n```','{"decision":"decline","category":"engineering"}'])
 assert.throws(()=>parsePurpose(invalid),e=>e.code==='PURPOSE_CHECK_UNAVAILABLE');
console.log('PASS: strict purpose response parser rejects malformed, extra-field and inconsistent decisions. This does not measure live classifier accuracy.');
