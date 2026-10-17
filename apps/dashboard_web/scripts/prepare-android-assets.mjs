// Run after `vite build --mode android`, before Capacitor copy/sync.
// Only removes optional GLBs from the generated dist directory, never sources.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(app,'dist');
const marker=JSON.parse(await fs.readFile(path.join(dist,'android-build.json'),'utf8'));
if(marker.mode!=='android')throw Error('Refusing to trim a non-Android build');
const keep=JSON.parse(await fs.readFile(path.join(app,'src/lib/androidBundledModels.json'),'utf8'));
const removed=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.glb')){const key='/'+path.relative(dist,file).replaceAll('\\','/');if(!keep.includes(key)&&!key.startsWith('/studio/components/')){await fs.unlink(file);removed.push(key);}}}}
for(const key of keep)await fs.access(path.join(dist,key.slice(1)));
await walk(dist);
await fs.writeFile(path.join(dist,'android-asset-policy.json'),JSON.stringify({bundled:keep,smallComponentsBundled:true,remoteOrigin:'https://g3-6740.com',removed},null,2));
console.log(`Android assets: kept current field/KitBot and small components; excluded ${removed.length} optional model files.`);
