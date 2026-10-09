import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {readBuildPages} from '../lib/robotBuildWorkspace';
import {buildHeldTasks} from '../lib/buildHeldTasks';
import BuildSubsystems from './BuildSubsystems';
import type {ReviewGate} from './ProjectTaskReview';
type Gate={task_id:string;decision_type:string;current_submission:string|null};
type Job={id:string;task_id:string;release_task_id:string;release_submission_id:string;part_name:string};
type Hold={task_id:string;reason:string};
export default function BuildReadiness({projectId}:{projectId:string}){
 const {pick}=useLocalization(),generation=useRef(0);
 const [data,setData]=useState<{effectiveHolds:{task_id:string;held:boolean}[];dependencies:{task_id:string;prerequisite_id:string}[];gates:Gate[];reviews:ReviewGate[];jobs:Job[];holds:Hold[];issues:{id:string;title:string}[];kits:{id:string;installed_at:string|null;retired_at:string|null}[]}|null>(null),[failed,setFailed]=useState(false);
 async function load(){const token=++generation.current;setFailed(false);try{
  const [gates,reviews,jobs,holds,kits,issues,dependencies,effectiveHolds]=await Promise.all([
   readBuildPages<Gate>((a,z)=>supabase.from('project_review_gates').select('task_id,decision_type,current_submission,project_tasks!inner(project_id)').eq('project_tasks.project_id',projectId).eq('enabled',true).order('task_id').range(a,z)),
   supabase.rpc('project_review_context',{p_all:true}),
   readBuildPages<Job>((a,z)=>supabase.from('robot_build_jobs').select('id,task_id,release_task_id,release_submission_id,part_name,project_tasks!robot_build_jobs_task_id_fkey!inner(project_id)').eq('project_tasks.project_id',projectId).order('id').range(a,z)),
   readBuildPages<Hold>((a,z)=>supabase.from('robot_build_release_holds').select('task_id,reason,project_tasks!inner(project_id)').eq('project_tasks.project_id',projectId).eq('active',true).order('task_id').range(a,z)),
   readBuildPages<{id:string;installed_at:string|null;retired_at:string|null}>((a,z)=>supabase.from('robot_build_kits').select('id,installed_at,retired_at,project_tasks!inner(project_id)').eq('project_tasks.project_id',projectId).order('id').range(a,z)),
   readBuildPages<{id:string;title:string}>((a,z)=>supabase.from('robot_issues').select('id,title').eq('project_id',projectId).eq('archived',false).neq('status','resolved').order('id').range(a,z)),
   readBuildPages<{task_id:string;prerequisite_id:string}>((a,z)=>supabase.from('project_task_dependencies').select('task_id,prerequisite_id').order('task_id').order('prerequisite_id').range(a,z)),
   readBuildPages<{task_id:string;held:boolean}>((a,z)=>supabase.rpc('robot_build_hold_context',{p_project:projectId}).range(a,z))]);
  if(reviews.error||!Array.isArray(reviews.data))throw Error();if(token===generation.current)setData({effectiveHolds,dependencies,gates,reviews:reviews.data.filter((r:ReviewGate)=>r.project_id===projectId),jobs,holds,kits,issues});
 }catch{if(token===generation.current)setFailed(true);}}
 useEffect(()=>{setData(null);void load();return()=>{generation.current++;};},[projectId]);
 if(failed)return <p role="alert">{pick('Build status could not be verified.','לא ניתן לאמת את מצב הבנייה.')} <button onClick={()=>void load()}>{pick('Retry','ניסיון חוזר')}</button></p>;
 if(!data)return <p role="status">{pick('Checking releases and installation records…','בודק שחרורים ורשומות התקנה…')}</p>;
 const held=buildHeldTasks([...data.holds,...data.effectiveHolds.filter(h=>h.held)],data.dependencies);
 const verified=(task:string)=>{const s=data.reviews.find(r=>r.task_id===task)?.submission;return !held.has(task)&&!!s&&['approved','overridden'].includes(s.status)&&s.valid_current===true;};
 const releaseGates=data.gates.filter(g=>g.decision_type==='released_for_manufacturing');
 const releases=releaseGates.filter(g=>verified(g.task_id)&&!data.holds.some(h=>h.task_id===g.task_id));
 const blocked=data.jobs.filter(j=>!releases.some(g=>g.task_id===j.release_task_id&&g.current_submission===j.release_submission_id));
 const checks=data.gates.filter(g=>['verified_on_robot','competition_ready'].includes(g.decision_type));
 return <section className="build-readiness"><h2>{pick('What needs attention','מה דורש תשומת לב')}</h2><dl><div><dt>{pick('Current manufacturing releases','שחרורי ייצור עדכניים')}</dt><dd><bdi dir="ltr">{releases.length} / {releaseGates.length}</bdi></dd></div><div><dt>{pick('Jobs needing release review','עבודות הדורשות בדיקת שחרור')}</dt><dd>{blocked.length}</dd></div><div><dt>{pick('Recorded installations · not retired','התקנות שנרשמו · לא הוחלפו')}</dt><dd>{data.kits.filter(k=>k.installed_at&&!k.retired_at).length}</dd></div><div><dt>{pick('Current robot verification checkpoints','נקודות אימות רובוט עדכניות')}</dt><dd><bdi dir="ltr">{checks.filter(g=>verified(g.task_id)).length} / {checks.length}</bdi></dd></div></dl>
 <BuildSubsystems projectId={projectId} readiness={{gates:data.gates,jobs:data.jobs,verified,held:id=>held.has(id)}}/>
 {!checks.length&&<p>{pick('No robot verification checkpoints are configured. Installation alone does not establish robot readiness.','לא הוגדרו נקודות אימות לרובוט. התקנה לבדה אינה מוכיחה מוכנות.')}</p>}
 {!!data.issues.length&&<div role="status"><strong>{pick('Open robot issues still need attention','תקלות רובוט פתוחות עדיין דורשות טיפול')}: {data.issues.length}</strong><p>{pick('Approved checkpoints do not clear these open faults.','נקודות ביקורת מאושרות אינן סוגרות תקלות פתוחות אלה.')}</p><ul>{data.issues.slice(0,8).map(i=><li key={i.id}><Link to={`/robot-issues?issue=${i.id}`}>{i.title}</Link></li>)}</ul>{data.issues.length>8&&<Link to="/robot-issues">{pick('Open issue board','פתיחת לוח התקלות')}</Link>}</div>}
 {!!data.holds.length&&<ul>{data.holds.map(h=><li key={h.task_id}><strong>{pick('Release on hold','השחרור נעצר')}: </strong>{h.reason} <Link to={`/robot-build?project=${projectId}&view=work&queue=team&task=${h.task_id}`}>{pick('Review hold','בדיקת העצירה')}</Link></li>)}</ul>}
 {!!blocked.length&&<ul>{blocked.slice(0,8).map(j=><li key={j.id}><Link to={`/robot-build?project=${projectId}&view=work&queue=team&task=${j.task_id}`}>{j.part_name} — {pick('review pinned release','בדיקת השחרור המקושר')}</Link></li>)}</ul>}
 {blocked.length>8&&<Link to={`/robot-build?project=${projectId}&view=work&queue=team`}>{pick('Open all workshop work','פתיחת כל עבודות הסדנה')}</Link>}
 <p>{pick('These counts cover records you can access in this build. Unrecorded parts, wiring and tests are not assumed complete.','הספירה כוללת רשומות שיש לכם גישה אליהן בבנייה זו. חלקים, חיווט ובדיקות שלא נרשמו אינם נחשבים מושלמים.')}</p><button onClick={()=>void load()}>{pick('Refresh build status','רענון מצב הבנייה')}</button></section>;
}
