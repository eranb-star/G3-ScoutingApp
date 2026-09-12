import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

globalThis.window=new EventTarget();
const stored=new Map();
globalThis.localStorage={setItem:(k,v)=>stored.set(k,v),getItem:k=>stored.get(k)??null};
const source=fs.readFileSync(new URL('../src/lib/activeEvent.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {setActiveEvent,subscribeActiveEvent}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const seen=[];const unsubscribe=subscribeActiveEvent(()=>seen.push(localStorage.getItem('g3_event_id')));
setActiveEvent('first');setActiveEvent('second');assert.deepEqual(seen,['first','second']);
const unrelated=new Event('storage');unrelated.key='another-setting';window.dispatchEvent(unrelated);assert.equal(seen.length,2);
localStorage.setItem('g3_event_id','other-tab');const changed=new Event('storage');changed.key='g3_event_id';window.dispatchEvent(changed);assert.equal(seen.at(-1),'other-tab');
window.dispatchEvent(new Event('focus'));assert.equal(seen.length,4);
unsubscribe();setActiveEvent('after-unmount');assert.equal(seen.length,4);
console.log('PASS same-page selection, cross-tab selection, unrelated storage filtering, focus refresh and cleanup');
