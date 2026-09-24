import type {SeasonPackage,Point2,Box3} from './seasonPackage';
export type RoutePoint=Point2&{heading:number;action:'none'|'intake'|'shoot'|'wait';seconds:number;points:number;success:number;quantity?:number};
export type MotionProfile={length:number;width:number;speed:number;acceleration:number;turnRate:number;clearance:number;measured:boolean;inventory?:{capacity:number;preload:number}};
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Conservative straight segments with a full stop at each waypoint. No trajectory/controller claim. */
export function travelTime(distance:number,speed:number,acceleration:number){
 if(![distance,speed,acceleration].every(Number.isFinite)||distance<0||speed<=0||acceleration<=0)throw Error('Invalid motion limits');
 return distance<=speed*speed/acceleration?2*Math.sqrt(distance/acceleration):2*speed/acceleration+(distance-speed*speed/acceleration)/speed;
}
export function segmentHitsBox(a:Point2,b:Point2,box:Box3,padding=0){
 let lo=0,hi=1;
 for(const k of ['x','y'] as const){const d=b[k]-a[k],min=box.min[k]-padding,max=box.max[k]+padding;
  if(Math.abs(d)<1e-12){if(a[k]<min||a[k]>max)return false;continue;}
  const t1=(min-a[k])/d,t2=(max-a[k])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;
 }return true;
}
export function evaluateRoute(season:SeasonPackage,robot:MotionProfile,route:RoutePoint[]){
 if(![robot.length,robot.width,robot.speed,robot.acceleration,robot.turnRate].every(n=>Number.isFinite(n)&&n>0&&n<=20)||!Number.isFinite(robot.clearance)||robot.clearance<0||robot.clearance>2||typeof robot.measured!=='boolean')throw Error('Invalid robot profile');
 if(!Array.isArray(route)||route.length<2||route.length>100||route.some(p=>![p.x,p.y,p.heading,p.seconds,p.points,p.success].every(Number.isFinite)||p.seconds<0||p.seconds>120||p.points<0||p.points>100000||p.success<0||p.success>1||!['none','intake','shoot','wait'].includes(p.action)))throw Error('Invalid route');
 if(robot.inventory&&(!Number.isInteger(robot.inventory.capacity)||robot.inventory.capacity<1||robot.inventory.capacity>1000||!Number.isInteger(robot.inventory.preload)||robot.inventory.preload<0||robot.inventory.preload>robot.inventory.capacity))throw Error('Invalid inventory profile');
 if(route.some(p=>p.quantity!==undefined&&(!Number.isInteger(p.quantity)||p.quantity<0||p.quantity>1000)))throw Error('Invalid action quantity');
 const radius=Math.hypot(robot.length,robot.width)/2+robot.clearance;
 const errors:string[]=[],segments:{seconds:number;distance:number}[]=[];let seconds=0,distance=0,expectedPoints=0;
 let remainingPieces=robot.inventory?.preload??null;
 route.forEach((p,i)=>{
  if(remainingPieces!==null){
   if(p.action==='intake'||p.action==='shoot'){
    if(!p.quantity)errors.push(`Waypoint ${i+1}: specify a positive game-piece quantity`);
    else{remainingPieces+=p.action==='intake'?p.quantity:-p.quantity;if(remainingPieces<0)errors.push(`Waypoint ${i+1}: shooting more game pieces than available`);if(remainingPieces>robot.inventory!.capacity)errors.push(`Waypoint ${i+1}: hopper capacity exceeded`);}
   }else if(p.quantity)errors.push(`Waypoint ${i+1}: only intake/shoot actions can move game pieces`);
  }
  if(Math.abs(p.x)+radius>season.field.length/2||Math.abs(p.y)+radius>season.field.width/2)errors.push(`Waypoint ${i+1} exceeds the conservative field clearance`);
  if(p.action!=='none'&&!season.supportedInteractions.includes(p.action))errors.push(`Unsupported action: ${p.action}`);
  if(p.action==='none'&&(p.seconds!==0||p.points!==0))errors.push(`Waypoint ${i+1}: motion-only waypoint cannot award points or wait`);
  seconds+=p.seconds;expectedPoints+=p.points*p.success;
  if(!i)return;const a=route[i-1],d=Math.hypot(p.x-a.x,p.y-a.y);
  // Sequential translation and rotation is conservative; simultaneous motion needs a validated adapter.
  const t=travelTime(d,robot.speed,robot.acceleration)+Math.abs(angle(p.heading-a.heading))/robot.turnRate;
  distance+=d;seconds+=t;segments.push({seconds:t,distance:d});
  for(const b of season.field.obstacles)if(segmentHitsBox(a,p,b,radius))errors.push(`Segment ${i}: clearance intersects ${b.id}`);
 });
 const margin=season.autonomous.seconds-seconds;if(margin<0)errors.push('Route exceeds autonomous duration');
 return {seconds,distance,margin,expectedPoints,remainingPieces,segments,errors:[...new Set(errors)],finish:route[route.length-1],basis:robot.measured?'Measured motion limits; simplified stop-at-waypoint estimate':'Unmeasured motion assumptions; not match prediction'};
}
export function rankRoutes(season:SeasonPackage,robot:MotionProfile,routes:{id:string;points:RoutePoint[]}[]){
 if(routes.length>200)throw Error('Too many candidate routes');
 return routes.map(r=>({id:r.id,route:r.points,result:evaluateRoute(season,robot,r.points)})).filter(r=>!r.result.errors.length).sort((a,b)=>b.result.expectedPoints-a.result.expectedPoints||b.result.margin-a.result.margin||a.id.localeCompare(b.id));
}
