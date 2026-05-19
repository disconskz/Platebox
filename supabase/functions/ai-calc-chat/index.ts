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

// ---------- Reference snapshot (cached in memory, refreshed every 5 min) ----------
type ReferenceSnapshot = {
  materials: Array<{ id: string; name: string; type: string; density: number; w: number; h: number; price: number }>;
  print_formats: Array<{ id: string; w: number; h: number; purchase_format_id: string | null }>;
  purchase_formats: Array<{ id: string; w: number; h: number; category: string }>;
  press_machines: Array<{ id: string; name: string; type: string; max_w: number; max_h: number; min_circ: number; max_circ: number | null; setup_sheets: number; setup_cost: number; cost_per_impression: number; product_types: string[] | null; priority: number }>;
  lamination: Array<{ film: string; size: string; price_per_side: number }>;
  operations: Array<{ name: string; category: string; fixed: number; variable: number; unit: string; setup_sheets: number }>;
  constants: Record<string, number>;
  circulation_rules: Array<{ product_type: string; min: number; max: number | null; preferred_machine_id: string | null }>;
  glossary: Array<{ slug: string; name: string; base_product_type: string; category: string; is_calculable: boolean }>;
  format_presets: Array<{ name: string; w: number; h: number; category: string }>;
  envelope_formats: Array<{ name: string; w: number; h: number }>;
  vat_percent: number;
};

let snapshotCache: { data: ReferenceSnapshot; ts: number } | null = null;
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

async function loadReferenceSnapshot(): Promise<ReferenceSnapshot> {
  const now = Date.now();
  if (snapshotCache && now - snapshotCache.ts < SNAPSHOT_TTL_MS) return snapshotCache.data;

  const adminUrl = Deno.env.get("SUPABASE_URL")!;
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(adminUrl, adminKey);

  const [
    materialsR, printFormatsR, purchaseFormatsR, pressR, lamR, opsR, constR,
    circR, glossR, presetsR, envR, settingsR,
  ] = await Promise.all([
    admin.from("materials").select("id,name,type,density,format_width,format_height,cost_per_sheet").order("name"),
    admin.from("print_formats").select("id,width,height,purchase_format_id").order("sort_order"),
    admin.from("purchase_formats").select("id,width,height,material_category").order("sort_order"),
    admin.from("press_machines").select("id,name,machine_type,max_format_width,max_format_height,min_circulation,max_circulation,setup_sheets,setup_cost,cost_per_impression,product_types,priority").eq("is_active", true).order("priority"),
    admin.from("lamination_prices").select("film_type,size_range,cost_per_side"),
    admin.from("operations").select("name,category,fixed_cost,variable_cost,unit,setup_sheets"),
    admin.from("calc_constants").select("slug,value").order("sort_order"),
    admin.from("product_circulation_rules").select("product_type,min_circulation,max_circulation,preferred_machine_id"),
    admin.from("product_glossary").select("slug,name,base_product_type,category,is_calculable").order("sort_order"),
    admin.from("format_presets").select("name,width,height,category"),
    admin.from("envelope_formats").select("name,width,height").order("sort_order"),
    admin.from("system_settings").select("key,value"),
  ]);

  const constants: Record<string, number> = {};
  for (const r of (constR.data ?? []) as Array<{ slug: string; value: number }>) {
    if (r?.slug) constants[r.slug] = Number(r.value);
  }
  let vatPercent = 12;
  for (const r of (settingsR.data ?? []) as Array<{ key: string; value: string }>) {
    if (r.key === "vat_percent") vatPercent = Number(r.value) || vatPercent;
  }

  const snapshot: ReferenceSnapshot = {
    materials: ((materialsR.data ?? []) as any[]).map((m) => ({
      id: m.id, name: m.name, type: m.type, density: m.density,
      w: m.format_width, h: m.format_height, price: Number(m.cost_per_sheet) || 0,
    })),
    print_formats: ((printFormatsR.data ?? []) as any[]).map((p) => ({
      id: p.id, w: p.width, h: p.height, purchase_format_id: p.purchase_format_id ?? null,
    })),
    purchase_formats: ((purchaseFormatsR.data ?? []) as any[]).map((p) => ({
      id: p.id, w: p.width, h: p.height, category: p.material_category,
    })),
    press_machines: ((pressR.data ?? []) as any[]).map((p) => ({
      id: p.id, name: p.name, type: p.machine_type,
      max_w: p.max_format_width, max_h: p.max_format_height,
      min_circ: p.min_circulation, max_circ: p.max_circulation,
      setup_sheets: p.setup_sheets, setup_cost: Number(p.setup_cost) || 0,
      cost_per_impression: Number(p.cost_per_impression) || 0,
      product_types: p.product_types ?? null, priority: p.priority,
    })),
    lamination: ((lamR.data ?? []) as any[]).map((l) => ({
      film: l.film_type, size: l.size_range, price_per_side: Number(l.cost_per_side) || 0,
    })),
    operations: ((opsR.data ?? []) as any[]).map((o) => ({
      name: o.name, category: o.category,
      fixed: Number(o.fixed_cost) || 0, variable: Number(o.variable_cost) || 0,
      unit: o.unit ?? "", setup_sheets: o.setup_sheets ?? 0,
    })),
    constants,
    circulation_rules: ((circR.data ?? []) as any[]).map((c) => ({
      product_type: c.product_type, min: c.min_circulation, max: c.max_circulation, preferred_machine_id: c.preferred_machine_id,
    })),
    glossary: ((glossR.data ?? []) as any[]).map((g) => ({
      slug: g.slug, name: g.name, base_product_type: g.base_product_type, category: g.category, is_calculable: g.is_calculable,
    })),
    format_presets: ((presetsR.data ?? []) as any[]).map((f) => ({
      name: f.name, w: f.width, h: f.height, category: f.category ?? "standard",
    })),
    envelope_formats: ((envR.data ?? []) as any[]).map((e) => ({ name: e.name, w: e.width, h: e.height })),
    vat_percent: vatPercent,
  };

  snapshotCache = { data: snapshot, ts: now };
  return snapshot;
}

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

