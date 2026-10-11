import {useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import './adminWorkshopClose.css';

const localInput=(date:Date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
export default function AdminWorkshopClose({meeting,onUpdated}:{meeting:{id:string;ends_at:string;status:string};onUpdated:()=>void}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [remaining,setRemaining]=useState<{id:string;name:string;checked_in_at:string}[]>([]),[time,setTime]=useState(''),[reason,setReason]=useState('');
 if(profile?.role!=='admin'||!['open','closed'].includes(meeting.status))return null;
 async function prepare(){
  setBusy(true);setError('');setNotice('');
  try{
   const r=await supabase.from('attendance_records').select('id,member_id,checked_in_at').eq('meeting_id',meeting.id).is('checked_out_at',null);
   if(r.error)throw r.error;
   const ids=(r.data??[]).map(x=>x.member_id);
   const names=ids.length?await supabase.from('team_members').select('id,display_name').in('id',ids):{data:[],error:null};
   if(names.error)throw names.error;
   setRemaining((r.data??[]).map(x=>({...x,name:names.data?.find(n=>n.id===x.member_id)?.display_name??pick('Member','חבר/ה')})));
   setTime(localInput(new Date(meeting.status==='open'?Date.now():Math.min(Date.now(),Date.parse(meeting.ends_at)||Date.now()))));setReason('');setOpen(true);
  }catch(e){setError(e&&typeof e==='object'&&'message' in e?String(e.message):String(e));}finally{setBusy(false);}
 }
 async function close(){
  if(busy)return;setBusy(true);setError('');
  try{
   const r=await supabase.rpc('admin_close_workshop',{p_meeting:meeting.id,p_checkout_at:new Date(time).toISOString(),p_reason:reason.trim()});
   if(r.error)throw r.error;
   setNotice(pick(`Workshop closed. ${r.data} remaining attendees checked out; corrections recorded.`,`הסדנה נסגרה. נרשמה יציאה ל־${r.data} משתתפים שנותרו; התיקונים תועדו.`));setOpen(false);onUpdated();
  }catch(e){setError(e&&typeof e==='object'&&'message' in e?String(e.message):String(e));}finally{setBusy(false);}
 }
 return <div className="admin-workshop-close"><button type="button" className="button-secondary" disabled={busy} onClick={()=>void prepare()}>{pick(meeting.status==='open'?'Close workshop / check out remaining':'Correct forgotten checkouts',meeting.status==='open'?'סגירת סדנה ויציאה לנוכחים שנותרו':'תיקון יציאות שנשכחו')}</button>
 {open&&<form onSubmit={e=>{e.preventDefault();void close();}}><h3>{pick('Review workshop close-out','בדיקת סגירת הסדנה')}</h3><p><strong>{remaining.length} {pick('still checked in','עדיין רשומים כנוכחים')}</strong></p>{remaining.length>0&&<ul>{remaining.map(r=><li key={r.id}>{r.name} · {pick('In','כניסה')} {new Date(r.checked_in_at).toLocaleString()}</li>)}</ul>}<p>{pick('Confirm when these attendees actually left. Existing checkouts will not change. Everyone still checked in when you confirm will be included.','אשרו מתי המשתתפים יצאו בפועל. יציאות קיימות לא ישתנו. כל מי שעדיין רשום כנוכח בעת האישור ייכלל.')}</p><label>{pick('Actual departure date and time (your device timezone)','תאריך ושעת היציאה בפועל (אזור הזמן של המכשיר)')}<input type="datetime-local" required value={time} max={localInput(new Date())} onChange={e=>setTime(e.target.value)}/></label><label>{pick('Reason for the correction','סיבת התיקון')}<textarea required minLength={4} maxLength={1000} rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder={pick('For example: Workshop ended; students forgot to check out.','לדוגמה: הסדנה הסתיימה והתלמידים שכחו לדווח יציאה.')}/></label><div><button disabled={busy||reason.trim().length<4} className="hub-button">{busy?pick('Saving…','שומר…'):pick('Confirm checkout & close workshop','אישור יציאות וסגירת הסדנה')}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>{pick('Cancel','ביטול')}</button></div></form>}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</div>;
}
