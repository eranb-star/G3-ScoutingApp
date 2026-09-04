import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { useAdminStatus } from "../lib/useAdminStatus";
import { supabase } from "../supabase";
import HomeActionInbox from "../components/HomeActionInbox";

type Project={id:string;name:string;status:string;subteam:string|null;due_at:string|null};
type Task={id:string;project_id:string;title:string;status:string;due_at:string|null;assignee_id:string|null};
type Course={id:string;title:string};
type Module={id:string;course_id:string};
type Enrollment={id:string;course_id:string;status:string;due_at:string|null};
type Evidence={enrollment_id:string;module_id:string;status:string};
type Issue={id:string;severity:string;status:string};
type Component={id:string;name:string;status:string;service_interval_days:number|null;last_serviced_at:string|null};

const frcAreas=[
  {key:"mechanical",en:"Mechanical",he:"מכניקה",mark:"MECH"},{key:"electrical",en:"Electrical",he:"אלקטרוניקה",mark:"ELEC"},
  {key:"software",en:"Software",he:"תוכנה",mark:"CODE"},{key:"strategy",en:"Strategy & scouting",he:"אסטרטגיה וסקאוטינג",mark:"DATA"},
  {key:"business",en:"Business & outreach",he:"קהילה ועסקים",mark:"TEAM"},{key:"pit",en:"Drive & pit",he:"נהיגה ופיט",mark:"PIT"},
] as const;
const operationalAreas=[
  {key:"purchasing",en:"Parts & purchasing",he:"חלקים ורכש",detailEn:"Requests, orders and missing parts",detailHe:"בקשות, הזמנות וחלקים חסרים"},
  {key:"decisions",en:"Decision log",he:"יומן החלטות",detailEn:"Technical decisions and rationale",detailHe:"החלטות טכניות והסיבות להן"},
  {key:"packing",en:"Pit & packing",he:"פיט ואריזה",detailEn:"Competition packing and readiness",detailHe:"אריזה לתחרות ומוכנות"},
  {key:"assignments",en:"Assignments",he:"שיבוצים",detailEn:"Event and workshop roles",detailHe:"תפקידי אירוע וסדנה"},
] as const;
function areaMatches(subteam:string|null|undefined,key:string){const value=(subteam??"").toLowerCase();return value.includes(key)||(key==="electrical"&&value.includes("electronic"));}

