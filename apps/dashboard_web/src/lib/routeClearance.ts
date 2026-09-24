import type {Box3,Point2} from './seasonPackage';
export type Footprint={length:number;width:number};
type Pose=Point2&{heading:number};
/** SAT between an oriented robot rectangle and an axis-aligned obstacle. */
export function footprintHits(p:Pose,robot:Footprint,b:Box3,padding=0){
 const c=Math.cos(p.heading),s=Math.sin(p.heading),dx=p.x-(b.min.x+b.max.x)/2,dy=p.y-(b.min.y+b.max.y)/2;
 const bx=(b.max.x-b.min.x)/2,by=(b.max.y-b.min.y)/2,l=robot.length/2+padding,w=robot.width/2+padding;
 return Math.abs(dx)<=bx+Math.abs(c)*l+Math.abs(s)*w&&Math.abs(dy)<=by+Math.abs(s)*l+Math.abs(c)*w&&Math.abs(dx*c+dy*s)<=l+bx*Math.abs(c)+by*Math.abs(s)&&Math.abs(-dx*s+dy*c)<=w+bx*Math.abs(s)+by*Math.abs(c);
}
/** Each midpoint rectangle is expanded by a bound on translation and corner rotation.
 * Covers the complete interpolated sweep, including an in-place turn, not just sampled poses. */
export function sweepCells(a:Pose,b:Pose,robot:Footprint){
 const d=Math.hypot(b.x-a.x,b.y-a.y),turn=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading));
 const n=Math.max(1,Math.ceil(d/.08),Math.ceil(Math.abs(turn)/(.04))),radius=Math.hypot(robot.length,robot.width)/2;
 const padding=d/(2*n)+2*radius*Math.sin(Math.abs(turn)/(4*n));
 return Array.from({length:n},(_,i)=>{const t=(i+.5)/n;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,heading:a.heading+turn*t,padding};});
}
export function sweptHits(a:Pose,b:Pose,robot:Footprint,box:Box3,margin=0){return sweepCells(a,b,robot).some(p=>footprintHits(p,robot,box,p.padding+margin));}
export function sweptOutside(a:Pose,b:Pose,robot:Footprint,length:number,width:number,margin=0){return sweepCells(a,b,robot).some(p=>{const c=Math.abs(Math.cos(p.heading)),s=Math.abs(Math.sin(p.heading)),l=robot.length/2+p.padding+margin,w=robot.width/2+p.padding+margin;return Math.abs(p.x)+c*l+s*w>length/2||Math.abs(p.y)+s*l+c*w>width/2;});}
