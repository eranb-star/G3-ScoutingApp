import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";

type Citation={url:string;title:string};
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; attachment_name?: string | null; created_at?: string; citations?:Citation[] };
type IssueContext={id:string;issue_number:number;title:string;subsystem:string;severity:string;status:string};
type ConversationSummary = { id: string; title: string; updated_at: string; created_at: string };
type PendingImage = { name: string; mimeType: string; data: string; preview: string };

const ACTIVE_CONVERSATION_KEY = "g3-assistant-active-conversation";
const MESSAGE_PAGE_SIZE = 30;
const suggestions = [
  ["Help diagnose a robot problem", "עזרו לי לאבחן תקלה ברובוט"],
  ["Review a WPILib error", "בדקו שגיאת WPILib"],
  ["Plan a safe mechanism test", "תכננו בדיקה בטוחה למנגנון"],
  ["Analyze a robot or wiring photo", "נתחו תמונת רובוט או חיווט"],
  ["Read a code or Driver Station screenshot", "קראו צילום מסך של קוד או Driver Station"],
] as const;

export default function FrcAssistantPage() {
  const navigate = useNavigate();
  const [params]=useSearchParams();
  const { language, pick } = useLocalization();
  const { profile } = useMemberAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<PendingImage | null>(null);
  const [attachmentKind, setAttachmentKind] = useState<"screenshot" | "robot_photo">("screenshot");
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [issueContext,setIssueContext]=useState<IssueContext|null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  const filteredConversations = useMemo(() => {
    const term = historySearch.trim().toLocaleLowerCase();
    return term ? conversations.filter((item) => item.title.toLocaleLowerCase().includes(term)) : conversations;
  }, [conversations, historySearch]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length, busy]);
  useEffect(() => { if (!historyOpen) questionRef.current?.focus(); }, [historyOpen]);

  async function refreshHistory() {
    if (!profile) return;
    setHistoryLoading(true);
    const { data, error } = await supabase.from("ai_conversations").select("id,title,updated_at,created_at").eq("member_id", profile.id).eq("archived", false).order("updated_at", { ascending: false }).limit(60);
    if (error) setStatus(error.message);
    else setConversations((data ?? []) as ConversationSummary[]);
    setHistoryLoading(false);
  }

  async function loadConversation(id: string, closeHistory = true) {
    const { data, error, count } = await supabase.from("ai_messages").select("id,role,content,attachment_name,created_at,citations", { count: "exact" }).eq("conversation_id", id).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
    if (error) { setStatus(error.message); return; }
    setConversationId(id);
    setMessages(((data ?? []) as ChatMessage[]).reverse());
    setHasEarlier((count ?? 0) > (data?.length ?? 0));
    sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    setStatus("");
    if (closeHistory) setHistoryOpen(false);
  }

  async function loadEarlier() {
    if (!conversationId || !messages[0]?.created_at || loadingEarlier) return;
    setLoadingEarlier(true);
    const { data, error } = await supabase.from("ai_messages").select("id,role,content,attachment_name,created_at,citations").eq("conversation_id", conversationId).lt("created_at", messages[0].created_at).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
    if (error) setStatus(error.message);
    else {
      const earlier = ((data ?? []) as ChatMessage[]).reverse();
      setMessages((current) => [...earlier, ...current]);
      setHasEarlier(earlier.length === MESSAGE_PAGE_SIZE);
    }
    setLoadingEarlier(false);
  }

  function startNewConversation() {
    sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    setConversationId(null); setMessages([]); setQuestion(""); setImage(null); setPrivacyConfirmed(false); setRemaining(null); setStatus(""); setHistoryOpen(false);
    window.setTimeout(() => questionRef.current?.focus(), 0);
  }

  async function archiveConversation(id: string) {
    const { error } = await supabase.from("ai_conversations").update({ archived: true }).eq("id", id);
    if (error) { setStatus(error.message); return; }
    if (conversationId === id) startNewConversation();
    await refreshHistory();
  }

  useEffect(() => {
    if (!profile) return;
    void refreshHistory();
    const activeId = sessionStorage.getItem(ACTIVE_CONVERSATION_KEY);
    if (activeId) void loadConversation(activeId, false);
  }, [profile?.id]);
  useEffect(()=>{const issueId=params.get("issue");if(!issueId){setIssueContext(null);return;}void supabase.from("robot_issues").select("id,issue_number,title,subsystem,severity,status").eq("id",issueId).maybeSingle().then(({data})=>setIssueContext(data as IssueContext|null));},[params]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) { setStatus(pick("Use a JPG, PNG, or WebP image smaller than 4 MB.", "יש להשתמש בתמונת JPG, PNG או WebP שקטנה מ־4MB.")); return; }
    const reader = new FileReader();
    reader.onload = () => { const preview = String(reader.result); setImage({ name: file.name, mimeType: file.type, data: preview.split(",")[1] ?? "", preview }); setPrivacyConfirmed(false); setStatus(""); };
    reader.readAsDataURL(file);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const clean = question.trim();
    if ((!clean && !image) || busy) return;
    if (image && !privacyConfirmed) { setStatus(pick("Confirm the image contains no people or personal student information.", "יש לאשר שאין בתמונה אנשים או מידע אישי על תלמידים.")); return; }
    setBusy(true); setStatus("");
    const optimistic: ChatMessage = { id: `pending-${Date.now()}`, role: "user", content: clean || pick("Analyze this image in an FRC context.", "נתחו את התמונה בהקשר של FRC."), attachment_name: image?.name, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]); setQuestion("");
    const pendingImage = image; setImage(null); setPrivacyConfirmed(false);
    const { data, error } = await supabase.functions.invoke("frc-assistant", { body: { conversationId, message: clean, language, contextIssueId:issueContext?.id??null, attachmentKind: pendingImage ? attachmentKind : null, privacyConfirmed: Boolean(pendingImage), image: pendingImage ? { name: pendingImage.name, mimeType: pendingImage.mimeType, data: pendingImage.data } : null } });
    let functionError = data?.error || "";
    if (error && "context" in error) { try { const details = await (error as { context: Response }).context.clone().json(); functionError = details?.error || functionError; } catch { /* Use SDK message. */ } }
    if (error || data?.error) { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setQuestion(clean); setImage(pendingImage); setPrivacyConfirmed(Boolean(pendingImage)); setStatus(functionError || error?.message || pick("G3 Assist is unavailable.", "G3 Assist אינו זמין כרגע.")); setBusy(false); return; }
    setConversationId(data.conversationId); sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, data.conversationId); setRemaining(data.usage?.remainingToday ?? null);
    setMessages((current) => [...current, { id: `answer-${Date.now()}`, role: "assistant", content: data.answer, citations:data.citations??[], created_at: new Date().toISOString() }]); setBusy(false);
    await refreshHistory();
  }

  async function saveKnowledge(message:ChatMessage){if(!profile)return;const answerIndex=messages.findIndex(item=>item.id===message.id);const questionMessage=answerIndex>0?[...messages.slice(0,answerIndex)].reverse().find(item=>item.role==="user"):null;const originalQuestion=questionMessage?.content?.trim()||pick("FRC troubleshooting question","שאלת פתרון תקלות FRC");const title=originalQuestion.split("\n").find(line=>line.trim())?.replace(/^#+\s*/,"").slice(0,160)||pick("G3 Assist solution","פתרון G3 Assist");const sources=message.citations?.length?`\n\n## ${pick("Sources","מקורות")}\n${message.citations.map(source=>`- [${source.title}](${source.url})`).join("\n")}`:"";const content=`## ${pick("Original question","השאלה המקורית")}\n${originalQuestion}\n\n## ${pick("G3 Assist answer","תשובת G3 Assist")}\n${message.content}${sources}`;const summary=`${pick("Question","שאלה")}: ${originalQuestion}\n\n${message.content.slice(0,280)}`.slice(0,650);const {error}=await supabase.from("frc_knowledge_articles").insert({title,content,summary,subsystem:issueContext?.subsystem??"general",source_type:"assistant",related_issue_id:issueContext?.id??null,created_by:profile.id});setStatus(error?.message??pick("Saved as a complete question-and-answer article in the G3 knowledge library.","נשמר כמאמר מלא של שאלה ותשובה בספריית הידע של G3."));}
  async function createIssue(message:ChatMessage){if(!profile)return;const title=message.content.split("\n").find(line=>line.trim())?.replace(/^#+\s*/,"").slice(0,150)||pick("Issue from G3 Assist","תקלה מ-G3 Assist");const {data,error}=await supabase.from("robot_issues").insert({title,description:message.content.slice(0,4800),subsystem:issueContext?.subsystem??"other",severity:"medium",discovered_context:"workshop",reporter_id:profile.id}).select("id").single();if(error||!data){setStatus(error?.message??pick("Issue could not be created.","לא ניתן ליצור תקלה."));return;}navigate(`/robot-issues?issue=${data.id}`);}
  function createTaskDraft(message:ChatMessage){sessionStorage.setItem("g3-project-task-draft",message.content.split("\n").find(line=>line.trim())?.replace(/^#+\s*/,"").slice(0,150)||pick("Task from G3 Assist","משימה מ-G3 Assist"));navigate("/projects?assistantDraft=1");}

  return <main className="assistant-page">
    <header className="assistant-header">
      <button className="assistant-back" type="button" onClick={() => navigate(-1)} aria-label={pick("Back", "חזרה")}>‹</button>
      <div className="assistant-identity"><div className="assistant-avatar assistant-avatar-large" aria-hidden="true"><img src="/g3-assistant.png" alt="" /><span>✦</span></div><div><div className="hub-eyebrow">G3 6740 · FRC</div><h1>G3 Assist</h1><p>{pick("Workshop-ready help for robot, code, electrical and strategy questions.", "עזרה מוכנה לסדנה בשאלות רובוט, תוכנה, אלקטרוניקה ואסטרטגיה.")}</p></div></div>
      <div className="assistant-header-actions"><button type="button" onClick={() => { setHistoryOpen(true); void refreshHistory(); }}><span aria-hidden="true">◷</span>{pick("History", "היסטוריה")}</button><button type="button" onClick={startNewConversation}><span aria-hidden="true">＋</span>{pick("New", "חדש")}</button></div>
    </header>
    <section className="assistant-safety" aria-label={pick("AI safety notice", "הודעת בטיחות לבינה מלאכותית")}><b>{pick("Verify before you build.", "בדקו לפני שבונים.")}</b><span>{pick("AI can be wrong. Confirm rules in the current FIRST manual and perform physical work with appropriate mentor supervision.", "בינה מלאכותית עלולה לטעות. יש לאמת חוקים במדריך FIRST העדכני ולבצע עבודה פיזית בהשגחת מנטור מתאימה.")}</span></section>
    {issueContext?<section className="assistant-context-card"><span>G3-{issueContext.issue_number}</span><div><strong>{pick("Working from robot issue context","עבודה מתוך הקשר של תקלה ברובוט")}</strong><small>{issueContext.title} · {issueContext.subsystem} · {issueContext.severity}</small></div><button onClick={()=>navigate(`/robot-issues?issue=${issueContext.id}`)}>{pick("Open issue","פתיחת תקלה")}</button></section>:null}
    <section className="assistant-chat" aria-live="polite">
      {messages.length === 0 ? <div className="assistant-welcome"><span className="assistant-spark">✦</span><h2>{pick("What are you working on?", "על מה אתם עובדים?")}</h2><p>{pick("Start a new FRC question or reopen a previous conversation when you need it.", "התחילו שאלה חדשה על FRC או פתחו שיחה קודמת בעת הצורך.")}</p><div>{suggestions.map(([en, he]) => <button key={en} type="button" onClick={() => setQuestion(pick(en, he))}>{pick(en, he)} <span>→</span></button>)}</div>{conversations.length > 0 ? <button className="assistant-recent" type="button" onClick={() => setHistoryOpen(true)}><span aria-hidden="true">◷</span><span><b>{pick("Recent conversations", "שיחות אחרונות")}</b><small>{pick(`${conversations.length} saved conversations`, `${conversations.length} שיחות שמורות`)}</small></span><strong aria-hidden="true">›</strong></button> : null}</div> : <>{hasEarlier ? <button className="assistant-load-earlier" type="button" onClick={() => void loadEarlier()} disabled={loadingEarlier}>{loadingEarlier ? pick("Loading…", "טוען…") : pick("Load earlier messages", "טעינת הודעות קודמות")}</button> : null}{messages.map((message) => <article key={message.id} className={`assistant-message is-${message.role}`}><div className="assistant-message-label">{message.role === "assistant" ? "G3 Assist" : pick("You", "אתם")}</div>{message.attachment_name ? <small>▧ {message.attachment_name}</small> : null}<div>{message.content}</div>{message.role==="assistant"?<>{message.citations?.length?<div className="assistant-citations"><b>{pick("Sources","מקורות")}</b>{message.citations.map(source=><a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} ↗</a>)}</div>:null}<footer className="assistant-answer-actions"><button onClick={()=>void saveKnowledge(message)}>{pick("Save knowledge","שמירת ידע")}</button><button onClick={()=>void createIssue(message)}>{pick("Create issue","יצירת תקלה")}</button><button onClick={()=>createTaskDraft(message)}>{pick("Create task","יצירת משימה")}</button></footer></>:null}</article>)}</>}
      {busy ? <div className="assistant-thinking"><span></span><span></span><span></span>{pick("Working through it…", "בודק את הנושא…")}</div> : null}<div ref={endRef} />
    </section>
    <form className="assistant-composer" onSubmit={send}>
      {image ? <div className="assistant-attachment"><img src={image.preview} alt={pick("Selected attachment preview", "תצוגה מקדימה של הקובץ")} /><div><b>{image.name}</b><select value={attachmentKind} onChange={(e) => setAttachmentKind(e.target.value as "screenshot" | "robot_photo")}><option value="screenshot">{pick("Code/log screenshot", "צילום מסך של קוד או לוג")}</option><option value="robot_photo">{pick("Robot/component photo", "תמונת רובוט או רכיב")}</option></select><label><input type="checkbox" checked={privacyConfirmed} onChange={(e) => setPrivacyConfirmed(e.target.checked)} />{pick("I confirm there are no people, faces, names or personal student data in this image.", "אני מאשר/ת שאין בתמונה אנשים, פנים, שמות או מידע אישי על תלמידים.")}</label></div><button type="button" onClick={() => { setImage(null); setPrivacyConfirmed(false); }} aria-label={pick("Remove image", "הסרת תמונה")}>×</button></div> : null}
      {status ? <div className="assistant-error" role="alert">{status}</div> : null}
      <div className="assistant-compose-row"><textarea ref={questionRef} rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={pick("Ask G3 Assist about the robot, code, electrical or strategy…", "שאלו את G3 Assist על הרובוט, תוכנה, אלקטרוניקה או אסטרטגיה…")} aria-label={pick("Message G3 Assist", "שליחת הודעה ל-G3 Assist")} /><div className="assistant-compose-actions"><label className="assistant-upload" title={pick("Attach image", "צירוף תמונה")}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /><span aria-hidden="true">＋</span></label><button className="assistant-send" type="submit" disabled={busy || (!question.trim() && !image)}>{pick("Send", "שליחה")} <span aria-hidden="true">↑</span></button></div></div>
      <footer><span>{pick("Do not upload faces, attendance or personal student data.", "אין להעלות פנים, נוכחות או מידע אישי על תלמידים.")}</span>{remaining !== null ? <b>{pick(`${remaining} questions remaining today`, `${remaining} שאלות נותרו היום`)}</b> : null}</footer>
    </form>
    {historyOpen ? <div className="assistant-history-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}><section className="assistant-history" role="dialog" aria-modal="true" aria-labelledby="assistant-history-title"><header><div><div className="hub-eyebrow">G3 Assist</div><h2 id="assistant-history-title">{pick("Conversation history", "היסטוריית שיחות")}</h2></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label={pick("Close history", "סגירת היסטוריה")}>×</button></header><button className="assistant-new-chat" type="button" onClick={startNewConversation}><span>＋</span>{pick("Start a new conversation", "התחלת שיחה חדשה")}</button><label className="assistant-history-search"><span aria-hidden="true">⌕</span><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={pick("Search conversations", "חיפוש בשיחות")} aria-label={pick("Search conversations", "חיפוש בשיחות")} /></label><div className="assistant-history-list">{historyLoading ? <p>{pick("Loading conversations…", "טוען שיחות…")}</p> : filteredConversations.length === 0 ? <p>{pick("No saved conversations yet.", "אין עדיין שיחות שמורות.")}</p> : filteredConversations.map((conversation) => <article className={conversation.id === conversationId ? "is-active" : ""} key={conversation.id}><button type="button" onClick={() => void loadConversation(conversation.id)}><span aria-hidden="true">✦</span><span><b>{conversation.title}</b><small>{new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-IL", { dateStyle: "medium" }).format(new Date(conversation.updated_at))}</small></span><strong aria-hidden="true">›</strong></button><button className="assistant-archive-chat" type="button" onClick={() => void archiveConversation(conversation.id)} aria-label={pick(`Archive ${conversation.title}`, `העברת ${conversation.title} לארכיון`)}>⌄</button></article>)}</div></section></div> : null}
  </main>;
}
