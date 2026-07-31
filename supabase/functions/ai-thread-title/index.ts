// Генерация короткого осмысленного заголовка треда по первой паре сообщений.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://platebox.kz",
  "https://www.platebox.kz",
  "http://localhost:5173",
  "http://localhost:8080",
]);
function cors(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const API_URL = Deno.env.get("AI_API_URL") ?? "https://api.openai.com/v1/chat/completions";
const MODEL = Deno.env.get("AI_MODEL");

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims, error: ce } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (ce || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    }
    const userId = String(claims.claims.sub);
    const body = await req.json().catch(() => ({}));
    const threadId = String(body?.thread_id ?? "");
    if (!threadId) return new Response(JSON.stringify({ error: "thread_id_required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

    // Проверяем владение
    const { data: th } = await supabase.from("ai_threads").select("id,user_id").eq("id", threadId).maybeSingle();
    if (!th || th.user_id !== userId) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
    }

    // Берём первые 4 сообщения
    const { data: msgs } = await supabase
      .from("ai_messages")
      .select("role, parts, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(4);
    const flat = (msgs ?? [])
      .map((m) => {
        const parts = Array.isArray(m.parts) ? m.parts : [];
        const txt = parts
          .map((p: { type?: string; text?: string }) => (p?.type === "text" ? p.text ?? "" : ""))
          .join(" ")
          .trim();
        return txt ? `${m.role}: ${txt}` : "";
      })
      .filter(Boolean)
      .join("\n")
      .slice(0, 1500);
    if (!flat) return new Response(JSON.stringify({ error: "no_messages" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

    const key = Deno.env.get("AI_API_KEY");
    if (!key || !MODEL) return new Response(JSON.stringify({ error: "ai_not_configured" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Ты придумываешь короткий заголовок для разговора с ИИ-калькулятором полиграфии. Максимум 40 символов, без кавычек и точки, на русском. Опиши суть заказа (тираж, продукт, материал). Ответь ТОЛЬКО заголовком." },
          { role: "user", content: flat },
        ],
      }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: { ...headers, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "credits" }), { status: 402, headers: { ...headers, "Content-Type": "application/json" } });
    if (!res.ok) return new Response(JSON.stringify({ error: `gateway_${res.status}` }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const data = await res.json();
    let title = String(data?.choices?.[0]?.message?.content ?? "").trim();
    title = title.replace(/^["«»'`]+|["«»'`.]+$/g, "").slice(0, 60);
    if (!title) title = "Разговор";

    await supabase.from("ai_threads").update({ title }).eq("id", threadId);
    return new Response(JSON.stringify({ ok: true, title }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
