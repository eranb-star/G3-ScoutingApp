// One finite local run: resume collection, extract, index, measure and report.
// No scheduler, production connection or paid model. Publisher errors are not retried here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const statePath = new URL('./full-collection/run-state.json', import.meta.url);
fs.mkdirSync(new URL('./full-collection/',import.meta.url),{recursive:true});
const python = process.env.G3_RESEARCH_PYTHON || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
if (!fs.existsSync(python)) throw new Error('Set G3_RESEARCH_PYTHON to the installed Python executable.');
let child;
const state = {startedAt:new Date().toISOString(),status:'running',phase:'queue',productionWrites:0};
const save = () => { fs.writeFileSync(new URL('./full-collection/run-state.json.tmp',import.meta.url),JSON.stringify(state,null,2));fs.renameSync(new URL('./full-collection/run-state.json.tmp',import.meta.url),statePath); };
const run = (phase, executable, args) => new Promise((resolve,reject) => {
  state.phase=phase;save();console.log('Collection pipeline: '+phase);
  child=spawn(executable,args,{cwd:root,stdio:'inherit',windowsHide:true});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(phase+' exited with '+code)));
});
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{child?.kill();state.status='interrupted';state.finishedAt=new Date().toISOString();save();process.exit(130);});
try {
  await run('queue',process.execPath,['docs/research/full-collection.mjs','queue']);
  await run('collect',process.execPath,['docs/research/full-collection.mjs','collect','2000']);
  await run('verify-downloads',process.execPath,['docs/research/check-collection-integrity.mjs']);
  await run('extract',python,['docs/research/extract-full-collection.py']);
  await run('index',process.execPath,['docs/research/build-isolated-corpus.mjs']);
  await run('report',process.execPath,['docs/research/build-collection-report.mjs']);
  const jobs=JSON.parse(fs.readFileSync(new URL('./full-collection/jobs.json',import.meta.url),'utf8'));
  state.status=jobs.some(j=>j.status!=='collected')?'attention':'completed-discovered-queue';
  state.phase='finished';state.finishedAt=new Date().toISOString();save();console.log(JSON.stringify(state));
} catch(error) {
  state.status='failed';state.error=error.message;state.finishedAt=new Date().toISOString();save();console.error(error.message);process.exitCode=1;
}
