import {useProjectRefresh} from "../lib/projectRefresh";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";
import {visibleResponsibilities} from "../lib/responsibilityVisibility";
import {mergeReadinessPriorities,mergeOverdueTasks,overdueLabel,type OverdueTask,type ReadinessSignal} from "../lib/readiness";

type Action = { id:string; title:string; details:string|null; action_type:string; due_at:string|null; priority:string; created_at:string; destination?:string|null; source_table?:string|null; source_id?:string|null };
type State = { action_id:string; status:string; snoozed_until:string|null };
type CompetitionAssignment = { id:string; role:string; match_id:string|null };
type Match = { id:string; match_type:string|null; match_number:number|null; red_teams:number[]|null; blue_teams:number[]|null };

function matchLabel(match:Match) {
  const type=["qm","qual"].includes(match.match_type?.toLowerCase()??"")?"QM":match.match_type?.toUpperCase()||"M";
  return `${type}${match.match_number??"?"}`;
}

function scoutingTeam(role:string,match:Match) {
  const station=/^scout_(red|blue)_([123])$/.exec(role);
  if(!station)return null;
  return (station[1]==="red"?match.red_teams:match.blue_teams)?.[Number(station[2])-1]??null;
}

async function enrichCompetitionActions(actions:Action[]) {
  const assignmentIds=actions.filter(action=>action.source_table==="competition_assignments"&&action.source_id).map(action=>action.source_id as string);
  if(!assignmentIds.length)return actions;
  const {data:assignmentRows}=await supabase.from("competition_assignments").select("id,role,match_id").in("id",assignmentIds);
  const assignments=(assignmentRows??[]) as CompetitionAssignment[];
  const matchIds=[...new Set(assignments.map(item=>item.match_id).filter((id):id is string=>Boolean(id)))];
  if(!matchIds.length)return actions;
  const {data:matchRows}=await supabase.from("matches").select("id,match_type,match_number,red_teams,blue_teams").in("id",matchIds);
  const matches=new Map(((matchRows??[]) as Match[]).map(match=>[match.id,match]));
  const assignmentMap=new Map(assignments.map(assignment=>[assignment.id,assignment]));
  return actions.map(action=>{
    if(!action.source_id)return action;
    const assignment=assignmentMap.get(action.source_id);
    const match=assignment?.match_id?matches.get(assignment.match_id):undefined;
    if(!assignment||!match)return action;
    const team=scoutingTeam(assignment.role,match);
    return team?{...action,title:`${matchLabel(match)} · Scout team ${team}`,details:action.details||`Competition scouting assignment · Team ${team}`}:action;
  });
}

