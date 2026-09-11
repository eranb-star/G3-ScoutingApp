export type ServiceSchedule={status:string;service_interval_days:number|null;last_serviced_at:string|null;first_service_due?:string|null};
export function nextServiceDate(item:ServiceSchedule):number|null{
 if(item.last_serviced_at)return item.service_interval_days?Date.parse(item.last_serviced_at)+item.service_interval_days*86400000:null;
 return item.first_service_due?Date.parse(item.first_service_due+'T00:00:00Z'):null;
}
export function serviceIsDue(item:ServiceSchedule,now=Date.now()){
 const due=nextServiceDate(item);
 if(!item.last_serviced_at&&item.first_service_due&&item.status==='installed')return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)>=item.first_service_due;
 return item.status==='service_due'||(item.status==='installed'&&due!==null&&due<=now);
}
export function replenishmentQuantity(onHand:number,target:number,approved:number,ordered:number){
 return Math.max(0,target-onHand-approved-ordered);
}
