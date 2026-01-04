import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { computeAllianceIntel, type TeamRow, type Risk } from "../lib/allianceIntel";

type SavedAlliance = {
  id: string;
  created_at: string;
  event_id: string;
  t1: number;
  t2: number;
  t3: number;
  name: string | null;
  notes: string | null;
};

function toNum(x: any, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function num(x: any, digits = 2) {
  return toNum(x, 0).toFixed(digits);
}
function pct(x: any) {
  return `${Math.round(toNum(x, 0) * 100)}%`;
}

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

type AllianceCompareRow = {
  id: string;
  created_at: string;
  name: string;

  t1: number;
  t2: number;
  t3: number;

  // Live intel (single source of truth)
  synergy: number;
  risk: Risk;
  weaknessText: string;

  // Coverage
  minMatches: number;

  // Quick sums/avgs (for comparison view)
  auto_score_sum: number;
  auto_mobility_avg: number;

  teleop_score_sum: number;
  teleop_missed_sum: number;
  cycles_sum: number;

  endgame_success_avg: number;

  disabled_avg: number;
  brownout_avg: number;

  consistency_avg: number;
  playoff_score_sum: number;
};

export default function ComparePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = (params.get("event_id") ?? "").trim();

  const [alliances, setAlliances] = useState<SavedAlliance[]>([]);
  const [statsRows, setStatsRows] = useState<TeamRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // 1) Load saved alliances for this event
  useEffect(() => {
    const loadAlliances = async () => {
      setAlliances([]);
      setSelected({});
      setErr("");

      if (!eventId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("saved_alliances")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("LOAD SAVED ALLIANCES ERROR:", error);
          setErr(error.message);
          return;
        }

        const rows = (data ?? []) as SavedAlliance[];
        setAlliances(rows);

        // default: select all
        const sel: Record<string, boolean> = {};
        for (const a of rows) sel[a.id] = true;
        setSelected(sel);
      } finally {
        setLoading(false);
      }
    };

    loadAlliances();
  }, [eventId]);

  // 2) Load needed team stats from *v_picklist_v1* (single source of truth)
  useEffect(() => {
    const loadStats = async () => {
      setStatsRows([]);
      setErr("");

      if (!eventId) return;
      if (alliances.length === 0) return;

      const setNums = new Set<number>();
      for (const a of alliances) {
        setNums.add(Number(a.t1));
        setNums.add(Number(a.t2));
        setNums.add(Number(a.t3));
      }
      const teamNums = Array.from(setNums).filter((n) => Number.isFinite(n));

      if (teamNums.length === 0) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("v_picklist_v1")
          .select("*")
          .eq("event_id", eventId)
          .in("team_number", teamNums);

        if (error) {
          console.error("LOAD STATS ERROR:", error);
          setErr(error.message);
          return;
        }

        setStatsRows((data ?? []) as TeamRow[]);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [eventId, alliances]);

  const statsByTeam = useMemo(() => {
    const m = new Map<number, TeamRow>();
    for (const s of statsRows) m.set(Number(s.team_number), s);
    return m;
  }, [statsRows]);

  const selectedAlliances = useMemo(() => alliances.filter((a) => selected[a.id]), [alliances, selected]);

  const rows: AllianceCompareRow[] = useMemo(() => {
    const out: AllianceCompareRow[] = [];

    for (const a of selectedAlliances) {
      const t1 = statsByTeam.get(Number(a.t1)) ?? null;
      const t2 = statsByTeam.get(Number(a.t2)) ?? null;
      const t3 = statsByTeam.get(Number(a.t3)) ?? null;

      const intel = computeAllianceIntel([t1, t2, t3]);

      const minMatches =
        t1 && t2 && t3
          ? Math.min(toNum(t1.matches_scouted), toNum(t2.matches_scouted), toNum(t3.matches_scouted))
          : 0;

      // quick aggregates (display only — NOT used for intel)
      const auto_score_sum = toNum(t1?.auto_score_avg) + toNum(t2?.auto_score_avg) + toNum(t3?.auto_score_avg);
      const auto_mobility_avg =
        (toNum(t1?.auto_mobility_rate) + toNum(t2?.auto_mobility_rate) + toNum(t3?.auto_mobility_rate)) / 3;

      const teleop_score_sum =
        toNum(t1?.teleop_score_avg) + toNum(t2?.teleop_score_avg) + toNum(t3?.teleop_score_avg);
      const teleop_missed_sum =
        toNum(t1?.teleop_missed_avg) + toNum(t2?.teleop_missed_avg) + toNum(t3?.teleop_missed_avg);
      const cycles_sum = toNum(t1?.cycles_avg) + toNum(t2?.cycles_avg) + toNum(t3?.cycles_avg);

      const endgame_success_avg =
        (toNum(t1?.endgame_success_rate) + toNum(t2?.endgame_success_rate) + toNum(t3?.endgame_success_rate)) / 3;

      const disabled_avg = (toNum(t1?.disabled_rate) + toNum(t2?.disabled_rate) + toNum(t3?.disabled_rate)) / 3;
      const brownout_avg = (toNum(t1?.brownout_rate) + toNum(t2?.brownout_rate) + toNum(t3?.brownout_rate)) / 3;

      const consistency_avg =
        (toNum(t1?.consistency_avg) + toNum(t2?.consistency_avg) + toNum(t3?.consistency_avg)) / 3;

      const playoff_score_sum = toNum(t1?.playoff_score) + toNum(t2?.playoff_score) + toNum(t3?.playoff_score);

      out.push({
        id: a.id,
        created_at: a.created_at,
        name: a.name ?? `#${a.t1} + #${a.t2} + #${a.t3}`,

        t1: Number(a.t1),
        t2: Number(a.t2),
        t3: Number(a.t3),

        synergy: intel.synergy,
        risk: intel.riskLabel,
        weaknessText: intel.weaknessText,

        minMatches,

        auto_score_sum,
        auto_mobility_avg,

        teleop_score_sum,
        teleop_missed_sum,
        cycles_sum,

        endgame_success_avg,

        disabled_avg,
        brownout_avg,

        consistency_avg,
        playoff_score_sum,
      });
    }

    out.sort((a, b) => {
      const d = b.synergy - a.synergy;
      if (Math.abs(d) > 0.0001) return d;
      return b.playoff_score_sum - a.playoff_score_sum;
    });

    return out;
  }, [selectedAlliances, statsByTeam]);

  const toggleAll = (on: boolean) => {
    const next: Record<string, boolean> = {};
    for (const a of alliances) next[a.id] = on;
    setSelected(next);
  };

  const deleteAlliance = async (id: string) => {
    const ok = confirm("Delete this saved alliance?");
    if (!ok) return;

    const { error } = await supabase.from("saved_alliances").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    setAlliances((prev) => prev.filter((x) => x.id !== id));
    setSelected((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };

  const openAlliance = (t1: number, t2: number, t3: number) => {
    const url =
      `/analysis/alliance?event_id=${encodeURIComponent(eventId)}` +
      `&t1=${encodeURIComponent(String(t1))}` +
      `&t2=${encodeURIComponent(String(t2))}` +
      `&t3=${encodeURIComponent(String(t3))}`;
    navigate(url);
  };

  if (!eventId) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Compare Alliances</h1>
        <div style={{ color: "crimson", fontWeight: 900 }}>Missing event_id in URL.</div>
        <div style={{ opacity: 0.85, marginTop: 6 }}>
          Use: <code>/analysis/compare?event_id=UUID</code>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1400 }}>
      <h1 style={{ margin: 0 }}>Compare Alliances</h1>
      <div style={{ opacity: 0.8, marginTop: 4 }}>
        Event: <code>{eventId}</code>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => toggleAll(true)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 900 }}
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => toggleAll(false)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 900 }}
        >
          Select none
        </button>

        {loading ? <div style={{ fontWeight: 900 }}>Loading…</div> : null}
        {err ? <div style={{ color: "crimson", fontWeight: 900 }}>Error: {err}</div> : null}
      </div>

      {/* Saved list */}
      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 1000 }}>
          Saved alliances ({alliances.length})
        </div>

        {alliances.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.85 }}>No saved alliances yet. Save from Alliance Builder / Picklist.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Use</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Alliance</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Created</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alliances.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>
                    <input
                      type="checkbox"
                      checked={!!selected[a.id]}
                      onChange={(e) => setSelected((p) => ({ ...p, [a.id]: e.target.checked }))}
                    />
                  </td>
                  <td style={{ padding: 10, fontWeight: 950 }}>
                    {a.name ?? `#${a.t1} + #${a.t2} + #${a.t3}`}{" "}
                    <span style={{ opacity: 0.7, fontWeight: 800 }}>
                      (#{a.t1}, #{a.t2}, #{a.t3})
                    </span>
                  </td>
                  <td style={{ padding: 10, opacity: 0.85 }}>{new Date(a.created_at).toLocaleString()}</td>
                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      onClick={() => deleteAlliance(a.id)}
                      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 900 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Comparison table */}
      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 1000 }}>
          Comparison ({rows.length} selected) — SINGLE SOURCE OF TRUTH: v_picklist_v1 + computeAllianceIntel
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.85 }}>Select at least one alliance to compare.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Rank</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Alliance</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Synergy</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Risk</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Weakness</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Coverage</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Auto</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Teleop</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Cycles</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Endgame</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Playoff</th>
                <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((a, idx) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10, fontWeight: 1000 }}>{idx + 1}</td>

                  <td style={{ padding: 10, fontWeight: 1000 }}>
                    {a.name}{" "}
                    <span style={{ opacity: 0.75, fontWeight: 900 }}>
                      (#{a.t1}, #{a.t2}, #{a.t3})
                    </span>
                  </td>

                  <td style={{ padding: 10 }}>{synergyBadge(a.synergy)}</td>
                  <td style={{ padding: 10 }}>{riskBadge(a.risk)}</td>
                  <td style={{ padding: 10, fontWeight: 900, opacity: 0.9 }}>{a.weaknessText}</td>
                  <td style={{ padding: 10 }}>{coverageBadge(a.minMatches)}</td>

                  <td style={{ padding: 10 }}>
                    {num(a.auto_score_sum, 2)}{" "}
                    <span style={{ opacity: 0.75, fontWeight: 800 }}>(mob {pct(a.auto_mobility_avg)})</span>
                  </td>

                  <td style={{ padding: 10 }}>
                    {num(a.teleop_score_sum, 2)}{" "}
                    <span style={{ opacity: 0.75, fontWeight: 800 }}>(miss {num(a.teleop_missed_sum, 2)})</span>
                  </td>

                  <td style={{ padding: 10 }}>{num(a.cycles_sum, 2)}</td>

                  <td style={{ padding: 10 }}>{pct(a.endgame_success_avg)}</td>

                  <td style={{ padding: 10, fontWeight: 1000 }}>{num(a.playoff_score_sum, 2)}</td>

                  <td style={{ padding: 10, textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => openAlliance(a.t1, a.t2, a.t3)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontWeight: 900,
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

      <div style={{ marginTop: 10, opacity: 0.85 }}>
        טיפ: הסתכל על <b>Coverage</b>. ברית עם Synergy גבוה אבל min matches נמוך יכולה להיות “פייק” בגלל מעט נתונים.
      </div>
    </div>
  );
}
