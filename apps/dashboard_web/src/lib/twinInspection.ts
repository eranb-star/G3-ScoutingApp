import * as THREE from 'three';
import type {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
export function robotInspection(element:HTMLElement,robot:THREE.Group,camera:THREE.PerspectiveCamera,controls:OrbitControls,active:()=>boolean,report:(name:string)=>void){
 const hidden=new Map<THREE.Object3D,boolean>();let selected:THREE.Mesh|undefined,down={x:0,y:0};
 const visible=(o:THREE.Object3D):boolean=>o.visible&&(!o.parent||o===robot||visible(o.parent));
 function restore(){hidden.forEach((v,o)=>o.visible=v);hidden.clear();selected=undefined;report('');}
 function focus(o:THREE.Object3D){const b=new THREE.Box3();o.updateWorldMatrix(true,true);o.traverse(part=>{if(part instanceof THREE.Mesh&&visible(part)&&!(part instanceof THREE.InstancedMesh))b.union(new THREE.Box3().setFromObject(part));});const center=b.getCenter(new THREE.Vector3());if(b.isEmpty())return;const distance=Math.max(.008,b.getSize(new THREE.Vector3()).length()*1.4);const direction=camera.position.clone().sub(controls.target).normalize();camera.position.copy(center).addScaledVector(direction,distance);controls.target.copy(center);controls.update();}
 const start=(e:PointerEvent)=>down={x:e.clientX,y:e.clientY};
 const end=(e:PointerEvent)=>{if(!active()||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=element.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=ray.intersectObject(robot,true).find(h=>h.object instanceof THREE.Mesh&&visible(h.object));if(!hit)return;selected=hit.object as THREE.Mesh;report(selected.name||selected.parent?.name||'CAD part');focus(selected);};
 element.addEventListener('pointerdown',start);element.addEventListener('pointerup',end);
 return {focusRobot:()=>{restore();focus(robot);},restore,hide:()=>{if(selected){hidden.set(selected,selected.visible);selected.visible=false;selected=undefined;report('');}},isolate:()=>{if(!selected)return;robot.traverse(o=>{if(o instanceof THREE.Mesh&&o!==selected&&visible(o)){if(!hidden.has(o))hidden.set(o,o.visible);o.visible=false;}});},dispose:()=>{restore();element.removeEventListener('pointerdown',start);element.removeEventListener('pointerup',end);}};
}
