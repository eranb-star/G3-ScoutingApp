import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useMemberAuth } from "../lib/memberAuth";
import { useLocalization } from "../lib/localization";

export function LoginPage() {
  const { pick } = useLocalization();
  const { session, profile, loading, profileError } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const destination = (location.state as { from?: string } | null)?.from ?? "/home";

  if (!loading && session && profile) return <Navigate to={profile.must_change_password ? "/change-password" : destination} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage(error.message);
    setSubmitting(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel auth-brand-panel">
        <img src="/logoG3.png" alt="G3" />
        <div><div className="hub-eyebrow">Glue Gun &amp; Glitter</div><h1>{pick("Welcome to the G3 Team Hub","ברוכים הבאים למרכז הקבוצה G3")}</h1><p>{pick("One secure account for meetings, attendance, communication and competition.","חשבון מאובטח אחד לפגישות, נוכחות, תקשורת ותחרויות.")}</p></div>
      </section>
      <section className="auth-panel auth-form-panel">
        <div className="hub-eyebrow">{pick("Team access","כניסה לקבוצה")}</div>
        <h2>{pick("Sign in","כניסה")}</h2>
        <p>{pick("Use the email and temporary password provided by a team administrator.","השתמשו בדוא״ל ובסיסמה הזמנית שקיבלתם ממנהל הקבוצה.")}</p>
        <form onSubmit={submit} className="auth-form">
          <label>{pick("Email","דוא״ל")}<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>{pick("Password","סיסמה")}<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="hub-button" disabled={submitting}>{submitting ? pick("Signing in…","מתחבר…") : pick("Sign in","כניסה")}</button>
        </form>
        {message ? <div className="auth-message auth-error">{message}</div> : null}
        {session && profileError ? <div className="auth-message auth-error">{profileError}</div> : null}
        <small className="auth-help">{pick("Need access or a password reset? Contact a G3 administrator.","צריכים הרשאה או איפוס סיסמה? פנו למנהל G3.")}</small>
      </section>
    </main>
  );
}

export function ChangePasswordPage() {
  const { pick } = useLocalization();
  const { session, profile, refreshProfile } = useMemberAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (!session) return <Navigate to="/login" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) return setMessage("Use at least 10 characters.");
    if (password !== confirm) return setMessage("The passwords do not match.");
    setSubmitting(true);
    setMessage("");
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setMessage(passwordError.message);
      setSubmitting(false);
      return;
    }
    const { error: profileUpdateError } = await supabase.rpc("complete_first_login");
    if (profileUpdateError) {
      setMessage(profileUpdateError.message);
      setSubmitting(false);
      return;
    }
    await refreshProfile();
    navigate("/home", { replace: true });
  }

  return (
    <main className="auth-page auth-single">
      <section className="auth-panel auth-form-panel">
        <img className="auth-small-logo" src="/logoG3.png" alt="G3" />
        <div className="hub-eyebrow">{pick("First login","כניסה ראשונה")}</div><h1>{pick("Create your private password","יצירת סיסמה אישית")}</h1>
        <p>{pick(`Hello ${profile?.display_name || "team member"}. Your temporary password must be replaced before you continue.`,`שלום ${profile?.display_name || "חבר/ת קבוצה"}. יש להחליף את הסיסמה הזמנית לפני שממשיכים.`)}</p>
        <form onSubmit={submit} className="auth-form">
          <label>{pick("New password","סיסמה חדשה")}<input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>{pick("Confirm password","אימות סיסמה")}<input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          <button className="hub-button" disabled={submitting}>{submitting ? pick("Saving…","שומר…") : pick("Set password and continue","שמירת סיסמה והמשך")}</button>
        </form>
        {message ? <div className="auth-message auth-error">{message}</div> : null}
      </section>
    </main>
  );
}
