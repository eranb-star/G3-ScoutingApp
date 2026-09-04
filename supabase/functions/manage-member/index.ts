import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  action: "create" | "reset_password" | "set_active" | "update_profile";
  userId?: string;
  email?: string;
  displayName?: string;
  role?: "member" | "team_leader" | "mentor" | "admin";
  subteam?: string | null;
  subteams?: string[];
  leaderSubteams?: string[];
  temporaryPassword?: string;
  active?: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: caller, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProfile } = await admin.from("team_members").select("role,active").eq("id", caller.user.id).single();
    if (!callerProfile?.active || callerProfile.role !== "admin") return json({ error: "Administrator access required" }, 403);

    const body = await request.json() as RequestBody;
    if (body.action === "create") {
      if (!body.email || !body.displayName || !body.temporaryPassword) return json({ error: "Email, name and temporary password are required" }, 400);
      if (body.temporaryPassword.length < 10) return json({ error: "Temporary password must contain at least 10 characters" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email.trim().toLowerCase(),
        password: body.temporaryPassword,
        email_confirm: true,
      });
      if (error || !data.user) return json({ error: error?.message || "Could not create account" }, 400);
      const { error: profileError } = await admin.from("team_members").insert({
        id: data.user.id,
        email: body.email.trim().toLowerCase(),
        display_name: body.displayName.trim(),
        role: body.role ?? "member",
        subteam: body.subteams?.[0]?.trim() || body.subteam?.trim() || null,
        subteams: (body.subteams??[]).map(item=>item.trim()).filter(Boolean),
        leader_subteams: body.role==="team_leader"?(body.leaderSubteams??[]).map(item=>item.trim()).filter(Boolean):[],
        must_change_password: true,
        created_by: caller.user.id,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: profileError.message }, 400);
      }
      return json({ userId: data.user.id });
    }

    if (!body.userId) return json({ error: "Member ID is required" }, 400);
    if (body.action === "reset_password") {
      if (!body.temporaryPassword || body.temporaryPassword.length < 10) return json({ error: "Temporary password must contain at least 10 characters" }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.userId, { password: body.temporaryPassword });
      if (error) return json({ error: error.message }, 400);
      await admin.from("team_members").update({ must_change_password: true, updated_at: new Date().toISOString() }).eq("id", body.userId);
      return json({ ok: true });
    }
    if (body.action === "set_active") {
      if (typeof body.active !== "boolean") return json({ error: "Active status is required" }, 400);
      if (body.userId === caller.user.id && !body.active) return json({ error: "You cannot deactivate your own account" }, 400);
      const { error } = await admin.from("team_members").update({ active: body.active, updated_at: new Date().toISOString() }).eq("id", body.userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    if (body.action === "update_profile") {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.displayName) update.display_name = body.displayName.trim();
      if (body.role) update.role = body.role;
      if (body.subteam !== undefined) update.subteam = body.subteam?.trim() || null;
      if (body.subteams !== undefined) {
        const subteams=body.subteams.map(item=>item.trim()).filter(Boolean);
        update.subteams=subteams;
        update.subteam=subteams[0]??null;
      }
      if (body.leaderSubteams !== undefined) update.leader_subteams=body.role==="team_leader"?body.leaderSubteams.map(item=>item.trim()).filter(Boolean):[];
      const { error } = await admin.from("team_members").update(update).eq("id", body.userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
