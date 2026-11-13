import {useState} from 'react';
import {useAccessControl} from '../lib/accessControl';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import {supabase} from '../supabase';
import {israelLocalTime,israelTimeToUtc} from '../lib/attendanceTime';
import AccessibleDialog from './AccessibleDialog';

export default function MissingAttendanceEntry({meeting,memberId,name,onSaved}:{meeting:{id:string;starts_at:string;status:string};memberId:string;name:string;onSaved:()=>void}){
 const {profile}=useMemberAuth(),access=useAccessControl(),{pick}=useLocalization();
 const [open,setOpen]=useState(false),[start,setStart]=useState(''),[end,setEnd]=useState(''),[inside,setInside]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(profile?.role!=='admin'&&!access.can('correct_attendance'))return null;
 async function save(){if(busy)return;setBusy(true);setError('');try{
  const {error}=await supabase.rpc('admin_add_missing_attendance',{p_meeting:meeting.id,p_member:memberId,p_in:israelTimeToUtc(start),p_out:inside?null:israelTimeToUtc(end),p_reason:reason.trim()});
  if(error)throw error;setOpen(false);onSaved();
 }catch(e){setError(String((e as {message?:string}).message??e));}finally{setBusy(false);}}
 return <><button className="hub-button" onClick={()=>{setStart('');setEnd('');setInside(false);setReason('');setError('');setOpen(true);}}>{pick('Add attendance','הוספת נוכחות')}</button>{open&&<AccessibleDialog title={pick('Add missing attendance','הוספת נוכחות חסרה')} onClose={()=>{if(!busy)setOpen(false);}}><form className="attendance-time-form missing-attendance-form" onSubmit={e=>{e.preventDefault();void save();}}><h2>{name}</h2><p>{pick('Enter actual arrival and departure. This creates an audited manual record; it does not claim a location-verified check-in.','הזינו את זמני ההגעה והיציאה בפועל. זהו רישום ידני מתועד, ולא צ׳ק־אין שאומת במיקום.')}</p><p>{pick('Meeting date (Israel): ','תאריך המפגש (שעון ישראל): ')}{israelLocalTime(meeting.starts_at).slice(0,10)}</p><label>{pick('Actual arrival','הגעה בפועל')}<input required type="datetime-local" max={israelLocalTime(new Date().toISOString())} value={start} onChange={e=>setStart(e.target.value)}/></label>{meeting.status==='open'&&<label className="attendance-still-inside"><input type="checkbox" checked={inside} onChange={e=>setInside(e.target.checked)}/>{pick('Still at the workshop','עדיין בסדנה')}</label>}<label>{pick('Actual departure','יציאה בפועל')}<input required={!inside} disabled={inside} type="datetime-local" min={start} max={israelLocalTime(new Date().toISOString())} value={end} onChange={e=>setEnd(e.target.value)}/></label><label>{pick('Reason / how attendance was confirmed','סיבה / כיצד אומתה הנוכחות')}<textarea required minLength={4} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<footer><button className="hub-button" disabled={busy||!start||(!inside&&!end)||reason.trim().length<4}>{busy?pick('Saving…','שומר…'):pick('Save attendance','שמירת נוכחות')}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>{pick('Cancel','ביטול')}</button></footer></form></AccessibleDialog>}</>;
}
