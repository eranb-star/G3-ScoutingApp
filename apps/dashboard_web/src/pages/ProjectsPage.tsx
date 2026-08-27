import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminStatus } from "../lib/useAdminStatus";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";

type Project = { id:string; name:string; status:string; due_at:string|null; subteam:string|null };
type Task = { id:string; project_id:string; title:string; status:string; due_at:string|null; archived?:boolean };

const workstreams = ["mechanical", "electrical", "software", "strategy", "business", "pit"];

export default function ProjectsPage() {
  const { pick } = useLocalization();
  const { profile } = useMemberAuth();
  const isAdmin = useAdminStatus();
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

  async function load() {
    const [projectResult, taskResult] = await Promise.all([
      supabase.from("team_projects").select("id,name,status,due_at,subteam").order("created_at", { ascending:false }),
      supabase.from("project_tasks").select("id,project_id,title,status,due_at,archived").order("created_at"),
    ]);
    if (projectResult.error || taskResult.error) setMessage(projectResult.error?.message ?? taskResult.error?.message ?? pick("Projects could not be loaded.", "לא ניתן לטעון את הפרויקטים."));
    setProjects((projectResult.data ?? []) as Project[]);
    setTasks((taskResult.data ?? []) as Task[]);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selected) setSubteam(selected); }, [selected]);

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
    if (!error) { setTaskProject(null); setTaskTitle(""); setTaskDue(""); await load(); }
  }
  async function updateProject(project:Project, status:string) { const {error}=await supabase.from("team_projects").update({status,updated_at:new Date().toISOString()}).eq("id",project.id); setMessage(error?.message??pick("Project updated.","הפרויקט עודכן.")); if(!error)await load(); }
  async function updateTask(task:Task, status:string) { const {error}=await supabase.from("project_tasks").update({status,completed_at:status==="done"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",task.id); setMessage(error?.message??pick("Task updated.","המשימה עודכנה.")); if(!error)await load(); }
  async function archiveTask(task:Task) { if(!isAdmin)return; const {error}=await supabase.from("project_tasks").update({archived:true}).eq("id",task.id); setMessage(error?.message??pick("Task archived.","המשימה הועברה לארכיון.")); if(!error)await load(); }
  async function removeProject(project:Project) { if(!isAdmin||!confirm(pick(`Delete “${project.name}” and its tasks permanently?`,`למחוק לצמיתות את “${project.name}” ואת המשימות שלו?`)))return; const {error}=await supabase.from("team_projects").delete().eq("id",project.id); setMessage(error?.message??pick("Project deleted.","הפרויקט נמחק.")); if(!error)await load(); }
  async function removeTask(task:Task) { if(!isAdmin||!confirm(pick(`Delete “${task.title}” permanently?`,`למחוק לצמיתות את “${task.title}”?`)))return; const {error}=await supabase.from("project_tasks").delete().eq("id",task.id); setMessage(error?.message??pick("Task deleted.","המשימה נמחקה.")); if(!error)await load(); }

  const visible = projects.filter((project) => (archived ? project.status === "archived" : project.status !== "archived") && (!selected || (project.subteam??"").toLowerCase().includes(selected)));

  return <main className="hub-page projects-page">
    <header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Work / Projects", "עבודה / פרויקטים")}</div><h1>{selected ? pick(`${selected} workspace`, `תחום ${selected}`) : pick("All projects", "כל הפרויקטים")}</h1><p>{pick("Projects and tasks stay inside their FRC workstream.", "פרויקטים ומשימות נשארים בתוך תחום העבודה שלהם ב-FRC.")}</p></div>{isAdmin?<button className="hub-button secondary" onClick={()=>setArchived(value=>!value)}>{archived?pick("Active projects","פרויקטים פעילים"):pick("Archive","ארכיון")}</button>:null}</header>
    <nav className="project-filter-rail" aria-label={pick("Workstream", "תחום עבודה")}><button className={!selected?"is-active":""} onClick={()=>setParams({})}>{pick("All", "הכול")}</button>{workstreams.map(item=><button className={selected===item?"is-active":""} key={item} onClick={()=>setParams({subteam:item})}>{item}</button>)}</nav>
    {!archived?<form className="hub-card operations-form project-create-form" onSubmit={createProject}><label><span>{pick("Project name","שם הפרויקט")}</span><input required value={name} onChange={event=>setName(event.target.value)}/></label><label><span>{pick("Workstream","תחום עבודה")}</span><select required value={subteam} onChange={event=>setSubteam(event.target.value)}><option value="">{pick("Choose", "בחירה")}</option>{workstreams.map(item=><option key={item}>{item}</option>)}</select></label><label><span>{pick("Target date","תאריך יעד")}</span><input type="date" value={due} onChange={event=>setDue(event.target.value)}/></label><button className="hub-button">{pick("Create project","יצירת פרויקט")}</button></form>:null}
    {message?<div className="auth-message" role="status">{message}</div>:null}
    <div className="projects-grid">{visible.map(project=><section className="hub-card project-card" key={project.id}><div className="project-card-top"><select aria-label={pick("Project status","סטטוס הפרויקט")} value={project.status} disabled={project.status==="archived"} onChange={event=>void updateProject(project,event.target.value)}><option value="planning">{pick("Planned","מתוכנן")}</option><option value="active">{pick("In progress","בתהליך")}</option><option value="blocked">{pick("Blocked","חסום")}</option><option value="completed">{pick("Completed","הושלם")}</option><option value="archived">{pick("Archived","בארכיון")}</option></select><span>{project.subteam}</span></div><h2>{project.name}</h2>{project.due_at?<p className="project-due">{pick("Target:","יעד:")} {new Date(`${project.due_at}T12:00:00`).toLocaleDateString()}</p>:null}<div className="task-list">{tasks.filter(task=>task.project_id===project.id&&(archived?task.archived:!task.archived)).map(task=><article className={`task-row${task.status==="done"?" is-done":""}`} key={task.id}><div><strong>{task.title}</strong>{task.due_at?<small>{new Date(task.due_at).toLocaleDateString()}</small>:null}</div><select value={task.status} onChange={event=>void updateTask(task,event.target.value)}><option value="todo">{pick("To do","לביצוע")}</option><option value="in_progress">{pick("In progress","בתהליך")}</option><option value="blocked">{pick("Blocked","חסום")}</option><option value="done">{pick("Completed","הושלם")}</option></select>{isAdmin?<div className="row-admin-actions">{!task.archived?<button onClick={()=>void archiveTask(task)}>{pick("Archive","ארכיון")}</button>:null}<button className="danger-link" onClick={()=>void removeTask(task)}>{pick("Delete","מחיקה")}</button></div>:null}</article>)}</div>{!archived&&(taskProject===project.id?<form className="task-create-form" onSubmit={createTask}><label><span>{pick("Task name","שם המשימה")}</span><input autoFocus required value={taskTitle} onChange={event=>setTaskTitle(event.target.value)}/></label><label><span>{pick("Due date","תאריך יעד")}</span><input type="date" value={taskDue} onChange={event=>setTaskDue(event.target.value)}/></label><div><button className="hub-button">{pick("Save task","שמירת משימה")}</button><button type="button" onClick={()=>setTaskProject(null)}>{pick("Cancel","ביטול")}</button></div></form>:<button className="announcement-link" onClick={()=>setTaskProject(project.id)}>+ {pick("Add task","הוספת משימה")}</button>)}{isAdmin?<div className="project-admin-actions">{project.status!=="archived"?<button onClick={()=>void updateProject(project,"archived")}>{pick("Archive project","העברה לארכיון")}</button>:null}<button className="danger-link" onClick={()=>void removeProject(project)}>{pick("Delete project","מחיקת פרויקט")}</button></div>:null}</section>)}</div>
  </main>;
}
