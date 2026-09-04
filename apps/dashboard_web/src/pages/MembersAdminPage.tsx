import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { MemberProfile, TeamRole } from "../lib/memberAuth";
import { useLocalization } from "../lib/localization";
import { frcTeams } from "../lib/frcTeams";

const teamOptions = frcTeams.map(team=>team.name);
type CredentialHandoff={memberId:string;name:string;email:string;password:string;kind:"created"|"reset"};

function TeamSelector({value,onChange,pick,leadership=false}:{value:string[];onChange:(value:string[])=>void;pick:(en:string,he:string)=>string;leadership?:boolean}) {
  const allSelected=teamOptions.every(team=>value.includes(team));
  const toggle=(team:string)=>onChange(value.includes(team)?value.filter(item=>item!==team):[...value,team]);
  return <fieldset className={`member-team-selector${leadership?" leadership-selector":""}`}><legend>{leadership?pick("Departments this person leads","מחלקות שאדם זה מוביל"):pick("FRC teams","צוותי FRC")}</legend><button type="button" className={allSelected?"is-selected":""} onClick={()=>onChange(allSelected?[]:[...teamOptions])}>{allSelected?"✓ ":""}{pick("All teams","כל הצוותים")}</button><div>{frcTeams.map(team=><label className={value.includes(team.name)?"is-selected":""} key={team.key}><input type="checkbox" checked={value.includes(team.name)} onChange={()=>toggle(team.name)}/><span>{pick(team.name,team.nameHe)}</span></label>)}</div><small>{leadership?pick("Leadership permissions apply only inside these departments.","הרשאות ההובלה יחולו רק במחלקות אלה."):pick("Select every team this member belongs to.","בחרו את כל הצוותים שאליהם משתייך/ת חבר/ת הקבוצה.")}</small></fieldset>;
}

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
  const [subteams, setSubteams] = useState<string[]>([]);
  const [leaderSubteams,setLeaderSubteams]=useState<string[]>([]);
  const [password, setPassword] = useState(temporaryPassword);
  const [editingMember,setEditingMember]=useState<MemberProfile|null>(null);
  const [editingName,setEditingName]=useState("");
  const [editingSubteams,setEditingSubteams]=useState<string[]>([]);
  const [editingRole,setEditingRole]=useState<TeamRole>("member");
  const [editingLeaderSubteams,setEditingLeaderSubteams]=useState<string[]>([]);
  const [handoffs,setHandoffs]=useState<CredentialHandoff[]>([]);
  const [activeHandoff,setActiveHandoff]=useState<CredentialHandoff|null>(null);
  const [copyStatus,setCopyStatus]=useState("");

  async function loadMembers() {
    setLoading(true);
    const { data, error } = await supabase.from("team_members").select("id,email,display_name,role,subteam,subteams,leader_subteams,active,must_change_password").order("display_name");
    if(error)setMessage(error.message);
    setMembers((data ?? []) as MemberProfile[]);
    setLoading(false);
  }

  useEffect(() => { void loadMembers(); }, []);

  async function invoke(body: Record<string, unknown>) {
    setMessage("");
    const { data, error } = await supabase.functions.invoke("manage-member", { body });
    const functionError = data?.error as string | undefined;
    if (error || functionError) throw new Error(functionError || error?.message || "Request failed");
    return data as Record<string,unknown>;
  }

  function rememberHandoff(item:CredentialHandoff){setHandoffs(current=>[item,...current.filter(existing=>existing.memberId!==item.memberId)]);setActiveHandoff(item);setCopyStatus("");}
  async function copyCredentials(item:CredentialHandoff){const text=`G3 6740 login\nEmail: ${item.email}\nTemporary password: ${item.password}\nYou will be asked to choose a new password after signing in.`;try{await navigator.clipboard.writeText(text);setCopyStatus(pick("Login details copied.","פרטי הכניסה הועתקו."));}catch{setCopyStatus(pick("Copy was blocked by the browser. Select and copy the password manually.","הדפדפן חסם את ההעתקה. יש לבחור ולהעתיק את הסיסמה ידנית."));}}

  async function createMember(event: FormEvent) {
    event.preventDefault();
    try {
      const createdName=name.trim(),createdEmail=email.trim().toLowerCase(),createdPassword=password;
      const result=await invoke({ action: "create", email:createdEmail, displayName:createdName, role, subteams, leaderSubteams:role==="team_leader"?leaderSubteams:[], temporaryPassword:createdPassword });
      rememberHandoff({memberId:String(result.userId??createdEmail),name:createdName,email:createdEmail,password:createdPassword,kind:"created"});
      setMessage(pick(`Account created successfully for ${createdName}.`,`החשבון של ${createdName} נוצר בהצלחה.`));
      setEmail(""); setName(""); setSubteams([]); setLeaderSubteams([]); setRole("member"); setPassword(temporaryPassword());
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create member"); }
  }

  async function resetMember(member: MemberProfile) {
    const nextPassword = temporaryPassword();
    if (!window.confirm(`Reset ${member.display_name}'s password? They will have to change it at next login.`)) return;
    try {
      await invoke({ action: "reset_password", userId: member.id, temporaryPassword: nextPassword });
      rememberHandoff({memberId:member.id,name:member.display_name,email:member.email,password:nextPassword,kind:"reset"});
      setMessage(pick(`A new temporary password was created for ${member.display_name}.`,`נוצרה סיסמה זמנית חדשה עבור ${member.display_name}.`));
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Reset failed"); }
  }

  async function toggleMember(member: MemberProfile) {
    try {
      await invoke({ action: "set_active", userId: member.id, active: !member.active });
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed"); }
  }

  function editMember(member: MemberProfile) {setEditingMember(member);setEditingName(member.display_name);setEditingRole(member.role);setEditingSubteams(member.subteams?.length?member.subteams:member.subteam?[member.subteam]:[]);setEditingLeaderSubteams(member.leader_subteams??[]);}
  async function saveMember(event:FormEvent){event.preventDefault();if(!editingMember||!editingName.trim())return;try{await invoke({action:"update_profile",userId:editingMember.id,displayName:editingName,role:editingRole,subteams:editingSubteams,leaderSubteams:editingRole==="team_leader"?editingLeaderSubteams:[]});setEditingMember(null);await loadMembers();}catch(error){setMessage(error instanceof Error?error.message:"Update failed");}}

  return (
    <div className="hub-page web-admin-page web-admin-members">
      <header className="hub-page-header"><div><div className="hub-eyebrow">{pick("Administration","ניהול")}</div><h1>{pick("Team members","חברי הקבוצה")}</h1><p>{pick("Create accounts, assign roles and control access.","יצירת חשבונות, הקצאת תפקידים וניהול הרשאות.")}</p></div></header>
      <div className="admin-members-layout">
        <section className="hub-card admin-member-form">
          <h2>{pick("Add a member","הוספת חבר/ת קבוצה")}</h2><p>{pick("No invitation email is sent. The member changes this temporary password on first login.","לא נשלח דוא״ל הזמנה. המשתמש מחליף את הסיסמה הזמנית בכניסה הראשונה.")}</p>
          <form className="auth-form" onSubmit={createMember}>
            <label>{pick("Full name","שם מלא")}<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>{pick("Email","דוא״ל")}<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>{pick("Role","תפקיד")}<select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}><option value="member">{pick("Student / Member","תלמיד/ה / חבר/ת קבוצה")}</option><option value="team_leader">{pick("Team leader","מוביל/ת צוות")}</option><option value="mentor">{pick("Mentor","מנטור/ית")}</option><option value="admin">{pick("Administrator","מנהל/ת")}</option></select></label>
            <TeamSelector value={subteams} onChange={setSubteams} pick={pick}/>
            {role==="team_leader"?<TeamSelector value={leaderSubteams} onChange={setLeaderSubteams} pick={pick} leadership/>:null}
            <label>{pick("Temporary password","סיסמה זמנית")}<div className="auth-inline"><input readOnly value={password} /><button type="button" onClick={() => setPassword(temporaryPassword())}>{pick("Generate","יצירה")}</button></div></label>
            <button className="hub-button">{pick("Create account","יצירת חשבון")}</button>
          </form>
          {message ? <div className="auth-message" role="status"><span>{message}</span><button type="button" onClick={()=>setMessage("")} aria-label={pick("Dismiss message","סגירת הודעה")}>×</button></div> : null}
          {handoffs.length?<section className="credential-handoff-list" aria-labelledby="credential-handoff-title"><header><div><span>{pick("Current admin session","הפעלת הניהול הנוכחית")}</span><h3 id="credential-handoff-title">{pick("Temporary login handoff","מסירת פרטי כניסה זמניים")}</h3></div><b>{handoffs.length}</b></header><p>{pick("These credentials are held only while this page remains open. Copy them securely before leaving.","פרטים אלה נשמרים רק כל עוד דף זה פתוח. יש להעתיק אותם באופן מאובטח לפני היציאה.")}</p>{handoffs.map(item=><article key={item.memberId}><div><strong>{item.name}</strong><small>{item.email}</small></div><span>{item.kind==="created"?pick("New account","חשבון חדש"):pick("Password reset","איפוס סיסמה")}</span><button type="button" onClick={()=>setActiveHandoff(item)}>{pick("View & copy","הצגה והעתקה")}</button></article>)}</section>:null}
        </section>
        <section className="hub-card admin-member-list">
          <div className="admin-list-heading"><h2>{pick("Members","חברים")}</h2><span>{members.filter((member) => member.active).length} {pick("active","פעילים")}</span></div>
          {loading ? <p>{pick("Loading…","טוען…")}</p> : members.map((member) => (
            <article className={`member-row${member.active ? "" : " is-inactive"}`} key={member.id}>
              <div className="member-avatar">{member.display_name.slice(0, 1).toUpperCase()}</div>
              <div className="member-identity"><strong>{member.display_name}</strong><span>{member.email}</span><small>{member.subteams?.length?member.subteams.join(" · "):member.subteam || pick("No team","ללא צוות")} · {member.role}</small></div>
              {member.must_change_password ? <span className="hub-role-chip">PASSWORD CHANGE</span> : null}
              <div className="member-actions"><button onClick={() => editMember(member)}>{pick("Edit","עריכה")}</button><button onClick={() => resetMember(member)}>{pick("Reset password","איפוס סיסמה")}</button><button onClick={() => toggleMember(member)}>{member.active ? pick("Deactivate","השבתה") : pick("Activate","הפעלה")}</button></div>
            </article>
          ))}
        </section>
      </div>
      {editingMember?<div className="member-edit-backdrop" role="presentation"><form className="hub-card member-edit-dialog" onSubmit={saveMember} role="dialog" aria-modal="true" aria-labelledby="edit-member-title"><header><div><div className="hub-eyebrow">{pick("Member assignment","שיוך חבר/ה")}</div><h2 id="edit-member-title">{pick("Edit member","עריכת חבר/ת קבוצה")}</h2></div><button type="button" onClick={()=>setEditingMember(null)} aria-label={pick("Close","סגירה")}>×</button></header><label>{pick("Full name","שם מלא")}<input required value={editingName} onChange={event=>setEditingName(event.target.value)}/></label><label>{pick("Role","תפקיד")}<select value={editingRole} onChange={event=>setEditingRole(event.target.value as TeamRole)}><option value="member">{pick("Student / Member","תלמיד/ה / חבר/ת קבוצה")}</option><option value="team_leader">{pick("Team leader","מוביל/ת צוות")}</option><option value="mentor">{pick("Mentor","מנטור/ית")}</option><option value="admin">{pick("Administrator","מנהל/ת")}</option></select></label><TeamSelector value={editingSubteams} onChange={setEditingSubteams} pick={pick}/>{editingRole==="team_leader"?<TeamSelector value={editingLeaderSubteams} onChange={setEditingLeaderSubteams} pick={pick} leadership/>:null}<footer><button type="button" onClick={()=>setEditingMember(null)}>{pick("Cancel","ביטול")}</button><button className="hub-button">{pick("Save changes","שמירת שינויים")}</button></footer></form></div>:null}
      {activeHandoff?<div className="credential-dialog-backdrop" role="presentation" onClick={()=>setActiveHandoff(null)}><section className="credential-dialog" role="dialog" aria-modal="true" aria-labelledby="credential-dialog-title" onClick={event=>event.stopPropagation()}><header><div><span>{activeHandoff.kind==="created"?pick("Account created","החשבון נוצר"):pick("Password reset","הסיסמה אופסה")}</span><h2 id="credential-dialog-title">{activeHandoff.name}</h2></div><button type="button" onClick={()=>setActiveHandoff(null)} aria-label={pick("Close","סגירה")}>×</button></header><div className="credential-success-mark" aria-hidden="true">✓</div><p>{pick("Give these login details directly to the member. No email was sent.","יש למסור את פרטי הכניסה ישירות לחבר/ת הקבוצה. לא נשלח דוא״ל.")}</p><label>{pick("Email","דוא״ל")}<input readOnly value={activeHandoff.email}/></label><label>{pick("Temporary password","סיסמה זמנית")}<input readOnly value={activeHandoff.password}/></label>{copyStatus?<div className="credential-copy-status" role="status">{copyStatus}</div>:null}<footer><button type="button" onClick={()=>setActiveHandoff(null)}>{pick("Done","סיום")}</button><button type="button" className="hub-button" onClick={()=>void copyCredentials(activeHandoff)}>{pick("Copy login details","העתקת פרטי הכניסה")}</button></footer><small>{pick("For security, this password cannot be recovered after this admin page is closed. Reset it if the member loses it.","מטעמי אבטחה, לא ניתן לשחזר סיסמה זו לאחר סגירת דף הניהול. אם היא אבדה, יש לאפס אותה.")}</small></section></div>:null}
    </div>
  );
}
