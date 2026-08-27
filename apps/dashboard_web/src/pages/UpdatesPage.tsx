import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";
import { useAdminStatus } from "../lib/useAdminStatus";

type View = "inbox" | "announcements" | "channels" | "knowledge";
type Announcement = { id: string; title: string; body: string; priority: string; published_at: string; archived: boolean };
type Channel = { id: string; name: string; name_he: string | null; description: string | null; kind: string; subteam: string | null };
type ChannelMessage = { id: string; channel_id: string; body: string; created_at: string; author_id: string; team_members?: { display_name?: string; subteam?: string | null } | null };
type KnowledgeItem = { id: string; title: string; excerpt: string; url: string; publishedAt: string; category: string };

const dateTime = new Intl.DateTimeFormat("en-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function UpdatesPage() {
  const { pick, language } = useLocalization();
  const { profile } = useMemberAuth();
  const isAdmin = useAdminStatus();
  const [params, setParams] = useSearchParams();
  const requested = params.get("view") as View | null;
  const [view, setView] = useState<View>(requested && ["inbox", "announcements", "channels", "knowledge"].includes(requested) ? requested : "inbox");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([]);
  const [unseenChannelCount, setUnseenChannelCount] = useState(0);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [compose, setCompose] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("normal");
  const [audience, setAudience] = useState("all");
  const [status, setStatus] = useState("");
  const [channelsAvailable, setChannelsAvailable] = useState(true);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [feed, setFeed] = useState("all");

  function changeView(next: View) { setView(next); setParams({ view: next }, { replace: true }); }

  async function loadCore() {
    if (!profile) return;
    const [announcementResult, readResult, channelResult, savedResult] = await Promise.all([
      supabase.from("announcements").select("id,title,body,priority,published_at,archived").eq("archived", isAdmin ? showArchived : false).order("published_at", { ascending: false }),
      supabase.from("announcement_reads").select("announcement_id").eq("member_id", profile.id),
      supabase.from("team_channels").select("id,name,name_he,description,kind,subteam").order("sort_order"),
      supabase.from("frc_saved_resources").select("source_url").eq("saved_by", profile.id),
    ]);
    setAnnouncements((announcementResult.data ?? []) as Announcement[]);
    setReads(new Set((readResult.data ?? []).map((row) => row.announcement_id as string)));
    if (channelResult.error) setChannelsAvailable(false);
    else {
      const nextChannels = (channelResult.data ?? []) as Channel[];
      setChannels(nextChannels);
      const linkedChannel = params.get("channel");
      setSelectedChannel((current) => current || (linkedChannel && nextChannels.some((item) => item.id === linkedChannel) ? linkedChannel : nextChannels[0]?.id) || "");
    }
    setSavedUrls(new Set((savedResult.data ?? []).map((row) => row.source_url as string)));
    const channelSeenAt = localStorage.getItem("g3-channel-seen-at") ?? new Date(0).toISOString();
    const { count } = await supabase.from("channel_messages").select("id", { count: "exact", head: true }).gt("created_at", channelSeenAt).neq("author_id", profile.id);
    setUnseenChannelCount(count ?? 0);
  }

  useEffect(() => { void loadCore(); }, [profile?.id, isAdmin, showArchived]);
  useEffect(() => {
    if (!selectedChannel || !channelsAvailable) { setChannelMessages([]); return; }
    const load = () => supabase.from("channel_messages").select("id,channel_id,body,created_at,author_id,team_members(display_name,subteam)").eq("channel_id", selectedChannel).order("created_at").limit(100).then(({ data }) => setChannelMessages((data ?? []) as unknown as ChannelMessage[]));
    void load();
    const realtime = supabase.channel(`g3-channel-${selectedChannel}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${selectedChannel}` }, load).subscribe();
    return () => { void supabase.removeChannel(realtime); };
  }, [selectedChannel, channelsAvailable]);

  useEffect(() => {
    if (view !== "channels") return;
    localStorage.setItem("g3-channel-seen-at", new Date().toISOString());
    setUnseenChannelCount(0);
    window.dispatchEvent(new Event("g3-channels-seen"));
  }, [view, selectedChannel]);

  useEffect(() => {
    if (view !== "knowledge" || knowledge.length) return;
    setKnowledgeLoading(true);
    supabase.functions.invoke("chief-delphi-feed", { body: { feed } }).then(({ data, error }) => {
      if (error) setStatus(pick("Chief Delphi could not be reached right now.", "לא ניתן להגיע כרגע ל-Chief Delphi."));
      setKnowledge((data?.items ?? []) as KnowledgeItem[]);
      setKnowledgeLoading(false);
    });
  }, [view, feed]);

  const unreadAnnouncements = useMemo(() => announcements.filter((item) => !reads.has(item.id)), [announcements, reads]);

  async function markAnnouncementRead(id: string) {
    if (!profile || reads.has(id)) return;
    await supabase.from("announcement_reads").upsert({ announcement_id: id, member_id: profile.id });
    setReads((current) => new Set(current).add(id));
    window.dispatchEvent(new Event("g3-announcements-changed"));
  }

  async function publishAnnouncement(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const { data, error } = await supabase.from("announcements").insert({ title: announcementTitle.trim(), body: announcementBody.trim(), priority: announcementPriority, audience, created_by: profile.id }).select("id").single();
    if (error || !data) { setStatus(error?.message ?? pick("Announcement could not be published.", "לא ניתן לפרסם את ההודעה.")); return; }
    const delivery = await supabase.functions.invoke("send-push", { body: { announcementId: data.id } });
    setStatus(delivery.error ? pick("Published, but push delivery was unavailable.", "פורסם, אך שליחת ההתראה לא הייתה זמינה.") : pick(`Published and sent to ${delivery.data?.delivered ?? 0} devices.`, `פורסם ונשלח ל-${delivery.data?.delivered ?? 0} מכשירים.`));
    setAnnouncementTitle(""); setAnnouncementBody(""); setCompose(false); await loadCore();
  }

  async function archiveAnnouncement(id: string) {
    if (!isAdmin || !window.confirm(pick("Archive this announcement?", "להעביר את ההודעה לארכיון?"))) return;
    const { error } = await supabase.from("announcements").update({ archived: true }).eq("id", id);
    setStatus(error?.message ?? pick("Announcement archived.", "ההודעה הועברה לארכיון."));
    if (!error) await loadCore();
  }

  async function deleteAnnouncement(id: string) {
    if (!isAdmin || !window.confirm(pick("Permanently delete this announcement?", "למחוק את ההודעה לצמיתות?"))) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    setStatus(error?.message ?? pick("Announcement deleted.", "ההודעה נמחקה."));
    if (!error) await loadCore();
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!profile || !selectedChannel || !draft.trim()) return;
    const { data, error } = await supabase.from("channel_messages").insert({ channel_id: selectedChannel, author_id: profile.id, body: draft.trim() }).select("id").single();
    if (error) { setStatus(error.message); return; }
    setDraft("");
    if (data?.id) void supabase.functions.invoke("send-channel-push", { body: { messageId: data.id } });
  }

  async function saveKnowledge(item: KnowledgeItem) {
    if (!profile) return;
    const { error } = await supabase.from("frc_saved_resources").upsert({ source: "chief_delphi", source_url: item.url, title: item.title, excerpt: item.excerpt, category: item.category, saved_by: profile.id }, { onConflict: "saved_by,source_url" });
    if (error) { setStatus(error.message); return; }
    setSavedUrls((current) => new Set(current).add(item.url));
    setStatus(pick("Saved to the G3 knowledge library.", "נשמר בספריית הידע של G3."));
  }

  const tabs: Array<[View,string,string,number?]> = [
    ["inbox", "Inbox", "דואר נכנס", unreadAnnouncements.length + unseenChannelCount], ["announcements", "Announcements", "הודעות"], ["channels", "Channels", "ערוצים", unseenChannelCount], ["knowledge", "FRC Knowledge", "ידע FRC"],
  ];

  return <main className="hub-page updates-page">
    <header className="updates-header"><div><div className="hub-eyebrow">G3 6740 · {pick("Team signal", "תקשורת הקבוצה")}</div><h1>{pick("Updates", "עדכונים")}</h1><p>{pick("Official announcements notify their audience; channels are ongoing team conversations.", "הודעות רשמיות מתריעות לקהל שלהן; ערוצים הם שיחות צוות מתמשכות.")}</p></div>{isAdmin ? <div className="message-header-actions"><button className="hub-button secondary" onClick={() => { changeView("announcements"); setShowArchived((value) => !value); }}>{showArchived ? pick("Current", "פעילות") : pick("Archive", "ארכיון")}</button><button className="hub-button" onClick={() => { changeView("announcements"); setCompose(true); }}>{pick("New announcement", "הודעה חדשה")}</button></div> : null}</header>
    <nav className="updates-tabs" aria-label={pick("Update sections", "אזורי עדכונים")}>{tabs.map(([id,en,he,count]) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => changeView(id)}><span>{pick(en,he)}</span>{count ? <b>{count}</b> : null}</button>)}</nav>
    {status ? <div className="auth-message" role="status">{status}<button aria-label={pick("Dismiss", "סגירה")} onClick={() => setStatus("")}>×</button></div> : null}

    {view === "inbox" ? <section className="updates-stream"><div className="stream-heading"><div><h2>{pick("Needs your attention", "דורש את תשומת ליבך")}</h2><p>{pick("Official announcements and new channel activity collect here.", "הודעות רשמיות ופעילות חדשה בערוצים מופיעות כאן.")}</p></div>{unreadAnnouncements.length+unseenChannelCount ? <span>{unreadAnnouncements.length+unseenChannelCount} {pick("new", "חדשים")}</span> : null}</div>{unseenChannelCount?<button className="update-inbox-row channel-activity-row" onClick={()=>changeView("channels")}><span className="update-source">#</span><span><strong>{pick("New channel activity", "פעילות חדשה בערוצים")}</strong><small>{pick(`${unseenChannelCount} new team message${unseenChannelCount===1?"":"s"}`, `${unseenChannelCount} הודעות צוות חדשות`)}</small></span><i>{pick("Open", "פתיחה")}</i></button>:null}{unreadAnnouncements.length === 0&&unseenChannelCount===0 ? <EmptyUpdates title={pick("You're up to date", "הכול מעודכן")} body={pick("New team activity will appear here.", "פעילות חדשה של הקבוצה תופיע כאן.")} /> : unreadAnnouncements.map((item) => <button className={`update-inbox-row priority-${item.priority}`} key={item.id} onClick={() => { void markAnnouncementRead(item.id); changeView("announcements"); }}><span className="update-source">{item.priority === "urgent" ? "!" : "G3"}</span><span><strong>{item.title}</strong><small>{item.body}</small><time>{dateTime.format(new Date(item.published_at))}</time></span><i>{pick("New", "חדש")}</i></button>)}</section> : null}

    {view === "announcements" ? <section>{compose ? <form className="hub-card update-compose" onSubmit={publishAnnouncement}><header><div><div className="hub-eyebrow">{pick("Official communication", "תקשורת רשמית")}</div><h2>{pick("Publish announcement", "פרסום הודעה")}</h2></div><button type="button" className="icon-close" onClick={() => setCompose(false)}>×</button></header><label>{pick("Title", "כותרת")}<input required value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} /></label><label>{pick("Message", "תוכן ההודעה")}<textarea required rows={5} value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} /></label><div className="update-compose-options"><label>{pick("Audience", "קהל יעד")}<select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">{pick("Entire team", "כל הקבוצה")}</option><option value="members">{pick("Students", "תלמידים")}</option><option value="mentors">{pick("Mentors", "מנטורים")}</option><option value="admins">{pick("Administrators", "מנהלים")}</option></select></label><label>{pick("Priority", "עדיפות")}<select value={announcementPriority} onChange={(event) => setAnnouncementPriority(event.target.value)}><option value="normal">{pick("Normal", "רגילה")}</option><option value="important">{pick("Important", "חשובה")}</option><option value="urgent">{pick("Urgent", "דחופה")}</option></select></label></div><button className="hub-button">{pick("Publish and notify", "פרסום ושליחת התראה")}</button></form> : null}<div className="announcement-list">{announcements.map((item) => <article className={`hub-card update-announcement${reads.has(item.id) ? " is-read" : ""} priority-${item.priority}`} key={item.id} onClick={() => void markAnnouncementRead(item.id)}><header><span>{item.priority}</span><time>{dateTime.format(new Date(item.published_at))}</time>{!item.archived&&!reads.has(item.id) ? <b>{pick("NEW", "חדש")}</b> : null}</header><h2>{item.title}</h2><p>{item.body}</p>{isAdmin?<footer className="announcement-actions">{!item.archived?<button onClick={(event)=>{event.stopPropagation();void archiveAnnouncement(item.id);}}>{pick("Archive","ארכיון")}</button>:null}<button className="danger-link" onClick={(event)=>{event.stopPropagation();void deleteAnnouncement(item.id);}}>{pick("Delete","מחיקה")}</button></footer>:null}</article>)}</div></section> : null}

    {view === "channels" ? <section className="channels-layout">{!channelsAvailable ? <EmptyUpdates title={pick("Channels need activation", "יש להפעיל את הערוצים")} body={pick("Apply the included Supabase collaboration migration to enable private G3 conversations.", "יש להחיל את עדכון Supabase המצורף כדי להפעיל שיחות פרטיות של G3.")} /> : <><aside className="channel-rail"><div className="channel-rail-title">{pick("G3 channels", "ערוצי G3")}</div>{channels.map((channel) => <button className={selectedChannel === channel.id ? "is-active" : ""} key={channel.id} onClick={() => setSelectedChannel(channel.id)}><span>#</span><span><strong>{language === "he" && channel.name_he ? channel.name_he : channel.name}</strong><small>{channel.description}</small></span></button>)}</aside><div className="channel-thread"><header><span>#</span><div><h2>{language === "he" && channels.find((item) => item.id === selectedChannel)?.name_he || channels.find((item) => item.id === selectedChannel)?.name}</h2><p>{channels.find((item) => item.id === selectedChannel)?.description}</p></div></header><div className="channel-message-list">{channelMessages.length === 0 ? <EmptyUpdates title={pick("Start the conversation", "התחילו את השיחה")} body={pick("Share an FRC question, decision or progress update with this channel.", "שתפו שאלת FRC, החלטה או עדכון התקדמות בערוץ זה.")} /> : channelMessages.map((message) => <article className={`channel-message${message.author_id === profile?.id ? " is-own" : ""}`} key={message.id}><span className="member-avatar">{(message.team_members?.display_name ?? "G3").slice(0,2).toUpperCase()}</span><div><header><strong>{message.team_members?.display_name ?? "G3 member"}</strong><small>{message.team_members?.subteam ?? pick("Team 6740", "קבוצה 6740")} · {dateTime.format(new Date(message.created_at))}</small></header><p>{message.body}</p></div></article>)}</div><form className="channel-composer" onSubmit={sendMessage}><textarea aria-label={pick("Message", "הודעה")} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={pick("Share with the team…", "שיתוף עם הקבוצה…")} /><button className="hub-button" disabled={!draft.trim()}>{pick("Send", "שליחה")}</button></form></div></>}</section> : null}

    {view === "knowledge" ? <section className="knowledge-section"><header className="knowledge-toolbar"><div><h2>{pick("FRC knowledge radar", "רדאר הידע של FRC")}</h2><p>{pick("Curated Chief Delphi discussions—saved and connected back to G3 work.", "דיונים נבחרים מ-Chief Delphi, שמורים ומחוברים לעבודה של G3.")}</p></div><select value={feed} onChange={(event) => { setFeed(event.target.value); setKnowledge([]); }}><option value="all">{pick("All FRC", "כל FRC")}</option><option value="technical">{pick("Technical", "טכני")}</option><option value="software">{pick("Software", "תוכנה")}</option><option value="strategy">{pick("Strategy", "אסטרטגיה")}</option></select></header>{knowledgeLoading ? <div className="knowledge-loading">{pick("Scanning Chief Delphi…", "סורק את Chief Delphi…")}</div> : knowledge.length === 0 ? <EmptyUpdates title={pick("Knowledge feed unavailable", "פיד הידע אינו זמין")} body={pick("Deploy the included Chief Delphi Edge Function to activate the live feed.", "יש לפרוס את פונקציית ה-Edge המצורפת כדי להפעיל את הפיד החי.")} /> : <div className="knowledge-grid">{knowledge.map((item) => <article className="knowledge-card" key={item.id}><header><span>{item.category}</span><time>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</time></header><h2>{item.title}</h2><p>{item.excerpt}</p><footer><button className={savedUrls.has(item.url) ? "is-saved" : ""} onClick={() => void saveKnowledge(item)}>{savedUrls.has(item.url) ? pick("Saved ✓", "נשמר ✓") : pick("Save to G3", "שמירה ב-G3")}</button><button onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}>{pick("Open on Chief Delphi", "פתיחה ב-Chief Delphi")} ↗</button></footer></article>)}</div>}</section> : null}
  </main>;
}

function EmptyUpdates({ title, body }: { title: string; body: string }) {
  return <div className="updates-empty"><span aria-hidden="true">G3</span><h2>{title}</h2><p>{body}</p></div>;
}
