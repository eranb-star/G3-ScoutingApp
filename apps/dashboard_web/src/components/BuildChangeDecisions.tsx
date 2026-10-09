import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {readBuildPages} from '../lib/robotBuildWorkspace';
import {useBuildStringDraft} from '../lib/buildFormDraft';
import BuildDraftNotice from './BuildDraftNotice';
import BuildReleaseHold from './BuildReleaseHold';
type Decision={id:string;sequence:number;decision:string;candidate_id:string|null;review_task_id:string;review_submission_id:string|null;note:string;scope_snapshot:{destinations:{kit_id:string;quantity:number}[]}};
type Candidate={id:string;name:string;revision:number};
const labels:Record<string,[string,string]>={continue_old:['Continue old revision for recorded destinations','המשך הגרסה הישנה ליעדים המתועדים'],adopt_unstarted:['Adopt candidate for unstarted demand','אימוץ גרסה מועמדת לדרישה שטרם החלה'],rework:['Rework through a new released workflow','עיבוד חוזר בתהליך חדש ששוחרר'],quarantine:['Quarantine affected parts','בידוד החלקים המושפעים'],cancel_remaining:['Cancel remaining work on old revision','ביטול יתרת העבודה בגרסה הישנה'],defer:['Defer candidate; retain scoped old revision','דחיית הגרסה המועמדת והמשך ישנה בהיקף מוגדר']};
export default function BuildChangeDecisions({projectId,line,candidates,editable}:{projectId:string;line:Candidate;candidates:Candidate[];editable:boolean}){
 const {pick}=useLocalization();const [records,setRecords]=useState<Decision[]>([]),[tasks,setTasks]=useState<{id:string;title:string}[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const initial=()=>({candidate:'',decision:'',review:'',note:'',request:crypto.randomUUID()});
 const draft=useBuildStringDraft(`cad-disposition:${projectId}:${line.id}:${line.revision}`,initial);
 const generation=useRef(0);
 async function load(){const token=++generation.current;try{
  const [d,t,g]=await Promise.all([
   readBuildPages<Decision>((a,z)=>supabase.from('robot_build_change_decisions').select('id,sequence,decision,candidate_id,review_task_id,review_submission_id,note,scope_snapshot').eq('line_id',line.id).order('sequence',{ascending:false}).range(a,z)),
   readBuildPages<{id:string;title:string}>((a,z)=>supabase.from('project_tasks').select('id,title').eq('project_id',projectId).eq('archived',false).order('id').range(a,z)),
   readBuildPages<{task_id:string}>((a,z)=>supabase.from('project_review_gates').select('task_id,project_tasks!inner(project_id)').eq('project_tasks.project_id',projectId).eq('enabled',true).eq('decision_type','design_review_passed').is('current_submission',null).order('task_id').range(a,z))]);
  if(token!==generation.current)return;setRecords(d);setTasks(t.filter(t=>g.some(g=>g.task_id===t.id)));setLoaded(true);
 }catch{if(token===generation.current){setLoaded(false);setMessage(pick('Change decisions could not be loaded. Refresh before continuing.','לא ניתן לטעון החלטות שינוי. רעננו לפני המשך העבודה.'));}}}
 useEffect(()=>{void load();return()=>{generation.current++;};},[projectId,line.id]);
 async function save(id?:string){if(busy)return;setBusy(true);setMessage('');try{
  const candidate=candidates.find(c=>c.id===draft.value.candidate);
  const r=id?await supabase.rpc('activate_robot_build_change',{p_id:id}):await supabase.rpc('propose_robot_build_change',{p_line:line.id,p_candidate:candidate?.id??null,p_expected:line.revision,p_candidate_expected:candidate?.revision??null,p_decision:draft.value.decision,p_review:draft.value.review,p_note:draft.value.note,p_request:draft.value.request});
  if(r.error)throw r.error;if(!id)draft.saved(initial());await load();
  setMessage(id?pick('Independent decision linked. Existing orders, stock and installations have not been rewritten.','ההחלטה העצמאית קושרה. הזמנות, מלאי והתקנות קיימים לא שונו.'):pick('Affected use paused. Open the review and submit the exact CHG revision below.','השימוש המושפע נעצר. פתחו את הביקורת והגישו את גרסת CHG המדויקת להלן.'));
 }catch(e){setMessage((e as {message?:string}).message??pick('Save not confirmed; inputs retained.','השמירה לא אושרה; הקלט נשמר.'));}finally{setBusy(false);}}
 const change=(patch:Partial<typeof draft.value>)=>draft.change({...patch,request:crypto.randomUUID()});
 return <section className="build-change-decisions"><h4>{pick('CAD change decision','החלטה על שינוי CAD')}</h4><p>{pick('Review the affected records above, then record one independent decision. This does not automatically cancel orders, scrap material or certify installed hardware.','בדקו את הרשומות המושפעות לעיל ואז תעדו החלטה עצמאית. הפעולה אינה מבטלת הזמנות, גורעת חומר או מאשרת חומרה מותקנת אוטומטית.')}</p><button type="button" disabled={busy} onClick={()=>void load()}>{pick('Refresh decisions','רענון החלטות')}</button>
 {loaded&&editable&&<details><summary>{pick('Propose a change disposition','הצעת החלטה לשינוי')}</summary><form data-build-form={draft.id} onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy}><legend>{pick('Pause affected use and request review','עצירת השימוש המושפע ובקשת ביקורת')}</legend><BuildDraftNotice {...draft}/>
 <label>{pick('Candidate requirement','דרישה מועמדת')}<select value={draft.value.candidate} onChange={e=>change({candidate:e.target.value})}><option value="">{pick('Removed / no replacement candidate','הוסר / ללא גרסה מועמדת')}</option>{candidates.filter(c=>c.id!==line.id).map(c=><option key={c.id} value={c.id}>{c.name} · {c.id.slice(0,8)}</option>)}</select></label>
 <label>{pick('Proposed disposition','החלטה מוצעת')}<select required value={draft.value.decision} onChange={e=>change({decision:e.target.value})}><option value="">{pick('Choose decision','בחירת החלטה')}</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{pick(...label)}</option>)}</select></label>
 <label>{pick('Separate independent design review','ביקורת תכנון עצמאית נפרדת')}<select required value={draft.value.review} onChange={e=>change({review:e.target.value})}><option value="">{pick('Choose unsubmitted review','בחירת ביקורת שטרם הוגשה')}</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
 <label>{pick('Reason, affected destinations and required follow-up','נימוק, יעדים מושפעים ופעולות המשך נדרשות')}<textarea required minLength={5} maxLength={4000} value={draft.value.note} onChange={e=>change({note:e.target.value})}/></label>
 <p>{pick('Saving pauses new affected reservations, issue, purchasing coverage and use of linked work approvals. Returns remain possible. Continue/defer requires exact independent approval; other decisions leave the old work blocked. New candidate work needs its own sourcing and release.','השמירה עוצרת הקצאות חדשות, מסירה, כיסוי רכש ושימוש באישורי עבודה מקושרים. החזרות נשארות אפשריות. המשך או דחייה דורשים אישור עצמאי מדויק; החלטות אחרות משאירות את העבודה הישנה חסומה. עבודה בגרסה המועמדת דורשת מקור ושחרור משלה.')}</p>
 <button>{pick('Pause affected use & request review','עצירת השימוש המושפע ובקשת ביקורת')}</button></fieldset></form></details>}
 {loaded&&records.map((r,index)=><article key={r.id}><strong>{pick(...labels[r.decision])} · {index===0?pick('Latest proposal','ההצעה האחרונה'):pick('Historical','היסטורי')}</strong><p>{r.note}</p><p>{pick('Exact review revision','גרסת ביקורת מדויקת')}: <code dir="ltr">CHG-{r.id}</code></p><p>{pick('Recorded destinations','יעדים שתועדו')}: {r.scope_snapshot.destinations.length}</p><Link to={`/projects?project=${projectId}&task=${r.review_task_id}&review=1`}>{pick('Open independent review','פתיחת הביקורת העצמאית')}</Link><p>{r.review_submission_id?pick('Approval linked; current authority and scope are rechecked on use.','אישור קושר; הסמכות וההיקף העדכניים נבדקים בכל שימוש.'):pick('Awaiting approval — affected use is paused.','ממתין לאישור — השימוש המושפע נעצר.')}</p>{index===0&&editable&&!r.review_submission_id&&<button disabled={busy} onClick={()=>void save(r.id)}>{pick('Apply completed independent decision','החלת החלטה עצמאית שהושלמה')}</button>}<BuildReleaseHold taskId={r.review_task_id} canManage={editable} scope="change"/></article>)}<p role="status">{message}</p></section>;
}
