import * as THREE from 'three';
import type {PublishedRobot} from './publishedRobot';
export const ALLIANCE_COLORS={red:'#c72235',blue:'#176bce'} as const;
// Exact meshes inspected in the pinned GLBs. Never recolor every blue material:
// Darwin's blue is shared with drivetrain, gearbox and tower parts.
export function isBumperMesh(mesh:THREE.Mesh,id:PublishedRobot){
 const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
 return id==='darwin'?mesh.name==='Part_5':id==='limestone'?mesh.name==='Part_7_1'&&materials.some(m=>m.name==='mat_41'):materials.some(m=>m.name==='mat_6');
}
const bindings=new WeakMap<THREE.Object3D,{materials:THREE.MeshStandardMaterial[];alliance?:string}>();
export function setAllianceBumpers(root:THREE.Object3D,id:PublishedRobot,alliance:'red'|'blue'){
 let binding=bindings.get(root);
 if(!binding){binding={materials:[]};root.traverse(o=>{if(!(o instanceof THREE.Mesh)||!isBumperMesh(o,id))return;const copy=(m:THREE.Material)=>{if(!(m instanceof THREE.MeshStandardMaterial))return m;const clone=m.clone();binding!.materials.push(clone);return clone;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});bindings.set(root,binding);}
 if(binding.alliance===alliance)return;
 binding.materials.forEach(m=>m.color.set(ALLIANCE_COLORS[alliance]));binding.alliance=alliance;
}
