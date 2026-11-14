import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g3-scout-labels-'));
global.window={innerWidth:390};
let language='he';
global.localStorage={getItem:()=>language};
const file=path.join(dir,'test.cjs');
await build({stdin:{contents:`export {default as Form} from './src/components/TemplateForm';export {LocalizationProvider as Provider} from './src/lib/localization';export * from './src/lib/scoutingLabels';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,jsx:'automatic',plugins:[{name:'react-singleton',setup(b){b.onResolve({filter:/^react(?:\/.*)?$/},a=>({path:require.resolve(a.path),external:true}));}}]});
const {Form,Provider,scoutingNodeLabel}=require(file);
const template={phases:[{id:'auto',label:'Auto',blocks:[{id:'score',label:'Auto Scoring — FUEL into active HUB',items:[
 {id:'fuel',type:'counter',label:'Auto FUEL scored (active HUB)',max:80},
 {id:'station',type:'select',label:'Station',options:[{value:'red_1',label:'Red 1'},{value:'blue_1',label:'Blue 1'}]},
 {id:'tower',type:'picklist_counter',label:'TOWER Level Achieved',options:[{value:'level_2',label:'Level 2'}]},
 {id:'disabled',type:'toggle',label:'Robot Disabled (any time)'},
 {id:'notes',type:'text',label:'Notes (optional)',placeholder:'Only if important'},
 {id:'scout_name',type:'text',label:'Scout Name (optional)'},
]}]}]};
const values={fuel:12,station:'red_1',tower:{level_2:2},disabled:true,notes:'הערת תלמיד'};
const before=JSON.stringify({template,values});
function render(){return renderToStaticMarkup(React.createElement(Provider,null,React.createElement(Form,{template,values,setValue(){throw Error('Render must not write data');}})));}
const he=render();
assert.match(he,/dir="rtl"/);assert.match(he,/כדורים שנקלעו באוטונומי/);assert.match(he,/אדום 1/);assert.match(he,/רמה 2/);
assert.match(he,/value="red_1" selected/);assert.match(he,/value="level_2"/);assert.match(he,/הערת תלמיד/);assert.doesNotMatch(he,/Scout Name/);
language='en';const en=render();assert.match(en,/dir="ltr"/);assert.match(en,/Auto FUEL scored/);assert.match(en,/value="red_1" selected/);
assert.equal(JSON.stringify({template,values}),before);
assert.equal(scoutingNodeLabel({label:'Custom',label_he:'מותאם'},'he'),'מותאם');
assert.equal(scoutingNodeLabel({label:'Future field'},'he'),'Future field');
assert.equal(scoutingNodeLabel('floor','he'),'מהרצפה');
fs.rmSync(dir,{recursive:true,force:true});
console.log('PASS: Hebrew/English rendered fields, RTL, selected raw values, counters, hidden fields, custom translations and immutable template/report.');
