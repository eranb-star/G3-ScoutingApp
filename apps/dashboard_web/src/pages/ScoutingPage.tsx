// apps/dashboard_web/src/pages/ScoutingPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";
import TemplateForm from "../components/TemplateForm";
import {
  enqueueScoutEntry,
  getQueuedScoutEntryCount,
  cacheTemplate,
  getCachedTemplate,
  cacheMatches,
  getCachedMatches,
  cacheMatchTeams,
  getCachedMatchTeams,
  listQueuedScoutEntries,
  removeQueuedScoutEntry,
} from "../lib/offlineDb";

type MatchRow = {
  id: string; // uuid
  event_id: string; // uuid
  match_number?: number | null;
  match_type?: string | null; // qual/qm/qf/sf/f
  set_number?: number | null;

  // NOTE: matches table in your DB does NOT have "description".
  // Keep it optional for forward-compat (or cached data), but do NOT select it from DB.
  description?: string | null;

  // legacy compatibility field (some UI code used "key")
  key?: string | null;

  // actual column in your DB: matches.match_key
  match_key?: string | null; // matches.match_key

  // Needed for pre-caching match teams for complete offline (even if match not opened before)
  red_teams?: number[] | null;
  blue_teams?: number[] | null;
};

type MatchTeamRow = {
  match_id: string;
  team_number: number;
  alliance?: string | null; // "red"/"blue" if view includes it
};

// ---- Scouter list types ----
type ScouterRow = {
  id?: string | null; // optional uuid if your table has it
  display_name?: string | null;
  name?: string | null; // fallback
  event_id?: string | null;
  is_active?: boolean | null;
};

