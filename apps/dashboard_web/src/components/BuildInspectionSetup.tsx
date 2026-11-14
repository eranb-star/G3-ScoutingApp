import {useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useBuildStringDraft} from '../lib/buildFormDraft';
import {notifyProjectChange} from '../lib/projectRefresh';
import BuildDraftNotice from './BuildDraftNotice';
export default function BuildInspectionSetup({submissionId}:{submissionId:string}){
 const {pick}=useLocalization();const initial=()=>({tag:'',reference:'',description:''});const draft=useBuildStringDraft(`parts-inspection:${submissionId}`,initial);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <details className="build-secondary"><summary>{pick('Identify the parts being inspected','זיהוי החלקים שנבדקים')}</summary><p>{pick('For a new batch, enter its physical label and measurement reference. The inspection configuration is created here; no whole robot setup is needed.','לאצווה חדשה, הזינו את התווית שעל החלקים ואת ייחוס המדידה. זהות החלקים לבדיקה נוצרת כאן — אין צורך להגדיר רובוט שלם.')}</p><form data-build-form={draft.id} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const r=await supabase.rpc('prepare_robot_build_inspection_context',{p_submission:submissionId,p_tag:draft.value.tag,p_reference:draft.value.reference,p_description:draft.value.description});if(r.error)throw Error(r.error.message);draft.saved(initial());notifyProjectChange();setMessage(pick('Parts identified. Continue with the findings and approval below.','זהות החלקים נשמרה. המשיכו לרישום הממצאים ולאישור בהמשך.'));}catch(e){setMessage(e instanceof Error?e.message:pick('Save not confirmed.','השמירה לא אושרה.'));}finally{setBusy(false);}}}><BuildDraftNotice {...draft}/><fieldset disabled={busy}>
 <label>{pick('Label on these parts / batch','התווית שעל החלקים / האצווה')}<input required minLength={3} maxLength={120} value={draft.value.tag} onChange={e=>draft.change({tag:e.target.value})}/></label>
 <label>{pick('Measurement instrument calibration / reference','כיול / ייחוס כלי המדידה')}<input required minLength={3} maxLength={500} value={draft.value.reference} onChange={e=>draft.change({reference:e.target.value})}/></label>
 <label>{pick('Which physical parts are being checked?','אילו חלקים פיזיים נבדקים?')}<textarea required minLength={3} maxLength={2000} value={draft.value.description} onChange={e=>draft.change({description:e.target.value})}/></label><button>{pick('Save parts identity','שמירת זהות החלקים')}</button></fieldset></form><p role="status">{message}</p></details>;
}
