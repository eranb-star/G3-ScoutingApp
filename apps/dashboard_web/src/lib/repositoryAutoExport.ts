import template from './templates/G3DrivePlan.java?raw';
import {evaluateRoute} from './autonomousPlanning';
import {routePoseAt} from './routePlayback';
import type {AutoPlan} from './autonomousExport';
export type OdometryTransform={x:number;y:number;yaw:number;reviewed:boolean};
export function toOdometry(p:{x:number;y:number;heading:number},frame:OdometryTransform){
 if(!frame.reviewed||![frame.x,frame.y,frame.yaw,p.x,p.y,p.heading].every(Number.isFinite))throw Error('FRAME_REVIEW_REQUIRED');
 const c=Math.cos(frame.yaw),s=Math.sin(frame.yaw);
 return {x:frame.x+c*p.x-s*p.y,y:frame.y+s*p.x+c*p.y,heading:Math.atan2(Math.sin(p.heading+frame.yaw),Math.cos(p.heading+frame.yaw))};
}
export function repositoryAutoJava(plan:AutoPlan,commit:string,frame:OdometryTransform){
 if(!/^[a-f0-9]{40}$/i.test(commit))throw Error('EXACT_COMMIT_REQUIRED');
 if(plan.route.some(p=>p.action==='intake'||p.action==='shoot'))throw Error('MECHANISM_CONTRACT_REQUIRED');
 const result=evaluateRoute(plan.season,plan.robot,plan.route);
 if(result.errors.length||plan.route.length<2||result.seconds<=0||result.seconds>20)throw Error('INVALID_ROUTE');
 const samples=Array.from({length:Math.ceil(result.seconds/.02)+1},(_,i)=>{const seconds=Math.min(i*.02,result.seconds),p=toOdometry(routePoseAt(plan.season,plan.robot,plan.route,seconds),frame);return `new Point(${seconds.toFixed(9)},${p.x.toFixed(9)},${p.y.toFixed(9)},${p.heading.toFixed(9)})`;});
 const factory=`\n  /** Exact Studio poses, already in reviewed odometry frame; never mirror again. */\n  public static G3GeneratedPlan create(Swerve drive, Limits approvedLimits) {\n    return new G3GeneratedPlan(drive, List.of(\n      ${samples.join(',\n      ')}\n    ), approvedLimits);\n  }\n`;
 const source=template.replaceAll('G3DrivePlan','G3GeneratedPlan');
 return source.slice(0,source.lastIndexOf('}'))+factory+'}\n'+`// Target: GlueGunAndGlitter/OFFSEASON_2026 @ ${commit.toLowerCase()}\n// Alliance: ${plan.robot.alliance===1?'BLUE':'RED'}; frame transform: ${frame.x}, ${frame.y}, ${frame.yaw}\n// Generated review candidate. Build against target, review limits, then validate on robot.\n// No automatic odometry reset, mechanism actions, installation or deployment.\n`;
}
