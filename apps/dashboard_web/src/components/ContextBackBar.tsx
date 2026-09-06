import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLocalization } from "../lib/localization";
import { supabase } from "../supabase";

export default function ContextBackBar({fallbackTo,label}:{fallbackTo?:string;label?:string}={}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { pick } = useLocalization();
  const [eventName,setEventName]=useState("");
  // Routed pages already receive the shell navigation. Older page-level instances
  // pass fallbackTo; suppress those so only one competition navigator is rendered.
  const fromCompetition = new URLSearchParams(location.search).get("from") === "competition";
  const inCompetition = location.pathname === "/competition" || location.pathname === "/scouting" || location.pathname.startsWith("/analysis") || location.pathname.startsWith("/competition/");
  const showEventContext=inCompetition&&!location.pathname.startsWith("/competition/library")&&!location.pathname.startsWith("/analysis/picklist");
  useEffect(()=>{if(!showEventContext){setEventName("");return;}const id=localStorage.getItem("g3_event_id");if(!id){setEventName("");return;}supabase.from("events").select("name").eq("id",id).maybeSingle().then(({data})=>setEventName(data?.name??""));},[showEventContext,location.pathname]);
  if (fallbackTo) return null;
  const inWork = location.pathname === "/projects" || location.pathname === "/tools" || location.pathname === "/frc-operations" || location.pathname === "/robot-issues" || location.pathname === "/robot-reliability" || location.pathname === "/robot-maintenance" || location.pathname === "/growth" || location.pathname === "/season-planning" || location.pathname === "/media" || location.pathname === "/feedback" || location.pathname === "/engineering";
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
  return <div className="context-back-bar"><div className="competition-context-cluster"><button onClick={back} aria-label={pick("Back","חזרה")}>← <span>{location.pathname==="/robot-reliability"?pick("Back","חזרה"):pick(context.en,context.he)}</span></button>{showEventContext?<div className="active-event-chip"><small>{pick("ACTIVE EVENT","אירוע פעיל")}</small><strong>{eventName||pick("Choose event in Overview","בחירת אירוע בסקירה")}</strong></div>:null}</div>{inCompetition?<nav aria-label={pick("Competition sections","אזורי תחרות")}><NavLink end to="/competition">{pick("Overview","סקירה")}</NavLink><NavLink to="/scouting">{pick("Match scouting","סקאוטינג משחק")}</NavLink><NavLink to="/competition/pit-scouting">{pick("Pit scouting","סקאוטינג פיט")}</NavLink><NavLink to="/competition/pit-assignments">{pick("Pit assignments","שיבוצי פיט")}</NavLink><NavLink end to="/analysis">{pick("Analysis","ניתוח")}</NavLink><NavLink to="/analysis/picklist">{pick("Picklist","רשימת בחירה")}</NavLink><NavLink to="/competition/scouting-quality">{pick("Quality","איכות")}</NavLink><NavLink to="/competition/control">{pick("Control","שליטה")}</NavLink><NavLink to="/competition/library">{pick("Match library","ספריית משחקים")}</NavLink></nav>:null}</div>;
}
