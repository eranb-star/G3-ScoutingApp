import type {MotionProfile,RoutePoint} from './autonomousPlanning';
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export type MotionLeg={distance:number;seconds:number;start:number;arrival:number;end:number;v0:number;v1:number;peak:number;up:number;cruise:number;down:number;hold:number};
/** Shared preview/evaluation timing. Intake runs during the incoming leg; only shoot/wait dwell.
 * Polyline corners remain a planning approximation, not a drivetrain trajectory. */
export function routeMotion(robot:MotionProfile,route:RoutePoint[]){
 const a=robot.acceleration,n=route.length,dist=route.slice(1).map((p,i)=>Math.hypot(p.x-route[i].x,p.y-route[i].y));
 const caps=dist.map((d,i)=>{const p=route[i+1],turn=Math.abs(angle(p.heading-route[i].heading));return Math.min(robot.speed,turn>0&&d>0?d*robot.turnRate/turn:robot.speed,p.action==='intake'&&p.seconds>0&&d>0?d/p.seconds:robot.speed);});
 const velocities=route.map((p,i)=>i===0||i===n-1||p.action==='shoot'||p.action==='wait'?0:Math.min(caps[i-1],caps[i]));
 // Stop for a literal reversal or zero-length leg; never teleport through a direction reversal.
 for(let i=1;i<n-1;i++){const u=dist[i-1],v=dist[i];if(!u||!v)velocities[i]=0;else{const dot=((route[i].x-route[i-1].x)*(route[i+1].x-route[i].x)+(route[i].y-route[i-1].y)*(route[i+1].y-route[i].y))/(u*v);velocities[i]*=Math.sqrt(Math.max(0,(1+dot)/2));}}
 for(let i=1;i<n;i++)velocities[i]=Math.min(velocities[i],Math.sqrt(velocities[i-1]**2+2*a*dist[i-1]));
 for(let i=n-2;i>=0;i--)velocities[i]=Math.min(velocities[i],Math.sqrt(velocities[i+1]**2+2*a*dist[i]));
 const initialHold=route[0].action==='shoot'||route[0].action==='wait'?route[0].seconds:0;let clock=initialHold;
 const legs:MotionLeg[]=dist.map((d,i)=>{const p=route[i+1],v0=velocities[i],v1=velocities[i+1],peak=Math.min(caps[i],Math.sqrt(a*d+(v0*v0+v1*v1)/2));
 const up=Math.max(0,(peak-v0)/a),down=Math.max(0,(peak-v1)/a),ramp=(v0+peak)*up/2+(v1+peak)*down/2,cruise=peak>0?Math.max(0,d-ramp)/peak:0;
 const seconds=d>0?up+cruise+down:Math.abs(angle(p.heading-route[i].heading))/robot.turnRate,hold=p.action==='shoot'||p.action==='wait'?p.seconds:0;
 const leg={distance:d,seconds,start:clock,arrival:clock+seconds,end:clock+seconds+hold,v0,v1,peak,up,cruise,down,hold};clock=leg.end;return leg;});
 return {legs,seconds:clock,initialHold};
}
export function legDistance(leg:MotionLeg,time:number,acceleration:number){const t=Math.max(0,Math.min(time,leg.seconds));if(t<leg.up)return leg.v0*t+acceleration*t*t/2;if(t<leg.up+leg.cruise)return (leg.v0+leg.peak)*leg.up/2+leg.peak*(t-leg.up);const left=leg.seconds-t;return leg.distance-leg.v1*left-acceleration*left*left/2;}
