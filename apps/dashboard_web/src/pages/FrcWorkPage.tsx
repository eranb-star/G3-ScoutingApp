import MentorReviewQueue from "../components/MentorReviewQueue";
import ProjectChangeImpact from "../components/ProjectChangeImpact";
import {useProjectRefresh} from "../lib/projectRefresh";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import "../styles/workOverview.css";
import { supabase } from "../supabase";
import HomeActionInbox from "../components/HomeActionInbox";
import { frcTeams, teamMatches } from "../lib/frcTeams";
import { memberTeams } from "../lib/accessControl";


type Project={id:string;name:string;status:string;subteam:string|null;due_at:string|null};
type Task={id:string;project_id:string;title:string;status:string;due_at:string|null;assignee_id:string|null};
type Course={id:string;title:string};
type Module={id:string;course_id:string};
type Enrollment={id:string;course_id:string;status:string;due_at:string|null};
type Evidence={enrollment_id:string;module_id:string;status:string};
type Issue={id:string;severity:string;status:string};
type Component={id:string;name:string;status:string;service_interval_days:number|null;last_serviced_at:string|null};

const frcAreas=frcTeams;
function areaMatches(subteam:string|null|undefined,key:string){return teamMatches(subteam,key);}

export default function FrcWorkPage(){
  const {pick}=useLocalization(),{profile}=useMemberAuth(),navigate=useNavigate(),[params,setParams]=useSearchParams();
  const [projects,setProjects]=useState<Project[]>([]),[tasks,setTasks]=useState<Task[]>([]),[courses,setCourses]=useState<Course[]>([]),[modules,setModules]=useState<Module[]>([]),[enrollments,setEnrollments]=useState<Enrollment[]>([]),[evidence,setEvidence]=useState<Evidence[]>([]),[issues,setIssues]=useState<Issue[]>([]),[components,setComponents]=useState<Component[]>([]);

  function loadWork(){if(!profile)return;return Promise.all([
    supabase.from("team_projects").select("id,name,status,subteam,due_at").neq("status","archived").order("updated_at",{ascending:false}).limit(100),
    supabase.from("project_tasks").select("id,project_id,title,status,due_at,assignee_id").eq("archived",false).order("due_at",{ascending:true,nullsFirst:false}).limit(250),
    supabase.from("training_courses").select("id,title").eq("active",true).order("created_at"),supabase.from("training_modules").select("id,course_id").order("sort_order"),
    supabase.from("training_enrollments").select("id,course_id,status,due_at").eq("member_id",profile.id),supabase.from("training_evidence").select("enrollment_id,module_id,status").eq("member_id",profile.id),
    supabase.from("robot_issues").select("id,severity,status").eq("archived",false).neq("status","resolved"),supabase.from("robot_components").select("id,name,status,service_interval_days,last_serviced_at").neq("status","retired"),
  ]).then(([p,t,c,m,n,e,i,r])=>{setProjects((p.data??[]) as Project[]);setTasks((t.data??[]) as Task[]);setCourses((c.data??[]) as Course[]);setModules((m.data??[]) as Module[]);setEnrollments((n.data??[]) as Enrollment[]);setEvidence((e.data??[]) as Evidence[]);setIssues((i.data??[]) as Issue[]);setComponents((r.data??[]) as Component[]);});}
  useEffect(()=>{void loadWork();},[profile?.id]);
  useProjectRefresh(()=>loadWork());

  const myAreas=frcAreas.filter(area=>memberTeams(profile).some(team=>areaMatches(team,area.key)));
  const myArea=myAreas[0];
  const myProjects=useMemo(()=>projects.filter(project=>project.status!=="completed"&&myAreas.some(area=>areaMatches(project.subteam,area.key))),[projects,myAreas]);
  const myProjectIds=useMemo(()=>new Set(myProjects.map(project=>project.id)),[myProjects]);
  const myWorkspaceTasks=tasks.filter(task=>myProjectIds.has(task.project_id)&&task.status!=="done");
  const assignedCourseIds=new Set(enrollments.map(item=>item.course_id)),assignedModules=modules.filter(item=>assignedCourseIds.has(item.course_id));
  const approvedModules=new Set(evidence.filter(item=>item.status==="approved").map(item=>item.module_id));
  const nextCourse=enrollments.map(item=>({enrollment:item,course:courses.find(course=>course.id===item.course_id)})).filter(item=>item.course&&item.enrollment.status!=="qualified").sort((a,b)=>(a.enrollment.due_at?new Date(a.enrollment.due_at).getTime():Number.MAX_SAFE_INTEGER)-(b.enrollment.due_at?new Date(b.enrollment.due_at).getTime():Number.MAX_SAFE_INTEGER))[0]?.course;
  const skillPercent=assignedModules.length?Math.round(assignedModules.filter(item=>approvedModules.has(item.id)).length/assignedModules.length*100):0,underway=enrollments.filter(item=>item.status!=="qualified");
  const criticalIssues=issues.filter(issue=>["critical","high"].includes(issue.severity)).length;
  const serviceAlerts=components.filter(component=>component.status==="failed"||(component.status==="installed"&&component.service_interval_days&&component.last_serviced_at&&Date.now()-new Date(component.last_serviced_at).getTime()>component.service_interval_days*864e5)).length;
  const activeProjectIds=new Set(projects.map(project=>project.id));
  const blockedProjects=projects.filter(project=>project.status==="blocked");
  const blockedTasks=tasks.filter(task=>task.status==="blocked"&&activeProjectIds.has(task.project_id));
  const showBlockers=params.get("focus")==="blockers";

  return <main className="hub-page work-page work-command-center work-overview">
    <header className="work-command-header work-command-header-compact"><div><div className="hub-eyebrow">G3 6740</div><h1>{pick("Work","עבודה")}</h1><p>{pick("Your priorities and team workspaces.","סדרי העדיפויות ומרחבי העבודה של הצוות.")}</p></div></header>
    <section aria-label={pick('Personal command','מרכז אישי')}>
      <HomeActionInbox mode="work" />
      {(criticalIssues>0||blockedProjects.length>0||blockedTasks.length>0)&&<div className="work-priority-alerts" aria-label={pick('Blockers needing attention','חסמים הדורשים טיפול')}>
        {criticalIssues>0&&<button onClick={()=>navigate('/robot-reliability')}>{criticalIssues} {pick('critical/high robot issues · Review','תקלות רובוט חמורות · לבדיקה')} →</button>}
        {(blockedProjects.length>0||blockedTasks.length>0)&&<button onClick={()=>setParams({focus:'blockers'})}>{blockedProjects.length+blockedTasks.length} {pick('blocked projects or tasks · Review','פרויקטים או משימות חסומים · לבדיקה')} →</button>}
      </div>}
      <MentorReviewQueue includePlanned/><ProjectChangeImpact/>
    {showBlockers?<section className="work-blocker-desk" aria-labelledby="blocker-desk-title"><header><div><div className="hub-eyebrow">{pick("Mentor & team-lead focus","מיקוד למנטורים ומובילי צוות")}</div><h2 id="blocker-desk-title">{pick("Team blocker desk","שולחן חסמי הקבוצה")}</h2><p>{pick("Projects and tasks that cannot move forward. Open the exact record to resolve ownership, decisions or dependencies.","פרויקטים ומשימות שאינם יכולים להתקדם. פתחו את הרשומה המדויקת כדי לפתור אחריות, החלטות או תלויות.")}</p></div><button type="button" onClick={()=>setParams({})} aria-label={pick("Close blocker desk","סגירת שולחן החסמים")}>×</button></header>{blockedProjects.length||blockedTasks.length?<div>{blockedProjects.map(project=><button key={`project-${project.id}`} onClick={()=>navigate(`/projects?subteam=${(project.subteam??"").toLowerCase()}&project=${project.id}`)}><span>PROJECT</span><strong>{project.name}</strong><small>{project.subteam??pick("Cross-team","חוצה־צוותים")} · {pick("Blocked project","פרויקט חסום")}</small><b>→</b></button>)}{blockedTasks.map(task=>{const project=projects.find(item=>item.id===task.project_id);return <button key={`task-${task.id}`} onClick={()=>navigate(`/projects?subteam=${(project?.subteam??"").toLowerCase()}&project=${task.project_id}&task=${task.id}`)}><span>TASK</span><strong>{task.title}</strong><small>{project?.name??pick("Team project","פרויקט קבוצתי")}{task.due_at?` · ${new Date(task.due_at).toLocaleDateString()}`:""}</small><b>→</b></button>})}</div>:<div className="work-blocker-clear"><span>✓</span><strong>{pick("No active team blockers","אין חסמי קבוצה פעילים")}</strong><small>{pick("Blocked projects and tasks will collect here automatically.","פרויקטים ומשימות חסומים ייאספו כאן אוטומטית.")}</small></div>}</section>:null}


    </section>
    <section className="work-project-entry" aria-labelledby="work-academy"><div><h2 id="work-academy">{pick('Skills Academy','אקדמיית מיומנויות')}</h2><p>{nextCourse?pick('Next: ','הבא: ')+nextCourse.title:pick('No course currently assigned','אין קורס מוקצה כרגע')}</p>{underway.length>0&&<small>{underway.length} {pick('courses in progress','קורסים בתהליך')} · {skillPercent}% {pick('assigned modules approved','מהמודולים המוקצים אושרו')}</small>}</div><button className="hub-button" onClick={()=>navigate(nextCourse?'/growth?course='+encodeURIComponent(nextCourse.id):'/growth')}>{nextCourse?pick('Continue learning','המשך למידה'):pick('Open Academy','פתיחת האקדמיה')}</button></section>
    <section className="work-project-entry" aria-labelledby="work-projects"><div><h2 id="work-projects">{pick('Team Projects','פרויקטי צוות')}</h2><p>{myAreas.length?myAreas.map(area=>pick(area.name,area.nameHe)).join(' · '):pick('Projects across all team workspaces','פרויקטים בכל מרחבי הצוות')}</p>{myAreas.length>0&&<small>{myProjects.length} {pick('active projects in your teams','פרויקטים פעילים בצוותים שלכם')} · {myWorkspaceTasks.length} {pick('open tasks','משימות פתוחות')}</small>}</div><button className="hub-button" onClick={()=>navigate(myAreas.length===1?`/projects?subteam=${myArea.key}`:'/projects')}>{pick('Open team projects','פתיחת פרויקטי צוות')}</button></section>
    <section className="work-project-entry" aria-labelledby="work-build"><div><h2 id="work-build">{pick('Robot Build','בניית הרובוט')}</h2><p>{pick('Choose a build to review parts, manufacturing and installation.','בחרו בנייה לבדיקת חלקים, ייצור והתקנה.')}</p></div><button className="hub-button" onClick={()=>navigate('/robot-build')}>{pick('Open Robot Build','פתיחת בניית הרובוט')}</button></section>
    <section className="work-project-entry" aria-labelledby="work-engineering"><div><h2 id="work-engineering">{pick('Engineering Hub','מרכז הנדסה')}</h2><p>{pick('Code review, log diagnosis, autonomous planning and CAD.','סקירת קוד, אבחון לוגים, תכנון אוטונומי ו-CAD.')}</p></div><button className="hub-button" onClick={()=>navigate('/engineering')}>{pick('Open Engineering Hub','פתיחת מרכז ההנדסה')}</button></section>
    <section className="work-project-entry" aria-labelledby="work-health"><div><h2 id="work-health">{pick('Robot Health','בריאות הרובוט')}</h2><p>{issues.length} {pick('open issues','תקלות פתוחות')} · {serviceAlerts} {pick('service alerts','התראות שירות')}</p></div><button className="hub-button" onClick={()=>navigate('/robot-reliability')}>{pick('Open Robot Health','פתיחת בריאות הרובוט')}</button></section>
  </main>;
}