export default function FrcWorkPage(){
  const {pick}=useLocalization(),{profile}=useMemberAuth(),isAdmin=useAdminStatus(),navigate=useNavigate(),[params,setParams]=useSearchParams();
  const [projects,setProjects]=useState<Project[]>([]),[tasks,setTasks]=useState<Task[]>([]),[courses,setCourses]=useState<Course[]>([]),[modules,setModules]=useState<Module[]>([]),[enrollments,setEnrollments]=useState<Enrollment[]>([]),[evidence,setEvidence]=useState<Evidence[]>([]),[issues,setIssues]=useState<Issue[]>([]),[components,setComponents]=useState<Component[]>([]);
  const [showWorkspaces,setShowWorkspaces]=useState(false),[showOperations,setShowOperations]=useState(false);
  useEffect(()=>{if(!profile)return;Promise.all([
    supabase.from("team_projects").select("id,name,status,subteam,due_at").neq("status","archived").order("updated_at",{ascending:false}).limit(100),
    supabase.from("project_tasks").select("id,project_id,title,status,due_at,assignee_id").eq("archived",false).order("due_at",{ascending:true,nullsFirst:false}).limit(250),
    supabase.from("training_courses").select("id,title").eq("active",true).order("created_at"),supabase.from("training_modules").select("id,course_id").order("sort_order"),
    supabase.from("training_enrollments").select("id,course_id,status,due_at").eq("member_id",profile.id),supabase.from("training_evidence").select("enrollment_id,module_id,status").eq("member_id",profile.id),
    supabase.from("robot_issues").select("id,severity,status").eq("archived",false).neq("status","resolved"),supabase.from("robot_components").select("id,name,status,service_interval_days,last_serviced_at").neq("status","retired"),
  ]).then(([p,t,c,m,n,e,i,r])=>{setProjects((p.data??[]) as Project[]);setTasks((t.data??[]) as Task[]);setCourses((c.data??[]) as Course[]);setModules((m.data??[]) as Module[]);setEnrollments((n.data??[]) as Enrollment[]);setEvidence((e.data??[]) as Evidence[]);setIssues((i.data??[]) as Issue[]);setComponents((r.data??[]) as Component[]);});},[profile?.id]);

  const myArea=frcAreas.find(area=>areaMatches(profile?.subteam,area.key));
  const myProjects=useMemo(()=>myArea?projects.filter(project=>areaMatches(project.subteam,myArea.key)):[],[projects,myArea]);
  const myProjectIds=useMemo(()=>new Set(myProjects.map(project=>project.id)),[myProjects]);
  const myWorkspaceTasks=tasks.filter(task=>myProjectIds.has(task.project_id)&&task.status!=="done");
  const assignedCourseIds=new Set(enrollments.map(item=>item.course_id)),assignedModules=modules.filter(item=>assignedCourseIds.has(item.course_id));
  const approvedModules=new Set(evidence.filter(item=>item.status==="approved").map(item=>item.module_id));
  const nextCourse=enrollments.map(item=>({enrollment:item,course:courses.find(course=>course.id===item.course_id)})).filter(item=>item.course&&item.enrollment.status!=="qualified").sort((a,b)=>(a.enrollment.due_at?new Date(a.enrollment.due_at).getTime():Number.MAX_SAFE_INTEGER)-(b.enrollment.due_at?new Date(b.enrollment.due_at).getTime():Number.MAX_SAFE_INTEGER))[0]?.course;
  const skillPercent=assignedModules.length?Math.round(assignedModules.filter(item=>approvedModules.has(item.id)).length/assignedModules.length*100):0,underway=enrollments.filter(item=>item.status!=="qualified");
  const criticalIssues=issues.filter(issue=>["critical","high"].includes(issue.severity)).length;
  const serviceAlerts=components.filter(component=>component.status==="failed"||(component.status==="installed"&&component.service_interval_days&&component.last_serviced_at&&Date.now()-new Date(component.last_serviced_at).getTime()>component.service_interval_days*864e5)).length;
  const workspaceBlockers=myWorkspaceTasks.filter(task=>task.status==="blocked").length+myProjects.filter(project=>project.status==="blocked").length;
  const activeProjectIds=new Set(projects.map(project=>project.id));
  const blockedProjects=projects.filter(project=>project.status==="blocked");
  const blockedTasks=tasks.filter(task=>task.status==="blocked"&&activeProjectIds.has(task.project_id));
  const showBlockers=params.get("focus")==="blockers";

  return <main className="hub-page work-page work-command-center">
    <header className="work-command-header work-command-header-compact"><div><div className="hub-eyebrow">G3 6740 · {pick("Build operations","תפעול הבנייה")}</div><h1>{pick("Work","עבודה")}</h1><p>{pick("Your next action, your team and the systems that keep the robot moving.","הפעולה הבאה, הצוות שלכם והמערכות שמקדמות את הרובוט.")}</p></div>{myArea?<button className="hub-button" onClick={()=>navigate(`/projects?subteam=${myArea.key}`)}>{pick("Open my workspace","פתיחת המרחב שלי")} →</button>:null}</header>

    <HomeActionInbox mode="work" />

    {showBlockers?<section className="work-blocker-desk" aria-labelledby="blocker-desk-title"><header><div><div className="hub-eyebrow">{pick("Mentor & team-lead focus","מיקוד למנטורים ומובילי צוות")}</div><h2 id="blocker-desk-title">{pick("Team blocker desk","שולחן חסמי הקבוצה")}</h2><p>{pick("Projects and tasks that cannot move forward. Open the exact record to resolve ownership, decisions or dependencies.","פרויקטים ומשימות שאינם יכולים להתקדם. פתחו את הרשומה המדויקת כדי לפתור אחריות, החלטות או תלויות.")}</p></div><button type="button" onClick={()=>setParams({})} aria-label={pick("Close blocker desk","סגירת שולחן החסמים")}>×</button></header>{blockedProjects.length||blockedTasks.length?<div>{blockedProjects.map(project=><button key={`project-${project.id}`} onClick={()=>navigate(`/projects?subteam=${(project.subteam??"").toLowerCase()}&project=${project.id}`)}><span>PROJECT</span><strong>{project.name}</strong><small>{project.subteam??pick("Cross-team","חוצה־צוותים")} · {pick("Blocked project","פרויקט חסום")}</small><b>→</b></button>)}{blockedTasks.map(task=>{const project=projects.find(item=>item.id===task.project_id);return <button key={`task-${task.id}`} onClick={()=>navigate(`/projects?subteam=${(project?.subteam??"").toLowerCase()}&project=${task.project_id}&task=${task.id}`)}><span>TASK</span><strong>{task.title}</strong><small>{project?.name??pick("Team project","פרויקט קבוצתי")}{task.due_at?` · ${new Date(task.due_at).toLocaleDateString()}`:""}</small><b>→</b></button>})}</div>:<div className="work-blocker-clear"><span>✓</span><strong>{pick("No active team blockers","אין חסמי קבוצה פעילים")}</strong><small>{pick("Blocked projects and tasks will collect here automatically.","פרויקטים ומשימות חסומים ייאספו כאן אוטומטית.")}</small></div>}</section>:null}

    <section className={`work-focus-grid${myArea?"":" has-single-card"}`}>{myArea?<button className="work-workspace-card" onClick={()=>navigate(`/projects?subteam=${myArea.key}`)}><span className="frc-area-mark">{myArea.mark}</span><span><small>{pick("My subteam","תת־הצוות שלי")}</small><strong>{pick(myArea.en,myArea.he)}</strong><em>{myProjects.length} {pick("active projects","פרויקטים פעילים")} · {myWorkspaceTasks.length} {pick("open tasks","משימות פתוחות")}</em>{workspaceBlockers?<b>{workspaceBlockers} {pick("blockers need attention","חסמים דורשים טיפול")}</b>:null}</span><i>→</i></button>:null}
      <button className="work-growth-card" onClick={()=>navigate("/growth")}><span className="work-growth-orbit" style={{background:`conic-gradient(#fff ${skillPercent*3.6}deg,rgba(255,255,255,.2) 0)`}}><b>{skillPercent}%</b></span><span><small>{pick("My growth","ההתפתחות שלי")}</small><strong>{pick("Skills Academy","אקדמיית מיומנויות")}</strong><em>{nextCourse?`${pick("Next","הבא")}: ${nextCourse.title}`:pick("No course currently assigned","אין קורס מוקצה כרגע")}</em><b>{underway.length} {pick("courses in progress","קורסים בתהליך")}</b></span><i>→</i></button></section>

    <section className="work-robot-health"><button className={`work-health-card${criticalIssues||serviceAlerts?" has-alert":""}`} onClick={()=>navigate("/robot-reliability")}><span className="work-health-signal"/><span><small>{pick("Robot operations","תפעול הרובוט")}</small><strong>{pick("Robot Health","בריאות הרובוט")}</strong><em>{issues.length} {pick("open issues","תקלות פתוחות")} · {serviceAlerts} {pick("service alerts","התראות שירות")}</em></span><b>{criticalIssues?pick("ATTENTION","דורש טיפול"):pick("OPEN","פתיחה")} →</b></button>
      <div className="work-quick-tools"><button onClick={()=>navigate("/robot-issues")}><span>FIX</span><strong>{pick("Issues","תקלות")}</strong></button><button onClick={()=>navigate("/robot-maintenance")}><span>LIFE</span><strong>{pick("Maintenance","תחזוקה")}</strong></button><button onClick={()=>navigate("/tools")}><span>TOOL</span><strong>{pick("Tools & inventory","כלים ומלאי")}</strong></button></div></section>

    <section className="work-collapsible-group work-departments-group"><button className="work-group-toggle" aria-expanded={showWorkspaces} onClick={()=>setShowWorkspaces(value=>!value)}><span><small>{pick("FRC departments","תחומי FRC")}</small><strong>{pick("Browse other workspaces","עיון במרחבי עבודה נוספים")}</strong><span className="work-group-preview">{frcAreas.filter(area=>area.key!==myArea?.key).slice(0,4).map(area=><i key={area.key}>{pick(area.en,area.he)}</i>)}</span></span><b>{frcAreas.length-(myArea?1:0)} {showWorkspaces?"↑":"↓"}</b></button>
      {showWorkspaces?<div className="work-compact-list">{frcAreas.filter(area=>area.key!==myArea?.key).map(area=>{const count=projects.filter(project=>areaMatches(project.subteam,area.key)).length;return <button key={area.key} onClick={()=>navigate(`/projects?subteam=${area.key}`)}><span>{area.mark}</span><span><strong>{pick(area.en,area.he)}</strong><small>{count} {pick("active projects","פרויקטים פעילים")}</small></span><b>→</b></button>})}<button className="work-all-projects" onClick={()=>navigate("/projects")}><span>ALL</span><span><strong>{pick("All team projects","כל פרויקטי הקבוצה")}</strong><small>{isAdmin?pick("Portfolio and archive management","ניהול תיק פרויקטים וארכיון"):pick("Team-wide project overview","סקירת פרויקטים קבוצתית")}</small></span><b>→</b></button></div>:null}</section>

    <section className="work-collapsible-group work-coordination-group"><button className="work-group-toggle" aria-expanded={showOperations} onClick={()=>setShowOperations(value=>!value)}><span><small>{pick("Cross-team coordination","תיאום חוצה־צוותים")}</small><strong>{pick("Team operations","תפעול הקבוצה")}</strong><span className="work-group-preview">{operationalAreas.slice(0,3).map(area=><i key={area.key}>{pick(area.en,area.he)}</i>)}<i>{pick("Season roadmap","מפת העונה")}</i></span></span><b>{showOperations?"↑":"↓"}</b></button>
      {showOperations?<div className="work-compact-list">{operationalAreas.map(area=><button key={area.key} onClick={()=>navigate(`/frc-operations?area=${area.key}`)}><span>G3</span><span><strong>{pick(area.en,area.he)}</strong><small>{pick(area.detailEn,area.detailHe)}</small></span><b>→</b></button>)}<button onClick={()=>navigate("/season-planning")}><span>PLAN</span><span><strong>{pick("Season roadmap","מפת העונה")}</strong><small>{pick("Milestones, dependencies and engineering decisions","אבני דרך, תלויות והחלטות הנדסיות")}</small></span><b>→</b></button></div>:null}</section>
  </main>;
}
