import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {readBuildPages} from '../lib/robotBuildWorkspace';
import {needsReview} from '../lib/reviewQueue';
import BuildWorkFiles from './BuildWorkFiles';
import BuildReleaseHold from './BuildReleaseHold';
import ProjectTaskReview,{type ReviewGate} from './ProjectTaskReview';

export type BuildTask={id:string;title:string;status:string;assignee_id:string|null;created_by:string|null;due_at:string|null;archived:boolean};
export default function BuildTaskQueue({projectId,tasks,canManage,confirmDiscard,onChanged}:{projectId:string;tasks:BuildTask[];canManage:boolean;confirmDiscard:()=>Promise<boolean>;onChanged:()=>Promise<void>}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const [params,setParams]=useSearchParams();
 const requestedQueue=params.get('queue');
 const queue=requestedQueue==='team'||requestedQueue==='inspections'?requestedQueue:'mine',selected=params.get('task');
 const [holds,setHolds]=useState<string[]>([]);
 const [gates,setGates]=useState<ReviewGate[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(true);
 const generation=useRef(0);
 async function load(){const token=++generation.current;setLoading(true);setError(false);try{
  const [r,h]=await Promise.all([supabase.rpc('project_review_context',{p_all:true}),readBuildPages<{task_id:string;held:boolean}>((a,z)=>supabase.rpc('robot_build_hold_context',{p_project:projectId}).range(a,z))]);if(r.error||!Array.isArray(r.data))throw Error();if(token===generation.current)setHolds(h.filter(x=>x.held).map(x=>x.task_id));
  if(token===generation.current)setGates(r.data.filter((g:ReviewGate)=>g.project_id===projectId));
 }catch{if(token===generation.current)setError(true);}finally{if(token===generation.current)setLoading(false);}}
 useEffect(()=>{void load();return()=>{generation.current++;};},[projectId,tasks]);
 async function change(key:string,value:string){if(!await confirmDiscard())return;const next=new URLSearchParams(params);next.set(key,value);if(key==='queue')next.delete('task');setParams(next);}
 const active=tasks.filter(t=>!t.archived);
 const shown=active.filter(t=>queue==='team'||(queue==='inspections'?gates.some(g=>g.task_id===t.id&&needsReview(g,profile?.id??'')):t.assignee_id===profile?.id));
 const task=active.find(t=>t.id===selected);
 const status=(value:string)=>value==='done'?pick('Completed','הושלם'):value==='blocked'?pick('Blocked','חסום'):value==='in_progress'?pick('In progress','בתהליך'):pick('To do','לביצוע');
 return <section className="build-task-queue" aria-label={pick('Workshop work queue','תור עבודות הסדנה')}>
  <nav className="build-work-actions" aria-label={pick('Choose work queue','בחירת תור עבודה')}>{[['mine','My work','העבודה שלי'],['team','Team work','עבודת הצוות'],['inspections','Inspections','בדיקות ואישורים']].map(([id,en,he])=><button type="button" key={id} aria-pressed={queue===id} onClick={()=>void change('queue',id)}>{pick(en,he)}</button>)}</nav>
  {loading?<p role="status">{pick('Loading review status…','טוען סטטוס ביקורות…')}</p>:error?<p role="alert">{pick('Review status could not be loaded. Approval controls are unavailable.','לא ניתן לטעון את סטטוס הביקורות. פעולות אישור אינן זמינות.')} <button onClick={()=>void load()}>{pick('Retry','ניסיון חוזר')}</button></p>:null}
  {!loading&&!error&&!shown.length&&<p>{queue==='inspections'?pick('No submissions currently need your review.','אין כרגע הגשות הממתינות לבדיקתך.'):queue==='mine'?pick('No work is assigned to you in this build. Your leader can assign an existing task.','לא הוקצתה לך עבודה בבנייה זו. מוביל/ת הצוות יכולים לשייך משימה קיימת.'):pick('No active tasks in this project yet.','עדיין אין משימות פעילות בפרויקט.')}</p>}
  <div className="build-queue-list">{shown.map(t=><button key={t.id} type="button" aria-pressed={selected===t.id} onClick={()=>void change('task',t.id)}><strong>{t.title}</strong><span>{holds.includes(t.id)?pick('Use paused — review required','השימוש נעצר — נדרשת ביקורת'):status(t.status)}{t.due_at?' · '+new Date(t.due_at.slice(0,10)+'T12:00:00').toLocaleDateString(pick('en-GB','he-IL')):''}{!t.assignee_id?' · '+pick('Owner needed','נדרש אחראי'):''}</span></button>)}</div>
  {selected&&!task&&<p role="alert">{pick('This task is unavailable in this build. Choose a task above.','משימה זו אינה זמינה בבנייה. בחרו משימה מהרשימה.')}</p>}
  {task&&!loading&&!error&&<section key={task.id} className="build-selected-task"><h3>{task.title}</h3><BuildReleaseHold taskId={task.id} canManage={canManage}/><BuildWorkFiles taskId={task.id} canUpload={canManage}/><ProjectTaskReview task={task} gate={gates.find(g=>g.task_id===task.id)} canManage={canManage} onChanged={async()=>{await load();await onChanged();}}/></section>}
 </section>;
}
