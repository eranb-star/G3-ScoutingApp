import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

type TeamPlayoffRow = {
  event_id: string;
  team_number: number;
  matches_scouted: number;

  auto_attempted_rate: number;
  auto_mobility_rate: number;
  auto_score_avg: number;
  auto_failed_avg: number;

  teleop_score_avg: number;
  teleop_missed_avg: number;
  cycles_avg: number;

  endgame_attempt_rate: number;
  endgame_success_rate: number;
  endgame_time_avg: number;

  played_defense_rate: number;
  defense_effectiveness_score: number;

  disabled_rate: number;
  brownout_rate: number;
  mech_failure_rate: number;
  elec_failure_rate: number;
  sw_failure_rate: number;

  driver_skill_avg: number;
  cycle_speed_avg: number;
  consistency_avg: number;
  overall_value_avg: number;

  reliability_risk: number;
  playoff_score: number;
};

// Defense views
type DefenseLeaderRow = {
  event_id: string;
  team_number: number;
  matches_played: number;
  defense_impact_avg: number;
  defense_impact_total: number;
  opp_actual_over_expected_avg: number | null;
};

type DefenseMatchupRow = {
  event_id: string;
  match_id: string;
  match_type: string | null;
  match_number: number | null;

  defender_team_number: number;
  defender_alliance: string | null;

  opp_alliance_teleop_gpa: number | null;
  opp_alliance_expected_gpa: number | null;
  defense_impact_gpa: number | null;
};

function pct(x: number) {
  const v = Number.isFinite(x) ? x : 0;
  return `${Math.round(v * 100)}%`;
}

function num(x: number, digits = 2) {
  const v = Number.isFinite(x) ? x : 0;
  return v.toFixed(digits);
}

function badge(label: string, bg: string) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        fontWeight: 900,
        fontSize: 12,
        display: "inline-block",
        border: "1px solid rgba(0,0,0,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function riskBadge(r: TeamPlayoffRow) {
  const disabled = r.disabled_rate ?? 0;
  const brown = r.brownout_rate ?? 0;

  if (disabled >= 0.25) return badge("HIGH RISK", "#ffe0e0");
  if (disabled >= 0.1 || brown >= 0.2) return badge("MED RISK", "#fff4cc");
  return badge("SAFE", "#e8ffe8");
}

function roleBadges(r: TeamPlayoffRow) {
  const b: React.ReactNode[] = [];
  if ((r.auto_score_avg ?? 0) >= 3 || (r.auto_mobility_rate ?? 0) >= 0.8) b.push(badge("AUTO", "#e8f0ff"));
  if ((r.endgame_success_rate ?? 0) >= 0.6) b.push(badge("ENDGAME", "#f2e8ff"));
  if ((r.defense_effectiveness_score ?? 0) >= 0.6 || (r.played_defense_rate ?? 0) >= 0.4) b.push(badge("DEFENSE", "#e8fff6"));
  if ((r.consistency_avg ?? 0) >= 3.5) b.push(badge("CONSISTENT", "#f0f0f0"));
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{b.length ? b : badge("—", "#f5f5f5")}</div>;
}

function impactBadge(impact: number) {
  if (!Number.isFinite(impact)) return badge("—", "#f5f5f5");
  if (impact >= 3) return badge(`+${num(impact, 1)}`, "#e8ffe8");
  if (impact >= 1) return badge(`+${num(impact, 1)}`, "#fff4cc");
  if (impact <= -2) return badge(`${num(impact, 1)}`, "#ffe0e0");
  return badge(`${num(impact, 1)}`, "#f0f0f0");
}

function ratioBadge(ratio: number | null) {
  if (ratio == null || !Number.isFinite(ratio)) return badge("N/A", "#f5f5f5");
  // lower is better
  if (ratio <= 0.85) return badge(num(ratio, 2), "#e8ffe8");
  if (ratio <= 1.0) return badge(num(ratio, 2), "#fff4cc");
  return badge(num(ratio, 2), "#ffe0e0");
}

function normalizeAlliance(a: string | null): "red" | "blue" | "unknown" {
  const v = (a ?? "").toLowerCase().trim();
  if (v === "red") return "red";
  if (v === "blue") return "blue";
  return "unknown";
}

