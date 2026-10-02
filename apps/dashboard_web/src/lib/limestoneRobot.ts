import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import limestone from './limestoneManifest.json';
import {TWIN_CACHE,storeModel} from './twinCache';
export function disposeLearningModel(root:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});}}});
 geometries.forEach(v=>v.dispose());materials.forEach(v=>v.dispose());textures.forEach(v=>v.dispose());
}
export async function loadLimestone(signal:AbortSignal){
 let cache:Cache|undefined;try{if(typeof caches!=='undefined')cache=await caches.open(TWIN_CACHE);}catch{}
 const root=new THREE.Group();root.name='1678 Limestone 2026';
 try{
  // Sequential files limit peak memory and leave no unfinished parses on failure.
  for(const [name,file] of Object.entries(limestone.files)){
   const response=await cache?.match(file.url)??await fetch(file.url,{signal});if(!response.ok)throw Error(`Model download ${response.status}`);
   const data=await response.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');
   if(data.byteLength!==file.bytes||hash!==file.sha256){await cache?.delete(file.url);throw Error('Model integrity mismatch');}
   if(cache&&!signal.aborted)try{await storeModel(cache,file.url,data);}catch{}
   if(signal.aborted)throw new DOMException('Aborted','AbortError');
   const model=(await new GLTFLoader().parseAsync(data,'')).scene;
   const index=name==='model.glb'?-1:Number(name.match(/_(\d)/)![1]);
   const config=index<0?{rotations:limestone.config.rotations,position:limestone.config.position}:{rotations:limestone.config.components[index].zeroedRotations,position:limestone.config.components[index].zeroedPosition};
   for(const r of config.rotations)model.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),THREE.MathUtils.degToRad(r.degrees));
   model.position.fromArray(config.position);
   const pivot=new THREE.Group();pivot.name=`Limestone component ${index}`;pivot.add(model);root.add(pivot);
   // Published CompConstants reference offsets; stationary, unextended inspection pose.
   if(index===0)pivot.position.set(.309,-.309,.169);
   if(index===3)pivot.position.set(-.295275,0,.450950);
   if(signal.aborted)throw new DOMException('Aborted','AbortError');
  }
  return {group:root};
 }catch(error){disposeLearningModel(root);throw error;}
}

// Pinned RobotConstants selects Epsilon. HopperTracker couples horizontal extension
// to the intake angle; vertical expansion is independently driven by the climber.
export const LIMESTONE_HOPPER_TRAVEL=.303211;
export function poseLimestone(root:THREE.Group,on:boolean){
 const angle=on?0:130;
 const intake=root.getObjectByName('Limestone component 0');if(intake)intake.rotation.y=-angle*Math.PI/180;
 const extension=root.getObjectByName('Limestone component 2');if(extension)extension.position.x=LIMESTONE_HOPPER_TRAVEL*(1-angle/130);
}
