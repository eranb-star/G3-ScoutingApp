import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useMemberAuth } from "../lib/memberAuth";
import { useLocalization } from "../lib/localization";

type RecordRow = { id:string; member_id:string; meeting_id:string; checked_in_at:string; checked_out_at:string|null; check_in_method:string };
type Member = { id:string; display_name:string; subteam:string|null };
type Meeting = { id:string; title:string };
function hours(row: RecordRow) { return Math.max(0, ((row.checked_out_at ? new Date(row.checked_out_at) : new Date()).getTime() - new Date(row.checked_in_at).getTime()) / 3600000); }

export default function AttendanceReportsPage() {
  const { profile } = useMemberAuth();
  const { pick, language } = useLocalization();
  const isAdmin = profile?.role === "admin";
  const [period, setPeriod] = useState("month");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [members, setMembers] = useState<Record<string,Member>>({});
  const [meetings, setMeetings] = useState<Record<string,Meeting>>({});
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const from = useMemo(() => { const date=new Date(); if(period==="week") date.setDate(date.getDate()-7); else if(period==="quarter") date.setMonth(date.getMonth()-3); else date.setMonth(date.getMonth()-1); return date; },[period]);

  useEffect(() => {
    if(!profile) return;
    Promise.all([
      supabase.from("attendance_records").select("id,member_id,meeting_id,checked_in_at,checked_out_at,check_in_method").gte("checked_in_at",from.toISOString()).order("checked_in_at",{ascending:false}),
      isAdmin ? supabase.from("team_members").select("id,display_name,subteam").eq("active",true).order("display_name") : Promise.resolve({data:[{id:profile.id,display_name:profile.display_name,subteam:profile.subteam}]}),
      supabase.from("team_meetings").select("id,title").gte("ends_at",from.toISOString()),
    ]).then(([attendance,membersResult,meetingsResult])=>{
      setRecords((attendance.data??[]) as RecordRow[]);
      setMembers(Object.fromEntries(((membersResult.data??[]) as Member[]).map(m=>[m.id,m])));
      setMeetings(Object.fromEntries(((meetingsResult.data??[]) as Meeting[]).map(m=>[m.id,m])));
    });
  },[profile?.id,period,isAdmin,from]);

  const summary=useMemo(()=>Object.values(members).map(member=>{const memberRecords=records.filter(row=>row.member_id===member.id);return {member,records:memberRecords,sessions:memberRecords.length,hours:memberRecords.reduce((sum,row)=>sum+hours(row),0)};}).sort((a,b)=>b.hours-a.hours||a.member.display_name.localeCompare(b.member.display_name)),[records,members]);
  const totals=summary.reduce((sum,item)=>sum+item.hours,0);
  const detailMember=selectedMember ? members[selectedMember] : null;
  const detailRecords=selectedMember ? records.filter(row=>row.member_id===selectedMember) : [];
  const dateTime=new Intl.DateTimeFormat(language==="he"?"he-IL":"en-IL",{timeZone:"Asia/Jerusalem",dateStyle:"medium",timeStyle:"short"});
  function exportCsv(){const lines=[["Member","Subteam","Sessions","Hours"],...summary.map(item=>[item.member.display_name,item.member.subteam??"",String(item.sessions),item.hours.toFixed(2)])];const csv=lines.map(row=>row.map(value=>`"${value.replace(/"/g,'""')}"`).join(",")).join("\n");const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));link.download=`g3-attendance-${period}.csv`;link.click();URL.revokeObjectURL(link.href);}

  return <div className="hub-page"><header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Attendance analytics","ניתוח נוכחות")}</div><h1>{isAdmin?pick("Team reports","דוחות קבוצה"):pick("My attendance","הנוכחות שלי")}</h1><p>{pick("Select a member to review every session and verified workshop hour.","בחרו חבר/ת קבוצה כדי לראות כל מפגש ושעת סדנה מאומתת.")}</p></div><div className="report-actions"><select value={period} onChange={e=>{setPeriod(e.target.value);setSelectedMember(null);}}><option value="week">{pick("Last 7 days","7 הימים האחרונים")}</option><option value="month">{pick("Last month","החודש האחרון")}</option><option value="quarter">{pick("Last quarter","הרבעון האחרון")}</option></select>{isAdmin?<button className="hub-button" onClick={exportCsv}>{pick("Export CSV","ייצוא CSV")}</button>:null}</div></header><div className="admin-stat-grid"><article><strong>{records.length}</strong><span>{pick("Attendance records","רשומות נוכחות")}</span></article><article><strong>{totals.toFixed(1)}</strong><span>{pick("Total hours","סך שעות")}</span></article><article><strong>{summary.filter(item=>item.sessions>0).length}/{summary.length}</strong><span>{pick("Members attending","חברים שהשתתפו")}</span></article></div><section className="hub-card report-table"><div className="report-row report-heading"><span>{pick("Member","חבר/ת קבוצה")}</span><span>{pick("Sessions","מפגשים")}</span><span>{pick("Hours","שעות")}</span></div>{summary.map(item=><button type="button" className="report-row report-member-row" key={item.member.id} onClick={()=>setSelectedMember(item.member.id)}><span><strong>{item.member.display_name}</strong><small>{item.member.subteam??pick("No subteam","ללא תת־צוות")}</small></span><span>{item.sessions}</span><span>{item.hours.toFixed(1)}</span></button>)}</section>{detailMember?<section className="hub-card attendance-detail"><header><div><div className="hub-eyebrow">{pick("Individual report","דוח אישי")}</div><h2>{detailMember.display_name}</h2></div><button onClick={()=>setSelectedMember(null)} aria-label={pick("Close report","סגירת הדוח")}>×</button></header>{detailRecords.length===0?<p>{pick("No attendance was recorded for this member during the selected period.","לא נרשמה נוכחות לחבר/ת קבוצה זו בתקופה שנבחרה.")}</p>:detailRecords.map(row=><article key={row.id}><div><strong>{meetings[row.meeting_id]?.title??pick("Workshop session","מפגש סדנה")}</strong><span>{dateTime.format(new Date(row.checked_in_at))}</span></div><div><strong>{hours(row).toFixed(1)} {pick("hours","שעות")}</strong><span>{row.checked_out_at?pick("Completed","הושלם"):pick("Still checked in","עדיין בפנים")} · {row.check_in_method.replace("_"," ")}</span></div></article>)}</section>:null}</div>;
}
