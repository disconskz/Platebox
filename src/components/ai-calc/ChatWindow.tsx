import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logDataIssue } from "@/lib/data-issue";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import aiLogo from "@/assets/ai-calc-logo.png";
import { fmtMoney } from "@/lib/format";

export type ProposedOrder = {
  product_type?: string;
  name?: string;
  circulation?: number;
  format?: string;
  custom_width_mm?: number;
  custom_height_mm?: number;
  color_front?: number;
  color_back?: number;
  material_category?: string;
  material_density?: number;
  material_id?: string | null;
  material_alternatives?: string[];
  press_machine_id?: string | null;
  print_format_id?: string | null;
  purchase_format_id?: string | null;
  press_machine_name?: string;
  print_format_label?: string;
  purchase_format_label?: string;
  items_per_sheet?: number;
  sheets_useful?: number;
  sheets_setup?: number;
  sheets_total?: number;
  material_price_per_sheet?: number;
  impressions?: number;
  cost_per_impression?: number;
  setup_cost?: number;
  forms_count?: number;
  form_cost_total?: number;
  postpress_breakdown?: Array<{ name: string; qty?: number; unit?: string; unit_cost?: number; cost: number }>;
  vat_percent?: number;
  vat_amount?: number;
  margin_amount?: number;
  estimated_cost?: {
    paper?: number;
    print?: number;
    postpress?: number;
    total?: number;
    with_vat?: number;
    sale_price?: number;
    currency?: string;
  };
  cost_breakdown?: string[];
  has_lamination?: boolean;
  lamination_film?: string;
  lamination_sides?: number;
  has_fold?: boolean;
  fold_count?: number;
  has_numbering?: boolean;
  has_stamping?: boolean;
  has_die_cut?: boolean;
  margin_percent?: number;
  notes?: string;
};

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "proposed_order"; order: ProposedOrder };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
  created_at: string;
};

type Props = {
  threadId: string;
  initialMessages: ChatMessage[];
  onTitleSuggested?: (title: string) => void;
};

const PRODUCT_LABEL: Record<string, string> = {
  leaflet: "Листовка", flyer: "Флаер", booklet: "Буклет",
  business_card: "Визитки", poster: "Постер", brochure: "Брошюра", other: "Прочее",
};
const MATERIAL_LABEL: Record<string, string> = {
  coated: "мелованная", uncoated: "офсетная", designer: "дизайнерская", cardboard: "картон",
};
const LAMINATION_LABEL: Record<string, string> = { gloss: "глянцевая", matte: "матовая", velvet: "софт-тач" };

function summarizeOrder(o: ProposedOrder): { lines: { label: string; value: string }[] } {
  const lines: { label: string; value: string }[] = [];
  if (o.product_type) lines.push({ label: "Продукт", value: PRODUCT_LABEL[o.product_type] ?? o.product_type });
  if (o.circulation) lines.push({ label: "Тираж", value: `${o.circulation.toLocaleString("ru-RU")} шт` });
  if (o.format) {
    const f = o.format === "custom"
      ? `${o.custom_width_mm ?? "?"}×${o.custom_height_mm ?? "?"} мм`
      : o.format;
    lines.push({ label: "Формат", value: f });
  }
  if (typeof o.color_front === "number") {
    lines.push({ label: "Красочность", value: `${o.color_front}+${o.color_back ?? 0}` });
  }
  if (o.material_category) {
    const m = MATERIAL_LABEL[o.material_category] ?? o.material_category;
    lines.push({ label: "Материал", value: o.material_density ? `${m}, ${o.material_density} г/м²` : m });
  }
  if (o.has_lamination) {
    lines.push({
      label: "Ламинация",
      value: `${LAMINATION_LABEL[o.lamination_film ?? ""] ?? "ламинация"}${o.lamination_sides ? `, ${o.lamination_sides} стор.` : ""}`,
    });
  }
  if (o.has_fold) lines.push({ label: "Биговка/фальц", value: o.fold_count ? `${o.fold_count} фальц.` : "да" });
  if (o.has_die_cut) lines.push({ label: "Высечка", value: "да" });
  if (o.has_numbering) lines.push({ label: "Нумерация", value: "да" });
  if (o.has_stamping) lines.push({ label: "Тиснение", value: "да" });
  if (typeof o.margin_percent === "number") lines.push({ label: "Наценка", value: `${o.margin_percent}%` });
  return { lines };
}

