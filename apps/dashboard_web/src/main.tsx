import React, { createContext, lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";

import ScoutingPage from "./pages/ScoutingPage";
import AnalysisPage from "./pages/AnalysisPage";
import AlliancePage from "./pages/AlliancePage";
import PicklistPage from "./pages/PicklistPage";
import ComparePage from "./pages/ComparePage";
import SavedAlliancesPage from "./pages/SavedAlliancesPage";
import {
  CheckInPage,
  MorePage,
  SchedulePage,
} from "./pages/TeamHubPages";

import "./index.css";
import "./teamHub.css";
import "./mediaFeedback.css";
import { supabase } from "./supabase";
import { MemberAuthProvider, useMemberAuth } from "./lib/memberAuth";
import { ChangePasswordPage, LoginPage } from "./pages/AuthPages";
import MembersAdminPage from "./pages/MembersAdminPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AttendanceReportsPage from "./pages/AttendanceReportsPage";
import { LocalizationProvider, useLocalization } from "./lib/localization";
import { ProfilePage, SettingsPage } from "./pages/OperationsPages";
import ToolsInventoryPage from "./pages/ToolsInventoryPage";
import ProductivityHomePage from "./pages/ProductivityHomePage";
import FrcOperationsPage from "./pages/FrcOperationsPage";
import ProjectsPage from "./pages/ProjectsPage";
import UpdatesPage from "./pages/UpdatesPage";
import FrcWorkPage from "./pages/FrcWorkPage";
import SecurityAdminPage from "./pages/SecurityAdminPage";
import RobotIssuesPage from "./pages/RobotIssuesPage";
import RobotReliabilityPage from "./pages/RobotReliabilityPage";
import RobotMaintenancePage from "./pages/RobotMaintenancePage";
import CompetitionAssignmentBanner from "./components/CompetitionAssignmentBanner";
import TeamGrowthPage from "./pages/TeamGrowthPage";
import SeasonPlanningPage from "./pages/SeasonPlanningPage";
import SkillsAcademyGuide from "./components/SkillsAcademyGuide";
import ContributionInsightsPage from "./pages/ContributionInsightsPage";
import UnifiedCalendarPage from "./pages/UnifiedCalendarPage";
import ContextBackBar from "./components/ContextBackBar";
import { getUnreadUpdateCounts } from "./lib/unreadUpdates";
import { Capacitor } from "@capacitor/core";
import WebPortalShell, { WebCheckInNotice } from "./components/WebPortalShell";
import PermissionsAdminPage from "./pages/PermissionsAdminPage";
const FrcAssistantPage=lazy(()=>import("./pages/FrcAssistantPage"));
const CompetitionOperationsPage=lazy(()=>import("./pages/CompetitionOperationsPage"));
const TrainingCenterPage=lazy(()=>import("./pages/TrainingCenterPage"));
const CompetitionDisplayPage=lazy(()=>import("./pages/CompetitionDisplayPage"));
const PitScoutingPage=lazy(()=>import("./pages/PitScoutingPage"));
const ScoutingQualityPage=lazy(()=>import("./pages/ScoutingQualityPage"));
const CompetitionControlPage=lazy(()=>import("./pages/CompetitionControlPage"));
const TbaExplorerPage=lazy(()=>import("./pages/TbaExplorerPage"));
const PitAssignmentsPage=lazy(()=>import("./pages/PitAssignmentsPage"));
const TeamMediaPage=lazy(()=>import("./pages/TeamMediaPage"));
const FeedbackCenterPage=lazy(()=>import("./pages/FeedbackCenterPage"));
const EngineeringHubPage=lazy(()=>import("./pages/EngineeringHubPage"));

function WorkspaceLoading(){const[slow,setSlow]=useState(false);useEffect(()=>{const timer=window.setTimeout(()=>setSlow(true),6000);return()=>window.clearTimeout(timer);},[]);return <section className="workspace-loader" role="status" aria-live="polite"><img src="/g3-assistant.png" alt=""/><div><strong>Opening G3 workspace…</strong><span>{slow?"This connection is taking longer than usual. You can retry safely.":"Loading the latest team data and tools."}</span></div>{slow?<button type="button" onClick={()=>window.location.reload()}>Retry</button>:null}</section>}
class WorkspaceErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(error:unknown){console.error("Workspace route failed to load",error)}render(){return this.state.failed?<section className="workspace-loader is-error" role="alert"><img src="/g3-assistant.png" alt=""/><div><strong>G3 could not open this area</strong><span>Your data is safe. Reload to fetch the latest application version.</span></div><button type="button" onClick={()=>window.location.reload()}>Reload G3</button></section>:this.props.children}}

