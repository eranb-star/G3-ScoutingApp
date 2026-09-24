import {evaluateRoute,rankRoutes,segmentHitsBox,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import type {Point2,SeasonPackage} from './seasonPackage';

/** Visibility graph around inflated boxes; conservative 2D planning, not controller trajectories. */
export function clearancePath(season:SeasonPackage,robot:MotionProfile,start:Point2,end:Point2):Point2[]|null{
 const radius=Math.hypot(robot.length,robot.width)/2+robot.clearance;
 if(season.field.obstacles.length>60)throw Error('Route generation supports up to 60 obstacle proxies');
 const free=(p:Point2)=>Math.abs(p.x)+radius<=season.field.length/2&&Math.abs(p.y)+radius<=season.field.width/2&&!season.field.obstacles.some(b=>segmentHitsBox(p,p,b,radius));
 if(!free(start)||!free(end))return null;
 const clear=(a:Point2,b:Point2)=>!season.field.obstacles.some(box=>segmentHitsBox(a,b,box,radius));
 if(clear(start,end))return [start,end];
 const nodes:Point2[]=[start,end];
 for(const box of season.field.obstacles)for(const x of [box.min.x-radius-.001,box.max.x+radius+.001])for(const y of [box.min.y-radius-.001,box.max.y+radius+.001]){const p={x,y};if(free(p))nodes.push(p);}
 const distances=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set<number>();distances[0]=0;
 while(visited.size<nodes.length){
  let next=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(next<0||distances[i]<distances[next]))next=i;
  if(next<0||!Number.isFinite(distances[next]))return null;
  if(next===1){const path:Point2[]=[];for(let at=1;at>=0;at=previous[at])path.unshift(nodes[at]);return path;}
  visited.add(next);
  for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&clear(nodes[next],nodes[i])){const cost=distances[next]+Math.hypot(nodes[i].x-nodes[next].x,nodes[i].y-nodes[next].y);if(cost<distances[i]){distances[i]=cost;previous[i]=next;}}
 }
 return null;
}

/** All action waypoints are retained. Reordering is opt-in because actions may depend on order. */
export function generateRouteAlternatives(season:SeasonPackage,robot:MotionProfile,route:RoutePoint[],reorder=false){
 evaluateRoute(season,robot,route);
 if(route.length>8)throw Error('Use at most 8 waypoints for bounded route generation');
 const cache=new Map<string,Point2[]|null>();let evaluated=0;
 const connect=(a:number,b:number)=>{const key=`${a}:${b}`;if(!cache.has(key))cache.set(key,clearancePath(season,robot,route[a],route[b]));return cache.get(key)!;};
 const orders:number[][]=[];
 function visit(order:number[],remaining:number[]){
  if(orders.length>=200)return;
  if(!remaining.length){orders.push([0,...order,route.length-1]);return;}
  for(const next of remaining)visit([...order,next],remaining.filter(i=>i!==next));
 }
 const middle=route.slice(1,-1).map((_,i)=>i+1);
 if(reorder)visit([],middle);else orders.push(route.map((_,i)=>i));
 const candidates:{id:string;points:RoutePoint[]}[]=[];
 for(const order of orders){
  evaluated++;const points:RoutePoint[]=[{...route[0]}];let valid=true;
  for(let i=1;i<order.length;i++){
   const path=connect(order[i-1],order[i]);if(!path){valid=false;break;}
   for(const p of path.slice(1,-1))points.push({...p,heading:route[order[i-1]].heading,action:'none',seconds:0,points:0,success:1});
   points.push({...route[order[i]]});
  }
  if(valid&&points.length<=100)candidates.push({id:`Order ${order.map(i=>i+1).join(' → ')}`,points});
 }
 const ranked=rankRoutes(season,robot,candidates);
 return {ranked:ranked.slice(0,10),evaluated,feasible:ranked.length,truncated:reorder&&middle.length===6,model:'Conservative clearance paths; manual action assumptions; no inventory or alliance validation'};
}
