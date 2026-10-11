/** Plate sketch coordinates are metres, in the part's local XY plane. */
export type Point2=[number,number];
export type PlateSketch={outline:Point2[];holes:Point2[][]};
export function signedArea(p:Point2[]){return p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v[0]*n[1]-n[0]*v[1];},0)/2;}
const cross=(a:Point2,b:Point2,c:Point2)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function on(a:Point2,b:Point2,p:Point2){return Math.abs(cross(a,b,p))<1e-10&&p[0]>=Math.min(a[0],b[0])-1e-10&&p[0]<=Math.max(a[0],b[0])+1e-10&&p[1]>=Math.min(a[1],b[1])-1e-10&&p[1]<=Math.max(a[1],b[1])+1e-10;}
function intersects(a:Point2,b:Point2,c:Point2,d:Point2){return (cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
export function inside(p:Point2,loop:Point2[]){let hit=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if(on(a,b,p))return false;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function crosses(a:Point2[],b:Point2[]){return a.some((p,i)=>b.some((q,j)=>intersects(p,a[(i+1)%a.length],q,b[(j+1)%b.length])));}
export function validatePlate(s:PlateSketch){
 if(!s||!Array.isArray(s.outline)||!Array.isArray(s.holes)||s.holes.length>64)throw Error('A plate supports one outline and up to 64 cutouts.');
 for(const loop of [s.outline,...s.holes]){
  if(!Array.isArray(loop)||loop.length<3||loop.length>256||loop.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>10)))throw Error('Each closed outline needs 3–256 finite points within 10 m of its origin.');
  if(Math.abs(signedArea(loop))<1e-10)throw Error('Outline has no area.');
  for(let i=0;i<loop.length;i++){if(Math.hypot(loop[i][0]-loop[(i+1)%loop.length][0],loop[i][1]-loop[(i+1)%loop.length][1])<1e-7)throw Error('Remove duplicate neighbouring points.');for(let j=i+1;j<loop.length;j++)if(j!==i+1&&!(i===0&&j===loop.length-1)&&intersects(loop[i],loop[(i+1)%loop.length],loop[j],loop[(j+1)%loop.length]))throw Error('Outline crosses itself.');}
 }
 for(let i=0;i<s.holes.length;i++){const h=s.holes[i];if(!h.every(p=>inside(p,s.outline))||crosses(h,s.outline))throw Error('Every cutout must be fully inside the plate, without touching its edge.');for(let j=0;j<i;j++)if(crosses(h,s.holes[j])||inside(h[0],s.holes[j])||inside(s.holes[j][0],h))throw Error('Cutouts must not overlap or contain one another.');}
}
export function plateArea(s:PlateSketch){return Math.abs(signedArea(s.outline))-s.holes.reduce((v,h)=>v+Math.abs(signedArea(h)),0);}
export function rectangle(w:number,h:number,x=0,y=0):Point2[]{return [[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]];}
export function circle(d:number,x=0,y=0):Point2[]{return Array.from({length:96},(_,i)=>[x+d/2*Math.cos(i*Math.PI/48),y+d/2*Math.sin(i*Math.PI/48)]);}
export function slot(w:number,h:number,x=0,y=0):Point2[]{if(w<h)throw Error('Slot length must be at least its width.');return Array.from({length:66},(_,i)=>{const right=i<33,angle=(right?-Math.PI/2:Math.PI/2)+(i%33)*Math.PI/32;return [x+(right?1:-1)*(w-h)/2+h/2*Math.cos(angle),y+h/2*Math.sin(angle)];});}
export function plateDxf(s:PlateSketch){validatePlate(s);const lines=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];for(const [i,loop] of [s.outline,...s.holes].entries()){lines.push('0','LWPOLYLINE','8',i?'CUTOUT':'OUTLINE','90',String(loop.length),'70','1');for(const p of loop)lines.push('10',String(Number((p[0]*1000).toFixed(6))),'20',String(Number((p[1]*1000).toFixed(6))));}return [...lines,'0','ENDSEC','0','EOF'].join('\n');}
/** Deliberately bounded import: closed straight polylines and circles, explicit units. */
export function importPlateDxf(text:string,unit:number):PlateSketch{
 if(text.length>2_000_000)throw Error('DXF exceeds 2 MB.');const lines=text.replace(/\r/g,'').split('\n');const entities:{type:string;data:[number,string][]}[]=[];let inEntities=false,current:typeof entities[number]|null=null;
 for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim()),v=lines[i+1].trim();if(code===2&&v==='ENTITIES'){inEntities=true;continue;}if(!inEntities)continue;if(code===0){if(v==='ENDSEC')break;current={type:v,data:[]};entities.push(current);}else current?.data.push([code,v]);}
 const loops:Point2[][]=[];for(const e of entities){const value=(c:number)=>Number(e.data.find(x=>x[0]===c)?.[1]);if(e.type==='CIRCLE'){loops.push(circle(value(40)*2*unit,value(10)*unit,value(20)*unit));}else if(e.type==='LWPOLYLINE'){if(!(value(70)&1)||e.data.some(x=>x[0]===42&&Number(x[1])!==0))throw Error('Use closed polylines with straight segments; curved bulges are not supported.');const p:Point2[]=[];for(const [code,v] of e.data){if(code===10)p.push([Number(v)*unit,NaN]);if(code===20&&p.length)p[p.length-1][1]=Number(v)*unit;}if(p.length>3&&Math.hypot(p[0][0]-p[p.length-1][0],p[0][1]-p[p.length-1][1])<1e-8)p.pop();loops.push(p);}else throw Error(`Unsupported DXF entity: ${e.type}. Export closed LWPOLYLINE outlines and CIRCLE holes.`);}
 if(!loops.length)throw Error('No supported closed outlines found.');loops.sort((a,b)=>Math.abs(signedArea(b))-Math.abs(signedArea(a)));const result={outline:loops[0],holes:loops.slice(1)};validatePlate(result);return result;
}
