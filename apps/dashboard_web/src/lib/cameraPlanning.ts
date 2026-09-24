import type {Box3,SeasonPackage} from './seasonPackage';
export type CameraMount={id:string;x:number;y:number;z:number;yaw:number;pitch:number;hfov:number;vfov:number;maxDistance:number;pixelsWide:number;minTagPixels:number};
export type CameraSample={x:number;y:number;heading:number};
type V={x:number;y:number;z:number};
export type VisibilityGeometry=(eye:V,target:V,localEye:V,localTarget:V)=>boolean;
/** Segment-box intersection in 3D; boxes and eye/target use the same declared frame. */
export function occluded(a:V,b:V,boxes:Box3[]){return boxes.some(box=>{
 let lo=0,hi=1;for(const k of ['x','y','z'] as const){const d=b[k]-a[k];if(Math.abs(d)<1e-10){if(a[k]<box.min[k]||a[k]>box.max[k])return false;continue;}
 const t1=(box.min[k]-a[k])/d,t2=(box.max[k]-a[k])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}
 return hi>1e-5&&lo<1-1e-5;
});}
export function cameraCoverage(season:SeasonPackage,camera:CameraMount,samples:CameraSample[],robotBoxes:Box3[]=[],geometry?:VisibilityGeometry){
 if(!camera||!camera.id||![camera.x,camera.y,camera.z,camera.yaw,camera.pitch,camera.hfov,camera.vfov,camera.maxDistance,camera.pixelsWide,camera.minTagPixels].every(Number.isFinite)||camera.z<0||camera.z>3||Math.abs(camera.x)>3||Math.abs(camera.y)>3||camera.hfov<=0||camera.hfov>=Math.PI||camera.vfov<=0||camera.vfov>=Math.PI||camera.maxDistance<=0||camera.maxDistance>100||camera.pixelsWide<1||camera.pixelsWide>16000||camera.minTagPixels<1||camera.minTagPixels>camera.pixelsWide||samples.length>1000||samples.some(p=>![p.x,p.y,p.heading].every(Number.isFinite)))throw Error('Invalid camera evaluation');
 return samples.map(p=>{
  const c=Math.cos(p.heading),s=Math.sin(p.heading),eye={x:p.x+c*camera.x-s*camera.y,y:p.y+s*camera.x+c*camera.y,z:camera.z};
  const yaw=p.heading+camera.yaw,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const seen=season.field.tags.filter(tag=>{
   const dx=tag.x-eye.x,dy=tag.y-eye.y,dz=tag.z-eye.z,d=Math.hypot(dx,dy,dz);if(d<.01||d>camera.maxDistance)return false;
   const forward=cp*(cy*dx+sy*dy)+sp*dz,right=-sy*dx+cy*dy,up=-sp*(cy*dx+sy*dy)+cp*dz;
   if(forward<=0||Math.abs(Math.atan2(right,forward))>camera.hfov/2||Math.abs(Math.atan2(up,forward))>camera.vfov/2)return false;
   const facing=(-dx*Math.cos(tag.yaw)-dy*Math.sin(tag.yaw))/d;if(facing<=0)return false;
   const pixels=tag.size*facing*camera.pixelsWide/(2*forward*Math.tan(camera.hfov/2));if(pixels<camera.minTagPixels)return false;
   const localTarget={x:c*(tag.x-p.x)+s*(tag.y-p.y),y:-s*(tag.x-p.x)+c*(tag.y-p.y),z:tag.z};
   if(geometry)return geometry(eye,tag,camera,localTarget);
   if(occluded(eye,tag,season.field.obstacles))return false;
   return !occluded(camera,localTarget,robotBoxes);
  }).map(t=>t.id);
  return {pose:p,tagIds:seen};
 });
}
export function rankCameraSets(season:SeasonPackage,cameras:CameraMount[],samples:CameraSample[],maxCount:number,robotBoxes:Box3[]=[]){
 if(!samples.length||cameras.length>12||!cameras.length||new Set(cameras.map(c=>c.id)).size!==cameras.length||!Number.isInteger(maxCount)||maxCount<1||maxCount>3)throw Error('Choose 1–12 candidates, 1–3 cameras and at least one pose');
 const coverage=cameras.map(c=>cameraCoverage(season,c,samples,robotBoxes));
 const results:{ids:string[];covered:number;multiTag:number;total:number}[]=[];
 function visit(start:number,chosen:number[]){
  if(chosen.length){let covered=0,multiTag=0;for(let n=0;n<samples.length;n++){const tags=new Set(chosen.flatMap(i=>coverage[i][n].tagIds));if(tags.size)covered++;if(tags.size>=2)multiTag++;}results.push({ids:chosen.map(i=>cameras[i].id),covered,multiTag,total:samples.length});}
  if(chosen.length===maxCount)return;for(let i=start;i<cameras.length;i++)visit(i+1,[...chosen,i]);
 }visit(0,[]);
 return results.sort((a,b)=>b.covered-a.covered||b.multiTag-a.multiTag||a.ids.length-b.ids.length||a.ids.join().localeCompare(b.ids.join()));
}
