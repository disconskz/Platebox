// Lovable AI Gateway helper for: order parsing + formula generation.
// Требует валидный JWT пользователя (Authorization: Bearer ...).

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

// --- Простой in-memory rate limiter: 10 запросов / минуту на user_id ---
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function rateLimit(key: string): { ok: boolean; retryAfterSec: number } {
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

type OrderSchema = {
  product_type?: "leaflet" | "booklet" | "business_card" | "poster" | "flyer" | "brochure" | "other";
  name?: string;
  circulation?: number;
  format?: "A3" | "A4" | "A5" | "A6" | "custom";
  custom_width_mm?: number;
  custom_height_mm?: number;
  color_front?: number; // 0..4
  color_back?: number;  // 0..4
  material_category?: "coated" | "uncoated" | "designer" | "cardboard";
  material_density?: number;
  has_lamination?: boolean;
  lamination_film?: "gloss" | "matte" | "velvet";
  lamination_sides?: 1 | 2;
  has_fold?: boolean;
  fold_count?: number;
  has_numbering?: boolean;
  has_stamping?: boolean;
  has_die_cut?: boolean;
  margin_percent?: number;
  notes?: string;
};

async function callGateway(messages: any[], response_format?: any) {
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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gateway_${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function jsonResp(corsHeaders: Record<string, string>, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // --- AuthN: требуем валидный JWT ---
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

    // --- Rate limiting: 10 запросов/мин на user_id ---
    const userKey = String(claimsData.claims.sub);
    const rl = rateLimit(userKey);
    if (!rl.ok) {
      return jsonResp(
        corsHeaders,
        { error: "rate_limit", retry_after: rl.retryAfterSec },
        429,
        { "Retry-After": String(rl.retryAfterSec) },
      );
    }

    const { mode, ...payload } = await req.json();

    if (mode === "parse-order") {
      const text: string = (payload.text || "").trim();
      if (!text) return jsonResp(corsHeaders, { error: "empty" }, 400);
      const system = `Ты — ассистент типографского калькулятора. Извлеки из описания заказа поля для расчёта стоимости.
Верни ТОЛЬКО валидный JSON по схеме (без markdown, без комментариев).
Поля:
- product_type: "leaflet"|"booklet"|"business_card"|"poster"|"flyer"|"brochure"|"other"
- name: string (короткое имя расчёта)
- circulation: число (тираж)
- format: "A3"|"A4"|"A5"|"A6"|"custom"
- custom_width_mm, custom_height_mm: числа в мм (если format="custom")
- color_front, color_back: 0..4 (4+0 = 4 и 0; 4+4 = 4 и 4)
- material_category: "coated"|"uncoated"|"designer"|"cardboard"
- material_density: число г/м² (например 130, 300)
- has_lamination: boolean, lamination_film: "gloss"|"matte"|"velvet", lamination_sides: 1|2
- has_fold: boolean, fold_count: число
- has_numbering, has_stamping, has_die_cut: boolean
- margin_percent: число (наценка %)
- notes: что не удалось распознать
Пропускай поля, которых нет в описании. Не выдумывай.`;
      const content = await callGateway(
        [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        { type: "json_object" },
      );
      let parsed: OrderSchema = {};
      try { parsed = JSON.parse(content); } catch { parsed = { notes: "не удалось распарсить ответ ИИ" }; }
      return jsonResp(corsHeaders, { ok: true, order: parsed });
    }

    if (mode === "generate-formula") {
      const description: string = (payload.description || "").trim();
      const variables: string[] = payload.variables || [];
      const constants: { slug: string; name: string }[] = payload.constants || [];
      if (!description) return jsonResp(corsHeaders, { error: "empty" }, 400);
      const system = `Ты — генератор формул для калькулятора типографии.
На вход — описание этапа на естественном языке. На выход — арифметическое выражение.
Доступные переменные (используй ровно эти ключи без кавычек): ${variables.join(", ")}.
Доступные константы (ссылайся через @slug): ${constants.map((c) => `@${c.slug} (${c.name})`).join(", ") || "нет"}.
Можно использовать функции: min, max, ceil, floor, round, abs и операторы + - * / и скобки.
Если нужна новая константа — придумай slug (латиница, snake_case) и добавь её в массив new_constants с осмысленным name, value (число по умолчанию), unit.
Верни СТРОГО JSON: { "expression": "...", "explanation": "коротко по-русски", "new_constants": [{slug,name,value,unit}] }`;
      const content = await callGateway(
        [
          { role: "system", content: system },
          { role: "user", content: description },
        ],
        { type: "json_object" },
      );
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { return jsonResp(corsHeaders, { error: "parse_failed", raw: content }, 500); }
      return jsonResp(corsHeaders, { ok: true, ...parsed });
    }

    return jsonResp(corsHeaders, { error: "unknown mode" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return jsonResp(corsHeaders, { error: msg }, status);
  }
});