const BASE_SYSTEM_PROMPT = `Ты — помощник менеджера типографии Platebox. Помогаешь быстро посчитать стоимость заказа, опираясь СТРОГО на справочник, который дан ниже.

Твоя задача:
1. Если в сообщении пользователя достаточно данных для расчёта — сразу предложи карточку заказа c реальным material_id из справочника и ориентировочной стоимостью.
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
    "material_id": "uuid из materials в справочнике (ОБЯЗАТЕЛЬНО если можешь подобрать)",
    "material_alternatives": ["uuid", ...] (0-3 альтернативы той же категории/плотности),
    "press_machine_id": "uuid из press_machines (если уверен)",
    "print_format_id": "uuid из print_formats (если уверен)",
    "purchase_format_id": "uuid из purchase_formats (если уверен)",
    "items_per_sheet": число (раскладка — сколько изделий на одном печатном листе),
    "sheets_useful": число (полезных листов = ceil(circulation / items_per_sheet)),
    "sheets_setup": число (листы приладки — обычно press_machines.setup_sheets × красочность),
    "sheets_total": число (sheets_useful + sheets_setup),
    "material_price_per_sheet": число ₸ (из materials.price),
    "impressions": число (sheets_total × max(color_front, color_back)),
    "cost_per_impression": число ₸ (из press_machines.cost_per_impression),
    "setup_cost": число ₸ (press_machines.setup_cost),
    "forms_count": число (color_front + color_back),
    "form_cost_total": число ₸ (стоимость форм; ≈ forms_count × calc_constants form_cost если есть),
    "postpress_breakdown": [
      { "name": "Ламинация", "qty": число, "unit": "лист"|"шт"|"м²", "unit_cost": число ₸, "cost": число ₸ },
      ...
    ] (по одной строке на каждую постпечатную операцию: ламинация, фальцовка, высечка, нумерация, тиснение, резка),
    "estimated_cost": {
      "paper": число ₸,
      "print": число ₸,
      "postpress": число ₸,
      "total": число ₸ (себестоимость без НДС),
      "with_vat": число ₸ (total * (1 + vat_percent/100)),
      "sale_price": число ₸ (with_vat * (1 + margin_percent/100)),
      "currency": "KZT"
    },
    "vat_percent": число (vat_percent из справочника),
    "vat_amount": число ₸ (total × vat_percent / 100),
    "margin_amount": число ₸ (with_vat × margin_percent / 100),
    "cost_breakdown": ["короткая строка-объяснение", ...] (2-4 строки),
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
- Используй ТОЛЬКО id из переданного справочника. Не выдумывай uuid.
- Если подходящего материала нет в справочнике — поставь material_id = null, объясни в notes и предложи ближайший.
- Считай ориентировочно: items_per_sheet = floor(print_format площадь / item площадь × 0.85); sheets_useful = ceil(тираж / items_per_sheet); sheets_setup = press_machines.setup_sheets × max(color_front,color_back); sheets_total = sheets_useful + sheets_setup; бумага = sheets_total × material_price_per_sheet; печать = sheets_total × cost_per_impression × max(color_front, color_back); добавь setup_cost машины и form_cost × forms_count, постпечать по operations и lamination. Округляй до 100 ₸.
- ОБЯЗАТЕЛЬНО заполняй press_machine_id, print_format_id, items_per_sheet, sheets_useful, sheets_setup, sheets_total, material_price_per_sheet, impressions, cost_per_impression, setup_cost, postpress_breakdown, vat_percent, vat_amount, margin_amount — менеджеру нужна полная расшифровка.
- Если не можешь оценить число шт_на_листе — прикинь по площади (purchase_w*h / item_w*h * 0.85).
- Поля, которых не знаешь — пропускай.
- 4+4 = color_front 4, color_back 4. 4+0 = front 4, back 0.
- "мелованная"/"меловка" → coated, "офсетная" → uncoated, "дизайнерская" → designer, "картон" → cardboard.
- А5/А4/А3/А6 → format A5/A4/A3/A6 (latin). Свой размер → custom + width/height.
- Если предлагаешь карточку — в reply краткое подтверждение, детали в proposed_order.
- Если задаёшь вопрос — proposed_order = null.
- Без markdown-кода, без \`\`\`json — только сам JSON-объект.`;

