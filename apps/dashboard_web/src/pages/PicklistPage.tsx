import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { computeAllianceIntel, toNum, pct, num, type TeamRow, type Risk } from "../lib/allianceIntel";

type EventOption = { id: string; name: string };

function Badge({ text, bg }: { text: string; bg: string }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        fontWeight: 950,
        fontSize: 12,
        display: "inline-block",
        lineHeight: "16px",
        border: "1px solid rgba(0,0,0,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function riskBadge(risk: Risk) {
  const bg = risk === "LOW" ? "#e8ffe8" : risk === "MED" ? "#fff4cc" : "#ffe0e0";
  return <Badge text={`RISK ${risk}`} bg={bg} />;
}

function synergyBadge(score: number) {
  const bg = score >= 75 ? "#e8fff6" : score >= 50 ? "#fff4cc" : "#ffe0e0";
  return <Badge text={`${Math.round(score)}/100`} bg={bg} />;
}

function coverageBadge(minMatches: number) {
  const bg = minMatches >= 6 ? "#e8ffe8" : minMatches >= 3 ? "#fff4cc" : "#ffe0e0";
  const label = minMatches >= 6 ? "STRONG" : minMatches >= 3 ? "OK" : minMatches >= 1 ? "WEAK" : "NO DATA";
  return <Badge text={`${label} · min ${minMatches}`} bg={bg} />;
}

// score used for sorting picklists (prefer pick_score if exists)
function pickRankValue(r: TeamRow | null) {
  if (!r) return -1e9;
  const ps = toNum((r as any).pick_score, NaN);
  if (Number.isFinite(ps)) return ps;
  return toNum((r as any).playoff_score, 0);
}

