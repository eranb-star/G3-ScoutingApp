import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const source=fs.readFileSync('src/lib/buildHeldTasks.ts','utf8');
const {buildHeldTasks}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:99,module:99}}).outputText).toString('base64'));
const deps=[{task_id:'work',prerequisite_id:'release'},{task_id:'installation',prerequisite_id:'work'},{task_id:'test',prerequisite_id:'installation'},{task_id:'work',prerequisite_id:'test'},{task_id:'other',prerequisite_id:'other-release'}];
assert.deepEqual([...buildHeldTasks([{task_id:'release'}],deps)].sort(),['installation','release','test','work']);
assert.deepEqual([...buildHeldTasks([],deps)],[]);
assert.deepEqual([...buildHeldTasks([{task_id:'unknown'}],deps)],['unknown']);
console.log('PASS readiness holds propagate transitively, terminate on cycles and leave unrelated work usable');
