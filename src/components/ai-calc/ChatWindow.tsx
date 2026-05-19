import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logDataIssue } from "@/lib/data-issue";
import { cn } from "@/lib/utils";

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
    try {
      sessionStorage.setItem("ai-calc-prefill", JSON.stringify(order));
    } catch { /* ignore */ }
    navigate("/calculator");
  };
  const fmtKzt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₸`;
  const est = order.estimated_cost;
  return (
    <div className="mt-2 rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium">Распознанный заказ</span>
        {order.name && <span className="text-xs text-muted-foreground truncate">· {order.name}</span>}
      </div>
      <ul className="px-3 py-2 text-xs sm:text-sm space-y-1">
        {lines.length === 0 && <li className="text-muted-foreground">Нет распознанных полей</li>}
        {lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="font-medium text-right">{l.value}</span>
          </li>
        ))}
        {materialName && (
          <li className="flex justify-between gap-3">
            <span className="text-muted-foreground">Из справочника</span>
            <span className="font-medium text-right">{materialName}</span>
          </li>
        )}
      </ul>
      {est && (typeof est.total === "number" || typeof est.sale_price === "number") && (
        <div className="px-3 py-2 border-t bg-muted/10 space-y-1 text-xs sm:text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ориентир по справочнику</div>
          {typeof est.paper === "number" && (
            <div className="flex justify-between"><span className="text-muted-foreground">Бумага</span><span className="tabular-nums">{fmtKzt(est.paper)}</span></div>
          )}
          {typeof est.print === "number" && (
            <div className="flex justify-between"><span className="text-muted-foreground">Печать</span><span className="tabular-nums">{fmtKzt(est.print)}</span></div>
          )}
          {typeof est.postpress === "number" && est.postpress > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Постпечать</span><span className="tabular-nums">{fmtKzt(est.postpress)}</span></div>
          )}
          {typeof est.total === "number" && (
            <div className="flex justify-between font-medium border-t pt-1 mt-1"><span>Себестоимость</span><span className="tabular-nums">{fmtKzt(est.total)}</span></div>
          )}
          {typeof est.sale_price === "number" && (
            <div className="flex justify-between font-semibold text-primary"><span>Продажа</span><span className="tabular-nums">{fmtKzt(est.sale_price)}</span></div>
          )}
        </div>
      )}
      {order.cost_breakdown && order.cost_breakdown.length > 0 && (
        <ul className="px-3 pb-2 text-[11px] text-muted-foreground space-y-0.5">
          {order.cost_breakdown.slice(0, 4).map((s, i) => <li key={i}>• {s}</li>)}
        </ul>
      )}
      {order.notes && (
        <div className="px-3 pb-2 text-[11px] italic text-muted-foreground">{order.notes}</div>
      )}
      <div className="px-3 py-2 border-t bg-muted/20">
        <Button size="sm" className="w-full gap-1.5" onClick={openInCalculator}>
          Открыть в калькуляторе <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ChatWindow({ threadId, initialMessages, onTitleSuggested }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build short history for AI gateway (text only).
  const history = useMemo(
    () =>
      messages.flatMap((m) => {
        const txt = m.parts
          .map((p) => (p.type === "text" ? p.text : p.type === "proposed_order" ? `[предложение: ${JSON.stringify(p.order)}]` : ""))
          .join("\n")
          .trim();
        return txt ? [{ role: m.role, content: txt }] : [];
      }),
    [messages],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

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

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !user) return;
    setInput("");
    setLoading(true);

    const userMsgLocal: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text }],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsgLocal]);

    const saved = await persistMessage({ role: "user", parts: userMsgLocal.parts });
    if (saved) {
      setMessages((prev) => prev.map((m) => (m.id === userMsgLocal.id ? { ...m, id: saved.id, created_at: saved.created_at } : m)));
    }

    // If first user message — suggest a title
    if (messages.length === 0) {
      const suggested = text.slice(0, 60);
      onTitleSuggested?.(suggested);
      await supabase.from("ai_threads").update({ title: suggested }).eq("id", threadId);
    } else {
      await supabase.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }

    try {
      const { data, error } = await supabase.functions.invoke("ai-calc-chat", {
        body: { text, history },
      });
      if (error) throw error;
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
        setMessages((prev) => prev.map((m) => (m.id === aMsg.id ? { ...m, id: savedA.id, created_at: savedA.created_at } : m)));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("rate_limit")) toast.error("Слишком много запросов. Подождите немного.");
      else if (msg.includes("credits")) toast.error("Закончились кредиты ИИ. Пополните в настройках.");
      else toast.error("ИИ не ответил. Попробуйте ещё раз.");
      logDataIssue("ai-calc:invoke", e as never);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const examples = [
    "Посчитай 1000 листовок А5 4+4 на мелованной 130",
    "Визитки 90×50, 4+0, 500 шт, дизайнерская 300",
    "Флаер А6, 4+4, 5000 шт, матовая ламинация",
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-5rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-md mx-auto text-center py-10 space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Опишите заказ словами</h2>
              <p className="text-xs text-muted-foreground mt-1">
                ИИ задаст уточнения и предложит готовую карточку для калькулятора.
              </p>
            </div>
            <div className="space-y-1.5">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] sm:max-w-[75%]", m.role === "user" ? "" : "w-full")}>
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  <div
                    key={i}
                    className={cn(
                      "text-sm",
                      m.role === "user"
                        ? "rounded-2xl px-3.5 py-2 bg-primary text-primary-foreground"
                        : "prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 text-foreground",
                    )}
                  >
                    {m.role === "assistant" ? <ReactMarkdown>{p.text}</ReactMarkdown> : p.text}
                  </div>
                ) : (
                  <ProposedOrderCard key={i} order={p.order} />
                ),
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> ИИ думает…
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-card/80 backdrop-blur p-3 safe-bottom">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            rows={1}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Опишите заказ или задайте вопрос…"
            className="resize-none min-h-[44px] max-h-32 text-sm"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}