import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FirebaseServiceAccount = {
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeTeam=(value:unknown)=>{
  const text=String(value??"").trim().toLowerCase();
  if(["mechanical","mech"].includes(text))return "mechanical";
  if(["cad","cad & design","design"].includes(text))return "cad";
  if(["electrical","electronics","elec"].includes(text))return "electrical";
  if(["software","code","programming"].includes(text))return "software";
  if(["strategy","strategy & scouting","scouting"].includes(text))return "strategy";
  if(["field","field build","field build & infrastructure"].includes(text))return "field";
  if(["pit","drive & pit","drive team"].includes(text))return "pit";
  if(["business","business & outreach","outreach"].includes(text))return "business";
  if(["publicity","publicity & awards","judging","awards"].includes(text))return "publicity";
  return text;
};

const base64Url = (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

async function firebaseAccessToken(account: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const keyBytes = Uint8Array.from(
    atob(account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")),
    (char) => char.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("Firebase authentication failed");
  const payload = await response.json();
  return payload.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const internalRequest = Boolean(cronSecret && req.headers.get("x-cron-secret") === cronSecret);
    if (!authorization && !internalRequest) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    let callerRole="";
    let callerLeaderTeams:string[]=[];
    if (!internalRequest) {
      const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization! } } });
      const { data: { user }, error: userError } = await callerClient.auth.getUser();
      if (userError || !user) return json({ error: "Invalid session" }, 401);
      const { data: caller }=await admin.from("team_members").select("role,active,leader_subteams").eq("id",user.id).single();
      const {data:grant}=caller?await admin.from("role_permissions").select("allowed").eq("role",caller.role).eq("permission_key","create_announcements").maybeSingle():{data:null};
      if (!caller?.active || (caller.role!=="admin"&&!grant?.allowed)) return json({ error: "Announcement permission required" }, 403);
      callerRole=caller.role;
      callerLeaderTeams=caller.leader_subteams??[];
    }

    const { announcementId } = await req.json();
    if (!announcementId || typeof announcementId !== "string") return json({ error: "announcementId is required" }, 400);

    const { data: announcement, error: announcementError } = await admin
      .from("announcements")
      .select("id,title,body,audience,audience_subteam,meeting_id,priority,archived,expires_at")
      .eq("id", announcementId)
      .single();
    if (announcementError || !announcement || announcement.archived) return json({ error: "Announcement not found" }, 404);
    if (announcement.expires_at && new Date(announcement.expires_at) <= new Date()) return json({ error: "Announcement has expired" }, 409);
    if(!internalRequest&&callerRole==="team_leader"&&(
      announcement.audience!=="subteam"||
      !callerLeaderTeams.some(team=>normalizeTeam(team)===normalizeTeam(announcement.audience_subteam))
    ))return json({error:"Team leaders may notify only departments they lead"},403);

    let membersQuery = admin.from("team_members").select("id,subteam,subteams").eq("active", true);
    if (announcement.audience === "members") membersQuery = membersQuery.in("role", ["member","team_leader"]);
    if (announcement.audience === "mentors") membersQuery = membersQuery.eq("role", "mentor");
    if (announcement.audience === "admins") membersQuery = membersQuery.eq("role", "admin");
    const { data: members, error: membersError } = await membersQuery;
    if (membersError) throw membersError;
    const target=normalizeTeam(announcement.audience_subteam);
    const memberIds = (members ?? []).filter(member=>announcement.audience!=="subteam"||[...(member.subteams??[]),member.subteam].some(team=>normalizeTeam(team)===target)).map((member) => member.id);
    if (memberIds.length === 0) return json({ delivered: 0, failed: 0, recipients: 0 });

    const { data: tokenRows, error: tokenError } = await admin
      .from("push_tokens")
      .select("token,member_id")
      .eq("active", true)
      .in("member_id", memberIds);
    if (tokenError) throw tokenError;
    if (!tokenRows?.length) return json({ delivered: 0, failed: 0, recipients: memberIds.length });

    const { data: preferenceRows } = await admin.from("notification_preferences").select("member_id,announcements,private_previews").in("member_id", memberIds);
    const preferences = new Map((preferenceRows ?? []).map((row) => [row.member_id, row]));
    const eligibleTokens = tokenRows.filter((row) => preferences.get(row.member_id)?.announcements !== false);
    if (!eligibleTokens.length) return json({ delivered: 0, failed: 0, recipients: memberIds.length });
    const rawCredential = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!rawCredential) throw new Error("Firebase service credential is not configured");
    const account = JSON.parse(rawCredential) as FirebaseServiceAccount;
    const accessToken = await firebaseAccessToken(account);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
    const results = await Promise.all(eligibleTokens.map(async ({ token, member_id }) => {
      const hidePreview = preferences.get(member_id)?.private_previews === true;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: {
          token,
          notification: { title: hidePreview ? "New G3 Team Hub update" : announcement.title, body: hidePreview ? "Open the app to view it." : announcement.body },
          android: { priority: announcement.priority === "urgent" ? "HIGH" : "NORMAL" },
          data: {
            path: `/updates?view=announcements&announcement=${announcement.id}`,
            announcementId: announcement.id,
            meetingId: announcement.meeting_id ?? "",
            priority: announcement.priority,
          },
        } }),
      });
      if (response.ok) return true;
      const failure = await response.text();
      if (response.status === 404 || failure.includes("UNREGISTERED")) {
        await admin.from("push_tokens").update({ active: false, updated_at: new Date().toISOString() }).eq("token", token);
      }
      return false;
    }));

    const delivered = results.filter(Boolean).length;
    return json({ delivered, failed: results.length - delivered, recipients: memberIds.length });
  } catch (error) {
    console.error("Push delivery failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Push delivery failed" }, 500);
  }
});