// ----------------------
// Small helpers
// ----------------------
function fmtIsraelNow(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function msToClock(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

type NextMatch = {
  match_type: string | null;
  match_number: number | null;
  scheduled_time: string | null;
};

function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

// ----------------------
// Online status
// ----------------------
function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine !== false : true));

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

// ----------------------
// Admin context
// ----------------------
type AdminState = {
  bootstrapped: boolean; // false only at first app boot
  email: string;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

const AdminCtx = createContext<AdminState | null>(null);

function useAdmin() {
  const v = useContext(AdminCtx);
  if (!v) throw new Error("useAdmin must be used within AdminProvider");
  return v;
}

// ✅ STEP 1 CHANGE: use RPC is_admin() instead of querying app_admins
async function checkIsAdmin(): Promise<boolean> {
  try {
    const q = supabase.rpc("is_admin") as unknown as PromiseLike<{ data: boolean | null; error: any }>;
    const { data, error } = await withTimeout(q, 4000);

    // If RLS blocks or any error: treat as NOT admin (never freeze the UI).
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

function AdminProvider({ children }: { children: React.ReactNode }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // prevent overlapping refresh calls (avoids flicker + "checking" loops)
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = async () => {
    if (inflight.current) return inflight.current;

    inflight.current = (async () => {
      try {
        const sessionResp = await withTimeout(supabase.auth.getSession(), 4000);
        const session = sessionResp.data.session;

        if (!session?.user) {
          setEmail("");
          setIsAdmin(false);
          return;
        }

        setEmail(session.user.email ?? "");

        // ✅ STEP 1 CHANGE: no userId needed; rpc uses auth.uid()
        const ok = await checkIsAdmin();
        setIsAdmin(ok);
      } catch {
        // Never block UI
        setEmail("");
        setIsAdmin(false);
      } finally {
        // IMPORTANT: only flips to true; never back to false
        setBootstrapped(true);
      }
    })().finally(() => {
      inflight.current = null;
    });

    return inflight.current;
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await refresh();
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      if (!alive) return;
      await refresh();
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AdminState = { bootstrapped, email, isAdmin, refresh };
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

// ----------------------
// Admin Modal (Login + Tools)
// ----------------------
function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { email: authEmail, isAdmin, refresh } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Tools
  const [syncEventId, setSyncEventId] = useState<string>("");
  const [replace, setReplace] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setMsg("");
    setSyncResult(null);
  }, [open]);

  const signIn = async () => {
    setLoading(true);
    setMsg("");
    setSyncResult(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg("Login failed: " + error.message);
        return;
      }

      await refresh();
      onClose(); // close immediately for better UX
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setMsg("");
    setSyncResult(null);

    try {
      // "local" works even when offline / flaky network
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        setMsg("Logout failed: " + error.message);
        return;
      }
      await refresh(); // force UI update immediately
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const syncMatches = async () => {
    setLoading(true);
    setMsg("");
    setSyncResult(null);

    try {
      if (!isAdmin) {
        setMsg("Admin only.");
        return;
      }

      const cleanEventId = syncEventId.trim();
      if (!cleanEventId) {
        setMsg("Enter event UUID (event_id).");
        return;
      }

      const { data, error } = await supabase.functions.invoke<any>("sync_tba_matches", {
        body: { event_id: cleanEventId, replace },
      });

      if (error) {
        setMsg("Sync failed: " + (error.message ?? String(error)));
        return;
      }

      setSyncResult(data);
      setMsg("Sync OK ✅");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          borderRadius: 18,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.12)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 1000, fontSize: 18 }}>Admin</div>
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.9 }}>
          {authEmail ? (
            <div>
              Logged in as <b>{authEmail}</b>{" "}
              {isAdmin ? (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "#e8fff6",
                    fontWeight: 900,
                  }}
                >
                  ADMIN
                </span>
              ) : (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "#ffe0e0",
                    fontWeight: 900,
                  }}
                >
                  NOT ADMIN
                </span>
              )}
            </div>
          ) : (
            <div>Not logged in.</div>
          )}
        </div>

        {/* Login / Logout */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          {!authEmail ? (
            <>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@email.com"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ccc", width: 260 }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>Password</div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ccc", width: 260 }}
                />
              </div>

              <button
                type="button"
                onClick={signIn}
                disabled={loading}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                {loading ? "Working..." : "Login"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={signOut}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              {loading ? "Working..." : "Logout"}
            </button>
          )}
        </div>

        {/* Admin-only tools */}
        <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>Admin tools</div>

          {!authEmail ? (
            <div style={{ opacity: 0.8 }}>Login to access admin tools.</div>
          ) : !isAdmin ? (
            <div style={{ color: "crimson", fontWeight: 900 }}>
              You are logged in but not in <code>app_admins</code>.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 900 }}>event_id (UUID)</div>
                  <input
                    value={syncEventId}
                    onChange={(e) => setSyncEventId(e.target.value)}
                    placeholder="f34e67ec-bac9-433e-a97a-1e295aef8f30"
                    style={{ padding: 10, borderRadius: 12, border: "1px solid #ccc", width: 360 }}
                  />
                </div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
                  <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                  Replace QM
                </label>

                <button
                  type="button"
                  onClick={syncMatches}
                  disabled={loading}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid #ddd",
                    background: "#fff",
                    fontWeight: 1000,
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Working..." : "Fetch matches from TBA"}
                </button>
              </div>

              {syncResult ? (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 14,
                    background: "#fafafa",
                    border: "1px solid #eee",
                    overflowX: "auto",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(syncResult, null, 2)}
                </pre>
              ) : null}
            </div>
          )}
        </div>

        {msg ? <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.9 }}>{msg}</div> : null}
      </div>
    </div>
  );
}

