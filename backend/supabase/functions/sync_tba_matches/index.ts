import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  event_id?: string;
  replace?: boolean;
};

type TbaMatch = {
  key?: string;
  comp_level?: string;
  match_number?: number;
  time?: number | null;
  predicted_time?: number | null;
  actual_time?: number | null;
  alliances?: {
    red?: { team_keys?: string[]; score?: number };
    blue?: { team_keys?: string[]; score?: number };
  };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function teamNumbers(keys: string[] | undefined) {
  return (keys ?? [])
    .map((key) => Number(key.replace(/^frc/i, "")))
    .filter((team) => Number.isInteger(team) && team > 0);
}

function scheduledTime(match: TbaMatch) {
  const seconds = match.predicted_time ?? match.time ?? match.actual_time;
  return typeof seconds === "number" && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const tbaKey = Deno.env.get("TBA_AUTH_KEY");
    if (!url || !anonKey || !serviceKey || !tbaKey) {
      console.error("sync_tba_matches is missing required server configuration");
      return json({ error: "Match sync is not configured" }, 503);
    }

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: caller, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [{ data: member }, { data: legacyAdmin }] = await Promise.all([
      admin.from("team_members").select("role,active").eq("id", caller.user.id).maybeSingle(),
      admin.from("app_admins").select("user_id").eq("user_id", caller.user.id).maybeSingle(),
    ]);
    if (!(member?.active && member.role === "admin") && !legacyAdmin) {
      return json({ error: "Administrator access required" }, 403);
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const eventId = body.event_id?.trim();
    if (!eventId) return json({ error: "event_id is required" }, 400);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id,tba_event_key")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError) return json({ error: "Could not load the event" }, 500);
    if (!event) return json({ error: "Event not found" }, 404);
    if (!event.tba_event_key) return json({ error: "This event has no TBA event key" }, 400);

    const tbaResponse = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(event.tba_event_key)}/matches/simple`,
      {
        headers: {
          "X-TBA-Auth-Key": tbaKey,
          "User-Agent": "G3-6740-Team-Hub/1.0 (+https://github.com/eranb-star/G3-ScoutingApp)",
          Accept: "application/json",
        },
      },
    );
    if (!tbaResponse.ok) {
      console.error(`TBA match request failed with ${tbaResponse.status}`);
      return json({ error: "The Blue Alliance could not provide this event's matches" }, 502);
    }

    const payload = (await tbaResponse.json()) as TbaMatch[];
    const qualificationMatches = payload
      .filter((match): match is TbaMatch & { match_number: number } =>
        match.comp_level === "qm" &&
        typeof match.match_number === "number" &&
        Number.isInteger(match.match_number)
      )
      .map((match) => ({
        event_id: eventId,
        match_key: match.key ?? `${event.tba_event_key}_qm${match.match_number}`,
        match_type: "qm",
        match_number: match.match_number,
        scheduled_time: scheduledTime(match),
        red_teams: teamNumbers(match.alliances?.red?.team_keys),
        blue_teams: teamNumbers(match.alliances?.blue?.team_keys),
        result: {
          red_score: match.alliances?.red?.score ?? null,
          blue_score: match.alliances?.blue?.score ?? null,
          tba_key: match.key ?? null,
        },
      }))
      .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));

    if (body.replace) {
      const { error: deleteError } = await admin
        .from("matches")
        .delete()
        .eq("event_id", eventId)
        .eq("match_type", "qm");
      if (deleteError) return json({ error: `Could not replace matches: ${deleteError.message}` }, 500);
    }

    if (qualificationMatches.length) {
      const { error: upsertError } = await admin
        .from("matches")
        .upsert(qualificationMatches, { onConflict: "event_id,match_type,match_number" });
      if (upsertError) return json({ error: `Could not save matches: ${upsertError.message}` }, 500);
    }

    return json({
      ok: true,
      event_id: eventId,
      tba_event_key: event.tba_event_key,
      qm_count: qualificationMatches.length,
      mode: body.replace ? "replace" : "upsert",
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unexpected match-sync failure");
    return json({ error: "Could not synchronize matches" }, 500);
  }
});
