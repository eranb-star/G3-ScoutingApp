import type {Pose} from './conceptTwin';
import {DT} from './conceptTwin';
import {rotateVector} from './shooter';

type Point={x:number;y:number;z:number};
const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
/** Capacity-scaled illustrative packing in the reference KitBot, not internal physics. */
export function hopperSlot(index:number,capacity:number){
 const n=Math.max(8,Math.min(60,Math.floor(capacity))),cols=Math.ceil(Math.cbrt(n)),layers=Math.ceil(n/(cols*cols));
 const dx=.38/cols,dy=.40/cols,dz=.32/layers;
 const x=-.29+dx*(index%cols+.5),radius=Math.min(.075,dx*.46,dy*.46,dz*.46);
 // Reference bottom panel slopes down toward the front launcher.
 const floor=.490-(x+.314)/.438*.352;
 return {x,y:-.20+dy*(Math.floor(index/cols)%cols+.5),z:floor+radius+.005+dz*Math.floor(index/(cols*cols)),radius};
}
export function hopperVisuals(pose:Pose,capacity:number){
 const events=pose.fuelVisualEvents??[],ids=pose.storedIds??[];
 const captures=new Map(events.filter(e=>e.kind==='capture').map(e=>[e.id,e]));
 const shots=new Map(events.filter(e=>e.kind==='shot').map(e=>[e.id,e]));
 const stored=ids.map((id,index)=>{
  const slot=hopperSlot(index,capacity),event=captures.get(id);
  const age=event?(pose.tick-event.tick)*DT:Infinity;
  const t=Math.max(0,Math.min(1,age/.30));
  const point=event&&t<1?mix(event.local,slot,t*t*(3-2*t)):slot;
  return {id,...point,radius:slot.radius};
 });
 // Each launched ball replaces its own field instance briefly, never duplicates it.
 const field=(pose.balls??[]).map(ball=>{
  const event=shots.get(ball.id);
  const age=event?(pose.tick-event.tick)*DT:Infinity;
  if(!event||age<0||age>=.16)return {...ball,radius:.075};
  const slot=hopperSlot(0,capacity),t=Math.min(1,age/.16);
  const q=pose.rotation??{x:0,y:0,z:Math.sin(pose.heading/2),w:Math.cos(pose.heading/2)};
  const local=mix(slot,event.local,Math.min(1,t*2)),r=rotateVector(q,local.x,local.y,local.z);
  const start={x:pose.x+r.x,y:pose.y+r.y,z:(pose.z??0)+r.z};
  return {id:ball.id,...mix(start,ball,Math.max(0,t*2-1)),radius:slot.radius+(.075-slot.radius)*t};
 });
 return {stored,field};
}
