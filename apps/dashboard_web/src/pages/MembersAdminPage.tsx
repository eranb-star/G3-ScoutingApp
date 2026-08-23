import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { MemberProfile, TeamRole } from "../lib/memberAuth";
import { useLocalization } from "../lib/localization";

function temporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(3));
  return `G3-${bytes[0].toString(36)}-${bytes[1].toString(36)}-${bytes[2].toString(36)}!`;
}

export default function MembersAdminPage() {
  const { pick } = useLocalization();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [subteam, setSubteam] = useState("");
  const [password, setPassword] = useState(temporaryPassword);

  async function loadMembers() {
    setLoading(true);
    const { data, error } = await supabase.from("team_members").select("id,email,display_name,role,subteam,active,must_change_password").order("display_name");
    setMessage(error?.message ?? "");
    setMembers((data ?? []) as MemberProfile[]);
    setLoading(false);
  }

  useEffect(() => { void loadMembers(); }, []);

  async function invoke(body: Record<string, unknown>) {
    setMessage("");
    const { data, error } = await supabase.functions.invoke("manage-member", { body });
    const functionError = data?.error as string | undefined;
    if (error || functionError) throw new Error(functionError || error?.message || "Request failed");
  }

  async function createMember(event: FormEvent) {
    event.preventDefault();
    try {
      await invoke({ action: "create", email, displayName: name, role, subteam, temporaryPassword: password });
      setMessage(`Account created. Give ${name} the temporary password shown below.`);
      setEmail(""); setName(""); setSubteam(""); setRole("member");
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create member"); }
  }

  async function resetMember(member: MemberProfile) {
    const nextPassword = temporaryPassword();
    if (!window.confirm(`Reset ${member.display_name}'s password? They will have to change it at next login.`)) return;
    try {
      await invoke({ action: "reset_password", userId: member.id, temporaryPassword: nextPassword });
      setPassword(nextPassword);
      setMessage(`Password reset for ${member.display_name}. Copy the new temporary password from the form.`);
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Reset failed"); }
  }

  async function toggleMember(member: MemberProfile) {
    try {
      await invoke({ action: "set_active", userId: member.id, active: !member.active });
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed"); }
  }

  async function editMember(member: MemberProfile) {
    const displayName = window.prompt("Display name", member.display_name)?.trim();
    if (!displayName) return;
    const nextSubteam = window.prompt("Subteam (leave empty for none)", member.subteam || "");
    if (nextSubteam === null) return;
    try { await invoke({ action: "update_profile", userId: member.id, displayName, subteam: nextSubteam }); await loadMembers(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Update failed"); }
  }

  return (
    <div className="hub-page">
      <header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Administration","ניהול")}</div><h1>{pick("Team members","חברי הקבוצה")}</h1><p>{pick("Create accounts, assign roles and control access.","יצירת חשבונות, הקצאת תפקידים וניהול הרשאות.")}</p></div></header>
      <div className="admin-members-layout">
        <section className="hub-card admin-member-form">
          <h2>{pick("Add a member","הוספת חבר/ת קבוצה")}</h2><p>{pick("No invitation email is sent. The member changes this temporary password on first login.","לא נשלח דוא״ל הזמנה. המשתמש מחליף את הסיסמה הזמנית בכניסה הראשונה.")}</p>
          <form className="auth-form" onSubmit={createMember}>
            <label>{pick("Full name","שם מלא")}<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>{pick("Email","דוא״ל")}<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>{pick("Role","תפקיד")}<select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}><option value="member">{pick("Member","חבר/ת קבוצה")}</option><option value="mentor">{pick("Mentor","מנטור/ית")}</option><option value="admin">{pick("Administrator","מנהל/ת")}</option></select></label>
            <label>{pick("Subteam","תת־צוות")}<input value={subteam} onChange={(e) => setSubteam(e.target.value)} placeholder={pick("Mechanical, Software…","מכני, תוכנה…")} /></label>
            <label>{pick("Temporary password","סיסמה זמנית")}<div className="auth-inline"><input readOnly value={password} /><button type="button" onClick={() => setPassword(temporaryPassword())}>{pick("Generate","יצירה")}</button></div></label>
            <button className="hub-button">{pick("Create account","יצירת חשבון")}</button>
          </form>
          {message ? <div className="auth-message">{message}</div> : null}
        </section>
        <section className="hub-card admin-member-list">
          <div className="admin-list-heading"><h2>{pick("Members","חברים")}</h2><span>{members.filter((member) => member.active).length} {pick("active","פעילים")}</span></div>
          {loading ? <p>{pick("Loading…","טוען…")}</p> : members.map((member) => (
            <article className={`member-row${member.active ? "" : " is-inactive"}`} key={member.id}>
              <div className="member-avatar">{member.display_name.slice(0, 1).toUpperCase()}</div>
              <div className="member-identity"><strong>{member.display_name}</strong><span>{member.email}</span><small>{member.subteam || "No subteam"} · {member.role}</small></div>
              {member.must_change_password ? <span className="hub-role-chip">PASSWORD CHANGE</span> : null}
              <div className="member-actions"><button onClick={() => editMember(member)}>{pick("Edit","עריכה")}</button><button onClick={() => resetMember(member)}>{pick("Reset password","איפוס סיסמה")}</button><button onClick={() => toggleMember(member)}>{member.active ? pick("Deactivate","השבתה") : pick("Activate","הפעלה")}</button></div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