// ----------------------
// TopNav
// ----------------------
function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, pick } = useLocalization();
  const { bootstrapped, email, isAdmin, refresh } = useAdmin();
  const online = useOnlineStatus();
  const [adminOpen, setAdminOpen] = useState(false);

  // Israel time ticker
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Next match countdown
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);
  const [countdownMs, setCountdownMs] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    const loadNext = async () => {
      const eventId = (localStorage.getItem("g3_event_id") ?? "").trim();
      if (!eventId) {
        setNextMatch(null);
        return;
      }

      const isoNow = new Date().toISOString();
      const { data, error } = await supabase
        .from("matches")
        .select("match_type,match_number,scheduled_time")
        .eq("event_id", eventId)
        .eq("match_type", "qm")
        .gte("scheduled_time", isoNow)
        .order("scheduled_time", { ascending: true })
        .limit(1);

      if (!alive) return;

      if (error) {
        setNextMatch(null);
        return;
      }

      setNextMatch((data?.[0] ?? null) as NextMatch | null);
    };

    loadNext();
    const interval = setInterval(loadNext, 60_000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!nextMatch?.scheduled_time) {
        setCountdownMs(0);
        return;
      }
      const ms = new Date(nextMatch.scheduled_time).getTime() - Date.now();
      setCountdownMs(ms);
    }, 1000);

    return () => clearInterval(t);
  }, [nextMatch]);

  const navLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      await refresh(); // force immediate UI update
      setAdminOpen(false);
    }
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    textDecoration: "none",
    color: "inherit",
    fontWeight: isActive ? 1000 : 800,
    padding: "6px 8px",
    borderRadius: 12,
    background: isActive ? "rgba(255, 0, 170, 0.12)" : "transparent",
    border: isActive ? "1px solid rgba(255, 0, 170, 0.22)" : "1px solid transparent",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div className="topnav">
      <div className="topnav-row topnav-row-1">
        <div className="topnav-left">
          <img className="topnav-logo" src="/logoG3.png" alt="Logo" />
          <div className="topnav-links">
            <NavLink to="/home" style={linkStyle}>
              {t("home")}
            </NavLink>

            <NavLink to="/work" style={linkStyle}>
              {t("work")}
            </NavLink>

            <NavLink to="/check-in" style={linkStyle}>
              {t("checkIn")}
            </NavLink>

            <NavLink to="/updates" style={linkStyle}>
              {t("updates")}
            </NavLink>
          </div>
        </div>

        <div className="topnav-auth">
          {/* Connection state stays legible on the G3 pink navigation. */}
          <div
            className="topnav-pill"
            style={{
              background: online ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.10)",
              border: online ? "1px solid rgba(255,255,255,0.48)" : "1px solid rgba(0,0,0,0.10)",
              color: "#fff",
              fontWeight: 900,
              opacity: 0.95,
            }}
            title={online ? "Online" : "Offline"}
          >
            {online ? pick("ONLINE","מחובר") : pick("OFFLINE","לא מחובר")}
          </div>

          {!bootstrapped ? (
            <div className="topnav-pill" style={{ opacity: 0.75, fontWeight: 900 }}>
              Checking…
            </div>
          ) : email ? (
            <>
              <div
                className="topnav-pill"
                style={{
                  background: isAdmin ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.06)",
                  color: "#fff",
                  border: isAdmin ? "1px solid rgba(255,255,255,0.48)" : "1px solid rgba(0,0,0,0.10)",
                  fontWeight: 1000,
                }}
                title={email}
              >
                {isAdmin ? "ADMIN ✅" : "USER"}
              </div>

              {isAdmin ? (
                <button className="topnav-btn" type="button" onClick={() => navigate("/admin")} title="Administration">
                  {t("administration")}
                </button>
              ) : null}

              <button className="topnav-btn topnav-calendar-btn" type="button" onClick={() => navigate("/schedule")} title={pick("Team schedule","לוח הקבוצה")} aria-label={pick("Open team schedule","פתיחת לוח הקבוצה")}>
                <span aria-hidden="true">▦</span><span>{pick("Calendar","לוח")}</span>
              </button>

              <NotificationBell />

              <button className="topnav-btn" type="button" onClick={navLogout} title="Logout">
                {pick("Logout","יציאה")}
              </button>
            </>
          ) : (
            <button className="topnav-btn" type="button" onClick={() => setAdminOpen(true)} title="Admin login">
              {pick("Login","כניסה")}
            </button>
          )}
        </div>
      </div>

      <div className="topnav-row topnav-row-2">
        <div className="topnav-pill" title="Israel time">
          {fmtIsraelNow(now)}
        </div>

        <div className="topnav-pill" title="Next QM countdown (based on selected event in scouting)">
          {nextMatch?.scheduled_time ? (
            <>
              {pick("Next QM","משחק הבא")} {nextMatch.match_number ?? "?"} · {msToClock(countdownMs)}
            </>
          ) : (
            <>{pick("No next match","אין משחק קרוב")}</>
          )}
        </div>

        <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      </div>
    </div>
  );
}

