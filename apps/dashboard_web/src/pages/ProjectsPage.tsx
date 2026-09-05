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
  const [name, setName] = useState("");
  const [subteam, setSubteam] = useState(selected || profile?.subteam?.toLowerCase() || "");
  const [due, setDue] = useState("");
  const [taskProject, setTaskProject] = useState<string|null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [archived, setArchived] = useState(false);
  const [message, setMessage] = useState("");
  const [assistantDraft,setAssistantDraft]=useState(false);

  async function load() {
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
    if (!error) { setName(""); setDue(""); await load(); }
  }
  async function createTask(event:FormEvent) {
    event.preventDefault(); if (!profile || !taskProject) return;
    const { error } = await supabase.from("project_tasks").insert({ project_id:taskProject, title:taskTitle.trim(), due_at:taskDue?new Date(`${taskDue}T18:00:00+03:00`).toISOString():null, status:"todo", assignee_id:profile.id, created_by:profile.id });
    setMessage(error?.message ?? pick("Task created.", "המשימה נוצרה."));
    if (!error) { sessionStorage.removeItem("g3-project-task-draft");setAssistantDraft(false);setTaskProject(null); setTaskTitle(""); setTaskDue(""); await load(); }
  }
  async function updateProject(project:Project, status:string) { if(project.owner_id!==profile?.id&&!access.can("manage_team_projects",project.subteam)){setMessage(pick("Only the project owner or an authorized team leader can change this status.","רק בעלי הפרויקט או מוביל/ת צוות מורשה יכולים לשנות את הסטטוס."));return;} const {error}=await supabase.from("team_projects").update({status,updated_at:new Date().toISOString()}).eq("id",project.id); setMessage(error?.message??pick("Project updated.","הפרויקט עודכן.")); if(!error)await load(); }
  async function updateTask(task:Task, status:string) { if(!isAdmin&&task.assignee_id!==profile?.id&&task.created_by!==profile?.id){setMessage(pick("Only the assignee, task creator or an administrator can update this task.","רק האחראי/ת, יוצר/ת המשימה או מנהל/ת יכולים לעדכן אותה."));return;} const {error}=await supabase.from("project_tasks").update({status,completed_at:status==="done"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",task.id); setMessage(error?.message??pick("Task updated.","המשימה עודכנה.")); if(!error)await load(); }
  async function archiveTask(task:Task) { if(!isAdmin)return; const {error}=await supabase.from("project_tasks").update({archived:true}).eq("id",task.id); setMessage(error?.message??pick("Task archived.","המשימה הועברה לארכיון.")); if(!error)await load(); }
  async function removeProject(project:Project) { if(!isAdmin||!confirm(pick(`Delete “${project.name}” and its tasks permanently?`,`למחוק לצמיתות את “${project.name}” ואת המשימות שלו?`)))return; const {error}=await supabase.from("team_projects").delete().eq("id",project.id); setMessage(error?.message??pick("Project deleted.","הפרויקט נמחק.")); if(!error)await load(); }
  async function removeTask(task:Task) { if(!isAdmin||!confirm(pick(`Delete “${task.title}” permanently?`,`למחוק לצמיתות את “${task.title}”?`)))return; const {error}=await supabase.from("project_tasks").delete().eq("id",task.id); setMessage(error?.message??pick("Task deleted.","המשימה נמחקה.")); if(!error)await load(); }

  const visible = projects.filter((project) => (archived ? project.status === "archived" : project.status !== "archived") && (!selected || (project.subteam??"").toLowerCase().includes(selected)));
  const selectedProject=params.get("project");
  const selectedTask=params.get("task");
  const workspaceCounts=useMemo(()=>Object.fromEntries(workstreams.map(item=>[item,projects.filter(project=>project.status!=="archived"&&teamMatches(project.subteam,item)).length])),[projects]);
  const workspaceName=(key:string)=>{const team=teamByKey(key)??frcTeams.find(item=>teamMatches(key,item));return team?pick(team.name,team.nameHe):key;};

  return <main className="hub-page projects-page">
    <header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Work / Projects", "עבודה / פרויקטים")}</div><h1>{selected ? pick(`${workspaceName(selected)} workspace`, `מרחב ${workspaceName(selected)}`) : pick("Project portfolio", "תיק הפרויקטים")}</h1><p>{selected?pick("Create and run projects inside this FRC workspace.","יצירה וניהול של פרויקטים בתוך מרחב FRC זה."):pick("A team-wide overview. Choose a workspace before creating new work.","סקירה כלל־קבוצתית. יש לבחור מרחב עבודה לפני יצירת עבודה חדשה.")}</p></div>{isAdmin?<button className="hub-button secondary" onClick={()=>setArchived(value=>!value)}>{archived?pick("Active projects","פרויקטים פעילים"):pick("Archive","ארכיון")}</button>:null}</header>
    <section className="workspace-picker" aria-label={pick("Choose a workspace","בחירת מרחב עבודה")}><button className={!selected?"is-active":""} onClick={()=>setParams({})}><span>ALL</span><strong>{pick("Portfolio","תיק פרויקטים")}</strong><small>{projects.filter(project=>project.status!=="archived").length} {pick("active","פעילים")}</small></button>{workstreams.map(item=><button className={selected===item?"is-active":""} key={item} onClick={()=>setParams({subteam:item})}><span>{item.slice(0,4).toUpperCase()}</span><strong>{workspaceName(item)}</strong><small>{workspaceCounts[item]} {pick("projects","פרויקטים")}</small></button>)}</section>
    {!archived&&selected&&access.can("manage_team_projects",selected)?<form className="hub-card operations-form project-create-form" onSubmit={createProject}><div className="project-form-heading"><small>{pick("New deliverable in","תוצר חדש בתוך")}</small><strong>{workspaceName(selected)}</strong></div><label><span>{pick("Project name","שם הפרויקט")}</span><input required value={name} onChange={event=>setName(event.target.value)}/></label><input type="hidden" value={subteam}/><label><span>{pick("Target date","תאריך יעד")}</span><input type="date" value={due} onChange={event=>setDue(event.target.value)}/></label><button className="hub-button">{pick("Create project","יצירת פרויקט")}</button></form>:null}
    {!archived&&!selected?<div className="workspace-guidance"><span>↖</span><div><strong>{pick("Projects start in a workspace","פרויקטים מתחילים במרחב עבודה")}</strong><p>{pick("Select Mechanical, Electrical, Software or another FRC workspace above to create a project.","בחרו מכניקה, אלקטרוניקה, תוכנה או מרחב FRC אחר למעלה כדי ליצור פרויקט.")}</p></div></div>:null}
    {assistantDraft?<div className="workspace-guidance assistant-task-draft"><span>✦</span><div><strong>{pick("G3 Assist task draft is ready","טיוטת משימה מ-G3 Assist מוכנה")}</strong><p>{pick("Choose the correct workspace and use Add task on the relevant project. The suggested title is already filled in.","בחרו את מרחב העבודה המתאים ולחצו על הוספת משימה בפרויקט הרלוונטי. הכותרת המוצעת כבר מולאה.")}</p></div><button onClick={()=>{sessionStorage.removeItem("g3-project-task-draft");setAssistantDraft(false);setTaskTitle("");}}>×</button></div>:null}
    {message?<div className="auth-message" role="status">{message}</div>:null}
    <div className="projects-grid">{visible.map(project=>{const projectTasks=tasks.filter(task=>task.project_id===project.id&&(archived?task.archived:!task.archived));const completed=projectTasks.filter(task=>task.status==="done").length;return <section id={`project-${project.id}`} className={`hub-card project-card${selectedProject===project.id?" is-focused":""}`} key={project.id}><div className="project-card-top"><select aria-label={pick("Project status","סטטוס הפרויקט")} value={project.status} disabled={project.status==="archived"} onChange={event=>void updateProject(project,event.target.value)}><option value="planning">{pick("Planned","מתוכנן")}</option><option value="active">{pick("In progress","בתהליך")}</option><option value="blocked">{pick("Blocked","חסום")}</option><option value="completed">{pick("Completed","הושלם")}</option><option value="archived">{pick("Archived","בארכיון")}</option></select><span>{workspaceName(project.subteam??"")}</span></div><h2>{project.name}</h2><div className="project-progress"><span style={{width:`${projectTasks.length?Math.round(completed/projectTasks.length*100):0}%`}}/><small>{completed}/{projectTasks.length} {pick("tasks complete","משימות הושלמו")}</small></div>{project.due_at?<p className="project-due">{pick("Target:","יעד:")} {new Date(`${project.due_at}T12:00:00`).toLocaleDateString()}</p>:null}<div className="task-list">{projectTasks.map(task=><article id={`task-${task.id}`} className={`task-row${task.status==="done"?" is-done":""}${selectedTask===task.id?" is-focused":""}`} key={task.id}><div><strong>{task.title}</strong>{task.due_at?<small>{new Date(task.due_at).toLocaleDateString()}</small>:null}</div><select value={task.status} onChange={event=>void updateTask(task,event.target.value)}><option value="todo">{pick("To do","לביצוע")}</option><option value="in_progress">{pick("In progress","בתהליך")}</option><option value="blocked">{pick("Blocked","חסום")}</option><option value="done">{pick("Completed","הושלם")}</option></select>{isAdmin?<div className="row-admin-actions">{!task.archived?<button onClick={()=>void archiveTask(task)}>{pick("Archive","ארכיון")}</button>:null}<button className="danger-link" onClick={()=>void removeTask(task)}>{pick("Delete","מחיקה")}</button></div>:null}</article>)}</div>{!archived&&(taskProject===project.id?<form className="task-create-form" onSubmit={createTask}><label><span>{pick("Task name","שם המשימה")}</span><input autoFocus required value={taskTitle} onChange={event=>setTaskTitle(event.target.value)}/></label><label><span>{pick("Due date","תאריך יעד")}</span><input type="date" value={taskDue} onChange={event=>setTaskDue(event.target.value)}/></label><div><button className="hub-button">{pick("Save task","שמירת משימה")}</button><button type="button" onClick={()=>setTaskProject(null)}>{pick("Cancel","ביטול")}</button></div></form>:<button className="announcement-link" onClick={()=>setTaskProject(project.id)}>+ {pick("Add task","הוספת משימה")}</button>)}{isAdmin?<div className="project-admin-actions">{project.status!=="archived"?<button onClick={()=>void updateProject(project,"archived")}>{pick("Archive project","העברה לארכיון")}</button>:null}<button className="danger-link" onClick={()=>void removeProject(project)}>{pick("Delete project","מחיקת פרויקט")}</button></div>:null}</section>})}</div>
  </main>;
}
