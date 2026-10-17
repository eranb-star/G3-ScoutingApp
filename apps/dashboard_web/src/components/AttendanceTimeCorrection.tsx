import {useAccessControl} from '../lib/accessControl';
import {useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import AccessibleDialog from './AccessibleDialog';
import {israelLocalTime,israelTimeToUtc} from '../lib/attendanceTime';

export default function AttendanceTimeCorrection({record,name,onSaved}:{record:{id:string;checked_in_at:string;checked_out_at:string|null};name:string;onSaved:()=>void}){
 const access=useAccessControl(),{profile}=useMemberAuth(),{pick}=useLocalization();
 const [open,setOpen]=useState(false),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const local=israelLocalTime;
 if(profile?.role!=='admin'&&!access.can('correct_attendance'))return null;
 async function save(){if(busy)return;setBusy(true);setError('');try{
  const checkedIn= start===local(record.checked_in_at)?record.checked_in_at:israelTimeToUtc(start);
  const checkedOut= record.checked_out_at&&end===local(record.checked_out_at)?record.checked_out_at:israelTimeToUtc(end);
  const r=await supabase.rpc('admin_correct_attendance_times',{p_record:record.id,p_expected_in:record.checked_in_at,p_expected_out:record.checked_out_at,p_in:checkedIn,p_out:checkedOut,p_reason:reason.trim()});
  if(r.error)throw r.error;setOpen(false);setNotice(pick('Attendance corrected; change recorded in history.','הנוכחות תוקנה; השינוי תועד בהיסטוריה.'));onSaved();
 }catch(e){setError(String((e as {message?:string}).message??e));}finally{setBusy(false);}}
 return <><button className="button-secondary" onClick={()=>{setStart(local(record.checked_in_at));setEnd(record.checked_out_at?local(record.checked_out_at):'');setReason('');setError('');setNotice('');setOpen(true);}}>{record.checked_out_at?pick('Correct times','תיקון שעות'):pick('Check out person','רישום יציאה לאדם')}</button>{notice&&<small role="status">{notice}</small>}{open&&<AccessibleDialog title={pick('Correct attendance','תיקון נוכחות')} onClose={()=>{if(!busy)setOpen(false);}}><form className="attendance-time-form" onSubmit={e=>{e.preventDefault();void save();}}><h2>{name}</h2><p>{pick('Enter actual attendance times. This changes only this person’s record and does not close the workshop.','הזינו את זמני הנוכחות בפועל. רק הרשומה של אדם זה תשתנה; הסדנה לא תיסגר.')}</p><p>{pick('Workshop timezone: ','אזור הזמן של הסדנה: ')}<bdi>Asia/Jerusalem</bdi></p><label>{pick('Actual check-in','כניסה בפועל')}<input required type="datetime-local" max={local(new Date().toISOString())} value={start} onChange={e=>setStart(e.target.value)}/></label><label>{pick('Actual departure','יציאה בפועל')}<input required type="datetime-local" min={start} max={local(new Date().toISOString())} value={end} onChange={e=>setEnd(e.target.value)}/></label><label>{pick('Correction reason','סיבת התיקון')}<textarea required minLength={4} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="hub-button" disabled={busy||reason.trim().length<4||!end}>{busy?pick('Saving…','שומר…'):pick('Save correction','שמירת התיקון')}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>{pick('Cancel','ביטול')}</button></form></AccessibleDialog>}</>;
}
