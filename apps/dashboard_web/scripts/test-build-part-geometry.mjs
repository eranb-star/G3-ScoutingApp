import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/buildPartGeometry.ts','utf8'),{compilerOptions:{target:99,module:99}}).outputText;
const {partOccurrenceIds}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.deepEqual(partOccurrenceIds([['sub','left'],['sub','right'],['sub','left']],'same-part'),['sub/left','sub/right']);
assert.deepEqual(partOccurrenceIds([['ambiguous/path'],[],[null]],'same-part'),[],'malformed assembly paths must not fall back to a similarly named part');
assert.deepEqual(partOccurrenceIds([], 'part-id'),['part-id']);
assert.deepEqual(partOccurrenceIds(null),[]);
console.log('PASS exact occurrence identity, repeated part deduplication, malformed path refusal and Part Studio fallback');
