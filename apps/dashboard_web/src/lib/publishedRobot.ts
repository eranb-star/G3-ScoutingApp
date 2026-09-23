import {TWIN_CACHE,storeModel} from './twinCache';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import config from '../../public/twin/robots/6328-2026/config.json';
import provenance from '../../public/twin/robots/6328-2026/provenance.json';
export type PublishedRobot='kitbot'|'darwin';
export const DARWIN_PROFILE={robotId:'darwin' as const,length:.8763,width:.8509,height:.5592,speed:2,turn:1.8};
export async function loadDarwin(signal:AbortSignal){
 const root=new THREE.Group();root.name='6328 Darwin 2026 · published CAD';const components:THREE.Group[]=[];
 let cache:Cache|undefined;try{if(typeof caches!=='undefined')cache=await caches.open(TWIN_CACHE);}catch{}
 const assets=await Promise.all(Object.entries(provenance.files).map(async([name,entry])=>{const url=`/twin/robots/6328-2026/${name}`;const response=await cache?.match(url)??await fetch(url,{signal});if(!response.ok)throw Error('Darwin download failed');const data=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256||data.byteLength!==entry.bytes){await cache?.delete(url);throw Error('Darwin model checksum mismatch');}if(cache&&!signal.aborted)try{await storeModel(cache,url,data);}catch{}return {name,data};}));
 for(const {name,data} of assets){const model=(await new GLTFLoader().parseAsync(data,'')).scene;const index=name==='model.glb'?-1:Number(name.match(/_(\d)/)![1]);const setup=index<0?{rotations:config.rotations,position:config.position}:{rotations:config.components[index].zeroedRotations,position:config.components[index].zeroedPosition};
  for(const r of setup.rotations)model.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),r.degrees*Math.PI/180);model.position.fromArray(setup.position);model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
  if(index<0)root.add(model);else{const pivot=new THREE.Group();pivot.name=`Darwin component ${index}`;pivot.add(model);root.add(pivot);components[index]=pivot;}
 }
 // Team's DarwinMechanism3d poses. Hood held at zero; intake uses published CAD angle limits.
 const update=(on:boolean)=>poseDarwin(root,on);
 update(false);return {group:root,update};
}
export function poseDarwin(root:THREE.Group,on:boolean){const components=[0,1,2,3].map(i=>root.getObjectByName(`Darwin component ${i}`)!);const a=(on?17.4088627799:145.8170667799)*Math.PI/180;components[0].position.set(-.273,0,.486);components[1].position.set(12.480*.0254,0,.186);components[1].rotation.y=-a;components[2].position.set((12.480+7.204*Math.cos(a)+(7.204*Math.sin(a)-2.393)/Math.tan(70*Math.PI/180)+6.789)*.0254,0,.37);components[3].position.set(.01,0,.554692);}
