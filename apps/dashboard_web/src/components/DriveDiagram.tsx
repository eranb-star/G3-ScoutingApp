import type {DriveResult} from '../lib/mechanicalDrive';
export default function DriveDiagram({result:r,label,unit='mm'}:{result:DriveResult;label:string;unit?:string}){
 const scale=unit==='in'?25.4:1,margin=Math.max(r.d1,r.d2)*.65+30;
 const w=r.center+2*margin,h=2*margin+50,x=margin,y=margin,a=r.d1/2,b=r.d2/2;
 const nx=(a-b)/r.center,ny=Math.sqrt(1-nx*nx);
 return <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="drive-diagram">
 <defs><pattern id="drive-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#d8d1df" strokeWidth=".5"/></pattern></defs>
 <rect width={w} height={h} fill="url(#drive-grid)"/>
 {[{cx:x,r:a},{cx:x+r.center,r:b}].map((p,k)=><g key={k}><circle cx={p.cx} cy={y} r={p.r} fill="#fff" stroke="#a30072" strokeWidth="2"/><circle cx={p.cx} cy={y} r="4" fill="#231b2b"/><text x={p.cx} y={y+18} textAnchor="middle" fontSize="12" fill="#231b2b">{k+1}</text></g>)}
 <path d={`M${x+a*nx} ${y-a*ny} L${x+r.center+b*nx} ${y-b*ny} A${b} ${b} 0 ${b>=a?1:0} 1 ${x+r.center+b*nx} ${y+b*ny} L${x+a*nx} ${y+a*ny} A${a} ${a} 0 ${a>b?1:0} 1 ${x+a*nx} ${y-a*ny}`} fill="none" stroke="#a30072" strokeWidth="3"/>
 <path d={`M${x} ${y}V${h-18}M${x+r.center} ${y}V${h-18}M${x} ${h-25}H${x+r.center}`} fill="none" stroke="#5a5365" strokeDasharray="4 3"/>
 <text x={x+r.center/2} y={h-31} textAnchor="middle" fill="#231b2b" fontSize="13">{(r.center/scale).toFixed(3)} {unit}</text>
 </svg>;
}
