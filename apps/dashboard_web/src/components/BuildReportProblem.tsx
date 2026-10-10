import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useBuildStringDraft} from '../lib/buildFormDraft';
import BuildDraftNotice from './BuildDraftNotice';
export default function BuildReportProblem({taskId,saved}:{taskId:string;saved:()=>Promise<void>}){
 const {pick}=useLocalization(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reports,setReports]=useState<{id:string;note:string;created_at:string}[]>([]);
 async function load(){const r=await supabase.from('robot_build_problem_reports').select('id,note,created_at').eq('task_id',taskId).order('created_at',{ascending:false}).limit(10);if(r.error)setMessage(pick('Problem history could not be loaded.','לא ניתן לטעון היסטוריית בעיות.'));else setReports(r.data??[]);}
 useEffect(()=>{void load();},[taskId]);
 const initial=()=>({note:'',request:String(crypto.randomUUID())}),draft=useBuildStringDraft(`build-problem:${taskId}`,initial);
 return <details className="build-secondary"><summary>{pick('Report a problem / blocked work','דיווח על בעיה / עבודה חסומה')}</summary>{reports.map(r=><p key={r.id}><time>{new Date(r.created_at).toLocaleString()}</time> · {r.note}</p>)}<form data-build-form={draft.id} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const r=await supabase.rpc('report_robot_build_problem',{p_task:taskId,p_note:draft.value.note,p_request:draft.value.request});if(r.error)throw r.error;draft.saved(initial());setMessage(pick('Problem saved. This task is marked blocked for your team leader.','הבעיה נשמרה. המשימה סומנה כחסומה עבור מוביל/ת הצוות.'));await saved();await load();}catch(e){setMessage((e as {message?:string}).message??pick('Save not confirmed. Draft retained.','השמירה לא אושרה. הטיוטה נשמרה.'));}finally{setBusy(false);}}}><fieldset disabled={busy}><BuildDraftNotice {...draft}/><label>{pick('What prevents progress? Include the part, operation and help needed.','מה מונע התקדמות? ציינו חלק, פעולה ועזרה נדרשת.')}<textarea required minLength={3} maxLength={2000} value={draft.value.note} onChange={e=>draft.change({note:e.target.value,request:crypto.randomUUID()})}/></label><button>{pick('Save problem & mark blocked','שמירת הבעיה וסימון כחסום')}</button></fieldset></form>{message&&<p role="status">{message}</p>}</details>;
}
