import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {useAccessControl} from '../lib/accessControl';
import {useProjectRefresh,notifyProjectChange} from '../lib/projectRefresh';
type Request={id:string;proposed_by:string;approved_by:string|null;risk:string;configuration:string;expires_at:string;reason:string};
export function OverrideRequests({submissionId,onChanged}:{submissionId:string;onChanged:()=>Promise<void>}){
 const {pick}=useLocalization(),{profile}=useMemberAuth(),access=useAccessControl();
 const [requests,setRequests]=useState<Request[]>([]),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function load(){const r=await supabase.from('project_override_requests').select('id,proposed_by,approved_by,risk,configuration,expires_at,reason').eq('submission_id',submissionId).order('created_at',{ascending:false});if(r.error)setMessage(pick('Exception requests could not be loaded.','לא ניתן לטעון בקשות חריגה.'));else setRequests(r.data??[]);}
 useEffect(()=>{void load();},[submissionId]);useProjectRefresh(load);
 if(!requests.length&&!message)return null;
 return <section className="review-evidence-editor"><h4>{pick('Exception authorizations','אישורי חריגה')}</h4>{requests.map(r=><article className="review-evidence-item" key={r.id}><strong>{r.approved_by?pick('Countersigned','נחתם באישור נוסף'):pick('Awaiting independent authorization','ממתין לאישור בלתי תלוי')}</strong><p>{r.reason}</p><p>{pick('Risk','סיכון')}: {r.risk}</p><p>{pick('Scope','תחום')}: {r.configuration}</p><small>{pick('Expires','תפוגה')}: {new Date(r.expires_at).toLocaleString()}</small>{!r.approved_by&&r.proposed_by!==profile?.id&&profile?.role==='admin'&&access.can('authorize_engineering_override')?<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const result=await supabase.rpc('countersign_engineering_override',{p_request:r.id,p_note:note});if(result.error)throw new Error(result.error.message);await load();await onChanged();notifyProjectChange();setNote('');setMessage(pick('Independent authorization recorded.','האישור הבלתי תלוי תועד.'));}catch(e){setMessage(e instanceof Error?e.message:pick('Could not countersign.','לא ניתן לאשר חתימה נוספת.'));}finally{setBusy(false);}}}><label>{pick('Independent review and justification','בדיקה בלתי תלויה ונימוק')}<textarea required minLength={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="hub-button" disabled={busy||Date.parse(r.expires_at)<=Date.now()}>{pick('Countersign this exact scope & release','אישור נוסף לתחום המדויק ושחרור')}</button></form>:null}</article>)}{message?<p role="status">{message}</p>:null}</section>;
}
