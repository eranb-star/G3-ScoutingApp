import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import '../styles/operationalClarity.css';

type RecordState={checked_in_at:string;checked_out_at:string|null};
export default function PersonalAttendance({meetingId,busy=false,uncertain=false,link=false}:{meetingId?:string;busy?:boolean;uncertain?:boolean;link?:boolean}){
 const {profile}=useMemberAuth(),{pick}=useLocalization();
 const [record,setRecord]=useState<RecordState|null>(null),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[revision,setRevision]=useState(0);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1),visible=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener('g3-attendance-changed',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('g3-attendance-changed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{let live=true;if(!profile){setRecord(null);setState('loading');return;}setState('loading');
 async function load(){try{let query=supabase.from('attendance_records').select('checked_in_at,checked_out_at').eq('member_id',profile!.id);if(meetingId)query=query.eq('meeting_id',meetingId);const {data,error}=await query.order('checked_in_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(live){setRecord(data);setState('ready');}}catch{if(live)setState('error');}}
 void load();return()=>{live=false;};},[profile?.id,meetingId,revision,busy,uncertain]);
 const format=(v:string)=>new Intl.DateTimeFormat(pick('en-GB','he-IL'),{timeZone:'Asia/Jerusalem',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
 const pending=busy||state==='loading',unknown=uncertain||state==='error',inside=!!record&&!record.checked_out_at;
 return <section className={`personal-attendance ${unknown?'is-unknown':inside?'is-present':'is-complete'}`} role="status" aria-live="polite" aria-busy={pending}>
 <span className="attendance-state-icon" aria-hidden="true">{pending?'…':unknown?'!':record?'✓':'○'}</span><div><strong>{busy?pick('Confirming attendance…','מאשרים את הנוכחות…'):unknown?pick('Attendance not confirmed','הנוכחות לא אושרה'):pending?pick('Checking your attendance…','בודקים את הנוכחות שלך…'):inside?pick('You are checked in','הכניסה שלך נרשמה'):record?pick('You checked out','היציאה שלך נרשמה'):pick('You are not checked in','לא נרשמה כניסה')}</strong>
 {!pending&&!unknown&&record&&<><span>{pick('Arrival','כניסה')}: {format(record.checked_in_at)}{record.checked_out_at?` · ${pick('Departure','יציאה')}: ${format(record.checked_out_at)}`:''}</span>{record.checked_out_at&&<small>{pick('Recorded duration','משך נוכחות שנרשם')}: {Math.max(0,Math.round((Date.parse(record.checked_out_at)-Date.parse(record.checked_in_at))/60000))} {pick('minutes','דקות')}</small>}</>}
 {unknown&&<span>{pick('Check the saved status before submitting again.','בדקו את הסטטוס שנשמר לפני שליחה נוספת.')}</span>}
 </div>{link?<Link className="button-secondary" to="/check-in">{inside?pick('Check out','דיווח יציאה'):pick('Attendance details','פרטי נוכחות')}</Link>:<button type="button" disabled={pending} onClick={()=>{setRevision(n=>n+1);window.dispatchEvent(new Event('g3-attendance-refresh'));}}>{pick('Check status','בדיקת סטטוס')}</button>}
 </section>;
}
