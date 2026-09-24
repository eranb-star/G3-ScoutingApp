export type Point2={x:number;y:number};
export type Box3={id:string;min:{x:number;y:number;z:number};max:{x:number;y:number;z:number}};
export type SeasonPackage={schema:1;season:number;revision:string;name:string;units:'m';frame:'centered-x-forward-z-up';
 sources:{url:string;sha256:string;reviewed:boolean}[];
 field:{length:number;width:number;obstacles:Box3[];geometry:'proxy'|'reviewed';tags:{id:number;x:number;y:number;z:number;yaw:number;size:number}[]};
 autonomous:{seconds:number;reviewed:boolean};
 rules:{id:string;revision:string;threshold:number;robots:number;levels:{id:string;points:number}[]}[];
 supportedInteractions:string[]};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function parseSeasonPackage(input:unknown):SeasonPackage{
 const p=input as SeasonPackage;
 if(!p||p.schema!==1||!Number.isInteger(p.season)||p.season<1992||p.season>2100||typeof p.revision!=='string'||!p.revision.trim()||p.revision.length>120||typeof p.name!=='string'||!p.name.trim()||p.name.length>120||p.units!=='m'||p.frame!=='centered-x-forward-z-up')throw Error('Invalid season identity, units or coordinate frame');
 if(!p.field||![p.field.length,p.field.width].every(n=>finite(n)&&n>0&&n<=100)||!['proxy','reviewed'].includes(p.field.geometry)||!Array.isArray(p.field.obstacles)||p.field.obstacles.length>500||!Array.isArray(p.field.tags)||p.field.tags.length>200)throw Error('Invalid field geometry');
 const ids=new Set<string>();
 for(const b of p.field.obstacles){if(!b||typeof b.id!=='string'||ids.has(b.id)||!b.min||!b.max||!(['x','y','z'] as const).every(k=>finite(b.min[k])&&finite(b.max[k])&&Math.abs(b.min[k])<=100&&Math.abs(b.max[k])<=100&&b.min[k]<b.max[k]))throw Error('Invalid obstacle');ids.add(b.id);}
 const tags=new Set<number>();for(const t of p.field.tags){if(!t||!Number.isInteger(t.id)||t.id<0||tags.has(t.id)||![t.x,t.y,t.z,t.yaw,t.size].every(finite)||t.size<=0||t.size>1||Math.abs(t.x)>p.field.length/2+2||Math.abs(t.y)>p.field.width/2+2||t.z<0||t.z>10)throw Error('Invalid AprilTag');tags.add(t.id);}
 if(!p.autonomous||!finite(p.autonomous.seconds)||p.autonomous.seconds<=0||p.autonomous.seconds>120||typeof p.autonomous.reviewed!=='boolean')throw Error('Invalid autonomous duration');
 if(!Array.isArray(p.sources)||p.sources.length>100||p.sources.some(s=>!s||typeof s.url!=='string'||!/^https:\/\//.test(s.url)||!/^([a-f0-9]{64})$/.test(s.sha256)||typeof s.reviewed!=='boolean'))throw Error('Invalid provenance');
 if(!Array.isArray(p.rules)||p.rules.length>50||!Array.isArray(p.supportedInteractions)||p.supportedInteractions.length>100||p.supportedInteractions.some(s=>typeof s!=='string'||s.length>80))throw Error('Invalid season capabilities');
 for(const r of p.rules){if(!r||typeof r.id!=='string'||!r.id||r.revision!==p.revision||!Number.isSafeInteger(r.threshold)||r.threshold<1||r.threshold>100000||!Number.isInteger(r.robots)||r.robots<1||r.robots>6||!Array.isArray(r.levels)||!r.levels.length||r.levels.length>8||new Set(r.levels.map(l=>l.id)).size!==r.levels.length||r.levels.some(l=>typeof l.id!=='string'||!l.id||!Number.isSafeInteger(l.points)||l.points<0||l.points>100000))throw Error('Invalid scoring rule');}
 if(new Set(p.rules.map(r=>r.id)).size!==p.rules.length)throw Error('Duplicate rule');
 return structuredClone(p);
}
export function seasonReadiness(p:SeasonPackage){
 const knowledge=p.sources.length>0&&p.sources.every(s=>s.reviewed);
 return {knowledge,field:knowledge&&p.field.geometry==='reviewed',simulation:knowledge&&p.field.geometry==='reviewed'&&p.autonomous.reviewed&&p.rules.length>0&&p.supportedInteractions.length>0};
}
