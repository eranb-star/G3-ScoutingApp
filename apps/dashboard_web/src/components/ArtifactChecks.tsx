import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {useAccessControl} from '../lib/accessControl';
import type {ReviewSubmission} from './ProjectTaskReview';
type Check={id:number;item_index:number;reviewer_id:string;status:string;note:string;created_at:string};
export function ArtifactChecks({submission,onChanged}:{submission:ReviewSubmission;onChanged:()=>Promise<void>}){
 const {pick}=useLocalization(),{profile}=useMemberAuth(),access=useAccessControl();
 const [checks,setChecks]=useState<Check[]>([]),[index,setIndex]=useState(0),[result,setResult]=useState('verified'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const canCheck=access.can('decide_engineering_review')&&submission.required_reviewers?.includes(profile?.id??'')&&submission.submitted_by!==profile?.id;
 async function load(){const r=await supabase.from('project_artifact_checks').select('id,item_index,reviewer_id,status,note,created_at').eq('submission_id',submission.id).order('id',{ascending:false});if(r.error)setMessage(pick('Artifact checks could not be loaded.','לא ניתן לטעון בדיקות ראיות.'));else setChecks(r.data??[]);}
 useEffect(()=>{void load();},[submission.id]);
 const invalid=checks.some(c=>c.status!=='verified');
 return <details className="review-evidence-editor"><summary>{pick('Verify submitted artifacts','אימות הראיות שהוגשו')}</summary>
 <p>{pick('Open each link and confirm its fixed source version matches the submission. This records a reviewer check; it is not an automatic scan of the external service.','פתחו כל קישור ואמתו שהגרסה הקבועה במקור תואמת להגשה. זהו תיעוד בדיקת מנטור, ולא סריקה אוטומטית של השירות החיצוני.')}</p>
 {invalid?<p role="status">{pick('Evidence was reported missing or changed. A fresh submission is required.','דווח על ראיה חסרה או שהשתנתה. נדרשת הגשה חדשה.')}</p>:null}
 {(submission.evidence_items??[]).map((item,i)=><article key={i} className="review-evidence-item"><a href={item.url.startsWith('https://')?item.url:undefined} target="_blank" rel="noopener noreferrer">{item.title} ↗</a><small>{item.source_id}</small><p>{checks.some(c=>c.item_index===i&&c.reviewer_id===profile?.id&&c.status==='verified')?pick('Your verification is recorded','האימות שלך תועד'):pick('Your verification is not recorded','האימות שלך טרם תועד')}</p></article>)}
 {canCheck?<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('check_engineering_artifact',{p_submission:submission.id,p_index:index,p_status:result,p_note:note});if(r.error)throw new Error(r.error.message);setNote('');await load();await onChanged();setMessage(pick('Artifact check recorded.','בדיקת הראיה תועדה.'));}catch(e){setMessage(e instanceof Error?e.message:pick('Could not save. Try again.','לא ניתן לשמור. נסו שוב.'));}finally{setBusy(false);}}}>
 <fieldset disabled={busy}><legend>{pick('Record your check','תיעוד הבדיקה שלך')}</legend><label>{pick('Artifact','ראיה')}<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{submission.evidence_items?.map((item,i)=><option value={i} key={i}>{item.title}</option>)}</select></label>
 <label>{pick('Result','תוצאה')}<select value={result} onChange={e=>setResult(e.target.value)}><option value="verified">{pick('Opened and matched the fixed version','נפתחה ונמצאה תואמת לגרסה הקבועה')}</option><option value="missing">{pick('Missing / inaccessible','חסרה / אינה נגישה')}</option><option value="changed">{pick('Content does not match','התוכן אינו תואם')}</option></select></label>
 <label>{pick('What did you verify or find?','מה אומת או נמצא?')}<textarea required minLength={3} maxLength={2000} rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="hub-button">{pick('Record check','תיעוד בדיקה')}</button></fieldset></form>:null}
 {message?<p role="status">{message}</p>:null}
 </details>;
}
