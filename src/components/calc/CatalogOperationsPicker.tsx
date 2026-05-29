import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Plus, AlertCircle, ChevronsUpDown } from "lucide-react";
import { useState as useReactState } from "react";
import { evalFormula, extractVariables, parseDefault } from "@/lib/operations/formula";
import type { SpecItem } from "@/lib/calc/types";

interface CatalogOp {
  code: number;
  name: string;
  category: string;
}

interface WorkItem {
  code: number;
  name: string;
  operation_code: number;
  price_source: string;
  quantity_source: string;
  sort_order: number;
}

interface ParamRow {
  code: number;
  name: string;
  operation_code: number;
  default_value: string;
  formula: string;
  sort_order: number;
}

interface SelectedOp {
  id: string; // uniq instance id
  operationCode: number;
  /** значения параметров: имя → число */
  values: Record<string, number>;
}

interface Props {
  circulation: number;
  /** Каждая выбранная операция превращается в N строк SpecItem (по числу work_items). */
  onChange: (items: SpecItem[]) => void;
}

export function CatalogOperationsPicker({ circulation, onChange }: Props) {
  const [catalog, setCatalog] = useState<CatalogOp[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [params, setParams] = useState<ParamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedOp[]>([]);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cR, wR, pR] = await Promise.all([
        supabase.from("operation_catalog").select("code,name,category").order("name"),
        supabase.from("operation_work_items").select("code,name,operation_code,price_source,quantity_source,sort_order"),
        supabase.from("operation_parameters").select("code,name,operation_code,default_value,formula,sort_order"),
      ]);
      setCatalog(((cR.data as any) || []) as CatalogOp[]);
      setWorkItems(((wR.data as any) || []) as WorkItem[]);
      setParams(((pR.data as any) || []) as ParamRow[]);
      setLoading(false);
    })();
  }, []);

  /** Операции, у которых есть хоть один work_item — только они могут быть посчитаны. */
  const calculableCatalog = useMemo(() => {
    const codes = new Set(workItems.map((w) => w.operation_code));
    return catalog.filter((c) => codes.has(c.code));
  }, [catalog, workItems]);

  /** Пересборка SpecItem[] и проброс наверх при любых изменениях. */
  useEffect(() => {
    const items: SpecItem[] = [];
    for (const sel of selected) {
      const op = catalog.find((c) => c.code === sel.operationCode);
      if (!op) continue;
      const wis = workItems.filter((w) => w.operation_code === sel.operationCode).sort((a, b) => a.sort_order - b.sort_order);
      const ctx: Record<string, number> = { ...sel.values, "ТИРАЖ": circulation };
      // Параметры с готовыми формулами (производные) — досчитываем итеративно.
      const ps = params.filter((p) => p.operation_code === sel.operationCode);
      for (let i = 0; i < 4; i++) {
        let changed = false;
        for (const p of ps) {
          if (ctx[p.name] !== undefined) continue;
          if (p.formula && p.formula.trim()) {
            const r = evalFormula(p.formula, ctx);
            if (r.ok) {
              ctx[p.name] = r.value;
              changed = true;
            }
          }
        }
        if (!changed) break;
      }
      for (const w of wis) {
        const q = evalFormula(w.quantity_source, ctx);
        const pr = evalFormula(w.price_source, ctx);
        const qty = q.value;
        const price = pr.value;
        const total = qty * price;
        items.push({
          stage: (op.category as any) || "postpress",
          name: `${op.name} — ${w.name}`,
          quantity: Math.round(qty * 100) / 100,
          unit: "ед.",
          unitPrice: Math.round(price * 100) / 100,
          total: Math.round(total * 100) / 100,
        });
      }
    }
    onChange(items);
  }, [selected, catalog, workItems, params, circulation, onChange]);

  const addOp = (code: number) => {
    const op = catalog.find((c) => c.code === code);
    if (!op) return;
    const ps = params.filter((p) => p.operation_code === code);
    const ctx: Record<string, number> = { "ТИРАЖ": circulation };
    const values: Record<string, number> = {};
    // Заполняем числовые/тиражные дефолты сразу — пользователь сможет переопределить.
    for (const p of ps) {
      if (p.formula && p.formula.trim()) continue;
      const d = parseDefault(p.default_value, ctx);
      if (d !== null && Number.isFinite(d)) values[p.name] = d;
    }
    setSelected((s) => [...s, { id: crypto.randomUUID(), operationCode: code, values }]);
  };

  const removeOp = (id: string) => {
    setSelected((s) => s.filter((x) => x.id !== id));
  };

  const updateValue = (id: string, name: string, value: number) => {
    setSelected((s) =>
      s.map((x) => (x.id === id ? { ...x, values: { ...x.values, [name]: value } } : x))
    );
  };

  if (loading) return <div className="text-sm text-muted-foreground">Загрузка справочника операций…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
              <span className="text-muted-foreground truncate">Добавить операцию из справочника…</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Поиск операции…" value={query} onValueChange={setQuery} />
              <CommandList className="max-h-[360px]">
                <CommandEmpty>Ничего не найдено</CommandEmpty>
                <CommandGroup>
                  {(() => {
                    const q = query.trim().toLowerCase();
                    const list = q
                      ? calculableCatalog.filter((op) => op.name.toLowerCase().includes(q))
                      : calculableCatalog;
                    return list.map((op) => (
                      <CommandItem
                        key={op.code}
                        value={`${op.code}-${op.name}`}
                        onSelect={() => {
                          addOp(op.code);
                          setPickerOpen(false);
                          setQuery("");
                        }}
                      >
                        {op.name}
                      </CommandItem>
                    ));
                  })()}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Plus className="h-4 w-4 text-muted-foreground" />
      </div>
      {!calculableCatalog.length && (
        <p className="text-xs text-muted-foreground">В справочнике пока нет операций с заполненными формулами.</p>
      )}
      {selected.map((sel) => {
        const op = catalog.find((c) => c.code === sel.operationCode);
        if (!op) return null;
        const wis = workItems.filter((w) => w.operation_code === sel.operationCode);
        // Соберём входные переменные: из всех work_items и из формул параметров.
        const ps = params.filter((p) => p.operation_code === sel.operationCode);
        const userInputs = ps.filter((p) => !p.formula || !p.formula.trim()).filter((p) => p.name !== "ТИРАЖ");
        const ctx: Record<string, number> = { ...sel.values, "ТИРАЖ": circulation };
        for (let i = 0; i < 4; i++) {
          for (const p of ps) {
            if (ctx[p.name] !== undefined) continue;
            if (p.formula?.trim()) {
              const r = evalFormula(p.formula, ctx);
              if (r.ok) ctx[p.name] = r.value;
            }
          }
        }
        const subtotal = wis.reduce((s, w) => {
          const q = evalFormula(w.quantity_source, ctx).value;
          const pr = evalFormula(w.price_source, ctx).value;
          return s + q * pr;
        }, 0);
        return (
          <div key={sel.id} className="rounded-md border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{op.name}</div>
              <Button variant="ghost" size="sm" onClick={() => removeOp(sel.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {userInputs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {userInputs.map((p) => (
                  <div key={p.code}>
                    <Label className="text-xs">{p.name}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={Number.isFinite(sel.values[p.name]) ? sel.values[p.name] : ""}
                      onChange={(e) => updateValue(sel.id, p.name, parseFloat(e.target.value) || 0)}
                      placeholder={p.default_value || "0"}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1 text-xs">
              {wis.map((w) => {
                const q = evalFormula(w.quantity_source, ctx);
                const pr = evalFormula(w.price_source, ctx);
                const total = q.value * pr.value;
                const broken = !q.ok || !pr.ok;
                return (
                  <div key={w.code} className="flex items-center justify-between gap-2 border-t pt-1">
                    <span className="text-muted-foreground flex-1 truncate">
                      {w.name}
                      {broken && (
                        <AlertCircle className="inline h-3 w-3 ml-1 text-warning" aria-label="Формула не подсчитана автоматически" />
                      )}
                    </span>
                    <span className="tabular-nums">
                      {q.value.toFixed(2)} × {pr.value.toFixed(2)} = <span className="font-medium text-foreground">{total.toFixed(0)} ₸</span>
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Итого по операции</span>
                <span className="tabular-nums">{subtotal.toFixed(0)} ₸</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}