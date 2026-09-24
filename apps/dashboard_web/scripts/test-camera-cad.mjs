import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';import * as THREE from 'three';
let code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/cameraCad.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
code=code.replace("from 'three'",'from '+JSON.stringify(new URL('../node_modules/three/build/three.module.js',import.meta.url).href));
const {occlusionSnapshot,meshVisibility,compareCoverageSets,disposeSnapshot}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const field=new THREE.Group(),robot=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(.1,2,2),new THREE.MeshBasicMaterial());wall.position.set(2,0,1);field.add(wall);
const f=occlusionSnapshot(field),r=occlusionSnapshot(robot),visible=meshVisibility(f,r),eye={x:0,y:0,z:1},target={x:4,y:0,z:1};
assert.equal(visible(eye,target,eye,target),false);assert.equal(visible({...eye,y:3},{...target,y:3},eye,target),true);
const panel=new THREE.Mesh(new THREE.BoxGeometry(.1,2,2),new THREE.MeshBasicMaterial());panel.position.set(.2,0,1);robot.add(panel);const r2=occlusionSnapshot(robot);assert.equal(meshVisibility(new THREE.Group(),r2)(eye,target,eye,target),false);
wall.visible=false;const empty=occlusionSnapshot(field);assert.equal(empty.children.length,0);
const result=compareCoverageSets(['a','b','c'],[[[1],[1],[]],[[],[2],[2]],[[1],[1],[]]],2,1);
assert.deepEqual(result[0].ids,['a','b']);assert.equal(result[0].covered,3);assert.equal(result[0].worstFailure,2);
assert.equal(compareCoverageSets(['a','b'],[[[1],[1],[1]],[[1],[],[]]],2,1)[0].ids.length,1,'fewest cameras meeting goal');
assert.throws(()=>compareCoverageSets(['a'],[[]],1),/Incomplete/);
[f,r,r2,empty].forEach(disposeSnapshot);console.log('PASS actual mesh occlusion, independent robot/field transforms, hidden parts, camera count target and single-camera failure coverage.');

const grid=new THREE.Group();for(let i=0;i<40;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.4,.8),new THREE.MeshBasicMaterial());mesh.position.set((i%8)-3.5,Math.floor(i/8)-2,.7);grid.add(mesh);}const snapshot=occlusionSnapshot(grid),accelerated=meshVisibility(snapshot,new THREE.Group());
for(let i=0;i<120;i++){const from=new THREE.Vector3(-5,Math.sin(i*.71)*4,.2+(i%5)*.3),to=new THREE.Vector3(5,Math.cos(i*.37)*4,1);const ray=new THREE.Raycaster(from,to.clone().sub(from).normalize(),.002,from.distanceTo(to)-.025);const expected=ray.intersectObject(snapshot,true).length===0;assert.equal(accelerated(from,to,from,to),expected,'accelerated CAD must match direct triangles');}
disposeSnapshot(snapshot);console.log('PASS accelerated mesh hierarchy matches direct raycasting across 120 rays');
