import React, { useEffect, useMemo, useState } from "react";
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

// ----------------------
// Admin status hook (single source)
// ----------------------
function useAdminStatus() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!alive) return;

      if (!session?.user) {
        setUserEmail("");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserEmail(session.user.email ?? "");

      // IMPORTANT: this requires the RLS policy:
      // app_admins SELECT where user_id = auth.uid()
      const { data: adminRow, error } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        // If RLS is wrong, you’ll see false here. Fix policies first.
        setIsAdmin(false);
      } else {
        setIsAdmin(!!adminRow);
      }

      setLoading(false);
    };

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, userEmail, isAdmin };
}

// ----------------------
// Admin Modal (your existing modal, lightly adjusted)
// ----------------------
function AdminModal({
  open,
  onClose,
  isAdmin,
  userEmail,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  userEmail: string;
}) {
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
      setMsg("Logged in ✅");
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
      setMsg("Logged out ✅");
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

      const { data, error } = await supabase.functions.invoke("sync_tba_matches", {
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
          maxHeight: "85vh",
          overflow: "auto",
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

        <div style={{ marginTop: 10, opacity: 0.85 }}>
          {userEmail ? (
            <div>
              Logged in as <b>{userEmail}</b>{" "}
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
          {!userEmail ? (
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

          {!userEmail ? (
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
// Route guard
// ----------------------
function RequireAdmin({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  if (!isAdmin) return <Navigate to="/scouting" replace />;
  return <>{children}</>;
}

// ----------------------
// TopNav responsive + admin gating
// ----------------------
function TopNav() {
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);

  const { loading: adminLoading, userEmail, isAdmin } = useAdminStatus();

  // Israel time ticker
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Next match countdown (based on localStorage event)
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

      const row = (data?.[0] ?? null) as NextMatch | null;
      setNextMatch(row);
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

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    textDecoration: "none",
    color: "inherit",
    fontWeight: isActive ? 1000 : 800,
    padding: "8px 10px",
    borderRadius: 12,
    background: isActive ? "rgba(255, 0, 170, 0.12)" : "transparent",
    border: isActive ? "1px solid rgba(255, 0, 170, 0.22)" : "1px solid transparent",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div
      className="topnav"
      style={{
        padding: 10,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(8px)",
        background: "rgba(255,255,255,0.65)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Row 1: Logo + Admin button */}
      <div
        className="topnav-row"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <img
          className="topnav-logo"
          src="/logoG3.png"
          alt="Logo"
          style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover" }}
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Admin"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Row 2: Links (kids only see Scouting) */}
      <div
        className="topnav-links"
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          overflowX: "auto",
          paddingTop: 8,
          paddingBottom: 6,
        }}
      >
        <NavLink to="/scouting" style={linkStyle}>
          Scouting
        </NavLink>

        {isAdmin ? (
          <>
            <NavLink to="/analysis" style={linkStyle}>
              Analysis
            </NavLink>
            <NavLink to="/analysis/alliance" style={linkStyle}>
              Alliance Builder
            </NavLink>
            <NavLink to="/analysis/picklist" style={linkStyle}>
              Picklist
            </NavLink>
          </>
        ) : null}
      </div>

      {/* Row 3: Status pill (time + countdown) */}
      <div
        className="topnav-status"
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          paddingTop: 4,
        }}
      >
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.06)",
            fontWeight: 1000,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>G3 Scouting</span>

          <span style={{ opacity: 0.8, fontWeight: 900 }}>
            {fmtIsraelNow(now)}
          </span>

          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.06)",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
            title="Next QM countdown"
          >
            {nextMatch?.scheduled_time ? (
              <>Next QM {nextMatch.match_number ?? "?"} · {msToClock(countdownMs)}</>
            ) : (
              <>No next match</>
            )}
          </span>

          <span style={{ opacity: 0.75, fontWeight: 900 }}>
            {adminLoading ? "Checking admin…" : isAdmin ? "ADMIN" : ""}
          </span>
        </div>
      </div>

      <AdminModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        isAdmin={isAdmin}
        userEmail={userEmail}
      />
    </div>
  );
}

function AppShell() {
  const { isAdmin } = useAdminStatus();

  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/scouting" replace />} />
        <Route path="/scouting" element={<ScoutingPage />} />

        {/* Admin-only */}
        <Route
          path="/analysis"
          element={
            <RequireAdmin isAdmin={isAdmin}>
              <AnalysisPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/analysis/alliance"
          element={
            <RequireAdmin isAdmin={isAdmin}>
              <AlliancePage />
            </RequireAdmin>
          }
        />
        <Route
          path="/analysis/picklist"
          element={
            <RequireAdmin isAdmin={isAdmin}>
              <PicklistPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/analysis/compare"
          element={
            <RequireAdmin isAdmin={isAdmin}>
              <ComparePage />
            </RequireAdmin>
          }
        />
        <Route
          path="/analysis/saved"
          element={
            <RequireAdmin isAdmin={isAdmin}>
              <SavedAlliancesPage />
            </RequireAdmin>
          }
        />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);
