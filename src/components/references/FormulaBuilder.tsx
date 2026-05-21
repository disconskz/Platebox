import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, AlertTriangle, Eraser } from "lucide-react";
import { HelpCircle, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Token,
  BuilderConst,
  BuilderVar,
  tokensToString,
  stringToTokens,
  tokenLabel,
  validateTokens,
  previewValue,
} from "@/lib/operations/formula-builder";

interface Props {
  open: boolean;
  title: string;
  initialValue: string;
  variables: BuilderVar[];
  constants: BuilderConst[];
  onClose: () => void;
  onSave: (value: string) => void;
}

const SPECIAL_VARS = ["ТИРАЖ", "ПРЕДЫДУЩЕЕ ЗНАЧЕНИЕ"];

export function FormulaBuilder({ open, title, initialValue, variables, constants, onClose, onSave }: Props) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState("");
  const [numInput, setNumInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const parsed = stringToTokens(initialValue || "", constants);
    if (parsed === null) {
      setRawMode(true);
      setRawText(initialValue || "");
      setTokens([]);
    } else {
      setRawMode(false);
      setRawText("");
      setTokens(parsed);
    }
    setNumInput("");
  }, [open, initialValue, constants]);

  const allVars = useMemo(() => {
    const m = new Map<string, BuilderVar>();
    for (const n of SPECIAL_VARS) m.set(n, { name: n });
    for (const v of variables) if (!m.has(v.name)) m.set(v.name, v);
    return [...m.values()];
  }, [variables]);

  const validation = validateTokens(tokens);
  const preview = previewValue(tokens, variables);

  const append = (t: Token) => setTokens((s) => [...s, t]);
  const removeAt = (i: number) => setTokens((s) => s.filter((_, idx) => idx !== i));
  const clear = () => setTokens([]);
  const backspace = () => setTokens((s) => s.slice(0, -1));

  const addVar = (name: string) => append({ kind: "var", name });
  const addConst = (slug: string) => {
    const c = constants.find((x) => x.slug === slug);
    if (!c) return;
    append({ kind: "const", slug: c.slug, value: c.value, label: c.name });
  };
  const addNum = () => {
    const v = parseFloat(numInput.replace(",", "."));
    if (Number.isFinite(v)) {
      append({ kind: "num", value: v });
      setNumInput("");
    }
  };
  const addOp = (op: "+" | "-" | "*" | "/" | "(" | ")") => append({ kind: "op", op });

  const handleSave = () => {
    if (rawMode) {
      onSave(rawText.trim());
      return;
    }
    if (!validation.ok) return;
    onSave(tokensToString(tokens));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Помощь">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  Формула = последовательность значений и операторов.
                  <br />Например: <code>[Количество ударов] × 30 + 5000</code>.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Соберите формулу из переменных, констант и чисел. При сохранении она преобразуется в текстовый вид.
          </DialogDescription>
        </DialogHeader>

        <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full flex items-center justify-between rounded-md border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200 hover:bg-amber-50">
              <span className="inline-flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Как составлять формулы</span>
              <span className="text-[10px] opacity-70">{helpOpen ? "скрыть" : "показать"}</span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="text-xs space-y-1.5 px-2.5 py-2 border-x border-b rounded-b-md bg-card -mt-px">
            <p><b>Переменная</b> — значение, которое появится при расчёте конкретного заказа: количество ударов, площадь, тираж и т.д. Вставляется в виде чипа <code>[Имя]</code>.</p>
            <p><b>Спецтокены</b>: <code>[ТИРАЖ]</code> — общий тираж заказа из калькулятора; <code>[ПРЕДЫДУЩЕЕ ЗНАЧЕНИЕ]</code> — результат предыдущего шага в цепочке.</p>
            <p><b>Константа</b> — общее число из справочника «Константы» (цена оттиска, цена формы и т.п.). При сохранении подставляется текущим значением.</p>
            <p><b>Число</b> — постоянная величина прямо в формуле (например <code>5000</code> за приладку).</p>
            <p><b>Операторы</b>: <code>+</code> сложение, <code>−</code> вычитание, <code>×</code> умножение, <code>÷</code> деление. Используйте <code>(</code> и <code>)</code>, чтобы задать порядок: сначала считается то, что в скобках.</p>
            <p className="text-muted-foreground">Примеры: <code>[Площадь, см²] × 200</code> · <code>([ТИРАЖ] ÷ 1000) × 30 + 5000</code> · <code>[Кол-во оттисков] × [Цена оттиска]</code>.</p>
            <p className="text-muted-foreground">Снизу видна строка-результат и проверка при ТИРАЖ = 1000 — если она «не вычислено», какой-то переменной не хватает значения по умолчанию.</p>
          </CollapsibleContent>
        </Collapsible>

        {rawMode ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Эта формула содержит конструкции, которые конструктор пока не поддерживает (например, <code>CASE WHEN</code> или <code>cast(...)</code>). Можно отредактировать текстом или очистить и собрать заново.
              </div>
            </div>
            <textarea
              className="w-full min-h-[120px] rounded-md border bg-background p-2 font-mono text-xs"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <Button variant="ghost" size="sm" onClick={() => { setRawMode(false); setRawText(""); setTokens([]); }}>
              <Eraser className="h-3 w-3 mr-1" /> Очистить и собрать в конструкторе
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Превью-чипы */}
            <div className="min-h-[64px] rounded-md border bg-muted/30 p-2 flex flex-wrap gap-1.5 items-center">
              {!tokens.length && <span className="text-xs text-muted-foreground">Пусто — добавьте первый элемент ниже</span>}
              {tokens.map((t, i) => (
                <Badge
                  key={i}
                  variant={t.kind === "op" ? "outline" : t.kind === "var" ? "default" : t.kind === "const" ? "secondary" : "outline"}
                  className="gap-1 pr-1 cursor-default"
                >
                  {tokenLabel(t)}
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="ml-0.5 rounded-sm hover:bg-background/30 p-0.5"
                    aria-label="Удалить"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Кнопки операторов */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-muted-foreground mr-1">Оператор:</span>
              {(["+", "-", "*", "/", "(", ")"] as const).map((op) => (
                <Button key={op} type="button" variant="outline" size="sm" onClick={() => addOp(op)} className="w-9 font-mono">
                  {op === "*" ? "×" : op === "/" ? "÷" : op}
                </Button>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={backspace}>⌫</Button>
              <Button type="button" variant="ghost" size="sm" onClick={clear}>Очистить</Button>
            </div>

            {/* Добавление значений */}
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Переменная</Label>
                <Select value="" onValueChange={addVar}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="+ переменная" /></SelectTrigger>
                  <SelectContent>
                    {allVars.map((v) => (
                      <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Константа</Label>
                <Select value="" onValueChange={addConst}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="+ константа" /></SelectTrigger>
                  <SelectContent>
                    {constants.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name} ({c.value})</SelectItem>
                    ))}
                    {!constants.length && <div className="px-2 py-1 text-xs text-muted-foreground">Нет констант</div>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Число</Label>
                <div className="flex gap-1">
                  <Input
                    className="h-8 text-xs"
                    value={numInput}
                    onChange={(e) => setNumInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNum(); } }}
                    placeholder="100"
                    inputMode="decimal"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addNum}>+</Button>
                </div>
              </div>
            </div>

            {/* Превью */}
            <div className="rounded-md border bg-card p-2 text-xs space-y-1">
              <div className="text-muted-foreground">Строка формулы:</div>
              <div className="font-mono break-all">{tokensToString(tokens) || <span className="text-muted-foreground">—</span>}</div>
              {!validation.ok && (
                <div className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {validation.error}</div>
              )}
              {validation.ok && tokens.length > 0 && (
                <div className="text-muted-foreground">
                  Проверка (ТИРАЖ=1000{variables.filter((v) => v.preview != null).map((v) => `, ${v.name}=${v.preview}`).join("")}):{" "}
                  <span className={preview.ok ? "text-foreground font-medium" : "text-amber-600"}>
                    {preview.ok ? preview.value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "не вычислено"}
                  </span>
                  {preview.missing.length > 0 && (
                    <span className="text-amber-600"> (нет: {preview.missing.join(", ")})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={!rawMode && !validation.ok}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}