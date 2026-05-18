// Lovable AI Gateway helper for: order parsing + formula generation.
// Требует валидный JWT пользователя (Authorization: Bearer ...).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

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

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // --- AuthN: требуем валидный JWT ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResp({ error: "unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return jsonResp({ error: "unauthorized" }, 401);
    }

    const { mode, ...payload } = await req.json();

    if (mode === "parse-order") {
      const text: string = (payload.text || "").trim();
      if (!text) return jsonResp({ error: "empty" }, 400);
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
      return jsonResp({ ok: true, order: parsed });
    }

    if (mode === "generate-formula") {
      const description: string = (payload.description || "").trim();
      const variables: string[] = payload.variables || [];
      const constants: { slug: string; name: string }[] = payload.constants || [];
      if (!description) return jsonResp({ error: "empty" }, 400);
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
      try { parsed = JSON.parse(content); } catch { return jsonResp({ error: "parse_failed", raw: content }, 500); }
      return jsonResp({ ok: true, ...parsed });
    }

    return jsonResp({ error: "unknown mode" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return jsonResp({ error: msg }, status);
  }
});
