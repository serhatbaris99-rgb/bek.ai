import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !openRouterKey) {
    return json({ error: "Backend secrets are not configured. Add Supabase and OpenRouter secrets to Edge Functions." }, 503);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Invalid or expired session." }, 401);

  let body: { messages?: Array<{ role: string; content: string }>; model?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 20) {
    return json({ error: "Send between 1 and 20 messages." }, 400);
  }
  const allowedRoles = new Set(["user", "assistant"]);
  const messages = body.messages.map((m) => {
    if (!m || !allowedRoles.has(m.role) || typeof m.content !== "string") throw new Error("Invalid message format.");
    return { role: m.role, content: m.content.slice(0, 12000) };
  });
  if (!messages.some((m) => m.role === "user")) return json({ error: "A user message is required." }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: quota, error: quotaError } = await admin.rpc("bekai_reserve_daily_message", {
    p_user_id: userData.user.id,
    p_limit: 20,
  });
  if (quotaError) return json({ error: "Could not check usage quota." }, 500);
  const quotaRow = Array.isArray(quota) ? quota[0] : quota;
  if (!quotaRow?.allowed) return json({ error: "Günlük ücretsiz 20 mesaj kotan doldu.", quota: quotaRow }, 429);

  const safeModel = "openrouter/free";
  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://serhatbaris99-rgb.github.io/bek.ai/",
        "X-Title": "BEK AI",
      },
      body: JSON.stringify({
        model: safeModel,
        messages: [
          { role: "system", content: "You are BEK AI. Answer in the user's language. Be accurate and honest. Never claim tools or integrations succeeded unless they did." },
          ...messages,
        ],
      }),
    });
    const payload = await upstream.json();
    if (!upstream.ok) return json({ error: payload?.error?.message || "AI provider request failed.", provider_status: upstream.status }, upstream.status === 429 ? 429 : 502);
    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return json({ error: "AI provider returned an empty response." }, 502);
    return json({ answer, model: payload?.model || safeModel, usage: quotaRow });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "AI request failed." }, 502);
  }
});
