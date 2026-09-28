import {evaluateRoute,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import {clearancePath} from './routeGeneration';
import type {SeasonPackage} from './seasonPackage';
import {HUB_X,HUB_ENTRY_Z,type ShooterConfig} from './shooter';
/** Bounded ideal-ballistics candidates, not measured shot success or a global optimum. */
export function shootingStops(season:SeasonPackage,robot:MotionProfile,route:RoutePoint[],shooter:ShooterConfig,alliance:0|1){
 if(season.season!==2026)throw Error('Shooting stop suggestions currently support the 2026 field.');
 const initial=evaluateRoute(season,robot,route);if(initial.errors.length)throw Error('Resolve route errors before recommending a shooting stop.');
 const count=initial.remainingPieces??0;if(count<1)throw Error('Plan a collection or preload before adding a shooting stop.');
 const elevation=shooter.elevation*Math.PI/180,vz=shooter.speed*Math.sin(elevation),disc=vz*vz-2*9.81*(HUB_ENTRY_Z-shooter.height);
 if(disc<=0)throw Error('Configured launch speed/angle cannot reach the hub entry height in the ideal model.');
 const flight=(vz+Math.sqrt(disc))/9.81,range=shooter.speed*Math.cos(elevation)*flight+robot.length/2+.09,hub=HUB_X[alliance],start=route[route.length-1];
 const candidates=[];
 for(const offset of [-45,-22.5,0,22.5,45]){const angle=(alliance===0?Math.PI:0)+offset*Math.PI/180,x=hub+Math.cos(angle)*range,y=Math.sin(angle)*range;
 // Entire bumper stays on the home side of the hub; conservative scoring-zone subset.
 if(alliance===0?x+Math.hypot(robot.length,robot.width)/2>hub-.75:x-Math.hypot(robot.length,robot.width)/2<hub+.75)continue;
 const path=clearancePath(season,robot,start,{x,y});if(!path)continue;
 const appended=path.slice(1).map((p,i):RoutePoint=>({...p,heading:Math.atan2(-y,hub-x)-(shooter.yaw??0)*Math.PI/180,orientation:i===path.length-2?(alliance===0?'red-hub':'blue-hub'):'travel',action:i===path.length-2?'shoot':'none',quantity:i===path.length-2?count:0,seconds:i===path.length-2?Math.ceil(count/(shooter.lanes??1))/shooter.rate+flight+.25:0,points:0,success:1}));
 const base=route.map(p=>({...p,orientation:robot.headingMode&&robot.headingMode!=='manual'?robot.headingMode:p.orientation}));const points=[...base,...appended];if(points.length>100)continue;
 const profile={...robot,headingMode:'manual' as const},result=evaluateRoute(season,profile,points);
 if(!result.errors.length&&!result.warnings.some(w=>!w.startsWith('Optional time reserve')))candidates.push({points,result,x,y,range});
 }
 return candidates.sort((a,b)=>a.result.seconds-b.result.seconds).slice(0,3);
}
