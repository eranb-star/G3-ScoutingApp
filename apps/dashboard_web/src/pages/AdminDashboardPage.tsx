import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useLocalization } from "../lib/localization";

type OpenMeeting = { id: string; title: string; opened_at: string | null; starts_at: string };
type AttendanceRow = { id: string; member_id: string; checked_in_at: string; checked_out_at: string | null; check_in_method: string };
type MemberName = { id: string; display_name: string; subteam: string | null };

function elapsed(from: string, to?: string | null) {
  const minutes = Math.max(0, Math.floor(((to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function AdminDashboardPage() {
  const { pick } = useLocalization();
  const [meeting, setMeeting] = useState<OpenMeeting | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [members, setMembers] = useState<Record<string, MemberName>>({});
  const [title, setTitle] = useState("Open workshop");
  const [message, setMessage] = useState("");

  async function load() {
    const [{ data: meetings }, { data: memberRows }] = await Promise.all([
      supabase.from("team_meetings").select("id,title,opened_at,starts_at").eq("status", "open").order("opened_at", { ascending: false }).limit(1),
      supabase.from("team_members").select("id,display_name,subteam").eq("active", true),
    ]);
    const active = (meetings?.[0] ?? null) as OpenMeeting | null;
    setMeeting(active);
    setMembers(Object.fromEntries(((memberRows ?? []) as MemberName[]).map((member) => [member.id, member])));
    if (active) {
      const { data } = await supabase.from("attendance_records").select("id,member_id,checked_in_at,checked_out_at,check_in_method").eq("meeting_id", active.id).order("checked_in_at");
      setAttendance((data ?? []) as AttendanceRow[]);
    } else setAttendance([]);
  }

  useEffect(() => {
    void load();
    const channel = supabase.channel("admin-live-attendance").on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => void load()).subscribe();
    const timer = window.setInterval(() => setAttendance((rows) => [...rows]), 60000);
    return () => { void supabase.removeChannel(channel); window.clearInterval(timer); };
  }, []);

  async function openNow() {
    setMessage("");
    const { error } = await supabase.rpc("open_workshop_now", { session_title: title });
    setMessage(error?.message ?? "Workshop is now open for check-in.");
    if (!error) await load();
  }

  async function closeNow() {
    if (!meeting || !window.confirm("Close this workshop session? Members will no longer be able to check in or out.")) return;
    const { error } = await supabase.rpc("set_meeting_status", { meeting_id: meeting.id, next_status: "closed" });
    setMessage(error?.message ?? "Workshop session closed.");
    if (!error) await load();
  }

  async function correctAttendance(memberId: string, action: "check_in" | "check_out") {
    if (!meeting) return;
    const person = members[memberId]?.display_name ?? "this member";
    const reason = window.prompt(`Reason for manually ${action === "check_in" ? "checking in" : "checking out"} ${person}:`);
    if (!reason) return;
    if (reason.trim().length < 4) return setMessage("Please provide a meaningful correction reason.");
    const { error } = await supabase.rpc("admin_correct_attendance", { target_meeting: meeting.id, target_member: memberId, correction_action: action, correction_note: reason.trim() });
    setMessage(error?.message ?? `Attendance corrected for ${person}.`);
    if (!error) await load();
  }

  const present = attendance.filter((row) => !row.checked_out_at);
  return (
    <div className="hub-page web-admin-page web-admin-dashboard">
      <header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Administration · Live","ניהול · בזמן אמת")}</div><h1>{pick("Workshop dashboard","לוח בקרת הסדנה")}</h1><p>{pick("Run today’s workshop: open attendance, monitor who is present and correct active records without leaving this dashboard.","ניהול הסדנה של היום: פתיחת נוכחות, מעקב אחר הנוכחים ותיקון רשומות פעילות בלי לצאת מלוח הבקרה.")}</p></div><div className={`workshop-live-chip${meeting?" is-live":""}`}><span aria-hidden="true"/>{meeting?pick("Live session","מפגש פעיל"):pick("Ready to open","מוכן לפתיחה")}</div></header>
      <section className={`hub-card admin-live-banner${meeting ? " is-open" : ""}`}>
        <div><div className="hub-status-label">{meeting ? pick("WORKSHOP OPEN","הסדנה פתוחה") : pick("WORKSHOP CLOSED","הסדנה סגורה")}</div><h2>{meeting?.title ?? pick("No attendance session is open","אין מפגש נוכחות פתוח")}</h2><p>{meeting ? pick(`${present.length} members currently checked in`,`${present.length} חברים נמצאים כעת`) : pick("Open an ad-hoc session for members working outside regular meeting hours.","פתיחת מפגש מיוחד לחברים שעובדים מחוץ לשעות הקבועות.")}</p></div>
        {meeting ? <button className="admin-danger-button" onClick={closeNow}>{pick("Close workshop","סגירת הסדנה")}</button> : <div className="admin-open-controls"><input value={title} onChange={(e) => setTitle(e.target.value)} /><button className="hub-button" onClick={openNow}>{pick("Open workshop now","פתיחת הסדנה עכשיו")}</button></div>}
      </section>
      {message ? <div className="auth-message">{message}</div> : null}
      <div className="admin-stat-grid"><article><strong>{present.length}</strong><span>{pick("Present now","נמצאים כעת")}</span></article><article><strong>{attendance.length}</strong><span>{pick("Attended session","השתתפו במפגש")}</span></article><article><strong>{attendance.filter((row) => row.checked_out_at).length}</strong><span>{pick("Checked out","דיווחו יציאה")}</span></article></div>
      <section className="hub-card admin-presence-list">
        <h2>Live attendance</h2>
        {!meeting ? <p>Open a workshop session to begin attendance.</p> : attendance.length === 0 ? <p>No one has checked in yet.</p> : attendance.map((row) => {
          const member = members[row.member_id];
          return <article className="presence-row" key={row.id}><div className={`presence-dot${row.checked_out_at ? " is-out" : ""}`} /><div><strong>{member?.display_name ?? "Team member"}</strong><span>{member?.subteam ?? "No subteam"}</span></div><div><strong>{row.checked_out_at ? "Checked out" : "In workshop"}</strong><span>{elapsed(row.checked_in_at, row.checked_out_at)}</span></div>{!row.checked_out_at ? <button className="correction-button" onClick={() => correctAttendance(row.member_id,"check_out")}>Manual checkout</button> : null}</article>;
        })}
      </section>
      {meeting ? <section className="hub-card admin-presence-list"><h2>Not checked in</h2>{Object.values(members).filter((member) => !attendance.some((row) => row.member_id === member.id)).length === 0 ? <p>Every active member has an attendance record.</p> : Object.values(members).filter((member) => !attendance.some((row) => row.member_id === member.id)).map((member) => <article className="presence-row" key={member.id}><div className="presence-dot is-out" /><div><strong>{member.display_name}</strong><span>{member.subteam ?? "No subteam"}</span></div><span>Absent</span><button className="correction-button" onClick={() => correctAttendance(member.id,"check_in")}>Manual check-in</button></article>)}</section> : null}
    </div>
  );
}
