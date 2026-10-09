import {useEffect,useRef,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {notifyProjectChange} from '../lib/projectRefresh';
import './projectBuildWork.css';
import ProjectBom from './ProjectBom';
import BuildManufacturing from './BuildManufacturing';
import BuildInspectionLots from './BuildInspectionLots';
import BuildWorkFiles from './BuildWorkFiles';
import BuildReleaseHold from './BuildReleaseHold';
import BuildKits from './BuildKits';
import BuildOperations from './BuildOperations';
import {readBuildPages} from '../lib/robotBuildWorkspace';
type Task={id:string;title:string;status:string;assignee_id:string|null};
type Job={id:string;task_id:string;release_task_id:string;part_name:string;part_revision:string;instructions:string;required_quantity:number;completed_quantity:number;revision:number;operations?:{id:number;title:string;completed:number}[]};
type Release={task_id:string;current_submission:string;revision:string};
export default function ProjectBuildWork({projectId,tasks,canManage,canStock,canBuy,focusedTask,initiallyOpen=false,workspaceView,confirmDiscard=async()=>true}:{projectId:string;tasks:Task[];canManage:boolean;canStock:boolean;canBuy:boolean;focusedTask?:string|null;initiallyOpen?:boolean;workspaceView?:'parts'|'work'|'assembly';confirmDiscard?:()=>Promise<boolean>}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const [open,setOpen]=useState(false),[jobs,setJobs]=useState<Job[]>([]),[releases,setReleases]=useState<Release[]>([]),[qc,setQc]=useState<string[]>([]);
 const [localView,setView]=useState<'parts'|'work'|'assembly'>(initiallyOpen?'parts':'work');
 const view=workspaceView??localView;
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const loadGeneration=useRef(0);
 const [adding,setAdding]=useState(false),[task,setTask]=useState(''),[release,setRelease]=useState(''),[name,setName]=useState(''),[instructions,setInstructions]=useState(''),[quantity,setQuantity]=useState('1');
 async function load(){
  const generation=++loadGeneration.current;
  setLoaded(false);setMessage('');
  try{
   const ids=tasks.map(t=>t.id);if(!ids.length){setJobs([]);setReleases([]);setQc([]);setLoaded(true);return;}
   const jobs:Job[]=[],gates:{task_id:string;current_submission:string|null;decision_type:string;enabled:boolean}[]=[];
   for(let offset=0;offset<ids.length;offset+=100){
    const chunk=ids.slice(offset,offset+100);
    const [j,g]=await Promise.all([
     readBuildPages<Job>((a,z)=>supabase.from('robot_build_jobs').select('*').in('task_id',chunk).order('id').range(a,z)),
     readBuildPages<{task_id:string;current_submission:string|null;decision_type:string;enabled:boolean}>((a,z)=>supabase.from('project_review_gates').select('task_id,current_submission,decision_type,enabled').in('task_id',chunk).order('task_id').range(a,z)),
    ]);
    jobs.push(...j);gates.push(...g.filter(g=>g.enabled));
   }
   const candidates=gates.filter(g=>g.decision_type==='released_for_manufacturing'&&g.current_submission);
   let accepted:Release[]=[];
   for(let offset=0;offset<candidates.length;offset+=100){const chunk=candidates.slice(offset,offset+100);
    const submissions=await readBuildPages<{id:string;revision:string;status:string}>((a,z)=>supabase.from('project_review_submissions').select('id,revision,status').in('id',chunk.map(g=>g.current_submission!)).order('id').range(a,z));
    accepted.push(...chunk.flatMap(g=>{const submission=submissions.find(s=>s.id===g.current_submission&&['approved','overridden'].includes(s.status));return submission?[{task_id:g.task_id,current_submission:submission.id,revision:submission.revision}]:[];}));
   }
   if(generation!==loadGeneration.current)return;
   setQc(gates.filter(g=>g.decision_type==='qc_accepted').map(g=>g.task_id));setJobs(jobs);setReleases(accepted);setLoaded(true);
  }catch{if(generation===loadGeneration.current)setMessage(pick('Build records could not be loaded. Retry before changing work.','לא ניתן לטעון רשומות בנייה. נסו שוב לפני שינוי העבודה.'));}
 }
 useEffect(()=>()=>{loadGeneration.current++;},[projectId]);
 const focusedHere=!!focusedTask&&tasks.some(t=>t.id===focusedTask);
 useEffect(()=>{if(focusedHere||initiallyOpen){setOpen(true);void load();}},[focusedHere,focusedTask,initiallyOpen]);
 const chosen=releases.find(r=>r.task_id===release);
 return <section className="project-build-work">
  {!workspaceView&&<p><a href={`/robot-build?project=${projectId}&view=parts`}>{pick('Open Robot Build workspace','פתיחת סביבת בניית הרובוט')} →</a></p>}
  {!workspaceView&&<button type="button" aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)void load();}}>{pick('Robot build · manufacturing work','בניית הרובוט · עבודות ייצור')}</button>}
  {open&&<div className="build-work-content">
   <p>{pick('Work stays linked to existing tasks and engineering checkpoints. Reported quantities are not accepted stock.','העבודה מקושרת למשימות ולנקודות הביקורת הקיימות. כמות שדווחה אינה מלאי שאושר.')}</p>
   {!workspaceView&&<nav className="build-work-tabs" aria-label={pick('Build workflow','תהליך הבנייה')}>{(['parts','work','assembly'] as const).map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{v==='parts'?pick('1 · Parts & sourcing','1 · חלקים ומקורות'):v==='work'?pick('2 · Manufacture & inspect','2 · ייצור ובדיקה'):pick('3 · Assemble & install','3 · הרכבה והתקנה')}</button>)}</nav>}
   <div className="build-work-actions"><button type="button" disabled={busy} onClick={async()=>{if(await confirmDiscard())void load();}}>{pick('Refresh','רענון')}</button>{canManage&&loaded&&view==='work'&&<button type="button" onClick={async()=>{if(await confirmDiscard())setAdding(!adding);}}>{pick('Attach manufacturing work','קישור עבודת ייצור')}</button>}</div>
   <p role="status">{message||(!loaded?pick('Loading…','טוען…'):'')}</p>
   {loaded&&view==='parts'&&<ProjectBom confirmDiscard={confirmDiscard} compact={!!workspaceView} projectId={projectId} canManage={canManage} canStock={canStock} canBuy={canBuy} jobs={jobs} onChanged={load}/>}
   {loaded&&view==='work'&&adding&&canManage&&<form onSubmit={async e=>{e.preventDefault();if(busy||!chosen)return;setBusy(true);try{
    const r=await supabase.rpc('create_robot_build_job',{p_task:task,p_release_task:release,p_submission:chosen.current_submission,p_name:name,p_revision:chosen.revision,p_instructions:instructions,p_quantity:Number(quantity)});
    if(r.error)throw Error(r.error.message);setAdding(false);await load();setMessage(pick('Manufacturing work linked to the task.','עבודת הייצור קושרה למשימה.'));notifyProjectChange();
   }catch(e){setMessage(e instanceof Error?e.message:pick('Save was not confirmed. Refresh before retrying.','השמירה לא אושרה. רעננו לפני ניסיון נוסף.'));}finally{setBusy(false);}}}>
    <fieldset disabled={busy}><legend>{pick('Use the existing manufacturing release and inspection task','בחירת שחרור לייצור ומשימת בדיקה קיימים')}</legend>
    <label>{pick('Manufacturing release','שחרור לייצור')}<select required value={release} onChange={e=>setRelease(e.target.value)}><option value="">{pick('Select reviewed release','בחירת שחרור שנבדק')}</option>{releases.map(r=><option key={r.task_id} value={r.task_id}>{tasks.find(t=>t.id===r.task_id)?.title} · {r.revision}</option>)}</select></label>
    <label>{pick('Work task with inspection checkpoint','משימת עבודה עם נקודת ביקורת איכות')}<select required value={task} onChange={e=>setTask(e.target.value)}><option value="">{pick('Select task','בחירת משימה')}</option>{tasks.filter(t=>qc.includes(t.id)&&t.status!=='done'&&!jobs.some(j=>j.task_id===t.id)).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
    <p>{pick('If a task is missing, configure its existing engineering checkpoint first: Released for manufacturing for the release task; QC accepted for the work task. Current validity is checked when saving.','אם משימה חסרה, הגדירו תחילה את נקודת הביקורת ההנדסית שלה: שחרור לייצור למשימת השחרור, וקבלת איכות למשימת העבודה. תוקף האישור נבדק בשמירה.')}</p>
    <label>{pick('Part / batch name','שם חלק / אצווה')}<input required maxLength={180} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>{pick('Required quantity','כמות נדרשת')}<input type="number" required min={1} max={100000} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
    <label>{pick('Instructions for this revision','הוראות לגרסה זו')}<textarea required minLength={3} maxLength={8000} value={instructions} onChange={e=>setInstructions(e.target.value)}/></label>
    <button disabled={!chosen||!task}>{pick('Link work','קישור העבודה')}</button>
    </fieldset></form>}
   {loaded&&view==='work'&&!jobs.length&&<p>{pick('No manufacturing jobs linked to this project yet.','עדיין לא קושרו עבודות ייצור לפרויקט זה.')}</p>}
   {loaded&&view==='assembly'&&<BuildKits projectId={projectId} tasks={tasks} canManage={canManage} canStock={canStock}/>}
   {loaded&&view==='work'&&jobs.filter(job=>!workspaceView||job.task_id===focusedTask).map(job=><div key={`${job.id}/${job.revision}`}><BuildReleaseHold taskId={job.release_task_id} canManage={canManage}/><BuildWorkFiles taskId={job.release_task_id}/><BuildProgress expanded={!!workspaceView} job={job} task={tasks.find(t=>t.id===job.task_id)} projectId={projectId} editable={canManage||tasks.find(t=>t.id===job.task_id)?.assignee_id===profile?.id} onSaved={async()=>{await load();setMessage(pick('Progress saved. Reported quantities still require inspection.','ההתקדמות נשמרה. הכמויות שדווחו עדיין דורשות בדיקה.'));}}/><BuildOperations job={job} canManage={canManage} editable={tasks.find(t=>t.id===job.task_id)?.status!=='done'&&(canManage||tasks.find(t=>t.id===job.task_id)?.assignee_id===profile?.id)} saved={load}/><BuildInspectionLots job={job} workerId={tasks.find(t=>t.id===job.task_id)?.assignee_id??undefined} projectId={projectId} canManage={canManage} canStock={canStock} done={tasks.find(t=>t.id===job.task_id)?.status==='done'} saved={async()=>{await load();notifyProjectChange();}}/><BuildManufacturing job={job} canManage={canManage} canStock={canStock} editable={canManage||tasks.find(t=>t.id===job.task_id)?.assignee_id===profile?.id} done={tasks.find(t=>t.id===job.task_id)?.status==='done'} saved={load}/></div>)}
  </div>}
 </section>;
}
function BuildProgress({job,task,projectId,editable,onSaved,expanded=false}:{expanded?:boolean;job:Job;task?:Task;projectId:string;editable:boolean;onSaved:()=>Promise<void>}){
 const {pick}=useLocalization();const [quantity,setQuantity]=useState(String(job.completed_quantity)),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [request,setRequest]=useState(()=>crypto.randomUUID());
 return <article className="build-job"><div className="build-job-summary"><div><strong>{job.part_name}</strong><small>{pick('Revision','גרסה')} {job.part_revision} · {task?.title}</small></div><strong>{job.completed_quantity} / {job.required_quantity}</strong></div>
  <p>{task?.status==='done'?pick('Task completed through its inspection checkpoint.','המשימה הושלמה דרך נקודת ביקורת האיכות.'):job.completed_quantity===job.required_quantity?pick('Quantity reported. Inspection is still required.','הכמות דווחה. עדיין נדרשת בדיקת איכות.'):pick('Reported progress — not yet accepted.','התקדמות מדווחת — טרם אושרה.')}</p>
  <details open={expanded?true:undefined}><summary>{pick('Instructions & progress','הוראות והתקדמות')}</summary><p className="build-instructions">{job.instructions}</p>
   {editable&&task?.status!=='done'&&<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const r=await supabase.rpc('record_robot_build_progress',{p_job:job.id,p_expected_revision:job.revision,p_completed:Number(quantity),p_note:note,p_request:request});if(r.error)throw Error(r.error.message);setMessage(pick('Progress saved.','ההתקדמות נשמרה.'));notifyProjectChange();await onSaved();}catch(e){setMessage(e instanceof Error?e.message:pick('Save not confirmed. Retry unchanged values or refresh.','השמירה לא אושרה. נסו שוב ללא שינוי או רעננו.'));}finally{setBusy(false);}}}>
    <fieldset disabled={busy}><label>{pick('Total completed quantity so far','סך הכמות שהושלמה עד כה')}<input type="number" required min={0} max={job.required_quantity} step={1} value={quantity} onChange={e=>{setQuantity(e.target.value);setRequest(crypto.randomUUID());}}/></label><label>{pick('Work completed / reason for correction','עבודה שבוצעה / סיבה לתיקון')}<textarea required minLength={3} maxLength={2000} value={note} onChange={e=>{setNote(e.target.value);setRequest(crypto.randomUUID());}}/></label><button>{busy?pick('Saving…','שומר…'):pick('Save progress','שמירת התקדמות')}</button></fieldset></form>}
   <p role="status">{message}</p>
  </details><a href={`/projects?project=${projectId}&task=${job.task_id}&review=1`}>{pick('Open task & inspection','פתיחת המשימה ובדיקת האיכות')}</a>
 </article>;
}
