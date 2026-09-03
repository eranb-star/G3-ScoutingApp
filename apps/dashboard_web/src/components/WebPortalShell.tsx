import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { useAdminStatus } from "../lib/useAdminStatus";
import "./webPortal.css";

const links = [
  ["/home", "Overview", "סקירה"],
  ["/work", "Work", "עבודה"],
  ["/schedule", "Team schedule", "לוח הקבוצה"],
  ["/updates", "Updates", "עדכונים"],
  ["/growth", "Skills Academy", "אקדמיית מיומנויות"],
  ["/competition", "Competition", "תחרות"],
] as const;

export default function WebPortalShell({children}:{children:ReactNode}) {
  const {profile}=useMemberAuth();
  const {pick}=useLocalization();
  const isAdmin=useAdminStatus();
  const location=useLocation();
  const [expanded,setExpanded]=useState(false);
  if(!profile?.active||profile.must_change_password)return <>{children}</>;
  const title=links.find(([path])=>location.pathname===path)?.[1]??(location.pathname.startsWith("/admin")?"Administration":location.pathname.startsWith("/robot")?"Robot operations":location.pathname.startsWith("/project")?"Projects":"Team workspace");
  const knowledgeView=location.pathname==="/updates"&&new URLSearchParams(location.search).get("view")==="knowledge";
  const item=(path:string,en:string,he:string)=>{
    const active=path.includes("?")?knowledgeView:location.pathname===path&&!(path==="/updates"&&knowledgeView);
    return <NavLink to={path} end className={active?"active":""} aria-current={active?"page":false} onClick={()=>setExpanded(false)}>{pick(en,he)}</NavLink>;
  };
  return <div className="web-portal">
    <a className="web-skip" href="#web-content">{pick("Skip to content","דילוג לתוכן")}</a>
    <aside className={`web-sidebar${expanded?" is-expanded":""}`}>
      <NavLink to="/home" className="web-brand"><img src="/logoG3.png" alt="G3"/><span><strong>G3 6740</strong><small>TEAM HUB</small></span></NavLink>
      <button className="web-menu-toggle" aria-expanded={expanded} aria-controls="web-navigation" onClick={()=>setExpanded(!expanded)}><span aria-hidden="true">{expanded?"×":"☰"}</span> {pick("Full navigation","ניווט מלא")}</button>
      <nav id="web-navigation" aria-label={pick("Team navigation","ניווט הקבוצה")}>
        {links.map(([path,en,he])=><div key={path}>{item(path,en,he)}</div>)}
        <div>{item("/updates?view=knowledge","FRC knowledge","ידע FRC")}</div>
        <div>{item("/assistant","G3 Assist","G3 Assist")}</div>
        {isAdmin?<section className="web-admin-nav"><small>{pick("ADMINISTRATION","ניהול")}</small>{item("/admin","Workshop dashboard","לוח הסדנה")}{item("/admin/reports","Attendance reports","דוחות נוכחות")}{item("/admin/members","Team members","חברי הקבוצה")}{item("/admin/security","Security","אבטחה")}</section>:null}
      </nav>
      <NavLink className="web-profile" to="/profile"><span>{profile.display_name}</span><small>{profile.subteam||pick("Team member","חבר/ת קבוצה")}</small></NavLink>
    </aside>
    <div className="web-workspace">
      <header className="web-topbar"><span>{pick(title,links.find(([path])=>location.pathname===path)?.[2]??"מרחב הקבוצה")}</span><div><NavLink to="/schedule" aria-label={pick("Open calendar","פתיחת יומן")}><b aria-hidden="true">▦</b>{pick("Calendar","יומן")}</NavLink><NavLink to="/updates?view=inbox" aria-label={pick("Open notifications","פתיחת התראות")}><b aria-hidden="true">●</b>{pick("Notifications","התראות")}</NavLink><NavLink to="/settings" aria-label={pick("Open settings","פתיחת הגדרות")}><b aria-hidden="true">⚙</b>{pick("Settings","הגדרות")}</NavLink></div></header>
      <div id="web-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}

export function WebCheckInNotice(){const {pick}=useLocalization();return <main className="hub-page"><section className="hub-card"><h1>{pick("Check in using the G3 phone app","כניסה באמצעות אפליקציית G3 בטלפון")}</h1><p>{pick("Workshop check-in and check-out require the phone app. Your schedule and authorized attendance-management tools remain available here.","כניסה ויציאה מהסדנה מתבצעות באפליקציית הטלפון. לוח הזמנים וכלי ניהול הנוכחות המורשים זמינים כאן.")}</p><NavLink to="/home">{pick("Back to Overview","חזרה לסקירה")}</NavLink></section></main>;}
