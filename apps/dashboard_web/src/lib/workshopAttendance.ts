export type WorkshopSession={id:string;title:string;starts_at:string;ends_at:string;status:string;closed_at:string|null};
export function workshopSessions(sessions:WorkshopSession[]){
 const current=sessions.filter(s=>s.status==='open').sort((a,b)=>b.starts_at.localeCompare(a.starts_at));
 const last=sessions.filter(s=>s.status==='closed').sort((a,b)=>(b.closed_at??b.ends_at).localeCompare(a.closed_at??a.ends_at))[0]??null;
 return {current,last};
}