export default function AnalysisPage() {
  const [eventId, setEventId] = useState<string>("");

  // TAB
  const [tab, setTab] = useState<"ranking" | "defense">("ranking");

  // Ranking
  const [rows, setRows] = useState<TeamPlayoffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [query, setQuery] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "safe" | "auto" | "endgame" | "defense">("all");
  const [selectedTeam, setSelectedTeam] = useState<TeamPlayoffRow | null>(null);

  // Defense
  const [defLeaders, setDefLeaders] = useState<DefenseLeaderRow[]>([]);
  const [defLoading, setDefLoading] = useState(false);
  const [defErr, setDefErr] = useState<string>("");

  const [defQuery, setDefQuery] = useState<string>("");
  const [selectedDefenseTeam, setSelectedDefenseTeam] = useState<DefenseLeaderRow | null>(null);
  const [defMatchups, setDefMatchups] = useState<DefenseMatchupRow[]>([]);
  const [defMatchupsLoading, setDefMatchupsLoading] = useState(false);
  const [defMatchupsErr, setDefMatchupsErr] = useState<string>("");

  // Load ranking
  useEffect(() => {
    const load = async () => {
      setRows([]);
      setSelectedTeam(null);
      setErr("");

      const cleanEventId = (eventId ?? "").trim();
      if (!cleanEventId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("v_team_playoff_score")
          .select("*")
          .eq("event_id", cleanEventId)
          .order("playoff_score", { ascending: false });

        if (error) {
          console.error("LOAD ANALYSIS ERROR:", error);
          setErr(error.message);
          return;
        }

        setRows((data ?? []) as TeamPlayoffRow[]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  // Load defense leaders
  useEffect(() => {
    const loadDefense = async () => {
      setDefLeaders([]);
      setSelectedDefenseTeam(null);
      setDefMatchups([]);
      setDefErr("");
      setDefMatchupsErr("");

      const cleanEventId = (eventId ?? "").trim();
      if (!cleanEventId) return;

      setDefLoading(true);
      try {
        const { data, error } = await supabase
          .from("v_defense_leaders_gpa")
          .select("*")
          .eq("event_id", cleanEventId)
          .order("defense_impact_total", { ascending: false });

        if (error) {
          console.error("LOAD DEFENSE LEADERS ERROR:", error);
          setDefErr(error.message);
          return;
        }

        setDefLeaders((data ?? []) as DefenseLeaderRow[]);
      } finally {
        setDefLoading(false);
      }
    };

    loadDefense();
  }, [eventId]);

  const filtered = useMemo(() => {
    let r = rows;

    const q = query.trim();
    if (q.length > 0) r = r.filter((x) => String(x.team_number).includes(q));

    if (filterMode === "safe") {
      r = r.filter((x) => (x.disabled_rate ?? 0) < 0.1 && (x.brownout_rate ?? 0) < 0.2);
    } else if (filterMode === "auto") {
      r = r.filter((x) => (x.auto_score_avg ?? 0) >= 2 || (x.auto_mobility_rate ?? 0) >= 0.8);
    } else if (filterMode === "endgame") {
      r = r.filter((x) => (x.endgame_success_rate ?? 0) >= 0.5);
    } else if (filterMode === "defense") {
      r = r.filter((x) => (x.defense_effectiveness_score ?? 0) >= 0.5 || (x.played_defense_rate ?? 0) >= 0.4);
    }

    return r;
  }, [rows, query, filterMode]);

  const topSummary = useMemo(() => {
    const totalTeams = filtered.length;
    const avgScore = totalTeams > 0 ? filtered.reduce((a, x) => a + (Number(x.playoff_score) || 0), 0) / totalTeams : 0;
    const avgReliability = totalTeams > 0 ? filtered.reduce((a, x) => a + (Number(x.disabled_rate) || 0), 0) / totalTeams : 0;
    return { totalTeams, avgScore, avgReliability };
  }, [filtered]);

  const defFiltered = useMemo(() => {
    let r = defLeaders;
    const q = defQuery.trim();
    if (q.length > 0) r = r.filter((x) => String(x.team_number).includes(q));
    return r;
  }, [defLeaders, defQuery]);

  const defSummary = useMemo(() => {
    const total = defFiltered.length;

    const avgImpact = total > 0 ? defFiltered.reduce((a, x) => a + (Number(x.defense_impact_avg) || 0), 0) / total : 0;

    // Only compute avg ratio over finite values
    const ratios = defFiltered
      .map((x) => x.opp_actual_over_expected_avg)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const avgRatio = ratios.length > 0 ? ratios.reduce((a, v) => a + v, 0) / ratios.length : null;

    return { total, avgImpact, avgRatio };
  }, [defFiltered]);

  const openDefenseTeam = async (r: DefenseLeaderRow) => {
    setSelectedDefenseTeam(r);
    setDefMatchups([]);
    setDefMatchupsErr("");

    const cleanEventId = (eventId ?? "").trim();
    if (!cleanEventId) return;

    setDefMatchupsLoading(true);
    try {
      const { data, error } = await supabase
        .from("v_defense_matchups_gpa")
        .select("*")
        .eq("event_id", cleanEventId)
        .eq("defender_team_number", r.team_number)
        .order("match_number", { ascending: true });

      if (error) {
        console.error("LOAD DEFENSE MATCHUPS ERROR:", error);
        setDefMatchupsErr(error.message);
        return;
      }

      setDefMatchups((data ?? []) as DefenseMatchupRow[]);
    } finally {
      setDefMatchupsLoading(false);
    }
  };

  const tabBtn = (active: boolean) => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: active ? "1px solid rgba(255,0,170,0.25)" : "1px solid #ddd",
    background: active ? "rgba(255,0,170,0.10)" : "#fff",
    fontWeight: 1000 as const,
    cursor: "pointer",
  });

  return (
    <div style={{ padding: 16, maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Analysis Dashboard</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            {tab === "ranking"
              ? "Playoff-focused ranking (Auto + Endgame + Reliability + Consistency)"
              : "Defense Leaders (Teleop GP-A) — expected vs actual opponent scoring"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            style={{ width: 320, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
          >
            <option value="">Select Event</option>
            <option value="f34e67ec-bac9-433e-a97a-1e295aef8f30">ISR District Event #1</option>
            <option value="9fa31339-9f79-4d5b-9272-934b15d098d6">ISR District Event #2</option>
            <option value="948f95ba-2935-4c5d-860b-6c90429a66c3">ISR District Event #3</option>
            <option value="773deb87-bbfe-41d9-9537-7fd201f8998c">ISR District Event #4</option>
          </select>

          <button type="button" onClick={() => setTab("ranking")} style={tabBtn(tab === "ranking")}>
            Team Ranking
          </button>
          <button type="button" onClick={() => setTab("defense")} style={tabBtn(tab === "defense")}>
            Defense Leaders
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      {tab === "ranking" ? (
        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 950 }}>Teams</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{topSummary.totalTeams}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 950 }}>Avg Playoff Score</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{num(topSummary.avgScore, 2)}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 950 }}>Avg Disabled Rate</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pct(topSummary.avgReliability)}</div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 950 }}>Teams</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{defSummary.total}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 950 }}>Avg Defense Impact</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{num(defSummary.avgImpact, 2)}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 950 }}>Avg Opp Actual/Expected</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{defSummary.avgRatio == null ? "—" : num(defSummary.avgRatio, 2)}</div>
          </div>
        </div>
      )}

      {/* LOADING + ERRORS */}
      {tab === "ranking" ? (
        <>
          {loading && <div style={{ marginTop: 18 }}>Loading analysis…</div>}
          {err && (
            <div style={{ marginTop: 18, padding: 12, borderRadius: 14, border: "1px solid #ffb3b3", background: "#fff5f5" }}>
              <b>Error:</b> {err}
            </div>
          )}
        </>
      ) : (
        <>
          {defLoading && <div style={{ marginTop: 18 }}>Loading defense leaders…</div>}
          {defErr && (
            <div style={{ marginTop: 18, padding: 12, borderRadius: 14, border: "1px solid #ffb3b3", background: "#fff5f5" }}>
              <b>Error:</b> {defErr}
            </div>
          )}
        </>
      )}

      {!eventId && <div style={{ marginTop: 14, opacity: 0.85 }}>Select an event to load data.</div>}

      {/* =========================
          TAB: TEAM RANKING
          ========================= */}
      {tab === "ranking" && !loading && !err && eventId && (
        <>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team #"
              style={{ width: 180, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
            />

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              style={{ width: 220, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
            >
              <option value="all">All teams</option>
              <option value="safe">Safe picks</option>
              <option value="auto">Auto-capable</option>
              <option value="endgame">Endgame-capable</option>
              <option value="defense">Defense bots</option>
            </select>
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
            {/* TABLE */}
            <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 950 }}>Ranked Teams</div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>#</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Team</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Playoff</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Auto</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Endgame</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Disabled</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr
                      key={r.team_number}
                      onClick={() => setSelectedTeam(r)}
                      style={{
                        cursor: "pointer",
                        background: selectedTeam?.team_number === r.team_number ? "#f3f6ff" : "transparent",
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 900 }}>{idx + 1}</td>
                      <td style={{ padding: 10, fontWeight: 950 }}>{r.team_number}</td>
                      <td style={{ padding: 10, fontWeight: 900 }}>{num(r.playoff_score, 2)}</td>
                      <td style={{ padding: 10 }}>
                        {num(r.auto_score_avg, 2)} <span style={{ opacity: 0.7 }}>({pct(r.auto_mobility_rate)})</span>
                      </td>
                      <td style={{ padding: 10 }}>{pct(r.endgame_success_rate)}</td>
                      <td style={{ padding: 10 }}>{pct(r.disabled_rate)}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{riskBadge(r)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DETAILS PANEL */}
            <div style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 12 }}>
              <div style={{ fontWeight: 950, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Team Details</div>

              {!selectedTeam && <div style={{ marginTop: 12, opacity: 0.8 }}>Click a team to see breakdown.</div>}

              {selectedTeam && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 22, fontWeight: 1000 }}>#{selectedTeam.team_number}</div>
                    <div style={{ fontWeight: 950 }}>Playoff Score: {num(selectedTeam.playoff_score, 2)}</div>
                  </div>

                  <div>{roleBadges(selectedTeam)}</div>

                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Core</div>
                    <div>Matches scouted: <b>{selectedTeam.matches_scouted}</b></div>
                    <div>Consistency: <b>{num(selectedTeam.consistency_avg, 2)}</b> / 5</div>
                    <div>Overall value: <b>{num(selectedTeam.overall_value_avg, 2)}</b> / 5</div>
                  </div>

                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Auto</div>
                    <div>Auto attempted: <b>{pct(selectedTeam.auto_attempted_rate)}</b></div>
                    <div>Mobility: <b>{pct(selectedTeam.auto_mobility_rate)}</b></div>
                    <div>Auto score avg: <b>{num(selectedTeam.auto_score_avg, 2)}</b></div>
                    <div>Auto failed avg: <b>{num(selectedTeam.auto_failed_avg, 2)}</b></div>
                  </div>

                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Teleop</div>
                    <div>Teleop score avg: <b>{num(selectedTeam.teleop_score_avg, 2)}</b></div>
                    <div>Missed avg: <b>{num(selectedTeam.teleop_missed_avg, 2)}</b></div>
                    <div>Cycles avg: <b>{num(selectedTeam.cycles_avg, 2)}</b></div>
                  </div>

                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Endgame</div>
                    <div>Attempt rate: <b>{pct(selectedTeam.endgame_attempt_rate)}</b></div>
                    <div>Success rate: <b>{pct(selectedTeam.endgame_success_rate)}</b></div>
                    <div>Time avg (sec): <b>{num(selectedTeam.endgame_time_avg, 2)}</b></div>
                  </div>

                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Reliability</div>
                    <div>Disabled: <b>{pct(selectedTeam.disabled_rate)}</b></div>
                    <div>Brownout: <b>{pct(selectedTeam.brownout_rate)}</b></div>
                    <div>Mechanical: <b>{pct(selectedTeam.mech_failure_rate)}</b></div>
                    <div>Electrical: <b>{pct(selectedTeam.elec_failure_rate)}</b></div>
                    <div>Software: <b>{pct(selectedTeam.sw_failure_rate)}</b></div>
                    <div style={{ marginTop: 6 }}>
                      Reliability risk (internal): <b>{num(selectedTeam.reliability_risk, 2)}</b>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================
          TAB: DEFENSE LEADERS
          ========================= */}
      {tab === "defense" && !defLoading && !defErr && eventId && (
        <>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={defQuery}
              onChange={(e) => setDefQuery(e.target.value)}
              placeholder="Search team #"
              style={{ width: 180, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
            />
            <div style={{ opacity: 0.85 }}>
              Impact = <b>Expected Opp GP-A</b> − <b>Actual Opp GP-A</b> (higher is better)
            </div>
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
            {/* TABLE */}
            <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 950 }}>Defense Leaders (Teleop GP-A)</div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>#</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Team</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Matches</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Impact Avg</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Impact Total</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Opp A/E</th>
                  </tr>
                </thead>
                <tbody>
                  {defFiltered.map((r, idx) => (
                    <tr
                      key={r.team_number}
                      onClick={() => openDefenseTeam(r)}
                      style={{
                        cursor: "pointer",
                        background: selectedDefenseTeam?.team_number === r.team_number ? "#f3f6ff" : "transparent",
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 900 }}>{idx + 1}</td>
                      <td style={{ padding: 10, fontWeight: 950 }}>{r.team_number}</td>
                      <td style={{ padding: 10 }}>{r.matches_played ?? 0}</td>
                      <td style={{ padding: 10 }}>{impactBadge(Number(r.defense_impact_avg) || 0)}</td>
                      <td style={{ padding: 10, fontWeight: 900 }}>{num(Number(r.defense_impact_total) || 0, 1)}</td>
                      <td style={{ padding: 10 }}>{ratioBadge(r.opp_actual_over_expected_avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DETAILS PANEL */}
            <div style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 12 }}>
              <div style={{ fontWeight: 950, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Defense Details</div>

              {!selectedDefenseTeam && (
                <div style={{ marginTop: 12, opacity: 0.8 }}>
                  Click a team to see match-by-match defense impact.
                </div>
              )}

              {selectedDefenseTeam && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 22, fontWeight: 1000 }}>#{selectedDefenseTeam.team_number}</div>
                    <div style={{ fontWeight: 950 }}>Total: {num(Number(selectedDefenseTeam.defense_impact_total) || 0, 1)}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {badge(`Matches ${selectedDefenseTeam.matches_played ?? 0}`, "#f0f0f0")}
                    {badge(`Impact Avg ${num(Number(selectedDefenseTeam.defense_impact_avg) || 0, 2)}`, "#e8fff6")}
                    {badge(
                      `Opp A/E ${selectedDefenseTeam.opp_actual_over_expected_avg == null ? "N/A" : num(selectedDefenseTeam.opp_actual_over_expected_avg, 2)}`,
                      "#f2e8ff"
                    )}
                  </div>

                  {defMatchupsLoading && <div style={{ opacity: 0.85 }}>Loading matchups…</div>}
                  {defMatchupsErr && <div style={{ color: "crimson", fontWeight: 900 }}>Error: {defMatchupsErr}</div>}

                  {!defMatchupsLoading && !defMatchupsErr && (
                    <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: 10, borderBottom: "1px solid #eee", fontWeight: 950, background: "#fafafa" }}>
                        Matchups
                      </div>

                      {defMatchups.length === 0 ? (
                        <div style={{ padding: 10, opacity: 0.8 }}>No matchup rows found (needs matches + scout entries).</div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#fff" }}>
                              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>QM</th>
                              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Alliance</th>
                              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Opp Actual</th>
                              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Opp Expected</th>
                              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {defMatchups.map((m) => {
                              const al = normalizeAlliance(m.defender_alliance);
                              const alBadge =
                                al === "red" ? badge("RED", "#ffe0f0") : al === "blue" ? badge("BLUE", "#e8f0ff") : badge("—", "#f0f0f0");

                              const oppA = Number(m.opp_alliance_teleop_gpa ?? 0);
                              const oppE = Number(m.opp_alliance_expected_gpa ?? 0);
                              const imp = Number(m.defense_impact_gpa ?? 0);

                              return (
                                <tr key={m.match_id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                  <td style={{ padding: 10, fontWeight: 900 }}>{m.match_number ?? "—"}</td>
                                  <td style={{ padding: 10 }}>{alBadge}</td>
                                  <td style={{ padding: 10 }}>{num(oppA, 1)}</td>
                                  <td style={{ padding: 10 }}>{num(oppE, 1)}</td>
                                  <td style={{ padding: 10 }}>{impactBadge(imp)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 2, opacity: 0.85, fontSize: 13 }}>
                    Note: This is a statistical estimate unless you explicitly tag “who defended” in scouting.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
