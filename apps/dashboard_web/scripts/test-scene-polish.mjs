import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url),{build}=createRequire(req.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:String.raw`
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {driverCamera,DRIVER_STATIONS_2026} from './src/lib/twinDriverView';
import {carpetTexture,styleReferenceModel,intakePresentation} from './src/lib/twinSceneStyle';
const bytes=fs.readFileSync('public/twin/2026/robot-optimized.glb');
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
scene.rotation.x=Math.PI/2;scene.rotateOnWorldAxis(new T.Vector3(0,0,1),Math.PI/2);scene.position.set(-.3,0,.05);scene.updateMatrixWorld(true);
const frame=scene.getObjectByName('am-3920_AM14U_Family_End_Plate_Frame_Opening');assert.ok(frame);
const bounds=new T.Box3().setFromObject(frame),a=intakePresentation(.9,.3,true);
assert.ok(a.mountX>=bounds.min.x&&a.mountX<=bounds.max.x,'mount intersects reference frame');assert.ok(.18>=bounds.min.z&&.18<=bounds.max.z);
for(const length of [.4,.9,1.4])for(const reach of [.15,.3,.6])for(const ref of [false,true]){const a=intakePresentation(length,reach,ref);assert.ok(a.span>0);assert.ok(Math.abs(a.pivotX+a.span*Math.cos(a.angle)-a.rollerX)<1e-9);assert.ok(Math.abs(a.pivotZ-a.span*Math.sin(a.angle)-a.rollerZ)<1e-9);}
const robotHeight=new T.Box3().setFromObject(scene).max.z;
console.log('Reference robot height',robotHeight);
for(const height of [.2,.4,.65,robotHeight])for(const length of [.4,.9,1.4])for(const reach of [.15,.3,.6])for(const ref of [false,true]){
 const a=intakePresentation(length,reach,ref,height);
 for(let i=0;i<=100;i++){const angle=a.stowAngle+(a.angle-a.stowAngle)*i/100;assert.ok(a.pivotZ-a.span*Math.sin(angle)+.075<=height+1e-9,'roller and accent stay below robot top throughout fold');}
 assert.ok(a.pivotZ+.055<=height,'hinge below robot top');
}
const config=JSON.parse(fs.readFileSync('public/twin/2026/field-config.json','utf8'));
assert.deepEqual(DRIVER_STATIONS_2026.blue,config.driverStations.slice(0,3));assert.deepEqual(DRIVER_STATIONS_2026.red,config.driverStations.slice(3));
for(const alliance of ['red','blue'])for(const n of [1,2,3]){const d=driverCamera('driver'+n,{alliance,eyeHeight:1.65,look:0,pitch:-5},16/9);assert.ok(Math.abs(d.x)>8.8);assert.equal(d.z,1.65);assert.ok(d.fov>50&&d.fov<60);const turned=driverCamera('driver'+n,{alliance,eyeHeight:1.65,look:60,pitch:-40},.5);assert.deepEqual([turned.x,turned.y,turned.z],[d.x,d.y,d.z],'looking never moves the driver');assert.equal(turned.fov,85);}
const material=new T.MeshStandardMaterial({color:'red',metalness:1,roughness:.2}),root=new T.Group(),rubber=new T.Mesh(new T.BoxGeometry(),material),paint=new T.Mesh(new T.BoxGeometry(),material);rubber.name='Timing_Belt';paint.name='Painted_Cover';root.add(rubber,paint);
const carpet=carpetTexture();styleReferenceModel(root,carpet);assert.notEqual(rubber.material,material);assert.equal(rubber.material.metalness,0);assert.equal(paint.material,material);assert.equal(material.roughness,.2,'shared source unchanged');assert.equal(rubber.material.color.getHex(),material.color.getHex());
const carpetMesh=new T.Mesh(new T.PlaneGeometry(),material);carpetMesh.name='FE-2026-01_Playing_Field_Carpet';root.add(carpetMesh);styleReferenceModel(root,carpet);assert.equal(carpetMesh.material.map,carpet);assert.equal(carpetMesh.material.roughness,1);
assert.deepEqual(carpet.image.data,carpetTexture().image.data,'texture is repeatable');
console.log('PASS real-CAD mounting, deployed roller alignment across dimensions, material isolation, carpet mapping and deterministic texture');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const file=path.join(os.tmpdir(),'g3-scene-test.mjs');await fs.writeFile(file,result.outputFiles[0].text);await import(pathToFileURL(file));
