import {evaluateRoute,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import {routeMotion,legDistance} from './routeMotion';
import type {SeasonPackage} from './seasonPackage';
export function routePoseAt(season:SeasonPackage,robot:MotionProfile,route:RoutePoint[],elapsed:number){
 if(!Number.isFinite(elapsed))throw Error('Invalid playback time');
 const result=evaluateRoute(season,robot,route);if(result.errors.length)throw Error('Correct route constraints before playback');
 const timeline=routeMotion(robot,route),t=Math.max(0,Math.min(elapsed,result.seconds));
 if(t<timeline.initialHold)return {...route[0],phase:route[0].action,waypoint:0,done:false};
 for(let i=0;i<timeline.legs.length;i++){const leg=timeline.legs[i],a=route[i],p=route[i+1];
  if(t<leg.arrival){const ratio=leg.distance?legDistance(leg,t-leg.start,robot.acceleration)/leg.distance:(t-leg.start)/Math.max(leg.seconds,1e-9),delta=Math.atan2(Math.sin(p.heading-a.heading),Math.cos(p.heading-a.heading));return {x:a.x+(p.x-a.x)*ratio,y:a.y+(p.y-a.y)*ratio,heading:a.heading+delta*ratio,phase:p.action==='intake'?'intake':leg.distance?'moving':'turning',waypoint:i+1,done:false};}
  if(t<leg.end)return {x:p.x,y:p.y,heading:p.heading,phase:p.action,waypoint:i+1,done:false};
 }
 return {...route[route.length-1],phase:'finished',waypoint:route.length-1,done:true};
}
