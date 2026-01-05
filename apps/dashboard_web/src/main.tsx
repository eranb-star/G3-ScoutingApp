import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes, Navigate } from "react-router-dom";
import ScoutingPage from "./pages/ScoutingPage";
import AnalysisPage from "./pages/AnalysisPage";
import AlliancePage from "./pages/AlliancePage";
import PicklistPage from "./pages/PicklistPage";
import ComparePage from "./pages/ComparePage";
import SavedAlliancesPage from "./pages/SavedAlliancesPage";
import "./index.css";
import logo from "./assets/LogoG3.png"; // adjust path if needed

function TopNav() {
  // Israel time (live)
  const [now, setNow] = React.useState(new Date());

  // Match countdown (optional; driven by localStorage, won’t break anything)
  const [matchLabel, setMatchLabel] = React.useState<string>("");
  const [matchStartIso, setMatchStartIso] = React.useState<string>("");

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const read = () => {
      setMatchLabel(localStorage.getItem("g3_selected_match_label") ?? "");
      setMatchStartIso(localStorage.getItem("g3_selected_match_start_iso") ?? "");
    };
    read();
    const id = window.setInterval(read, 1500);
    return () => window.clearInterval(id);
  }, []);

  const israelDateTime = React.useMemo(() => {
    return now.toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [now]);

  const countdownText = React.useMemo(() => {
    if (!matchStartIso) return "";
    const start = new Date(matchStartIso);
    const startMs = start.getTime();
    if (!Number.isFinite(startMs)) return "";

    const diff = startMs - now.getTime();
    const abs = Math.abs(diff);

    const totalSec = Math.floor(abs / 1000);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    const hPart = hh > 0 ? `${hh}:` : "";
    const clock = `${hPart}${pad(mm)}:${pad(ss)}`;

    const label = matchLabel || "Match";
    if (diff > 0) return `⏳ ${label} starts in ${clock}`;
    return `🟢 ${label} started ${clock} ago`;
  }, [matchStartIso, matchLabel, now]);

  // Active link styling (keeps your look, just highlights active)
  const baseLinkStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "inherit",
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 10,
  };

  const activeLinkStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.10)",
  };

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
      }}
    >
      {/* Logo + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 10 }}>
        <img
          src={logo}
          alt="Logo"
          style={{ width: 115, height: 115, borderRadius: 10, objectFit: "cover" }}
        />
      </div>

      {/* Links (active highlighted) */}
      <NavLink
        to="/scouting"
        style={({ isActive }) => ({ ...baseLinkStyle, ...(isActive ? activeLinkStyle : {}) })}
      >
        Scouting
      </NavLink>

      <NavLink
        to="/analysis"
        style={({ isActive }) => ({ ...baseLinkStyle, ...(isActive ? activeLinkStyle : {}) })}
      >
        Analysis
      </NavLink>

      <NavLink
        to="/analysis/alliance"
        style={({ isActive }) => ({ ...baseLinkStyle, ...(isActive ? activeLinkStyle : {}) })}
      >
        Alliance Builder
      </NavLink>

      <NavLink
        to="/analysis/picklist"
        style={({ isActive }) => ({ ...baseLinkStyle, ...(isActive ? activeLinkStyle : {}) })}
      >
        Picklist
      </NavLink>

      {/* Right side block (title + Israel time + countdown) */}
      <div
        style={{
          marginLeft: "auto",
          padding: "6px 12px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.06)",
          fontWeight: 1000,
          fontSize: "22px",
          letterSpacing: 0.3,
          textAlign: "right",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 240,
        }}
      >
        <div>G3 Scouting App</div>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>{israelDateTime}</div>
        {countdownText ? (
          <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 900 }}>{countdownText}</div>
        ) : null}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </React.StrictMode>
);
