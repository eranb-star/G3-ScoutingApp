import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";

type Project = { id: string; name: string; status: string; subteam: string | null; due_at: string | null };
type Task = { id: string; project_id: string; title: string; status: string; due_at: string | null };

const frcAreas = [
  { key: "mechanical", en: "Mechanical", he: "מכניקה", mark: "MECH", detailEn: "CAD, fabrication, BOM and design reviews", detailHe: "תיב״ם, ייצור, רשימת חומרים וסקרי תכן" },
  { key: "electrical", en: "Electrical", he: "אלקטרוניקה", mark: "ELEC", detailEn: "Wiring, CAN devices, batteries and inspection", detailHe: "חיווט, התקני CAN, סוללות ובדיקות" },
  { key: "software", en: "Software", he: "תוכנה", mark: "CODE", detailEn: "Robot code, releases, calibration and tests", detailHe: "קוד רובוט, גרסאות, כיול ובדיקות" },
  { key: "strategy", en: "Strategy & scouting", he: "אסטרטגיה וסקאוטינג", mark: "DATA", detailEn: "Match data, game analysis and alliance planning", detailHe: "נתוני משחקים, ניתוח ותכנון בריתות" },
  { key: "business", en: "Business & outreach", he: "קהילה ועסקים", mark: "TEAM", detailEn: "Sponsors, awards, media and outreach", detailHe: "ספונסרים, פרסים, מדיה וקהילה" },
  { key: "pit", en: "Drive & pit", he: "נהיגה ופיט", mark: "PIT", detailEn: "Readiness, repairs and match turnaround", detailHe: "מוכנות, תיקונים והיערכות למשחק" },
];

export default function FrcWorkPage() {
  const { pick } = useLocalization();
  const { profile } = useMemberAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("team_projects").select("id,name,status,subteam,due_at").neq("status", "archived").order("updated_at", { ascending: false }).limit(12),
      supabase.from("project_tasks").select("id,project_id,title,status,due_at").eq("archived", false).order("due_at", { ascending: true, nullsFirst: false }).limit(80),
    ]).then(([projectResult, taskResult]) => {
      setProjects((projectResult.data ?? []) as Project[]);
      setTasks((taskResult.data ?? []) as Task[]);
      setLoading(false);
    });
  }, []);

  const activeProjectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);
  const openTasks = useMemo(() => tasks.filter((task) => activeProjectIds.has(task.project_id) && task.status !== "done"), [tasks, activeProjectIds]);
  const blockers = useMemo(() => projects.filter((project) => project.status === "blocked").length + tasks.filter((task) => task.status === "blocked").length, [projects, tasks]);
  const myArea = (profile?.subteam ?? "").toLowerCase();

  return <main className="hub-page work-page">
    <header className="work-command-header">
      <div><div className="hub-eyebrow">FRC 6740 · {pick("Build operations", "תפעול עונת הבנייה")}</div><h1>{pick("Build the robot", "בונים את הרובוט")}</h1><p>{pick("One connected workspace for every G3 subsystem and subteam.", "מרחב עבודה מחובר לכל מערכת ותת־צוות של G3.")}</p></div>
      <button className="hub-button" onClick={() => navigate("/projects")}>{pick("All projects", "כל הפרויקטים")}</button>
    </header>

    <section className="work-status-rail" aria-label={pick("Build status", "מצב הבנייה")}>
      <article><strong>{loading ? "—" : projects.length}</strong><span>{pick("Active projects", "פרויקטים פעילים")}</span></article>
      <article><strong>{loading ? "—" : openTasks.length}</strong><span>{pick("Open tasks", "משימות פתוחות")}</span></article>
      <article className={blockers ? "has-blocker" : ""}><strong>{loading ? "—" : blockers}</strong><span>{pick("Blockers", "חסמים")}</span></article>
    </section>

    <section className="work-section-heading"><div><div className="hub-eyebrow">{pick("FRC departments", "תחומי FRC")}</div><h2>{pick("Subteam workspaces", "מרחבי תתי־צוותים")}</h2></div><small>{pick("Your subteam is highlighted", "תת־הצוות שלך מודגש")}</small></section>
    <div className="frc-area-grid">
      {frcAreas.map((area) => {
        const selected = myArea.includes(area.key) || (area.key === "electrical" && myArea.includes("electronic"));
        const areaProjects = projects.filter((project) => (project.subteam ?? "").toLowerCase().includes(area.key));
        return <button className={`frc-area-card${selected ? " is-mine" : ""}`} key={area.key} onClick={() => navigate(`/projects?subteam=${area.key}`)}>
          <span className="frc-area-mark">{area.mark}</span><span className="frc-area-copy"><strong>{pick(area.en, area.he)}</strong><small>{pick(area.detailEn, area.detailHe)}</small></span><span className="frc-area-count">{areaProjects.length}</span>
        </button>;
      })}
    </div>

    <section className="work-utilities" aria-label={pick("Workshop operations", "תפעול הסדנה")}>
      <button className="hub-card work-utility-card" onClick={() => navigate("/tools")}><span className="frc-area-mark">TOOL</span><span><strong>{pick("Tools & equipment", "כלים וציוד")}</strong><small>{pick("Inventory, checkout, training and maintenance", "מלאי, השאלה, הכשרה ותחזוקה")}</small></span><b>→</b></button>
    </section>

    <section className="hub-card work-priority-card">
      <header><div><div className="hub-eyebrow">{pick("Priority board", "לוח עדיפויות")}</div><h2>{pick("What needs attention", "מה דורש טיפול")}</h2></div><button className="announcement-link" onClick={() => navigate("/projects")}>{pick("View all", "הצגת הכול")} →</button></header>
      {openTasks.length === 0 ? <p>{pick("No open tasks yet. Create the first FRC project and assign the work.", "אין עדיין משימות פתוחות. צרו פרויקט FRC ראשון והקצו את העבודה.")}</p> : openTasks.slice(0, 5).map((task) => {
        const project = projects.find((item) => item.id === task.project_id);
        return <button className="work-task-row" key={task.id} onClick={() => navigate("/projects")}><span className={`work-task-status status-${task.status}`} /><span><strong>{task.title}</strong><small>{project?.name ?? pick("G3 project", "פרויקט G3")}{task.due_at ? ` · ${new Date(task.due_at).toLocaleDateString()}` : ""}</small></span><b>{task.status.replace("_", " ")}</b></button>;
      })}
    </section>
  </main>;
}
