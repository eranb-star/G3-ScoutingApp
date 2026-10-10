export type CheckMesh={id:string;positions:number[];complete:boolean};
export type CheckResult={pairs:{a:string;b:string;kind:'surface-contact'|'bounds-only'}[];incomplete:string[];comparisons:number};
type V=[number,number,number];
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function bounds(p:number[]){const min:V=[Infinity,Infinity,Infinity],max:V=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++) {const axis=i%3;min[axis]=Math.min(min[axis],p[i]);max[axis]=Math.max(max[axis],p[i]);}return {min,max};}
function overlaps(a:ReturnType<typeof bounds>,b:ReturnType<typeof bounds>,t:number){return [0,1,2].every(i=>a.max[i]+t>=b.min[i]&&b.max[i]+t>=a.min[i]);}
function triangle(p:number[],offset:number):V[]{return [p.slice(offset,offset+3),p.slice(offset+3,offset+6),p.slice(offset+6,offset+9)] as V[];}
/** Triangle SAT includes coplanar in-plane axes; contacts are approximate surfaces, not solid collision proof. */
export function triangleContact(a:V[],b:V[],tolerance=.0001){const ae=[sub(a[1],a[0]),sub(a[2],a[1]),sub(a[0],a[2])],be=[sub(b[1],b[0]),sub(b[2],b[1]),sub(b[0],b[2])];const an=cross(ae[0],ae[1]),bn=cross(be[0],be[1]);if(dot(an,an)<1e-24||dot(bn,bn)<1e-24)return false;const axes=[an,bn,...ae.flatMap(x=>be.map(y=>cross(x,y))),...ae.map(x=>cross(an,x)),...be.map(x=>cross(bn,x))];return axes.every(axis=>{const length=Math.sqrt(dot(axis,axis));if(length<1e-12)return true;const ap=a.map(p=>dot(p,axis)/length),bp=b.map(p=>dot(p,axis)/length);return Math.max(...ap)+tolerance>=Math.min(...bp)&&Math.max(...bp)+tolerance>=Math.min(...ap);});}
export function checkMeshes(meshes:CheckMesh[],budget=500000):CheckResult {const result:CheckResult={pairs:[],incomplete:meshes.filter(m=>!m.complete).map(m=>m.id),comparisons:0};const boxes=meshes.map(m=>bounds(m.positions));for(let i=0;i<meshes.length;i++)for(let j=i+1;j<meshes.length;j++){
 if(!overlaps(boxes[i],boxes[j],.0001))continue;const a=meshes[i],b=meshes[j];let found=false,limited=!a.complete||!b.complete;
 outer:for(let x=0;x<a.positions.length;x+=9){const at=triangle(a.positions,x),ab=bounds(at.flat());for(let y=0;y<b.positions.length;y+=9){if(++result.comparisons>budget){limited=true;break outer;}const bt=triangle(b.positions,y);if(overlaps(ab,bounds(bt.flat()),.0001)&&triangleContact(at,bt)){found=true;break outer;}}}
 // Bounds-only remains uncertain: containment, partial assets and budget limits are not a clear result.
 result.pairs.push({a:a.id,b:b.id,kind:found?'surface-contact':'bounds-only'});if(limited){result.incomplete.push(a.id,b.id);}
 }result.incomplete=[...new Set(result.incomplete)];return result;}
