import {notifyProjectChange,useProjectRefresh} from "../lib/projectRefresh";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";
import {customReminderTime,reminderAfterDays,visibleResponsibilities} from "../lib/responsibilityVisibility";
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
  const {profile}=useMemberAuth(),{pick,language}=useLocalization(),navigate=useNavigate();
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
  const [deferId,setDeferId]=useState<string|null>(null),[customDate,setCustomDate]=useState('');
  const [busy,setBusy]=useState<string|null>(null),[deferredView,setDeferredView]=useState(false);
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const dateLabel=(value:string)=>new Date(value).toLocaleString(language==='he'?'he-IL':'en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  const personalRisks=risks.filter(r=>r.assigned_user_id===profile?.id&&r.signal_type==='CRITICAL_ROBOT_ISSUE');
  const riskFor=(action:Action)=>personalRisks.find(r=>action.source_table==='robot_issues'&&action.source_id===r.source_id);
  const available=useMemo(()=>{
    const ordinary=visibleResponsibilities(actions,states,mode,clock);
    if(mode!=='home')return ordinary;
    return mergeReadinessPriorities(actions,mergeOverdueTasks(actions,ordinary,overdueTasks,profile?.id),risks,profile?.id);
  },[actions,states,mode,risks,overdueTasks,profile?.id,clock]);

  const deferred=actions.filter(action=>states.some(state=>state.action_id===action.id&&state.status==='snoozed'&&Date.parse(state.snoozed_until??'')>clock)&&!available.some(item=>item.id===action.id));
  const list=deferredView?deferred:available;
  const limit=mode==='home'?4:6,visible=showAll?list:list.slice(0,limit);
  async function updateState(action:Action,status:string,snoozed_until?:string){
    if(!profile||busy||status==='completed'&&['project_tasks','project_task_collaborators'].includes(action.source_table??''))return;
    setBusy(action.id);setMessage('');
    try{
      const now=new Date().toISOString();
      const {error}=await supabase.from('team_action_states').upsert({action_id:action.id,member_id:profile.id,status,snoozed_until:snoozed_until??null,acknowledged_at:status==='acknowledged'?now:null,completed_at:status==='completed'?now:null,updated_at:now},{onConflict:'action_id,member_id'});
      if(error)throw error;
      setMessage(snoozed_until?pick('Reminder deferred until ','התזכורת נדחתה עד ')+dateLabel(snoozed_until):pick('Reminder updated. Task status is unchanged.','התזכורת עודכנה. סטטוס המשימה לא השתנה.'));
      setDeferId(null);await load();notifyProjectChange();
    }catch{setMessage(pick('Could not save. Please try again.','לא ניתן לשמור. נסו שוב.'));}
    finally{setBusy(null);}
  }
  return <section className={'hub-card home-action-inbox responsibility-inbox responsibility-'+mode} aria-labelledby={mode+'-responsibility-title'}>
    <header><div><div className="hub-eyebrow">{pick(mode==='home'?'Your priorities':'Personal command',mode==='home'?'סדר העדיפויות שלך':'מרכז אישי')}</div><h2 id={mode+'-responsibility-title'}>{pick(mode==='home'?'What needs you':'My responsibilities',mode==='home'?'מה דורש אותך':'האחריות שלי')}</h2></div><span aria-label={pick('Active reminders','תזכורות פעילות')}>{loading?'—':available.length}</span></header>
    {mode==='work'?<nav className="responsibility-filters" aria-label={pick('Reminder views','תצוגות תזכורות')}><button aria-pressed={!deferredView} onClick={()=>{setDeferredView(false);setShowAll(false);setDeferId(null);}}>{pick('Active','פעילות')} · {available.length}</button><button aria-pressed={deferredView} onClick={()=>{setDeferredView(true);setShowAll(false);setDeferId(null);}}>{pick('Deferred','נדחו')} · {deferred.length}</button></nav>:null}
    {message?<small className="action-message" role="status">{message}</small>:null}
    {loading?<div className="work-skeleton"/>:visible.length?visible.map(action=>{
      const state=states.find(item=>item.action_id===action.id),risk=riskFor(action);
      const task=['project_tasks','project_task_collaborators'].includes(action.source_table??'');
      const overdue=overdueTasks.find(t=>t.assignee_id===profile?.id&&task&&action.source_id===t.id);
      const protectedItem=Boolean(risk||overdue||action.id.startsWith('signal-')||action.id.startsWith('overdue-'));
      return <article className={'priority-'+(risk?'urgent':action.priority)} key={action.id}>
        <button className="responsibility-open" onClick={()=>navigate(action.destination||"/work")}>
          <span>{risk?pick('Critical robot issue','תקלה קריטית ברובוט'):task?pick('Assigned task','משימה באחריותך'):action.action_type==='meeting'?pick('Meeting','מפגש'):action.action_type.replaceAll('_',' ')}</span>
          <strong dir="auto">{action.title}</strong>
          {action.due_at?<time dateTime={action.due_at}>{dateLabel(action.due_at)}</time>:null}
          {overdue?<small>{overdueLabel(overdue,pick)}</small>:null}
        </button>
        <div className="responsibility-actions"><div className="responsibility-action-buttons">
          {deferredView?<button className="secondary" disabled={Boolean(busy)} onClick={()=>void updateState(action,'acknowledged')}>{pick('Bring back','החזרה לפעילות')}</button>:task?<button className="responsibility-primary" onClick={()=>navigate(action.destination||'/projects')}>{pick('Open task','פתיחת משימה')}</button>:!protectedItem?<button disabled={Boolean(busy)} onClick={()=>void updateState(action,'completed')}>{pick('Dismiss reminder','סגירת תזכורת')}</button>:null}
          {!protectedItem?<button className="secondary" disabled={Boolean(busy)} aria-expanded={deferId===action.id} aria-controls={'defer-'+action.id} onClick={()=>{setDeferId(deferId===action.id?null:action.id);setCustomDate('');}}>{pick('Remind me later','הזכירו לי מאוחר יותר')}</button>:null}
        </div>{protectedItem?<small>{pick('Resolve in the source record to clear this alert.','יש לטפל ברשומת המקור להסרת ההתראה.')}</small>:null}</div>
        {deferredView&&state?.snoozed_until?<small className="responsibility-deferred-date">{pick('Returns','יופיע שוב')}: {dateLabel(state.snoozed_until)}</small>:null}
        {action.details||(!state||state.status==='new')&&!protectedItem?<details className="responsibility-details"><summary>{pick('Details','פרטים')}</summary><p dir="auto">{action.details?.replace('Absence for (Israel):',pick('Absence for (Israel):','היעדרות עבור (שעון ישראל):')).replace(' · CANCELLED',pick(' · CANCELLED',' · בוטל'))}</p>{(!state||state.status==='new')&&!protectedItem?<button className="secondary" disabled={Boolean(busy)} onClick={()=>void updateState(action,'acknowledged')}>{pick('Acknowledge','אישור קבלה')}</button>:null}</details>:null}
        {deferId===action.id?<div className="responsibility-defer" id={'defer-'+action.id}>
          <strong>{pick('When should this reminder return?','מתי להציג שוב את התזכורת?')}</strong>
          <p>{pick('Only your reminder is deferred. Event dates and task deadlines stay unchanged. Times use your device’s time zone.','רק התזכורת האישית נדחית. תאריכי האירוע והמשימה אינם משתנים. השעות לפי אזור הזמן של המכשיר.')}</p>
          <div className="responsibility-presets">{[[1,'Tomorrow','מחר'],[3,'In 3 days','בעוד 3 ימים'],[7,'In a week','בעוד שבוע'],[14,'In 2 weeks','בעוד שבועיים'],[30,'In 30 days','בעוד 30 ימים']].map(([days,en,he])=><button key={days} className="secondary" disabled={Boolean(busy)} onClick={()=>void updateState(action,'snoozed',reminderAfterDays(Number(days)))}>{pick(String(en),String(he))}</button>)}</div>
          <form onSubmit={event=>{event.preventDefault();const target=customReminderTime(customDate);if(!target){setMessage(pick('Choose a future date and time.','בחרו תאריך ושעה בעתיד.'));return;}void updateState(action,'snoozed',target);}}>
            <label>{pick('Choose date and time','בחירת תאריך ושעה')}<input type="datetime-local" required value={customDate} onChange={event=>setCustomDate(event.target.value)}/></label>
            <button disabled={Boolean(busy)} type="submit">{pick('Defer reminder','דחיית התזכורת')}</button><button className="secondary" type="button" onClick={()=>setDeferId(null)}>{pick('Cancel','ביטול')}</button>
          </form>
        </div>:null}
      </article>;
    }):<p>{deferredView?pick('No deferred reminders.','אין תזכורות שנדחו.'):pick(mode==='home'?'Nothing needs your attention in the next seven days.':'You have no active responsibilities.',mode==='home'?'אין פעולות הדורשות את תשומת לבכם בשבעת הימים הקרובים.':'אין לכם אחריות פעילה כרגע.')}</p>}
    {list.length>limit?<button className="work-disclosure-link" onClick={()=>setShowAll(value=>!value)}>{showAll?pick('Show fewer','הצגת פחות'):pick('View all '+list.length,'הצגת כל '+list.length)} {showAll?'↑':'↓'}</button>:null}
    <footer>{mode==='home'?<>{pick('Upcoming meetings: next seven days. Urgent work may appear earlier.','מפגשים קרובים: שבעת הימים הבאים. משימות דחופות עשויות להופיע מוקדם יותר.')} <button className="secondary" onClick={()=>navigate('/work')}>{pick('All reminders & deferred items','כל התזכורות והפריטים שנדחו')} →</button></>:pick('Reminder controls only affect your personal list. Open an item to update its actual status.','פעולות התזכורת משפיעות רק על הרשימה האישית. פתחו פריט כדי לעדכן את הסטטוס שלו.')}</footer>
  </section>;
}
