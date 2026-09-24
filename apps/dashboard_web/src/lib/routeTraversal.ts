import {TRENCH,BUMP} from './fieldTraversal';
import {sweptHits} from './routeClearance';
import type {RoutePoint,MotionProfile} from './autonomousPlanning';
export function traversalChecks(route:RoutePoint[],robot:MotionProfile){
 const issues:{leg:number;kind:'height'|'post'|'bump';message:string}[]=[];
 for(let i=0;i<route.length;i++){const a=route[Math.max(0,i-1)],b=route[i];
 for(const x of TRENCH.x)for(const y of TRENCH.y){const box={id:'trench',min:{x:x-TRENCH.length/2,y:y-TRENCH.width/2,z:TRENCH.underside},max:{x:x+TRENCH.length/2,y:y+TRENCH.width/2,z:1}};
 if(sweptHits(a,b,robot,box)&&robot.height!==undefined&&robot.height+robot.clearance>TRENCH.underside)issues.push({leg:i,kind:'height',message:'Trench: robot height plus clearance exceeds the 0.565 m opening.'});
 for(const sign of [-1,1]){const center=y+sign*TRENCH.postOffset;const post={...box,min:{...box.min,y:center-TRENCH.postWidth/2,z:0},max:{...box.max,y:center+TRENCH.postWidth/2}};if(sweptHits(a,b,robot,post,robot.clearance))issues.push({leg:i,kind:'post',message:'Trench support: move the route into the middle of the opening.'});}}
 for(const x of BUMP.x)for(const y of BUMP.y)if(sweptHits(a,b,robot,{id:'bump',min:{x:x-BUMP.length/2,y:y-BUMP.width/2,z:0},max:{x:x+BUMP.length/2,y:y+BUMP.width/2,z:BUMP.height}}))issues.push({leg:i,kind:'bump',message:'Traversable bump: timing does not include measured climbing or traction losses.'});
 }return issues.filter((v,i,all)=>all.findIndex(w=>w.leg===v.leg&&w.kind===v.kind)===i);
}
