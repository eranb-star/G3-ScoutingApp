export const ENGINE = "g3-concept-v1";
export const DT = 1 / 60;
export const MAX_TICKS = 7200;
export const FIELD = {length:651.22*.0254,width:317.677*.0254};
export type Concept = {length:number;width:number;height:number;speed:number;turn:number};
export type Command = {vx:number;vy:number;omega:number};
export type Pose = {x:number;y:number;heading:number;tick:number;distance:number;collisions:number};
export type Recording = {engine:string;asset:string;config:Concept;initial:Pose;commands:Command[];checkpoints:Pose[]};
export const DEFAULT_CONCEPT:Concept={length:.9,width:.8,height:.65,speed:2,turn:1.8};
export const START:Pose={x:-6,y:2.7,heading:0,tick:0,distance:0,collisions:0};
// Deliberately conservative planar proxies, not CAD-derived contact geometry.
export const OBSTACLES=[{x:-3.644,y:0,w:1.24,h:1.24},{x:3.644,y:0,w:1.24,h:1.24},{x:-7.85,y:0,w:.85,h:1.4},{x:7.85,y:0,w:.85,h:1.4}];
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function validConcept(c:Concept){return c&&[c.length,c.width,c.height,c.speed,c.turn].every(finite)&&c.length>=.4&&c.length<=1.4&&c.width>=.4&&c.width<=1.4&&c.height>=.2&&c.height<=1.8&&c.speed>=.2&&c.speed<=5&&c.turn>=.2&&c.turn<=4;}
export function normalized(c:Command):Command{return {vx:clamp(finite(c.vx)?c.vx:0,-1,1),vy:clamp(finite(c.vy)?c.vy:0,-1,1),omega:clamp(finite(c.omega)?c.omega:0,-1,1)};}
export function blocked(x:number,y:number,c:Concept,heading:number){
 const hx=(Math.abs(Math.cos(heading))*c.length+Math.abs(Math.sin(heading))*c.width)/2;
 const hy=(Math.abs(Math.sin(heading))*c.length+Math.abs(Math.cos(heading))*c.width)/2;
 return Math.abs(x)+hx>FIELD.length/2||Math.abs(y)+hy>FIELD.width/2||OBSTACLES.some(o=>Math.abs(x-o.x)<hx+o.w/2&&Math.abs(y-o.y)<hy+o.h/2);
}
export function step(p:Pose,input:Command,c:Concept):Pose{
 if(!validConcept(c))throw Error('Invalid concept');
 const v=normalized(input),n=Math.max(1,Math.hypot(v.vx,v.vy));
 const h=Math.atan2(Math.sin(p.heading+v.omega*c.turn*DT),Math.cos(p.heading+v.omega*c.turn*DT));
 const x=p.x+v.vx/n*c.speed*DT,y=p.y+v.vy/n*c.speed*DT;
 const collision=blocked(x,y,c,h), moved=Math.hypot(x-p.x,y-p.y)>0||h!==p.heading;
 return {x:collision?p.x:x,y:collision?p.y:y,heading:collision?p.heading:h,tick:p.tick+1,distance:p.distance+(collision?0:Math.hypot(x-p.x,y-p.y)),collisions:p.collisions+(collision&&moved?1:0)};
}
export const WAYPOINTS=[[-6,2.7],[0,2.7],[6,2.7],[6,-2.7],[0,-2.7],[-6,-2.7]];
export function autopilot(p:Pose,index:number):{command:Command;next:number}{
 let next=index;let [x,y]=WAYPOINTS[next];if(Math.hypot(x-p.x,y-p.y)<.2){next=(index+1)%WAYPOINTS.length;[x,y]=WAYPOINTS[next];}
 const dx=x-p.x,dy=y-p.y,d=Math.max(.001,Math.hypot(dx,dy)),desired=Math.atan2(dy,dx),angle=Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading));
 return {command:{vx:dx/d,vy:dy/d,omega:clamp(angle,-1,1)},next};
}
export function parseRecording(text:string):Recording{
 if(text.length>1500000)throw Error('Recording exceeds 1.5 MB');
 const r=JSON.parse(text) as Recording;
 if(r.engine!==ENGINE||r.asset!=='2026-field-v2'||!validConcept(r.config)||!Array.isArray(r.commands)||r.commands.length>MAX_TICKS||!Array.isArray(r.checkpoints)||r.checkpoints.length>MAX_TICKS/60)throw Error('Incompatible recording');
 const pose=(p:Pose)=>p&&[p.x,p.y,p.heading,p.tick,p.distance,p.collisions].every(finite)&&Math.abs(p.x)<=FIELD.length/2&&Math.abs(p.y)<=FIELD.width/2&&Number.isInteger(p.tick)&&p.tick>=0;
 if(!pose(r.initial)||blocked(r.initial.x,r.initial.y,r.config,r.initial.heading)||!r.checkpoints.every(pose)||!r.commands.every(c=>c&&[c.vx,c.vy,c.omega].every(x=>finite(x)&&Math.abs(x)<=1)))throw Error('Invalid recorded input');
 return r;
}
export function replay(r:Recording,comparison?:Concept){
 let p={...r.initial};const path:Pose[]=[];let failure:number|null=null;
 for(const command of r.commands){p=step(p,command,comparison??r.config);if(p.tick%60===0){path.push({...p});if(!comparison){const saved=r.checkpoints.find(x=>x.tick===p.tick);if(!saved||Math.abs(saved.x-p.x)>1e-5||Math.abs(saved.y-p.y)>1e-5||Math.abs(saved.heading-p.heading)>1e-5||saved.collisions!==p.collisions)failure??=p.tick;}}}
 return {pose:p,path,failure};
}
