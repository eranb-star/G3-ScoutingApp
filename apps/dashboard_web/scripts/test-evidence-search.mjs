import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/knowledgeEvidence.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {findEvidence}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const sources=[{id:'a',season:2026,current:true},{id:'b',season:2024,current:true},{id:'old',season:2024,current:false}];
const claims=[
 {id:'1',source_id:'a',title:'Elevator',body:'Mechanism',status:'published'},
 {id:'2',source_id:'b',title:'Elevator and turret',body:'Mechanism',status:'published'},
 {id:'3',source_id:'old',title:'Elevator',body:'Retired',status:'published'},
 ...['draft','conflicted','withdrawn'].map(status=>({id:status,source_id:'a',title:'Elevator',body:'Hidden',status}))
];
assert.deepEqual(findEvidence(claims,sources,'all','elevator').map(c=>c.id),['1','2']);
assert.deepEqual(findEvidence(claims,sources,2026,'elevator').map(c=>c.id),['1']);
assert.deepEqual(findEvidence(claims,sources,'all','TURRET').map(c=>c.id),['2']);
assert.equal(findEvidence(claims,sources,'all','missing').length,0);
assert.equal(findEvidence(claims,sources,2025,'').length,0);
assert.equal(findEvidence(claims,sources,'all','').length,2);
console.log('Evidence search: all-season, single-season, case handling and publication/revision safeguards passed.');
