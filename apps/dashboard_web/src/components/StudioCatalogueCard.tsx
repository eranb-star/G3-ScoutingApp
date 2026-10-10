import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {entrySource,loadCatalogue,type CatalogueEntry} from '../lib/robotStudioCatalogue';
import {disposeObject} from '../lib/robotStudioGeometry';
import {useLocalization} from '../lib/localization';
let renderer:T.WebGLRenderer|undefined;
const thumbnails=new Map<string,string>();
let queue=Promise.resolve();
function preview(entry:CatalogueEntry):Promise<string>{return new Promise((resolve,reject)=>{queue=queue.then(async()=>{let object:T.Object3D|undefined;try{
 if(thumbnails.has(entry.id)){resolve(thumbnails.get(entry.id)!);return;}
 object=await loadCatalogue(entry.id);
 renderer??=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setSize(144,108);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.add(object,new T.HemisphereLight(0xffffff,0x7d8291,2.5));const light=new T.DirectionalLight(0xffffff,3);light.position.set(2,-3,4);scene.add(light);
 const box=new T.Box3().setFromObject(object),size=Math.max(.001,box.getSize(new T.Vector3()).length()),center=box.getCenter(new T.Vector3());const camera=new T.PerspectiveCamera(35,4/3,size/1000,size*100);camera.up.set(0,0,1);camera.position.copy(center).addScaledVector(new T.Vector3(1,-1,.8).normalize(),size*1.65);camera.lookAt(center);renderer.render(scene,camera);
 const url=renderer.domElement.toDataURL('image/png');thumbnails.set(entry.id,url);resolve(url);
 }catch(e){reject(e);}finally{if(object)disposeObject(object);}}).catch(()=>{});});}
export default function StudioCatalogueCard({entry,disabled,onAdd}:{entry:CatalogueEntry;disabled:boolean;onAdd:()=>void}){
 const {pick}=useLocalization(),ref=useRef<HTMLButtonElement>(null),[image,setImage]=useState('');
 useEffect(()=>{let alive=true;const observer=new IntersectionObserver(rows=>{if(rows.some(r=>r.isIntersecting)){observer.disconnect();void preview(entry).then(url=>{if(alive)setImage(url);}).catch(()=>{});}},{rootMargin:'80px'});if(ref.current)observer.observe(ref.current);return()=>{alive=false;observer.disconnect();};},[entry.id]);
 return <button ref={ref} className="studio-part-row studio-catalogue-card" disabled={disabled} draggable={!disabled} onDragStart={e=>e.dataTransfer.setData('application/g3-studio-shape','catalogue:'+entry.id)} onClick={onAdd}>{image?<img src={image} alt="" width={72} height={54}/>:<span className="studio-thumbnail-placeholder" aria-hidden="true">◇</span>}<span><strong>{pick(entry.en,entry.he)}</strong><small>{entry.category} · {entrySource(entry).credit}</small></span></button>;
}
