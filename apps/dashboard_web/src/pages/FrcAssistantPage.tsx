import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; attachment_name?: string | null };
type PendingImage = { name: string; mimeType: string; data: string; preview: string };

const suggestions = [
  ["Help diagnose a robot problem", "עזרו לי לאבחן תקלה ברובוט"],
  ["Review a WPILib error", "בדקו שגיאת WPILib"],
  ["Plan a safe mechanism test", "תכננו בדיקה בטוחה למנגנון"],
] as const;

export default function FrcAssistantPage() {
  const { language, pick } = useLocalization();
  const { profile } = useMemberAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<PendingImage | null>(null);
  const [attachmentKind, setAttachmentKind] = useState<"screenshot" | "robot_photo">("screenshot");
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);
  useEffect(() => { questionRef.current?.focus(); }, []);

  async function loadConversation(id: string) {
    const { data, error } = await supabase.from("ai_messages").select("id,role,content,attachment_name").eq("conversation_id", id).order("created_at");
    if (error) { setStatus(error.message); return; }
    setConversationId(id); setMessages((data ?? []) as ChatMessage[]); setStatus("");
  }

  async function loadLatest() {
    if (!profile) return;
    const { data } = await supabase.from("ai_conversations").select("id").eq("member_id", profile.id).eq("archived", false).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (data?.id) await loadConversation(data.id);
  }
  useEffect(() => { void loadLatest(); }, [profile?.id]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) { setStatus(pick("Use a JPG, PNG, or WebP image smaller than 4 MB.", "יש להשתמש בתמונת JPG, PNG או WebP שקטנה מ־4MB.")); return; }
    const reader = new FileReader();
    reader.onload = () => { const preview=String(reader.result); setImage({ name:file.name, mimeType:file.type, data:preview.split(",")[1] ?? "", preview }); setPrivacyConfirmed(false); setStatus(""); };
    reader.readAsDataURL(file);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const clean=question.trim();
    if ((!clean && !image) || busy) return;
    if (image && !privacyConfirmed) { setStatus(pick("Confirm the image contains no people or personal student information.", "יש לאשר שאין בתמונה אנשים או מידע אישי על תלמידים.")); return; }
    setBusy(true); setStatus("");
    const optimistic:ChatMessage={id:`pending-${Date.now()}`,role:"user",content:clean || pick("Analyze this image in an FRC context.","נתחו את התמונה בהקשר של FRC."),attachment_name:image?.name};
    setMessages((current)=>[...current,optimistic]); setQuestion("");
    const pendingImage=image; setImage(null); setPrivacyConfirmed(false);
    const { data, error } = await supabase.functions.invoke("frc-assistant", { body: { conversationId, message:clean, language, attachmentKind:pendingImage ? attachmentKind : null, privacyConfirmed:pendingImage ? true : false, image:pendingImage ? { name:pendingImage.name,mimeType:pendingImage.mimeType,data:pendingImage.data } : null } });
    let functionError = data?.error || "";
    if (error && "context" in error) {
      try { const details=await (error as {context:Response}).context.clone().json(); functionError=details?.error || functionError; } catch { /* Fall back to the SDK message below. */ }
    }
    if (error || data?.error) { setMessages((current)=>current.filter((item)=>item.id!==optimistic.id)); setQuestion(clean); setImage(pendingImage); setPrivacyConfirmed(Boolean(pendingImage)); setStatus(functionError || error?.message || pick("G3 Assist is unavailable.","G3 Assist אינו זמין כרגע.")); setBusy(false); return; }
    setConversationId(data.conversationId); setRemaining(data.usage?.remainingToday ?? null);
    setMessages((current)=>[...current,{id:`answer-${Date.now()}`,role:"assistant",content:data.answer}]); setBusy(false);
  }

  return <main className="assistant-page">
    <header className="assistant-header">
      <div className="assistant-avatar assistant-avatar-large" aria-hidden="true"><img src="/g3-assistant.png" alt="" /></div>
      <div><div className="hub-eyebrow">G3 6740 · FRC</div><h1>G3 Assist</h1><p>{pick("Workshop-ready help for robot, code, electrical and strategy questions.","עזרה מוכנה לסדנה בשאלות רובוט, תוכנה, אלקטרוניקה ואסטרטגיה.")}</p></div>
    </header>

    <section className="assistant-safety" aria-label={pick("AI safety notice","הודעת בטיחות לבינה מלאכותית")}><b>{pick("Verify before you build.","בדקו לפני שבונים.")}</b><span>{pick("AI can be wrong. Confirm rules in the current FIRST manual and perform physical work with appropriate mentor supervision.","בינה מלאכותית עלולה לטעות. יש לאמת חוקים במדריך FIRST העדכני ולבצע עבודה פיזית בהשגחת מנטור מתאימה.")}</span></section>

    <section className="assistant-chat" aria-live="polite">
      {messages.length===0 ? <div className="assistant-welcome"><span className="assistant-spark">✦</span><h2>{pick("What are you working on?","על מה אתם עובדים?")}</h2><p>{pick("Ask an FRC question or attach a sanitized screenshot or robot photo.","שאלו שאלה על FRC או צרפו צילום מסך או תמונת רובוט ללא מידע אישי.")}</p><div>{suggestions.map(([en,he])=><button key={en} type="button" onClick={()=>setQuestion(pick(en,he))}>{pick(en,he)} <span>→</span></button>)}</div></div> : messages.map((message)=><article key={message.id} className={`assistant-message is-${message.role}`}><div className="assistant-message-label">{message.role==="assistant" ? "G3 Assist" : pick("You","אתם")}</div>{message.attachment_name ? <small>▧ {message.attachment_name}</small> : null}<div>{message.content}</div></article>)}
      {busy ? <div className="assistant-thinking"><span></span><span></span><span></span>{pick("Working through it…","בודק את הנושא…")}</div> : null}<div ref={endRef} />
    </section>

    <form className="assistant-composer" onSubmit={send}>
      {image ? <div className="assistant-attachment"><img src={image.preview} alt={pick("Selected attachment preview","תצוגה מקדימה של הקובץ")} /><div><b>{image.name}</b><select value={attachmentKind} onChange={(e)=>setAttachmentKind(e.target.value as "screenshot"|"robot_photo")}><option value="screenshot">{pick("Code/log screenshot","צילום מסך של קוד או לוג")}</option><option value="robot_photo">{pick("Robot/component photo","תמונת רובוט או רכיב")}</option></select><label><input type="checkbox" checked={privacyConfirmed} onChange={(e)=>setPrivacyConfirmed(e.target.checked)} />{pick("I confirm there are no people, faces, names or personal student data in this image.","אני מאשר/ת שאין בתמונה אנשים, פנים, שמות או מידע אישי על תלמידים.")}</label></div><button type="button" onClick={()=>{setImage(null);setPrivacyConfirmed(false);}} aria-label={pick("Remove image","הסרת תמונה")}>×</button></div> : null}
      {status ? <div className="assistant-error" role="alert">{status}</div> : null}
      <div className="assistant-compose-row"><label className="assistant-upload" title={pick("Attach image","צירוף תמונה")}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /><span aria-hidden="true">＋</span></label><textarea ref={questionRef} rows={2} value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder={pick("Ask G3 Assist about the robot, code, electrical or strategy…","שאלו את G3 Assist על הרובוט, תוכנה, אלקטרוניקה או אסטרטגיה…")} aria-label={pick("Message G3 Assist","שליחת הודעה ל-G3 Assist")} /><button className="assistant-send" type="submit" disabled={busy||(!question.trim()&&!image)}>{pick("Send","שליחה")} <span aria-hidden="true">↑</span></button></div>
      <footer><span>{pick("Do not upload faces, attendance or personal student data.","אין להעלות פנים, נוכחות או מידע אישי על תלמידים.")}</span>{remaining!==null ? <b>{pick(`${remaining} questions remaining today`,`${remaining} שאלות נותרו היום`)}</b> : null}</footer>
    </form>
  </main>;
}
