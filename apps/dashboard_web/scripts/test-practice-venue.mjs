import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url),{build}=createRequire(req.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:String.raw`
import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {PracticeRun} from './src/lib/twinPractice';
import {START} from './src/lib/conceptTwin';
import {competitionVenue,loadVenue} from './src/lib/twinVenue';
import {mapCarpetInMetres} from './src/lib/twinSceneStyle';
const initial={...START,scores:[0,0],shots:0,balls:[{id:1,x:0,y:0,z:.1}]};
const run=new PracticeRun(initial,'Keyboard / touch','settings');
initial.balls[0].x=99;assert.equal(run.frames[0].pose.balls[0].x,0,'detached snapshot');
for(let i=1;i<=3600;i++)run.step({...START,tick:i,x:i/60,distance:i/120,scores:[6,0],shots:10,balls:[{id:1,x:i/60,y:0,z:.1}]},true);
assert.equal(run.active,false);assert.equal(run.seconds,60);assert.equal(run.frames.length,601);assert.equal(run.result.scored,6);assert.equal(run.result.accuracy,.6);assert.equal(run.result.distance,30);run.step(START,false);assert.equal(run.frames.length,601,'bounded after completion');
assert.ok(Math.abs(run.frame(12.35).pose.x-12.35)<1e-9);assert.ok(Math.abs(run.frame(12.35).pose.balls[0].x-12.35)<1e-9);assert.equal(run.frame(100).seconds,60);
const aborted=new PracticeRun({...START,shots:0},'Quest controllers','s');aborted.step({...START,x:1},false);aborted.finish({...START,x:1});assert.equal(aborted.result.complete,false);assert.equal(aborted.result.accuracy,null);assert.equal(aborted.frame(1).pose.x,1);
const root=new T.Group(),mesh=new T.Mesh(new T.PlaneGeometry(2,4));mesh.name='Playing_Field_Carpet';mesh.position.set(3,4,0);root.add(mesh);const original=mesh.geometry;mapCarpetInMetres(root);assert.notEqual(mesh.geometry,original);const p=new T.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),0).applyMatrix4(mesh.matrixWorld);assert.equal(mesh.geometry.getAttribute('uv').getX(0),p.x*2);assert.equal(mesh.geometry.getAttribute('uv').getY(0),p.y*2);
const bytes=fs.readFileSync('public/twin/2026/field-optimized.glb');const field=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');let carpets=0;field.scene.traverse(o=>{if(o instanceof T.Mesh&&/Playing.Field.Carpet/i.test(o.name))carpets++;});assert.ok(carpets>0,'real field carpet is recognized');mapCarpetInMetres(field.scene);
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const v=competitionVenue(16.54,8.07);v.update('competition','low',false);assert.equal(v.group.visible,true);v.update('field','high',true);assert.equal(v.group.visible,false);
v.group.updateMatrixWorld(true);for(const side of [-1,1]){const hits=new T.Raycaster(new T.Vector3(0,0,4.8),new T.Vector3(side,0,0)).intersectObject(v.group,true);assert.ok(hits[0]?.object.material.map,'scoreboard must be in front of its opaque backing panel');}
const m=new T.Matrix4(),box=new T.Box3();v.group.traverse(o=>{if(o instanceof T.InstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);box.setFromCenterAndSize(new T.Vector3(),new T.Vector3(1,1,1)).applyMatrix4(m);assert.ok(box.max.z<0||box.min.z>7||box.max.x< -8.27||box.min.x>8.27||box.max.y< -4.035||box.min.y>4.035,'venue stays outside playing space');}});
globalThis.localStorage={getItem:()=>{throw Error('blocked')}};assert.equal(loadVenue(),'competition');
console.log('PASS bounded 60s recording, exact results, pause-by-no-step, detached/interpolated replay, early finish, metre carpet mapping, venue clearance and storage fallback');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const file=path.join(os.tmpdir(),'g3-practice-venue-test.mjs');await fs.writeFile(file,result.outputFiles[0].text);await import(pathToFileURL(file));

