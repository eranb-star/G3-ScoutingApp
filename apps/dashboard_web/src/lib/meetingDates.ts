import {israelLocalTime,israelTimeToUtc} from './attendanceTime';
export {israelLocalTime,israelTimeToUtc};
export function meetingDateLabel(wall:string,he=false){if(!wall)return '';return new Intl.DateTimeFormat(he?'he-IL':'en-GB',{timeZone:'UTC',weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(wall+'Z'));}
export function titleDateMismatch(title:string,wall:string){
 if(!wall)return false;
 const date=new Date(wall+'Z'),day=date.getUTCDate(),month=date.getUTCMonth()+1,year=date.getUTCFullYear();
 const dates=[...title.matchAll(/(?:^|[^\d])(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?(?!\d)/g)];
 if(dates.some(m=>+m[1]!==day||+m[2]!==month||(m[3]&&+m[3]!==year)))return true;
 const days=[['ראשון','sunday'],['שני','monday'],['שלישי','tuesday'],['רביעי','wednesday'],['חמישי','thursday'],['שישי','friday'],['שבת','saturday']];
 return days.some((names,index)=>index!==date.getUTCDay()&&names.some(name=>new RegExp('(^|[\\s,–—-])'+name+'($|[\\s,–—-])','i').test(title)));
}