function niceMatchLabel(m: MatchRow) {
  if (m.description && m.description.trim().length > 0) return m.description;

  // Prefer the real DB column:
  if ((m.match_key ?? "").trim().length > 0) return String(m.match_key);

  // Fallback (legacy / cached)
  if (m.key && m.key.trim().length > 0) return m.key;

  const t = (m.match_type ?? "").toLowerCase();
  const num = m.match_number ?? null;
  const setNum = m.set_number ?? null;

  if (t && num != null) {
    const prefix =
      t === "qual" || t === "qm"
        ? "Qual"
        : t === "qf"
        ? "QF"
        : t === "sf"
        ? "SF"
        : t === "f"
        ? "Final"
        : t.toUpperCase();

    if (setNum != null && setNum > 0 && (t === "qf" || t === "sf" || t === "f")) {
      return `${prefix} ${setNum}-${num}`;
    }
    return `${prefix} ${num}`;
  }

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

  // =====================
  // Event + Template
  // =====================
  const [eventId, setEventId] = useState<string>("");
  const [template, setTemplate] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string>("");

  // soft offline info banner (no red errors when cache works)
  const [offlineInfo, setOfflineInfo] = useState<string>("");

  // =====================
  // Matches for Event
  // =====================
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string>("");

  // Selected match
  const [matchId, setMatchId] = useState<string>("");

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

  // -------------------------
  // Scouters (from Supabase)
  // -------------------------
  const [scouters, setScouters] = useState<ScouterRow[]>([]);
  const [scoutersLoading, setScoutersLoading] = useState(false);
  const [scoutersError, setScoutersError] = useState<string>("");

  // Locked scouter (device-based)
  const [lockedScouterName, setLockedScouterName] = useState<string>("");
  const [lockedScouterId, setLockedScouterId] = useState<string>("");

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

            if (offlineLikelyFromErrorMessage(msg)) {
              break;
            }
            continue;
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
          setOfflineInfo((prev) => (prev ? prev : `Synced ${sent} offline entries ✅`));
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

  useEffect(() => {
    // If sync emptied the queue, clear the stale "Saved offline..." message
    if (offlineQueuedCount === 0) {
      setSaveMsg((prev) => {
        if (!prev) return prev;
        return /saved offline/i.test(prev) ? "" : prev;
      });
    }
  }, [offlineQueuedCount]);

  // =====================
  // Device ID
  // =====================
  const deviceId =
    localStorage.getItem("g3_device_id") ??
    (() => {
      const id = crypto.randomUUID();
      localStorage.setItem("g3_device_id", id);
      return id;
    })();

  // =====================
  // Load locked scouter from device
  // =====================
  useEffect(() => {
    const name = (localStorage.getItem("g3_scouter_name") ?? "").trim();
    const id = (localStorage.getItem("g3_scouter_id") ?? "").trim();
    setLockedScouterName(name);
    setLockedScouterId(id);
  }, []);

  // =====================
  // Load scouters list (Supabase) for event
  // =====================
  useEffect(() => {
    const loadScouters = async () => {
      setScouters([]);
      setScoutersError("");
      if (!eventId) return;

      setScoutersLoading(true);
      try {
        const cleanEventId = (eventId ?? "").trim();
        if (!cleanEventId) return;

        // Try common table names (keep your existing logic)
        const candidates = [
          { table: "event_scouts", nameCol: "display_name" },
          { table: "event_scouts", nameCol: "name" },
        ] as const;

        let found: ScouterRow[] = [];
        let lastErr = "";

        for (const c of candidates) {
          const { data, error } = await supabase
            .from(c.table)
            .select(`id,${c.nameCol},event_id,is_active`)
            .eq("event_id", cleanEventId)
            .order(c.nameCol, { ascending: true });

          if (error) {
            lastErr = error.message ?? String(error);
            continue;
          }

          if (Array.isArray(data)) {
            found = data as any[];
            break;
          }
        }

        if (!found.length && lastErr) {
          if (offlineLikelyFromErrorMessage(lastErr)) {
            // no hard error – just show empty list offline
            setScouters([]);
            return;
          }
          setScoutersError(lastErr);
          return;
        }

        setScouters(found);
      } finally {
        setScoutersLoading(false);
      }
    };

    loadScouters();
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
          // ✅ FIX: remove "description" (column does not exist)
          .select("id,event_id,match_number,match_type,red_teams,blue_teams,match_key")
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

        const rowsRaw = ((data as any[]) ?? []) as any[];
        const rows = rowsRaw.map((r) => ({
          ...r,
          // keep compatibility: some UI expects "key"
          key: r.key ?? r.match_key ?? null,
        })) as MatchRow[];

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
            const combined = [...red, ...blue]
              .map((x) => Number(x))
              .filter((n) => Number.isFinite(n) && n > 0);
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

  const selectedMatchLabel = useMemo(() => {
    const m = matches.find((x) => x.id === matchId);
    return m ? niceMatchLabel(m) : "";
  }, [matches, matchId]);

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
          scouter_name: lockedScouterName || null,
          scouter_id: lockedScouterId || null,
        },
        notes: values.notes ?? null,
      };

      // upsert idempotently (no duplicates if retried)
      const { error } = await supabase
        .from("scout_entries")
        .upsert([row], { onConflict: "entry_uuid", ignoreDuplicates: true });

      if (error) {
        const msg = error.message ?? String(error);

        if (offlineLikelyFromErrorMessage(msg)) {
          try {
            await enqueueScoutEntry(row as any);
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
    <div style={{ padding: isNarrow ? 10 : 16, maxWidth: 1020 }}>
      <h1 style={{ marginBottom: 6 }}>Scouting</h1>

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
            <option value="f34e67ec-bac9-433e-a97a-1e295aef8f30">ISR District Event #1</option>
            <option value="9fa31339-9f79-4d5b-9272-934b15d098d6">ISR District Event #2</option>
            <option value="948f95ba-2935-4c5d-860b-6c90429a66c3">ISR District Event #3</option>
            <option value="773deb87-bbfe-41d9-9537-7fd201f8998c">ISR District Event #4</option>
          </select>
        </div>
      </div>

      {!eventId && <div style={{ opacity: 0.8 }}>בחר Event כדי לטעון טופס ומאצ׳ים.</div>}

      {/* SCOUTER PICKER (locked per device) */}
      {eventId ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Scout name</div>

          {lockedScouterName ? (
            <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
              Locked to: <b>{lockedScouterName}</b>
              <div style={{ marginTop: 6, opacity: 0.7, fontWeight: 800 }}>Device ID: {deviceId.slice(0, 8)}…</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
              {scoutersLoading ? <div style={{ opacity: 0.75 }}>Loading names…</div> : null}
              {scoutersError ? (
                <div style={{ padding: 10, borderRadius: 12, background: "#fff5f5", border: "1px solid #ffb3b3" }}>
                  <b>Scouters error:</b> {scoutersError}
                </div>
              ) : null}

              <select
                style={controlStyle}
                value={lockedScouterId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const row = scouters.find((s) => String((s as any).id ?? "") === id);
                  const name = (row?.display_name ?? row?.name ?? "").trim();

                  if (!id || !name) return;

                  localStorage.setItem("g3_scouter_id", id);
                  localStorage.setItem("g3_scouter_name", name);
                  setLockedScouterId(id);
                  setLockedScouterName(name);
                }}
              >
                <option value="">Select your name…</option>
                {scouters
                  .filter((s) => (s.is_active ?? true) !== false)
                  .map((s, idx) => {
                    const id = String((s as any).id ?? `row-${idx}`);
                    const name = (s.display_name ?? s.name ?? "").trim();
                    if (!name) return null;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
              </select>

              <div style={{ opacity: 0.7, fontWeight: 800 }}>
                (Once selected, it locks to this device. Mentors/Admin can still log in separately.)
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* TEMPLATE STATUS */}
      {eventId && templateLoading && <div style={{ opacity: 0.8 }}>Loading template…</div>}
      {eventId && templateError && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ffb3b3",
            background: "#fff5f5",
          }}
        >
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
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid #ffb3b3",
                background: "#fff5f5",
                marginBottom: 10,
              }}
            >
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

              {!matchTeamsLoading && !matchTeamsError && hasMatchTeams ? (
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

              {!matchTeamsLoading && !matchTeamsError && matchTeams.length > 0 && !hasMatchTeams ? (
                <div style={{ marginTop: 6, padding: 10, borderRadius: 12, background: "#fff4cc", fontWeight: 800 }}>
                  Loaded {matchTeams.length} teams for this match (expected 6). You can still scout, but verify schedule
                  data.
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

              {hasMatchTeams ? (
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
    </div>
  );
}
