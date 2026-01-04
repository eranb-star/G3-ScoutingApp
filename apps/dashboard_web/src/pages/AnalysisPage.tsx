import { useEffect, useMemo, useState } from "react";
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
      }}
    >
      {label}
    </span>
  );
}

function riskBadge(r: TeamPlayoffRow) {
  // You can tune these thresholds after 1-2 events
  const disabled = r.disabled_rate ?? 0;
  const brown = r.brownout_rate ?? 0;

  if (disabled >= 0.25) return badge("HIGH RISK", "#ffe0e0");
  if (disabled >= 0.1 || brown >= 0.2) return badge("MED RISK", "#fff4cc");
  return badge("SAFE", "#e8ffe8");
}

function roleBadges(r: TeamPlayoffRow) {
  const badges: JSX.Element[] = [];
  if ((r.auto_score_avg ?? 0) >= 3 || (r.auto_mobility_rate ?? 0) >= 0.8) badges.push(badge("AUTO", "#e8f0ff"));
  if ((r.endgame_success_rate ?? 0) >= 0.6) badges.push(badge("ENDGAME", "#f2e8ff"));
  if ((r.defense_effectiveness_score ?? 0) >= 0.6 || (r.played_defense_rate ?? 0) >= 0.4) badges.push(badge("DEFENSE", "#e8fff6"));
  if ((r.consistency_avg ?? 0) >= 3.5) badges.push(badge("CONSISTENT", "#f0f0f0"));
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {badges.length ? badges : badge("—", "#f5f5f5")}
    </div>
  );
}

export default function AnalysisPage() {
  const [eventId, setEventId] = useState<string>("");

  const [rows, setRows] = useState<TeamPlayoffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [query, setQuery] = useState<string>(""); // search team number
  const [filterMode, setFilterMode] = useState<"all" | "safe" | "auto" | "endgame" | "defense">("all");

  const [selectedTeam, setSelectedTeam] = useState<TeamPlayoffRow | null>(null);

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

        setRows((data as any[]) as TeamPlayoffRow[]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const filtered = useMemo(() => {
    let r = rows;

    // Search by team number
    const q = query.trim();
    if (q.length > 0) {
      r = r.filter((x) => String(x.team_number).includes(q));
    }

    // Filters for "playoff useful"
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
    // Quick summary useful for mentors during event
    const totalTeams = filtered.length;
    const avgScore =
      totalTeams > 0 ? filtered.reduce((a, x) => a + (Number(x.playoff_score) || 0), 0) / totalTeams : 0;
    const avgReliability =
      totalTeams > 0 ? filtered.reduce((a, x) => a + (Number(x.disabled_rate) || 0), 0) / totalTeams : 0;

    return { totalTeams, avgScore, avgReliability };
  }, [filtered]);

  return (
    <div style={{ padding: 16, maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Analysis Dashboard</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            Playoff-focused ranking (Auto + Endgame + Reliability + Consistency)
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

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team #"
            style={{ width: 180, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
          />

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            style={{ width: 180, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
          >
            <option value="all">All teams</option>
            <option value="safe">Safe picks</option>
            <option value="auto">Auto-capable</option>
            <option value="endgame">Endgame-capable</option>
            <option value="defense">Defense bots</option>
          </select>
        </div>
      </div>

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

      {loading && <div style={{ marginTop: 18 }}>Loading analysis…</div>}

      {err && (
        <div style={{ marginTop: 18, padding: 12, borderRadius: 14, border: "1px solid #ffb3b3", background: "#fff5f5" }}>
          <b>Error:</b> {err}
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            ודא שיצרת את ה־VIEWs: <code>v_team_stats</code> ו-<code>v_team_playoff_score</code>.
          </div>
        </div>
      )}

      {!loading && !err && eventId && (
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
                      {num(r.auto_score_avg, 2)}{" "}
                      <span style={{ opacity: 0.7 }}>({pct(r.auto_mobility_rate)})</span>
                    </td>
                    <td style={{ padding: 10 }}>{pct(r.endgame_success_rate)}</td>
                    <td style={{ padding: 10 }}>{pct(r.disabled_rate)}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {riskBadge(r)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DETAILS PANEL */}
          <div style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 12 }}>
            <div style={{ fontWeight: 950, borderBottom: "1px solid #eee", paddingBottom: 10 }}>
              Team Details
            </div>

            {!selectedTeam && (
              <div style={{ marginTop: 12, opacity: 0.8 }}>
                Click a team to see breakdown.
              </div>
            )}

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
      )}

      {!eventId && (
        <div style={{ marginTop: 14, opacity: 0.85 }}>
          Select an event to load playoff-focused ranking.
        </div>
      )}
    </div>
  );
}
