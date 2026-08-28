import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...cors, "Content-Type": "application/json" };
const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.7-flash";
const DAILY_LIMIT = 20;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const systemInstruction = `You are G3 Assist, the technical assistant for FIRST Robotics Competition Team 6740.
Focus only on FRC: robot design, mechanisms, CAD, fabrication, electrical systems, pneumatics, WPILib, control systems, vision, scouting, strategy, inspection, safety, project execution, and FIRST rules.
Give practical, testable troubleshooting steps. State assumptions. Never invent rule numbers, specifications, wiring requirements, or source links. When an official FIRST rule may decide the answer, tell the user to verify the current official game manual.
Treat Chief Delphi as useful community experience, not an official authority. Clearly separate known facts, likely causes, and suggested tests.
Do not request, infer, expose, or analyze student identity, attendance, contact details, health, location history, private messages, or faces. If supplied content contains personal student data, stop and ask for a sanitized version.
For electrical or mechanical work, include an appropriate safety warning (power isolation, stored energy, eye protection, supervision) when relevant.
Respond in the language used by the user. Keep answers concise enough for workshop use, but include steps and code when useful.`;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function estimatedBase64Bytes(value: string) {
  const clean = value.replace(/\s/g, "");
  return Math.floor(clean.length * 0.75);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceKey || !geminiKey) return response({ error: "Assistant service is not configured." }, 503);
    if (!authorization?.startsWith("Bearer ")) return response({ error: "Sign in is required." }, 401);

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return response({ error: "Your session has expired. Sign in again." }, 401);
    const memberId = userData.user.id;
    const { data: member } = await admin.from("team_members").select("id,active,language").eq("id", memberId).maybeSingle();
    if (!member?.active) return response({ error: "Only active G3 members can use G3 Assist." }, 403);

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 6000) : "";
    const language = body.language === "he" ? "he" : "en";
    const requestedConversation = typeof body.conversationId === "string" ? body.conversationId : null;
    const attachmentKind = body.attachmentKind === "robot_photo" ? "robot_photo" : body.attachmentKind === "screenshot" ? "screenshot" : null;
    const image = body.image && typeof body.image === "object" ? body.image : null;
    if (!message && !image) return response({ error: "Write a question or attach an image." }, 400);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("ai_messages").select("id", { count: "exact", head: true }).eq("member_id", memberId).eq("role", "user").gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return response({ error: "Your daily G3 Assist limit has been reached. Try again after the rolling 24-hour window resets.", code: "DAILY_LIMIT" }, 429);

    let imagePart: Record<string, unknown> | null = null;
    let attachmentName: string | null = null;
    if (image) {
      const mimeType = ["image/jpeg", "image/png", "image/webp"].includes(String(image.mimeType)) ? String(image.mimeType) : "";
      const data = typeof image.data === "string" ? image.data.replace(/^data:[^;]+;base64,/, "") : "";
      attachmentName = typeof image.name === "string" ? image.name.slice(0, 160) : "image";
      if (!mimeType || !data || estimatedBase64Bytes(data) > MAX_IMAGE_BYTES) return response({ error: "Use a JPG, PNG, or WebP image smaller than 4 MB." }, 400);
      if (!body.privacyConfirmed || !attachmentKind) return response({ error: "Confirm that the image contains no people or personal student information." }, 400);
      imagePart = { inline_data: { mime_type: mimeType, data } };
    }

    let conversationId = requestedConversation;
    if (conversationId) {
      const { data: owned } = await admin.from("ai_conversations").select("id").eq("id", conversationId).eq("member_id", memberId).maybeSingle();
      if (!owned) return response({ error: "Conversation not found." }, 404);
    } else {
      const title = (message || (language === "he" ? "ניתוח תמונה" : "Image analysis")).slice(0, 80);
      const { data: created, error } = await admin.from("ai_conversations").insert({ member_id: memberId, title, language }).select("id").single();
      if (error) throw error;
      conversationId = created.id;
    }

    const { data: historyRows } = await admin.from("ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(10);
    const history = (historyRows ?? []).reverse().map((row) => ({ role: row.role === "assistant" ? "model" : "user", parts: [{ text: row.content }] }));
    const prompt = message || (language === "he" ? "נתח את התמונה הזו בהקשר של FRC." : "Analyze this image in an FRC context.");
    const userParts: Record<string, unknown>[] = [{ text: prompt }];
    if (imagePart) userParts.push(imagePart);

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [...history, { role: "user", parts: userParts }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1800 },
      }),
    });
    const payload = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      const providerMessage = payload?.error?.message || "Gemini is temporarily unavailable.";
      const quota = geminiResponse.status === 429;
      return response({ error: quota ? "The shared Gemini free allowance is temporarily exhausted. Please try again later." : providerMessage, code: quota ? "PROVIDER_QUOTA" : "PROVIDER_ERROR" }, quota ? 429 : 502);
    }
    const answer = (payload?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text || "").join("\n").trim();
    if (!answer) return response({ error: "Gemini did not return an answer. Try rephrasing the question." }, 502);
    const usage = payload?.usageMetadata ?? {};

    const { error: saveError } = await admin.from("ai_messages").insert([
      { conversation_id: conversationId, member_id: memberId, role: "user", content: prompt, attachment_name: attachmentName, attachment_kind: imagePart ? attachmentKind : null, input_tokens: Number(usage.promptTokenCount ?? 0), model: MODEL },
      { conversation_id: conversationId, member_id: memberId, role: "assistant", content: answer, output_tokens: Number(usage.candidatesTokenCount ?? 0), model: MODEL },
    ]);
    if (saveError) throw saveError;
    await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return response({ conversationId, answer, usage: { inputTokens: Number(usage.promptTokenCount ?? 0), outputTokens: Number(usage.candidatesTokenCount ?? 0), remainingToday: Math.max(0, DAILY_LIMIT - (count ?? 0) - 1) } });
  } catch (error) {
    console.error("frc-assistant", error);
    return response({ error: "G3 Assist could not complete the request. Please try again." }, 500);
  }
});
