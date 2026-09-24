import * as THREE from 'three';
import type {VisibilityGeometry} from './cameraPlanning';
/** Independent geometry snapshots: double-sided opaque surfaces are conservative for occlusion. */
export function occlusionSnapshot(source:THREE.Object3D){
 source.updateWorldMatrix(true,true);
 const root=new THREE.Group(),inverse=source.matrixWorld.clone().invert();
 source.traverse(o=>{if(!(o instanceof THREE.Mesh))return;if(o instanceof THREE.SkinnedMesh)throw Error('Skinned meshes need a fixed-pose export for CAD analysis');
  let visible=true;for(let parent:THREE.Object3D|null=o;parent;parent=parent.parent){if(!parent.visible)visible=false;if(parent===source)break;}if(!visible)return;
  const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const copy=m.clone();copy.side=THREE.DoubleSide;copy.transparent=false;copy.opacity=1;return copy;});
  const count=o instanceof THREE.InstancedMesh?o.count:1;if(count>5000)throw Error('Too many mesh instances for camera analysis');
  for(let i=0;i<count;i++){const mesh=new THREE.Mesh(o.geometry,Array.isArray(o.material)?materials:materials[0]);mesh.matrixAutoUpdate=false;mesh.matrix.copy(inverse).multiply(o.matrixWorld);if(o instanceof THREE.InstancedMesh){const instance=new THREE.Matrix4();o.getMatrixAt(i,instance);mesh.matrix.multiply(instance);}root.add(mesh);}
 });root.updateMatrixWorld(true);return root;
}
export function meshVisibility(field:THREE.Object3D,robot:THREE.Object3D):VisibilityGeometry{
 const ray=new THREE.Raycaster(),a=new THREE.Vector3(),b=new THREE.Vector3();
 const index=(root:THREE.Object3D)=>{root.updateMatrixWorld(true);const entries:{mesh:THREE.Mesh;box:THREE.Box3}[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();entries.push({mesh:o,box:o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld)});}});return entries;};
 const fields=index(field),robots=index(robot);
 type Entry=typeof fields[number];type Node={box:THREE.Box3;items?:Entry[];left?:Node;right?:Node};
 const tree=(items:Entry[]):Node=>{const box=new THREE.Box3();items.forEach(i=>box.union(i.box));if(items.length<=8)return {box,items};const size=box.getSize(new THREE.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';items.sort((a,b)=>(a.box.min[axis]+a.box.max[axis])-(b.box.min[axis]+b.box.max[axis]));const middle=Math.floor(items.length/2);return {box,left:tree(items.slice(0,middle)),right:tree(items.slice(middle))};};
 const fieldTree=tree(fields),robotTree=tree(robots),entryPoint=new THREE.Vector3();
 const hit=(node:Node):boolean=>{if(!ray.ray.intersectBox(node.box,entryPoint)||entryPoint.distanceTo(ray.ray.origin)>ray.far&&!node.box.containsPoint(ray.ray.origin))return false;if(node.items)return node.items.some(item=>ray.ray.intersectsBox(item.box)&&ray.intersectObject(item.mesh,false).length>0);return hit(node.left!)||hit(node.right!);};
 const clear=(root:THREE.Object3D,from:{x:number;y:number;z:number},to:{x:number;y:number;z:number})=>{
  a.set(from.x,from.y,from.z);b.set(to.x,to.y,to.z).sub(a);const length=b.length();if(length<.04)return false;
  ray.set(a,b.normalize());ray.near=.002;ray.far=length-.025;
  return !hit(root===field?fieldTree:robotTree);
 };
 return (eye,target,localEye,localTarget)=>clear(field,eye,target)&&clear(robot,localEye,localTarget);
}
export function disposeSnapshot(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();});}
export type CoverageRow={ids:string[];covered:number;multiTag:number;worstFailure:number;total:number;meetsTarget:boolean};
export function compareCoverageSets(ids:string[],coverage:number[][][],maxCount:number,target=.9){
 if(!ids.length||ids.length>12||ids.length!==coverage.length||new Set(ids).size!==ids.length||!Number.isInteger(maxCount)||maxCount<1||maxCount>3||!Number.isFinite(target)||target<0||target>1)throw Error('Invalid camera comparison');
 const total=coverage[0].length;if(!total||coverage.some(c=>c.length!==total))throw Error('Incomplete camera samples');
 const count=(selected:number[])=>{let covered=0,multiTag=0;for(let n=0;n<total;n++){const tags=new Set(selected.flatMap(i=>coverage[i][n]));if(tags.size)covered++;if(tags.size>=2)multiTag++;}return {covered,multiTag};};
 const rows:CoverageRow[]=[];
 function visit(start:number,chosen:number[]){if(chosen.length){const result=count(chosen);rows.push({ids:chosen.map(i=>ids[i]),...result,total,meetsTarget:result.covered/total>=target,worstFailure:Math.min(...chosen.map(i=>count(chosen.filter(j=>j!==i)).covered))});}if(chosen.length===maxCount)return;for(let i=start;i<ids.length;i++)visit(i+1,[...chosen,i]);}
 visit(0,[]);
 return rows.sort((a,b)=>Number(b.meetsTarget)-Number(a.meetsTarget)||(a.meetsTarget?a.ids.length-b.ids.length:0)||b.covered-a.covered||b.worstFailure-a.worstFailure||b.multiTag-a.multiTag||a.ids.join().localeCompare(b.ids.join()));
}
