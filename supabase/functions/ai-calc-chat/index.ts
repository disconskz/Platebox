// ИИ-чат для расчётов: принимает историю беседы и новое сообщение,
// возвращает текстовый ответ ассистента и опционально структурированное
// предложение заказа (proposed_order) для отправки в калькулятор.

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://platebox.kz",
  "https://www.platebox.kz",
  "https://printpal-calculus.lovable.app",
  "https://id-preview--749d8514-bdc7-4f32-957d-16692d3b0bb0.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const rateBuckets = new Map<string, number[]>();
function rateLimit(key: string) {
  const now = Date.now();
  const arr = (rateBuckets.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - arr[0])) / 1000);
    rateBuckets.set(key, arr);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return { ok: true, retryAfterSec: 0 };
}

const MODEL = "google/gemini-3-flash-preview";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function callGateway(messages: ChatMessage[], response_format?: unknown) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, messages, ...(response_format ? { response_format } : {}) }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`gateway_${res.status}`);
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}

function jsonResp(corsHeaders: Record<string, string>, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

const SYSTEM_PROMPT = `Ты — помощник менеджера типографии Platebox. Помогаешь быстро посчитать стоимость заказа.

Твоя задача:
1. Если в сообщении пользователя достаточно данных для расчёта — сразу предложи карточку заказа.
2. Если данных не хватает — задай 1-2 уточняющих вопроса (не больше) по самым важным недостающим параметрам: тип продукции, тираж, формат, красочность, материал.
3. Отвечай коротко, по-деловому, по-русски. Без воды.

ВСЕГДА возвращай СТРОГО валидный JSON по схеме:
{
  "reply": "текст ответа пользователю (markdown допустим, коротко)",
  "proposed_order": null | {
    "product_type": "leaflet" | "booklet" | "business_card" | "poster" | "flyer" | "brochure" | "other",
    "name": "короткое название",
    "circulation": число (тираж),
    "format": "A3" | "A4" | "A5" | "A6" | "custom",
    "custom_width_mm": число,
    "custom_height_mm": число,
    "color_front": 0..4,
    "color_back": 0..4,
    "material_category": "coated" | "uncoated" | "designer" | "cardboard",
    "material_density": число г/м²,
    "has_lamination": boolean,
    "lamination_film": "gloss" | "matte" | "velvet",
    "lamination_sides": 1 | 2,
    "has_fold": boolean,
    "fold_count": число,
    "has_numbering": boolean,
    "has_stamping": boolean,
    "has_die_cut": boolean,
    "margin_percent": число,
    "notes": "что не уверен/не распознал"
  }
}

Правила:
- Поля, которых нет в описании — пропускай (не пиши в proposed_order).
- Не выдумывай тираж/формат/материал. Лучше спросить.
- 4+4 = color_front 4, color_back 4. 4+0 = front 4, back 0.
- "мелованная" → coated, "офсетная" → uncoated, "дизайнерская" → designer, "картон" → cardboard.
- А5/А4/А3/А6 → format A5/A4/A3/A6 (latin). Свой размер → custom + width/height.
- Если предлагаешь карточку — в reply краткое подтверждение ("Готов посчитать вот так:") а детали уже в proposed_order.
- Если задаёшь вопрос — proposed_order = null.
- Без markdown-кода, без \`\`\`json — только сам JSON-объект.`;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResp(corsHeaders, { error: "unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return jsonResp(corsHeaders, { error: "unauthorized" }, 401);
    }
    const userId = String(claimsData.claims.sub);

    const rl = rateLimit(userId);
    if (!rl.ok) {
      return jsonResp(corsHeaders, { error: "rate_limit", retry_after: rl.retryAfterSec }, 429, {
        "Retry-After": String(rl.retryAfterSec),
      });
    }

    const body = await req.json().catch(() => ({}));
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history.slice(-20) : [];
    const userText: string = String(body?.text ?? "").trim();
    if (!userText) return jsonResp(corsHeaders, { error: "empty" }, 400);

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"),
      { role: "user", content: userText },
    ];

    const raw = await callGateway(messages, { type: "json_object" });
    let parsed: { reply?: string; proposed_order?: unknown } = {};
    try { parsed = JSON.parse(raw); } catch {
      parsed = { reply: raw || "Не удалось разобрать ответ.", proposed_order: null };
    }
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "—";
    const order = parsed.proposed_order && typeof parsed.proposed_order === "object" ? parsed.proposed_order : null;

    return jsonResp(corsHeaders, { ok: true, reply, proposed_order: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return jsonResp(corsHeaders, { error: msg }, status);
  }
});