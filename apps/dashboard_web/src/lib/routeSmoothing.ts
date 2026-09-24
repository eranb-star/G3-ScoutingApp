import type {RoutePoint} from './autonomousPlanning';
/** Explicit user operation: round only motion-only corners, preserving every action and endpoint. */
export function roundedRoute(route:RoutePoint[],radius=.3):RoutePoint[]{
 const out:RoutePoint[]=[];const lerp=(a:RoutePoint,b:RoutePoint,t:number)=>({...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,heading:a.heading+Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))*t});
 route.forEach((p,i)=>{if(!i||i===route.length-1||p.action!=='none'){out.push({...p});return;}
 const a=route[i-1],b=route[i+1],d1=Math.hypot(p.x-a.x,p.y-a.y),d2=Math.hypot(b.x-p.x,b.y-p.y);if(d1<.05||d2<.05){out.push({...p});return;}
 const cut=Math.min(radius,d1*.3,d2*.3),u=lerp(p,a,cut/d1),v=lerp(p,b,cut/d2);out.push(u);
 for(let j=1;j<=4;j++){const t=j/4,q=lerp(lerp(u,p,t),lerp(p,v,t),t);out.push({...q,action:'none',seconds:0,points:0,quantity:0});}
 });if(out.length>100)throw Error('Too many points to round; use a shorter route.');return out;
}
