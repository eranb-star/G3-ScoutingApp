export type AbsenceEvent={title:string;starts_at:string;ends_at:string;cancelled?:boolean};
export const absenceDateFormat=(language:string)=>new Intl.DateTimeFormat(language==='he'?'he-IL':'en-GB',{timeZone:'Asia/Jerusalem',weekday:'short',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function absenceEventRange(event:AbsenceEvent|undefined,language:string){
 if(!event||!Number.isFinite(Date.parse(event.starts_at))||!Number.isFinite(Date.parse(event.ends_at)))return language==='he'?'מועד האירוע אינו זמין':'Event date unavailable';
 const f=absenceDateFormat(language),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'});
 const start=new Date(event.starts_at),end=new Date(event.ends_at);
 const endLabel=day.format(start)===day.format(end)?new Intl.DateTimeFormat(language==='he'?'he-IL':'en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(end):f.format(end);
 return `${f.format(start)} – ${endLabel}`;
}
export function absenceOverlaps(event:AbsenceEvent|undefined,from?:Date,to?:Date){return !from&&!to||!!event&&(!from||Date.parse(event.ends_at)>=from.getTime())&&(!to||Date.parse(event.starts_at)<=to.getTime());}
export const csvText=(rows:unknown[][])=>'\uFEFF'+rows.map(row=>row.map(value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
