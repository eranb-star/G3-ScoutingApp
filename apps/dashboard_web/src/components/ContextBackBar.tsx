import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";

export default function ContextBackBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pick } = useLocalization();
  const inCompetition = location.pathname === "/scouting" || location.pathname.startsWith("/analysis");
  const inWork = location.pathname === "/projects" || location.pathname === "/tools" || location.pathname === "/frc-operations" || location.pathname === "/robot-issues" || location.pathname === "/robot-reliability";
  const parentByRoute:Record<string,{path:string;en:string;he:string}>={
    "/schedule":{path:"/home",en:"Home",he:"בית"},
    "/attendance":{path:"/more",en:"More",he:"עוד"},
    "/profile":{path:"/more",en:"More",he:"עוד"},
    "/settings":{path:"/more",en:"More",he:"עוד"},
    "/admin/members":{path:"/admin",en:"Administration",he:"ניהול"},
    "/admin/reports":{path:"/admin",en:"Administration",he:"ניהול"},
    "/admin/security":{path:"/admin",en:"Administration",he:"ניהול"},
  };
  const context=inCompetition?{path:"/competition",en:"Competition",he:"תחרות"}:inWork?{path:"/work",en:"Work",he:"עבודה"}:parentByRoute[location.pathname];
  if (!context) return null;
  return <div className="context-back-bar"><button onClick={()=>navigate(context.path)} aria-label={pick("Back","חזרה")}>← <span>{pick(context.en,context.he)}</span></button>{inCompetition?<nav aria-label={pick("Competition sections","אזורי תחרות")}><NavLink to="/competition">{pick("Overview","סקירה")}</NavLink><NavLink to="/scouting">{pick("Scouting","סקאוטינג")}</NavLink><NavLink to="/analysis">{pick("Analysis","ניתוח")}</NavLink><NavLink to="/analysis/picklist">{pick("Picklist","רשימת בחירה")}</NavLink></nav>:null}</div>;
}
