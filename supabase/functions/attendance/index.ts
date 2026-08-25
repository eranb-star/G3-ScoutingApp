import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return response({ error: "Authentication required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return response({ error: "Invalid session" }, 401);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: member } = await admin.from("team_members").select("id,active,must_change_password").eq("id", auth.user.id).single();
    if (!member?.active || member.must_change_password) return response({ error: "Active member access required" }, 403);

    const body = await request.json() as { action: "open_workshop" | "check_in" | "check_out"; meetingId?: string; verification?: "location" | "wifi"; latitude?: number; longitude?: number; accuracy?: number; ssid?: string };
    let method: "location" | "trusted_wifi" = "location";
    let distance: number | null = null;
    let accuracy: number | null = null;
    if (body.verification === "wifi") {
      const ssid = body.ssid?.trim();
      if (!ssid) return response({ error: "Connected Wi-Fi could not be identified" }, 400);
      const { data: trusted } = await admin.from("trusted_wifi_networks").select("id").eq("ssid", ssid).eq("active", true).maybeSingle();
      if (!trusted) return response({ error: "Connect to the trusted workshop Wi-Fi and try again" }, 403);
      method = "trusted_wifi";
    } else {
      if (![body.latitude, body.longitude, body.accuracy].every(Number.isFinite)) return response({ error: "A valid location reading is required" }, 400);
      if (body.accuracy! > 150) return response({ error: "Location accuracy is too low. Move near a window and try again." }, 400);
      const { data: workshop } = await admin.from("workshop_locations").select("latitude,longitude,radius_m").eq("active", true).single();
      if (!workshop) return response({ error: "Workshop location has not been configured" }, 503);
      distance = Math.round(distanceMetres(body.latitude!, body.longitude!, workshop.latitude, workshop.longitude));
      if (distance > workshop.radius_m) return response({ error: `Check-in is available only within the Shvilim High School perimeter. You are approximately ${distance} metres from the workshop; move within ${workshop.radius_m} metres and try again.`, code: "OUTSIDE_WORKSHOP_RADIUS", distanceMetres: distance, allowedRadiusMetres: workshop.radius_m }, 403);
      accuracy = Math.round(body.accuracy!);
    }

    if (body.action === "open_workshop") {
      const nowIso = new Date().toISOString();
      const { data: existing } = await admin.from("team_meetings").select("id,title,starts_at,ends_at,status,meeting_type").eq("status", "open").lte("starts_at", nowIso).gte("ends_at", nowIso).order("opened_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) return response({ meeting: existing, alreadyOpen: true });
      const now = new Date();
      const israelDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
      const { data, error } = await admin.from("team_meetings").insert({
        meeting_date: israelDate,
        title: "Member-opened workshop",
        starts_at: now.toISOString(),
        ends_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        status: "open",
        meeting_type: "workshop",
        is_ad_hoc: true,
        created_by: auth.user.id,
        opened_by: auth.user.id,
        opened_at: now.toISOString(),
      }).select("id,title,starts_at,ends_at,status,meeting_type").single();
      if (error) return response({ error: error.message }, 400);
      return response({ meeting: data, verificationMethod: method, distanceMetres: distance });
    }

    if (!body.meetingId) return response({ error: "Meeting ID is required" }, 400);
    const { data: meeting } = await admin.from("team_meetings").select("id,status").eq("id", body.meetingId).single();
    if (!meeting || meeting.status !== "open") return response({ error: "This meeting is not open for attendance" }, 400);

    if (body.action === "check_in") {
      const { data: existing } = await admin.from("attendance_records").select("id,checked_out_at").eq("meeting_id", body.meetingId).eq("member_id", auth.user.id).maybeSingle();
      if (existing) return response({ error: existing.checked_out_at ? "Attendance has already been completed for this meeting" : "You are already checked in" }, 409);
      const { data, error } = await admin.from("attendance_records").insert({ meeting_id: body.meetingId, member_id: auth.user.id, check_in_method: method, check_in_distance_m: distance, check_in_accuracy_m: accuracy }).select("id,checked_in_at").single();
      if (error) return response({ error: error.message }, 400);
      return response({ attendance: data, distanceMetres: distance });
    }
    if (body.action === "check_out") {
      const { data, error } = await admin.from("attendance_records").update({ checked_out_at: new Date().toISOString(), check_out_method: method, check_out_distance_m: distance, check_out_accuracy_m: accuracy, updated_at: new Date().toISOString() }).eq("meeting_id", body.meetingId).eq("member_id", auth.user.id).is("checked_out_at", null).select("id,checked_in_at,checked_out_at").maybeSingle();
      if (error) return response({ error: error.message }, 400);
      if (!data) return response({ error: "No active check-in was found" }, 404);
      return response({ attendance: data, distanceMetres: distance });
    }
    return response({ error: "Unsupported action" }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
