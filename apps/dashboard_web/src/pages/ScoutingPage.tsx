import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import TemplateForm from "../components/TemplateForm";

type MatchRow = {
  id: string; // uuid
  event_id: string; // uuid
  match_number?: number | null;
  match_type?: string | null; // qual/qm/qf/sf/f
  set_number?: number | null;
  description?: string | null;
  key?: string | null;
};

type MatchTeamRow = {
  match_id: string;
  team_number: number;
  alliance?: string | null; // "red"/"blue" if view includes it
};

function niceMatchLabel(m: MatchRow) {
  if (m.description && m.description.trim().length > 0) return m.description;
  if (m.key && m.key.trim().length > 0) return m.key;

  const t = (m.match_type ?? "").toLowerCase();
  const num = m.match_number ?? null;
  const setNum = m.set_number ?? null;

  if (t && num != null) {
    // accept both "qm" and "qual" as qualification label
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

export default function ScoutingPage() {
  const isNarrow = useIsNarrow(600);

  // =====================
  // Event + Template
  // =====================
  const [eventId, setEventId] = useState<string>("");
  const [template, setTemplate] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string>("");

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

  const setValue = (id: string, value: any) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  // =====================
  // Load Template when event changes
  // =====================
  useEffect(() => {
    const loadTemplate = async () => {
      const cleanEventId = (eventId ?? "").trim();

      setTemplate(null);
      setTemplateError("");
      setSaveMsg("");

      if (!cleanEventId) return;

      setTemplateLoading(true);
      try {
        const { data, error } = await supabase
          .from("form_templates")
          .select("schema,created_at")
          .eq("event_id", cleanEventId)
          .order("created_at", { ascending: false })
          .limit(1);

        console.log("TEMPLATE QUERY RESULT:", { cleanEventId, data, error });

        if (error) {
          setTemplateError(error.message);
          return;
        }
        if (!data || data.length === 0) {
          setTemplateError("No template found for this event.");
          return;
        }

        setTemplate((data[0] as any).schema ?? null);
      } finally {
        setTemplateLoading(false);
      }
    };

    loadTemplate();
  }, [eventId]);

  // =====================
  // Load Matches when event changes
  // =====================
  useEffect(() => {
    const loadMatches = async () => {
      const cleanEventId = (eventId ?? "").trim();

      setMatches([]);
      setMatchesError("");
      setMatchId(""); // reset match selection when switching event

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
          .select("id,event_id,match_number,match_type")
          .eq("event_id", cleanEventId)
          .order("match_type", { ascending: true })
          .order("match_number", { ascending: true });

        if (error) {
          console.error("LOAD MATCHES ERROR:", error);
          setMatchesError(error.message);
          return;
        }

        setMatches((data as any[]) as MatchRow[]);
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

  // =====================
  // Load Match Teams when match changes
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
        // Preferred: view v_match_teams (match_id, team_number, alliance)
        const { data, error } = await supabase
          .from("v_match_teams")
          .select("match_id,team_number,alliance")
          .eq("match_id", matchId)
          .order("alliance", { ascending: true })
          .order("team_number", { ascending: true });

        if (error) {
          console.error("LOAD MATCH TEAMS ERROR:", error);
          setMatchTeamsError(
            `Could not load match teams (v_match_teams). You can still type team number manually. Error: ${error.message}`
          );
          setMatchTeams([]);
          return;
        }

        const nums = (data as MatchTeamRow[] | null | undefined) ?? [];
        const list = nums
          .map((x) => Number(x.team_number))
          .filter((n) => Number.isFinite(n));

        // unique + stable order
        const uniq = Array.from(new Set(list));
        setMatchTeams(uniq);
      } finally {
        setMatchTeamsLoading(false);
      }
    };

    loadMatchTeams();
  }, [matchId]);

  // Derived: whether we can enforce dropdown-only selection
  const hasMatchTeams = matchTeams.length >= 6; // normally exactly 6

  // =====================
  // Save entry to scout_entries
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
      // if we have matchTeams loaded, only allow choosing one of them.
      if (hasMatchTeams && !matchTeams.includes(teamNumber)) {
        setSaveMsg("הקבוצה שנבחרה לא נמצאת במשחק הזה. בחר קבוצה מתוך הרשימה.");
        return;
      }

      // persistent device id for future dedup/offline sync
      const deviceId =
        localStorage.getItem("g3_device_id") ??
        (() => {
          const id = crypto.randomUUID();
          localStorage.setItem("g3_device_id", id);
          return id;
        })();

      const { error } = await supabase.from("scout_entries").insert([
        {
          event_id: cleanEventId,
          match_id: matchId,
          team_number: teamNumber,
          scout_user_id: null, // login later
          device_id: deviceId,
          data: {
            ...values,
            match_id: matchId,
          },
          notes: values.notes ?? null,
        },
      ]);

      if (error) {
        console.error("SAVE ERROR:", error);
        setSaveMsg("Save failed: " + error.message);
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
              <select
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                style={controlStyle}
              >
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
                  Loaded {matchTeams.length} teams for this match (expected 6). You can still scout, but verify schedule data.
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
          </div>

          {/* Full dynamic form */}
          <TemplateForm template={template} values={values} setValue={setValue} />
        </>
      )}
    </div>
  );
}
