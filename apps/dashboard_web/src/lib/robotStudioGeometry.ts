import * as T from 'three';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {CadGeometry} from '../components/CadDesignViewer';
import {validateShape,type Shape,type StudioPart,type Vec3} from './robotStudio';

export function stockGeometry(s:Shape):T.BufferGeometry {
 validateShape(s);
 if(s.kind==='panel')return new T.BoxGeometry(s.width,s.height,s.length);
 if(s.kind==='rod'||s.kind==='hex'){const radius=s.kind==='hex'?s.width/Math.sqrt(3):s.width/2;const g=new T.CylinderGeometry(radius,radius,s.length,s.kind==='hex'?6:48);g.rotateX(Math.PI/2);return g;}
 const shape=new T.Shape();
 if(s.kind==='tube'||s.kind==='spacer'){shape.absarc(0,0,s.width/2,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,s.inner/2,0,Math.PI*2,true);shape.holes.push(hole);}
 else if(s.kind==='trapezoid'){shape.moveTo(-s.width/2,-s.height/2);shape.lineTo(s.width/2,-s.height/2);shape.lineTo(s.offset+s.top/2,s.height/2);shape.lineTo(s.offset-s.top/2,s.height/2);shape.closePath();}
 else {shape.moveTo(-s.width/2,-s.height/2);shape.lineTo(s.width/2,-s.height/2);shape.lineTo(s.width/2,s.kind==='angle'?-s.height/2+s.wall:s.height/2);
  if(s.kind==='angle'){shape.lineTo(-s.width/2+s.wall,-s.height/2+s.wall);shape.lineTo(-s.width/2+s.wall,s.height/2);}
  shape.lineTo(-s.width/2,s.height/2);shape.closePath();
  if(s.kind==='boxTube'){const hole=new T.Path();hole.moveTo(-s.width/2+s.wall,-s.height/2+s.wall);hole.lineTo(-s.width/2+s.wall,s.height/2-s.wall);hole.lineTo(s.width/2-s.wall,s.height/2-s.wall);hole.lineTo(s.width/2-s.wall,-s.height/2+s.wall);hole.closePath();shape.holes.push(hole);}
 }
 const geometry=new T.ExtrudeGeometry(shape,{depth:s.length,bevelEnabled:false,curveSegments:32});geometry.translate(0,0,-s.length/2);geometry.computeVertexNormals();return geometry;
}
export function matrix(part:StudioPart){return new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(1,1,1));}
export function worldMatrix(parts:StudioPart[],id:string,seen=new Set<string>()):T.Matrix4 {if(seen.has(id))throw Error('Cyclic hierarchy');seen.add(id);const part=parts.find(p=>p.id===id);if(!part)throw Error('Unknown component');return part.parent?worldMatrix(parts,part.parent,seen).multiply(matrix(part)):matrix(part);}
export function localPose(world:T.Matrix4,parent:T.Matrix4):{position:Vec3;rotation:Vec3}{const position=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();parent.clone().invert().multiply(world).decompose(position,q,scale);const e=new T.Euler().setFromQuaternion(q);return {position:position.toArray() as Vec3,rotation:[e.x,e.y,e.z]};}
export function reparent(parts:StudioPart[],id:string,parent:string|null):StudioPart[]{const world=worldMatrix(parts,id),pose=localPose(world,parent?worldMatrix(parts,parent):new T.Matrix4());return parts.map(p=>p.id===id?{...p,parent,...pose,attachment:'unresolved'}:p);}
export function disposeObject(object:T.Object3D){object.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)v.dispose();m.dispose();}}});}
function cloneMaterial(m:T.Material){const copy=m.clone();for(const [key,value] of Object.entries(copy))if(value instanceof T.Texture)(copy as unknown as Record<string,unknown>)[key]=value.clone();return copy;}
export function cloneGeometryObject(object:T.Object3D){const clone=object.clone(true);clone.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>cloneMaterial(m)):cloneMaterial(o.material);}});return clone;}
/** Paths belong to an immutable asset snapshot, never to a newer source revision. */
export function componentNodes(root:T.Object3D){const rows:{path:number[];name:string}[]=[];const visit=(o:T.Object3D,path:number[])=>{if(path.length&&o.name)rows.push({path,name:o.name});o.children.forEach((child,i)=>visit(child,[...path,i]));};visit(root,[]);return rows;}
export function extractComponent(root:T.Object3D,path:number[]){root.updateMatrixWorld(true);let node=root;for(const index of path){if(!Number.isInteger(index)||index<0||!node.children[index])throw Error('Source component is missing from this exact snapshot');node=node.children[index];}const result=cloneGeometryObject(node);result.matrix.copy(node.matrixWorld);result.matrix.decompose(result.position,result.quaternion,result.scale);const wrapper=new T.Group();wrapper.add(result);return wrapper;}
function bounded(object:T.Object3D){let vertices=0;object.traverse(o=>{if(o instanceof T.Mesh){vertices+=o.geometry.getAttribute('position')?.count??0;const a=o.geometry.getAttribute('position');for(let i=0;a&&i<a.count;i++)if(![a.getX(i),a.getY(i),a.getZ(i)].every(Number.isFinite))throw Error('Invalid vertex');}});if(vertices>3_000_000)throw Error('Model exceeds 3 million vertices; export a lighter model');if(!vertices)throw Error('No mesh geometry in file');const box=new T.Box3().setFromObject(object);if(box.isEmpty()||!Number.isFinite(box.getSize(new T.Vector3()).length()))throw Error('Invalid model bounds');return object;}
/** Only self-contained static GLB. No external URI requests, rigs or unimported animation. */
export async function loadUpload(buffer:ArrayBuffer,format:'glb'|'stl',scale:number):Promise<T.Object3D>{
 if(buffer.byteLength>40*1024*1024)throw Error('Model exceeds 40 MB');
 if(format==='stl')return wrapScaled(new STLLoader().parse(buffer),scale);
 const view=new DataView(buffer);if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid GLB');
 if(view.getUint32(16,true)!==0x4e4f534a)throw Error('GLB JSON header missing');const size=view.getUint32(12,true);if(size>buffer.byteLength-20)throw Error('Invalid GLB length');const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,size)));
 if([...(json.buffers||[]),...(json.images||[])].some(x=>x.uri)||json.animations?.length||json.skins?.length||json.extensionsRequired?.length)throw Error('Use a self-contained static GLB without external files, animation, skins or required extensions');
 const manager=new T.LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('blob:'))throw Error('External model resources are not allowed');return url;});const gltf=await new GLTFLoader(manager).parseAsync(buffer,'');const root=new T.Group();root.add(gltf.scene);root.rotateX(Math.PI/2);root.scale.setScalar(scale);return bounded(root);
}
function wrapScaled(geometry:T.BufferGeometry,scale:number){const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xb3c5d4,roughness:.55}));mesh.scale.setScalar(scale);return bounded(mesh);}
export function onshapeObject(geometry:CadGeometry){if(geometry.units!=='m'||!geometry.meshes.length)throw Error('This source has no solid mesh to place');const root=new T.Group();for(const item of geometry.meshes){if(item.positions.length%9||item.positions.length>9_000_000||!item.positions.every(Number.isFinite))throw Error('Invalid CAD mesh');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(item.positions,3));g.computeVertexNormals();const mesh=new T.Mesh(g,new T.MeshStandardMaterial({color:0xaac4d8,roughness:.5}));mesh.name=item.name;if(item.transform){if(item.transform.length!==16||!item.transform.every(Number.isFinite))throw Error('Invalid CAD transform');mesh.applyMatrix4(new T.Matrix4().fromArray(item.transform).transpose());}root.add(mesh);}return bounded(root);}
