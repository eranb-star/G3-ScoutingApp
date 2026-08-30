import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useMemberAuth } from "../lib/memberAuth";
import { registerPlugin } from "@capacitor/core";
import { useLocalization } from "../lib/localization";

const WifiInfo = registerPlugin<{ getCurrentNetwork(): Promise<{ ssid: string }> }>("WifiInfo");

type TeamMeeting = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "open" | "closed" | "cancelled";
  meeting_type: string;
};

const israelDateTime = new Intl.DateTimeFormat("en-IL", {
  timeZone: "Asia/Jerusalem", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});
const israelCalendarDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" });

function isMeetingWindowAvailable(meeting: Pick<TeamMeeting,"starts_at"|"ends_at">, now = new Date()) {
  const starts = new Date(meeting.starts_at);
  const ends = new Date(meeting.ends_at);
  return israelCalendarDay.format(starts) === israelCalendarDay.format(now)
    && now.getTime() >= starts.getTime() - 60 * 60 * 1000
    && now.getTime() <= ends.getTime();
}

type ActionCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  tone?: "pink" | "dark" | "plain";
};

function ActionCard({ eyebrow, title, body, action, onClick, tone = "plain" }: ActionCardProps) {
  return (
    <article className={`hub-card hub-action-card hub-tone-${tone}`}>
      <div className="hub-eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" className="hub-button" onClick={onClick}>
        {action}
      </button>
    </article>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="hub-empty">
      <div className="hub-empty-mark" aria-hidden="true">G3</div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function HomePage({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const { pick } = useLocalization();
  const { profile } = useMemberAuth();
  const [activeMeeting, setActiveMeeting] = useState<TeamMeeting | null>(null);
  const [nextMeeting, setNextMeeting] = useState<TeamMeeting | null>(null);
  const [openTasks, setOpenTasks] = useState(0);
  const competitionSeason = new Date().getMonth() <= 4;

  useEffect(() => {
    const now = new Date().toISOString();
    Promise.all([
      supabase.from("team_meetings").select("id,title,starts_at,ends_at,status,meeting_type").eq("status", "open").lte("starts_at", now).gte("ends_at", now).order("starts_at").limit(1),
      supabase.from("team_meetings").select("id,title,starts_at,ends_at,status,meeting_type").eq("status", "scheduled").gt("starts_at", now).order("starts_at").limit(1),
      supabase.from("project_tasks").select("id", { count: "exact", head: true }).neq("status", "done").eq("archived", false),
    ]).then(([openResult, nextResult, taskResult]) => {
      setActiveMeeting((openResult.data?.[0] ?? null) as TeamMeeting | null);
      setNextMeeting((nextResult.data?.[0] ?? null) as TeamMeeting | null);
      setOpenTasks(taskResult.count ?? 0);
    });
  }, [profile?.id]);

  return (
    <div className="hub-page">
      <section className="hub-hero">
        <div>
          <div className="hub-eyebrow">Glue Gun &amp; Glitter · Team Hub</div>
          <h1>{pick("One team. One place.","קבוצה אחת. מקום אחד.")}</h1>
          <p>{pick("Meetings, attendance, communication and competition operations—connected around the people building G3.","פגישות, נוכחות, תקשורת ותפעול תחרויות — מחוברים סביב האנשים שבונים את G3.")}</p>
        </div>
        <img src="/logoG3.png" alt="Glue Gun and Glitter G3" className="hub-hero-logo" />
      </section>

      <section className="hub-now" aria-label="Current team status">
        <div className="hub-live-dot" aria-hidden="true" />
        <div>
          <strong>{activeMeeting ? pick(`${activeMeeting.title} is open`, `${activeMeeting.title} פתוח`) : pick("Workshop check-in is offline", "דיווח הנוכחות לסדנה אינו פעיל")}</strong>
          <span>{activeMeeting ? pick("Use the center button to check in or out.", "השתמשו בכפתור המרכזי לדיווח כניסה או יציאה.") : nextMeeting ? `${pick("Next:", "הבא:")} ${nextMeeting.title} · ${israelDateTime.format(new Date(nextMeeting.starts_at))}` : pick("Open the schedule for upcoming team activity.", "פתחו את לוח הזמנים לפעילות הקבוצה הקרובה.")}</span>
        </div>
        {activeMeeting ? <button className="hub-button hub-now-action" onClick={() => navigate("/check-in")}>{pick("Check in", "כניסה")}</button> : null}
        {isAdmin ? <span className="hub-role-chip">ADMIN</span> : null}
      </section>

      <div className="hub-card-grid">
        <ActionCard
          eyebrow={pick("Team calendar","יומן הקבוצה")}
          title={pick("Schedule","לוח זמנים")}
          body={pick("See workdays, subteam meetings, competitions and deadlines.","ימי עבודה, מפגשי תתי־קבוצות, תחרויות ומועדי יעד.")}
          action={pick("Open schedule","פתיחת לוח הזמנים")}
          onClick={() => navigate("/schedule")}
          tone="plain"
        />
        <ActionCard
          eyebrow={pick("FRC build operations","תפעול בניית FRC")}
          title={pick("Work","עבודה")}
          body={pick(`${openTasks} open tasks across robot subsystems and team projects.`, `${openTasks} משימות פתוחות במערכות הרובוט ובפרויקטי הקבוצה.`)}
          action={pick("Open workspace","פתיחת מרחב העבודה")}
          onClick={() => navigate("/work")}
          tone="pink"
        />
        <ActionCard
          eyebrow={competitionSeason ? pick("FRC competition season", "עונת תחרויות FRC") : pick("FRC competition archive", "ארכיון תחרויות FRC")}
          title={pick("Competition","תחרות")}
          body={competitionSeason ? pick("Scouting, match readiness, strategy and alliance tools are ready.", "סקאוטינג, מוכנות למשחק, אסטרטגיה וכלי בריתות מוכנים.") : pick("Scouting, analysis and previous event knowledge remain available here.", "סקאוטינג, ניתוח וידע מאירועים קודמים זמינים כאן.")}
          action={pick("Enter competition mode","כניסה למצב תחרות")}
          onClick={() => navigate("/competition")}
          tone="dark"
        />
      </div>
    </div>
  );
}

export function SchedulePage() {
  const { pick, language } = useLocalization();
  const { profile } = useMemberAuth();
  const isAdmin = profile?.role === "admin";
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("Special workshop meeting");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function loadMeetings() {
    setLoading(true);
    await supabase.rpc("ensure_workshop_schedule", { days_ahead: 120 });
    const { data, error } = await supabase.from("team_meetings")
      .select("id,title,starts_at,ends_at,status,meeting_type")
      .gte("ends_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq("status", "cancelled").order("starts_at").limit(30);
    setMessage(error?.message ?? "");
    setMeetings((data ?? []) as TeamMeeting[]);
    setLoading(false);
  }

  useEffect(() => { void loadMeetings(); }, []);

  async function setStatus(id: string, status: TeamMeeting["status"]) {
    const { error } = await supabase.rpc("set_meeting_status", { meeting_id: id, next_status: status });
    setMessage(error?.message ?? "");
    if (!error) await loadMeetings();
  }

  async function createSpecial(event: FormEvent) {
    event.preventDefault();
    if (!profile || !start || !end) return;
    const startsAt = new Date(start);
    const endsAt = new Date(end);
    if (endsAt <= startsAt) return setMessage("End time must be after start time.");
    const { error } = await supabase.from("team_meetings").insert({
      title: title.trim(), meeting_date: start.slice(0, 10), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
      meeting_type: "special", status: "scheduled", created_by: profile.id,
    });
    setMessage(error?.message ?? "Meeting created.");
    if (!error) { setShowCreate(false); setStart(""); setEnd(""); await loadMeetings(); }
  }

  return (
    <div className="hub-page">
      <header className="hub-page-header">
        <div><div className="hub-eyebrow">{pick("Team calendar · Israel time","יומן הקבוצה · שעון ישראל")}</div><h1>{pick("Schedule","לוח זמנים")}</h1><p>{pick("Regular workshops every Sunday and Wednesday, 16:00–19:00.","מפגשי סדנה קבועים בימי ראשון ורביעי, 16:00–19:00.")}</p></div>
        {isAdmin ? <button className="hub-button" onClick={() => setShowCreate((value) => !value)}>{pick("Add special meeting","הוספת מפגש מיוחד")}</button> : null}
      </header>
      {showCreate ? <form className="hub-card schedule-create" onSubmit={createSpecial}>
        <label>{pick("Meeting name","שם המפגש")}<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>{pick("Starts","התחלה")}<input required type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>{pick("Ends","סיום")}<input required type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <button className="hub-button">{pick("Create meeting","יצירת מפגש")}</button>
      </form> : null}
      {message ? <div className="auth-message">{message}</div> : null}
      <section className="hub-card schedule-list">
        {loading ? <p>{pick("Loading schedule…","טוען לוח זמנים…")}</p> : meetings.length === 0 ? <EmptyState title={pick("No upcoming meetings","אין מפגשים קרובים")} body={pick("The recurring workshop schedule could not be loaded.","לא ניתן לטעון את לוח מפגשי הסדנה.")} /> : meetings.map((meeting) => (
          <article className="schedule-row" key={meeting.id}>
            <div className={`schedule-date status-${meeting.status}`}><strong>{israelDateTime.format(new Date(meeting.starts_at)).split(",")[0]}</strong><span>{new Intl.DateTimeFormat("en-IL", {timeZone:"Asia/Jerusalem",day:"2-digit",month:"2-digit"}).format(new Date(meeting.starts_at))}</span></div>
            <div className="schedule-info"><strong>{meeting.title}</strong><span>{new Intl.DateTimeFormat(language==="he"?"he-IL":"en-IL", {timeZone:"Asia/Jerusalem",weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(meeting.starts_at))}–{new Intl.DateTimeFormat(language==="he"?"he-IL":"en-IL", {timeZone:"Asia/Jerusalem",hour:"2-digit",minute:"2-digit"}).format(new Date(meeting.ends_at))}</span><small>{meeting.meeting_type} · {meeting.status}</small></div>
            {isAdmin ? <div className="schedule-actions">{meeting.status !== "open" ? <button onClick={() => setStatus(meeting.id, "open")}>{pick("Open","פתיחה")}</button> : <button onClick={() => setStatus(meeting.id, "closed")}>{pick("Close","סגירה")}</button>}<button onClick={() => setStatus(meeting.id, "cancelled")}>{pick("Cancel","ביטול")}</button></div> : null}
          </article>
        ))}
      </section>
    </div>
  );
}

export function CheckInPage() {
  const { pick } = useLocalization();
  const { profile } = useMemberAuth();
  const [activeMeeting, setActiveMeeting] = useState<TeamMeeting | null>(null);
  const [attendance, setAttendance] = useState<{ checked_in_at: string; checked_out_at: string | null } | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [locationConfigured, setLocationConfigured] = useState<boolean | null>(null);
  const [nextMeeting, setNextMeeting] = useState<TeamMeeting | null>(null);

  async function loadAttendance(meeting: TeamMeeting | null) {
    if (!meeting || !profile) { setAttendance(null); return; }
    const { data } = await supabase.from("attendance_records").select("checked_in_at,checked_out_at").eq("meeting_id", meeting.id).eq("member_id", profile.id).maybeSingle();
    setAttendance(data as typeof attendance);
  }

  useEffect(() => {
    const currentTime = new Date();
    const now = currentTime.toISOString();
    Promise.all([
      supabase.from("team_meetings").select("id,title,starts_at,ends_at,status,meeting_type").eq("status", "open").order("opened_at", { ascending: false }),
      supabase.from("team_meetings").select("id,title,starts_at,ends_at,status,meeting_type").in("status", ["scheduled","open"]).gt("starts_at", now).order("starts_at").limit(1),
    ]).then(([openResult, nextResult]) => {
      const meeting = ((openResult.data ?? []) as TeamMeeting[]).find(item => isMeetingWindowAvailable(item, currentTime)) ?? null;
      setActiveMeeting(meeting);
      setNextMeeting((nextResult.data?.[0] ?? null) as TeamMeeting | null);
      void loadAttendance(meeting);
    });
    if (profile?.role === "admin") supabase.from("workshop_locations").select("id").eq("active", true).maybeSingle().then(({ data }) => setLocationConfigured(Boolean(data)));
  }, [profile?.id]);

  async function verifyAndRecord(action: "open_workshop" | "check_in" | "check_out") {
    if (action !== "open_workshop" && !activeMeeting) return;
    setWorking(true); setMessage("Requesting one precise location reading…");
    const submit = async (verification: "location" | "wifi", details: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("attendance", { body: { action, meetingId: activeMeeting?.id, verification, ...details } });
      if (error || data?.error) {
        const functionContext = (error as { context?: Response } | null)?.context;
        let reason = data?.error as string | undefined;
        if (!reason && functionContext) {
          try { reason = (await functionContext.clone().json())?.error; } catch { /* friendly fallback below */ }
        }
        setMessage(reason || pick("Check-in could not be completed. Confirm that you are at Shvilim High School and try again.","לא ניתן להשלים את דיווח הנוכחות. ודאו שאתם נמצאים בשטח תיכון שבילים ונסו שוב."));
      }
      else if (action === "open_workshop") {
        const opened = data.meeting as TeamMeeting;
        setActiveMeeting(opened);
        setMessage(data.alreadyOpen ? "A workshop session is already open." : "Workshop opened. You can now check in.");
        await loadAttendance(opened);
      } else { setMessage(action === "check_in" ? "Checked in successfully." : "Checked out successfully."); await loadAttendance(activeMeeting); window.dispatchEvent(new Event("g3-attendance-changed")); }
      setWorking(false);
    };
    const tryWifiFallback = async () => {
      setMessage("GPS unavailable. Checking the trusted workshop Wi-Fi…");
      try { const { ssid } = await WifiInfo.getCurrentNetwork(); await submit("wifi", { ssid }); }
      catch { setMessage("GPS is unavailable and the trusted workshop Wi-Fi could not be verified."); setWorking(false); }
    };
    if (!navigator.geolocation) return void tryWifiFallback();
    navigator.geolocation.getCurrentPosition(
      (position) => void submit("location", { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      () => void tryWifiFallback(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }
  return (
    <div className="hub-page">
      <header className="hub-page-header">
        <div><div className="hub-eyebrow">{pick("Attendance","נוכחות")}</div><h1>{pick("Check in","דיווח כניסה")}</h1><p>{pick("Your location is checked only when you press the button.","המיקום נבדק רק כאשר לוחצים על הכפתור.")}</p></div>
      </header>
      <section className="hub-card hub-checkin-card">
        <div className="hub-location-ring" aria-hidden="true"><span /></div>
        <div>
          <div className="hub-status-label">{activeMeeting ? pick("MEETING OPEN","המפגש פתוח") : pick("NO ACTIVE MEETING","אין מפגש פעיל")}</div>
          <h2>{activeMeeting ? activeMeeting.title : pick("Workshop check-in is currently offline","דיווח הנוכחות לסדנה אינו פעיל כרגע")}</h2>
          {!activeMeeting && nextMeeting ? <p className="next-meeting-note"><strong>{pick("Next scheduled meeting:","המפגש המתוכנן הבא:")}</strong> {nextMeeting.title} · {israelDateTime.format(new Date(nextMeeting.starts_at))}. {pick("If you are at school for unscheduled work, you may open an ad-hoc session below.","אם אתם בבית הספר לעבודה שלא תוכננה מראש, ניתן לפתוח מפגש מיוחד למטה.")}</p> : null}
          <p>{pick("The app requests one location reading, verifies that you are at the workshop, and discards the raw coordinates.","האפליקציה מבקשת קריאת מיקום אחת, מאמתת שאתם בסדנה ומוחקת את הקואורדינטות הגולמיות.")}</p>
          {attendance ? <div className="attendance-current"><strong>{attendance.checked_out_at ? "Attendance complete" : "Currently checked in"}</strong><span>Arrived {israelDateTime.format(new Date(attendance.checked_in_at))}{attendance.checked_out_at ? ` · Left ${israelDateTime.format(new Date(attendance.checked_out_at))}` : ""}</span></div> : null}
          <button type="button" className="hub-button" disabled={working || Boolean(attendance?.checked_out_at)} onClick={() => verifyAndRecord(activeMeeting ? attendance ? "check_out" : "check_in" : "open_workshop")}>{working ? pick("Verifying location…","מאמת מיקום…") : attendance ? pick("Verify location and check out","אימות מיקום ודיווח יציאה") : activeMeeting ? pick("Verify location and check in","אימות מיקום ודיווח כניסה") : pick("I'm at Shvilim — open an ad-hoc session","אני בשבילים — פתיחת מפגש מיוחד")}</button>
          {message ? <div className="auth-message">{message}</div> : null}
          {profile?.role === "admin" && locationConfigured === false ? <div className="auth-message auth-error">Administrator setup required: workshop coordinates are not configured yet.</div> : null}
        </div>
      </section>
      <div className="hub-privacy-note"><strong>{pick("Privacy by design","פרטיות כברירת מחדל")}</strong><span>{pick("No background tracking. No location history. Admin corrections require a reason and are audited.","אין מעקב ברקע ואין היסטוריית מיקום. תיקוני מנהל דורשים סיבה ונרשמים ביומן ביקורת.")}</span></div>
    </div>
  );
}

export function MessagesPage() {
  const { pick } = useLocalization();
  const navigate = useNavigate();
  const { profile } = useMemberAuth();
  const [announcements, setAnnouncements] = useState<Array<{id:string;title:string;body:string;priority:string;published_at:string;meeting_id:string|null;archived:boolean}>>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [audience, setAudience] = useState("all");
  const [audienceSubteam, setAudienceSubteam] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [messageMeetings, setMessageMeetings] = useState<TeamMeeting[]>([]);
  const [message, setMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  async function loadMessages() {
    if (!profile) return;
    let announcementsQuery = supabase.from("announcements").select("id,title,body,priority,published_at,meeting_id,archived").order("published_at", { ascending: false });
    announcementsQuery = announcementsQuery.eq("archived", profile.role === "admin" ? showArchived : false);
    const [{ data }, { data: receipts }] = await Promise.all([
      announcementsQuery,
      supabase.from("announcement_reads").select("announcement_id").eq("member_id", profile.id),
    ]);
    setAnnouncements((data ?? []) as typeof announcements);
    setReadIds(new Set((receipts ?? []).map((row) => row.announcement_id as string)));
  }
  useEffect(() => {
    void loadMessages();
    supabase.from("team_meetings").select("id,title,starts_at,ends_at,status,meeting_type").gte("ends_at", new Date().toISOString()).order("starts_at").limit(20).then(({data}) => setMessageMeetings((data ?? []) as TeamMeeting[]));
  }, [profile?.id, showArchived]);

  async function markRead(id: string) {
    if (!profile || readIds.has(id)) return;
    await supabase.from("announcement_reads").upsert({ announcement_id: id, member_id: profile.id });
    setReadIds((current) => new Set(current).add(id));
    window.dispatchEvent(new Event("g3-announcements-changed"));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const { data: announcement, error } = await supabase.from("announcements").insert({ title: title.trim(), body: body.trim(), priority, audience, audience_subteam: audience === "subteam" ? audienceSubteam.trim() : null, meeting_id: meetingId || null, created_by: profile.id }).select("id").single();
    if (error || !announcement) { setMessage(error?.message ?? "Announcement could not be published."); return; }
    const { data: delivery, error: pushError } = await supabase.functions.invoke("send-push", { body: { announcementId: announcement.id } });
    const delivered = typeof delivery?.delivered === "number" ? delivery.delivered : 0;
    setMessage(pushError ? pick("Announcement published. Push delivery could not be completed.","ההודעה פורסמה, אך שליחת ההתראה לא הושלמה.") : pick(`Announcement published. ${delivered} push notification${delivered === 1 ? "" : "s"} delivered.`,`ההודעה פורסמה. נשלחו ${delivered} התראות.`));
    setTitle(""); setBody(""); setPriority("normal"); setAudience("all"); setAudienceSubteam(""); setMeetingId(""); setShowCompose(false); await loadMessages(); window.dispatchEvent(new Event("g3-announcements-changed"));
  }
  async function archiveAnnouncement(id: string) {
    if (!window.confirm(pick("Archive this announcement? Team members will no longer see it.","להעביר את ההודעה לארכיון? חברי הקבוצה לא יראו אותה יותר."))) return;
    const { error } = await supabase.from("announcements").update({ archived: true }).eq("id", id);
    setMessage(error?.message ?? pick("Announcement archived.","ההודעה הועברה לארכיון."));
    if (!error) { await loadMessages(); window.dispatchEvent(new Event("g3-announcements-changed")); }
  }
  async function deleteAnnouncement(id: string) {
    if (!window.confirm(pick("Permanently delete this announcement? This cannot be undone.","למחוק את ההודעה לצמיתות? לא ניתן לבטל פעולה זו."))) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    setMessage(error?.message ?? pick("Announcement deleted.","ההודעה נמחקה."));
    if (!error) { await loadMessages(); window.dispatchEvent(new Event("g3-announcements-changed")); }
  }
  return (
    <div className="hub-page">
      <header className="hub-page-header">
        <div><div className="hub-eyebrow">{pick("Communication","תקשורת")}</div><h1>{pick("Announcements","הודעות")}</h1><p>{pick("Team updates, important notices and event information.","עדכוני קבוצה, הודעות חשובות ומידע על אירועים.")}</p></div>
        {profile?.role === "admin" ? <div className="message-header-actions"><button className="hub-button secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived?pick("Current announcements","הודעות פעילות"):pick("Archive","ארכיון")}</button><button className="hub-button" onClick={() => setShowCompose((value) => !value)}>{pick("New announcement","הודעה חדשה")}</button></div> : null}
      </header>
      {showCompose ? <form className="hub-card announcement-compose" onSubmit={publish}><label>{pick("Title","כותרת")}<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>{pick("Message","תוכן ההודעה")}<textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></label><div className="announcement-options"><label>{pick("Audience","קהל יעד")}<select value={audience} onChange={(e) => setAudience(e.target.value)}><option value="all">{pick("Entire team","כל הקבוצה")}</option><option value="members">{pick("Members","חברי קבוצה")}</option><option value="mentors">{pick("Mentors","מנטורים")}</option><option value="admins">{pick("Administrators","מנהלים")}</option><option value="subteam">{pick("Specific subteam","תת־צוות מסוים")}</option></select></label>{audience === "subteam" ? <label>{pick("Subteam","תת־צוות")}<input required value={audienceSubteam} onChange={(e) => setAudienceSubteam(e.target.value)} placeholder={pick("Software","תוכנה")} /></label> : null}<label>{pick("Related meeting","מפגש קשור")}<select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}><option value="">{pick("None","ללא")}</option>{messageMeetings.map((meeting) => <option value={meeting.id} key={meeting.id}>{meeting.title} · {israelDateTime.format(new Date(meeting.starts_at))}</option>)}</select></label><label>{pick("Priority","עדיפות")}<select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="normal">{pick("Normal","רגילה")}</option><option value="important">{pick("Important","חשובה")}</option><option value="urgent">{pick("Urgent","דחופה")}</option></select></label></div><button className="hub-button">{pick("Publish announcement","פרסום הודעה")}</button></form> : null}
      {message ? <div className="auth-message">{message}</div> : null}
      <div className="announcement-list">{announcements.length === 0 ? <div className="hub-card"><EmptyState title={showArchived?pick("Archive is empty","הארכיון ריק"):pick("No announcements yet","אין עדיין הודעות")} body={showArchived?pick("Archived announcements will appear here.","הודעות שהועברו לארכיון יופיעו כאן."):pick("New team and event announcements will appear here.","הודעות קבוצה ואירועים חדשות יופיעו כאן.")} /></div> : announcements.map((announcement) => <article className={`hub-card announcement-card priority-${announcement.priority}${readIds.has(announcement.id) ? " is-read" : ""}`} key={announcement.id} onClick={() => markRead(announcement.id)}><div className="announcement-meta"><span>{announcement.priority}</span><time>{israelDateTime.format(new Date(announcement.published_at))}</time>{!announcement.archived&&!readIds.has(announcement.id) ? <i>{pick("NEW","חדש")}</i> : null}</div><h2>{announcement.title}</h2><p>{announcement.body}</p><div className="announcement-actions">{announcement.meeting_id ? <button className="announcement-link" onClick={(event) => { event.stopPropagation(); navigate("/schedule"); }}>{pick("View related meeting →","צפייה במפגש הקשור ←")}</button> : null}{profile?.role === "admin" ? <>{!announcement.archived?<button onClick={(event) => { event.stopPropagation(); void archiveAnnouncement(announcement.id); }}>{pick("Archive","ארכיון")}</button>:null}<button className="danger-link" onClick={(event) => { event.stopPropagation(); void deleteAnnouncement(announcement.id); }}>{pick("Delete","מחיקה")}</button></> : null}</div></article>)}</div>
    </div>
  );
}

export function MorePage({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const { t, pick } = useLocalization();
  const rows = [
    [t("attendance"), pick("Personal history and verified workshop hours","היסטוריה אישית ושעות סדנה מאומתות"), "/attendance"],
    [t("profile"), pick("Team directory, roles and subteams","ספר חברי הקבוצה, תפקידים ותתי־צוותים"), "/profile"],
    [t("settings"), pick("Language, notifications, privacy and account","שפה, התראות, פרטיות וחשבון"), "/settings"],
  ];

  return (
    <div className="hub-page">
      <header className="hub-page-header">
        <div><div className="hub-eyebrow">{t("teamHub")}</div><h1>{t("more")}</h1><p>{t("moreTitle")}</p></div>
      </header>
      <div className="hub-list-card">
        {rows.map(([title, subtitle, path]) => (
          <button type="button" className="hub-list-row" key={title} onClick={() => navigate(path)}>
            <span><strong>{title}</strong><small>{subtitle}</small></span><span aria-hidden="true">→</span>
          </button>
        ))}
        {isAdmin ? (
          <button type="button" className="hub-list-row hub-admin-row" onClick={() => navigate("/admin/members")}>
            <span><strong>{t("administration")}</strong><small>{pick("Attendance dashboard, reports and team controls","לוח נוכחות, דוחות ובקרות קבוצה")}</small></span><span className="hub-role-chip">ADMIN</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CompetitionPage({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const { pick } = useLocalization();
  return (
    <div className="hub-page">
      <section className="hub-competition-hero">
        <div><div className="hub-eyebrow">{pick("FRC competition operations","תפעול תחרות FRC")}</div><h1>{pick("Competition","תחרות")}</h1><p>{pick("The proven scouting workflow remains intact inside the Team Hub.","תהליך הסקאוטינג המוכח נשמר במלואו בתוך מרכז הקבוצה.")}</p></div>
        <img src="/logoG3.png" alt="Glue Gun and Glitter G3" />
      </section>
      <div className="hub-card-grid">
        <ActionCard eyebrow={pick("Match data","נתוני משחק")} title={pick("Scouting","סקאוטינג")} body={pick("Offline-first scouting forms, match selection and automatic synchronization.","טפסי סקאוטינג אופליין, בחירת משחקים וסנכרון אוטומטי.")} action={pick("Start scouting","התחלת סקאוטינג")} onClick={() => navigate("/scouting")} tone="pink" />
        <ActionCard eyebrow={pick("Strategy","אסטרטגיה")} title={pick("Analysis","ניתוח")} body={pick("Team rankings, defense impact, reliability and detailed breakdowns.","דירוגי קבוצות, השפעת הגנה, אמינות וניתוחים מפורטים.")} action={pick("Open analysis","פתיחת ניתוח")} onClick={() => navigate("/analysis")} />
        {isAdmin ? <ActionCard eyebrow={pick("Admin strategy","אסטרטגיית מנהלים")} title={pick("Picklist & alliances","רשימת בחירה ובריתות")} body={pick("Decision center, comparisons, saved alliances and TBA tools.","מרכז החלטות, השוואות, בריתות שמורות וכלי TBA.")} action={pick("Open picklist","פתיחת רשימת בחירה")} onClick={() => navigate("/analysis/picklist")} tone="dark" /> : null}
      </div>
    </div>
  );
}
