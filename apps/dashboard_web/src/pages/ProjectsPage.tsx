import {EngineeringRecords} from '../components/EngineeringRecords';
import {projectInView,taskInView} from '../lib/projectArchive';
import ProjectChangeImpact from '../components/ProjectChangeImpact';
import ProjectTaskReview,{type ReviewGate} from "../components/ProjectTaskReview";
import {useProjectRefresh,notifyProjectChange} from "../lib/projectRefresh";
import TaskDependencies, {type TaskDependency} from "../components/TaskDependencies";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminStatus } from "../lib/useAdminStatus";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";
import { frcTeams, teamByKey, teamMatches } from "../lib/frcTeams";
import { useAccessControl } from "../lib/accessControl";

type Project = { id:string; name:string; status:string; due_at:string|null; subteam:string|null; owner_id:string|null };
type Task = { id:string; project_id:string; title:string; status:string; due_at:string|null; archived?:boolean; assignee_id:string|null; created_by:string|null };

const workstreams = frcTeams.map(team=>team.key);

export default function ProjectsPage() {
  const { pick } = useLocalization();
  const { profile } = useMemberAuth();
  const isAdmin = useAdminStatus();
  const access=useAccessControl();
  const [params, setParams] = useSearchParams();
  const selected = params.get("subteam") ?? "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deleteOffer,setDeleteOffer]=useState<string|null>(null);
  const [deletingTask,setDeletingTask]=useState(false);
  const [name, setName] = useState("");
  const [subteam, setSubteam] = useState(selected || profile?.subteam?.toLowerCase() || "");
  const [due, setDue] = useState("");
  const [taskProject, setTaskProject] = useState<string|null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskOwner,setTaskOwner]=useState("");
  const [people,setPeople]=useState<{id:string;display_name:string}[]>([]);
  const [ownerDrafts,setOwnerDrafts]=useState<Record<string,string>>({});
  const [archived, setArchived] = useState(false);
  const [message, setMessage] = useState("");
  const [taskDrafts,setTaskDrafts]=useState<Record<string,string>>({});
  const [savingTask,setSavingTask]=useState<string|null>(null);
  const [reviews,setReviews]=useState<ReviewGate[]>([]),[reviewsError,setReviewsError]=useState(false);
  const [dependencies,setDependencies]=useState<TaskDependency[]>([]);
  const [dependenciesLoaded,setDependenciesLoaded]=useState(false);
 useProjectRefresh(()=>load());
  async function loadDependencies(){try{const r=await supabase.rpc("task_dependency_context",{p_home:false});setDependenciesLoaded(!r.error);setDependencies(r.error?[]:r.data??[]);}catch{setDependenciesLoaded(false);}}
  const [assistantDraft,setAssistantDraft]=useState(false);

  async function load() {
    void loadDependencies();
    void supabase.from("team_members").select("id,display_name").eq("active",true).order("display_name").then(({data})=>setPeople(data??[]));
    const reviewResult=await supabase.rpc("project_review_context",{p_all:true});setReviewsError(!!reviewResult.error);if(!reviewResult.error)setReviews(reviewResult.data??[]);
    const [projectResult, taskResult] = await Promise.all([
      supabase.from("team_projects").select("id,name,status,due_at,subteam,owner_id").order("created_at", { ascending:false }),
      supabase.from("project_tasks").select("id,project_id,title,status,due_at,archived,assignee_id,created_by").order("created_at"),
    ]);
    if (projectResult.error || taskResult.error) setMessage(projectResult.error?.message ?? taskResult.error?.message ?? pick("Projects could not be loaded.", "לא ניתן לטעון את הפרויקטים."));
    setProjects((projectResult.data ?? []) as Project[]);
    setTasks((taskResult.data ?? []) as Task[]);
  }
  useEffect(() => { void load(); }, []);
  useEffect(()=>{const draft=sessionStorage.getItem("g3-project-task-draft");if(params.get("assistantDraft")==="1"&&draft){setTaskTitle(draft);setAssistantDraft(true);}},[]);
  useEffect(() => { if (selected) setSubteam(selected); }, [selected]);
  useEffect(() => {
    const projectId=params.get("project");
    if (!projectId || projects.length===0) return;
    const taskId=params.get("task");
    window.setTimeout(()=>document.getElementById(taskId?`task-${taskId}`:`project-${projectId}`)?.scrollIntoView({behavior:"smooth",block:"center"}),80);
  },[projects.length,params]);

  async function createProject(event:FormEvent) {
    event.preventDefault(); if (!profile) return;
    const { error } = await supabase.from("team_projects").insert({ name:name.trim(), subteam, due_at:due||null, status:"planning", owner_id:profile.id, created_by:profile.id });
    setMessage(error?.message ?? pick("Project created.", "הפרויקט נוצר."));
    if (!error) { setName(""); setDue(""); await load();notifyProjectChange(); }
  }
  async function createTask(event:FormEvent) {
    event.preventDefault(); if (!profile || !taskProject || !taskOwner) return;
    const { error } = await supabase.from("project_tasks").insert({ project_id:taskProject, title:taskTitle.trim(), due_at:taskDue?new Date(`${taskDue}T18:00:00+03:00`).toISOString():null, status:"todo", assignee_id:taskOwner, created_by:profile.id });
    setMessage(error?.message ?? pick("Task created.", "המשימה נוצרה."));
    if (!error) { sessionStorage.removeItem("g3-project-task-draft");setAssistantDraft(false);setTaskProject(null); setTaskTitle(""); setTaskDue(""); await load();notifyProjectChange(); }
  }
  async function updateProject(project:Project, status:string) { if(project.owner_id!==profile?.id&&!access.can("manage_team_projects",project.subteam)){setMessage(pick("Only the project owner or an authorized team leader can change this status.","רק בעלי הפרויקט או מוביל/ת צוות מורשה יכולים לשנות את הסטטוס."));return;} const {error}=await supabase.from("team_projects").update({status,updated_at:new Date().toISOString()}).eq("id",project.id).select("id").single(); setMessage(error?.message??pick("Project updated.","הפרויקט עודכן.")); if(!error){await load();notifyProjectChange();} }
  async function saveOwner(task:Task){const owner=ownerDrafts[task.id];if(!owner)return;const {error}=await supabase.rpc("assign_project_task_owner",{p_task:task.id,p_owner:owner});setMessage(error?.message??pick("Task owner updated.","אחראי המשימה עודכן."));if(!error){setOwnerDrafts(d=>{const n={...d};delete n[task.id];return n;});await load();notifyProjectChange();}}
  async function updateTask(task:Task, status:string) {
    if(savingTask)return;
    if(!isAdmin&&task.assignee_id!==profile?.id&&task.created_by!==profile?.id){setMessage(pick("Only the assignee, task creator or an administrator can update this task.","רק האחראי/ת, יוצר/ת המשימה או מנהל/ת יכולים לעדכן אותה."));return;}
    setSavingTask(task.id);
    try{const {error}=await supabase.from("project_tasks").update({status,completed_at:status==="done"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",task.id).select("id").single();if(error)throw error;
    setTaskDrafts(d=>{const next={...d};delete next[task.id];return next;});setMessage(pick("Task saved.","המשימה נשמרה."));await load();notifyProjectChange();
    }catch(error){setMessage((error as {message?:string})?.message??pick("Task could not be saved. Your selection is kept; try again.","לא ניתן לשמור את המשימה. הבחירה נשמרה בטופס; נסו שוב."));}finally{setSavingTask(null);}
  }
  async function archiveTask(task:Task, restore=false) { if(!isAdmin)return; const {error}=await supabase.from("project_tasks").update({archived:!restore}).eq("id",task.id).select("id").single(); setMessage(error?.message??(restore?pick("Task restored.","המשימה שוחזרה."):pick("Task archived.","המשימה הועברה לארכיון."))); if(!error){await load();notifyProjectChange();} }
  async function removeProject(project:Project) {
    if(!isAdmin||!confirm(pick(`Delete “${project.name}” and its tasks permanently?`,`למחוק לצמיתות את “${project.name}” ואת המשימות שלו?`)))return;
    const {error}=await supabase.from("team_projects").delete().eq("id",project.id).select("id").single();
    if(error?.code==="23503"){
      const explanation=pick("This project has review records, configurations or linked work. Archive it to remove it from active work and preserve its history.","לפרויקט יש רשומות ביקורת, תצורות או עבודה מקושרת. ניתן להעביר אותו לארכיון כדי להסירו מהעבודה הפעילה ולשמור את ההיסטוריה.");
      setMessage(explanation);
      if(project.status!=="archived"&&confirm(explanation+pick(" Archive this project now?"," להעביר את הפרויקט לארכיון כעת?")))await updateProject(project,"archived");
      return;
    }
    setMessage(error?.message??pick("Project deleted.","הפרויקט נמחק."));if(!error){await load();notifyProjectChange();}
  }
  async function removeTask(task:Task) {
    if(!isAdmin||deletingTask)return;
    setDeletingTask(true);
    try {
      const {error}=await supabase.rpc("admin_delete_project_task",{p_task:task.id});
      if(error){setMessage(error.message);return;}
      setDeleteOffer(null);
      setMessage(pick("Task permanently deleted.","המשימה נמחקה לצמיתות."));
      notifyProjectChange();await load();
    } catch {setMessage(pick("Deletion failed. Please try again.","המחיקה נכשלה. יש לנסות שוב."));}
    finally {setDeletingTask(false);}
  }

  const visible = projects.filter((project) => projectInView(project,tasks,archived) && (!selected || (project.subteam??"").toLowerCase().includes(selected)));
  const selectedProject=params.get("project");
  const selectedTask=params.get("task");
  const workspaceCounts=useMemo(()=>Object.fromEntries(workstreams.map(item=>[item,projects.filter(project=>project.status!=="archived"&&teamMatches(project.subteam,item)).length])),[projects]);
  const workspaceName=(key:string)=>{const team=teamByKey(key)??frcTeams.find(item=>teamMatches(key,item));return team?pick(team.name,team.nameHe):key;};

  return <main className="hub-page projects-page"><ProjectChangeImpact/>
    <header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Work / Projects", "עבודה / פרויקטים")}</div><h1>{selected ? pick(`${workspaceName(selected)} workspace`, `מרחב ${workspaceName(selected)}`) : pick("Project portfolio", "תיק הפרויקטים")}</h1><p>{selected?pick("Create and run projects inside this FRC workspace.","יצירה וניהול של פרויקטים בתוך מרחב FRC זה."):pick("A team-wide overview. Choose a workspace before creating new work.","סקירה כלל־קבוצתית. יש לבחור מרחב עבודה לפני יצירת עבודה חדשה.")}</p></div>{isAdmin?<button className="hub-button secondary" onClick={()=>setArchived(value=>!value)}>{archived?pick("Active projects","פרויקטים פעילים"):pick("Archive","ארכיון")}</button>:null}</header>
    <section className="workspace-picker" aria-label={pick("Choose a workspace","בחירת מרחב עבודה")}><button className={!selected?"is-active":""} onClick={()=>setParams({})}><span>ALL</span><strong>{pick("Portfolio","תיק פרויקטים")}</strong><small>{projects.filter(project=>project.status!=="archived").length} {pick("active","פעילים")}</small></button>{workstreams.map(item=><button className={selected===item?"is-active":""} key={item} onClick={()=>setParams({subteam:item})}><span>{item.slice(0,4).toUpperCase()}</span><strong>{workspaceName(item)}</strong><small>{workspaceCounts[item]} {pick("projects","פרויקטים")}</small></button>)}</section>
    {!archived&&selected&&access.can("manage_team_projects",selected)?<form className="hub-card operations-form project-create-form" onSubmit={createProject}><div className="project-form-heading"><small>{pick("New deliverable in","תוצר חדש בתוך")}</small><strong>{workspaceName(selected)}</strong></div><label><span>{pick("Project name","שם הפרויקט")}</span><input required value={name} onChange={event=>setName(event.target.value)}/></label><input type="hidden" value={subteam}/><label><span>{pick("Target date","תאריך יעד")}</span><input type="date" value={due} onChange={event=>setDue(event.target.value)}/></label><button className="hub-button">{pick("Create project","יצירת פרויקט")}</button></form>:null}
    {!archived&&selected&&!access.can("manage_team_projects",selected)?<p className="workspace-guidance">{pick("You can view this workspace. Creating projects requires project-management permission for this team.","ניתן לצפות במרחב זה. יצירת פרויקטים דורשת הרשאת ניהול פרויקטים לצוות זה.")}</p>:null}
    {!archived&&!selected?<div className="workspace-guidance"><span>↖</span><div><strong>{pick("Projects start in a workspace","פרויקטים מתחילים במרחב עבודה")}</strong><p>{pick("Select Mechanical, Electrical, Software or another FRC workspace above to create a project.","בחרו מכניקה, אלקטרוניקה, תוכנה או מרחב FRC אחר למעלה כדי ליצור פרויקט.")}</p></div></div>:null}
    {assistantDraft?<div className="workspace-guidance assistant-task-draft"><span>✦</span><div><strong>{pick("G3 Assist task draft is ready","טיוטת משימה מ-G3 Assist מוכנה")}</strong><p>{pick("Choose the correct workspace and use Add task on the relevant project. The suggested title is already filled in.","בחרו את מרחב העבודה המתאים ולחצו על הוספת משימה בפרויקט הרלוונטי. הכותרת המוצעת כבר מולאה.")}</p></div><button onClick={()=>{sessionStorage.removeItem("g3-project-task-draft");setAssistantDraft(false);setTaskTitle("");}}>×</button></div>:null}
    {message?<div className="auth-message" role="status">{message}</div>:null}
    {reviewsError?<p role="status">{pick("Review checkpoints could not be loaded. Refresh after setup.","לא ניתן לטעון נקודות ביקורת. רעננו לאחר ההגדרה.")}</p>:null}
    <div className="projects-grid">{visible.map(project=>{const projectTasks=tasks.filter(task=>task.project_id===project.id&&taskInView(project,task,archived));const completed=projectTasks.filter(task=>task.status==="done").length;return <section id={`project-${project.id}`} className={`hub-card project-card${selectedProject===project.id?" is-focused":""}`} key={project.id}><div className="project-card-top"><select aria-label={pick("Project status","סטטוס הפרויקט")} value={project.status} disabled={project.status==="archived"} onChange={event=>void updateProject(project,event.target.value)}><option value="planning">{pick("Planned","מתוכנן")}</option><option value="active">{pick("In progress","בתהליך")}</option><option value="blocked">{pick("Blocked","חסום")}</option><option value="completed">{pick("Completed","הושלם")}</option><option value="archived">{pick("Archived","בארכיון")}</option></select><span>{workspaceName(project.subteam??"")}</span></div><h2>{project.name}</h2><EngineeringRecords tasks={projectTasks} projectId={project.id} canManage={access.can("assign_team_work",project.subteam)} people={people}/><div className="project-progress"><span style={{width:`${projectTasks.length?Math.round(completed/projectTasks.length*100):0}%`}}/><small>{completed}/{projectTasks.length} {pick("tasks complete","משימות הושלמו")}</small></div>{project.due_at?<p className="project-due">{pick("Target:","יעד:")} {new Date(`${project.due_at}T12:00:00`).toLocaleDateString()}</p>:null}<div className="task-list">{projectTasks.map(task=><article id={`task-${task.id}`} className={`task-row${task.status==="done"?" is-done":""}${selectedTask===task.id?" is-focused":""}`} key={task.id}><div><strong>{task.title}</strong>{task.due_at?<small>{new Date(task.due_at).toLocaleDateString()}</small>:null}</div><div className="task-status-editor"><select aria-label={pick("Task status","סטטוס משימה")} disabled={savingTask!==null||task.archived||project.status==="archived"} value={taskDrafts[task.id]??task.status} onChange={event=>setTaskDrafts(d=>({...d,[task.id]:event.target.value}))}><option value="todo">{pick("To do","לביצוע")}</option><option value="in_progress">{pick("In progress","בתהליך")}</option><option value="blocked">{pick("Blocked","חסום")}</option><option value="done" disabled={reviews.some(g=>g.task_id===task.id)&&task.status!=="done"}>{reviews.some(g=>g.task_id===task.id)?pick("Completed by mentor approval","הושלם באישור מנטור"):pick("Completed","הושלם")}</option></select><button type="button" disabled={savingTask!==null||!taskDrafts[task.id]||taskDrafts[task.id]===task.status} onClick={()=>void updateTask(task,taskDrafts[task.id])}>{savingTask===task.id?pick("Saving…","שומר…"):pick("Save","שמירה")}</button>{taskDrafts[task.id]&&taskDrafts[task.id]!==task.status?<small>{pick("Unsaved change","שינוי שלא נשמר")}</small>:null}</div>{isAdmin?<div className="row-admin-actions">{!task.archived?<button onClick={()=>void archiveTask(task)}>{pick("Archive","ארכיון")}</button>:project.status!=="archived"?<button onClick={()=>void archiveTask(task,true)}>{pick("Restore task","שחזור משימה")}</button>:null}<button className="danger-link" onClick={()=>setDeleteOffer(task.id)}>{pick("Delete","מחיקה")}</button></div>:null}{deleteOffer===task.id?<section className="task-archive-offer" role="alert" aria-label={pick("Confirm permanent deletion","אישור מחיקה לצמיתות")}><strong>{pick(`Permanently delete “${task.title}”?`,`למחוק לצמיתות את “${task.title}”?`)}</strong><p>{pick("This permanently deletes the task, its review history, evidence records, assignments and dependency links. Other tasks and externally linked files are not deleted. This cannot be undone.","המשימה, היסטוריית הביקורת, רשומות הראיות, ההקצאות וקישורי התלות יימחקו לצמיתות. משימות אחרות וקבצים חיצוניים לא יימחקו. לא ניתן לבטל פעולה זו.")}</p><div className="review-buttons"><button className="hub-button" disabled={deletingTask} onClick={()=>void removeTask(task)}>{deletingTask?pick("Deleting…","מוחק…"):pick("Delete permanently","מחיקה לצמיתות")}</button><button className="hub-button secondary" disabled={deletingTask} onClick={()=>setDeleteOffer(null)}>{pick("Cancel","ביטול")}</button></div></section>:null}<div className="task-owner-editor"><span>{pick("Task owner","אחראי/ת המשימה")}: {people.find(p=>p.id===task.assignee_id)?.display_name??pick("Unassigned","לא הוקצה")}</span>{access.can("assign_team_work",project.subteam)?<details><summary>{pick("Change task owner","שינוי אחראי/ת")}</summary><label>{pick("Person doing the work","מי מבצע/ת את העבודה")}<select value={ownerDrafts[task.id]??task.assignee_id??""} onChange={e=>setOwnerDrafts(d=>({...d,[task.id]:e.target.value}))}><option value="">{pick("Choose owner","בחירת אחראי/ת")}</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><button className="hub-button" disabled={!ownerDrafts[task.id]||ownerDrafts[task.id]===task.assignee_id} onClick={()=>void saveOwner(task)}>{pick("Save owner","שמירת אחראי/ת")}</button></details>:null}</div><ProjectTaskReview task={task} gate={reviews.find(g=>g.task_id===task.id)} canManage={!reviewsError&&access.can("assign_team_work",project.subteam)} autoOpen={params.get("review")==="1"&&params.get("task")===task.id} onChanged={load}/><TaskDependencies taskId={task.id} edges={dependencies} candidates={tasks} projects={projects} canManage={access.can("assign_team_work",project.subteam)} loaded={dependenciesLoaded} onChanged={loadDependencies}/></article>)}</div>{!archived&&(taskProject===project.id?<form className="task-create-form" onSubmit={createTask}><label><span>{pick("Task name","שם המשימה")}</span><input autoFocus required value={taskTitle} onChange={event=>setTaskTitle(event.target.value)}/></label><label><span>{pick("Task owner — person doing the work","אחראי/ת המשימה — מי שמבצע/ת")}</span><select required value={taskOwner} onChange={e=>setTaskOwner(e.target.value)}><option value="">{pick("Choose owner","בחירת אחראי/ת")}</option>{people.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label><label><span>{pick("Due date","תאריך יעד")}</span><input type="date" value={taskDue} onChange={event=>setTaskDue(event.target.value)}/></label><div><button className="hub-button">{pick("Save task","שמירת משימה")}</button><button type="button" onClick={()=>setTaskProject(null)}>{pick("Cancel","ביטול")}</button></div></form>:<button className="announcement-link" onClick={()=>setTaskProject(project.id)}>+ {pick("Add task","הוספת משימה")}</button>)}{isAdmin?<div className="project-admin-actions">{project.status!=="archived"?<button onClick={()=>void updateProject(project,"archived")}>{pick("Archive project","העברה לארכיון")}</button>:<button onClick={()=>void updateProject(project,"planning")}>{pick("Restore project","שחזור פרויקט")}</button>}<button className="danger-link" onClick={()=>void removeProject(project)}>{pick("Delete project","מחיקת פרויקט")}</button></div>:null}</section>})}</div>
  </main>;
}
