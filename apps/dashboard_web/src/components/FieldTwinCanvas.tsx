import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RobotModel} from '../lib/robotModel';
import {Concept,FIELD,OBSTACLES,Pose} from '../lib/conceptTwin';

type Props={custom?:RobotModel;pose:Pose;concept:Concept;detailed:boolean;kitbot:boolean;view:'orbit'|'top'|'follow';path:Pose[];onStatus:(s:string)=>void;onFps:(fps:number)=>void};
const CACHE='g3-twin-2026-v2';
const assets={field:{url:'/twin/2026/field-model.glb',bytes:18182328,hash:'bad4af9f7b5ef951780001321549652c05dfcd61ce24b7efa12757a8afe533b1'},robot:{url:'/twin/2026/robot-model.glb',bytes:21270876,hash:'e6761e663e5b062d23b85f60d5a2ec913d7ea125a15a9c16eab23f7c84f2b67b'}};
export async function clearTwinCache(){if('caches' in window)await caches.delete(CACHE);}
async function assetBuffer(which:keyof typeof assets,signal:AbortSignal){
 const a=assets[which];let cached:Cache|undefined;try{cached=await caches.open(CACHE);}catch{/* Private browsing may disable cache. */}
 let response=await cached?.match(a.url);if(!response){response=await fetch(a.url,{signal});if(!response.ok)throw Error('Asset download failed');}
 const data=await response.arrayBuffer();if(data.byteLength!==a.bytes)throw Error('Model size mismatch');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==a.hash){await cached?.delete(a.url);throw Error('Model integrity check failed');}
 if(!signal.aborted)try{await cached?.put(a.url,new Response(data,{headers:{'Content-Type':'model/gltf-binary'}}));}catch{/* Cache quota failure never blocks the viewer. */}
 return data;
}
export default function FieldTwinCanvas(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const element=host.current!;let disposed=false,frame=0,frames=0,last=performance.now();const abort=new AbortController();
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{latest.current.onStatus('WebGL unavailable — use the 2D view below.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','2026 field and robot 3D view; orbit by dragging, zoom with scroll. Driving controls are below.');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#111b2b');
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;studio.dispose();pmrem.dispose();
  let resolution=1,slowWindows=0;
  const camera=new THREE.PerspectiveCamera(43,1,.05,150);camera.up.set(0,0,1);camera.position.set(-12,-15,15);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.03;controls.minDistance=2;controls.maxDistance=80;
  scene.add(new THREE.HemisphereLight(0xe6f1ff,0x747483,3));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-4,-6,15);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.MeshStandardMaterial({color:0x162336,roughness:1}));ground.position.z=-.06;scene.add(ground);
  const simplified=new THREE.Group();scene.add(simplified);
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,color:number,parent:THREE.Object3D)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),new THREE.MeshStandardMaterial({color,roughness:.75}));m.position.set(x,y,z);parent.add(m);return m;};
  box(0,0,-.02,FIELD.length,FIELD.width,.04,0x596773,simplified);
  [-1,1].forEach(side=>{box(side*(FIELD.length/2),0,.25,.06,FIELD.width,.5,side<0?0x2581df:0xe65662,simplified);box(0,side*FIELD.width/2,.25,FIELD.length,.06,.5,0xa7b9c9,simplified);});
  OBSTACLES.forEach((o,i)=>box(o.x,o.y,.65,o.w,o.h,1.3,i%2?0xc93951:0x176daf,simplified));
  const robot=new THREE.Group(),concept=new THREE.Group(),kit=new THREE.Group();robot.add(concept,kit);scene.add(robot);
  const chassis=box(0,0,.2,1,1,.24,0xe30095,concept),mast=box(0,0,.4,.5,.45,.35,0xdde5ec,concept);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,.8),1,0xffd65b,.18,.13);robot.add(arrow);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x151b25});
  for(const x of [-.35,.35])for(const y of [-.32,.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.1,14),wheelMat);wheel.rotation.x=Math.PI/2;wheel.position.set(x,y,.1);concept.add(wheel);}
  const pathGeometry=new THREE.BufferGeometry(),pathMaterial=new THREE.LineBasicMaterial({color:0x5be1cf});const line=new THREE.Line(pathGeometry,pathMaterial);scene.add(line);let previousPath:Pose[]|null=null;
  const loader=new GLTFLoader();let fieldStarted=false,robotStarted=false;
  const custom=new THREE.Group();robot.add(custom);let customData:ArrayBuffer|undefined,customGeneration=0;
  function disposeModel(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){Object.values(m).forEach(t=>{if(t instanceof THREE.Texture)t.dispose();});m.dispose();}}});}
  function loadCustom(data:ArrayBuffer){const generation=++customGeneration;const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('blob:'))throw Error('External model resources are not supported');return url;});void new GLTFLoader(manager).parseAsync(data,'').then(g=>{if(disposed||generation!==customGeneration){disposeModel(g.scene);return;}custom.children.forEach(disposeModel);custom.clear();const model=g.scene;model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);if(bounds.isEmpty()){disposeModel(model);throw Error('Empty robot model');}const center=bounds.getCenter(new THREE.Vector3());model.position.set(-center.x,-center.y,-bounds.min.z);custom.add(model);latest.current.onStatus('Robot model loaded. Check scale and orientation, then save on this device.');}).catch(()=>{if(!disposed&&generation===customGeneration)latest.current.onStatus('Robot model could not load. Export an uncompressed, self-contained GLB.');});}

  function load(which:'field'|'robot'){
   latest.current.onStatus(which==='field'?'Loading detailed field · 18.2 MB…':'Loading KitBot · 21.3 MB…');
   void assetBuffer(which,abort.signal).then(data=>loader.parseAsync(data,'')).then(gltf=>{
    if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});return;}
    const model=gltf.scene;model.rotateOnWorldAxis(new THREE.Vector3(1,0,0),Math.PI/2);
    if(which==='field'){model.name='detailed-field';scene.add(model);simplified.visible=false;}
    else{model.rotateOnWorldAxis(new THREE.Vector3(0,0,1),Math.PI/2);model.position.set(-.3,0,.05);kit.add(model);}
    latest.current.onStatus(which==='field'?'2026 field model loaded · checksum verified':'2026 KitBot loaded · checksum verified');
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
   chassis.scale.set(p.concept.length,p.concept.width,1);mast.scale.z=p.concept.height/.65;
   robot.position.set(p.pose.x,p.pose.y,0);robot.rotation.z=p.pose.heading;
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
 },[]);
 return <div className="twin-canvas" ref={host}/>;
}

