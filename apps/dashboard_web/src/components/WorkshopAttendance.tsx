import {useEffect,useRef,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {readAllRows} from '../lib/attendanceReporting';
import {workshopSessions,type WorkshopSession} from '../lib/workshopAttendance';
type Entry={id:string;member_id:string;checked_in_at:string;checked_out_at:string|null};
type Person={id:string;display_name:string;subteam:string|null};
export default function WorkshopAttendance(){
 const {pick,language}=useLocalization();
 const [mode,setMode]=useState<'current'|'last'>('current'),[choice,setChoice]=useState('');
 const [data,setData]=useState<{sessions:WorkshopSession[];meeting:WorkshopSession|null;rows:Entry[];people:Person[];updated:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[search,setSearch]=useState('');
 const refresh=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let active=true,running=false;
  setData(null);setError(false);
  async function load(){
   if(running)return;running=true;setBusy(true);
   try{
    const sessions=await readAllRows<WorkshopSession>((a,b)=>supabase.from('team_meetings').select('id,title,starts_at,ends_at,status,closed_at').in('status',['open','closed']).order('id').range(a,b));
    const {current,last}=workshopSessions(sessions),meeting=mode==='last'?last:current.find(m=>m.id===choice)??current[0]??last;
    const [rows,people]=meeting?await Promise.all([
     readAllRows<Entry>((a,b)=>supabase.from('attendance_records').select('id,member_id,checked_in_at,checked_out_at').eq('meeting_id',meeting.id).order('id').range(a,b)),
     readAllRows<Person>((a,b)=>supabase.from('team_members').select('id,display_name,subteam').order('id').range(a,b))
    ]):[[],[]];
    if(active){setData({sessions,meeting,rows,people,updated:new Date().toISOString()});setError(false);}
   }catch{if(active)setError(true);}finally{running=false;if(active)setBusy(false);}
  }
  refresh.current=()=>void load();void load();
  const visible=()=>{if(document.visibilityState==='visible')void load();};
  const timer=window.setInterval(visible,30000);
  window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[mode,choice]);
 const format=new Intl.DateTimeFormat(language==='he'?'he-IL':'en-IL',{timeZone:'Asia/Jerusalem',dateStyle:'medium',timeStyle:'short'});
 const clock=new Intl.DateTimeFormat(language==='he'?'he-IL':'en-IL',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const current=data?workshopSessions(data.sessions).current:[],meeting=data?.meeting,isOpen=meeting?.status==='open';
 const people=new Map(data?.people.map(p=>[p.id,p])??[]);
 const rows=(data?.rows??[]).filter(r=>(people.get(r.member_id)?.display_name??'').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(people.get(a.member_id)?.display_name??'').localeCompare(people.get(b.member_id)?.display_name??''));
 const inside=(data?.rows??[]).filter(r=>!r.checked_out_at).length;
 function list(items:Entry[],title:string){return <section className="workshop-roster-group"><h3>{title} <span>{items.length}</span></h3>{items.length?<ul>{items.map(r=><li key={r.id}><div><strong>{people.get(r.member_id)?.display_name??pick('Unknown member','חבר/ה לא מזוהה')}</strong><small>{people.get(r.member_id)?.subteam}</small></div><div><span>{pick('In','כניסה')}: {format.format(new Date(r.checked_in_at))}</span><small>{r.checked_out_at?`${pick('Out','יציאה')}: ${format.format(new Date(r.checked_out_at))}`:isOpen?pick('Currently checked in','רשומה כניסה ללא יציאה'):pick('Missing checkout','יציאה לא נרשמה')}</small></div></li>)}</ul>:<p>{search?pick('No matching people.','אין אנשים התואמים לחיפוש.'):pick('No attendance records in this group.','אין רישומי נוכחות בקבוצה זו.')}</p>}</section>;}
 return <section className="hub-card workshop-attendance" aria-label={pick('Workshop attendance','נוכחות בסדנה')}>
  <div className="workshop-attendance-toolbar"><div className="workshop-attendance-switch"><button aria-pressed={mode==='current'} onClick={()=>setMode('current')}>{pick('Current workshop','הסדנה הנוכחית')}</button><button aria-pressed={mode==='last'} onClick={()=>setMode('last')}>{pick('Last workshop','הסדנה האחרונה')}</button></div><button className="button-secondary" disabled={busy} onClick={()=>refresh.current()}>{pick('Refresh','רענון')}</button></div>
  {error&&<p role="alert">{pick('Refresh failed. Displayed attendance may be out of date. Try Refresh.','הרענון נכשל. הנוכחות המוצגת עשויה להיות לא מעודכנת. נסו לרענן.')}</p>}
  {!data&&!error&&<p role="status">{pick('Loading workshop attendance…','טוען נוכחות בסדנה…')}</p>}
  {data&&<>{mode==='current'&&!current.length&&<p>{pick('No workshop currently open. Showing the last closed workshop.','אין סדנה פתוחה כעת. מוצגת הסדנה האחרונה שנסגרה.')}</p>}
   {mode==='current'&&current.length>1&&<label>{pick('Open workshop','סדנה פתוחה')}<select value={meeting?.id??''} onChange={e=>setChoice(e.target.value)}>{current.map(m=><option key={m.id} value={m.id}>{m.title} · {format.format(new Date(m.starts_at))}</option>)}</select></label>}
   <header><div><span className="hub-eyebrow">{isOpen?pick('OPEN WORKSHOP','סדנה פתוחה'):pick('LAST CLOSED WORKSHOP','הסדנה האחרונה שנסגרה')}</span><h2>{meeting?.title??pick('No workshop recorded yet','טרם נרשמה סדנה')}</h2>{meeting&&<p>{format.format(new Date(meeting.starts_at))} — {format.format(new Date(meeting.ends_at))} · {pick('Israel time','שעון ישראל')}</p>}</div><small>{pick('Updated','עודכן')}: {clock.format(new Date(data.updated))}<br/>{pick('Refreshes every 30 seconds while visible','מתרענן כל 30 שניות כשהעמוד מוצג')}</small></header>
   {meeting&&<><div className="workshop-attendance-totals"><span><strong>{isOpen?inside:data.rows.length}</strong>{isOpen?pick('Currently checked in','רשומים כעת בסדנה'):pick('Attended','השתתפו')}</span><span><strong>{isOpen?data.rows.length:data.rows.length-inside}</strong>{isOpen?pick('Attended so far','השתתפו עד כה'):pick('Checked out','נרשמה יציאה')}</span>{!isOpen&&inside>0&&<span><strong>{inside}</strong>{pick('Missing checkout','ללא רישום יציאה')}</span>}</div>
   <label className="workshop-person-search">{pick('Find a person','חיפוש אדם')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   {isOpen?<>{list(rows.filter(r=>!r.checked_out_at),pick('Currently checked in','רשומים כעת בסדנה'))}{list(rows.filter(r=>!!r.checked_out_at),pick('Already checked out','כבר יצאו'))}<small>{pick('Based on check-in records; a missing checkout does not confirm physical presence.','לפי רישומי הכניסה; היעדר רישום יציאה אינו מאשר נוכחות פיזית.')}</small></>:list(rows,pick('Everyone who attended','כל המשתתפים'))}</>}
  </>}
 </section>;
}
