import {Concept,DT,FIELD,Pose,Command} from './conceptTwin';
import {HUB_X,HUB_ENTRY_Z,muzzleOffset,rotateVector,ShooterConfig} from './shooter';
import type {IntakeConfig} from './intake';

export const TELEMETRY_SCHEMA='g3-telemetry-v1';
export const MAX_SAMPLES=36001; // initial state + ten minutes at 60 Hz
export const FRAME='Field centre origin; +X toward BLUE, +Y left when looking from the red wall toward the blue wall, +Z up; heading CCW from +X. SI units; angles in degrees.';
export const wrapDegrees=(r:number)=>Math.atan2(Math.sin(r),Math.cos(r))*180/Math.PI;
export function geometry(p:Pose,c:Concept,s:ShooterConfig,target:0|1){
 const q=p.rotation??{x:0,y:0,z:Math.sin(p.heading/2),w:Math.cos(p.heading/2)};
 const offset=muzzleOffset(q,c.length,s.height,s.yaw),muzzle={x:p.x+offset.x,y:p.y+offset.y,z:(p.z??0)+.3+offset.z};
 const dx=HUB_X[target]-muzzle.x,dy=-muzzle.y,dz=HUB_ENTRY_Z-muzzle.z;
 const v=p.velocity??{x:0,y:0,z:0},a=p.angularVelocity??{x:0,y:0,z:0};
 const forward=rotateVector(q,1,0,0),left=rotateVector(q,0,1,0),aim=rotateVector(q,Math.cos((s.yaw??0)*Math.PI/180),Math.sin((s.yaw??0)*Math.PI/180),0);
 // Project all eight collision-envelope corners; clearance is to inner wall faces.
 let maxX=0,maxY=0;
 for(const x of [-c.length/2,c.length/2])for(const y of [-c.width/2,c.width/2])for(const z of [.08-.3,c.height-.3]){
  const corner=rotateVector(q,x,y,z);maxX=Math.max(maxX,Math.abs(p.x+corner.x));maxY=Math.max(maxY,Math.abs(p.y+corner.y));
 }
 return {tick:p.tick,simSeconds:p.tick*DT,x:p.x,y:p.y,z:p.z??0,headingDeg:wrapDegrees(p.heading),
  pitchDeg:Math.asin(Math.max(-1,Math.min(1,2*(q.w*q.y-q.z*q.x))))*180/Math.PI,
  rollDeg:Math.atan2(2*(q.w*q.x+q.y*q.z),1-2*(q.x*q.x+q.y*q.y))*180/Math.PI,
  vx:v.x,vy:v.y,vz:v.z,forwardMps:v.x*forward.x+v.y*forward.y+v.z*forward.z,
  leftMps:v.x*left.x+v.y*left.y+v.z*left.z,yawRateDegS:a.z*180/Math.PI,
  muzzleX:muzzle.x,muzzleY:muzzle.y,muzzleZ:muzzle.z,targetX:HUB_X[target],targetY:0,targetZ:HUB_ENTRY_Z,
  rangeM:Math.hypot(dx,dy),slantM:Math.hypot(dx,dy,dz),bearingDeg:Math.atan2(dy,dx)*180/Math.PI,
  aimErrorDeg:Math.hypot(dx,dy)<1e-8?null:wrapDegrees(Math.atan2(dy,dx)-Math.atan2(aim.y,aim.x)),
  wallClearanceM:Math.min(FIELD.length/2-.05-maxX,FIELD.width/2-.05-maxY)};
}
export type Telemetry=ReturnType<typeof geometry>;
export type Sample=Telemetry&{target:'red'|'blue';commandX:number;commandY:number;commandTurn:number;intakeOn:boolean;shooterOn:boolean;stored:number;redGoals:number;blueGoals:number;shots:number};
export function sample(p:Pose,c:Concept,s:ShooterConfig,i:IntakeConfig,target:0|1,cmd:Command):Sample {
 return {...geometry(p,c,s,target),target:target===0?'red':'blue',commandX:cmd.vx,commandY:cmd.vy,commandTurn:cmd.omega,intakeOn:i.on,shooterOn:s.on,stored:p.collected??0,redGoals:p.scores?.[0]??0,blueGoals:p.scores?.[1]??0,shots:p.shots??0};
}
export function telemetryCsv(rows:Sample[]){
 if(!rows.length)return '';
 const keys=Object.keys(rows[0]) as (keyof Sample)[];
 return [keys.join(','),...rows.map(row=>keys.map(k=>row[k]??'').join(','))].join('\r\n');
}