export default function HomeActionInbox({mode="home",overdueTasks=[],risks=[]}:{mode?:"home"|"work";overdueTasks?:OverdueTask[];risks?:ReadinessSignal[]}) {
  const {profile}=useMemberAuth(),{pick}=useLocalization(),navigate=useNavigate();
  const [actions,setActions]=useState<Action[]>([]),[states,setStates]=useState<State[]>([]),[message,setMessage]=useState(""),[showAll,setShowAll]=useState(false),[loading,setLoading]=useState(true);

 useProjectRefresh(()=>load());
  async function load(){
    if(!profile)return;
    setLoading(true);
    const actionResult=await supabase.from("team_actions").select("id,title,details,action_type,due_at,priority,created_at,destination,source_table,source_id").order("due_at",{ascending:true,nullsFirst:false}).limit(100);
    let actionData:Action[]=(actionResult.data??[]) as Action[];
    if(actionResult.error?.message.includes("destination")){
      const fallback=await supabase.from("team_actions").select("id,title,details,action_type,due_at,priority,created_at,source_table,source_id").order("due_at",{ascending:true,nullsFirst:false}).limit(100);
      actionData=(fallback.data??[]) as Action[];
    }
    actionData=await enrichCompetitionActions(actionData);
    const stateResult=await supabase.from("team_action_states").select("action_id,status,snoozed_until").eq("member_id",profile.id);
    setActions(actionData);setStates((stateResult.data??[]) as State[]);setLoading(false);
  }

  useEffect(()=>{void load();},[profile?.id]);
  const personalRisks=risks.filter(r=>r.assigned_user_id===profile?.id&&r.signal_type==='CRITICAL_ROBOT_ISSUE');
  const riskFor=(action:Action)=>personalRisks.find(r=>action.source_table==='robot_issues'&&action.source_id===r.source_id);
  const available=useMemo(()=>{
    const ordinary=visibleResponsibilities(actions,states,mode);
    if(mode!=='home')return ordinary;
    return mergeReadinessPriorities(actions,mergeOverdueTasks(actions,ordinary,overdueTasks,profile?.id),risks,profile?.id);
  },[actions,states,mode,risks,overdueTasks,profile?.id]);
  const visible=showAll?available:available.slice(0,6);

  async function updateState(action:Action,status:string,snoozed_until?:string){if(!profile||status==="completed"&&action.source_table==="project_tasks")return;const now=new Date().toISOString();const {error}=await supabase.from("team_action_states").upsert({action_id:action.id,member_id:profile.id,status,snoozed_until:snoozed_until??null,acknowledged_at:status==="acknowledged"?now:null,completed_at:status==="completed"?now:null,updated_at:now},{onConflict:"action_id,member_id"});setMessage(error?.message??pick("Reminder updated. Task status is unchanged.","התזכורת עודכנה. סטטוס המשימה לא השתנה."));if(!error)await load();}

  return <section className={`hub-card home-action-inbox responsibility-inbox responsibility-${mode}`} aria-labelledby={`${mode}-responsibility-title`}>
    <header><div><div className="hub-eyebrow">{pick(mode==="home"?"Your priorities":"Personal command",mode==="home"?"סדר העדיפויות שלך":"מרכז אישי")}</div><h2 id={`${mode}-responsibility-title`}>{pick(mode==="home"?"What needs you":"My responsibilities",mode==="home"?"מה דורש אותך":"האחריות שלי")}</h2></div><span aria-label={pick(`${available.length} ${mode==="home"?"priorities":"active responsibilities"}`,`${available.length} ${mode==="home"?"עדיפויות":"משימות פעילות"}`)}>{loading?"—":available.length}</span></header>
    {message?<small className="action-message" role="status">{message}</small>:null}
    {loading?<div className="work-skeleton"/>:visible.length?visible.map(action=>{const state=states.find(item=>item.action_id===action.id),risk=riskFor(action),overdue=overdueTasks.find(t=>t.assignee_id===profile?.id&&action.source_table==='project_tasks'&&action.source_id===t.id);return <article className={`priority-${risk?'urgent':action.priority}`} key={action.id}><button className="responsibility-open" onClick={()=>navigate(action.destination||"/work")}><span>{risk?pick('Critical robot issue','תקלה קריטית ברובוט'):action.action_type.replace("_"," ")}</span><strong>{action.title}</strong><small>{overdue?overdueLabel(overdue,pick)+" · ":""}{action.details}{action.due_at?` · ${new Date(action.due_at).toLocaleDateString()}`:""}</small></button><div className="responsibility-actions"><div className="responsibility-action-buttons">{(!state||state.status==="new")&&!action.id.startsWith('signal-')&&!action.id.startsWith('overdue-')?<button className="secondary responsibility-acknowledge" onClick={()=>void updateState(action,"acknowledged")}>{pick("Acknowledge","אישור קבלה")}</button>:null}{action.source_table==='project_tasks'?<><button className="responsibility-primary" onClick={()=>navigate(action.destination||'/projects')}>{pick('Open task','פתיחת משימה')}</button>{!overdue?<button className="secondary" onClick={()=>void updateState(action,'snoozed',new Date(Date.now()+86400000).toISOString())}>{pick('Remind tomorrow','הזכירו לי מחר')}</button>:null}</>:overdue?<small>{pick('Update this task in Projects to clear the overdue status.','עדכנו את המשימה בפרויקטים להסרת האיחור.')}</small>:risk?<small>{pick('Resolve in Robot Issues to clear this risk.','יש לפתור את התקלה ברובוט להסרת הסיכון.')}</small>:<><button onClick={()=>void updateState(action,"completed")}>{pick("Complete","השלמה")}</button><button className="secondary" onClick={()=>void updateState(action,"snoozed",new Date(Date.now()+24*3600000).toISOString())}>{pick("Tomorrow","מחר")}</button></>}</div>{action.source_table==='project_tasks'?<small className="responsibility-action-hint">{pick('Task status is managed in Projects.','סטטוס המשימה מנוהל בפרויקטים.')}</small>:null}</div></article>}):<p>{pick(mode==="home"?"Nothing needs your attention in the next seven days.":"You have no active responsibilities.",mode==="home"?"אין פעולות הדורשות את תשומת לבכם בשבעת הימים הקרובים.":"אין לכם אחריות פעילה כרגע.")}</p>}
    {available.length>6?<button className="work-disclosure-link" onClick={()=>setShowAll(value=>!value)}>{showAll?pick("Show priorities only","הצגת עדיפויות בלבד"):pick(`View all ${available.length}`,`הצגת כל ${available.length}`)} <span>{showAll?"↑":"↓"}</span></button>:null}
    <footer>{pick(mode==="home"?"Home stays focused on the next seven days. Open Work for the complete list.":"Project, training, calendar, competition and robot responsibilities stay synchronized with their source.",mode==="home"?"מסך הבית מתמקד בשבעת הימים הקרובים. הרשימה המלאה נמצאת בעבודה.":"פרויקטים, הכשרות, יומן, תחרות ואחריות לרובוט מסונכרנים עם המקור שלהם.")}</footer>
  </section>;
}
