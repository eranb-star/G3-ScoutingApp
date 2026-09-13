import {TWIN_CACHE,storeModel} from '../lib/twinCache';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FieldSeason} from '../lib/fieldSeasons';
import {RobotModel} from '../lib/robotModel';
import {Concept,OBSTACLES,Pose} from '../lib/conceptTwin';

export type ModelMetrics={length:number;width:number;height:number;triangles:number};
type Props={onModelMetrics:(m:ModelMetrics|null)=>void;season:FieldSeason;custom?:RobotModel;pose:Pose;concept:Concept;detailed:boolean;kitbot:boolean;view:'orbit'|'top'|'follow';path:Pose[];onStatus:(s:string)=>void;onFps:(fps:number)=>void};
const CACHE=TWIN_CACHE;
const assets={field:{url:'/twin/2026/field-optimized.glb',bytes:19627748,hash:'088126b167906ca95e7b21a76a430a64199103d1ea184a121b1cf52e984b75e8'},robot:{url:'/twin/2026/robot-optimized.glb',bytes:16177620,hash:'053caf847815cb163632b8f858f5b261e589cb9abae3819b502c016fb57238b8'}};
export async function clearTwinCache(){if('caches' in window)await Promise.all([caches.delete(CACHE),caches.delete('g3-twin-2026-v2'),caches.delete('g3-twin-2026-v3')]);}
async function assetBuffer(which:keyof typeof assets,signal:AbortSignal,season:FieldSeason){
 const a=which==='field'?season:assets.robot;let cached:Cache|undefined;try{await Promise.all([caches.delete('g3-twin-2026-v2'),caches.delete('g3-twin-2026-v3')]);cached=await caches.open(CACHE);}catch{/* Private browsing may disable cache. */}
 let response=await cached?.match(a.url);if(!response){response=await fetch(a.url,{signal});if(!response.ok)throw Error('Asset download failed');}
 const data=await response.arrayBuffer();if(data.byteLength!==a.bytes)throw Error('Model size mismatch');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==a.hash){await cached?.delete(a.url);throw Error('Model integrity check failed');}
 if(!signal.aborted)try{if(cached)await storeModel(cached,a.url,data);}catch{/* Cache quota failure never blocks the viewer. */}
 return data;
}
export default function FieldTwinCanvas(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const season=props.season;const field={length:season.length,width:season.width};const element=host.current!;let disposed=false,frame=0,frames=0,last=performance.now();const abort=new AbortController();
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{latest.current.onStatus('WebGL unavailable — use the 2D view below.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',`${season.year} field and robot 3D view; rotate by dragging, zoom with scroll.`);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#111b2b');
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;studio.dispose();pmrem.dispose();
  let resolution=1,slowWindows=0;
  const camera=new THREE.PerspectiveCamera(43,1,.05,150);camera.up.set(0,0,1);camera.position.set(-12,-15,15);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.03;controls.minDistance=2;controls.maxDistance=80;
  scene.add(new THREE.HemisphereLight(0xe6f1ff,0x747483,3));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-4,-6,15);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.MeshStandardMaterial({color:0x162336,roughness:1}));ground.position.z=-.06;scene.add(ground);
  const simplified=new THREE.Group();scene.add(simplified);
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,color:number,parent:THREE.Object3D)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),new THREE.MeshStandardMaterial({color,roughness:.75}));m.position.set(x,y,z);parent.add(m);return m;};
  box(0,0,-.02,field.length,field.width,.04,0x596773,simplified);
  [-1,1].forEach(side=>{box(side*(field.length/2),0,.25,.06,field.width,.5,side<0?0x2581df:0xe65662,simplified);box(0,side*field.width/2,.25,field.length,.06,.5,0xa7b9c9,simplified);});
  (season.year===2026?OBSTACLES:[]).forEach((o,i)=>box(o.x,o.y,.65,o.w,o.h,1.3,i%2?0xc93951:0x176daf,simplified));
  const robot=new THREE.Group(),concept=new THREE.Group(),kit=new THREE.Group();robot.add(concept,kit);scene.add(robot);
  const chassis=box(0,0,.2,1,1,.24,0xe30095,concept),mast=box(0,0,.4,.5,.45,.35,0xdde5ec,concept);
  // Team-number plates sit just outside the reference bumper faces.
  function bumperNumbers(parent:THREE.Group,length:number,width:number,cx=0,cy=0,z=.18){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
   const ctx=canvas.getContext('2d')!;ctx.fillStyle='#164bc6';ctx.fillRect(0,0,512,160);ctx.fillStyle='white';ctx.font='bold 126px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('6740',256,86);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const material=new THREE.MeshBasicMaterial({map:texture});const group=new THREE.Group();parent.add(group);
   for(const [x,y,angle,span] of [[length/2+.004,0,Math.PI/2,width],[-length/2-.004,0,-Math.PI/2,width],[0,width/2+.004,Math.PI,length],[0,-width/2-.004,0,length]]){
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(span*.98,.20),material);plate.rotation.set(Math.PI/2,0,0);plate.rotateOnWorldAxis(new THREE.Vector3(0,0,1),angle);plate.position.set(cx+x,cy+y,z);group.add(plate);
   }return group;
  }
  const conceptNumbers=bumperNumbers(concept,1,1);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,.8),1,0xffd65b,.18,.13);robot.add(arrow);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x151b25});
  for(const x of [-.35,.35])for(const y of [-.32,.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.1,14),wheelMat);wheel.rotation.x=Math.PI/2;wheel.position.set(x,y,.1);concept.add(wheel);}
  const pathGeometry=new THREE.BufferGeometry(),pathMaterial=new THREE.LineBasicMaterial({color:0x5be1cf});const line=new THREE.Line(pathGeometry,pathMaterial);scene.add(line);let previousPath:Pose[]|null=null;
  const loader=new GLTFLoader();let fieldStarted=false,robotStarted=false;
  const custom=new THREE.Group();robot.add(custom);let customData:ArrayBuffer|undefined,customGeneration=0;
  function disposeModel(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){Object.values(m).forEach(t=>{if(t instanceof THREE.Texture)t.dispose();});m.dispose();}}});}
  function loadCustom(data:ArrayBuffer){latest.current.onModelMetrics(null);custom.children.forEach(disposeModel);custom.clear();const generation=++customGeneration;const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('blob:'))throw Error('External model resources are not supported');return url;});void new GLTFLoader(manager).parseAsync(data,'').then(g=>{if(disposed||generation!==customGeneration){disposeModel(g.scene);return;}custom.children.forEach(disposeModel);custom.clear();const model=g.scene;model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);if(bounds.isEmpty()){disposeModel(model);throw Error('Empty robot model');}const center=bounds.getCenter(new THREE.Vector3());model.position.set(-center.x,-center.y,-bounds.min.z);custom.add(model);const size=bounds.getSize(new THREE.Vector3());let triangles=0;model.traverse(o=>{if(o instanceof THREE.Mesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position')?.count??0)/3;});latest.current.onModelMetrics({length:size.x,width:size.y,height:size.z,triangles:Math.round(triangles)});latest.current.onStatus('Robot model loaded. Check scale and orientation, then save on this device.');}).catch(()=>{if(!disposed&&generation===customGeneration)latest.current.onStatus('Robot model could not load. Export an uncompressed, self-contained GLB.');});}

  function load(which:'field'|'robot'){
   latest.current.onStatus(which==='field'?`Loading ${season.year} field · ${(season.bytes/1e6).toFixed(1)} MB…`:'Loading KitBot · 16.2 MB…');
   void assetBuffer(which,abort.signal,season).then(data=>loader.parseAsync(data,'')).then(gltf=>{
    if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});return;}
    const model=gltf.scene;for(const r of which==='field'?season.rotations:[{axis:'x',degrees:90}])model.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),r.degrees*Math.PI/180);
    if(which==='field'){model.name='detailed-field';scene.add(model);simplified.visible=false;}
    else{model.rotateOnWorldAxis(new THREE.Vector3(0,0,1),Math.PI/2);model.position.set(-.3,0,.05);kit.add(model);kit.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(model).applyMatrix4(kit.matrixWorld.clone().invert()),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());bumperNumbers(kit,size.x,size.y,center.x,center.y,b.min.z+.25);}
    latest.current.onStatus(which==='field'?`${season.year} field model loaded · checksum verified`:'2026 KitBot loaded · checksum verified');
   }).catch(error=>{if(!disposed&&error.name!=='AbortError')latest.current.onStatus('Detailed model unavailable. Simplified view remains usable; check connection and reopen 3D to retry.');});
  }
  const resize=()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.position.set(-12,-15,15).multiplyScalar(Math.max(1,1.15/camera.aspect));camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const render=()=>{
   if(disposed)return;const p=latest.current;
   if(p.detailed&&!fieldStarted){fieldStarted=true;load('field');}if(p.kitbot&&!robotStarted){robotStarted=true;load('robot');}
   const detail=scene.getObjectByName('detailed-field');if(detail){detail.visible=p.detailed;simplified.visible=!p.detailed;}
   if(p.custom?.data!==customData){customData=p.custom?.data;if(customData)loadCustom(customData);else{customGeneration++;custom.children.forEach(disposeModel);custom.clear();}}
   custom.visible=!!p.custom&&custom.children.length>0;custom.scale.setScalar(p.custom?.scale??1);custom.rotation.z=(p.custom?.rotation??0)*Math.PI/180;
   concept.visible=!custom.visible&&(!p.kitbot||kit.children.length===0);kit.visible=!custom.visible&&p.kitbot;
   conceptNumbers.scale.set(p.concept.length,p.concept.width,1);chassis.scale.set(p.concept.length,p.concept.width,1);mast.scale.z=p.concept.height/.65;
   robot.position.set(p.pose.x,p.pose.y,p.pose.z??0);if(p.pose.rotation)robot.quaternion.set(p.pose.rotation.x,p.pose.rotation.y,p.pose.rotation.z,p.pose.rotation.w);else robot.rotation.set(0,0,p.pose.heading);
   arrow.position.z=p.concept.height+.12;
   if(previousPath!==p.path){previousPath=p.path;pathGeometry.setFromPoints(p.path.map(point=>new THREE.Vector3(point.x,point.y,.08)));}
   if(p.view==='top'){camera.position.set(0,-.01,Math.max(23,24/ camera.aspect));controls.target.set(0,0,0);controls.enableRotate=false;}
   else if(p.view==='follow'){camera.position.lerp(new THREE.Vector3(p.pose.x-4,p.pose.y-5,4.5),.08);controls.target.set(p.pose.x,p.pose.y,.35);controls.enableRotate=false;}
   else controls.enableRotate=true;
   controls.update();renderer.render(scene,camera);frames++;const now=performance.now();if(now-last>=1500){const measured=Math.round(frames*1000/(now-last));p.onFps(measured);slowWindows=measured<20?slowWindows+1:0;if(slowWindows>=2&&resolution>.65){resolution=Math.max(.65,resolution-.15);renderer.setPixelRatio(Math.min(devicePixelRatio,1)*resolution);slowWindows=0;p.onStatus('Rendering resolution reduced to keep the selected detailed models. Model selections are unchanged.');}frames=0;last=now;}
   frame=requestAnimationFrame(render);
  };frame=requestAnimationFrame(render);
  const lost=(e:Event)=>{e.preventDefault();latest.current.onStatus('Graphics context lost. Switch to 2D or reopen 3D.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();});}});environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[props.season.year]);
 return <div className="twin-canvas" ref={host}/>;
}




