import type {CameraMount,CameraSample} from './cameraPlanning';
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
/** Z-up robot frame; translation direction and chassis yaw are independent for swerve. */
export function mountedCameraPose(p:CameraSample,c:CameraMount){
 const co=Math.cos(p.heading),si=Math.sin(p.heading),yaw=p.heading+c.yaw;
 return {eye:{x:p.x+co*c.x-si*c.y,y:p.y+si*c.x+co*c.y,z:c.z},yaw,
  direction:{x:Math.cos(c.pitch)*Math.cos(yaw),y:Math.cos(c.pitch)*Math.sin(yaw),z:Math.sin(c.pitch)}};
}
/** Retain all endpoints and sample rotation even when translation is zero. */
export function cameraRouteSamples(route:CameraSample[],spacing=.5){
 const counts=route.map((p,i)=>!i?0:Math.max(1,Math.ceil(Math.hypot(p.x-route[i-1].x,p.y-route[i-1].y)/spacing),Math.ceil(Math.abs(angleDelta(route[i-1].heading,p.heading))/(Math.PI/18))));
 const scale=Math.max(1,counts.reduce((a,b)=>a+b,0)/Math.max(1,999-route.length));
 return route.flatMap((p,i)=>{if(!i)return [{...p}];const a=route[i-1],delta=angleDelta(a.heading,p.heading);
 const n=Math.max(1,Math.ceil(counts[i]/scale));
 return Array.from({length:n},(_,j)=>{const t=(j+1)/n;return {x:a.x+(p.x-a.x)*t,y:a.y+(p.y-a.y)*t,heading:a.heading+delta*t};});});
}
export function faceNext<T extends CameraSample>(route:T[],i:number):number{
 const p=route[i];for(let j=i+1;j<route.length;j++){const b=route[j];if(Math.hypot(b.x-p.x,b.y-p.y)>1e-6)return Math.atan2(b.y-p.y,b.x-p.x);}return p.heading;
}