export default function PicklistPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState<string>(() => params.get("event_id") ?? localStorage.getItem("g3_event_id") ?? "");

  useEffect(() => {
    void supabase.from("events").select("id,name").eq("active", true).order("start_date", { ascending: false })
      .then(({ data }) => setEvents((data ?? []) as EventOption[]));
  }, []);

  const [allEventTeams, setAllEventTeams] = useState<number[]>([]);
  const [statsRows, setStatsRows] = useState<TeamRow[]>([]);

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [err, setErr] = useState<string>("");

  // filters
  const [minMatches, setMinMatches] = useState<number>(1);
  const [hideHighRisk, setHideHighRisk] = useState<boolean>(false);

  // alliance selection
  const [captain, setCaptain] = useState<number | null>(null);
  const [partner1, setPartner1] = useState<number | null>(null);
  const [partner2, setPartner2] = useState<number | null>(null);

  // drafted teams panel
  const [drafted, setDrafted] = useState<Set<number>>(new Set());
  const [draftInput, setDraftInput] = useState<string>("");

  // ---------- Load event teams ----------
  useEffect(() => {
    const loadEventTeams = async () => {
      setAllEventTeams([]);
      setErr("");
      setCaptain(null);
      setPartner1(null);
      setPartner2(null);
      setDrafted(new Set());
      setDraftInput("");

      const cleanEventId = (eventId ?? "").trim();
      if (!cleanEventId) return;

      setLoadingTeams(true);
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("team_number")
          .eq("event_id", cleanEventId)
          .order("team_number", { ascending: true });

        if (error) {
          console.error("LOAD EVENT TEAMS ERROR:", error);
          setErr(error.message);
          return;
        }

        const list = (data ?? [])
          .map((x: any) => Number(x.team_number))
          .filter((n: number) => Number.isFinite(n));

        setAllEventTeams(list);

        // default captain
        if (list.length > 0) setCaptain(list[0]);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadEventTeams();
  }, [eventId]);

  // ---------- Load stats ----------
  useEffect(() => {
    const loadStats = async () => {
      setStatsRows([]);
      setErr("");

      const cleanEventId = (eventId ?? "").trim();
      if (!cleanEventId) return;

      setLoadingStats(true);
      try {
        const { data, error } = await supabase
          .from("v_picklist_v1")
          .select("*")
          .eq("event_id", cleanEventId);

        if (error) {
          console.error("LOAD PICKLIST STATS ERROR:", error);
          setErr(error.message);
          return;
        }

        setStatsRows((data ?? []) as TeamRow[]);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [eventId]);

  const statsByTeam = useMemo(() => {
    const m = new Map<number, TeamRow>();
    for (const r of statsRows) m.set(Number(r.team_number), r);
    return m;
  }, [statsRows]);

  const coverageInfo = useMemo(() => {
    const totalTeams = allEventTeams.length;
    const scoutedTeams = new Set(statsRows.map((x) => Number(x.team_number)));
    return { totalTeams, scoutedCount: scoutedTeams.size };
  }, [allEventTeams, statsRows]);

  function teamLabel(team: number) {
    const r = statsByTeam.get(team) ?? null;
    if (!r) return `${team} — NO DATA YET`;

    const intel = computeAllianceIntel([r, r, r]); // safe way to compute risk label with same logic
    const score = pickRankValue(r);

    return `${team} — score ${num(score, 1)} — matches ${r.matches_scouted ?? 0} — end ${pct(r.endgame_success_rate)} — dis ${pct(
      r.disabled_rate
    )} — ${intel.riskLabel}`;
  }

  // ---------- Ranked lists for dropdowns ----------
  const rankedTeamsForDropdown = useMemo(() => {
    // include all teams, sort with-data by pick score desc, no-data at bottom
    const withData: { team: number; r: TeamRow }[] = [];
    const noData: number[] = [];

    for (const t of allEventTeams) {
      const r = statsByTeam.get(t);
      if (r) withData.push({ team: t, r });
      else noData.push(t);
    }

    withData.sort((a, b) => pickRankValue(b.r) - pickRankValue(a.r));
    noData.sort((a, b) => a - b);

    return {
      withData: withData.map((x) => x.team),
      noData,
      allSorted: [...withData.map((x) => x.team), ...noData],
    };
  }, [allEventTeams, statsByTeam]);

  // ---------- Drafted Teams ----------
  const draftedList = useMemo(() => Array.from(drafted).sort((a, b) => a - b), [drafted]);

  const toggleDrafted = (team: number) => {
    setDrafted((prev) => {
      const n = new Set(prev);
      if (n.has(team)) n.delete(team);
      else n.add(team);

      // if drafted intersects current selections => clear those selections safely
      if (captain && n.has(captain)) setCaptain(null);
      if (partner1 && n.has(partner1)) setPartner1(null);
      if (partner2 && n.has(partner2)) setPartner2(null);

      return n;
    });
  };

  const addDraftFromInput = () => {
    const t = Number(draftInput);
    if (!Number.isFinite(t) || t <= 0) return;
    if (!allEventTeams.includes(t)) return;
    toggleDrafted(t);
    setDraftInput("");
  };

  // ---------- Eligibility (filters + drafted removal) ----------
  const eligibleTeams = useMemo(() => {
    // teams that can appear in dropdowns (still allow NO DATA teams)
    return rankedTeamsForDropdown.allSorted.filter((t) => {
      if (drafted.has(t)) return false;

      const r = statsByTeam.get(t);
      if (!r) return true;

      if ((r.matches_scouted ?? 0) < minMatches) return false;

      if (hideHighRisk) {
        const disabled = toNum(r.disabled_rate);
        if (disabled >= 0.18) return false;
      }

      return true;
    });
  }, [rankedTeamsForDropdown, drafted, statsByTeam, minMatches, hideHighRisk]);

  // Dropdown options excluding a set
  const dropdownTeamsExcluding = (exclude: Set<number>) => {
    return eligibleTeams.filter((t) => !exclude.has(t));
  };

  // ---------- Build alliance ----------
  const canBuildAlliance = useMemo(() => {
    if (!eventId) return false;
    if (!captain || !partner1 || !partner2) return false;
    if (captain === partner1 || captain === partner2) return false;
    if (partner1 === partner2) return false;
    return true;
  }, [eventId, captain, partner1, partner2]);

  const openAlliance = (t1: number, t2: number, t3: number) => {
    const url =
      `/analysis/alliance?event_id=${encodeURIComponent(eventId)}` +
      `&t1=${encodeURIComponent(String(t1))}` +
      `&t2=${encodeURIComponent(String(t2))}` +
      `&t3=${encodeURIComponent(String(t3))}`;
    navigate(url);
  };

  // ---------- Decision Center ----------
  const topAlliances = useMemo(() => {
    if (!eventId || !captain) return [];

    const capStats = statsByTeam.get(captain) ?? null;
    const candidates = eligibleTeams.filter((t) => t !== captain);

    const results: {
      t1: number;
      t2: number;
      t3: number;
      synergy: number;
      risk: Risk;
      weakness: string;
      minMatches: number;
    }[] = [];

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const p1 = candidates[i];
        const p2 = candidates[j];

        if (p1 === captain || p2 === captain) continue;
        if (p1 === p2) continue;

        const p1Stats = statsByTeam.get(p1) ?? null;
        const p2Stats = statsByTeam.get(p2) ?? null;

        const intel = computeAllianceIntel([capStats, p1Stats, p2Stats]);

        const minMatches =
          capStats && p1Stats && p2Stats
            ? Math.min(toNum(capStats.matches_scouted), toNum(p1Stats.matches_scouted), toNum(p2Stats.matches_scouted))
            : 0;

        results.push({
          t1: captain,
          t2: p1,
          t3: p2,
          synergy: intel.synergy,
          risk: intel.riskLabel,
          weakness: intel.weaknessText,
          minMatches,
        });
      }
    }

    const riskRank = (r: Risk) => (r === "LOW" ? 3 : r === "MED" ? 2 : 1);
    results.sort((a, b) => {
      const d = b.synergy - a.synergy;
      if (Math.abs(d) > 0.0001) return d;
      return riskRank(b.risk) - riskRank(a.risk);
    });

    return results.slice(0, 12);
  }, [eventId, captain, eligibleTeams, statsByTeam]);

  // ---------- Ranked teams table ----------
  const rankedTeamsTable = useMemo(() => {
    const withData: TeamRow[] = [];
    const noData: number[] = [];

    for (const t of allEventTeams) {
      const r = statsByTeam.get(t);
      if (r) withData.push(r);
      else noData.push(t);
    }

    withData.sort((a, b) => pickRankValue(b) - pickRankValue(a));
    noData.sort((a, b) => a - b);
    return { withData, noData };
  }, [allEventTeams, statsByTeam]);

  // ---------- UI ----------
  return (
    <div style={{ padding: 16, maxWidth: 1300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Picklist + Decision Center</h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Ranked dropdowns ✅ · Drafted teams removal ✅ · One synergy formula everywhere ✅
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => (eventId ? navigate(`/analysis/saved?event_id=${encodeURIComponent(eventId)}`) : null)}
            disabled={!eventId}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 950,
              cursor: eventId ? "pointer" : "not-allowed",
              opacity: eventId ? 1 : 0.6,
            }}
          >
            Saved Alliances
          </button>

          <button
            type="button"
            onClick={() => (eventId ? navigate(`/analysis/compare?event_id=${encodeURIComponent(eventId)}`) : null)}
            disabled={!eventId}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 950,
              cursor: eventId ? "pointer" : "not-allowed",
              opacity: eventId ? 1 : 0.6,
            }}
          >
            Compare
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); localStorage.setItem("g3_event_id", e.target.value); }}
          style={{ width: 320, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
        >
          <option value="">Select Event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Min matches:</div>
          <select
            value={String(minMatches)}
            onChange={(e) => setMinMatches(Number(e.target.value))}
            style={{ width: 90, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
          >
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="6">6+</option>
          </select>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
          <input type="checkbox" checked={hideHighRisk} onChange={(e) => setHideHighRisk(e.target.checked)} />
          Hide HIGH RISK
        </label>

        {loadingTeams || loadingStats ? <div style={{ fontWeight: 900 }}>Loading…</div> : null}
        {err ? <div style={{ color: "crimson", fontWeight: 900 }}>Error: {err}</div> : null}
      </div>

      {eventId && !err && (
        <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 800 }}>
          Event teams: {coverageInfo.totalTeams} · Teams with scouting stats: {coverageInfo.scoutedCount}
        </div>
      )}

      {/* Drafted Teams Panel */}
      {eventId && (
        <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 1000 }}>Drafted Teams (removed from picklists & Decision Center)</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                placeholder="team #"
                style={{ width: 120, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
              />
              <button
                type="button"
                onClick={addDraftFromInput}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 950 }}
              >
                Toggle
              </button>
              <button
                type="button"
                onClick={() => setDrafted(new Set())}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 950 }}
              >
                Clear
              </button>
            </div>
          </div>

          {draftedList.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.8 }}>No drafted teams yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {draftedList.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleDrafted(t)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid #ddd",
                    background: "#fff",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                  title="Click to un-draft"
                >
                  #{t} ✕
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Build Alliance */}
      {eventId && (
        <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 12 }}>
          <div style={{ fontWeight: 1000, marginBottom: 10 }}>Build Alliance</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            {/* Captain */}
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Captain</div>
              <select
                value={captain ? String(captain) : ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setCaptain(v);
                  setPartner1(null);
                  setPartner2(null);
                }}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
              >
                <option value="">Choose captain…</option>
                {dropdownTeamsExcluding(new Set()).map((t) => (
                  <option key={`cap-${t}`} value={t}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner 1 */}
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Partner 1</div>
              <select
                value={partner1 ? String(partner1) : ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setPartner1(v);
                  // if partner2 becomes invalid (same), clear it
                  if (v && partner2 && v === partner2) setPartner2(null);
                }}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
              >
                <option value="">Choose team…</option>
                {dropdownTeamsExcluding(new Set([captain ?? -1, partner2 ?? -1])).map((t) => (
                  <option key={`p1-${t}`} value={t}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner 2 */}
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Partner 2</div>
              <select
                value={partner2 ? String(partner2) : ""}
                onChange={(e) => setPartner2(e.target.value ? Number(e.target.value) : null)}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
              >
                <option value="">Choose team…</option>
                {dropdownTeamsExcluding(new Set([captain ?? -1, partner1 ?? -1])).map((t) => (
                  <option key={`p2-${t}`} value={t}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!captain || !partner1 || !partner2) return;
                openAlliance(captain, partner1, partner2);
              }}
              disabled={!canBuildAlliance}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #ddd",
                fontWeight: 1000,
                cursor: canBuildAlliance ? "pointer" : "not-allowed",
                opacity: canBuildAlliance ? 1 : 0.6,
                background: "#fff",
              }}
            >
              Open Alliance →
            </button>
          </div>

          {captain && partner1 && partner2 && (partner1 === partner2 || captain === partner1 || captain === partner2) ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fff4cc", fontWeight: 900 }}>
              Invalid selection: all 3 teams must be different.
            </div>
          ) : null}
        </div>
      )}

      {/* Decision Center */}
      {eventId && captain && (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 1000 }}>
            Decision Center — Top Alliance Options (Captain #{captain})
          </div>

          {topAlliances.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.85 }}>Not enough teams available to compute options.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>#</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Alliance</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Synergy</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Risk</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Weakness</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Coverage</th>
                  <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {topAlliances.map((a, i) => (
                  <tr key={`${a.t1}-${a.t2}-${a.t3}`} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 10, fontWeight: 950 }}>{i + 1}</td>
                    <td style={{ padding: 10, fontWeight: 1000 }}>
                      #{a.t1} + #{a.t2} + #{a.t3}
                    </td>
                    <td style={{ padding: 10 }}>{synergyBadge(a.synergy)}</td>
                    <td style={{ padding: 10 }}>{riskBadge(a.risk)}</td>
                    <td style={{ padding: 10, fontWeight: 800, opacity: 0.9 }}>{a.weakness}</td>
                    <td style={{ padding: 10 }}>{coverageBadge(a.minMatches)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => openAlliance(a.t1, a.t2, a.t3)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          background: "#fff",
                          fontWeight: 1000,
                          cursor: "pointer",
                        }}
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Ranked Teams */}
      {eventId && !err && (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 1000 }}>
            Ranked Teams (by pick_score / playoff_score)
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Rank</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Team</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Score</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Matches</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Quick</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Draft</th>
              </tr>
            </thead>

            <tbody>
              {rankedTeamsTable.withData.map((r, idx) => {
                const team = Number(r.team_number);
                const score = pickRankValue(r);
                const intel = computeAllianceIntel([r, r, r]);

                return (
                  <tr key={`rank-${team}`} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 10, fontWeight: 950 }}>{idx + 1}</td>
                    <td style={{ padding: 10, fontWeight: 1000 }}>#{team}</td>
                    <td style={{ padding: 10, fontWeight: 900 }}>{num(score, 1)}</td>
                    <td style={{ padding: 10 }}>{r.matches_scouted ?? 0}</td>
                    <td style={{ padding: 10, opacity: 0.9 }}>
                      Auto {num(r.auto_score_avg, 1)} · Tele {num(r.teleop_score_avg, 1)} · End {pct(r.endgame_success_rate)} ·{" "}
                      {riskBadge(intel.riskLabel)}
                    </td>
                    <td style={{ padding: 10 }}>
                      <button
                        type="button"
                        onClick={() => toggleDrafted(team)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          background: drafted.has(team) ? "#fafafa" : "#fff",
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        {drafted.has(team) ? "Drafted" : "Draft"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rankedTeamsTable.noData.length > 0 ? (
                <>
                  <tr>
                    <td colSpan={6} style={{ padding: 10, background: "#fafafa", fontWeight: 1000 }}>
                      Teams with NO scouting data yet
                    </td>
                  </tr>
                  {rankedTeamsTable.noData.map((t) => (
                    <tr key={`nodata-${t}`} style={{ borderBottom: "1px solid #f2f2f2" }}>
                      <td style={{ padding: 10, opacity: 0.7 }}>—</td>
                      <td style={{ padding: 10, fontWeight: 900 }}>#{t}</td>
                      <td style={{ padding: 10, opacity: 0.7 }}>NO DATA</td>
                      <td style={{ padding: 10, opacity: 0.7 }}>—</td>
                      <td style={{ padding: 10, opacity: 0.7 }}>—</td>
                      <td style={{ padding: 10 }}>
                        <button
                          type="button"
                          onClick={() => toggleDrafted(t)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: drafted.has(t) ? "#fafafa" : "#fff",
                            fontWeight: 950,
                            cursor: "pointer",
                          }}
                        >
                          {drafted.has(t) ? "Drafted" : "Draft"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {!eventId ? <div style={{ marginTop: 16, opacity: 0.85 }}>Select an event to start.</div> : null}
    </div>
  );
}
