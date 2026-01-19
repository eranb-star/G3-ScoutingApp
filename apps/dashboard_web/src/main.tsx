import React, { useEffect, useMemo, useState, createContext, useContext } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";

import ScoutingPage from "./pages/ScoutingPage";
import AnalysisPage from "./pages/AnalysisPage";
import AlliancePage from "./pages/AlliancePage";
import PicklistPage from "./pages/PicklistPage";
import ComparePage from "./pages/ComparePage";
import SavedAlliancesPage from "./pages/SavedAlliancesPage";

import "./index.css";
import { supabase } from "./supabase";

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

type AdminState = {
  checking: boolean;
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

async function checkIsAdmin(userId: string): Promise<boolean> {
  // If RLS blocks this, we treat as NOT admin (but we do not freeze UI).
  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

function AdminProvider({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = async () => {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        setEmail("");
        setIsAdmin(false);
        return;
      }

      setEmail(session.user.email ?? "");
      const ok = await checkIsAdmin(session.user.id);
      setIsAdmin(ok);
    } catch {
      // Never block UI
      setEmail("");
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let alive = true;

    const run = async () => {
      await refresh();
    };

    run();

    // Correct typed destructuring (fixes TS errors)
    const { data } = supabase.auth.onAuthStateChange(async () => {
      if (!alive) return;
      await refresh();
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AdminState = { checking, email, isAdmin, refresh };

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

// ----------------------
// Admin Modal
// - closes immediately after successful login/logout
// - does NOT block navigation
// ----------------------
function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { email: authEmail, isAdmin, refresh } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Sync form
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
      setMsg("Logged in ✅");
      onClose(); // close immediately for good UX
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setMsg("");
    setSyncResult(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setMsg("Logout failed: " + error.message);
        return;
      }

      await refresh();
      setMsg("Logged out ✅");
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
      const cleanEventId = syncEventId.trim();
      if (!cleanEventId) {
        setMsg("Enter event UUID (event_id).");
        return;
      }

      // ✅ Generic makes TS happy (invoke returns unknown by default)
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
                <span style={{ marginLeft: 8, padding: "3px 8px", borderRadius: 999, background: "#e8fff6", fontWeight: 900 }}>
                  ADMIN
                </span>
              ) : (
                <span style={{ marginLeft: 8, padding: "3px 8px", borderRadius: 999, background: "#ffe0e0", fontWeight: 900 }}>
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

        {/* Admin-only actions */}
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
// TopNav (mobile friendly)
// ----------------------
function TopNav() {
  const location = useLocation();
  const { checking, email, isAdmin } = useAdmin();

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
    await supabase.auth.signOut();
    setAdminOpen(false);
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
      {/* Row 1: Logo + Links */}
      <div className="topnav-row topnav-row-1">
        <div className="topnav-left">
          <img className="topnav-logo" src="/logoG3.png" alt="Logo" />
          <div className="topnav-links">
            <NavLink to="/scouting" style={linkStyle}>
              Scouting
            </NavLink>

            {/* Admin-only navigation */}
            {isAdmin ? (
              <>
                <NavLink to="/analysis" style={linkStyle}>
                  Analysis
                </NavLink>
                <NavLink to="/analysis/alliance" style={linkStyle}>
                  Alliance
                </NavLink>
                <NavLink to="/analysis/picklist" style={linkStyle}>
                  Picklist
                </NavLink>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: Auth controls always visible */}
        <div className="topnav-auth">
          {checking ? (
            <div className="topnav-pill" style={{ opacity: 0.75, fontWeight: 900 }}>
              Checking…
            </div>
          ) : email ? (
            <>
              <div
                className="topnav-pill"
                style={{
                  background: isAdmin ? "rgba(0,180,90,0.14)" : "rgba(255,0,0,0.12)",
                  border: isAdmin ? "1px solid rgba(0,180,90,0.25)" : "1px solid rgba(255,0,0,0.22)",
                  fontWeight: 1000,
                }}
                title={email}
              >
                {isAdmin ? "ADMIN ✅" : "USER"}
              </div>

              <button className="topnav-btn" type="button" onClick={navLogout} title="Logout">
                Logout
              </button>
            </>
          ) : (
            <button className="topnav-btn" type="button" onClick={() => setAdminOpen(true)} title="Admin login">
              Login
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Time + Countdown (wraps nicely on mobile) */}
      <div className="topnav-row topnav-row-2">
        <div className="topnav-pill" title="Israel time">
          {fmtIsraelNow(now)}
        </div>

        <div className="topnav-pill" title="Next QM countdown (based on selected event in scouting)">
          {nextMatch?.scheduled_time ? (
            <>
              Next QM {nextMatch.match_number ?? "?"} · {msToClock(countdownMs)}
            </>
          ) : (
            <>No next match</>
          )}
        </div>

        {/* Admin modal (only opens when you click Login) */}
        <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      </div>
    </div>
  );
}

function AdminGate({ children }: { children: JSX.Element }) {
  // Gate only by current admin state (do not block the whole app while checking).
  const { checking, isAdmin } = useAdmin();

  if (checking) {
    return (
      <div style={{ padding: 16, maxWidth: 900 }}>
        <h2 style={{ marginTop: 0 }}>Checking admin…</h2>
        <div style={{ opacity: 0.85 }}>If this takes too long, you can still use Scouting.</div>
      </div>
    );
  }

  return isAdmin ? children : <Navigate to="/scouting" replace />;
}

function AppShell() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/scouting" replace />} />
        <Route path="/scouting" element={<ScoutingPage />} />

        {/* Admin-only routes */}
        <Route path="/analysis" element={<AdminGate><AnalysisPage /></AdminGate>} />
        <Route path="/analysis/alliance" element={<AdminGate><AlliancePage /></AdminGate>} />
        <Route path="/analysis/picklist" element={<AdminGate><PicklistPage /></AdminGate>} />
        <Route path="/analysis/compare" element={<AdminGate><ComparePage /></AdminGate>} />
        <Route path="/analysis/saved" element={<AdminGate><SavedAlliancesPage /></AdminGate>} />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <AppShell />
      </AdminProvider>
    </BrowserRouter>
  </React.StrictMode>
);
