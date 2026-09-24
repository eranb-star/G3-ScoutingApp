import {loadDarwin,poseDarwin,type PublishedRobot} from '../lib/publishedRobot';
import {robotInspection} from '../lib/twinInspection';
import {aprilTags2026} from '../lib/twinAprilTags';
import {INTAKE_ROLLER_SPEED} from '../lib/intakeGeometry';
import {competitionVenue,type VenueMode} from '../lib/twinVenue';
import {createTwinVR,type VRInput} from '../lib/twinVR';
import {driverCamera,isDriverView,type TwinView,type DriverSettings} from '../lib/twinDriverView';
import {carpetTexture,styleReferenceModel,intakePresentation,mapCarpetInMetres} from '../lib/twinSceneStyle';
import {hopperVisuals,hopperSlot} from '../lib/hopperVisuals';
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
type Props={robotId:PublishedRobot;opponentId:'off'|PublishedRobot;practiceLabel:string;venue:VenueMode;vrReady:boolean;onVRState:(active:boolean)=>void;onVRFrame:(now:number,input:VRInput)=>Pose;onUnavailable:()=>void;errorText:string;retryText:string;quality:QualityMode;onQuality:(tier:QualityTier)=>void;telemetry?:Telemetry;intake:IntakeConfig;onModelMetrics:(m:ModelMetrics|null)=>void;season:FieldSeason;custom?:RobotModel;pose:Pose;concept:Concept;detailed:boolean;kitbot:boolean;view:TwinView;driver:DriverSettings;path:Pose[];onStatus:(s:string)=>void;onFps:(fps:number)=>void};
const CACHE=TWIN_CACHE;
const assets={field:{url:'/twin/2026/field-optimized.glb',bytes:19627748,hash:'088126b167906ca95e7b21a76a430a64199103d1ea184a121b1cf52e984b75e8'},robot:{url:'/twin/2026/robot-optimized.glb',bytes:16177620,hash:'053caf847815cb163632b8f858f5b261e589cb9abae3819b502c016fb57238b8'}};
export async function clearTwinCache(){if('caches' in window)await Promise.all([caches.delete(CACHE),caches.delete('g3-twin-2026-v2'),caches.delete('g3-twin-2026-v3')]);}
export async function assetBuffer(which:keyof typeof assets,signal:AbortSignal,season:FieldSeason){
 const a=which==='field'?season:assets.robot;let cached:Cache|undefined;try{await Promise.all([caches.delete('g3-twin-2026-v2'),caches.delete('g3-twin-2026-v3')]);cached=await caches.open(CACHE);}catch{/* Private browsing may disable cache. */}
 let response=await cached?.match(a.url);if(!response){response=await fetch(a.url,{signal});if(!response.ok)throw Error('Asset download failed');}
 const data=await response.arrayBuffer();if(data.byteLength!==a.bytes)throw Error('Model size mismatch');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==a.hash){await cached?.delete(a.url);throw Error('Model integrity check failed');}
 if(!signal.aborted)try{if(cached)await storeModel(cached,a.url,data);}catch{/* Cache quota failure never blocks the viewer. */}
 return data;
}
export default function FieldTwinCanvas(props:Props){
 const [selectedPart,setSelectedPart]=useState('');const inspectionAction=useRef<(action:string)=>void>(()=>{});
 const [vrSupport,setVRSupport]=useState(false),[vrError,setVRError]=useState(''),[vrHigh,setVRHigh]=useState(false);const enterVR=useRef<(high:boolean)=>Promise<void>>(async()=>{});
 useEffect(()=>{let active=true;void navigator.xr?.isSessionSupported('immersive-vr').then(ok=>{if(active)setVRSupport(ok);}).catch(()=>{});return()=>{active=false;};},[]);
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  setFailed(false);
  const season=props.season;const field={length:season.length,width:season.width};const element=host.current!;let disposed=false,frames=0,last=performance.now();const abort=new AbortController();
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setFailed(true);latest.current.onUnavailable();latest.current.onStatus('WebGL unavailable — use 2D or retry the renderer.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',`${season.year} field and robot 3D view; rotate by dragging, zoom with scroll.`);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#142033');scene.fog=new THREE.Fog('#142033',35,100);
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;scene.environmentIntensity=.45;studio.dispose();pmrem.dispose();
  const adaptive=new AdaptiveQuality();let previousView:Props['view']|null=null;let mode:QualityMode=props.quality,tier:QualityTier=mode==='auto'?'medium':mode,pendingLoads=0,warmUntil=performance.now()+4000;adaptive.reset(tier);renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const camera=new THREE.PerspectiveCamera(43,1,.05,150);camera.up.set(0,0,1);camera.position.set(-12,-15,15);
  const vr=createTwinVR(renderer,camera,scene,active=>{latest.current.onVRState(active);if(!active){previousView=null;applyQuality(mode==='auto'?'medium':mode);}},()=>latest.current.practiceLabel);
  enterVR.current=async high=>{if(latest.current.custom)throw Error('Select KitBot or Darwin before entering VR.');if(!latest.current.vrReady||!scene.getObjectByName('detailed-field')||(latest.current.robotId==='darwin'?!darwinLoaded:!robotStarted||kit.children.length===0))throw Error('Wait for the field, robot and physics to load before entering VR.');applyQuality(high?'high':'medium');try{await vr.enter(high);}catch(e){applyQuality(mode==='auto'?'medium':mode);throw e;}};
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.03;controls.minDistance=2;controls.maxDistance=80;
  const ambient=new THREE.HemisphereLight(0xe6f1ff,0x596477,1.4);ambient.position.set(0,0,1);scene.add(ambient);const sun=new THREE.DirectionalLight(0xfff4e5,2.8);sun.position.set(-4,-6,15);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=.5;sun.shadow.camera.far=50;sun.shadow.normalBias=.008;sun.shadow.bias=-.00015;sun.shadow.camera.updateProjectionMatrix();
  const fill=new THREE.DirectionalLight(0xb4d4ff,.8);fill.position.set(8,5,9);scene.add(fill);
  function applyQuality(next:QualityTier){tier=next;const settings=QUALITY[tier];renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,settings.pixelRatio));renderer.shadowMap.enabled=settings.shadowSize>0;sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.setScalar(settings.shadowSize||512);sun.shadow.needsUpdate=true;scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;});latest.current.onQuality(tier);}
  applyQuality(tier);
  const carpet=carpetTexture();carpet.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  if(season.year===2026)scene.add(aprilTags2026());
  const venue=competitionVenue(field.length,field.width);scene.add(venue.group);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:0x162336,roughness:1}));ground.position.z=-.06;ground.receiveShadow=true;scene.add(ground);
  const simplified=new THREE.Group();scene.add(simplified);
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,color:number,parent:THREE.Object3D)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),new THREE.MeshStandardMaterial({color,roughness:.75}));m.position.set(x,y,z);m.castShadow=h>.05;m.receiveShadow=true;parent.add(m);return m;};
  const floor=box(0,0,-.02,field.length,field.width,.04,0x727780,simplified);(floor.material as THREE.MeshStandardMaterial).map=carpet;(floor.material as THREE.MeshStandardMaterial).roughness=1;floor.name='Playing_Field_Carpet';mapCarpetInMetres(floor);
  [-1,1].forEach(side=>{box(side*(field.length/2),0,.25,.06,field.width,.5,side<0?0xe65662:0x2581df,simplified);box(0,side*field.width/2,.25,field.length,.06,.5,0xa7b9c9,simplified);});
  (season.year===2026?OBSTACLES:[]).forEach(o=>box(o.x,o.y,.65,o.w,o.h,1.3,o.x<0?0xc93951:0x176daf,simplified));
  const fuel=new THREE.InstancedMesh(new THREE.SphereGeometry(FUEL_RADIUS,12,8),new THREE.MeshStandardMaterial({color:0xffcf18,roughness:.72,metalness:0}),FUEL_COUNT);fuel.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fuel.frustumCulled=false;fuel.castShadow=true;fuel.receiveShadow=true;scene.add(fuel);const ballMatrix=new THREE.Matrix4();
  const robot=new THREE.Group(),concept=new THREE.Group(),kit=new THREE.Group();robot.add(concept,kit);scene.add(robot);
  const inspection=robotInspection(renderer.domElement,robot,camera,controls,()=>latest.current.view==='inspect',setSelectedPart);inspectionAction.current=action=>{if(action==='hide')inspection.hide();else if(action==='isolate')inspection.isolate();else inspection.focusRobot();};
  const published=new THREE.Group();robot.add(published);let darwinStarted=false,darwinLoaded=false;
  const opponent=new THREE.Group(),opponentReference=new THREE.Group(),opponentPublished=new THREE.Group();opponent.add(opponentReference,opponentPublished);scene.add(opponent);box(0,0,.2,.9,.8,.24,0x2581df,opponentReference);box(0,0,.45,.5,.45,.35,0xbcc9d8,opponentReference);let opponentKitLoaded=false;
  const hopper=new THREE.InstancedMesh(new THREE.SphereGeometry(FUEL_RADIUS,16,10),new THREE.MeshStandardMaterial({color:0xffcf18,roughness:.72}),60);hopper.instanceMatrix.setUsage(THREE.DynamicDrawUsage);hopper.frustumCulled=false;hopper.castShadow=true;hopper.receiveShadow=true;robot.add(hopper);
  const opponentHopper=new THREE.InstancedMesh(hopper.geometry,hopper.material,60);opponentHopper.frustumCulled=false;opponent.add(opponentHopper);
  const opponentIntake=new THREE.Group();opponent.add(opponentIntake);const oiMaterial=new THREE.MeshStandardMaterial({color:0x303640,roughness:.6});const oiArms=[-1,1].map(side=>{const arm=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,1,12),oiMaterial);arm.rotation.z=-Math.PI/2;arm.position.y=side*.325;opponentIntake.add(arm);return arm;});const oiRoller=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.65,16),oiMaterial);opponentIntake.add(oiRoller);
  const visualPosition=new THREE.Vector3(),visualScale=new THREE.Vector3(),visualRotation=new THREE.Quaternion();
  const captureZone=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x45e2aa,transparent:true,opacity:0.25,side:THREE.DoubleSide,depthWrite:false}));robot.add(captureZone);
  // Open round-tube reference attachment. Geometry shares the deployed intake dimensions with the physical mechanism.
  const intakePivot=new THREE.Group();robot.add(intakePivot);
  const mounts=new THREE.Group();robot.add(mounts);
  const mountCrossbar=box(0,0,.18,.065,1,.055,0x525e6c,mounts);
  const mountRails=[-1,1].map(()=>box(0,0,0,1,.065,.055,0x525e6c,mounts));
  const mountPosts=[-1,1].map(()=>box(0,0,0,.07,.065,.13,0x525e6c,mounts));
  const hinges=[-1,1].map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.085,20),new THREE.MeshStandardMaterial({color:0x313844,roughness:.4,metalness:.7}));m.castShadow=true;mounts.add(m);return m;});
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,1,16),new THREE.MeshStandardMaterial({color:0xadb5bd,roughness:.32,metalness:.8}));intakePivot.add(axle);axle.castShadow=true;
  const carbon=new THREE.MeshStandardMaterial({color:0x303640,roughness:.48,metalness:.2});
  const tube=()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,1,16),carbon);m.castShadow=true;m.receiveShadow=true;intakePivot.add(m);return m;};
  const crossTubes=[tube(),tube()];
  const intakeArms=[tube(),tube()];intakeArms.forEach(m=>m.rotation.z=-Math.PI/2);
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,1,24),new THREE.MeshStandardMaterial({color:0x262b31,roughness:.95,metalness:0}));intakePivot.add(roller);roller.castShadow=true;roller.receiveShadow=true;
  const rollerStripe=box(.065,0,0,.015,1,.025,0xe8b64a,roller);
  let kitHeight=.65,intakeAngle=0,intakeTime=performance.now();
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
    const model=gltf.scene;styleReferenceModel(model,carpet);prepareModel(model);for(const r of which==='field'?season.rotations:[{axis:'x',degrees:90}])model.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),r.degrees*Math.PI/180);
    if(which==='field'){mapCarpetInMetres(model);for(const decoration of removeStaticFuel(model,season.year)??[])disposeModel(decoration);model.name='detailed-field';scene.add(model);simplified.visible=false;}
    else{model.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){if(material.name==='mat_6'&&material instanceof THREE.MeshStandardMaterial)material.color.set('#c72235');if((material.name==='mat_13'||material.name==='mat_41')&&material instanceof THREE.MeshStandardMaterial){material.transparent=false;material.opacity=1;material.depthWrite=true;material.roughness=.65;material.metalness=0;material.needsUpdate=true;}}});model.rotateOnWorldAxis(new THREE.Vector3(0,0,1),Math.PI/2);model.position.set(-.3,0,.05);model.updateWorldMatrix(true,true);kitHeight=new THREE.Box3().setFromObject(model).max.z;kit.add(model);kit.updateWorldMatrix(true,true);const bumper=model.getObjectByName('Front_Bumper')??model;const b=new THREE.Box3().setFromObject(bumper).applyMatrix4(kit.matrixWorld.clone().invert()),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());bumperNumbers(kit,size.x,size.y,center.x,center.y,(b.min.z+b.max.z)/2);}
    latest.current.onStatus(which==='field'?`${season.year} field model loaded · checksum verified`:'2026 KitBot loaded · checksum verified');
   }).catch(error=>{if(!disposed&&error.name!=='AbortError')latest.current.onStatus('Detailed model unavailable. Simplified view remains usable; check connection and reopen 3D to retry.');}).finally(()=>{pendingLoads--;warmUntil=performance.now()+3000;adaptive.reset();});
  }
  let firstResize=true;const resize=()=>{if(renderer.xr.isPresenting)return;const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);if(firstResize){camera.position.set(-12,-15,15).multiplyScalar(Math.max(1,1.15/camera.aspect));firstResize=false;}camera.updateProjectionMatrix();warmUntil=performance.now()+2500;adaptive.reset();};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const render=(time:number,xrFrame?:XRFrame)=>{
   if(disposed)return;const input=vr.active&&xrFrame?vr.update(time,xrFrame):undefined;const p=input?{...latest.current,pose:latest.current.onVRFrame(time,input),intake:{...latest.current.intake,on:latest.current.practiceLabel.startsWith('REPLAY')?latest.current.intake.on:input.intake},telemetry:undefined}:latest.current,driverView=vr.active||(season.year===2026&&isDriverView(p.view));
   if(!vr.active&&p.quality!==mode){mode=p.quality;adaptive.reset(mode==='auto'?'medium':mode);applyQuality(adaptive.tier);warmUntil=performance.now()+3000;}
   if(document.hidden&&!vr.active){frames=0;last=performance.now();adaptive.reset();return;}
   if((p.detailed||driverView)&&!fieldStarted){fieldStarted=true;load('field');}if(p.kitbot&&!robotStarted){robotStarted=true;load('robot');}
   venue.update(p.venue,tier,driverView,p.pose.scores);ground.visible=p.venue!=='competition';
   const detail=scene.getObjectByName('detailed-field');if(detail){detail.visible=p.detailed||driverView;simplified.visible=!detail.visible;}
   if(p.custom?.data!==customData){customData=p.custom?.data;if(customData)loadCustom(customData);else{customGeneration++;custom.children.forEach(disposeModel);custom.clear();}}
   custom.visible=!!p.custom&&custom.children.length>0;custom.scale.setScalar(p.custom?.scale??1);custom.rotation.z=(p.custom?.rotation??0)*Math.PI/180;
   if((p.robotId==='darwin'||p.opponentId==='darwin')&&!darwinStarted){darwinStarted=true;pendingLoads++;p.onStatus('Loading 6328 Darwin · published CAD · 37 MB…');void loadDarwin(abort.signal).then(asset=>{if(disposed){disposeModel(asset.group);return;}published.add(asset.group);opponentPublished.add(asset.group.clone(true));darwinLoaded=true;p.onStatus('6328 Darwin loaded · checksums verified · estimated simulation physics');}).catch(()=>{if(!disposed){p.onStatus('Darwin could not load. Switch to KitBot and select Darwin to retry.');}}).finally(()=>{pendingLoads--;});}
   published.visible=!custom.visible&&p.robotId==='darwin';if(darwinLoaded){poseDarwin(published.children[0] as THREE.Group,p.intake.on);poseDarwin(opponentPublished.children[0] as THREE.Group,p.pose.opponent?.intake??false);}
   if(p.robotId==='kitbot'&&p.opponentId!=='darwin'&&!darwinLoaded)darwinStarted=false;
   const op=p.pose.opponent;opponent.visible=!!op;if(op){opponent.position.set(op.x,op.y,op.z);opponent.quaternion.set(op.rotation.x,op.rotation.y,op.rotation.z,op.rotation.w);}opponentReference.visible=p.opponentId==='kitbot';opponentPublished.visible=p.opponentId==='darwin';
   if(kit.children.length&&!opponentKitLoaded){opponentReference.clear();opponentReference.add(kit.clone(true));opponentKitLoaded=true;}
   concept.visible=!published.visible&&!custom.visible&&(!p.kitbot||kit.children.length===0);kit.visible=!published.visible&&!custom.visible&&p.kitbot;
   conceptNumbers.scale.set(p.concept.length,p.concept.width,1);chassis.scale.set(p.concept.length,p.concept.width,1);mast.scale.z=p.concept.height/.65;
   robot.position.set(p.pose.x,p.pose.y,p.pose.z??0);if(p.pose.rotation)robot.quaternion.set(p.pose.rotation.x,p.pose.rotation.y,p.pose.rotation.z,p.pose.rotation.w);else robot.rotation.set(0,0,p.pose.heading);
   arrow.position.z=p.concept.height+.12;arrow.visible=!driverView&&p.view!=='inspect';line.visible=!driverView;
   const intakeNow=performance.now(),intakeDt=Math.min(.1,(intakeNow-intakeTime)/1000);intakeTime=intakeNow;
   const attachment=intakePresentation(p.concept.length,p.intake.reach,kit.visible,kit.visible?kitHeight:p.concept.height);const span=attachment.span,desired=p.intake.on?attachment.angle:attachment.stowAngle;
   intakeAngle=Math.max(attachment.stowAngle,intakeAngle+(desired-intakeAngle)*(1-Math.exp(-9*intakeDt)));intakePivot.visible=mounts.visible=season.year===2026&&!p.custom&&p.robotId==='kitbot';intakePivot.position.set(attachment.pivotX,0,attachment.pivotZ);intakePivot.rotation.y=intakeAngle;
   const mountZ=Math.min(.18,attachment.pivotZ-.03);mountCrossbar.position.set(attachment.mountX,0,mountZ);mountCrossbar.scale.y=p.intake.width+.09;
   const railLength=attachment.pivotX-attachment.mountX+.08;
   mountRails.forEach((m,i)=>{m.position.set((attachment.mountX+attachment.pivotX)/2,(i?1:-1)*p.intake.width/2,mountZ);m.scale.x=railLength;});
   mountPosts.forEach((m,i)=>{m.position.set(attachment.pivotX,(i?1:-1)*p.intake.width/2,(mountZ+attachment.pivotZ)/2);m.scale.z=(attachment.pivotZ-mountZ)/.13;});
   hinges.forEach((m,i)=>m.position.set(attachment.pivotX,(i?1:-1)*p.intake.width/2,attachment.pivotZ));
   axle.scale.y=p.intake.width+.08;crossTubes.forEach((m,i)=>{m.position.x=span*(i? .68:.32);m.scale.y=p.intake.width;});
   intakeArms.forEach((arm,i)=>{arm.position.set(span/2,(i?1:-1)*p.intake.width/2,0);arm.scale.y=span;});roller.position.set(span,0,0);roller.scale.y=p.intake.width;if(p.intake.on)roller.rotation.y+=intakeDt*INTAKE_ROLLER_SPEED;rollerStripe.visible=true;
   captureZone.visible=!driverView&&season.year===2026&&p.intake.on&&!!p.telemetry;captureZone.scale.set(p.intake.reach,p.intake.width,1);captureZone.position.set(p.concept.length/2+p.intake.reach/2,0,0.025);
   opponentHopper.count=op?.stored??0;for(let i=0;i<opponentHopper.count;i++){const b=hopperSlot(i,p.opponentId==='darwin'?60:40);visualPosition.set(p.opponentId==='darwin'?-b.x:b.x,b.y,p.opponentId==='darwin'?Math.min(.46,b.z):b.z);visualScale.setScalar(b.radius/FUEL_RADIUS);opponentHopper.setMatrixAt(i,ballMatrix.compose(visualPosition,visualRotation,visualScale));}opponentHopper.instanceMatrix.needsUpdate=true;
   const oi=intakePresentation(.9,.3,true,.65);opponentIntake.visible=!!op&&p.opponentId==='kitbot';opponentIntake.position.set(oi.pivotX,0,oi.pivotZ);opponentIntake.rotation.y=op?.intake?oi.angle:oi.stowAngle;oiArms.forEach(a=>{a.position.x=oi.span/2;a.scale.y=oi.span;});oiRoller.position.x=oi.span;if(op?.intake)oiRoller.rotation.y+=intakeDt*INTAKE_ROLLER_SPEED;
   const reference=season.year===2026&&!p.custom;
   const visuals=reference?hopperVisuals(p.pose,p.intake.capacity):null;
   hopper.visible=reference;hopper.count=visuals?.stored.length??0;
   visuals?.stored.forEach((b,i)=>{visualPosition.set(p.robotId==='darwin'?-b.x:b.x,b.y,p.robotId==='darwin'?Math.min(.46,b.z):b.z);visualScale.setScalar(b.radius/FUEL_RADIUS);hopper.setMatrixAt(i,ballMatrix.compose(visualPosition,visualRotation,visualScale));});hopper.instanceMatrix.needsUpdate=true;
   const balls=season.year===2026?(p.robotId==='darwin'?p.pose.balls??[]:visuals?.field??p.pose.balls??[]):[];fuel.count=balls.length;balls.forEach((b,i)=>{visualPosition.set(b.x,b.y,b.z);visualScale.setScalar(('radius' in b?b.radius as number:FUEL_RADIUS)/FUEL_RADIUS);fuel.setMatrixAt(i,ballMatrix.compose(visualPosition,visualRotation,visualScale));});fuel.instanceMatrix.needsUpdate=true;
   if(previousPath!==p.path){previousPath=p.path;pathGeometry.setFromPoints(p.path.map(point=>new THREE.Vector3(point.x,point.y,.08)));}
   const t=driverView?undefined:p.telemetry;targetLine.visible=headingLine.visible=targetLabel.visible=!!t;
   if(t){targetGeometry.setFromPoints([new THREE.Vector3(t.muzzleX,t.muzzleY,t.muzzleZ),new THREE.Vector3(t.targetX,t.targetY,t.targetZ)]);headingLine.position.set(p.pose.x,p.pose.y,(p.pose.z??0)+p.concept.height+.15);headingLine.setDirection(new THREE.Vector3(Math.cos(p.pose.heading),Math.sin(p.pose.heading),0));targetLabel.position.set((t.muzzleX+t.targetX)/2,(t.muzzleY+t.targetY)/2,Math.max(t.muzzleZ,t.targetZ)+.3);const text=`${t.rangeM.toFixed(2)} m · ${t.aimErrorDeg===null?'—':t.aimErrorDeg.toFixed(1)+'°'}`;if(text!==labelText){labelText=text;labelContext.clearRect(0,0,512,80);labelContext.fillStyle='#102636';labelContext.fillRect(0,0,512,80);labelContext.fillStyle='#8bffe8';labelContext.font='bold 40px monospace';labelContext.textAlign='center';labelContext.fillText(text,256,55);labelTexture.needsUpdate=true;}}
   controls.enabled=!driverView;controls.enablePan=!driverView;controls.enableZoom=!driverView;
   if(!vr.active&&p.view!==previousView){renderer.domElement.setAttribute('aria-label',driverView?'2026 fixed driver-station view; adjust looking direction using the controls above.':`${season.year} field and robot 3D view; rotate by dragging, zoom with scroll.`);controls.enableDamping=false;controls.update();controls.enableDamping=true;if(p.view==='inspect'){camera.near=.0005;camera.updateProjectionMatrix();inspection.focusRobot();}else{inspection.restore();camera.near=.05;camera.updateProjectionMatrix();}if(p.view==='robot'){camera.position.set(p.pose.x-1.3,p.pose.y-1.6,1.6);controls.target.set(p.pose.x,p.pose.y,.35);}if(p.view==='orbit'){camera.position.set(-12,-15,15).multiplyScalar(Math.max(1,1.15/camera.aspect));controls.target.set(0,0,0);}previousView=p.view;}
   if(vr.active){controls.enabled=false;}
   else if(driverView){const d=driverCamera(p.view,p.driver,camera.aspect);camera.position.set(d.x,d.y,d.z);controls.target.set(d.targetX,d.targetY,d.targetZ);camera.lookAt(controls.target);camera.fov=d.fov;camera.updateProjectionMatrix();}
   else if(p.view==='top'){camera.position.set(0,-.01,Math.max(23,24/ camera.aspect));controls.target.set(0,0,0);controls.enableRotate=false;}
   else if(p.view==='opponent'&&p.pose.opponent){const op=p.pose.opponent;camera.position.lerp(new THREE.Vector3(op.x-2,op.y-2.5,2),1-Math.exp(-5*intakeDt));controls.target.set(op.x,op.y,.3);controls.enableRotate=false;}
   else if(p.view==='follow'){camera.position.lerp(new THREE.Vector3(p.pose.x-4,p.pose.y-5,4.5),1-Math.exp(-5*intakeDt));controls.target.set(p.pose.x,p.pose.y,.35);controls.enableRotate=false;}
   else if(p.view==='robot'){camera.position.x+=p.pose.x-controls.target.x;camera.position.y+=p.pose.y-controls.target.y;controls.target.set(p.pose.x,p.pose.y,.35);controls.enableRotate=true;}
   else controls.enableRotate=true;
   const tight=p.view==='robot',following=tight||p.view==='follow',shadowRadius=tight?3.5:following?8:14;
   const lightX=following?p.pose.x:0,lightY=following?p.pose.y:0;sun.position.set(lightX-4,lightY-6,15);sun.target.position.set(lightX,lightY,0);
   if(sun.shadow.camera.right!==shadowRadius){sun.shadow.camera.left=-shadowRadius;sun.shadow.camera.right=shadowRadius;sun.shadow.camera.top=shadowRadius;sun.shadow.camera.bottom=-shadowRadius;sun.shadow.camera.updateProjectionMatrix();}
   controls.minDistance=p.view==='inspect'?.003:p.view==='robot'?.65:2;controls.maxPolarAngle=p.view==='inspect'?Math.PI:Math.PI/2-.03;
   if(!driverView){if(camera.fov!==43){camera.fov=43;camera.updateProjectionMatrix();}controls.update();}renderer.render(scene,camera);frames++;const now=performance.now();if(now-last>=1500){const measured=Math.round(frames*1000/(now-last));p.onFps(measured);if(!vr.active&&mode==='auto'&&pendingLoads===0&&now>warmUntil){const next=adaptive.sample(measured);if(next!==tier)applyQuality(next);}else adaptive.reset();frames=0;last=now;}
   };renderer.setAnimationLoop(render);
  const lost=(e:Event)=>{e.preventDefault();renderer.setAnimationLoop(null);vr.dispose();setFailed(true);latest.current.onUnavailable();latest.current.onStatus('Graphics context lost. Switch to 2D or reopen 3D.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  const visibility=()=>{frames=0;last=performance.now();warmUntil=last+3000;adaptive.reset();};document.addEventListener('visibilitychange',visibility);
  return()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',lost);sun.shadow.map?.dispose();abort.abort();renderer.setAnimationLoop(null);vr.dispose();observer.disconnect();inspection.dispose();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();});}});labelTexture.dispose();labelMaterial.dispose();environment.dispose();carpet.dispose();renderer.dispose();renderer.domElement.remove();};
 },[props.season.year,retry]);
 return <div className="twin-canvas" ref={host}>{props.view==='inspect'&&<div className="twin-inspection"><strong>Inspect robot</strong><span>{selectedPart||'Click a part to focus; scroll or pinch to inspect.'}</span><button disabled={!selectedPart} onClick={()=>inspectionAction.current('hide')}>Hide part</button><button disabled={!selectedPart} onClick={()=>inspectionAction.current('isolate')}>Isolate part</button><button onClick={()=>inspectionAction.current('restore')}>Show whole robot</button><small>Only detail present in the CAD can be shown.</small></div>}{props.season.year===2026&&<div className="twin-vr-entry"><button disabled={!vrSupport||!props.vrReady} onClick={()=>{setVRError('');void enterVR.current(vrHigh).catch(e=>setVRError(e instanceof Error?e.message:'VR could not start.'));}}>{vrSupport?'Enter VR · prototype':'VR · headset browser required'}</button>{vrSupport&&<><label><input type="checkbox" checked={vrHigh} onChange={e=>setVRHigh(e.target.checked)}/>High test (default: Medium)</label><small>{vrSupport?'Red station 1 · use Quest controllers. Hold right grip to drive; left stick moves, right stick turns. Triggers: intake/shoot. X: recenter. B: exit. Set your headset floor correctly.':'Immersive VR requires a supported headset browser (HTTPS). Desktop simulator remains available.'}</small></>}{vrError&&<small role="alert">{vrError}</small>}</div>}{failed&&<div className="twin-render-error" role="alert"><p>{props.errorText}</p><button onClick={()=>{setFailed(false);setRetry(v=>v+1);}}>{props.retryText}</button></div>}</div>;
}




