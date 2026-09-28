// Reproducible inspection of the team's public export. Does not mirror CAD into the app.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='0f403dd8f3ad1f7d0dbe0c1bd23b24c210f41677';
const base=`https://raw.githubusercontent.com/frc1678/C2026-Public/${revision}/`;
const dir=new URL('../../../docs/staging/limestone-learning.local/',import.meta.url);
await fs.mkdir(dir,{recursive:true});
const config=await(await fetch(base+'assets/Robot_Comp/config.json')).json();
const files={};
for(const name of ['model.glb','model_0.glb','model_1.glb','model_2.glb','model_3.glb']){
 const url=base+'assets/Robot_Comp/'+name,response=await fetch(url);if(!response.ok)throw Error(`${name}: ${response.status}`);
 const buffer=Buffer.from(await response.arrayBuffer());await fs.writeFile(new URL(name,dir),buffer);
 files[name]={url,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')};
 const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
 await fs.writeFile(new URL(name+'.json',dir),JSON.stringify(json,null,2));
 console.log(name,buffer.length,'nodes',json.nodes.length,'meshes',json.meshes.length,JSON.stringify(json.nodes.filter(n=>n.children||/rio|pdp|pdh|mpm|breaker|radio|battery|limelight/i.test(n.name||'')).map(n=>n.name).slice(0,35)));
}
await fs.writeFile(new URL('../src/lib/limestoneManifest.json',import.meta.url),JSON.stringify({revision,source:`https://github.com/frc1678/C2026-Public/tree/${revision}/assets/Robot_Comp`,config,files},null,2)+'\n');
