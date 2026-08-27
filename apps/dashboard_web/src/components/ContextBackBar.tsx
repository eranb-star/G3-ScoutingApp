import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";

export default function ContextBackBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pick } = useLocalization();
  const inCompetition = location.pathname === "/scouting" || location.pathname.startsWith("/analysis");
  const inWork = location.pathname === "/projects" || location.pathname === "/tools" || location.pathname === "/frc-operations";
  if (!inCompetition && !inWork) return null;
  const parent = inCompetition ? "/competition" : "/work";
  return <div className="context-back-bar"><button onClick={()=>navigate(parent)} aria-label={pick("Back","חזרה")}>← <span>{inCompetition?pick("Competition","תחרות"):pick("Work","עבודה")}</span></button>{inCompetition?<nav aria-label={pick("Competition sections","אזורי תחרות")}><NavLink to="/competition">{pick("Overview","סקירה")}</NavLink><NavLink to="/scouting">{pick("Scouting","סקאוטינג")}</NavLink><NavLink to="/analysis">{pick("Analysis","ניתוח")}</NavLink><NavLink to="/analysis/picklist">{pick("Picklist","רשימת בחירה")}</NavLink></nav>:null}</div>;
}
