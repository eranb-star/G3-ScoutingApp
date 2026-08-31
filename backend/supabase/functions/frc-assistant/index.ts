import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...cors, "Content-Type": "application/json" };
const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const DAILY_LIMIT = 20;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const systemInstruction = `You are G3 Assist, the technical assistant for FIRST Robotics Competition Team 6740.
Focus only on FRC: robot design, mechanisms, CAD, fabrication, electrical systems, pneumatics, WPILib, control systems, vision, scouting, strategy, inspection, safety, project execution, and FIRST rules.
Give practical, testable troubleshooting steps. State assumptions. Never invent rule numbers, specifications, wiring requirements, or source links. When an official FIRST rule may decide the answer, tell the user to verify the current official game manual.
For robot photos, inspect only visible evidence: identify the component or mechanism when reasonably possible, describe visible damage, alignment, interference, wiring, connector or assembly concerns, and separate observations from hypotheses. Never claim that a safety-critical robot is safe based on a photograph alone.
For code or log screenshots, transcribe only clearly readable text, identify the likely subsystem and error category, propose the smallest diagnostic sequence, and request raw text when the screenshot is incomplete. For every diagnosis, format the answer as: Observed evidence, Likely causes, Safe tests, Recommended next action, and Verification criteria.
When an attachment is ambiguous, say what additional angle, measurement, log section or reproduction step is required. Do not identify people or infer personal attributes.
Treat Chief Delphi as useful community experience, not an official authority. Clearly separate known facts, likely causes, and suggested tests.
When web search is useful, prioritize primary FRC sources: firstinspires.org and official FIRST documentation, docs.wpilib.org, revrobotics.com documentation, and CTRE/Phoenix documentation. Use Chief Delphi only as community experience. Cite every web-derived technical claim with the source URL supplied by the search tool. Never invent a citation.
When G3 internal knowledge or a previous resolved robot issue is provided, label it as internal team experience and do not treat it as an official rule or specification.
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

function isTransientProviderFailure(status: number, message: string) {
  return status === 408 || status === 429 || status >= 500 || /high demand|overload|capacity|temporar/i.test(message);
}

function retryDelay(attempt: number) {
  return 700 * 2 ** attempt + Math.floor(Math.random() * 350);
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
    const contextIssueId = typeof body.contextIssueId === "string" ? body.contextIssueId : null;
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
      imagePart = { type: "image", mime_type: mimeType, data };
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

    const [{ data: historyRows },{data:knowledgeRows},{data:resolvedIssues},{data:contextIssue}]=await Promise.all([
      admin.from("ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(10),
      admin.from("frc_knowledge_articles").select("title,summary,content,subsystem,source_type,source_url,verified").eq("archived",false).order("verified",{ascending:false}).order("updated_at",{ascending:false}).limit(8),
      admin.from("robot_issues").select("issue_number,title,description,subsystem,resolution").eq("status","resolved").eq("archived",false).not("resolution","is",null).order("updated_at",{ascending:false}).limit(6),
      contextIssueId?admin.from("robot_issues").select("issue_number,title,description,subsystem,severity,status,resolution").eq("id",contextIssueId).maybeSingle():Promise.resolve({data:null})
    ]);
    const history = (historyRows ?? []).reverse().map((row) => `${row.role === "assistant" ? "G3 Assist" : "Team member"}: ${row.content}`).join("\n\n");
    const prompt = message || (language === "he" ? "נתח את התמונה הזו בהקשר של FRC." : "Analyze this image in an FRC context.");
    const internalKnowledge=(knowledgeRows??[]).map((row,index)=>`K${index+1}. [${row.subsystem}] ${row.title}${row.verified?" (mentor/admin verified)":""}: ${row.summary||row.content.slice(0,700)}${row.source_url?` Source: ${row.source_url}`:""}`).join("\n");
    const issueHistory=(resolvedIssues??[]).map(row=>`G3-${row.issue_number} [${row.subsystem}] ${row.title}: ${row.description}\nResolution: ${row.resolution}`).join("\n\n");
    const activeIssue=contextIssue?`ACTIVE ROBOT ISSUE G3-${contextIssue.issue_number} [${contextIssue.subsystem}/${contextIssue.severity}/${contextIssue.status}]\n${contextIssue.title}\n${contextIssue.description}\nCurrent resolution: ${contextIssue.resolution||"none"}`:"(none)";
    const contextualPrompt = `Conversation so far:\n${history || "(none)"}\n\nActive issue context:\n${activeIssue}\n\nG3 internal knowledge candidates (use only if relevant):\n${internalKnowledge||"(none)"}\n\nRecent resolved G3 issues (use only if relevant):\n${issueHistory||"(none)"}\n\nCurrent team-member request:\n${prompt}`;
    const interactionInput: Record<string, unknown>[] = [];
    if (imagePart) interactionInput.push(imagePart);
    interactionInput.push({ type: "text", text: contextualPrompt });

    let payload: any = null;
    let usedModel = MODEL;
    let lastStatus = 503;
    let providerMessage = "Gemini is temporarily unavailable.";
    for (const model of [...new Set([MODEL, ...FALLBACK_MODELS])]) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const requestBody: Record<string, unknown> = { model, input: interactionInput, system_instruction: systemInstruction, generation_config: { max_output_tokens: 3000 }, store: false };
        if (!imagePart) requestBody.tools = [{type:"google_search",search_types:["web_search"]}];
        const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
          body: JSON.stringify(requestBody),
        });
        const candidatePayload: any = await geminiResponse.json().catch(() => ({}));
        if (geminiResponse.ok) { payload = candidatePayload; usedModel = model; break; }
        lastStatus = geminiResponse.status;
        providerMessage = candidatePayload?.error?.message || candidatePayload?.message || (typeof candidatePayload?.error === "string" ? candidatePayload.error : providerMessage);
        console.error("Gemini Interactions request failed", { status: lastStatus, model, attempt, message: providerMessage });
        if (!isTransientProviderFailure(lastStatus, providerMessage)) break;
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
      }
      if (payload || !isTransientProviderFailure(lastStatus, providerMessage)) break;
    }
    if (!payload) {
      const capacityFailure = isTransientProviderFailure(lastStatus, providerMessage);
      return response({ error: capacityFailure ? "G3 Assist is temporarily at capacity. Please try again shortly." : providerMessage, code: capacityFailure ? "PROVIDER_CAPACITY" : "PROVIDER_ERROR" }, capacityFailure ? 503 : 502);
    }
    const modelSteps=(payload?.steps ?? []).filter((step:{type?:string})=>step.type==="model_output");
    const outputBlocks=modelSteps.flatMap((step:{content?:any[]})=>step.content??[]);
    const answer = (typeof payload?.output_text === "string" ? payload.output_text : outputBlocks
      .filter((content: { type?: string }) => content.type === "text")
      .map((content: { text?: string }) => content.text || "")
      .join("\n"))
      .trim();
    const citations=Array.from(new Map(outputBlocks.flatMap((content:any)=>content.annotations??[]).filter((item:any)=>item.type==="url_citation"&&item.url).map((item:any)=>[item.url,{url:item.url,title:item.title||String(item.url).replace(/^https?:\/\//,"").split("/")[0]}])).values()).slice(0,12);
    if (!answer) return response({ error: "Gemini did not return an answer. Try rephrasing the question." }, 502);
    const usage = payload?.usage ?? {};

    const storedAnswer = answer.slice(0, 19500);
    const { error: saveError } = await admin.from("ai_messages").insert([
      { conversation_id: conversationId, member_id: memberId, role: "user", content: prompt, attachment_name: attachmentName, attachment_kind: imagePart ? attachmentKind : null, context_issue_id:contextIssueId, input_tokens: Number(usage.total_input_tokens ?? 0), output_tokens: 0, model: usedModel },
      { conversation_id: conversationId, member_id: memberId, role: "assistant", content: storedAnswer, citations, context_issue_id:contextIssueId, input_tokens: 0, output_tokens: Number(usage.total_output_tokens ?? 0), model: usedModel },
    ]);
    if (saveError) console.error("G3 Assist history save failed", { code: saveError.code, message: saveError.message });
    else await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return response({ conversationId, answer, citations, grounded:Boolean(citations.length), usage: { inputTokens: Number(usage.total_input_tokens ?? 0), outputTokens: Number(usage.total_output_tokens ?? 0), remainingToday: Math.max(0, DAILY_LIMIT - (count ?? 0) - 1) } });
  } catch (error) {
    console.error("frc-assistant", error);
    return response({ error: "G3 Assist could not complete the request. Please try again." }, 500);
  }
});
