import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const result=await build({entryPoints:[path.join(app,'src/lib/androidAssets.ts')],bundle:true,write:false,format:'esm',define:{'import.meta.env.MODE':'"android"'}});
const {modelAssetUrl}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
assert.equal(modelAssetUrl('/twin/2026/field-optimized.glb'),'/twin/2026/field-optimized.glb');
assert.equal(modelAssetUrl('/twin/2026/robot-optimized.glb'),'/twin/2026/robot-optimized.glb');
assert.equal(modelAssetUrl('/studio/components/roborio-manta.glb'),'/studio/components/roborio-manta.glb');
assert.equal(modelAssetUrl('/twin/2023/field-optimized.glb'),'https://g3-6740.com/twin/2023/field-optimized.glb');
assert.equal(modelAssetUrl('/twin/robots/6328-2026/model_0.glb'),'https://g3-6740.com/twin/robots/6328-2026/model_0.glb');
assert.equal(modelAssetUrl('/twin/2023/field-optimized.glb',false),'/twin/2023/field-optimized.glb');
assert.equal(modelAssetUrl('blob:local-model'),'blob:local-model');
const policy=JSON.parse(await fs.readFile(path.join(app,'dist/android-asset-policy.json'),'utf8'));
for(const file of policy.bundled){const data=await fs.readFile(path.join(app,'dist',file));assert.equal(data.readUInt32LE(0),0x46546c67);const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());assert.ok(!(json.buffers??[]).some(x=>x.uri));assert.ok(!(json.images??[]).some(x=>x.uri&&!x.uri.startsWith('data:')));}
for(const file of policy.removed){await assert.rejects(fs.access(path.join(app,'dist',file)));if(process.argv.includes('--remote')){const response=await fetch(modelAssetUrl(file),{signal:AbortSignal.timeout(120000)});assert.equal(response.status,200,file);assert.equal(response.headers.get('access-control-allow-origin'),'*',file+' CORS');const data=Buffer.from(await response.arrayBuffer());const source=await fs.readFile(path.join(app,'public',file));assert.equal(createHash('sha256').update(data).digest('hex'),createHash('sha256').update(source).digest('hex'),file+' remote bytes');console.log('Verified remote model:',file);}}
console.log('PASS: bundled model dependencies, Android/web routing, exclusions'+(process.argv.includes('--remote')?' and exact remote asset hashes/CORS':''));