function NotificationBell() {
  const { profile } = useMemberAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const counts=await getUnreadUpdateCounts(profile.id);
      setUnread(counts.announcements+counts.channels+counts.actions);
    };
    void load();
    const channel = supabase.channel("notification-bell").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load).on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages" }, load).on("postgres_changes", { event: "*", schema: "public", table: "team_actions" }, load).on("postgres_changes", { event: "*", schema: "public", table: "team_action_states", filter: `member_id=eq.${profile.id}` }, load).subscribe();
    window.addEventListener("g3-announcements-changed", load);
    window.addEventListener("g3-channels-seen", load);
    window.addEventListener("g3-actions-changed", load);
    return () => { void supabase.removeChannel(channel); window.removeEventListener("g3-announcements-changed", load); window.removeEventListener("g3-channels-seen", load); window.removeEventListener("g3-actions-changed", load); };
  }, [profile?.id]);
  return <button className="notification-bell" type="button" onClick={() => navigate("/updates?view=inbox")} aria-label={`${unread} unread updates`}><span aria-hidden="true">●</span>{unread > 0 ? <b>{unread > 99 ? "99+" : unread}</b> : null}</button>;
}

function MobileNav() {
  const { t } = useLocalization();
  const { profile } = useMemberAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  useEffect(() => {
    if (!profile) return;
    const load = () => supabase.from("attendance_records").select("id").eq("member_id", profile.id).is("checked_out_at", null).limit(1).then(({ data }) => setCheckedIn(Boolean(data?.length)));
    void load();
    const attendanceChannel = supabase.channel(`mobile-attendance-${profile.id}`).on("postgres_changes", { event: "*", schema: "public", table: "attendance_records", filter: `member_id=eq.${profile.id}` }, load).subscribe();
    window.addEventListener("g3-attendance-changed", load);
    return () => { void supabase.removeChannel(attendanceChannel); window.removeEventListener("g3-attendance-changed", load); };
  }, [profile?.id]);
  const linkClass = ({ isActive }: { isActive: boolean }) => `mobile-nav-link${isActive ? " is-active" : ""}`;
  return (
    <nav className="mobile-nav" aria-label="Primary navigation">
      <NavLink to="/home" className={linkClass}><span aria-hidden="true">⌂</span><small>{t("home")}</small></NavLink>
      <NavLink to="/work" className={linkClass}><span aria-hidden="true">▦</span><small>{t("work")}</small></NavLink>
      <NavLink to="/check-in" className={({ isActive }) => `${linkClass({ isActive })}${checkedIn ? " is-checked-in" : ""}`}><span className="mobile-check-mark" aria-hidden="true">{checkedIn ? "✓" : "●"}</span><small>{checkedIn ? t("checkOut") : t("checkIn")}</small></NavLink>
      <NavLink to="/updates" className={linkClass}><span aria-hidden="true">◆</span><small>{t("updates")}</small></NavLink>
      <NavLink to="/more" className={linkClass}><span aria-hidden="true">•••</span><small>{t("more")}</small></NavLink>
    </nav>
  );
}

