import {useEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {assetBuffer} from './FieldTwinCanvas';
import {FIELD_SEASONS} from '../lib/fieldSeasons';
import type {SeasonPackage} from '../lib/seasonPackage';
import {useLocalization} from '../lib/localization';

/** Orthographic, dimension-aligned real field CAD beneath the editable SVG overlay. */
export default function PlanningField({season,children,active}:{season:SeasonPackage;children:ReactNode;active:boolean}){
 const host=useRef<HTMLDivElement>(null),{pick}=useLocalization(),[status,setStatus]=useState('loading');
 useEffect(()=>{const element=host.current;if(!element||!active)return;let disposed=false,renderer:THREE.WebGLRenderer|undefined,model:THREE.Object3D|undefined;const abort=new AbortController();setStatus('loading');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#263540');scene.add(new THREE.HemisphereLight(0xffffff,0x69717b,2.4));const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(-4,-5,12);scene.add(light);
 const camera=new THREE.OrthographicCamera(-season.field.length/2,season.field.length/2,season.field.width/2,-season.field.width/2,.1,60);camera.up.set(0,1,0);camera.position.set(0,0,30);camera.lookAt(0,0,0);
 const draw=()=>{if(renderer&&!disposed&&element.clientWidth&&element.clientHeight){const aspect=element.clientWidth/element.clientHeight,fieldAspect=season.field.length/season.field.width;const width=aspect>fieldAspect?season.field.width*aspect:season.field.length,height=width/aspect;camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.setSize(element.clientWidth,element.clientHeight,false);renderer.render(scene,camera);}};const observer=new ResizeObserver(draw);observer.observe(element);
 const release=(root:THREE.Object3D)=>{root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();}}});};
 void(async()=>{const definition=FIELD_SEASONS.find(f=>f.year===season.season);if(!definition||Math.abs(definition.length-season.field.length)>.01||Math.abs(definition.width-season.field.width)>.01)throw Error('No matching field CAD');
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.domElement.setAttribute('aria-label','Verified field CAD top view');element.appendChild(renderer.domElement);
 const loaded=(await new GLTFLoader().parseAsync(await assetBuffer('field',abort.signal,definition),'')).scene;if(disposed){release(loaded);return;}model=loaded;
 for(const r of definition.rotations)loaded.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),r.degrees*Math.PI/180);
 scene.add(loaded);draw();setStatus('ready');
 })().catch(()=>{if(!disposed)setStatus('unavailable');});
 return()=>{disposed=true;abort.abort();observer.disconnect();if(model)release(model);renderer?.dispose();renderer?.domElement.remove();};
 },[active,season.season,season.field.length,season.field.width]);
 return <div className="ep-field-stage" style={{aspectRatio:`${season.field.length}/${season.field.width}`}}><div className="ep-real-field" ref={host}/>{children}{status!=='ready'&&<div className="ep-field-status" role="status">{status==='loading'?pick('Loading actual field…','טוען את המגרש האמיתי…'):pick('Field CAD unavailable. Route overlay only; retry by reopening this page.','CAD המגרש אינו זמין. מוצג המסלול בלבד; פתחו מחדש לניסיון נוסף.')}</div>}<span className="ep-field-caption">{pick('Actual field CAD · top view · reference game-piece layout','CAD המגרש · מבט על · סידור כדורים להמחשה')}</span></div>;
}
