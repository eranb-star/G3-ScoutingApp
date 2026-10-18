export type FestivalEvent={id:string;title:string;date:string;starts:string;duration:number;venue:string;point:string;url:string;street:string;houseNumber:number};
export type ShiftPerson={member:string;role:string;calendar?:string;ack?:boolean;request?:string;response?:string;in?:string;out?:string;absence?:string};
export type FestivalShift={id:string;title:string;point:string;kind:string;start:string;end:string;required:number;leader:string;people:ShiftPerson[];status:string;notes:string};
export type Availability={id:string;member:string;start:string;end:string;note:string};
export type FestivalContext={revision:number;manager:boolean;admin:boolean;people:{id:string;name:string;student:boolean}[];audit:{action:string;revision:number;created_at:string;actor:string}[];data:{events:FestivalEvent[];shifts:FestivalShift[];availability:Availability[];checklist:{id:string;text:string;done:boolean;point:string}[];managers:string[];source_checked?:string;target_hours?:number}};
export const festivalDays=['2026-10-29','2026-10-30','2026-10-31'];
// These three festival dates are after Israel's 2026 DST transition. Never use browser timezone.
export const festivalInstant=(value:string)=>value?`${value}:00+02:00`:'';
export const festivalLocal=(value:string)=>value?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T'):'';
export const shiftHours=(s:FestivalShift)=>(Date.parse(s.end)-Date.parse(s.start))/3600000;
export const eventSignature=(e:FestivalEvent|undefined)=>e?JSON.stringify([e.id,e.title,e.date,Date.parse(e.starts),e.duration,e.venue,e.point]):'';
export function setupWarnings(events:FestivalEvent[],shifts:FestivalShift[]){return festivalDays.flatMap(day=>['elementary','main'].flatMap(point=>{const relevant=events.filter(e=>e.date===day&&e.point===point);if(!relevant.length)return [];const sales=shifts.filter(s=>s.point===point&&s.kind==='sales'&&s.status!=='cancelled'&&festivalLocal(s.start).slice(0,10)===day);const first=Math.min(...relevant.map(e=>Date.parse(e.starts)),...sales.map(s=>Date.parse(s.start)));const latest=first-3600000;const covered=shifts.some(s=>s.point===point&&s.kind==='setup'&&s.status==='published'&&festivalLocal(s.start).slice(0,10)===day&&Date.parse(s.start)<=latest&&s.people.length>=s.required);return covered?[]:[{day,point,latest:new Date(latest).toISOString()}];}));}
export function sourceEvents(rows:unknown):FestivalEvent[]{
 if(!Array.isArray(rows))throw Error('Invalid festival response');
 return rows.filter(r=>r.street?.trim()==='החורש'&&Number(r.houseNumber)===36).map(r=>{
  const venue=String(r.placeDescription??'').trim();
  const point=/ג['׳]אז/.test(venue)?'main':/אמפי פנימי|אינדיגו/.test(venue)?'elementary':'';
  if(!point||!festivalDays.includes(r.date)||!/^\d{2}:\d{2}$/.test(r.hour)||!Number.isFinite(Number(r.duration)))throw Error('Unknown venue or invalid source time; review before import');
  return {id:String(r.eventID),title:String(r.title).trim(),date:r.date,starts:festivalInstant(`${r.date}T${r.hour}`),duration:Number(r.duration),venue,point,url:`https://2026.hanadiv.org/event-page/${r.eventID}`,street:'החורש',houseNumber:36};
 }).sort((a,b)=>a.starts.localeCompare(b.starts)||a.id.localeCompare(b.id));
}
