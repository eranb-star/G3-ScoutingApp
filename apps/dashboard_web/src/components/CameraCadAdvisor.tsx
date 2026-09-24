import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {assetBuffer} from './FieldTwinCanvas';
import {loadDarwin,type PublishedRobot} from '../lib/publishedRobot';
import type {RobotModel} from '../lib/robotModel';
import {FIELD_SEASONS} from '../lib/fieldSeasons';
import type {SeasonPackage} from '../lib/seasonPackage';
import {cameraCoverage,type CameraMount,type CameraSample} from '../lib/cameraPlanning';
import {compareCoverageSets,meshVisibility,occlusionSnapshot,disposeSnapshot,type CoverageRow} from '../lib/cameraCad';
import {useLocalization} from '../lib/localization';
import {aprilTags2026} from '../lib/twinAprilTags';
type Props={season:SeasonPackage;robotId:PublishedRobot;custom?:RobotModel;cameras:CameraMount[];samples:CameraSample[];maxCameras:number};
type Loaded={field:THREE.Group;robot:THREE.Group;dispose:()=>void};
export default function CameraCadAdvisor(props:Props){
 const {pick}=useLocalization();const [open,setOpen]=useState(false),[deployed,setDeployed]=useState(false),[loaded,setLoaded]=useState<Loaded|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[rows,setRows]=useState<CoverageRow[]>([]),[target,setTarget]=useState(.9),[cameraIndex,setCameraIndex]=useState(0),[poseIndex,setPoseIndex]=useState(0),[cameraView,setCameraView]=useState(false);
 const generation=useRef(0),host=useRef<HTMLDivElement>(null),latest=useRef({props,cameraIndex,poseIndex,cameraView});latest.current={props,cameraIndex,poseIndex,cameraView};
 useEffect(()=>{generation.current++;setRows([]);setBusy(false);},[props.season,props.cameras,props.samples,props.maxCameras,target,loaded]);
 useEffect(()=>{
  if(!open){setLoaded(null);return;}let cancelled=false;const controller=new AbortController();let cleanup=()=>{};setLoaded(null);setStatus(pick('Loading verified field and robot geometry…','טוען גאומטריית מגרש ורובוט מאומתת…'));
  void (async()=>{
   const season=FIELD_SEASONS.find(s=>s.year===props.season.season);if(!season)throw Error('No installed field CAD for this season');
   const field=new THREE.Group(),robot=new THREE.Group();const owned:THREE.Object3D[]=[];
   cleanup=()=>{const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();owned.forEach(root=>root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});}}}));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
   const fieldModel=(await new GLTFLoader().parseAsync(await assetBuffer('field',controller.signal,season),'')).scene;owned.push(fieldModel);
   for(const r of season.rotations)fieldModel.rotateOnWorldAxis(new THREE.Vector3(r.axis==='x'?1:0,r.axis==='y'?1:0,r.axis==='z'?1:0),r.degrees*Math.PI/180);field.add(fieldModel);
   if(props.custom){const model=(await new GLTFLoader().parseAsync(props.custom.data,'')).scene;owned.push(model);model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());model.position.set(-center.x,-center.y,-box.min.z);const wrapper=new THREE.Group();wrapper.add(model);wrapper.scale.setScalar(props.custom.scale);wrapper.rotation.z=props.custom.rotation*Math.PI/180;robot.add(wrapper);}
   else if(props.robotId==='darwin'){const model=await loadDarwin(controller.signal);owned.push(model.group);model.update(deployed);robot.add(model.group);}
   else{const model=(await new GLTFLoader().parseAsync(await assetBuffer('robot',controller.signal,season),'')).scene;owned.push(model);model.rotateX(Math.PI/2);model.rotateOnWorldAxis(new THREE.Vector3(0,0,1),Math.PI/2);model.position.set(-.3,0,.05);robot.add(model);}
   if(cancelled){cleanup();return;}
   const fieldCopy=occlusionSnapshot(field),robotCopy=occlusionSnapshot(robot);
   setLoaded({field:fieldCopy,robot:robotCopy,dispose:()=>{disposeSnapshot(fieldCopy);disposeSnapshot(robotCopy);cleanup();}});setStatus('');
  })().catch(e=>{cleanup();if(!cancelled)setStatus(e instanceof Error?e.message:'CAD unavailable');});
  return()=>{cancelled=true;generation.current++;controller.abort();};
 },[open,props.season.season,props.robotId,props.custom,deployed]);
 useEffect(()=>()=>loaded?.dispose(),[loaded]);
 useEffect(()=>{
  if(!open||!loaded||!host.current)return;const element=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setStatus('3D preview unavailable; analysis can still run.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',pick('CAD camera placement and selected camera view','מיקום מצלמות CAD ותצוגת המצלמה הנבחרת'));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#172638');const field=loaded.field.clone(true),robot=loaded.robot.clone(true);scene.add(field,robot);scene.add(new THREE.HemisphereLight(0xffffff,0x657080,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,-5,12);scene.add(light);const tags=props.season.season===2026?aprilTags2026():null;if(tags)scene.add(tags);
  const view=new THREE.PerspectiveCamera(50,1,.01,100);view.up.set(0,0,1);view.position.set(2,-2,2);const controls=new OrbitControls(view,renderer.domElement);controls.minDistance=.05;controls.maxDistance=40;
  const mounts=new THREE.Group();robot.add(mounts);const lens=new THREE.PerspectiveCamera();lens.up.set(0,0,1);const helper=new THREE.CameraHelper(lens);scene.add(helper);let markerSignature='',lastMode='';
  const resize=()=>{renderer.setSize(element.clientWidth,element.clientHeight,false);view.aspect=element.clientWidth/Math.max(1,element.clientHeight);view.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  let inView=true;const visibility=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;});visibility.observe(element);
  const frame=()=>{if(document.hidden||!inView||!element.clientWidth||!element.clientHeight)return;const {props:p,cameraIndex:ci,poseIndex:pi,cameraView:cv}=latest.current;const pose=p.samples[Math.min(pi,p.samples.length-1)],c=p.cameras[Math.min(ci,p.cameras.length-1)];if(!pose||!c)return;
   robot.position.set(pose.x,pose.y,0);robot.rotation.z=pose.heading;
   const signature=JSON.stringify(p.cameras);if(signature!==markerSignature){mounts.children.forEach(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});mounts.clear();p.cameras.forEach(m=>{const cube=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.04),new THREE.MeshBasicMaterial({color:0xff57c2}));cube.position.set(m.x,m.y,m.z);mounts.add(cube);});markerSignature=signature;}
   const cos=Math.cos(pose.heading),sin=Math.sin(pose.heading),eye=new THREE.Vector3(pose.x+cos*c.x-sin*c.y,pose.y+sin*c.x+cos*c.y,c.z),yaw=pose.heading+c.yaw,dir=new THREE.Vector3(Math.cos(c.pitch)*Math.cos(yaw),Math.cos(c.pitch)*Math.sin(yaw),Math.sin(c.pitch));
   lens.position.copy(eye);lens.fov=c.vfov*180/Math.PI;lens.aspect=Math.tan(c.hfov/2)/Math.tan(c.vfov/2);lens.near=.025;lens.far=c.maxDistance;lens.lookAt(eye.clone().add(dir));lens.updateProjectionMatrix();lens.updateMatrixWorld(true);helper.update();helper.visible=!cv;mounts.visible=!cv;
   const mode=`${cv}:${pi}`;if(mode!==lastMode){if(!cv){view.position.set(pose.x+2,pose.y-2,2);controls.target.set(pose.x,pose.y,.4);controls.update();}lastMode=mode;}
   controls.enabled=!cv;renderer.setViewport(0,0,element.clientWidth,element.clientHeight);renderer.setScissorTest(false);renderer.clear();
   if(cv){const w=element.clientWidth,h=element.clientHeight,aspect=lens.aspect,vw=Math.min(w,h*aspect),vh=vw/aspect;renderer.setViewport((w-vw)/2,(h-vh)/2,vw,vh);renderer.setScissor((w-vw)/2,(h-vh)/2,vw,vh);renderer.setScissorTest(true);renderer.render(scene,lens);}else renderer.render(scene,view);
  };renderer.setAnimationLoop(frame);
  return()=>{renderer.setAnimationLoop(null);observer.disconnect();visibility.disconnect();controls.dispose();helper.dispose();tags?.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){Object.values(m).forEach(t=>{if(t instanceof THREE.Texture)t.dispose();});m.dispose();}}});mounts.children.forEach(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[loaded,open]);
 async function analyze(){if(!loaded)return;const epoch=++generation.current;setBusy(true);setProgress(0);setRows([]);setStatus('');
  try{const stride=Math.max(1,Math.ceil(props.samples.length/80)),samples=props.samples.filter((_,i)=>i%stride===0||i===props.samples.length-1),geometry=meshVisibility(loaded.field,loaded.robot),coverage:number[][][]=[];
   const candidates=props.cameras.filter(c=>c.permitted!==false);if(!candidates.length)throw Error('No permitted camera mounts. Enable at least one candidate.');
   for(let c=0;c<candidates.length;c++){const values:number[][]=[];for(let i=0;i<samples.length;i++){if(epoch!==generation.current)return;values.push(cameraCoverage(props.season,candidates[c],[samples[i]],[],geometry)[0].tagIds);if(i%4===0){setProgress(Math.round(100*(c*samples.length+i+1)/(candidates.length*samples.length)));await new Promise<void>(resolve=>setTimeout(resolve,0));}}coverage.push(values);}
   if(epoch===generation.current){setRows(compareCoverageSets(candidates.map(c=>c.id),coverage,props.maxCameras,target));setProgress(100);}
  }catch(e){if(epoch===generation.current)setStatus(e instanceof Error?e.message:'Analysis failed');}finally{if(epoch===generation.current)setBusy(false);}
 }
 return <section><button onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{pick('CAD camera advisor','יועץ מצלמות לפי CAD')}</button>{open&&<><p>{pick('Uses actual triangle surfaces from the installed field and selected robot CAD. Transparent surfaces are treated as opaque. KitBot analysis uses its published CAD only; added illustrative mechanisms are excluded. Verify scale and orientation visually before evaluating.','משתמש במשטחי המשולשים של CAD המגרש והרובוט. משטחים שקופים מטופלים כאטומים. ניתוח KitBot כולל רק את ה-CAD שפורסם, ללא מנגנוני המחשה שנוספו. בדקו חזותית קנה מידה וכיוון לפני הניתוח.')}</p>{props.robotId==='darwin'&&!props.custom&&<label><input type="checkbox" checked={deployed} onChange={e=>setDeployed(e.target.checked)}/>{pick('Evaluate published deployed intake pose','בדיקת תנוחת האיסוף הפרוסה שפורסמה')}</label>}{status&&<p role="status">{status}</p>}<div ref={host} className="ep-cad-view"/>
 <div className="ep-controls"><label>{pick('Camera','מצלמה')}<select value={cameraIndex} onChange={e=>setCameraIndex(Number(e.target.value))}>{props.cameras.map((c,i)=><option key={c.id} value={i}>{c.id}</option>)}</select></label><label>{pick('Route sample','דגימת מסלול')}<input type="range" min="0" max={props.samples.length-1} value={Math.min(poseIndex,props.samples.length-1)} onChange={e=>setPoseIndex(Number(e.target.value))}/></label><button onClick={()=>setCameraView(v=>!v)}>{cameraView?pick('Show mounts and field','הצגת מיקומים ומגרש'):pick('Look through this camera','מבט דרך המצלמה')}</button><label>{pick('Target route coverage','כיסוי מסלול רצוי')}<select value={target} onChange={e=>setTarget(Number(e.target.value))}>{[.75,.9,1].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label><button disabled={!loaded||busy} onClick={()=>void analyze()}>{pick('Analyze CAD visibility','ניתוח נראות CAD')}</button>{busy&&<button onClick={()=>{generation.current++;setBusy(false);setStatus(pick('Analysis cancelled.','הניתוח בוטל.'));}}>{pick('Cancel','ביטול')}</button>}</div>{busy&&<progress aria-label={pick('CAD analysis progress','התקדמות ניתוח CAD')} max="100" value={progress}/>}
 {rows.length>0&&<><p>{pick('Fewest cameras meeting the target, then coverage and resilience. At most 81 evenly spaced route samples; gaps between samples are not proven clear.','מספר המצלמות הקטן ביותר שעומד ביעד, ולאחר מכן כיסוי ועמידות. עד 81 דגימות לאורך המסלול; אין הוכחת נראות בין הדגימות.')}</p><div className="ep-table-scroll"><table><thead><tr>{[pick('Cameras','מצלמות'),pick('Coverage','כיסוי'),pick('Two tags','שתי תגיות'),pick('Worst single-camera failure','כשל במצלמה אחת')].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{rows.slice(0,8).map((r,i)=><tr key={r.ids.join()}><th>{i===0?'★ ':''}{r.ids.join(' + ')}</th><td>{r.covered}/{r.total}{r.meetsTarget?' ✓':''}</td><td>{r.multiTag}/{r.total}</td><td>{r.worstFailure}/{r.total}</td></tr>)}</tbody></table></div></>}
 <p>{pick('Localization visibility only—not a precision prediction. For game-piece/intake vision, use the camera view to assess the region of interest; detection needs a separate trained detector and real lighting tests. Evaluate both mechanism positions before choosing mounts.','נראות לצורכי מיקום בלבד, ללא תחזית דיוק. לזיהוי כדורים או איסוף השתמשו בתצוגת המצלמה לבחינת אזור העניין; זיהוי דורש גלאי נפרד ובדיקות תאורה אמיתיות. בדקו את שתי תנוחות המנגנון לפני בחירת מיקום.')}</p></>}</section>;
}
