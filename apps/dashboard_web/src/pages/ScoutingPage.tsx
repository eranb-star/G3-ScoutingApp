// apps/dashboard_web/src/pages/ScoutingPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";
import TemplateForm from "../components/TemplateForm";
import { useMemberAuth } from "../lib/memberAuth";
import {
  enqueueScoutEntry,
  getQueuedScoutEntryCount,
  cacheTemplate,
  getCachedTemplate,
  cacheMatches,
  getCachedMatches,
  cacheMatchTeams,
  getCachedMatchTeams,
  getCompetitionSnapshot,
  listQueuedScoutEntries,
  removeQueuedScoutEntry,
} from "../lib/offlineDb";

// --------------------
// Types
// --------------------
type MatchRow = {
  id: string; // uuid
  event_id: string; // uuid
  match_number?: number | null;
  match_type?: string | null; // qm/qf/sf/f etc
  match_key?: string | null; // actual column in DB

  // Needed for pre-caching match teams for complete offline (even if match not opened before)
  red_teams?: number[] | null;
  blue_teams?: number[] | null;
};

type MatchTeamRow = {
  match_id: string;
  team_number: number;
  alliance?: string | null; // "red"/"blue" if view includes it
};

type ScoutRow = {
  id: string;
  event_id: string;
  name: string;
  is_active?: boolean | null;
};

type EventRow = { id: string; name: string; location?: string | null; start_date?: string | null };
type AssignmentRow = { id: string; match_id: string | null; member_id: string; role: string; status: string };

function teamForAssignment(role: string, match?: MatchRow) {
  const station = /^scout_(red|blue)_([123])$/.exec(role);
  if (!station || !match) return null;
  const teams = station[1] === "red" ? match.red_teams : match.blue_teams;
  return teams?.[Number(station[2]) - 1] ?? null;
}

// --------------------
// Helpers
// --------------------

// ✅ Requirement #1: show short names like QM1, QM2 ...
function niceMatchLabel(m: MatchRow) {
  const t = (m.match_type ?? "").toLowerCase();
  const num = m.match_number ?? null;

  // Only show short names (QM1, QF1, SF2, F1...)
  if (t && num != null) {
    if (t === "qm" || t === "qual") return `QM${num}`;
    if (t === "qf") return `QF${num}`;
    if (t === "sf") return `SF${num}`;
    if (t === "f") return `F${num}`;
    return `${t.toUpperCase()}${num}`;
  }

  // fallback: match_key if exists
  if (m.match_key && m.match_key.trim().length > 0) return m.match_key;

  return `Match ${m.id.slice(0, 8)}…`;
}

// UI-only helper: responsive breakpoint
function useIsNarrow(breakpointPx = 600) {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= breakpointPx);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= breakpointPx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpointPx]);

  return isNarrow;
}

function offlineLikelyFromErrorMessage(msg: string) {
  return (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|networkerror|fetch|load failed/i.test(msg)
  );
}

