export type AttendanceRow={id:string;member_id:string;meeting_id:string;checked_in_at:string;checked_out_at:string|null;check_in_method:string;check_out_method?:string|null;correction_reason?:string|null;corrected_by?:string|null};
export function israelDayStart(day:string){
 const target=Date.parse(day+'T00:00:00Z');let value=target;
 for(let i=0;i<3;i++){
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
   const represented=Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
   value+=target-represented;
 }
 return new Date(value);
}
export function israelDayEnd(day:string){const next=new Date(day+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);return new Date(israelDayStart(next.toISOString().slice(0,10)).getTime()-1);}
export function attendanceHours(row:AttendanceRow){
  if(!row.checked_out_at)return 0;
  return Math.max(0,(Date.parse(row.checked_out_at)-Date.parse(row.checked_in_at))/3600000);
}
export function attendanceKind(row:AttendanceRow){
  if(!row.checked_out_at)return 'open';
  if(row.check_out_method==='automatic')return 'automatic';
  if(row.check_in_method==='admin'||row.corrected_by)return 'corrected';
  return 'recorded';
}
export function attendanceTotals(rows:AttendanceRow[]){
  return {sessions:new Set(rows.map(r=>r.meeting_id)).size,hours:rows.reduce((n,r)=>n+attendanceHours(r),0),open:rows.filter(r=>!r.checked_out_at).length,automatic:rows.filter(r=>r.check_out_method==='automatic').length};
}
export async function readAllRows<T>(page:(from:number,to:number)=>PromiseLike<{data:unknown[]|null;error:{message:string}|null}>):Promise<T[]>{
  const rows:T[]=[];
  for(let offset=0;;offset+=500){const result=await page(offset,offset+499);if(result.error)throw Error(result.error.message);const batch=(result.data??[])as T[];rows.push(...batch);if(batch.length<500)return rows;}
}
