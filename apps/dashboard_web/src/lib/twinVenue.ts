import * as THREE from 'three';
import type {QualityTier} from './twinQuality';

export type VenueMode='competition'|'field';
export const VENUE_STORAGE='g3-twin-venue-v1';
export function loadVenue():VenueMode{try{return localStorage.getItem(VENUE_STORAGE)==='field'?'field':'competition';}catch{return 'competition';}}

/** Illustrative event hall. All geometry stays outside the playing surface; no colliders. */
export function competitionVenue(length:number,width:number){
 const group=new THREE.Group();group.name='competition-venue';
 const detail=new THREE.Group(),overhead=new THREE.Group();group.add(detail,overhead);
 const materials={floor:new THREE.MeshStandardMaterial({color:0x3c4148,roughness:.88}),wall:new THREE.MeshStandardMaterial({color:0x606975,roughness:.9}),steel:new THREE.MeshStandardMaterial({color:0x303a46,metalness:.5,roughness:.5}),seating:new THREE.MeshStandardMaterial({color:0x233548,roughness:.85}),red:new THREE.MeshStandardMaterial({color:0xa82646,roughness:.8}),blue:new THREE.MeshStandardMaterial({color:0x2468aa,roughness:.8}),lamp:new THREE.MeshBasicMaterial({color:0xe8efff}),drape:new THREE.MeshStandardMaterial({color:0x17212e,roughness:1})};
 const cube=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
 function blocks(items:number[][],material:THREE.Material,parent:THREE.Group=group){const mesh=new THREE.InstancedMesh(cube,material,items.length);items.forEach((v,i)=>{matrix.compose(new THREE.Vector3(...v.slice(0,3) as [number,number,number]),rotation,new THREE.Vector3(...v.slice(3,6) as [number,number,number]));mesh.setMatrixAt(i,matrix);});mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 const hx=Math.max(22,length/2+12),hy=Math.max(17,width/2+12),standY=width/2+5;
 blocks([[0,0,-.13,hx*2,hy*2,.12]],materials.floor);
 blocks([[0,-hy,4,hx*2,.2,8],[0,hy,4,hx*2,.2,8],[-hx,0,4,.2,hy*2,8],[hx,0,4,.2,hy*2,8]],materials.wall);
 const tiers:number[][]=[],seats:number[][]=[],backs:number[][]=[],columns:number[][]=[],lamps:number[][]=[],beams:number[][]=[];
 for(const side of [-1,1])for(let row=0;row<5;row++){
  const y=side*(standY+row*.85),z=.25+row*.38;
  tiers.push([0,y,z/2,length+5,.85,z]);
  for(let n=0;n<32;n++){const x=(n-15.5)*.61;seats.push([x,y,z+.38,.48,.43,.09]);backs.push([x,y+side*.2,z+.62,.48,.08,.48]);}
 }
 blocks(tiers,materials.steel);blocks(seats,materials.seating,detail);blocks(backs,materials.seating,detail);
 for(const side of [-1,1])for(let x=-18;x<=18;x+=6){columns.push([x,side*(hy-.25),4,.18,.18,8]);lamps.push([x,side*(width/2+1.5),8.1,2,.4,.07]);beams.push([x,0,8.4,.13,hy*2,.13]);}
 blocks(columns,materials.steel);blocks(beams,materials.steel,overhead);blocks(lamps,materials.lamp,overhead);
 // Aisle rails and team-colored end drapes sit beyond the driver area.
 const rails:number[][]=[];for(const side of [-1,1]){rails.push([0,side*(standY-1),.9,length+5,.05,.05]);for(let x=-10;x<=10;x+=2)rails.push([x,side*(standY-1),.45,.05,.05,.9]);}
 blocks(rails,materials.steel);blocks([[-hx+1,0,1.1,.1,width+7,2.2]],materials.red);blocks([[hx-1,0,1.1,.1,width+7,2.2]],materials.blue);
 blocks([[-hx+.6,0,4.8,.1,9,3.4],[hx-.6,0,4.8,.1,9,3.4]],materials.drape);
 let paintScores:((scores:number[])=>void)|undefined;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;const ctx=canvas.getContext('2d');
  if(ctx){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture});
   for(const side of [-1,1]){const screen=new THREE.Mesh(new THREE.PlaneGeometry(8.8,3.2),material);screen.position.set(side*(hx-.5),0,4.8);screen.up.set(0,0,1);screen.lookAt(0,0,4.8);group.add(screen);}
   let previous='';paintScores=(scores)=>{const key=scores.join(',');if(key===previous)return;previous=key;ctx.fillStyle='#0c1725';ctx.fillRect(0,0,1024,384);ctx.textAlign='center';ctx.fillStyle='#c4d7e7';ctx.font='600 38px sans-serif';ctx.fillText('G3  /  DRIVER PRACTICE',512,65);ctx.fillStyle='#f16c86';ctx.font='bold 95px monospace';ctx.fillText(`RED ${scores[0]??0}`,270,205);ctx.fillStyle='#68b9ff';ctx.fillText(`BLUE ${scores[1]??0}`,755,205);ctx.fillStyle='#8cabbc';ctx.font='26px sans-serif';ctx.fillText('BALLS SCORED  ·  TRAINING SESSION',512,310);texture.needsUpdate=true;};
  }
 }
 return {group,update(mode:VenueMode,tier:QualityTier,driver:boolean,scores:number[]=[]){group.visible=mode==='competition';detail.visible=tier!=='low';overhead.visible=driver&&tier!=='low';if(group.visible)paintScores?.(scores);}};
}
