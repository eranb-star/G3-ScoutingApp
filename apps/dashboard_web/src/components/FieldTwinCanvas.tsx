import {AdaptiveQuality,QUALITY,type QualityMode,type QualityTier} from '../lib/twinQuality';
import type {Telemetry} from '../lib/twinTelemetry';
import {removeStaticFuel} from '../lib/fieldFuelVisuals';
import {FUEL_RADIUS,FUEL_COUNT,IntakeConfig} from '../lib/intake';
import {TWIN_CACHE,storeModel} from '../lib/twinCache';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FieldSeason} from '../lib/fieldSeasons';
import {RobotModel} from '../lib/robotModel';
import {Concept,OBSTACLES,Pose} from '../lib/conceptTwin';

export type ModelMetrics={length:number;width:number;height:number;triangles:number};
type Props={onUnavailable:()=>void;errorText:string;retryText:string;quality:QualityMode;onQuality:(tier:QualityTier)=>void;telemetry?:Telemetry;intake:IntakeConfig;onModelMetrics:(m:ModelMetrics|null)=>void;season:FieldSeason;custom?:RobotModel;pose:Pose;concept:Concept;detailed:boolean;kitbot:boolean;view:'orbit'|'top'|'follow';path:Pose[];onStatus:(s:string)=>void;onFps:(fps:number)=>void};
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
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  setFailed(false);
  const season=props.season;const field={length:season.length,width:season.width};const element=host.current!;let disposed=false,frame=0,frames=0,last=performance.now();const abort=new AbortController();
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setFailed(true);latest.current.onUnavailable();latest.current.onStatus('WebGL unavailable — use 2D or retry the renderer.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',`${season.year} field and robot 3D view; rotate by dragging, zoom with scroll.`);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#142033');
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;scene.environmentIntensity=.75;studio.dispose();pmrem.dispose();
  const adaptive=new AdaptiveQuality();let previousView=props.view;let mode:QualityMode=props.quality,tier:QualityTier=mode==='auto'?'medium':mode,pendingLoads=0,warmUntil=performance.now()+4000;adaptive.reset(tier);renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const camera=new THREE.PerspectiveCamera(43,1,.05,150);camera.up.set(0,0,1);camera.position.set(-12,-15,15);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.03;controls.minDistance=2;controls.maxDistance=80;
  scene.add(new THREE.HemisphereLight(0xe6f1ff,0x596477,2.1));const sun=new THREE.DirectionalLight(0xfff4e5,3.2);sun.position.set(-4,-6,15);scene.add(sun);sun.castShadow=true;sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=.5;sun.shadow.camera.far=50;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.camera.updateProjectionMatrix();
  const fill=new THREE.DirectionalLight(0xb4d4ff,1.1);fill.position.set(8,5,9);scene.add(fill);
  function applyQuality(next:QualityTier){tier=next;const settings=QUALITY[tier];renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,settings.pixelRatio));renderer.shadowMap.enabled=settings.shadowSize>0;sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.setScalar(settings.shadowSize||512);sun.shadow.needsUpdate=true;scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;});latest.current.onQuality(tier);}
  applyQuality(tier);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.MeshStandardMaterial({color:0x162336,roughness:1}));ground.position.z=-.06;ground.receiveShadow=true;scene.add(ground);
  const simplified=new THREE.Group();scene.add(simplified);
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,color:number,parent:THREE.Object3D)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),new THREE.MeshStandardMaterial({color,roughness:.75}));m.position.set(x,y,z);m.castShadow=h>.05;m.receiveShadow=true;parent.add(m);return m;};
  box(0,0,-.02,field.length,field.width,.04,0x596773,simplified);
  [-1,1].forEach(side=>{box(side*(field.length/2),0,.25,.06,field.width,.5,side<0?0xe65662:0x2581df,simplified);box(0,side*field.width/2,.25,field.length,.06,.5,0xa7b9c9,simplified);});
  (season.year===2026?OBSTACLES:[]).forEach(o=>box(o.x,o.y,.65,o.w,o.h,1.3,o.x<0?0xc93951:0x176daf,simplified));
  const fuel=new THREE.InstancedMesh(new THREE.SphereGeometry(FUEL_RADIUS,12,8),new THREE.MeshStandardMaterial({color:0xffcf18,roughness:.72,metalness:0}),FUEL_COUNT);fuel.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fuel.frustumCulled=false;fuel.castShadow=true;fuel.receiveShadow=true;scene.add(fuel);const ballMatrix=new THREE.Matrix4();
  const robot=new THREE.Group(),concept=new THREE.Group(),kit=new THREE.Group();robot.add(concept,kit);scene.add(robot);
  const captureZone=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x45e2aa,transparent:true,opacity:0.25,side:THREE.DoubleSide,depthWrite:false}));robot.add(captureZone);
  // Lightweight illustrative front intake. Shared reach/width with the capture zone.
  const intakePivot=new THREE.Group();robot.add(intakePivot);
  const intakeArms=[-1,1].map(()=>box(0,0,0,1,.035,.04,0x8497ad,intakePivot));
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,1,12),new THREE.MeshStandardMaterial({color:0xffd54a,roughness:.7}));intakePivot.add(roller);
  const rollerStripe=box(.065,0,0,.015,1,.025,0x243343,roller);
  let intakeAngle=-Math.PI/2,intakeTime=performance.now();
  const chassis=box(0,0,.2,1,1,.24,0xc72235,concept),mast=box(0,0,.4,.5,.45,.35,0xdde5ec,concept);
  // Team-number plates sit just outside the reference bumper faces.
  function bumperNumbers(parent:THREE.Group,length:number,width:number,cx=0,cy=0,z=.18){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
   const ctx=canvas.getContext('2d')!;ctx.fillStyle='#c72235';ctx.fillRect(0,0,512,160);ctx.fillStyle='white';ctx.font='bold 126px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('6740',256,86);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const material=new THREE.MeshBasicMaterial({map:texture});const group=new THREE.Group();parent.add(group);
   for(const [x,y,angle,span] of [[length/2+.004,0,Math.PI/2,width],[-length/2-.004,0,-Math.PI/2,width],[0,width/2+.004,Math.PI,length],[0,-width/2-.004,0,length]]){
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(span*.98,.20),material);plate.rotation.set(Math.PI/2,0,0);plate.rotateOnWorldAxis(new THREE.Vector3(0,0,1),angle);plate.position.set(cx+x,cy+y,z);group.add(plate);
   }return group;
  }
  const conceptNumbers=bumperNumbers(concept,1,1);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,.8),1,0xffd65b,.18,.13);robot.add(arrow);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x151b25,roughness:.92,metalness:0});
  for(const x of [-.35,.35])for(const y of [-.32,.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.1,14),wheelMat);wheel.rotation.x=Math.PI/2;wheel.position.set(x,y,.1);concept.add(wheel);}
  const pathGeometry=new THREE.BufferGeometry(),pathMaterial=new THREE.LineBasicMaterial({color:0x5be1cf});const line=new THREE.Line(pathGeometry,pathMaterial);scene.add(line);let previousPath:Pose[]|null=null;
  const targetGeometry=new THREE.BufferGeometry(),targetMaterial=new THREE.LineBasicMaterial({color:0x4ff4d4,depthTest:false});
  const targetLine=new THREE.Line(targetGeometry,targetMaterial);targetLine.renderOrder=10;scene.add(targetLine);
  const headingLine=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),1,0xffd65b,.2,.1);scene.add(headingLine);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=80;const labelContext=labelCanvas.getContext('2d')!;
  const labelTexture=new THREE.CanvasTexture(labelCanvas),labelMaterial=new THREE.SpriteMaterial({map:labelTexture,depthTest:false});const targetLabel=new THREE.Sprite(labelMaterial);targetLabel.scale.set(2,.3125,1);targetLabel.renderOrder=11;scene.add(targetLabel);let labelText='';
  const loader=new GLTFLoader();let fieldStarted=false,robotStarted=false;
  const custom=new THREE.Group();robot.add(custom);let customData:ArrayBuffer|undefined,customGeneration=0;
  function disposeModel(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){Object.values(m).forEach(t=>{if(t instanceof THREE.Texture)t.dispose();});m.dispose();}}});}
  function loadCustom(data:ArrayBuffer){pendingLoads++;latest.current.onModelMetrics(null);custom.children.forEach(disposeModel);custom.clear();const generation=++customGeneration;const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('blob:'))throw Error('External model resources are not supported');return url;});void new GLTFLoader(manager).parseAsync(data,'').then(g=>{if(disposed||generation!==customGeneration){disposeModel(g.scene);return;}custom.children.forEach(disposeModel);custom.clear();const model=g.scene;prepareModel(model);model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);if(bounds.isEmpty()){disposeModel(model);throw Error('Empty robot model');}const center=bounds.getCenter(new THREE.Vector3());model.position.set(-center.x,-center.y,-bounds.min.z);custom.add(model);const size=bounds.getSize(new THREE.Vector3());let triangles=0;model.traverse(o=>{if(o instanceof THREE.Mesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position')?.count??0)/3;});latest.current.onModelMetrics({length:size.x,width:size.y,height:size.z,triangles:Math.round(triangles)});latest.current.onStatus('Robot model loaded. Check scale and orientation, then save on this device.');}).catch(()=>{if(!disposed&&generation===customGeneration)latest.current.onStatus('Robot model could not load. Export an uncompressed, self-contained GLB.');}).finally(()=>{pendingLoads--;warmUntil=performance.now()+3000;adaptive.reset();});}

  function prepareModel(model:THREE.Object3D){model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});}
  function load(which:'field'|'robot'){pendingLoads++;
   latest.current.onStatus(which==='field'?`Loading ${season.year} field · ${(season.bytes/1e6).toFixed(1)} MB…`:'Loading KitBot · 16.2 MB…');
   void assetBuffer(which,abort.signal,season).then(data=>loader.parseAsync(data,'')).then(gltf=>{
    if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});return;}
    const model=gltf.scene;prepareModel(model);for(const r of which==='field'?season.rotations:[{axis:'x',degrees:90}])model.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),r.degrees*Math.PI/180);
    if(which==='field'){for(const decoration of removeStaticFuel(model,season.year)??[])disposeModel(decoration);model.name='detailed-field';scene.add(model);simplified.visible=false;}
    else{model.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(material.name==='mat_6'&&material instanceof THREE.MeshStandardMaterial)material.color.set('#c72235');});model.rotateOnWorldAxis(new THREE.Vector3(0,0,1),Math.PI/2);model.position.set(-.3,0,.05);kit.add(model);kit.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(model).applyMatrix4(kit.matrixWorld.clone().invert()),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());bumperNumbers(kit,size.x,size.y,center.x,center.y,b.min.z+.25);}
    latest.current.onStatus(which==='field'?`${season.year} field model loaded · checksum verified`:'2026 KitBot loaded · checksum verified');
   }).catch(error=>{if(!disposed&&error.name!=='AbortError')latest.current.onStatus('Detailed model unavailable. Simplified view remains usable; check connection and reopen 3D to retry.');}).finally(()=>{pendingLoads--;warmUntil=performance.now()+3000;adaptive.reset();});
  }
  let firstResize=true;const resize=()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);if(firstResize){camera.position.set(-12,-15,15).multiplyScalar(Math.max(1,1.15/camera.aspect));firstResize=false;}camera.updateProjectionMatrix();warmUntil=performance.now()+2500;adaptive.reset();};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const render=()=>{
   if(disposed)return;const p=latest.current;
   if(p.quality!==mode){mode=p.quality;adaptive.reset(mode==='auto'?'medium':mode);applyQuality(adaptive.tier);warmUntil=performance.now()+3000;}
   if(document.hidden){frames=0;last=performance.now();adaptive.reset();frame=requestAnimationFrame(render);return;}
   if(p.detailed&&!fieldStarted){fieldStarted=true;load('field');}if(p.kitbot&&!robotStarted){robotStarted=true;load('robot');}
   const detail=scene.getObjectByName('detailed-field');if(detail){detail.visible=p.detailed;simplified.visible=!p.detailed;}
   if(p.custom?.data!==customData){customData=p.custom?.data;if(customData)loadCustom(customData);else{customGeneration++;custom.children.forEach(disposeModel);custom.clear();}}
   custom.visible=!!p.custom&&custom.children.length>0;custom.scale.setScalar(p.custom?.scale??1);custom.rotation.z=(p.custom?.rotation??0)*Math.PI/180;
   concept.visible=!custom.visible&&(!p.kitbot||kit.children.length===0);kit.visible=!custom.visible&&p.kitbot;
   conceptNumbers.scale.set(p.concept.length,p.concept.width,1);chassis.scale.set(p.concept.length,p.concept.width,1);mast.scale.z=p.concept.height/.65;
   robot.position.set(p.pose.x,p.pose.y,p.pose.z??0);if(p.pose.rotation)robot.quaternion.set(p.pose.rotation.x,p.pose.rotation.y,p.pose.rotation.z,p.pose.rotation.w);else robot.rotation.set(0,0,p.pose.heading);
   arrow.position.z=p.concept.height+.12;
   const intakeNow=performance.now(),intakeDt=Math.min(.1,(intakeNow-intakeTime)/1000);intakeTime=intakeNow;
   const span=Math.hypot(p.intake.reach,.26),desired=p.intake.on?Math.atan2(.26,p.intake.reach):-Math.PI/2;
   intakeAngle+=(desired-intakeAngle)*(1-Math.exp(-9*intakeDt));intakePivot.visible=season.year===2026;intakePivot.position.set(p.concept.length/2,0,.35);intakePivot.rotation.y=intakeAngle;
   intakeArms.forEach((arm,i)=>{arm.position.set(span/2,(i?1:-1)*p.intake.width/2,0);arm.scale.x=span;});roller.position.set(span,0,0);roller.scale.y=p.intake.width;if(p.intake.on)roller.rotation.y-=intakeDt*8;rollerStripe.visible=true;
   captureZone.visible=season.year===2026&&p.intake.on;captureZone.scale.set(p.intake.reach,p.intake.width,1);captureZone.position.set(p.concept.length/2+p.intake.reach/2,0,0.025);
   const balls=season.year===2026?(p.pose.balls??[]):[];fuel.count=balls.length;balls.forEach((b,i)=>fuel.setMatrixAt(i,ballMatrix.makeTranslation(b.x,b.y,b.z)));fuel.instanceMatrix.needsUpdate=true;
   if(previousPath!==p.path){previousPath=p.path;pathGeometry.setFromPoints(p.path.map(point=>new THREE.Vector3(point.x,point.y,.08)));}
   const t=p.telemetry;targetLine.visible=headingLine.visible=targetLabel.visible=!!t;
   if(t){targetGeometry.setFromPoints([new THREE.Vector3(t.muzzleX,t.muzzleY,t.muzzleZ),new THREE.Vector3(t.targetX,t.targetY,t.targetZ)]);headingLine.position.set(p.pose.x,p.pose.y,(p.pose.z??0)+p.concept.height+.15);headingLine.setDirection(new THREE.Vector3(Math.cos(p.pose.heading),Math.sin(p.pose.heading),0));targetLabel.position.set((t.muzzleX+t.targetX)/2,(t.muzzleY+t.targetY)/2,Math.max(t.muzzleZ,t.targetZ)+.3);const text=`${t.rangeM.toFixed(2)} m · ${t.aimErrorDeg===null?'—':t.aimErrorDeg.toFixed(1)+'°'}`;if(text!==labelText){labelText=text;labelContext.clearRect(0,0,512,80);labelContext.fillStyle='#102636';labelContext.fillRect(0,0,512,80);labelContext.fillStyle='#8bffe8';labelContext.font='bold 40px monospace';labelContext.textAlign='center';labelContext.fillText(text,256,55);labelTexture.needsUpdate=true;}}
   if(p.view!==previousView){if(p.view==='orbit'){camera.position.set(-12,-15,15).multiplyScalar(Math.max(1,1.15/camera.aspect));controls.target.set(0,0,0);}previousView=p.view;}
   if(p.view==='top'){camera.position.set(0,-.01,Math.max(23,24/ camera.aspect));controls.target.set(0,0,0);controls.enableRotate=false;}
   else if(p.view==='follow'){camera.position.lerp(new THREE.Vector3(p.pose.x-4,p.pose.y-5,4.5),.08);controls.target.set(p.pose.x,p.pose.y,.35);controls.enableRotate=false;}
   else controls.enableRotate=true;
   controls.update();renderer.render(scene,camera);frames++;const now=performance.now();if(now-last>=1500){const measured=Math.round(frames*1000/(now-last));p.onFps(measured);if(mode==='auto'&&pendingLoads===0&&now>warmUntil){const next=adaptive.sample(measured);if(next!==tier)applyQuality(next);}else adaptive.reset();frames=0;last=now;}
   frame=requestAnimationFrame(render);
  };frame=requestAnimationFrame(render);
  const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(frame);setFailed(true);latest.current.onUnavailable();latest.current.onStatus('Graphics context lost. Switch to 2D or reopen 3D.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  const visibility=()=>{frames=0;last=performance.now();warmUntil=last+3000;adaptive.reset();};document.addEventListener('visibilitychange',visibility);
  return()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',lost);sun.shadow.map?.dispose();abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();});}});labelTexture.dispose();labelMaterial.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[props.season.year,retry]);
 return <div className="twin-canvas" ref={host}>{failed&&<div className="twin-render-error" role="alert"><p>{props.errorText}</p><button onClick={()=>{setFailed(false);setRetry(v=>v+1);}}>{props.retryText}</button></div>}</div>;
}




