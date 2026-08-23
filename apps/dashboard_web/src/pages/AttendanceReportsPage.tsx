import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useMemberAuth } from "../lib/memberAuth";
import { useLocalization } from "../lib/localization";

type RecordRow = { id:string; member_id:string; meeting_id:string; checked_in_at:string; checked_out_at:string|null; check_in_method:string };
type Member = { id:string; display_name:string; subteam:string|null };

function hours(row: RecordRow) { return Math.max(0, ((row.checked_out_at ? new Date(row.checked_out_at) : new Date()).getTime() - new Date(row.checked_in_at).getTime()) / 3600000); }

export default function AttendanceReportsPage() {
  const { profile } = useMemberAuth();
  const { pick } = useLocalization();
  const isAdmin = profile?.role === "admin";
  const [period, setPeriod] = useState("month");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [members, setMembers] = useState<Record<string,Member>>({});
  const from = useMemo(() => { const date=new Date(); if(period==="week") date.setDate(date.getDate()-7); else if(period==="quarter") date.setMonth(date.getMonth()-3); else date.setMonth(date.getMonth()-1); return date; },[period]);

  useEffect(() => { if(!profile) return; Promise.all([
    supabase.from("attendance_records").select("id,member_id,meeting_id,checked_in_at,checked_out_at,check_in_method").gte("checked_in_at",from.toISOString()).order("checked_in_at",{ascending:false}),
    isAdmin ? supabase.from("team_members").select("id,display_name,subteam") : Promise.resolve({data:[{id:profile.id,display_name:profile.display_name,subteam:profile.subteam}]})
  ]).then(([attendance,membersResult])=>{setRecords((attendance.data??[]) as RecordRow[]);setMembers(Object.fromEntries(((membersResult.data??[]) as Member[]).map(m=>[m.id,m])));}); },[profile?.id,period]);

  const totals=useMemo(()=>Object.values(records.reduce((map,row)=>{const item=map[row.member_id]??{sessions:0,hours:0};item.sessions++;item.hours+=hours(row);map[row.member_id]=item;return map;},{} as Record<string,{sessions:number;hours:number}>)).reduce((sum,item)=>sum+item.hours,0),[records]);
  const grouped=useMemo(()=>Object.entries(records.reduce((map,row)=>{const item=map[row.member_id]??{sessions:0,hours:0};item.sessions++;item.hours+=hours(row);map[row.member_id]=item;return map;},{} as Record<string,{sessions:number;hours:number}>)).sort((a,b)=>b[1].hours-a[1].hours),[records]);

  function exportCsv(){const lines=[["Member","Subteam","Sessions","Hours"],...grouped.map(([id,item])=>[members[id]?.display_name??id,members[id]?.subteam??"",String(item.sessions),item.hours.toFixed(2)])];const csv=lines.map(row=>row.map(value=>`"${value.replace(/"/g,'""')}"`).join(",")).join("\n");const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));link.download=`g3-attendance-${period}.csv`;link.click();URL.revokeObjectURL(link.href);}
  return <div className="hub-page"><header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Attendance analytics","ניתוח נוכחות")}</div><h1>{isAdmin?pick("Team reports","דוחות קבוצה"):pick("My attendance","הנוכחות שלי")}</h1><p>{pick("Verified workshop sessions and accumulated hours.","מפגשי סדנה מאומתים ושעות מצטברות.")}</p></div><div className="report-actions"><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="week">{pick("Last 7 days","7 הימים האחרונים")}</option><option value="month">{pick("Last month","החודש האחרון")}</option><option value="quarter">{pick("Last quarter","הרבעון האחרון")}</option></select>{isAdmin?<button className="hub-button" onClick={exportCsv}>{pick("Export CSV","ייצוא CSV")}</button>:null}</div></header><div className="admin-stat-grid"><article><strong>{records.length}</strong><span>{pick("Attendance records","רשומות נוכחות")}</span></article><article><strong>{totals.toFixed(1)}</strong><span>{pick("Total hours","סך שעות")}</span></article><article><strong>{grouped.length}</strong><span>{isAdmin?pick("Participating members","חברים משתתפים"):pick("Periods attended","מפגשים שהשתתפתי")}</span></article></div><section className="hub-card report-table"><div className="report-row report-heading"><span>{pick("Member","חבר/ת קבוצה")}</span><span>{pick("Sessions","מפגשים")}</span><span>{pick("Hours","שעות")}</span></div>{grouped.length===0?<p>{pick("No attendance in this period.","אין נוכחות בתקופה זו.")}</p>:grouped.map(([id,item])=><div className="report-row" key={id}><span><strong>{members[id]?.display_name??pick("Team member","חבר/ת קבוצה")}</strong><small>{members[id]?.subteam??""}</small></span><span>{item.sessions}</span><span>{item.hours.toFixed(1)}</span></div>)}</section></div>;
}