function AdminGate({ children }: { children: JSX.Element }) {
  const { bootstrapped, isAdmin } = useAdmin();
  if (!bootstrapped) return <div className="app-loading">Checking administrator access…</div>;
  return isAdmin ? children : <Navigate to="/home" replace />;
}

function MemberGate({ children }: { children: JSX.Element }) {
  const { loading, session, profile, profileError } = useMemberAuth();
  const location = useLocation();
  if (loading) return <div className="app-loading">Loading G3 6740 Team Hub…</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!profile) {
    return (
      <div className="auth-page auth-single">
        <section className="auth-panel auth-form-panel">
          <h1>Account unavailable</h1><p>{profileError || "This account is not an active G3 member."}</p>
          <button className="hub-button" onClick={() => supabase.auth.signOut({ scope: "local" })}>Sign out</button>
        </section>
      </div>
    );
  }
  if (!profile.active) return <Navigate to="/login" replace />;
  if (profile.must_change_password && location.pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  return children;
}

function AppShell() {
  const nativeApp = Capacitor.isNativePlatform();
  const [webAssistantOpen,setWebAssistantOpen]=useState(false);
  const { isAdmin } = useAdmin();
  const location = useLocation();
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:"auto"});},[location.pathname,location.search]);
  useEffect(()=>{setWebAssistantOpen(false);},[location.pathname]);
  const isAuthScreen = location.pathname === "/login" || location.pathname === "/change-password";
  const isPrimaryDestination=["/home","/work","/schedule","/updates","/growth","/more","/admin"].includes(location.pathname);
  const activeIssue=location.pathname==="/robot-issues"?new URLSearchParams(location.search).get("issue"):null;
  const assistantPath=activeIssue?`/assistant?issue=${activeIssue}`:"/assistant";
  const isDisplayScreen=location.pathname==="/competition/display";
  const Shell = !nativeApp && !isAuthScreen && !isDisplayScreen ? WebPortalShell : React.Fragment;
  return (
    <Shell>
      {!isAuthScreen && nativeApp ? <TopNav /> : null}
      {!isAuthScreen && (nativeApp || !isPrimaryDestination) ? <ContextBackBar /> : null}
      <WorkspaceErrorBoundary><Suspense fallback={<WorkspaceLoading/>}><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<MemberGate><ProductivityHomePage isAdmin={isAdmin} allowCheckIn={nativeApp} /></MemberGate>} />
        <Route path="/schedule" element={<MemberGate><UnifiedCalendarPage /></MemberGate>} />
        <Route path="/check-in" element={<MemberGate>{nativeApp ? <CheckInPage /> : <WebCheckInNotice />}</MemberGate>} />
        <Route path="/work" element={<MemberGate><FrcWorkPage /></MemberGate>} />
        <Route path="/updates" element={<MemberGate><UpdatesPage /></MemberGate>} />
        <Route path="/messages" element={<Navigate to="/updates?view=announcements" replace />} />
        <Route path="/more" element={<MemberGate><MorePage isAdmin={isAdmin} /></MemberGate>} />
        <Route path="/competition" element={<MemberGate><><CompetitionAssignmentBanner/><CompetitionOperationsPage isAdmin={isAdmin} /></></MemberGate>} />
        <Route path="/competition/display" element={<MemberGate><CompetitionDisplayPage /></MemberGate>} />
        <Route path="/competition/pit-scouting" element={<MemberGate><PitScoutingPage /></MemberGate>} />
        <Route path="/competition/scouting-quality" element={<MemberGate><ScoutingQualityPage /></MemberGate>} />
        <Route path="/competition/control" element={<MemberGate><CompetitionControlPage /></MemberGate>} />
        <Route path="/competition/library" element={<MemberGate><TbaExplorerPage /></MemberGate>} />
        <Route path="/competition/pit-assignments" element={<MemberGate><PitAssignmentsPage /></MemberGate>} />
        <Route path="/growth" element={<MemberGate><TrainingCenterPage /></MemberGate>} />
        <Route path="/media" element={<MemberGate><TeamMediaPage /></MemberGate>} />
        <Route path="/feedback" element={<MemberGate><FeedbackCenterPage /></MemberGate>} />
        <Route path="/engineering" element={<MemberGate><EngineeringHubPage /></MemberGate>} />
        <Route path="/season-planning" element={<MemberGate><SeasonPlanningPage /></MemberGate>} />
        <Route path="/admin/members" element={<AdminGate><MembersAdminPage /></AdminGate>} />
        <Route path="/admin" element={<AdminGate><AdminDashboardPage /></AdminGate>} />
        <Route path="/admin/reports" element={<AdminGate><AttendanceReportsPage /></AdminGate>} />
        <Route path="/admin/contributions" element={<AdminGate><ContributionInsightsPage /></AdminGate>} />
        <Route path="/admin/security" element={<AdminGate><SecurityAdminPage /></AdminGate>} />
        <Route path="/admin/permissions" element={<AdminGate><PermissionsAdminPage /></AdminGate>} />
        <Route path="/attendance" element={<MemberGate><AttendanceReportsPage /></MemberGate>} />
        <Route path="/profile" element={<MemberGate><ProfilePage /></MemberGate>} />
        <Route path="/projects" element={<MemberGate><ProjectsPage /></MemberGate>} />
        <Route path="/tools" element={<MemberGate><ToolsInventoryPage /></MemberGate>} />
        <Route path="/frc-operations" element={<MemberGate><FrcOperationsPage /></MemberGate>} />
        <Route path="/robot-issues" element={<MemberGate><RobotIssuesPage /></MemberGate>} />
        <Route path="/robot-reliability" element={<MemberGate><RobotReliabilityPage /></MemberGate>} />
        <Route path="/robot-maintenance" element={<MemberGate><RobotMaintenancePage /></MemberGate>} />
        <Route path="/settings" element={<MemberGate><SettingsPage /></MemberGate>} />
        <Route path="/assistant" element={<MemberGate><FrcAssistantPage /></MemberGate>} />
        <Route path="/scouting" element={<MemberGate><ScoutingPage /></MemberGate>} />

        <Route path="/analysis" element={<MemberGate><AnalysisPage /></MemberGate>} />

        <Route
          path="/analysis/alliance"
          element={
            <AdminGate>
              <AlliancePage />
            </AdminGate>
          }
        />
        <Route
          path="/analysis/picklist"
          element={
            <AdminGate>
              <PicklistPage />
            </AdminGate>
          }
        />
        <Route
          path="/analysis/compare"
          element={
            <AdminGate>
              <ComparePage />
            </AdminGate>
          }
        />
        <Route
          path="/analysis/saved"
          element={
            <AdminGate>
              <SavedAlliancesPage />
            </AdminGate>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes></Suspense></WorkspaceErrorBoundary>
      {!isAuthScreen && !isDisplayScreen && location.pathname !== "/assistant" ? nativeApp?<NavLink className="assistant-fab" to={assistantPath} aria-label="Open G3 Assist"><img src="/g3-assistant.png" alt="" /></NavLink>:<button className="assistant-fab web-assistant-trigger" type="button" onClick={()=>{sessionStorage.removeItem("g3-assistant-active-conversation");setWebAssistantOpen(true);}} aria-label="Open G3 Assist"><img src="/g3-assistant.png" alt="" /></button> : null}
      {!nativeApp&&webAssistantOpen?<div className="web-assistant-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget){sessionStorage.removeItem("g3-assistant-active-conversation");setWebAssistantOpen(false);}}}><section className="web-assistant-dialog" role="dialog" aria-modal="true" aria-label="G3 Assist"><button className="web-assistant-close" type="button" onClick={()=>{sessionStorage.removeItem("g3-assistant-active-conversation");setWebAssistantOpen(false);}} aria-label="Close G3 Assist">×</button><FrcAssistantPage/></section></div>:null}
      {!isAuthScreen && nativeApp ? <MobileNav /> : null}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <LocalizationProvider><MemberAuthProvider><AppShell /></MemberAuthProvider></LocalizationProvider>
      </AdminProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if("serviceWorker" in navigator&&import.meta.env.PROD){
  window.addEventListener("load",()=>void navigator.serviceWorker.register("/sw.js"));
}
