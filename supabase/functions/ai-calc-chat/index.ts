// ИИ-чат расчётов с tool-calling: ассистент видит весь справочник через
// инструменты, считает заказ настоящим движком и возвращает построчную
// карточку proposed_order + обновлённый draft для памяти диалога.

import { createClient } from "npm:@supabase/supabase-js@2";
import { loadReferenceSnapshot } from "./references.ts";
import { TOOLS, runTool, createState } from "./tools.ts";
import { buildSystemPrompt } from "./prompt.ts";

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
const MAX_TOOL_STEPS = 8;

type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
};

async function callGateway(
  messages: ChatMessage[],
  opts: { tools?: unknown; response_format?: unknown; tool_choice?: unknown } = {},
) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`gateway_${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message ?? { role: "assistant", content: "" };
}

function jsonResp(corsHeaders: Record<string, string>, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function sanitizeProposedOrder(order: any, snapshot: Awaited<ReturnType<typeof loadReferenceSnapshot>>): any {
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
  if (order.press_machine_id && !machineIds.has(order.press_machine_id)) order.press_machine_id = null;
  if (order.print_format_id && !printIds.has(order.print_format_id)) order.print_format_id = null;
  if (order.purchase_format_id && !purchaseIds.has(order.purchase_format_id)) order.purchase_format_id = null;
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
    const history: Array<{ role: "user" | "assistant"; content: string }> =
      Array.isArray(body?.history) ? body.history.slice(-20) : [];
    const userText: string = String(body?.text ?? "").trim();
    const draft = body?.draft && typeof body.draft === "object" ? body.draft : {};
    if (!userText) return jsonResp(corsHeaders, { error: "empty" }, 400);

    let snapshot: Awaited<ReturnType<typeof loadReferenceSnapshot>>;
    try {
      snapshot = await loadReferenceSnapshot();
    } catch (e) {
      console.error("[ai-calc-chat] snapshot load failed:", e);
      return jsonResp(corsHeaders, { error: "snapshot_failed" }, 500);
    }

    const state = createState();
    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(snapshot, draft) },
      ...history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: "user", content: userText },
    ];

    // Tool-calling loop
    let finalContent = "";
    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const isLast = step === MAX_TOOL_STEPS - 1;
      const msg = await callGateway(messages, {
        tools: isLast ? undefined : TOOLS,
        response_format: { type: "json_object" },
      });
      const toolCalls = msg?.tool_calls as ChatMessage["tool_calls"] | undefined;
      if (toolCalls && toolCalls.length > 0) {
        messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: toolCalls });
        for (const tc of toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* noop */ }
          let result: unknown;
          try {
            result = runTool(tc.function.name, parsedArgs, snapshot, state);
          } catch (e) {
            result = { error: (e as Error).message };
          }
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify(result).slice(0, 60_000),
          });
        }
        continue;
      }
      finalContent = String(msg?.content ?? "");
      break;
    }

    let parsed: { reply?: string; draft?: unknown } = {};
    try { parsed = JSON.parse(finalContent); } catch {
      parsed = { reply: finalContent || "Не удалось разобрать ответ.", draft };
    }
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "—";
    const order = sanitizeProposedOrder(state.proposed_order, snapshot);
    const nextDraft = parsed.draft && typeof parsed.draft === "object" ? parsed.draft : draft;

    return jsonResp(corsHeaders, { ok: true, reply, proposed_order: order, draft: nextDraft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return jsonResp(corsHeaders, { error: msg }, status);
  }
});