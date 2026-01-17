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

type AdminState = {
  userEmail: string;
  isAdmin: boolean;
  userId: string;
};

// ----------------------
// Admin Modal (Option 2)
// ----------------------
function AdminModal({
  open,
  onClose,
  onAdminState,
  initialEventId,
}: {
  open: boolean;
  onClose: () => void;
  onAdminState: (s: AdminState) => void;
  initialEventId?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");

  // Sync form
  const [syncEventId, setSyncEventId] = useState<string>(initialEventId ?? "");
  const [replace, setReplace] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Keep eventId input updated when modal opens (use localStorage selection if available)
  useEffect(() => {
    if (!open) return;
    const stored = (localStorage.getItem("g3_event_id") ?? "").trim();
    setSyncEventId((prev) => (prev?.trim() ? prev : stored));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setMsg("");
      setSyncResult(null);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        setUserEmail("");
        setIsAdmin(false);
        setUserId("");
        onAdminState({ userEmail: "", isAdmin: false, userId: "" });
        return;
      }

      const emailNow = session.user.email ?? "";
      const uid = session.user.id;

      setUserEmail(emailNow);
      setUserId(uid);

      const { data: adminRow, error: adminErr } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (adminErr) {
        setIsAdmin(false);
        setMsg("Admin check failed: " + adminErr.message);
        onAdminState({ userEmail: emailNow, isAdmin: false, userId: uid });
        return;
      }

      const ok = !!adminRow;
      setIsAdmin(ok);
      onAdminState({ userEmail: emailNow, isAdmin: ok, userId: uid });
    };

    load();
  }, [open, onAdminState]);

  const signIn = async () => {
    setLoading(true);
    setMsg("");
    setSyncResult(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg("Login failed: " + error.message);
        return;
      }

      const emailNow = data.user?.email ?? "";
      const uid = data.user?.id ?? "";

      setUserEmail(emailNow);
      setUserId(uid);

      // Re-check admin
      const { data: adminRow, error: adminErr } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (adminErr) {
        setIsAdmin(false);
        setMsg("Admin check failed: " + adminErr.message);
        onAdminState({ userEmail: emailNow, isAdmin: false, userId: uid });
        return;
      }

      const ok = !!adminRow;
      setIsAdmin(ok);
      onAdminState({ userEmail: emailNow, isAdmin: ok, userId: uid });

      if (ok) {
        setMsg("Logged in ✅ (ADMIN)");
        // ✅ KEY FIX: auto-close so it won't sit on top forever
        // still leaves you logged-in and able to open tools when needed
        setTimeout(() => onClose(), 250);
      } else {
        setMsg("Logged in ✅ (NOT ADMIN)");
      }
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

      setUserEmail("");
      setIsAdmin(false);
      setUserId("");
      onAdminState({ userEmail: "", isAdmin: false, userId: "" });

      setMsg("Logged out ✅");
      // Close after logout so it doesn’t remain a blocker
      setTimeout(() => onClose(), 200);
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
                  Replace QM (delete existing then import)
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
// TopNav with active link highlight + time + countdown + admin tools
// ----------------------
function TopNav() {
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);

  // Global admin state (so UI does not "stick" wrongly)
  const [adminState, setAdminState] = useState<AdminState>({
    userEmail: "",
    isAdmin: false,
    userId: "",
  });

  // Keep adminState synced across refresh/navigation
  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!alive) return;

      if (!s?.user) {
        setAdminState({ userEmail: "", isAdmin: false, userId: "" });
        return;
      }

      const uid = s.user.id;
      const emailNow = s.user.email ?? "";

      const { data: adminRow } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (!alive) return;

      setAdminState({ userEmail: emailNow, isAdmin: !!adminRow, userId: uid });
    };

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Israel time ticker
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Next match countdown (uses localStorage selected event)
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

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    textDecoration: "none",
    color: "inherit",
    fontWeight: isActive ? 1000 : 800,
    padding: "8px 10px",
    borderRadius: 12,
    background: isActive ? "rgba(255, 0, 170, 0.12)" : "transparent",
    border: isActive ? "1px solid rgba(255, 0, 170, 0.22)" : "1px solid transparent",
  });

  const titlePill = useMemo(() => {
    return (
      <div
        style={{
          marginLeft: "auto",
          padding: "6px 12px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.06)",
          fontWeight: 1000,
          fontSize: "22px",
          letterSpacing: 0.3,
          display: "flex",
          gap: 10,
          alignItems: "center",
          maxWidth: "100%",
        }}
      >
        <span>G3 Scouting App</span>

        <span style={{ opacity: 0.75, fontWeight: 900, fontSize: 16, whiteSpace: "nowrap" }}>
          {fmtIsraelNow(now)}
        </span>

        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.06)",
            fontWeight: 900,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
          title="Next QM countdown (based on selected event in scouting)"
        >
          {nextMatch?.scheduled_time ? (
            <>
              Next QM {nextMatch.match_number ?? "?"} · {msToClock(countdownMs)}
            </>
          ) : (
            <>No next match</>
          )}
        </span>

        {/* Show admin badge + quick open only if admin */}
        {adminState.isAdmin ? (
          <>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#e8fff6",
                border: "1px solid rgba(0,0,0,0.06)",
                fontWeight: 1000,
                fontSize: 14,
                whiteSpace: "nowrap",
              }}
              title={adminState.userEmail}
            >
              ADMIN
            </span>

            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
              title="Admin tools (Fetch matches)"
            >
              Fetch
            </button>
          </>
        ) : (
          // Keep small Admin entry available (for you to log in), but not scary
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
            }}
            title="Admin login"
          >
            Admin
          </button>
        )}

        <AdminModal
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
          onAdminState={(s) => setAdminState(s)}
        />
      </div>
    );
  }, [now, nextMatch, countdownMs, adminOpen, adminState.isAdmin, adminState.userEmail]);

  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        gap: 12,
        fontSize: "22px",
        alignItems: "center",
        backdropFilter: "blur(8px)",
        background: "rgba(255,255,255,0.65)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        flexWrap: "wrap",         // helps on phone
        maxWidth: "100%",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 10 }}>
        <img
          src="/logoG3.png"
          alt="Logo"
          style={{ width: 115, height: 115, borderRadius: 10, objectFit: "cover" }}
        />
      </div>

      {/* Links */}
      <NavLink to="/scouting" style={linkStyle}>
        Scouting
      </NavLink>
      <NavLink to="/analysis" style={linkStyle}>
        Analysis
      </NavLink>
      <NavLink to="/analysis/alliance" style={linkStyle}>
        Alliance Builder
      </NavLink>
      <NavLink to="/analysis/picklist" style={linkStyle}>
        Picklist
      </NavLink>

      {titlePill}
    </div>
  );
}

function AppShell() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/scouting" replace />} />
        <Route path="/scouting" element={<ScoutingPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/analysis/alliance" element={<AlliancePage />} />
        <Route path="/analysis/picklist" element={<PicklistPage />} />
        <Route path="/analysis/compare" element={<ComparePage />} />
        <Route path="/analysis/saved" element={<SavedAlliancesPage />} />
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
