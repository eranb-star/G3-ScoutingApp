import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  computeAllianceIntel,
  num,
  pct,
  riskLabel,
  roleFor,
  toNum,
  type TeamRow,
  type Risk,
  type Role,
} from "../lib/allianceIntel";

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

function riskColor(lbl: Risk) {
  if (lbl === "HIGH") return "#ffe0e0";
  if (lbl === "MED") return "#fff4cc";
  return "#e8ffe8";
}

function roleBadge(role: Role) {
  const map: Record<Role, { text: string; bg: string }> = {
    MAIN_SCORER: { text: "MAIN SCORER", bg: "#fff4cc" },
    SECOND_SCORER: { text: "SECOND SCORER", bg: "#f6f0ff" },
    DEFENDER: { text: "DEFENDER", bg: "#e8fff6" },
    ENDGAME_ANCHOR: { text: "ENDGAME ANCHOR", bg: "#f2e8ff" },
    SUPPORT: { text: "SUPPORT", bg: "#f0f0f0" },
    UNKNOWN: { text: "UNKNOWN", bg: "#f0f0f0" },
  };
  return map[role];
}

type TeamStats = TeamRow;

export default function AlliancePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const eventId = (params.get("event_id") ?? "").trim();
  const t1 = params.get("t1");
  const t2 = params.get("t2");
  const t3 = params.get("t3");

  const captain = t1 ? Number(t1) : NaN;
  const partnerA = t2 ? Number(t2) : NaN;
  const partnerB = t3 ? Number(t3) : NaN;

  const teamNumbers = useMemo(() => {
    const nums = [captain, partnerA, partnerB].filter((n) => Number.isFinite(n));
    return Array.from(new Set(nums));
  }, [captain, partnerA, partnerB]);

  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // -------------------------
  // Admin-only: Fetch matches (TBA)
  // -------------------------
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLabel, setAuthLabel] = useState<string>("");
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string>("");

  useEffect(() => {
    const checkAdmin = async () => {
      setIsAdmin(false);
      setAuthLabel("");
      setFetchMsg("");

      // No event selected => no need
      if (!eventId) return;

      // Must be logged in
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user ?? null;
      if (!user) return;

      setAuthLabel(user.email ?? user.id);

      // Check app_admins table
      const { data: adminRow, error: adminErr } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminErr) {
        // Don't block the page if admin check fails; just hide the buttons.
        console.warn("Admin check failed:", adminErr.message);
        return;
      }

      setIsAdmin(!!adminRow);
    };

    checkAdmin();
  }, [eventId]);

  const fetchQmFromTBA = async (replace: boolean) => {
    if (!eventId) return;

    if (replace) {
      const ok = window.confirm(
        "This will DELETE existing QM matches for this event and re-import from TBA.\n\nContinue?"
      );
      if (!ok) return;
    }

    setFetchingMatches(true);
    setFetchMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("sync_tba_matches", {
        body: { event_id: eventId, replace },
      });

      if (error) {
        console.error("sync_tba_matches invoke error:", error);
        setFetchMsg("Fetch failed: " + (error.message ?? "unknown error"));
        return;
      }

      // The edge function returns fields like qm_count, mode, ok...
      const qmCount = (data as any)?.qm_count;
      const mode = (data as any)?.mode;
      setFetchMsg(`Fetched QM from TBA ✅ (qm_count=${qmCount ?? "?"}, mode=${mode ?? "ok"})`);
    } catch (e: any) {
      console.error("Fetch QM exception:", e);
      setFetchMsg("Fetch failed: " + String(e?.message ?? e));
    } finally {
      setFetchingMatches(false);
    }
  };

  // -------------------------
  // Load alliance team stats
  // -------------------------
  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      if (teamNumbers.length !== 3) return;

      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase
          .from("v_picklist_v1")
          .select("*")
          .eq("event_id", eventId)
          .in("team_number", teamNumbers);

        if (error) {
          console.error("ALLIANCE LOAD ERROR:", error);
          setErr(error.message);
          return;
        }

        setTeams((data ?? []) as TeamStats[]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId, teamNumbers]);

  const byTeam = useMemo(() => {
    const m = new Map<number, TeamStats>();
    teams.forEach((t) => m.set(Number(t.team_number), t));
    return m;
  }, [teams]);

  const ordered = useMemo(() => {
    const a = byTeam.get(captain) ?? null;
    const b = byTeam.get(partnerA) ?? null;
    const c = byTeam.get(partnerB) ?? null;
    return [a, b, c] as (TeamStats | null)[];
  }, [byTeam, captain, partnerA, partnerB]);

  // Single source of truth
  const intel = useMemo(() => computeAllianceIntel(ordered), [ordered]);

  const allianceMetrics = useMemo(() => {
    if (teams.length !== 3) return null;

    const sum = (k: keyof TeamStats) => teams.reduce((a, b) => a + toNum((b as any)[k], 0), 0);
    const avg = (k: keyof TeamStats) => sum(k) / teams.length;

    return {
      auto_score_sum: sum("auto_score_avg"),
      auto_mobility_avg: avg("auto_mobility_rate"),
      teleop_score_sum: sum("teleop_score_avg"),
      teleop_missed_sum: sum("teleop_missed_avg"),
      cycles_sum: sum("cycles_avg"),
      endgame_success_avg: avg("endgame_success_rate"),
      disabled_avg: avg("disabled_rate"),
      brownout_avg: avg("brownout_rate"),
      consistency_avg: avg("consistency_avg"),
      playoff_score_sum: sum("playoff_score" as any),
    };
  }, [teams]);

  const saveAlliance = async () => {
    if (!eventId || teamNumbers.length !== 3) return;

    const t1n = captain;
    const [t2n, t3n] = [partnerA, partnerB].sort((a, b) => a - b);
    const name = `#${t1n} (C) + #${t2n} + #${t3n}`;

    const payload: any = {
      event_id: eventId,
      t1: t1n,
      t2: t2n,
      t3: t3n,
      name,
      synergy_score: intel.synergy,
      risk_label: intel.riskLabel,
      weakness_flags: intel.weaknesses,
      synergy_breakdown: { roles: intel.roles, quick: intel.quick },
      metrics: { alliance: allianceMetrics },
    };

    const { error } = await supabase
      .from("saved_alliances")
      .upsert([payload], { onConflict: "event_id,t1,t2,t3" });

    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert("Saved ✅");
  };

  const goCompare = () => navigate(`/analysis/compare?event_id=${encodeURIComponent(eventId)}`);

  if (!eventId || teamNumbers.length !== 3) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Alliance Builder</h1>
        <div style={{ color: "crimson", fontWeight: 900 }}>
          Missing or invalid alliance parameters (need event_id + t1 + t2 + t3, all different).
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Alliance Builder</h1>
        <div>Loading alliance data…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Alliance Builder</h1>
        <div style={{ color: "crimson", fontWeight: 900 }}>{err}</div>
      </div>
    );
  }

  if (!allianceMetrics) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Alliance Builder</h1>
        <div>Not enough data yet.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1150 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Alliance Analysis</h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Event: <code>{eventId}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={saveAlliance}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            Save Alliance
          </button>

          <button
            type="button"
            onClick={goCompare}
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

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#fff",
              fontWeight: 1000,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>Synergy:</div>
            <div style={{ fontSize: 18 }}>{Math.round(intel.synergy)}/100</div>
            <Badge text={`RISK ${intel.riskLabel}`} bg={riskColor(intel.riskLabel)} />
          </div>
        </div>
      </div>

      {/* Admin Tools (Fetch matches) */}
      <div style={{ marginTop: 12 }}>
        {isAdmin ? (
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>
              Admin Tools <span style={{ opacity: 0.7, fontWeight: 800 }}>({authLabel})</span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => fetchQmFromTBA(false)}
                disabled={fetchingMatches}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 1000,
                  cursor: fetchingMatches ? "not-allowed" : "pointer",
                  opacity: fetchingMatches ? 0.6 : 1,
                }}
              >
                {fetchingMatches ? "Fetching…" : "Fetch QM from TBA"}
              </button>

              <button
                type="button"
                onClick={() => fetchQmFromTBA(true)}
                disabled={fetchingMatches}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 1000,
                  cursor: fetchingMatches ? "not-allowed" : "pointer",
                  opacity: fetchingMatches ? 0.6 : 1,
                }}
              >
                {fetchingMatches ? "Fetching…" : "Replace QM (delete + reimport)"}
              </button>

              {fetchMsg ? <div style={{ fontWeight: 900, opacity: 0.9 }}>{fetchMsg}</div> : null}
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Uses edge function <code>sync_tba_matches</code>. Buttons appear only for admins (table{" "}
              <code>app_admins</code>).
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Admin tools hidden (login required + must be in <code>app_admins</code>).
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>Weakness Coverage</div>
        <div style={{ fontWeight: 900, opacity: 0.9 }}>{intel.weaknessText}</div>
      </div>

      {/* Teams */}
      <div style={{ display: "flex", gap: 12, marginTop: 14, marginBottom: 16, flexWrap: "wrap" }}>
        {[captain, partnerA, partnerB].map((t) => {
          const s = byTeam.get(t) ?? null;
          const isCaptain = t === captain;
          const role = roleFor(s);
          const rb = roleBadge(role);

          return (
            <div
              key={t}
              style={{
                flex: "1 1 320px",
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 12,
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 1000, fontSize: 18 }}>
                #{t} {isCaptain ? "(Captain)" : ""}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge text={rb.text} bg={rb.bg} />
                {s ? (
                  <Badge text={`Matches ${s.matches_scouted ?? 0}`} bg="#f0f0f0" />
                ) : (
                  <Badge text="NO DATA" bg="#ffe0e0" />
                )}
              </div>

              {!s ? (
                <div style={{ opacity: 0.7, marginTop: 10 }}>No scouting data yet</div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 14 }}>
                  <div>
                    <b>Auto:</b> {num(s.auto_score_avg, 2)} · mob {pct(s.auto_mobility_rate)}
                  </div>
                  <div>
                    <b>Teleop:</b> {num(s.teleop_score_avg, 2)} · cycles {num(s.cycles_avg, 2)}
                  </div>
                  <div>
                    <b>Endgame:</b> {pct(s.endgame_success_rate)}
                  </div>
                  <div>
                    <b>Defense:</b> {num(s.defense_effectiveness_score, 2)}
                  </div>
                  <div>
                    <b>Risk:</b> <b>{riskLabel(s.disabled_rate, s.brownout_rate)}</b>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alliance summary */}
      <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, background: "#fafafa" }}>
        <h2 style={{ marginTop: 0 }}>Alliance Combined Output</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <b>Auto score (sum):</b> {num(allianceMetrics.auto_score_sum)}
          </div>
          <div>
            <b>Auto mobility (avg):</b> {pct(allianceMetrics.auto_mobility_avg)}
          </div>

          <div>
            <b>Teleop score (sum):</b> {num(allianceMetrics.teleop_score_sum)}
          </div>
          <div>
            <b>Teleop missed (sum):</b> {num(allianceMetrics.teleop_missed_sum)}
          </div>

          <div>
            <b>Total cycles (sum):</b> {num(allianceMetrics.cycles_sum)}
          </div>
          <div>
            <b>Endgame success (avg):</b> {pct(allianceMetrics.endgame_success_avg)}
          </div>

          <div>
            <b>Disabled (avg):</b> {pct(allianceMetrics.disabled_avg)}
          </div>
          <div>
            <b>Consistency (avg):</b> {num(allianceMetrics.consistency_avg)}
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fff", fontWeight: 900 }}>
          Estimated playoff value (sum): {num(allianceMetrics.playoff_score_sum, 2)}
        </div>
      </div>
    </div>
  );
}
