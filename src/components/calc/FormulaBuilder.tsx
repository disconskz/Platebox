import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Token, tokensToAst, astToTokens } from "@/lib/calc/variants/tokens";
import { FormulaNode, VARIABLE_LIST, VARIABLE_KEYS, CalcConstant } from "@/lib/calc/variants/types";
import { evalFormula, collectRefs } from "@/lib/calc/variants/engine";

interface Props {
  value: FormulaNode;
  onChange: (next: FormulaNode) => void;
  constants: CalcConstant[];
  testVars?: Record<string, number>;
  testConsts?: Record<string, number>;
}

const OPS: Array<{ value: "+" | "-" | "*" | "/"; label: string }> = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "*", label: "×" },
  { value: "/", label: "÷" },
];
const FNS: Array<"min" | "max" | "ceil" | "floor" | "round" | "abs"> = ["min", "max", "ceil", "floor", "round", "abs"];

export default function FormulaBuilder({ value, onChange, constants, testVars = {}, testConsts = {} }: Props) {
  const [tokens, setTokens] = useState<Token[]>(() => astToTokens(value));
  const [error, setError] = useState<string | null>(null);
  const [numDraft, setNumDraft] = useState("");

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