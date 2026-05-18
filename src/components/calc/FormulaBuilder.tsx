import { useEffect, useMemo, useState } from "react";
import { X, Plus, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Token, tokensToAst, astToTokens, parseExpression } from "@/lib/calc/variants/tokens";
import { FormulaNode, VARIABLE_LIST, VARIABLE_KEYS, CalcConstant } from "@/lib/calc/variants/types";
import { evalFormula, collectRefs } from "@/lib/calc/variants/engine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { upsertConstant } from "@/lib/calc/variants/api";

interface Props {
  value: FormulaNode;
  onChange: (next: FormulaNode) => void;
  constants: CalcConstant[];
  testVars?: Record<string, number>;
  testConsts?: Record<string, number>;
  /** Колбэк после автосоздания констант — родитель может перезагрузить список. */
  onConstantsChanged?: () => void;
}

const OPS: Array<{ value: "+" | "-" | "*" | "/"; label: string }> = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "*", label: "×" },
  { value: "/", label: "÷" },
];
const FNS: Array<"min" | "max" | "ceil" | "floor" | "round" | "abs"> = ["min", "max", "ceil", "floor", "round", "abs"];

export default function FormulaBuilder({ value, onChange, constants, testVars = {}, testConsts = {}, onConstantsChanged }: Props) {
  const [tokens, setTokens] = useState<Token[]>(() => astToTokens(value));
  const [error, setError] = useState<string | null>(null);
  const [numDraft, setNumDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ expression: string; explanation?: string; new_constants?: Array<{ slug: string; name: string; value: number; unit?: string }> } | null>(null);

  // sync upstream
  useEffect(() => {
    try {
      const ast = tokensToAst(tokens);
      setError(null);
      onChange(ast);
    } catch (e: any) {
      setError(e.message || "Ошибка формулы");
    }
     
  }, [tokens]);

  const preview = useMemo(() => {
    try {
      const ast = tokensToAst(tokens);
      return evalFormula(ast, { vars: testVars, consts: testConsts });
    } catch {
      return null;
    }
  }, [tokens, testVars, testConsts]);

  const push = (t: Token) => setTokens((arr) => [...arr, t]);
  const removeAt = (i: number) => setTokens((arr) => arr.filter((_, idx) => idx !== i));

  const constsBySlug = useMemo(() => Object.fromEntries(constants.map((c) => [c.slug, c])), [constants]);

  const runAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: {
          mode: "generate-formula",
          description: aiPrompt,
          variables: VARIABLE_LIST.map((v) => v.key),
          constants: constants.map((c) => ({ slug: c.slug, name: c.name })),
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Ошибка ИИ");
      setAiResult({ expression: data.expression, explanation: data.explanation, new_constants: data.new_constants });
    } catch (e: any) {
      toast.error(e?.message || "Не удалось сгенерировать формулу");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAi = async () => {
    if (!aiResult) return;
    try {
      // создать недостающие константы
      for (const c of aiResult.new_constants || []) {
        if (!c?.slug) continue;
        if (constsBySlug[c.slug]) continue;
        await upsertConstant({ slug: c.slug, name: c.name || c.slug, value: Number(c.value) || 0, unit: c.unit || "₸", description: "", sort_order: 0 });
      }
      const newTokens = parseExpression(aiResult.expression);
      // sanity: формула должна собираться
      tokensToAst(newTokens);
      setTokens(newTokens);
      onConstantsChanged?.();
      setAiOpen(false);
      setAiPrompt("");
      setAiResult(null);
      toast.success("Формула применена");
    } catch (e: any) {
      toast.error("Не удалось применить: " + (e?.message || e));
    }
  };

  // Валидация переменных и констант: ищем ссылки на неизвестные имена.
  const issues = useMemo(() => {
    try {
      const ast = tokensToAst(tokens);
      const refs = collectRefs(ast);
      const unknownVars = [...refs.vars].filter((v) => !VARIABLE_KEYS.has(v));
      const unknownConsts = [...refs.consts].filter((s) => !constsBySlug[s]);
      return { unknownVars, unknownConsts };
    } catch {
      return { unknownVars: [], unknownConsts: [] };
    }
  }, [tokens, constsBySlug]);
  const hasIssues = issues.unknownVars.length > 0 || issues.unknownConsts.length > 0;

  return (
    <div className="space-y-2">
      <div className={cn("min-h-[48px] rounded-md border bg-card px-2 py-2 flex flex-wrap gap-1 items-center", error && "border-destructive")}>
        {tokens.length === 0 && <span className="text-xs text-muted-foreground px-1">Соберите формулу из кнопок ниже…</span>}
        {tokens.map((t, i) => (
          <Chip key={i} token={t} constName={t.kind === "const" ? constsBySlug[t.value]?.name : undefined} onRemove={() => removeAt(i)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Variables */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3" /> Переменная</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="max-h-60 overflow-y-auto">
              {VARIABLE_LIST.map((v) => (
                <button key={v.key} type="button"
                  onClick={() => push({ kind: "var", value: v.key })}
                  className="w-full text-left rounded px-2 py-1.5 hover:bg-accent">
                  <div className="text-sm font-medium">{v.label}</div>
                  <div className="text-[11px] text-muted-foreground">{v.key} — {v.hint}</div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Constants */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3" /> Константа</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="max-h-60 overflow-y-auto">
              {constants.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Нет констант. Добавьте в справочнике «Константы».</div>}
              {constants.map((c) => (
                <button key={c.slug} type="button"
                  onClick={() => push({ kind: "const", value: c.slug })}
                  className="w-full text-left rounded px-2 py-1.5 hover:bg-accent">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.slug} = {c.value} {c.unit}</div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Number */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3" /> Число</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <form onSubmit={(e) => { e.preventDefault(); const n = Number(numDraft); if (Number.isFinite(n)) { push({ kind: "num", value: n }); setNumDraft(""); } }}>
              <Input autoFocus type="number" step="any" value={numDraft} onChange={(e) => setNumDraft(e.target.value)} placeholder="Введите число" className="h-8 text-sm" />
              <Button type="submit" size="sm" className="mt-2 w-full h-8">Добавить</Button>
            </form>
          </PopoverContent>
        </Popover>

        {/* Operators */}
        <div className="flex gap-1">
          {OPS.map((o) => (
            <Button key={o.value} type="button" size="sm" variant="outline" className="h-8 w-8 p-0 font-mono"
              onClick={() => push({ kind: "op", value: o.value })}>{o.label}</Button>
          ))}
        </div>

        {/* Parens & functions */}
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => push({ kind: "lparen" })}>(</Button>
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => push({ kind: "rparen" })}>)</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8">fn ▾</Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            {FNS.map((f) => (
              <button key={f} type="button"
                onClick={() => { push({ kind: "fn", value: f }); push({ kind: "lparen" }); }}
                className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent font-mono">{f}(…)</button>
            ))}
            <button type="button" onClick={() => push({ kind: "comma" })} className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent">,&nbsp; (разделитель)</button>
          </PopoverContent>
        </Popover>

        <Button type="button" size="sm" variant="ghost" className="h-8 ml-auto" onClick={() => setTokens([])}><X className="h-3.5 w-3.5" /> Очистить</Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => setAiOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" /> ИИ
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-muted-foreground">Предпросмотр: <span className="text-foreground font-medium tabular-nums">{preview === null ? "—" : preview.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</span></span>
        )}
        {!error && hasIssues && (
          <span className="text-destructive">
            {issues.unknownVars.length > 0 && <>Неизвестные переменные: {issues.unknownVars.join(", ")}. </>}
            {issues.unknownConsts.length > 0 && <>Неизвестные константы: {issues.unknownConsts.map((s) => "@" + s).join(", ")}.</>}
          </span>
        )}
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Сгенерировать формулу</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              autoFocus
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Например: резка стоит 500 ₸ за рез, количество резов = тираж / приладка"
            />
            <div className="text-[11px] text-muted-foreground">
              Доступные переменные: {VARIABLE_LIST.map((v) => v.key).join(", ")}.
            </div>
            {aiResult && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Выражение:</div>
                <code className="block text-sm font-mono break-all">{aiResult.expression}</code>
                {aiResult.explanation && <div className="text-xs text-muted-foreground">{aiResult.explanation}</div>}
                {aiResult.new_constants && aiResult.new_constants.length > 0 && (
                  <div className="text-xs">
                    <div className="text-muted-foreground mb-1">Будут созданы константы:</div>
                    <ul className="space-y-0.5">
                      {aiResult.new_constants.map((c) => (
                        <li key={c.slug}>• @{c.slug} — {c.name} = {c.value} {c.unit || "₸"}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!aiResult ? (
              <Button type="button" onClick={runAi} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Генерация…</> : <><Sparkles className="h-4 w-4 mr-1" /> Сгенерировать</>}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setAiResult(null)}>Переделать</Button>
                <Button type="button" onClick={applyAi}>Применить</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ token, constName, onRemove }: { token: Token; constName?: string; onRemove: () => void }) {
  let label = "";
  let cls = "bg-muted text-foreground";
  switch (token.kind) {
    case "num":    label = String(token.value); cls = "bg-muted text-foreground"; break;
    case "var":    label = token.value; cls = "bg-primary/10 text-primary border border-primary/20"; break;
    case "const":  label = "@" + (constName || token.value); cls = "bg-success/10 text-success border border-success/20"; break;
    case "op":     label = token.value === "*" ? "×" : token.value === "/" ? "÷" : token.value === "-" ? "−" : "+"; cls = "bg-foreground/5 text-foreground font-mono"; break;
    case "fn":     label = token.value; cls = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono"; break;
    case "lparen": label = "("; cls = "bg-foreground/5 text-muted-foreground font-mono"; break;
    case "rparen": label = ")"; cls = "bg-foreground/5 text-muted-foreground font-mono"; break;
    case "comma":  label = ","; cls = "bg-foreground/5 text-muted-foreground font-mono"; break;
  }
  return (
    <button type="button" onClick={onRemove}
      className={cn("group inline-flex items-center gap-1 rounded px-2 py-1 text-xs", cls)}
      title="Удалить">
      <span>{label}</span>
      <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
    </button>
  );
}