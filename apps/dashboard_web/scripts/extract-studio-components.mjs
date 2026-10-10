// Reproducible extraction from the BSD-3-Clause AdvantageScope BananaSplitV4 archive.
// Usage: node scripts/extract-studio-components.mjs <unpacked archive directory>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
const directory=process.argv[2];if(!directory)throw Error('Provide the unpacked BananaSplitV4 directory');
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:application/octet-stream;base64,'+Buffer.from(result).toString('base64');this.onloadend?.();});}};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=[];
for(const [id,file,node,name] of [['neo','model.glb',164,'NEO Brushless Motor · REV-21-1650'],['neo550','model_2.glb',93,'NEO 550 · REV-21-1651'],['sparkmax','model_2.glb',27,'SPARK MAX · simplified team CAD']]){
 const bytes=fs.readFileSync(path.join(directory,file));const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
 let source;gltf.scene.traverse(o=>{if(gltf.parser.associations.get(o)?.nodes===node)source=o;});if(!source)throw Error('Missing node '+node);
 const root=new T.Group(),clone=source.clone(true);clone.matrix.copy(source.matrixWorld);clone.matrix.decompose(clone.position,clone.quaternion,clone.scale);root.add(clone);root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root);clone.position.sub(box.getCenter(new T.Vector3()));root.updateMatrixWorld(true);
 const output=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true}));const outputPath=`public/studio/components/${id}.glb`;fs.writeFileSync(outputPath,output);
 manifest.push({id,name,file:`/studio/components/${id}.glb`,node:0,originalNode:node,sourceFile:file,sourceName:source.name,sourceSha256:hash(bytes),sha256:hash(output),boundsMetres:box.getSize(new T.Vector3()).toArray(),source:'https://github.com/Mechanical-Advantage/AdvantageScopeAssets/releases/download/frc-6328-assets-v2/Robot_BananaSplitV4.zip',license:'/twin/2026/LICENSE.txt',coverage:'Source team CAD; no manufacturer dimensional certification or mass claim.'});
}
fs.writeFileSync('public/studio/components/banana-components.json',JSON.stringify(manifest,null,2));console.log(manifest.map(x=>({name:x.name,bounds:x.boundsMetres})));
