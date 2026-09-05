import { ReactNode, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { useAdminStatus } from "../lib/useAdminStatus";
import "./webPortal.css";
import { memberTeams } from "../lib/accessControl";
import { supabase } from "../supabase";

const links = [
  ["/home", "Home", "בית"],
  ["/work", "Work", "עבודה"],
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
  const signOut=async()=>{await supabase.auth.signOut({scope:"local"});};
  if(!profile?.active||profile.must_change_password)return <>{children}</>;
  const knowledgeView=location.pathname==="/updates"&&new URLSearchParams(location.search).get("view")==="knowledge";
  const item=(path:string,en:string,he:string)=>{
    const active=path.includes("?")?knowledgeView:location.pathname===path&&!(path==="/updates"&&knowledgeView);
    return <Link to={path} className={active?"active":""} aria-current={active?"page":undefined} onClick={()=>setExpanded(false)}>{pick(en,he)}</Link>;
  };
  return <div className="web-portal">
    <a className="web-skip" href="#web-content">{pick("Skip to content","דילוג לתוכן")}</a>
    <aside className={`web-sidebar${expanded?" is-expanded":""}`}>
      <NavLink to="/home" className="web-brand"><img src="/g3-assistant.png" alt="G3 glue-gun team mark"/><span><strong>G3 6740</strong><small>TEAM HUB</small></span></NavLink>
      <button className="web-menu-toggle" aria-expanded={expanded} aria-controls="web-navigation" onClick={()=>setExpanded(!expanded)}><span aria-hidden="true">{expanded?"×":"☰"}</span> {pick("Full navigation","ניווט מלא")}</button>
      <nav id="web-navigation" aria-label={pick("Team navigation","ניווט הקבוצה")}>
        {links.map(([path,en,he])=><div key={path}>{item(path,en,he)}</div>)}
        <div>{item("/updates?view=knowledge","FRC knowledge","ידע FRC")}</div>
        <div>{item("/assistant","G3 Assist","G3 Assist")}</div>
        {isAdmin?<section className="web-admin-nav"><small>{pick("ADMINISTRATION","ניהול")}</small>{item("/admin","Workshop dashboard","לוח הסדנה")}{item("/admin/reports","Attendance reports","דוחות נוכחות")}{item("/admin/contributions","Leadership analytics","ניתוח ניהולי")}{item("/admin/members","Team members","חברי הקבוצה")}{item("/admin/permissions","Roles & permissions","תפקידים והרשאות")}{item("/admin/security","Security","אבטחה")}</section>:null}
      </nav>
      <NavLink className="web-profile" to="/profile"><span>{profile.display_name}</span><small>{memberTeams(profile).join(" · ")||pick("Team member","חבר/ת קבוצה")}</small></NavLink>
      <button className="web-signout" type="button" onClick={()=>void signOut()}>{pick("Sign out","יציאה")}</button>
    </aside>
    <div className="web-workspace">
      <header className="web-topbar"><Link className="web-team-signature" to="/home" aria-label={pick("Glue Gun and Glitter home","דף הבית של Glue Gun and Glitter")}><img src="/g3-assistant.png" alt=""/><span><strong>Glue Gun &amp; Glitter</strong><small>FRC 6740 · ONE TEAM</small></span></Link><nav aria-label={pick("Quick tools","כלים מהירים")}><NavLink to="/schedule" aria-label={pick("Open calendar","פתיחת יומן")}><b aria-hidden="true">▦</b><span>{pick("Calendar","יומן")}</span></NavLink><NavLink to="/updates?view=inbox" aria-label={pick("Open notifications","פתיחת התראות")}><b aria-hidden="true">●</b><span>{pick("Notifications","התראות")}</span></NavLink><NavLink to="/settings" aria-label={pick("Open settings","פתיחת הגדרות")}><b aria-hidden="true">⚙</b><span>{pick("Settings","הגדרות")}</span></NavLink></nav></header>
      <div id="web-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}

export function WebCheckInNotice(){const {pick}=useLocalization();return <main className="hub-page"><section className="hub-card"><h1>{pick("Check in using the G3 phone app","כניסה באמצעות אפליקציית G3 בטלפון")}</h1><p>{pick("Workshop check-in and check-out require the phone app. Your schedule and authorized attendance-management tools remain available here.","כניסה ויציאה מהסדנה מתבצעות באפליקציית הטלפון. לוח הזמנים וכלי ניהול הנוכחות המורשים זמינים כאן.")}</p><NavLink to="/home">{pick("Back to Home","חזרה לבית")}</NavLink></section></main>;}
