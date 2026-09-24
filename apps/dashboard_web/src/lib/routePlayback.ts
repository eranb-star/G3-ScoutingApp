import {evaluateRoute,travelTime,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import type {SeasonPackage} from './seasonPackage';
/** Preview the same stop/translate/turn/action assumptions used by the evaluator. */
export function routePoseAt(season:SeasonPackage,robot:MotionProfile,route:RoutePoint[],elapsed:number){
 if(!Number.isFinite(elapsed))throw Error('Invalid playback time');
 const result=evaluateRoute(season,robot,route);
 if(result.errors.length)throw Error('Correct route constraints before playback');
 let remaining=Math.max(0,Math.min(elapsed,result.seconds));
 for(let i=0;i<route.length;i++){
  const p=route[i];
  if(i){
   const a=route[i-1],distance=Math.hypot(p.x-a.x,p.y-a.y),duration=travelTime(distance,robot.speed,robot.acceleration);
   if(remaining<duration){
    const ramp=Math.min(robot.speed/robot.acceleration,Math.sqrt(distance/robot.acceleration));
    const peak=ramp*robot.acceleration;
    const travelled=remaining<ramp?.5*robot.acceleration*remaining**2:remaining>duration-ramp?distance-.5*robot.acceleration*(duration-remaining)**2:.5*robot.acceleration*ramp**2+peak*(remaining-ramp);
    const ratio=distance?travelled/distance:1;
    return {x:a.x+(p.x-a.x)*ratio,y:a.y+(p.y-a.y)*ratio,heading:a.heading,phase:'moving',waypoint:i,done:false};
   }
   remaining-=duration;
   const delta=Math.atan2(Math.sin(p.heading-a.heading),Math.cos(p.heading-a.heading)),turn=Math.abs(delta)/robot.turnRate;
   if(remaining<turn)return {x:p.x,y:p.y,heading:a.heading+delta*remaining/turn,phase:'turning',waypoint:i,done:false};
   remaining-=turn;
  }
  if(remaining<p.seconds)return {x:p.x,y:p.y,heading:p.heading,phase:p.action,waypoint:i,done:false};
  remaining-=p.seconds;
 }
 const finish=route[route.length-1];
 return {x:finish.x,y:finish.y,heading:finish.heading,phase:'finished',waypoint:route.length-1,done:true};
}
