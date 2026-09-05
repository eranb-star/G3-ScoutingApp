import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";

export default function ContextBackBar({fallbackTo,label}:{fallbackTo?:string;label?:string}={}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { pick } = useLocalization();
  // Routed pages already receive the shell navigation. Older page-level instances
  // pass fallbackTo; suppress those so only one competition navigator is rendered.
  if (fallbackTo) return null;
  const fromCompetition = new URLSearchParams(location.search).get("from") === "competition";
  const inCompetition = location.pathname === "/competition" || location.pathname === "/scouting" || location.pathname.startsWith("/analysis") || location.pathname.startsWith("/competition/");
  const inWork = location.pathname === "/projects" || location.pathname === "/tools" || location.pathname === "/frc-operations" || location.pathname === "/robot-issues" || location.pathname === "/robot-reliability" || location.pathname === "/robot-maintenance" || location.pathname === "/growth" || location.pathname === "/season-planning";
  const parentByRoute:Record<string,{path:string;en:string;he:string}>={
    "/schedule":{path:"/home",en:"Home",he:"בית"},
    "/attendance":{path:"/more",en:"More",he:"עוד"},
    "/profile":{path:"/more",en:"More",he:"עוד"},
    "/settings":{path:"/more",en:"More",he:"עוד"},
    "/admin/members":{path:"/admin",en:"Administration",he:"ניהול"},
    "/admin/reports":{path:"/admin",en:"Administration",he:"ניהול"},
    "/admin/contributions":{path:"/admin",en:"Administration",he:"ניהול"},
    "/admin/security":{path:"/admin",en:"Administration",he:"ניהול"},
  };
  const context=fallbackTo?{path:fallbackTo,en:label??"Back",he:label??"חזרה"}:location.pathname==="/competition"?{path:"/home",en:"Home",he:"בית"}:(fromCompetition&&location.pathname==="/robot-reliability")?{path:"/competition",en:"Competition",he:"תחרות"}:inCompetition?{path:"/competition",en:"Competition",he:"תחרות"}:inWork?{path:"/work",en:"Work",he:"עבודה"}:parentByRoute[location.pathname];
  if (!context) return null;
  const back=()=>location.pathname==="/robot-reliability"?navigate(-1):navigate(context.path);
  return <div className="context-back-bar"><button onClick={back} aria-label={pick("Back","חזרה")}>← <span>{location.pathname==="/robot-reliability"?pick("Back","חזרה"):pick(context.en,context.he)}</span></button>{inCompetition?<nav aria-label={pick("Competition sections","אזורי תחרות")}><NavLink end to="/competition">{pick("Overview","סקירה")}</NavLink><NavLink to="/scouting">{pick("Match scouting","סקאוטינג משחק")}</NavLink><NavLink to="/competition/pit-scouting">{pick("Pit scouting","סקאוטינג פיט")}</NavLink><NavLink to="/competition/pit-assignments">{pick("Pit assignments","שיבוצי פיט")}</NavLink><NavLink end to="/analysis">{pick("Analysis","ניתוח")}</NavLink><NavLink to="/competition/scouting-quality">{pick("Quality","איכות")}</NavLink><NavLink to="/competition/control">{pick("Control","שליטה")}</NavLink><NavLink to="/competition/library">{pick("Match library","ספריית משחקים")}</NavLink><NavLink to="/analysis/picklist">{pick("Picklist","רשימת בחירה")}</NavLink></nav>:null}</div>;
}
