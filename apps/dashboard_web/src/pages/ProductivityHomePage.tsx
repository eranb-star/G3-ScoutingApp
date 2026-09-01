import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { getUnreadUpdateCounts } from "../lib/unreadUpdates";
import { supabase } from "../supabase";
import HomeActionInbox from "../components/HomeActionInbox";

type Meeting={id:string;title:string;starts_at:string;ends_at:string;status:string};
const time=new Intl.DateTimeFormat("en-IL",{timeZone:"Asia/Jerusalem",weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const israelDay=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"});

function isUsableOpenMeeting(meeting:Meeting,now:Date){
  const starts=new Date(meeting.starts_at); const ends=new Date(meeting.ends_at);
  if(israelDay.format(starts)!==israelDay.format(now))return false;
  return now.getTime()>=starts.getTime()-60*60*1000&&now.getTime()<=ends.getTime();
}

export default function ProductivityHomePage({isAdmin}:{isAdmin:boolean}){
  void isAdmin;
  const {pick}=useLocalization(); const {profile}=useMemberAuth(); const navigate=useNavigate();
  const [active,setActive]=useState<Meeting|null>(null); const [next,setNext]=useState<Meeting|null>(null); const [responsibilityCount,setResponsibilityCount]=useState(0); const [presence,setPresence]=useState(0); const [unread,setUnread]=useState(0); const [blockers,setBlockers]=useState(0); const [maintenance,setMaintenance]=useState(0); const [robotMaintenance,setRobotMaintenance]=useState(0);
  async function load(){if(!profile)return;const now=new Date();const nowIso=now.toISOString();const [activeResult,nextResult,actionResult,stateResult,presenceResult,blockerProjects,blockerTasks,maintenanceResult,counts]=await Promise.all([supabase.from("team_meetings").select("id,title,starts_at,ends_at,status").eq("status","open").order("starts_at"),supabase.from("team_meetings").select("id,title,starts_at,ends_at,status").in("status",["scheduled","open"]).gt("starts_at",nowIso).order("starts_at").limit(1),supabase.from("team_actions").select("id"),supabase.from("team_action_states").select("action_id").eq("member_id",profile.id).eq("status","completed"),supabase.from("attendance_records").select("id",{count:"exact",head:true}).is("checked_out_at",null),supabase.from("team_projects").select("id",{count:"exact",head:true}).eq("status","blocked"),supabase.from("project_tasks").select("id,team_projects(status)").eq("status","blocked").eq("archived",false),supabase.from("tool_maintenance").select("id",{count:"exact",head:true}).neq("status","resolved"),getUnreadUpdateCounts(profile.id)]);const openMeetings=(activeResult.data??[]) as Meeting[];const completed=new Set((stateResult.data??[]).map(item=>item.action_id));const validBlockedTasks=((blockerTasks.data??[]) as unknown as Array<{team_projects?:{status?:string}|null}>).filter(task=>task.team_projects?.status!=="archived");setActive(openMeetings.find(meeting=>isUsableOpenMeeting(meeting,now))??null);setNext((nextResult.data?.[0]??null) as Meeting|null);setResponsibilityCount((actionResult.data??[]).filter(item=>!completed.has(item.id)).length);setPresence(presenceResult.count??0);setBlockers((blockerProjects.count??0)+validBlockedTasks.length);setMaintenance(maintenanceResult.count??0);setUnread(counts.announcements+counts.channels);}
  useEffect(()=>{void load();},[profile?.id]);
  useEffect(()=>{if(!profile)return;void Promise.all([supabase.from("robot_components").select("id,status,service_interval_days,last_serviced_at").in("status",["installed","service_due","failed"]),supabase.from("robot_batteries").select("id",{count:"exact",head:true}).in("status",["service_due","quarantined"])]).then(([components,batteries])=>{const now=Date.now();const componentAlerts=(components.data??[]).filter(item=>item.status==="service_due"||item.status==="failed"||(item.status==="installed"&&item.service_interval_days&&item.last_serviced_at&&now-new Date(item.last_serviced_at).getTime()>Number(item.service_interval_days)*86400000)).length;setRobotMaintenance(componentAlerts+(batteries.count??0));});},[profile?.id]);
  return <main className="hub-page productivity-home"><section className="home-command"><div><div className="hub-eyebrow">Glue Gun &amp; Glitter · FRC 6740</div><h1>{pick(`Ready, ${profile?.display_name?.split(" ")[0]??"G3"}?`,`מוכנים, ${profile?.display_name?.split(" ")[0]??"G3"}?`)}</h1><p>{pick("Your live command center for today’s team work.","מרכז השליטה החי שלכם לעבודת הקבוצה היום.")}</p></div><img src="/logoG3.png" alt="G3 6740"/></section>
  <section className="home-now-panel"><span className={`home-live-indicator${active?" is-live":""}`}/><div><strong>{active?pick(`${active.title} is open`,`${active.title} פתוח`):pick("No workshop session is open","אין מפגש סדנה פתוח")}</strong><small>{active?pick(`${presence} people currently checked in`,`${presence} אנשים נמצאים כרגע`):next?`${pick("Next","הבא")}: ${next.title} · ${time.format(new Date(next.starts_at))}`:pick("No upcoming meeting loaded","לא נטען מפגש קרוב")}</small></div><button className="hub-button" onClick={()=>navigate("/check-in")}>{pick("Check in / out","כניסה / יציאה")}</button></section>
  <section className="home-metrics"><button onClick={()=>navigate("/updates?view=inbox")}><strong>{unread}</strong><span>{pick("Unread updates","עדכונים שלא נקראו")}</span></button><button onClick={()=>navigate("/work")}><strong>{responsibilityCount}</strong><span>{pick("My responsibilities","האחריות שלי")}</span></button><button onClick={()=>navigate("/work")}><strong>{blockers}</strong><span>{pick("Team blockers","חסמי קבוצה")}</span></button><button onClick={()=>robotMaintenance?navigate("/robot-maintenance"):navigate("/tools")}><strong>{maintenance+robotMaintenance}</strong><span>{pick("Maintenance alerts","התראות תחזוקה")}</span></button></section>
  <HomeActionInbox/>
  <button className="home-competition-card" onClick={()=>navigate("/competition")}><span><small>{pick("FRC competition","תחרות FRC")}</small><strong>{pick("Competition center","מרכז התחרות")}</strong><em>{pick("Scouting, live analysis and alliance strategy","סקאוטינג, ניתוח חי ואסטרטגיית בריתות")}</em></span><b>{pick("Open","פתיחה")} →</b></button>
  </main>;
}
