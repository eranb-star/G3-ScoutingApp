/** Original implementation. Millimetres internally. See docs/MECHANICAL_TOOLS_20261011.md. */
export const DRIVE_ENGINE='g3-drive-1';
export type DriveInput={kind:'belt'|'chain';pitch:number;n1:number;n2:number;mode:'length'|'spacing';center:number;count:number;round:'nearest'|'up'|'down';even:boolean;adjustment:number};
export const defaultDrive:DriveInput={kind:'belt',pitch:5,n1:24,n2:48,mode:'length',center:250,count:136,round:'nearest',even:true,adjustment:0};
export type DriveResult={count:number;length:number;center:number;adjusted:number;delta:number;d1:number;d2:number;wrap:number;engaged:number;ratio:number};
export class DriveError extends Error{constructor(public code:string){super(code);}}
const fail=(code:string):never=>{throw new DriveError(code);};
export function pitchDiameter(kind:DriveInput['kind'],n:number,p:number){return kind==='chain'?p/Math.sin(Math.PI/n):n*p/Math.PI;}
/** Belt continuous pitch-line geometry; chain standard two-sprocket approximation. */
export function lengthAt(i:DriveInput,c:number){
 if(i.kind==='chain')return i.pitch*(2*c/i.pitch+(i.n1+i.n2)/2+(i.n2-i.n1)**2/(4*Math.PI**2*(c/i.pitch)));
 const r1=i.n1*i.pitch/(2*Math.PI),r2=i.n2*i.pitch/(2*Math.PI),d=Math.abs(r2-r1);
 return 2*Math.sqrt(c*c-d*d)+Math.PI*(r1+r2)+2*d*Math.asin(d/c);
}
function minimum(i:DriveInput){return (pitchDiameter(i.kind,i.n1,i.pitch)+pitchDiameter(i.kind,i.n2,i.pitch))/2;}
export function centerFor(i:DriveInput,count:number){
 const target=count*i.pitch;let lo=minimum(i)+1e-7,hi=10000;
 if(target<=lengthAt(i,lo)||target>lengthAt(i,hi))return null;
 for(let k=0;k<90;k++){const mid=(lo+hi)/2;if(lengthAt(i,mid)>target)hi=mid;else lo=mid;}
 return (lo+hi)/2;
}
export function validateDrive(i:DriveInput){
 if(!i||!['belt','chain'].includes(i.kind)||!['length','spacing'].includes(i.mode)||!['nearest','up','down'].includes(i.round)||typeof i.even!=='boolean')fail('invalid');
 if(![i.pitch,i.n1,i.n2,i.center,i.count,i.adjustment].every(Number.isFinite))fail('number');
 if(i.pitch<1||i.pitch>50)fail('pitch');
 if(!Number.isInteger(i.n1)||!Number.isInteger(i.n2)||Math.min(i.n1,i.n2)<8||Math.max(i.n1,i.n2)>400)fail('teeth');
 if(Math.abs(i.adjustment)>25)fail('adjustment');
 if(i.mode==='length'&&(i.center<=minimum(i)||i.center>10000))fail('center');
 if(i.mode==='spacing'&&(!Number.isInteger(i.count)||i.count<1||i.count>20000))fail('count');
 if(i.mode==='spacing'&&i.kind==='chain'&&i.even&&i.count%2)fail('even');
}
export function solveDrive(i:DriveInput):DriveResult{
 validateDrive(i);const step=i.kind==='chain'&&i.even?2:1;
 const raw=lengthAt(i,i.center)/i.pitch/step;
 const rounding=i.round==='up'?Math.ceil:i.round==='down'?Math.floor:Math.round;
 const count=i.mode==='spacing'?i.count:rounding(raw)*step;
 const center=centerFor(i,count);if(center===null)throw new DriveError('impossible');
 if(center+i.adjustment<=minimum(i))fail('adjustmentCollision');
 const d1=pitchDiameter(i.kind,i.n1,i.pitch),d2=pitchDiameter(i.kind,i.n2,i.pitch);
 const wrap=Math.PI-2*Math.asin(Math.abs(d2-d1)/(2*center));
 return {count,length:count*i.pitch,center,adjusted:center+i.adjustment,delta:i.mode==='length'?center-i.center:0,d1,d2,wrap:wrap*180/Math.PI,engaged:Math.min(i.n1,i.n2)*wrap/(2*Math.PI),ratio:i.n2/i.n1};
}
export function alternatives(i:DriveInput,r:DriveResult){const step=i.kind==='chain'&&i.even?2:1;return [-2,-1,1,2].flatMap(k=>{try{return [solveDrive({...i,mode:'spacing',count:r.count+k*step})];}catch{return [];}});}
export const driveErrors:Record<string,[string,string]>={invalid:['Choose a supported calculation.','בחרו חישוב נתמך.'],number:['Enter a number in every dimension.','הזינו מספר בכל מידה.'],pitch:['Pitch must be 1–50 mm.','הפסיעה חייבת להיות 1–50 מ״מ.'],teeth:['Each tooth count must be a whole number from 8 to 400.','מספר השיניים חייב להיות שלם בין 8 ל־400.'],adjustment:['Adjustment must be within ±25 mm.','ההתאמה חייבת להיות בטווח ±25 מ״מ.'],center:['Increase spacing beyond the pitch-circle radii sum (maximum 10,000 mm).','הגדילו את המרחק מעבר לסכום רדיוסי מעגלי הפסיעה (עד 10,000 מ״מ).'],count:['Enter 1–20,000 whole teeth or links.','הזינו 1–20,000 שיניים או חוליות שלמות.'],even:['Choose an even link count, or explicitly allow an offset link.','בחרו מספר חוליות זוגי או אפשרו במפורש חוליית קיזוז.'],impossible:['This length cannot fit the selected wheels without pitch-circle overlap. Try a longer length.','האורך אינו מתאים לגלגלים שנבחרו ללא חפיפה. נסו אורך גדול יותר.'],adjustmentCollision:['The adjustment causes pitch-circle overlap.','ההתאמה גורמת לחפיפת מעגלי הפסיעה.']};
