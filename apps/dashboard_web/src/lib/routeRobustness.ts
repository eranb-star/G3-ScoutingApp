import {evaluateRoute,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import type {SeasonPackage} from './seasonPackage';

/** A half-turn of the authored route, never a change to official field/tag coordinates. */
export function oppositeAllianceRoute(route:RoutePoint[]):RoutePoint[]{
 return route.map(p=>({...p,x:-p.x,y:-p.y,heading:Math.atan2(-Math.sin(p.heading),-Math.cos(p.heading)),orientation:p.orientation==='red-hub'?'blue-hub':p.orientation==='blue-hub'?'red-hub':p.orientation}));
}
export type RobustnessLimits={speedLoss:number;actionDelay:number;positionError:number};
export const DEFAULT_ROBUSTNESS:RobustnessLimits={speedLoss:.15,actionDelay:.25,positionError:.1};
/** Deterministic sensitivity cases, not probabilities, localization simulation or hardware evidence. */
export function routeRobustness(season:SeasonPackage,robot:MotionProfile,route:RoutePoint[],limits:RobustnessLimits){
 if(!Number.isFinite(limits.speedLoss)||limits.speedLoss<0||limits.speedLoss>.5||!Number.isFinite(limits.actionDelay)||limits.actionDelay<0||limits.actionDelay>2||!Number.isFinite(limits.positionError)||limits.positionError<0||limits.positionError>.5)throw Error('Invalid robustness limits');
 const cases=[{id:'nominal',dx:0,dy:0,slow:false,delay:false},{id:'slower',dx:0,dy:0,slow:true,delay:false},{id:'actions',dx:0,dy:0,slow:false,delay:true},...[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y],i)=>({id:`offset-${i}`,dx:x*limits.positionError,dy:y*limits.positionError,slow:false,delay:false})),{id:'combined',dx:limits.positionError,dy:limits.positionError,slow:true,delay:true}];
 return cases.map(c=>{
  const motion={...robot,speed:robot.speed*(c.slow?1-limits.speedLoss:1),acceleration:robot.acceleration*(c.slow?1-limits.speedLoss:1),turnRate:robot.turnRate*(c.slow?1-limits.speedLoss:1)};
  const points=route.map(p=>({...p,x:p.x+c.dx,y:p.y+c.dy,seconds:p.seconds+(c.delay&&p.action!=='none'?limits.actionDelay:0)}));
  let unsupported=false,result;try{result=evaluateRoute(season,motion,points);}catch(e){unsupported=true;result={...evaluateRoute(season,robot,route),errors:[e instanceof Error?e.message:'Scenario exceeds supported limits']};}
  return {id:c.id,dx:c.dx,dy:c.dy,result,unsupported};
 });
}
