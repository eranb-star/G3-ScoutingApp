import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/buildPartGeometry.ts','utf8'),{compilerOptions:{target:99,module:99}}).outputText;
const {partOccurrenceIds}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.deepEqual(partOccurrenceIds([['sub','left'],['sub','right'],['sub','left']],'same-part'),['sub/left','sub/right']);
assert.deepEqual(partOccurrenceIds([['ambiguous/path'],[],[null]],'same-part'),[],'malformed assembly paths must not fall back to a similarly named part');
assert.deepEqual(partOccurrenceIds([], 'part-id'),['part-id']);
assert.deepEqual(partOccurrenceIds(null),[]);
console.log('PASS exact occurrence identity, repeated part deduplication, malformed path refusal and Part Studio fallback');

const pinnedModule=ts.transpileModule(fs.readFileSync('../../backend/supabase/functions/onshape-connector/pinned-source.ts','utf8'),{compilerOptions:{target:99,module:99}}).outputText;
const {pinnedGeometrySource}=await import('data:text/javascript;base64,'+Buffer.from(pinnedModule).toString('base64'));
const sid='11146054-e189-4932-9547-41a7c761b307',rows={cad_snapshots:[{id:sid,source_id:'source'}],cad_sources:[{id:'source',connection_id:'owner',archived_at:null}]};
const db={from(table){let filtered=rows[table];const q={select:()=>q,eq:(key,value)=>{filtered=filtered.filter(r=>r[key]===value);return q;},is:(key,value)=>{filtered=filtered.filter(r=>r[key]===value);return q;},maybeSingle:async()=>({data:filtered[0]??null,error:null})};return q;}};
assert.equal(await pinnedGeometrySource(db,'owner',sid),'source');
assert.equal(await pinnedGeometrySource(db,'another-owner',sid),null,'another connection cannot resolve private snapshot');
rows.cad_sources[0].archived_at='2026-10-09';assert.equal(await pinnedGeometrySource(db,'owner',sid),null,'archived source remains inaccessible');
assert.equal(await pinnedGeometrySource(db,'owner','not-a-snapshot'),null);
assert.equal(await pinnedGeometrySource({from(){return{select(){return this},eq(){return this},maybeSingle:async()=>({error:true})}}},'owner',sid),null,'lookup failure cannot expose source');
console.log('PASS pinned geometry lookup preserves connection ownership, archive, malformed-id and database-failure boundaries');
