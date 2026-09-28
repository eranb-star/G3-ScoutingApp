import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {loadDarwin} from './publishedRobot';
import limestone from './limestoneManifest.json';

export type LearningRobot='darwin'|'limestone';
export type StudyArea='all'|'electrical'|'power'|'can'|'network'|'intake'|'shooter'|'hopper'|'drive';
export const learningRobots={
 darwin:{title:'6328 · Darwin · 2026',mb:37,source:'https://github.com/Mechanical-Advantage/RobotCode2026Public/tree/a6239fd90e8de72a7c1870c3c189820fcef6552d/ascope_assets/Robot_Darwin',credit:'Mechanical Advantage · MIT',remote:false},
 limestone:{title:'1678 · Limestone · 2026',mb:45,source:limestone.source,credit:'Citrus Circuits · public team export',remote:true}
};
export const studyAreas:{id:StudyArea;en:string;he:string}[]=[
 {id:'all',en:'Whole robot',he:'הרובוט המלא'},
 {id:'electrical',en:'Electrical overview',he:'סקירת חשמל'},
 {id:'power',en:'Power',he:'אספקת מתח'},
 {id:'can',en:'CAN & control',he:'CAN ובקרה'},
 {id:'network',en:'Network & vision',he:'רשת וראייה'},
 {id:'intake',en:'Intake',he:'איסוף'},
 {id:'shooter',en:'Shooter',he:'שיגור'},
 {id:'hopper',en:'Hopper',he:'אחסון כדורים'},
 {id:'drive',en:'Drivetrain',he:'הנעה'}
];
// Explicit authored CAD-name mappings, not inference of actual wire connections.
// Ancestor names preserve assembly membership for otherwise anonymous fasteners.
export function inStudyArea(area:StudyArea,path:string,robot:LearningRobot):boolean{
 const n=path.replaceAll('_',' ').toLowerCase();
 switch(area){
  case 'all':return true;
  case 'power':return /battery|breaker|pdp|pdh|simplified mpm|mpm saddle|power case|\bvrm\b/.test(n);
  case 'can':return /roborio|robo rio|kraken .*motor|pdp|pdh|canivore|pigeon|talon|spark max|mac mini/.test(n);
  case 'network':return /robot radio|radio mount|radio heats|mac mini|limelight|northstar/.test(n);
  case 'electrical':return inStudyArea('power',path,robot)||inStudyArea('can',path,robot)||inStudyArea('network',path,robot)||/robot signal light/.test(n);
  case 'intake':return robot==='darwin'?/2300 intake|darwin component 1/.test(n):/1678-26c-1500|limestone component 0/.test(n);
  case 'shooter':return robot==='darwin'?/3100 full wide launcher|darwin component 0/.test(n):/1600 shooter|limestone component 3/.test(n);
  case 'hopper':return robot==='darwin'?/0800 hopper|0410 superdexer|darwin component [23]/.test(n):/1678-26b-1900|limestone component [12]/.test(n);
  case 'drive':return /drivebase|sds mk5|swerve/.test(n);
 }
}

export function disposeLearningModel(root:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});}}});
 geometries.forEach(v=>v.dispose());materials.forEach(v=>v.dispose());textures.forEach(v=>v.dispose());
}
export async function loadLearningRobot(robot:LearningRobot,signal:AbortSignal){
 if(robot==='darwin')return loadDarwin(signal);
 const root=new THREE.Group();root.name='1678 Limestone 2026';
 try{
  // Sequential files limit peak memory and leave no unfinished parses on failure.
  for(const [name,file] of Object.entries(limestone.files)){
   const response=await fetch(file.url,{signal});if(!response.ok)throw Error(`Model download ${response.status}`);
   const data=await response.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');
   if(data.byteLength!==file.bytes||hash!==file.sha256)throw Error('Model integrity mismatch');
   if(signal.aborted)throw new DOMException('Aborted','AbortError');
   const model=(await new GLTFLoader().parseAsync(data,'')).scene;
   const index=name==='model.glb'?-1:Number(name.match(/_(\d)/)![1]);
   const config=index<0?{rotations:limestone.config.rotations,position:limestone.config.position}:{rotations:limestone.config.components[index].zeroedRotations,position:limestone.config.components[index].zeroedPosition};
   for(const r of config.rotations)model.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),THREE.MathUtils.degToRad(r.degrees));
   model.position.fromArray(config.position);
   const pivot=new THREE.Group();pivot.name=`Limestone component ${index}`;pivot.add(model);root.add(pivot);
   // Published CompConstants reference offsets; stationary, unextended inspection pose.
   if(index===0)pivot.position.set(.309,-.309,.169);
   if(index===3)pivot.position.set(-.295275,0,.450950);
   if(signal.aborted)throw new DOMException('Aborted','AbortError');
  }
  return {group:root};
 }catch(error){disposeLearningModel(root);throw error;}
}