export default function ScoutingPage() {
  const isNarrow = useIsNarrow(600);
  const { profile } = useMemberAuth();
  const [params] = useSearchParams();

  // =====================
  // Event + Template
  // =====================
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>(() => params.get("event_id") ?? localStorage.getItem("g3_event_id") ?? "");
  const [template, setTemplate] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string>("");

  // soft offline info banner (no red errors when cache works)
  const [offlineInfo, setOfflineInfo] = useState<string>("");

  // =====================
  // Scouts (scouter names directory) for Event
  // =====================
  const [scouts, setScouts] = useState<ScoutRow[]>([]);
  const [scoutsLoading, setScoutsLoading] = useState(false);
  const [scoutsError, setScoutsError] = useState<string>("");

  // Scout identity (locked per device)
  const [scoutName, setScoutName] = useState<string>(() => localStorage.getItem("g3_scout_name") ?? "");
  const [scoutLocked, setScoutLocked] = useState<boolean>(() => localStorage.getItem("g3_scout_name_locked") === "1");

  // =====================
  // Matches for Event
  // =====================
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string>("");

  // Selected match
  const [matchId, setMatchId] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  // =====================
  // Teams for Selected Match
  // =====================
  const [matchTeams, setMatchTeams] = useState<number[]>([]);
  const [matchTeamsLoading, setMatchTeamsLoading] = useState(false);
  const [matchTeamsError, setMatchTeamsError] = useState<string>("");

  // =====================
  // Form values
  // =====================
  const [values, setValues] = useState<Record<string, any>>({});

  // Save UI
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string>("");

  const [offlineQueuedCount, setOfflineQueuedCount] = useState<number>(0);

  // Prevent overlapping sync runs
  const syncInflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    void supabase.from("events").select("id,name,location,start_date").eq("active", true).order("start_date", { ascending: false })
      .then(async ({ data, error }) => {
        if (!error && data?.length) { setEvents(data as EventRow[]); return; }
        if (!eventId) return;
        const cached = await getCompetitionSnapshot(eventId);
        setEvents((cached?.events ?? []) as EventRow[]);
      });
  }, [eventId]);

  useEffect(() => {
    if (!profile?.display_name) return;
    setScoutName(profile.display_name);
    setScoutLocked(true);
    localStorage.setItem("g3_scout_name", profile.display_name);
    localStorage.setItem("g3_scout_name_locked", "1");
  }, [profile?.display_name]);

  useEffect(() => {
    if (!eventId || !profile?.id) { setAssignments([]); return; }
    void supabase.from("competition_assignments").select("id,match_id,member_id,role,status")
      .eq("event_id", eventId).eq("member_id", profile.id).like("role", "scout_%")
      .then(({ data }) => setAssignments((data ?? []) as AssignmentRow[]));
  }, [eventId, profile?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const n = await getQueuedScoutEntryCount();
        if (alive) setOfflineQueuedCount(n);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setValue = (id: string, value: any) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  // =====================
  // Background sync queued scout entries when back online
  // =====================
  const syncQueuedNow = async () => {
    if (syncInflight.current) return syncInflight.current;

    syncInflight.current = (async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

      let queued: any[] = [];
      try {
        queued = await listQueuedScoutEntries();
      } catch {
        return;
      }

      if (!queued.length) {
        setOfflineQueuedCount(0);
        return;
      }

      // oldest-first (stable)
      queued.sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)));

      let sent = 0;

      for (const entry of queued) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) break;

        try {
          const { error } = await supabase
            .from("scout_entries")
            .upsert([entry], { onConflict: "entry_uuid", ignoreDuplicates: true });

          if (error) {
            const msg = error.message ?? String(error);
            if (offlineLikelyFromErrorMessage(msg)) break;
            continue; // keep queued
          }

          await removeQueuedScoutEntry(entry.entry_uuid);
          sent += 1;
        } catch {
          break;
        }
      }

      try {
        const n = await getQueuedScoutEntryCount();
        setOfflineQueuedCount(n);

        if (sent > 0) {
          setOfflineInfo(`Synced ${sent} offline entries ✅`);
        }
      } catch {
        // ignore
      }
    })().finally(() => {
      syncInflight.current = null;
    });

    return syncInflight.current;
  };

  // Sync triggers: boot, online event, and periodic while queued>0
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const n = await getQueuedScoutEntryCount();
        if (!alive) return;
        setOfflineQueuedCount(n);
        if (n > 0 && typeof navigator !== "undefined" && navigator.onLine !== false) {
          await syncQueuedNow();
        }
      } catch {
        // ignore
      }
    })();

    const onOnline = async () => {
      if (!alive) return;
      await syncQueuedNow();
    };

    window.addEventListener("online", onOnline);

    const interval = setInterval(() => {
      if (!alive) return;
      if (offlineQueuedCount > 0 && typeof navigator !== "undefined" && navigator.onLine !== false) {
        void syncQueuedNow();
      }
    }, 10_000);

    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineQueuedCount]);

  // ✅ If sync emptied the queue, clear stale "Saved offline..." message
  useEffect(() => {
    if (offlineQueuedCount === 0) {
      setSaveMsg((prev) => (/saved offline/i.test(prev ?? "") ? "" : prev));
    }
  }, [offlineQueuedCount]);

  // =====================
  // Load Scouts when event changes
  // =====================
  useEffect(() => {
    const loadScouts = async () => {
      const cleanEventId = (eventId ?? "").trim();
      setScouts([]);
      setScoutsError("");
      if (!cleanEventId) return;

      setScoutsLoading(true);
      try {
        // NOTE: adjust table name if yours differs
        const { data, error } = await supabase
          .from("event_scouts")
          .select("id,event_id,name,is_active")
          .eq("event_id", cleanEventId)
          .order("name", { ascending: true });

        if (error) {
          setScoutsError(error.message ?? String(error));
          return;
        }

        const rows = ((data as any[]) ?? []) as ScoutRow[];
        const active = rows.filter((r) => r.is_active !== false);
        setScouts(active);
      } finally {
        setScoutsLoading(false);
      }
    };

    loadScouts();
  }, [eventId]);

  // =====================
  // Load Template when event changes (ONLINE -> cache, OFFLINE -> cached fallback)
  // =====================
  useEffect(() => {
    const loadTemplate = async () => {
      const cleanEventId = (eventId ?? "").trim();

      setTemplate(null);
      setTemplateError("");
      setSaveMsg("");
      setOfflineInfo("");

      if (!cleanEventId) return;

      setTemplateLoading(true);
      try {
        const { data, error } = await supabase
          .from("form_templates")
          .select("schema,created_at")
          .eq("event_id", cleanEventId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          const msg = error.message ?? String(error);
          if (offlineLikelyFromErrorMessage(msg)) {
            const cached = await getCachedTemplate(cleanEventId);
            if (cached?.schema) {
              setTemplate(cached.schema);
              setOfflineInfo("Offline: loaded cached template ✅");
              return;
            }
            setTemplateError("Offline: no cached template for this event. Go online once to cache it.");
            return;
          }
          setTemplateError(msg);
          return;
        }

        if (!data || data.length === 0) {
          const cached = await getCachedTemplate(cleanEventId);
          if (cached?.schema) {
            setTemplate(cached.schema);
            setOfflineInfo("Loaded cached template ✅");
            return;
          }
          setTemplateError("No template found for this event.");
          return;
        }

        const schema = (data[0] as any).schema ?? null;
        setTemplate(schema);

        if (schema) {
          try {
            await cacheTemplate(cleanEventId, schema);
          } catch {
            // ignore
          }
        }
      } finally {
        setTemplateLoading(false);
      }
    };

    loadTemplate();
  }, [eventId]);

  // =====================
  // Load Matches when event changes (ONLINE -> cache, OFFLINE -> cached fallback)
  // ✅ FIX: do NOT select set_number/description (they don't exist in your matches table)
  // =====================
  useEffect(() => {
    const loadMatches = async () => {
      const cleanEventId = (eventId ?? "").trim();

      setMatches([]);
      setMatchesError("");
      setMatchId("");

      // reset match teams state too
      setMatchTeams([]);
      setMatchTeamsError("");
      setMatchTeamsLoading(false);

      // reset team selection to avoid saving wrong team to new event
      setValues((prev) => ({
        ...prev,
        team_number: "",
      }));

      if (!cleanEventId) return;

      setMatchesLoading(true);
      try {
        const { data, error } = await supabase
          .from("matches")
          .select("id,event_id,match_number,match_type,match_key,red_teams,blue_teams")
          .eq("event_id", cleanEventId)
          .order("match_type", { ascending: true })
          .order("match_number", { ascending: true });

        if (error) {
          const msg = error.message ?? String(error);

          if (offlineLikelyFromErrorMessage(msg)) {
            const cached = await getCachedMatches(cleanEventId);
            if (cached?.matches?.length) {
              setMatches(cached.matches as MatchRow[]);
              setOfflineInfo((prev) => (prev ? prev : "Offline: loaded cached matches ✅"));
              return;
            }
            setMatchesError("Offline: no cached matches for this event. Go online once to cache them.");
            return;
          }

          setMatchesError(msg);
          return;
        }

        const rows = ((data as any[]) ?? []) as MatchRow[];
        setMatches(rows);

        // cache matches for offline
        try {
          await cacheMatches(cleanEventId, rows);
        } catch {
          // ignore
        }

        // pre-cache match teams for ALL matches (complete offline)
        try {
          for (const m of rows) {
            const red = Array.isArray(m.red_teams) ? m.red_teams : [];
            const blue = Array.isArray(m.blue_teams) ? m.blue_teams : [];
            const combined = [...red, ...blue].map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
            const uniq = Array.from(new Set(combined));
            if (uniq.length > 0) {
              await cacheMatchTeams(m.id, uniq);
            }
          }
        } catch {
          // ignore
        }
      } finally {
        setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [eventId]);

  // Helpful derived info
  const selectedMatchLabel = useMemo(() => {
    const m = matches.find((x) => x.id === matchId);
    return m ? niceMatchLabel(m) : "";
  }, [matches, matchId]);

  const currentAssignment = useMemo(() => assignments.find((item) => item.match_id === matchId) ?? null, [assignments, matchId]);

  useEffect(() => {
    const requestedMatch = params.get("match_id");
    const nextAssignment = assignments.find((item) => item.status !== "completed" && matches.some((match) => match.id === item.match_id));
    const target = requestedMatch && matches.some((match) => match.id === requestedMatch) ? requestedMatch : nextAssignment?.match_id;
    if (target && target !== matchId) setMatchId(target);
  }, [assignments, matches, params]);

  useEffect(() => {
    if (!currentAssignment) return;
    const assignedTeam = teamForAssignment(currentAssignment.role, matches.find((item) => item.id === currentAssignment.match_id));
    if (assignedTeam) setValues((previous) => ({ ...previous, team_number: assignedTeam }));
  }, [currentAssignment, matches, matchTeams]);

  // =====================
  // Load Match Teams when match changes (ONLINE -> cache, OFFLINE -> cached fallback)
  // =====================
  useEffect(() => {
    const loadMatchTeams = async () => {
      setMatchTeams([]);
      setMatchTeamsError("");

      // also reset team selection when match changes (prevents wrong team)
      setValues((prev) => ({
        ...prev,
        team_number: "",
      }));

      if (!matchId) return;

      setMatchTeamsLoading(true);
      try {
        const { data, error } = await supabase
          .from("v_match_teams")
          .select("match_id,team_number,alliance")
          .eq("match_id", matchId)
          .order("alliance", { ascending: true })
          .order("team_number", { ascending: true });

        if (error) {
          const msg = error.message ?? String(error);

          if (offlineLikelyFromErrorMessage(msg)) {
            const cached = await getCachedMatchTeams(matchId);
            if (cached?.teams?.length) {
              setMatchTeams(cached.teams);
              setOfflineInfo((prev) => (prev ? prev : "Offline: loaded cached match teams ✅"));
              return;
            }

            setMatchTeamsError("Offline: no cached teams for this match. You can still type team number manually.");
            setMatchTeams([]);
            return;
          }

          setMatchTeamsError(
            `Could not load match teams (v_match_teams). You can still type team number manually. Error: ${msg}`
          );
          setMatchTeams([]);
          return;
        }

        const nums = (data as MatchTeamRow[] | null | undefined) ?? [];
        const list = nums.map((x) => Number(x.team_number)).filter((n) => Number.isFinite(n));

        // unique + stable order
        const uniq = Array.from(new Set(list));
        setMatchTeams(uniq);

        // cache match teams for offline use
        try {
          await cacheMatchTeams(matchId, uniq);
        } catch {
          // ignore
        }
      } finally {
        setMatchTeamsLoading(false);
      }
    };

    loadMatchTeams();
  }, [matchId]);

  // Derived: whether we can enforce dropdown-only selection
  const hasMatchTeams = matchTeams.length >= 6; // normally exactly 6

  // =====================
  // Save entry to scout_entries (ONLINE or queue offline)
  // =====================
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMsg("");

      const cleanEventId = (eventId ?? "").trim();

      if (!cleanEventId) {
        setSaveMsg("בחר Event קודם.");
        return;
      }

      if (!scoutLocked || !scoutName.trim()) {
        setSaveMsg("בחר את השם שלך (נעול לפי המכשיר) לפני שמירה.");
        return;
      }

      if (!matchId) {
        setSaveMsg("בחר Match קודם.");
        return;
      }

      const teamNumber = Number(values.team_number ?? 0);
      if (!teamNumber || teamNumber <= 0) {
        setSaveMsg("בחר Team Number תקין (מספר חיובי).");
        return;
      }

      // Critical validation:
      if (hasMatchTeams && !matchTeams.includes(teamNumber)) {
        setSaveMsg("הקבוצה שנבחרה לא נמצאת במשחק הזה. בחר קבוצה מתוך הרשימה.");
        return;
      }

      const deviceId =
        localStorage.getItem("g3_device_id") ??
        (() => {
          const id = crypto.randomUUID();
          localStorage.setItem("g3_device_id", id);
          return id;
        })();

      const entry_uuid = crypto.randomUUID();
      const created_at = new Date().toISOString();

      const row = {
        entry_uuid,
        event_id: cleanEventId,
        match_id: matchId,
        team_number: teamNumber,
        scout_user_id: null,
        device_id: deviceId,
        created_at,
        data: {
          ...values,
          match_id: matchId,
          scout_name: scoutName.trim(), // saved inside JSON for now (no DB change needed)
        },
        notes: values.notes ?? null,
      };

      // idempotent upsert
      const { error } = await supabase
        .from("scout_entries")
        .upsert([row], { onConflict: "entry_uuid", ignoreDuplicates: true });

      if (error) {
        const msg = error.message ?? String(error);

        if (offlineLikelyFromErrorMessage(msg)) {
          try {
            await enqueueScoutEntry(row);
            const n = await getQueuedScoutEntryCount();
            setOfflineQueuedCount(n);
            setSaveMsg(`Saved offline ✅ (queued: ${n})`);
          } catch (e) {
            console.error("OFFLINE QUEUE ERROR:", e);
            setSaveMsg("Offline save failed (queue error).");
          }
          return;
        }

        setSaveMsg("Save failed: " + msg);
        return;
      }

      setSaveMsg(`Saved ✅ (${selectedMatchLabel || "match"})`);
      if (currentAssignment && currentAssignment.status !== "completed") {
        await supabase.from("competition_assignments").update({ status: "completed" }).eq("id", currentAssignment.id);
        setAssignments((rows) => rows.map((item) => item.id === currentAssignment.id ? { ...item, status: "completed" } : item));
      }
      setValues((prev) => ({
        team_number: prev.team_number, // keep team selection
        notes: "",
      }));
    } finally {
      setSaving(false);
    }
  };

  // Shared input styles (UI-only)
  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #ccc",
  };

  // =====================
  // UI
  // =====================
  return (
    <main className="scouting-command-page" style={{ padding: isNarrow ? 10 : 16, maxWidth: 1020 }}>
      <header className="scouting-command-hero">
        <div><span>G3 6740 · MATCH OPERATIONS</span><h1>Scout the match</h1><p>One assignment, one team, one clear report.</p></div>
        <div className="scouting-sync-state"><b>{navigator.onLine ? "LIVE" : "OFFLINE"}</b><small>{offlineQueuedCount ? `${offlineQueuedCount} waiting to sync` : "All reports synchronized"}</small></div>
      </header>

      {/* Soft offline info banner */}
      {offlineInfo ? (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fafafa",
            fontWeight: 900,
            opacity: 0.9,
          }}
        >
          {offlineInfo}
        </div>
      ) : null}

      {/* EVENT PICKER */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Select Event</div>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <select
            value={eventId}
            onChange={(e) => {
              const v = e.target.value;
              setEventId(v);
              localStorage.setItem("g3_event_id", v); // ✅ for countdown + admin convenience
            }}
            style={controlStyle}
          >
            <option value="">Select Event</option>
            {events.map((event) => <option value={event.id} key={event.id}>{event.name}</option>)}
          </select>
        </div>
      </div>

      {!eventId && <div style={{ opacity: 0.8 }}>בחר Event כדי לטעון טופס ומאצ׳ים.</div>}

      {/* SCOUT PICKER (picklist only — no manual “previous scout name” UI) */}
      {eventId && !profile && (
        <div style={{ marginBottom: 14, maxWidth: 520 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>בחר/י את השם שלך (ננעל לפי המכשיר)</div>

          {scoutsLoading ? <div style={{ opacity: 0.8 }}>Loading scouters…</div> : null}

          {scoutsError ? (
            <div style={{ marginTop: 6, padding: 10, borderRadius: 12, background: "#fff5f5", border: "1px solid #ffb3b3" }}>
              <b>Scouters error:</b> {scoutsError}
            </div>
          ) : (
            <select
              value={scoutName}
              disabled={scoutLocked}
              onChange={(e) => setScoutName(e.target.value)}
              style={controlStyle}
            >
              <option value="">{scoutLocked ? "Locked ✅" : "Select your name…"}</option>
              {scouts.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {!scoutLocked ? (
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!scoutName.trim()}
                onClick={() => {
                  const n = scoutName.trim();
                  if (!n) return;
                  localStorage.setItem("g3_scout_name", n);
                  localStorage.setItem("g3_scout_name_locked", "1");
                  setScoutLocked(true);
                  setSaveMsg("");
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: "#fff",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Lock name
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("g3_scout_name");
                  localStorage.removeItem("g3_scout_name_locked");
                  setScoutName("");
                  setScoutLocked(false);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: 0.85,
                }}
              >
                Reset
              </button>
            </div>
          ) : null}
        </div>
      )}

      {eventId && assignments.length > 0 ? (
        <section className="scouting-assignment-rail" aria-label="My scouting assignments">
          <div><span>MY SCOUTING RUN</span><strong>{assignments.filter((item) => item.status === "completed").length}/{assignments.length} reports complete</strong></div>
          <div className="scouting-assignment-chips">
            {assignments.map((assignment) => {
              const match = matches.find((item) => item.id === assignment.match_id);
              const team = teamForAssignment(assignment.role, match);
              return <button type="button" className={`${assignment.match_id === matchId ? "is-current" : ""} ${assignment.status === "completed" ? "is-done" : ""}`} onClick={() => assignment.match_id && setMatchId(assignment.match_id)} key={assignment.id}><b>{match ? niceMatchLabel(match) : "EVENT"}</b><span>{team ? `Team ${team}` : "Awaiting draw"}</span><small>{assignment.status}</small></button>;
            })}
          </div>
        </section>
      ) : null}

      {/* TEMPLATE STATUS */}
      {eventId && templateLoading && <div style={{ opacity: 0.8 }}>Loading template…</div>}
      {eventId && templateError && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #ffb3b3", background: "#fff5f5" }}>
          <b>Template error:</b> {templateError}
        </div>
      )}

      {/* MATCHES STATUS + DROPDOWN */}
      {eventId && (
        <div
          style={{
            marginTop: 14,
            marginBottom: 14,
            padding: isNarrow ? 12 : 14,
            border: "1px solid #eee",
            borderRadius: 14,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Match</div>

          {matchesLoading && <div style={{ opacity: 0.8 }}>Loading matches…</div>}

          {matchesError && (
            <div style={{ padding: 10, borderRadius: 12, border: "1px solid #ffb3b3", background: "#fff5f5", marginBottom: 10 }}>
              <b>Matches error:</b> {matchesError}
            </div>
          )}

          {!matchesLoading && !matchesError && (
            <div style={{ width: "100%", maxWidth: 520 }}>
              <select value={matchId} onChange={(e) => setMatchId(e.target.value)} style={controlStyle}>
                <option value="">Select Match</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {niceMatchLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Match teams status */}
          {matchId && (
            <div style={{ marginTop: 10 }}>
              {matchTeamsLoading ? <div style={{ opacity: 0.8 }}>Loading teams for this match…</div> : null}

              {!matchTeamsLoading && matchTeamsError ? (
                <div style={{ marginTop: 6, padding: 10, borderRadius: 12, background: "#fff4cc", fontWeight: 800 }}>
                  {matchTeamsError}
                </div>
              ) : null}

              {!matchTeamsLoading && !matchTeamsError && matchTeams.length >= 6 ? (
                <div style={{ marginTop: 6 }}>
                  <div style={{ opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Teams in this match</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {matchTeams.map((t) => (
                      <span
                        key={`chip-${t}`}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(0,0,0,0.10)",
                          background: "#fafafa",
                          fontWeight: 900,
                          fontSize: 14,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* MAIN FORM + SAVE */}
      {eventId && template && (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: isNarrow ? "column" : "row",
              gap: 12,
              flexWrap: isNarrow ? "nowrap" : "wrap",
              marginBottom: 16,
              padding: isNarrow ? 12 : 14,
              border: "1px solid #eee",
              borderRadius: 14,
              background: "#fff",
            }}
          >
            {/* Team picker */}
            <div style={{ width: "100%", maxWidth: isNarrow ? "100%" : 280 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Team Number</div>

              {matchTeams.length >= 6 ? (
                <select
                  value={values.team_number ? String(values.team_number) : ""}
                  onChange={(e) => setValue("team_number", e.target.value ? Number(e.target.value) : "")}
                  style={{
                    ...controlStyle,
                    maxWidth: isNarrow ? "100%" : 280,
                  }}
                  disabled={!matchId}
                >
                  <option value="">{matchId ? "Select team from this match…" : "Select match first"}</option>
                  {matchTeams.map((t) => (
                    <option key={`team-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={values.team_number ?? ""}
                  onChange={(e) => setValue("team_number", Number(e.target.value))}
                  style={{
                    ...controlStyle,
                    maxWidth: isNarrow ? "100%" : 180,
                  }}
                  placeholder={matchId ? "Type team number…" : "Select match first"}
                  disabled={!matchId}
                />
              )}
            </div>

            {/* Notes */}
            <div style={{ width: "100%", maxWidth: isNarrow ? "100%" : 520 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes (optional)</div>
              <input
                value={values.notes ?? ""}
                onChange={(e) => setValue("notes", e.target.value)}
                style={{
                  ...controlStyle,
                  maxWidth: "100%",
                }}
                placeholder="Anything important after the match…"
              />
            </div>

            {/* Save */}
            <div style={{ alignSelf: isNarrow ? "stretch" : "flex-end" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  fontWeight: 950,
                  cursor: "pointer",
                  width: isNarrow ? "100%" : "auto",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            {saveMsg && (
              <div style={{ alignSelf: isNarrow ? "stretch" : "flex-end", fontWeight: 900, opacity: 0.9 }}>
                {saveMsg}
              </div>
            )}

            {offlineQueuedCount > 0 && (
              <div style={{ alignSelf: isNarrow ? "stretch" : "flex-end", fontWeight: 900, opacity: 0.7 }}>
                Offline queued: {offlineQueuedCount}
              </div>
            )}
          </div>

          {/* Full dynamic form */}
          <TemplateForm template={template} values={values} setValue={setValue} />
        </>
      )}
    </main>
  );
}
