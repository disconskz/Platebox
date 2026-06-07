import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { evalFormula } from "@/lib/operations/formula";
import { TEMPLATE_OP_MAP, type TemplateOpKey } from "@/lib/operations/templateOpsMap";

interface CatalogOp { code: number; name: string; category: string }
interface WorkItem  { code: number; name: string; operation_code: number; price_source: string; quantity_source: string; sort_order: number }
interface ParamRow  { code: number; name: string; operation_code: number; default_value: string; formula: string; sort_order: number }

export interface HandbookLine {
  stage: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  /** 'handbook' — посчитано по формуле справочника, 'default' — захардкоженный fallback. */
  source: "handbook" | "default";
  /** Детализация расчёта (переменные, формулы) — для раскрывающегося блока в спецификации. */
  details?: Array<{ label: string; value: string }>;
}

interface Ctx {
  ready: boolean;
  /**
   * Считает встроенную операцию шаблона по формуле из справочника.
   * Возвращает массив строк (одна операция → несколько work_items)
   * или null, если справочник не загружен / формул нет / переменных не хватает.
   */
  priceOp: (opKey: TemplateOpKey, ctx: Record<string, number>) => HandbookLine[] | null;
}

const HandbookCtx = createContext<Ctx>({ ready: false, priceOp: () => null });

export function HandbookProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogOp[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [params, setParams] = useState<ParamRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [cR, wR, pR] = await Promise.all([
        supabase.from("operation_catalog").select("code,name,category"),
        supabase.from("operation_work_items").select("code,name,operation_code,price_source,quantity_source,sort_order"),
        supabase.from("operation_parameters").select("code,name,operation_code,default_value,formula,sort_order"),
      ]);
      if (!active) return;
      setCatalog(((cR.data as any) || []) as CatalogOp[]);
      setWorkItems(((wR.data as any) || []) as WorkItem[]);
      setParams(((pR.data as any) || []) as ParamRow[]);
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready,
    priceOp: (opKey, vars) => {
      if (!ready) return null;
      const def = TEMPLATE_OP_MAP[opKey];
      if (!def) return null;
      const op = catalog.find((c) => c.code === def.code);
      if (!op) return null;
      const wis = workItems
        .filter((w) => w.operation_code === def.code)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (!wis.length) return null;

      // Контекст с алиасами регистра/синонимов «ТИРАЖ».
      const ctx: Record<string, number> = { ...vars };
      if (vars["ТИРАЖ"] !== undefined) {
        ctx["Тираж"] = ctx["Тираж"] ?? vars["ТИРАЖ"];
        ctx["тираж"] = ctx["тираж"] ?? vars["ТИРАЖ"];
      }
      if (vars["Тираж"] !== undefined && ctx["ТИРАЖ"] === undefined) ctx["ТИРАЖ"] = vars["Тираж"];

      // Производные параметры с формулами — досчитываем итеративно.
      const ps = params.filter((p) => p.operation_code === def.code);
      for (let i = 0; i < 4; i++) {
        let changed = false;
        for (const p of ps) {
          if (ctx[p.name] !== undefined) continue;
          if (p.formula?.trim()) {
            const r = evalFormula(p.formula, ctx);
            if (r.ok) { ctx[p.name] = r.value; changed = true; }
          }
        }
        if (!changed) break;
      }

      const out: HandbookLine[] = [];
      // Сводка переменных, использованных в расчёте — пригодится в детализации.
      const usedVars: Array<{ label: string; value: string }> = Object.entries(ctx)
        .filter(([, v]) => Number.isFinite(v))
        .map(([k, v]) => ({ label: k, value: String(Math.round((v as number) * 100) / 100) }));
      for (const w of wis) {
        const q = evalFormula(w.quantity_source, ctx);
        const pr = evalFormula(w.price_source, ctx);
        // Если в формуле есть переменные, которых нет в ctx и нет дефолта — считаем,
        // что справочник не сконфигурирован для шаблона, и пусть сработает fallback.
        if (!q.ok || !pr.ok) return null;
        const qty = q.value;
        const price = pr.value;
        if (qty === 0 && price === 0) continue; // пустая строка — пропустим
        const details: Array<{ label: string; value: string }> = [
          { label: "Источник", value: `Справочник · ${op.name}` },
          { label: "Формула кол-ва", value: `${w.quantity_source} = ${Math.round(qty * 100) / 100}` },
          { label: "Формула цены", value: `${w.price_source} = ${Math.round(price * 100) / 100}` },
          ...usedVars.map((v) => ({ label: `пер. ${v.label}`, value: v.value })),
        ];
        out.push({
          stage: def.stage,
          name: `${op.name} — ${w.name}`,
          qty: Math.round(qty * 100) / 100,
          unit: "ед.",
          price: Math.round(price * 100) / 100,
          total: Math.round(qty * price * 100) / 100,
          source: "handbook",
          details,
        });
      }
      if (!out.length) return null;
      return out;
    },
  }), [ready, catalog, workItems, params]);

  return <HandbookCtx.Provider value={value}>{children}</HandbookCtx.Provider>;
}

export function useHandbook() {
  return useContext(HandbookCtx);
}