function ProposedOrderCard({ order }: { order: ProposedOrder }) {
  const navigate = useNavigate();
  const { lines } = summarizeOrder(order);
  const [materialName, setMaterialName] = useState<string | null>(null);
  useEffect(() => {
    if (!order.material_id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("materials")
        .select("name")
        .eq("id", order.material_id!)
        .maybeSingle();
      if (!cancelled && data?.name) setMaterialName(data.name);
    })();
    return () => { cancelled = true; };
  }, [order.material_id]);

  const openInCalculator = () => {
    try { sessionStorage.setItem("ai-calc-prefill", JSON.stringify(order)); } catch { /* ignore */ }
    navigate("/calculator");
  };
  const est = order.estimated_cost;
  const colors = Math.max(order.color_front ?? 0, order.color_back ?? 0);
  const num = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

  type Row = { name: string; detail?: string; cost: number };
  const costRows: Row[] = [];
  if (typeof est?.paper === "number") {
    costRows.push({
      name: "Бумага",
      detail: order.sheets_total && order.material_price_per_sheet
        ? `${num(order.sheets_total)} л × ${fmtMoney(order.material_price_per_sheet)}`
        : undefined,
      cost: est.paper,
    });
  }
  if (typeof est?.print === "number") {
    costRows.push({
      name: "Печать",
      detail: order.impressions && order.cost_per_impression
        ? `${num(order.impressions)} оттисков × ${fmtMoney(order.cost_per_impression)}`
        : undefined,
      cost: est.print,
    });
  }
  if (typeof order.setup_cost === "number" && order.setup_cost > 0) {
    costRows.push({ name: "Приладка машины", cost: order.setup_cost });
  }
  if (typeof order.form_cost_total === "number" && order.form_cost_total > 0) {
    costRows.push({
      name: "Формы",
      detail: order.forms_count ? `${order.forms_count} шт` : undefined,
      cost: order.form_cost_total,
    });
  }
  for (const op of order.postpress_breakdown ?? []) {
    if (!op || typeof op.cost !== "number") continue;
    const detail = op.qty
      ? `${num(op.qty)}${op.unit ? " " + op.unit : ""}${op.unit_cost ? " × " + fmtMoney(op.unit_cost) : ""}`
      : undefined;
    costRows.push({ name: op.name, detail, cost: op.cost });
  }

  const prodRows: Array<{ label: string; value: string }> = [];
  if (order.press_machine_name) prodRows.push({ label: "Машина", value: order.press_machine_name });
  if (order.print_format_label) prodRows.push({ label: "Печатный лист", value: order.print_format_label });
  if (order.purchase_format_label) {
    const mat = materialName ? `, ${materialName}` : "";
    prodRows.push({ label: "Закупочный лист", value: order.purchase_format_label + mat });
  } else if (materialName) {
    prodRows.push({ label: "Из справочника", value: materialName });
  }
  if (order.items_per_sheet) prodRows.push({ label: "Раскладка", value: `${order.items_per_sheet} шт / лист` });
  if (order.sheets_total) {
    const parts: string[] = [];
    if (order.sheets_useful) parts.push(`${num(order.sheets_useful)} полезных`);
    if (order.sheets_setup) parts.push(`${num(order.sheets_setup)} приладка`);
    const sum = parts.length ? `${parts.join(" + ")} = ${num(order.sheets_total)}` : num(order.sheets_total);
    prodRows.push({ label: "Листы", value: sum });
  }
  if (order.impressions) {
    prodRows.push({
      label: "Оттиски",
      value: order.sheets_total && colors
        ? `${num(order.sheets_total)} × ${colors} = ${num(order.impressions)}`
        : num(order.impressions),
    });
  }

  return (
    <div className="mt-3 space-y-3 max-w-2xl">
      {/* Bento header — specs (4) + total (2) */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-6 md:col-span-4 p-5 rounded-2xl border border-border bg-card relative overflow-hidden shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Распознанный заказ</h4>
            {order.name && <span className="text-[11px] text-muted-foreground truncate">· {order.name}</span>}
          </div>
          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет распознанных полей</p>
          ) : (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {lines.map((l) => (
                <div key={l.label} className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mb-0.5">{l.label}</p>
                  <p className="text-sm font-semibold text-foreground truncate" title={l.value}>{l.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-6 md:col-span-2 p-5 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col justify-between gap-3 shadow-card">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/90">Итого, ₸</h4>
            <p
              className="text-2xl font-bold text-foreground mt-1 tabular-nums"
              style={{ fontFamily: '"Space Grotesk", "DM Sans", sans-serif' }}
            >
              {typeof est?.sale_price === "number"
                ? Math.round(est.sale_price).toLocaleString("ru-RU")
                : typeof est?.total === "number"
                ? Math.round(est.total).toLocaleString("ru-RU")
                : "—"}
            </p>
            {typeof est?.sale_price === "number" && order.circulation ? (
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                ~ {Math.round(est.sale_price / order.circulation).toLocaleString("ru-RU")} ₸ / шт
              </p>
            ) : null}
          </div>
          <Button size="sm" className="w-full gap-1.5" onClick={openInCalculator}>
            Открыть расчёт <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Production details */}
      {prodRows.length > 0 && (
        <div className="p-5 rounded-2xl border border-border bg-card shadow-card">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Производство</h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {prodRows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3 text-[12px] border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="text-foreground font-medium text-right tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Cost breakdown table */}
      {(costRows.length > 0 || typeof est?.total === "number") && (
        <div className="p-5 rounded-2xl border border-border bg-card shadow-card">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Себестоимость</h4>
          <div className="space-y-1.5 text-[12px]">
            {costRows.map((r, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 py-1 border-b border-border/30 last:border-0">
                <div className="min-w-0">
                  <span className="text-foreground font-medium">{r.name}</span>
                  {r.detail && <span className="text-muted-foreground ml-2 text-[11px]">{r.detail}</span>}
                </div>
                <span className="text-foreground font-semibold tabular-nums whitespace-nowrap">{fmtMoney(r.cost)}</span>
              </div>
            ))}
            {typeof est?.total === "number" && (
              <div className="flex justify-between pt-2 mt-1 border-t border-border text-[12px] font-semibold">
                <span>Себестоимость</span>
                <span className="tabular-nums">{fmtMoney(est.total)}</span>
              </div>
            )}
            {typeof order.vat_amount === "number" && order.vat_amount > 0 && (
              <div className="flex justify-between text-[12px] text-muted-foreground">
                <span>НДС {order.vat_percent ?? ""}%</span>
                <span className="tabular-nums">{fmtMoney(order.vat_amount)}</span>
              </div>
            )}
            {typeof order.margin_amount === "number" && order.margin_amount > 0 && (
              <div className="flex justify-between text-[12px] text-muted-foreground">
                <span>Наценка {order.margin_percent ?? ""}%</span>
                <span className="tabular-nums">{fmtMoney(order.margin_amount)}</span>
              </div>
            )}
            {typeof est?.sale_price === "number" && (
              <div className="flex justify-between pt-2 mt-1 border-t border-primary/30 text-[13px] font-bold text-primary">
                <span>Итого к продаже</span>
                <span className="tabular-nums">{fmtMoney(est.sale_price)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {order.cost_breakdown && order.cost_breakdown.length > 0 && (
        <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-1">
          {order.cost_breakdown.slice(0, 4).map((s, i) => <li key={i}>• {s}</li>)}
        </ul>
      )}
      {order.notes && (
        <p className="text-[11px] italic text-muted-foreground pl-1">{order.notes}</p>
      )}
    </div>
  );
}

const EXAMPLES = [
  "Посчитай 1000 листовок А5 4+4 на мелованной 130",
  "Визитки 90×50, 4+0, 500 шт, дизайнерская 300",
  "Флаер А6, 4+4, 5000 шт, матовая ламинация",
  "Буклет А4 с одним фальцем, 2000 шт, мелованная 150, 4+4",
];

export default function ChatWindow({ threadId, initialMessages, onTitleSuggested }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<"ready" | "submitted" | "error">("ready");
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const history = useMemo(
    () =>
      messages.flatMap((m) => {
        const txt = m.parts
          .map((p) =>
            p.type === "text" ? p.text :
            p.type === "proposed_order" ? `[предложение: ${JSON.stringify(p.order)}]` : "",
          )
          .join("\n").trim();
        return txt ? [{ role: m.role, content: txt }] : [];
      }),
    [messages],
  );

  // Focus textarea on mount / thread change / after send
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [threadId, status]);

  const persistMessage = async (msg: { role: "user" | "assistant"; parts: ChatPart[] }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        role: msg.role,
        parts: msg.parts as unknown as never,
      })
      .select("id, created_at")
      .single();
    if (error || !data) {
      logDataIssue("ai-calc:save-msg", error);
      return null;
    }
    return data as { id: string; created_at: string };
  };

  const send = async (text: string) => {
    if (!text.trim() || status === "submitted" || !user) return;
    const trimmed = text.trim();
    setStatus("submitted");

    const userMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: trimmed }],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const saved = await persistMessage({ role: "user", parts: userMsg.parts });
    if (saved) {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, id: saved.id, created_at: saved.created_at } : m)),
      );
    }

    // First user message → suggested title
    if (messages.length === 0) {
      const suggested = trimmed.slice(0, 60);
      onTitleSuggested?.(suggested);
      await supabase.from("ai_threads").update({ title: suggested }).eq("id", threadId);
    } else {
      await supabase.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("no_session");
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-calc-chat`;
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ text: trimmed, history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error("rate_limit");
        if (res.status === 402) throw new Error("credits");
        throw new Error(`http_${res.status}`);
      }
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "ai_error");

      const parts: ChatPart[] = [{ type: "text", text: String(data.reply ?? "") }];
      if (data.proposed_order && typeof data.proposed_order === "object") {
        parts.push({ type: "proposed_order", order: data.proposed_order });
      }
      const aMsg: ChatMessage = {
        id: `tmp-${Date.now()}-a`,
        role: "assistant",
        parts,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aMsg]);
      const savedA = await persistMessage({ role: "assistant", parts });
      if (savedA) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aMsg.id ? { ...m, id: savedA.id, created_at: savedA.created_at } : m)),
        );
      }
      setStatus("ready");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "AbortError" || (e instanceof DOMException && e.name === "AbortError")) {
        // Cancelled by user — persist a "_Остановлено._" marker so reload shows it
        const stopMsg: ChatMessage = {
          id: `tmp-${Date.now()}-stop`,
          role: "assistant",
          parts: [{ type: "text", text: "_Остановлено._" }],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, stopMsg]);
        const savedS = await persistMessage({ role: "assistant", parts: stopMsg.parts });
        if (savedS) {
          setMessages((prev) =>
            prev.map((m) => (m.id === stopMsg.id ? { ...m, id: savedS.id, created_at: savedS.created_at } : m)),
          );
        }
        setStatus("ready");
        return;
      }
      if (msg.includes("rate_limit")) toast.error("Слишком много запросов. Подождите немного.");
      else if (msg.includes("credits")) toast.error("Закончились кредиты ИИ. Пополните в настройках.");
      else if (msg === "no_session") toast.error("Сессия истекла. Войдите снова.");
      else toast.error("ИИ не ответил. Попробуйте ещё раз.");
      logDataIssue("ai-calc:invoke", e as never);
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const handlePromptSubmit = (msg: PromptInputMessage) => {
    void send(msg.text ?? "");
  };

  return (
    <div className="relative flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-5rem)] bg-background">
      <Conversation className="flex-1">
        <ConversationContent className="max-w-3xl mx-auto w-full pb-44">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="py-12"
              icon={<img src={aiLogo} alt="" width={72} height={72} />}
              title="Опишите заказ словами"
              description="ИИ задаст уточнения, подберёт материал из справочника и сразу прикинет стоимость."
            >
              <img src={aiLogo} alt="" width={72} height={72} />
              <div className="space-y-1 max-w-md">
                <h3 className="font-medium text-sm">Опишите заказ словами</h3>
                <p className="text-muted-foreground text-sm">
                  ИИ задаст уточнения, подберёт материал из справочника и сразу прикинет стоимость.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-w-xl w-full pt-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => void send(ex)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role} className="animate-fade-in">
                {m.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-7 w-7 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">AI Ассистент</span>
                  </div>
                )}
                <MessageContent
                  className={
                    m.role === "user"
                      ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:rounded-2xl group-[.is-user]:rounded-tr-sm"
                      : undefined
                  }
                >
                  {m.parts.map((p, i) =>
                    p.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      ) : (
                        <span key={i} className="whitespace-pre-wrap">{p.text}</span>
                      )
                    ) : (
                      <ProposedOrderCard key={i} order={p.order} />
                    ),
                  )}
                </MessageContent>
              </Message>
            ))
          )}

          {status === "submitted" && (
            <Message from="assistant">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">AI Ассистент</span>
              </div>
              <MessageContent>
                <div className="flex items-center gap-3">
                  <Shimmer>ИИ думает…</Shimmer>
                  <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-primary/10">
                    <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-shimmer-bar" />
                  </div>
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Floating composer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 safe-bottom">
        <div className="pointer-events-auto mx-auto max-w-2xl w-full px-3 sm:px-6 pb-4 pt-10 bg-gradient-to-t from-background via-background/90 to-transparent">
          <div className="relative">
            <div className="relative rounded-[18px] border border-border bg-card shadow-elevated overflow-hidden">
              <PromptInput onSubmit={handlePromptSubmit} className="border-0 bg-transparent">
                <PromptInputTextarea
                  ref={textareaRef as never}
                  placeholder="Опишите заказ или задайте уточняющий вопрос…"
                  autoFocus
                  className="bg-transparent"
                />
                <PromptInputFooter className="justify-end">
                  <PromptInputSubmit status={status} onStop={stop} />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            ИИ использует справочник Platebox. Точный расчёт всегда выполняется в калькуляторе.
          </p>
        </div>
      </div>
    </div>
  );
}
