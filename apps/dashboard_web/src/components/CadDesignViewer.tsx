import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {useLocalization} from '../lib/localization';
export type CadGeometry={units:string;meshes:{id:string;name:string;positions:number[];transform?:number[]}[];lines?:{id:string;name:string;positions:number[]}[];coverage:string;gaps?:string[]};
export default function CadDesignViewer({geometry}:{geometry:CadGeometry}){
 const {pick}=useLocalization(),host=useRef<HTMLDivElement>(null),shell=useRef<HTMLDivElement>(null),api=useRef<{fit:()=>void;select:(id:string)=>void;isolate:(id:string)=>void}|null>(null);
 const [selected,setSelected]=useState(''),[isolated,setIsolated]=useState(false),[expanded,setExpanded]=useState(false),[error,setError]=useState(''),[size,setSize]=useState('');
 const entries=[...geometry.meshes,...Array.from(new Map((geometry.lines||[]).map(line=>[line.id.split('/')[0],{id:line.id.split('/')[0],name:line.name}])).values())];
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);if(expanded&&e.key==='Tab'){const items=Array.from(shell.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select')||[]),first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};if(expanded)shell.current?.querySelector<HTMLElement>('button')?.focus();document.addEventListener('keydown',key);const before=document.body.style.overflow;if(expanded)document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=before;if(expanded)previous?.focus();};},[expanded]);
 useEffect(()=>{
  if(!host.current)return;setSelected('');setIsolated(false);setError('');
  const element=host.current,scene=new THREE.Scene();scene.background=new THREE.Color('#142437');
  const camera=new THREE.PerspectiveCamera(40,1,.00001,10000);camera.up.set(0,0,1);
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError(pick('3D rendering is unavailable in this browser. Evidence and reviews remain available.','תצוגת תלת־ממד אינה זמינה בדפדפן זה. המקורות והבדיקות עדיין זמינים.'));return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));element.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.0001;
  const group=new THREE.Group();scene.add(group,new THREE.HemisphereLight(0xffffff,0x718599,2.4));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,-4,5);scene.add(light);
  const objects=new Map<string,THREE.Mesh|THREE.Line>();
  for(const [index,item] of geometry.meshes.entries()){
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(item.positions,3));g.computeVertexNormals();
   const material=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.53+(index%5)*.025,.3,.62),roughness:.48,metalness:.25,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(g,material);mesh.userData.id=item.id;if(item.transform)mesh.applyMatrix4(new THREE.Matrix4().fromArray(item.transform).transpose());group.add(mesh);objects.set(item.id,mesh);
  }
  for(const item of geometry.lines||[]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(item.positions,3));const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x76ede1}));line.userData.id=item.id.split('/' )[0];group.add(line);objects.set(item.id,line);}
  const whole=new THREE.Box3().setFromObject(group);const dimensions=whole.getSize(new THREE.Vector3());setSize(whole.isEmpty()?'':`${(dimensions.x*1000).toFixed(1)} × ${(dimensions.y*1000).toFixed(1)} × ${(dimensions.z*1000).toFixed(1)} mm`);
  function fit(){const visible=new THREE.Box3();group.children.filter(o=>o.visible).forEach(o=>visible.expandByObject(o));if(visible.isEmpty()){camera.position.set(1,-1,1);controls.target.set(0,0,0);}else{const center=visible.getCenter(new THREE.Vector3()),radius=Math.max(visible.getSize(new THREE.Vector3()).length(),.002);controls.target.copy(center);const viewDirection=!geometry.meshes.length?(dimensions.y<1e-6?new THREE.Vector3(0,-1,0):dimensions.z<1e-6?new THREE.Vector3(0,0,1):dimensions.x<1e-6?new THREE.Vector3(1,0,0):new THREE.Vector3(1,-1,.8)):new THREE.Vector3(1,-1,.8);camera.position.copy(center).add(viewDirection.normalize().multiplyScalar(radius*1.5));camera.near=Math.max(radius/100000,.000001);camera.far=Math.max(radius*100,10);camera.updateProjectionMatrix();}controls.update();}
  function select(id:string){setSelected(id);objects.forEach(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.MeshStandardMaterial).emissive.set(o.userData.id===id?0x77005d:0);else (o.material as THREE.LineBasicMaterial).color.set(o.userData.id===id?0xff85d0:0x76ede1);});}
  api.current={fit,select,isolate:id=>{objects.forEach(o=>o.visible=!id||o.userData.id===id);fit();}};
  const ray=new THREE.Raycaster();ray.params.Line!.threshold=.002;let down={x:0,y:0};
  const pointerDown=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};};
  const pointerUp=(event:PointerEvent)=>{if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>5)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(group.children.filter(o=>o.visible))[0];if(hit)select(hit.object.userData.id);};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  const resize=new ResizeObserver(()=>{const width=element.clientWidth,height=element.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(element);fit();
  let frame=0;const draw=()=>{frame=requestAnimationFrame(draw);controls.update();renderer.render(scene,camera);};draw();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();objects.forEach(o=>{o.geometry.dispose();(o.material as THREE.Material).dispose();});renderer.dispose();renderer.domElement.remove();api.current=null;};
 },[geometry]);
 return <section ref={shell} role={expanded?'dialog':undefined} aria-modal={expanded||undefined} className={`cad-viewer ${expanded?'cad-viewer-expanded':''}`} aria-label={pick('Actual Onshape geometry','גאומטריית Onshape המקורית')}>
  <div className="cad-viewer-toolbar"><strong>{pick('Design inspection','בדיקת התכנון')}</strong><div className="cad-actions"><button onClick={()=>api.current?.fit()}>{pick('Fit view','התאמת תצוגה')}</button><button disabled={!selected} aria-pressed={isolated} onClick={()=>{api.current?.isolate(isolated?'':selected);setIsolated(!isolated);}}>{isolated?pick('Show all','הצגת הכל'):pick('Isolate part','בידוד חלק')}</button><button onClick={()=>setExpanded(!expanded)}>{expanded?pick('Close full screen','סגירת מסך מלא'):pick('Full screen','מסך מלא')}</button></div></div>
  <div className="cad-viewer-canvas" ref={host}/>
  <div className="cad-viewer-footer"><label>{pick('Selected part or sketch','החלק או הסקיצה שנבחרו')}<select value={selected} onChange={e=>{api.current?.select(e.target.value);if(isolated)api.current?.isolate(e.target.value);}}><option value="">{pick('Click the model or choose here','לחצו על המודל או בחרו כאן')}</option>{entries.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><div><small>{pick('Model envelope · X × Y × Z','מעטפת המודל · X × Y × Z')}</small><strong dir="ltr">{size||'—'}</strong><small>{pick('Drag to orbit · scroll/pinch to zoom · right-drag to pan','גרירה לסיבוב · גלילה/צביטה לזום · גרירה ימנית להזזה')}</small></div></div>
  {error&&<p role="alert">{error}</p>}{!entries.length&&<p className="cad-viewer-empty">{geometry.coverage==='empty-assembly'?pick('This assembly has no placed parts yet. Choose its Part Studio to review the work in progress.','בהרכבה זו עדיין אין חלקים מוצבים. בחרו Part Studio כדי לבדוק את העבודה בתהליך.'):pick('No renderable geometry was returned. Review the imported feature evidence below or open this revision in Onshape.','לא התקבלה גאומטריה להצגה. בדקו את נתוני התכונות למטה או פתחו גרסה זו ב-Onshape.')}</p>}
  {!!geometry.gaps?.length&&<p>{pick('Sketch geometry unavailable for:','גאומטריית סקיצה אינה זמינה עבור:')} {geometry.gaps.join(', ')}</p>}
 </section>;
}