function buildSystemPrompt(snapshot: ReferenceSnapshot): string {
  // Compact snapshot — keep JSON small (< 30 KB)
  const data = {
    materials: snapshot.materials,
    purchase_formats: snapshot.purchase_formats,
    print_formats: snapshot.print_formats,
    press_machines: snapshot.press_machines,
    lamination: snapshot.lamination,
    operations: snapshot.operations,
    constants: snapshot.constants,
    circulation_rules: snapshot.circulation_rules,
    glossary: snapshot.glossary,
    format_presets: snapshot.format_presets,
    envelope_formats: snapshot.envelope_formats,
    vat_percent: snapshot.vat_percent,
  };
  return `${BASE_SYSTEM_PROMPT}\n\nСПРАВОЧНИК (используй только эти id и значения):\n${JSON.stringify(data)}`;
}

function sanitizeProposedOrder(order: any, snapshot: ReferenceSnapshot): any {
  if (!order || typeof order !== "object") return null;
  const materialIds = new Set(snapshot.materials.map((m) => m.id));
  const machineIds = new Set(snapshot.press_machines.map((m) => m.id));
  const printIds = new Set(snapshot.print_formats.map((p) => p.id));
  const purchaseIds = new Set(snapshot.purchase_formats.map((p) => p.id));

  const notes: string[] = [];
  if (typeof order.notes === "string" && order.notes.trim()) notes.push(order.notes.trim());

  if (order.material_id && !materialIds.has(order.material_id)) {
    notes.push(`ИИ предложил материал ${order.material_id}, которого нет в справочнике.`);
    order.material_id = null;
  }
  if (Array.isArray(order.material_alternatives)) {
    order.material_alternatives = order.material_alternatives.filter((id: unknown) => typeof id === "string" && materialIds.has(id));
  }
  if (order.press_machine_id && !machineIds.has(order.press_machine_id)) order.press_machine_id = null;
  if (order.print_format_id && !printIds.has(order.print_format_id)) order.print_format_id = null;
  if (order.purchase_format_id && !purchaseIds.has(order.purchase_format_id)) order.purchase_format_id = null;

  // Резолвим человеко-читаемые подписи на сервере, чтобы клиент гарантированно получил их.
  if (order.press_machine_id) {
    const m = snapshot.press_machines.find((x) => x.id === order.press_machine_id);
    if (m) {
      order.press_machine_name = `${m.name} (${m.type}, до ${m.max_w}×${m.max_h} мм)`;
      if (typeof order.cost_per_impression !== "number") order.cost_per_impression = m.cost_per_impression;
      if (typeof order.setup_cost !== "number") order.setup_cost = m.setup_cost;
    }
  }
  if (order.print_format_id) {
    const p = snapshot.print_formats.find((x) => x.id === order.print_format_id);
    if (p) order.print_format_label = `${p.w}×${p.h} мм`;
  }
  if (order.purchase_format_id) {
    const p = snapshot.purchase_formats.find((x) => x.id === order.purchase_format_id);
    if (p) order.purchase_format_label = `${p.w}×${p.h} мм`;
  }
  if (order.material_id) {
    const m = snapshot.materials.find((x) => x.id === order.material_id);
    if (m && typeof order.material_price_per_sheet !== "number") {
      order.material_price_per_sheet = m.price;
    }
  }
  if (typeof order.vat_percent !== "number") order.vat_percent = snapshot.vat_percent;

  order.notes = notes.join(" ") || undefined;
  return order;
}

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

    let snapshot: ReferenceSnapshot;
    try {
      snapshot = await loadReferenceSnapshot();
    } catch (e) {
      console.error("[ai-calc-chat] snapshot load failed:", e);
      return jsonResp(corsHeaders, { error: "snapshot_failed" }, 500);
    }

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(snapshot) },
      ...history.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"),
      { role: "user", content: userText },
    ];

    const raw = await callGateway(messages, { type: "json_object" });
    let parsed: { reply?: string; proposed_order?: unknown } = {};
    try { parsed = JSON.parse(raw); } catch {
      parsed = { reply: raw || "Не удалось разобрать ответ.", proposed_order: null };
    }
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "—";
    const order = sanitizeProposedOrder(parsed.proposed_order, snapshot);

    return jsonResp(corsHeaders, { ok: true, reply, proposed_order: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return jsonResp(corsHeaders, { error: msg }, status);
  }
});