import {useEffect,useRef,useState} from 'react';
import {Link,useBlocker,useSearchParams} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {useAccessControl} from '../lib/accessControl';
import {useProjectRefresh} from '../lib/projectRefresh';
import {buildView,readBuildPages,selectBuild,type BuildProject,type BuildView} from '../lib/robotBuildWorkspace';
import ProjectBuildWork from '../components/ProjectBuildWork';
import ProjectConfigurations from '../components/ProjectConfigurations';
import './robotBuild.css';
import BuildLeaveDialog from '../components/BuildLeaveDialog';
import BuildTaskQueue from '../components/BuildTaskQueue';
import BuildScopeDetails from '../components/BuildScopeDetails';
import BuildPrepareWork from '../components/BuildPrepareWork';

type Task={id:string;title:string;status:string;assignee_id:string|null;project_id:string;archived:boolean;created_by:string|null;due_at:string|null};
export default function RobotBuildPage(){
 const {pick}=useLocalization(),access=useAccessControl(),{profile}=useMemberAuth();
 const [params,setParams]=useSearchParams();
 const requested=params.get('project'),view=buildView(params.get('view'));
 const [projects,setProjects]=useState<BuildProject[]>([]),[buildIds,setBuildIds]=useState<Set<string>>(new Set());
 const [tasks,setTasks]=useState<Task[]>([]),[loading,setLoading]=useState(true),[taskLoading,setTaskLoading]=useState(false),[error,setError]=useState(''),[taskError,setTaskError]=useState('');
 const [tasksFor,setTasksFor]=useState<string|null>(null);
 const [choose,setChoose]=useState(false),[search,setSearch]=useState('');
 const generation=useRef(0),taskGeneration=useRef(0),edited=useRef(false);
 const blocker=useBlocker(()=>!!profile?.id&&profile.active!==false&&edited.current);
 const [leavePending,setLeavePending]=useState(false);
 const [preparationEpoch,setPreparationEpoch]=useState(0);
 const leaveResolver=useRef<((discard:boolean)=>void)|null>(null);
 function leave():Promise<boolean>{
  if(!edited.current)return Promise.resolve(true);
  if(leaveResolver.current)return Promise.resolve(false);
  setLeavePending(true);
  return new Promise(resolve=>{leaveResolver.current=resolve;});
 }
 function resolveLeave(discard:boolean){if(discard){edited.current=false;try{if(view==='details')sessionStorage.removeItem(`g3-build-scope-draft:${profile?.id}:${projectId}`);if(view==='work')sessionStorage.removeItem(`g3-build-preparation-draft:${profile?.id}:${projectId}`);}catch{}setPreparationEpoch(n=>n+1);}leaveResolver.current?.(discard);leaveResolver.current=null;setLeavePending(false);if(blocker.state==='blocked'){if(discard)blocker.proceed();else blocker.reset();}}
 useEffect(()=>()=>{leaveResolver.current?.(false);},[]); useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(edited.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);
 async function load(){
  const token=++generation.current;setLoading(true);setError('');
  try{
   const [p,b,j,s,prepared]=await Promise.all([
    readBuildPages<BuildProject>((a,z)=>supabase.from('team_projects').select('id,name,status,subteam,due_at').order('id').range(a,z)),
    readBuildPages<{project_id:string}>((a,z)=>supabase.from('robot_build_boms').select('id,project_id').order('id').range(a,z)),
    readBuildPages<{task_id:string}>((a,z)=>supabase.from('robot_build_jobs').select('id,task_id').order('id').range(a,z)),
    readBuildPages<{project_id:string}>((a,z)=>supabase.from('robot_build_scopes').select('project_id').order('project_id').range(a,z)),
    readBuildPages<{project_id:string}>((a,z)=>supabase.from('robot_build_preparations').select('id,project_id').order('id').range(a,z)),
   ]);
   const ids=new Set([...b,...s,...prepared].map(row=>row.project_id));
   // Resolve only visible jobs, in bounded URL-sized groups; RLS remains authoritative.
   for(let offset=0;offset<j.length;offset+=100){
    const rows=await readBuildPages<{project_id:string}>((a,z)=>supabase.from('project_tasks').select('id,project_id').in('id',j.slice(offset,offset+100).map(row=>row.task_id)).order('id').range(a,z));
    rows.forEach(row=>ids.add(row.project_id));
   }
   if(token===generation.current){setProjects(p);setBuildIds(ids);}
  }catch{if(token===generation.current)setError(pick('Builds could not be loaded. Retry; your existing work has not changed.','לא ניתן לטעון את הבניות. נסו שוב; העבודה הקיימת לא השתנתה.'));}
  finally{if(token===generation.current)setLoading(false);}
 }
 useEffect(()=>{void load();return()=>{generation.current++;};},[]);
 const project=selectBuild(projects,buildIds,requested);
 const projectId=project?.id;
 async function loadTasks(){
  const token=++taskGeneration.current;if(tasksFor!==projectId){setTasks([]);setTasksFor(null);}setTaskError('');
  if(!projectId){setTaskLoading(false);return;}
  if(tasksFor!==projectId)setTaskLoading(true);
  try{const rows=await readBuildPages<Task>((a,z)=>supabase.from('project_tasks').select('id,title,status,assignee_id,project_id,archived,created_by,due_at').eq('project_id',projectId).order('id').range(a,z));if(token===taskGeneration.current){setTasks(rows);setTasksFor(projectId);}}
  catch{if(token===taskGeneration.current)setTaskError(pick('Tasks could not be loaded. Retry before changing work.','לא ניתן לטעון משימות. נסו שוב לפני שינוי העבודה.'));}
  finally{if(token===taskGeneration.current)setTaskLoading(false);}
 }
 useEffect(()=>{void loadTasks();return()=>{taskGeneration.current++;};},[projectId]);
 useProjectRefresh(()=>loadTasks());
 const readOnly=!!project&&['archived','completed'].includes(project.status);
 const canManage=!!project&&!readOnly&&access.can('assign_team_work',project.subteam);
 async function go(next:BuildView){if(!project||!await leave())return;setParams({project:project.id,view:next});}
 const labels:Record<BuildView,[string,string]>={overview:['Overview','סקירה'],parts:['Parts','חלקים'],work:['Workshop','סדנה'],assembly:['Assembly & tests','הרכבה ובדיקות'],details:['Build details','פרטי הבנייה']};
 return <main className="robot-build-page" onChangeCapture={e=>{if((e.target as HTMLElement).closest("form"))edited.current=true;}}>
  <header className="robot-build-header"><div><Link to="/work">{pick('Work','עבודה')}</Link><h1>{pick('Robot Build','בניית הרובוט')}</h1><p>{project?.name??pick('Parts, workshop and installation in one place.','חלקים, סדנה והתקנה במקום אחד.')}</p></div>{project&&<div className="robot-build-header-actions"><button onClick={async()=>{if(await leave())setChoose(true);}}>{pick('Change build','החלפת בנייה')}</button><button onClick={()=>go('details')}>{pick('Build details','פרטי הבנייה')}</button></div>}</header>
  {loading?<p role="status">{pick('Loading builds…','טוען בניות…')}</p>:error?<section role="alert"><p>{error}</p><button onClick={()=>void load()}>{pick('Retry','ניסיון חוזר')}</button></section>:<>
  {(!project||choose)&&<section className="robot-build-chooser"><h2>{pick('Choose an existing project','בחירת פרויקט קיים')}</h2>{requested&&!project&&<p role="alert">{pick('This project is unavailable or you do not have access. Choose an accessible project below.','הפרויקט אינו זמין או שאין לכם גישה. בחרו פרויקט זמין להלן.')}</p>}<p>{pick('Open existing work without copying parts or creating another project.','פתחו עבודה קיימת בלי להעתיק חלקים או ליצור פרויקט נוסף.')}</p><label>{pick('Find a build or project','חיפוש בנייה או פרויקט')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="robot-build-projects">{projects.filter(p=>p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p=><button key={p.id} onClick={()=>{setParams({project:p.id,view:'overview'});setChoose(false);}}><strong>{p.name}</strong><span>{['archived','completed'].includes(p.status)?pick('Closed · view records','סגור · הצגת רשומות'):buildIds.has(p.id)?pick('Existing build','בנייה קיימת'):pick('Project · open build workspace','פרויקט · פתיחת סביבת הבנייה')}</span></button>)}</div>{!projects.length&&<p>{pick('No accessible projects. Ask your team leader to assign a project.','אין פרויקטים זמינים. בקשו ממוביל/ת הצוות לשייך פרויקט.')}</p>}{!!projects.length&&!projects.some(p=>p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&<p>{pick('No projects match this search.','לא נמצאו פרויקטים התואמים לחיפוש.')}</p>}<Link to="/projects">{pick('Open project management','פתיחת ניהול פרויקטים')}</Link>{project&&<button onClick={()=>setChoose(false)}>{pick('Keep current build','הישארו בבנייה הנוכחית')}</button>}</section>}
  {project&&!choose&&<section key={project.id}>
   <nav className="robot-build-navigation" aria-label={pick('Build workspace','סביבת הבנייה')}>{(['overview','parts','work','assembly'] as const).map(v=><button key={v} aria-current={view===v?'page':undefined} onClick={()=>go(v)}>{pick(...labels[v])}</button>)}</nav>
   {readOnly&&<p role="status">{pick('Closed project: build changes are unavailable. Open project management to review its history.','פרויקט סגור: שינויי בנייה אינם זמינים. פתחו את ניהול הפרויקט לעיון בהיסטוריה.')}</p>}
   {view==='overview'&&<div className="robot-build-overview"><h2>{pick('Where do you want to work?','איפה תרצו לעבוד?')}</h2><div className="robot-build-destinations">{(['parts','work','assembly'] as const).map(v=><button key={v} onClick={()=>go(v)}><strong>{pick(...labels[v])}</strong><span>{v==='parts'?pick('Review requirements and sourcing','סקירת דרישות ומקורות'):v==='work'?pick('Instructions, progress and inspection','הוראות, התקדמות ובדיקה'):pick('Accepted batches, installation and verification','אצוות מאושרות, התקנה ואימות')}</span></button>)}</div><p>{pick('Manufacturing progress and physical verification are separate. Open the relevant work to review its evidence.','התקדמות הייצור ואימות פיזי הם נפרדים. פתחו את העבודה הרלוונטית לבדיקת הראיות.')}</p><Link to={`/projects?project=${project.id}`}>{pick('Project tasks & reviews','משימות וביקורות הפרויקט')}</Link></div>}
   {view==='details'&&<section className="robot-build-details"><h2>{pick('Build details','פרטי הבנייה')}</h2><BuildScopeDetails key={project.id} projectId={project.id} editable={canManage} onDirty={()=>{edited.current=true;}} onSaved={()=>{edited.current=false;}}/><dl><dt>{pick('Project','פרויקט')}</dt><dd>{project.name}</dd><dt>{pick('Team','צוות')}</dt><dd>{project.subteam??pick('Not specified','לא צוין')}</dd></dl><p>{pick('Register the physical robot only when applicable. A design can exist before the robot is built.','רשמו רובוט פיזי רק כאשר רלוונטי. תכנון יכול להתקיים לפני בניית הרובוט.')}</p>{canManage&&<ProjectConfigurations projectId={project.id}/>}<Link to={`/projects?project=${project.id}`}>{pick('Manage existing project and assignments','ניהול הפרויקט והשיבוצים הקיימים')}</Link><p><Link to="/engineering/cad">{pick('Open CAD sources','פתיחת מקורות CAD')}</Link></p></section>}
   {view==='work'&&canManage&&<BuildPrepareWork key={`prepare:${project.id}:${preparationEpoch}`} projectId={project.id} onDirty={()=>{edited.current=true;}} onChanged={loadTasks}/>}
   {view==='work'&&!readOnly&&tasksFor===project.id&&<BuildTaskQueue projectId={project.id} tasks={tasks} canManage={canManage} confirmDiscard={leave} onChanged={loadTasks}/>}
   {['parts','work','assembly'].includes(view)&&(taskLoading||(!taskError&&tasksFor!==project.id)?<p role="status">{pick('Loading work…','טוען עבודה…')}</p>:taskError?<div role="alert"><p>{taskError}</p><button onClick={()=>void loadTasks()}>{pick('Retry','ניסיון חוזר')}</button></div>:readOnly?<Link to={`/projects?project=${project.id}&archived=${project.status==='archived'?'1':'0'}`}>{pick('Open historical project records','פתיחת רשומות הפרויקט ההיסטוריות')}</Link>:<ProjectBuildWork focusedTask={params.get("task")} confirmDiscard={leave} key={`work:${project.id}`} projectId={project.id} tasks={tasks.filter(t=>!t.archived)} canManage={canManage} canStock={access.can('manage_inventory',project.subteam)} canBuy={access.can('submit_purchase_requests',project.subteam)} initiallyOpen workspaceView={view as 'parts'|'work'|'assembly'}/>)}
  </section>}
  </>}
 {(leavePending||blocker.state==='blocked')&&<BuildLeaveDialog resolve={resolveLeave}/>}
 </main>;
}
