import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { computeAllianceIntel, toNum, num, pct, type TeamRow, type Risk } from "../lib/allianceIntel";

type SavedAllianceRow = {
  id: string;
  event_id: string;
  name: string | null;
  t1: number;
  t2: number;
  t3: number;
  created_at: string | null;
};

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

function fmtDate(x: string | null) {
  if (!x) return "";
  try {
    return new Date(x).toLocaleString();
  } catch {
    return x;
  }
}

export default function SavedAlliancesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = (params.get("event_id") ?? "").trim();

  const [rows, setRows] = useState<SavedAllianceRow[]>([]);
  const [statsRows, setStatsRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const statsByTeam = useMemo(() => {
    const m = new Map<number, TeamRow>();
    for (const r of statsRows) m.set(Number(r.team_number), r);
    return m;
  }, [statsRows]);

  const loadAll = async () => {
    if (!eventId) return;

    setLoading(true);
    setErr("");

    try {
      const { data: saved, error: e1 } = await supabase
        .from("saved_alliances")
        .select("id,event_id,name,t1,t2,t3,created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (e1) {
        console.error("LOAD SAVED ALLIANCES ERROR:", e1);
        setErr(e1.message);
        return;
      }

      const savedRows = (saved ?? []) as SavedAllianceRow[];
      setRows(savedRows);

      const teamSet = new Set<number>();
      for (const r of savedRows) {
        teamSet.add(Number(r.t1));
        teamSet.add(Number(r.t2));
        teamSet.add(Number(r.t3));
      }
      const teams = Array.from(teamSet).filter((n) => Number.isFinite(n));

      if (teams.length === 0) {
        setStatsRows([]);
        return;
      }

      const { data: stats, error: e2 } = await supabase
        .from("v_picklist_v1")
        .select("*")
        .eq("event_id", eventId)
        .in("team_number", teams);

      if (e2) {
        console.error("LOAD STATS ERROR:", e2);
        setStatsRows([]);
        return;
      }

      setStatsRows((stats ?? []) as TeamRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const deleteAlliance = async (id: string) => {
    const ok = window.confirm("Delete this saved alliance?");
    if (!ok) return;

    const { error } = await supabase.from("saved_alliances").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const openAlliance = (r: SavedAllianceRow) => {
    const url =
      `/analysis/alliance?event_id=${encodeURIComponent(eventId)}` +
      `&t1=${encodeURIComponent(String(r.t1))}` +
      `&t2=${encodeURIComponent(String(r.t2))}` +
      `&t3=${encodeURIComponent(String(r.t3))}`;
    navigate(url);
  };

  if (!eventId) {
    return (
      <div style={{ padding: 16, maxWidth: 1200 }}>
        <h1 style={{ margin: 0 }}>Saved Alliances</h1>
        <div style={{ marginTop: 10, opacity: 0.85 }}>
          Missing <b>event_id</b> in URL.
        </div>
        <div style={{ marginTop: 6, fontFamily: "monospace" }}>Example: /analysis/saved?event_id=YOUR_EVENT_UUID</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Saved Alliances</h1>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Event: <code>{eventId}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate(`/analysis/compare?event_id=${encodeURIComponent(eventId)}`)}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            Open Compare
          </button>

          <button
            type="button"
            onClick={loadAll}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {loading ? <div>Loading…</div> : null}
        {err ? <div style={{ color: "crimson", fontWeight: 900 }}>Error: {err}</div> : null}
      </div>

      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 1000 }}>
          Saved ({rows.length})
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.85 }}>No saved alliances yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Alliance</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Synergy</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Risk</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Weakness</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Created</th>
                <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const t1 = statsByTeam.get(Number(r.t1)) ?? null;
                const t2 = statsByTeam.get(Number(r.t2)) ?? null;
                const t3 = statsByTeam.get(Number(r.t3)) ?? null;

                const intel = computeAllianceIntel([t1, t2, t3]);

                const minMatches =
                  t1 && t2 && t3
                    ? Math.min(toNum(t1.matches_scouted), toNum(t2.matches_scouted), toNum(t3.matches_scouted))
                    : 0;

                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 10, fontWeight: 1000 }}>
                      {r.name ?? `#${r.t1} + #${r.t2} + #${r.t3}`}
                      <div style={{ marginTop: 4, fontFamily: "monospace", opacity: 0.8 }}>
                        #{r.t1} + #{r.t2} + #{r.t3}
                      </div>

                      {!intel.haveAll ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                          Some teams have no scouting stats yet (still OK).
                        </div>
                      ) : (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                          Coverage: min matches {minMatches} · Auto {num(intel.quick.autoScore, 1)} · End {pct(intel.quick.endgame)}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: 10 }}>{synergyBadge(intel.synergy)}</td>

                    <td style={{ padding: 10 }}>{riskBadge(intel.riskLabel)}</td>

                    <td style={{ padding: 10, fontWeight: 900 }}>{intel.weaknessText}</td>

                    <td style={{ padding: 10, opacity: 0.85 }}>{fmtDate(r.created_at)}</td>

                    <td style={{ padding: 10, textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => openAlliance(r)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#fff",
                            fontWeight: 1000,
                            cursor: "pointer",
                          }}
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteAlliance(r.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#fff",
                            fontWeight: 1000,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
        Note: Synergy/Risk/Weakness are calculated live from <b>v_picklist_v1</b> via <b>computeAllianceIntel()</b>.
      </div>
    </div>
  );
}
