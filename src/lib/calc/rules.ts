import { supabase } from "@/integrations/supabase/client";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { DEFAULTS } from "./types";
import type { CutRulesData } from "./engine";

export type CalcRules = typeof DEFAULTS;

const KEY_MAP: Record<string, keyof CalcRules> = {
  "rule.layout.marginTop": "marginTop",
  "rule.layout.marginBottom": "marginBottom",
  "rule.layout.marginLeft": "marginLeft",
  "rule.layout.marginRight": "marginRight",
  "rule.layout.bleed": "bleed",
  "rule.layout.stickerGap": "stickerGap",
  "rule.layout.stickerEdge": "stickerEdge",
  "rule.setup.setupOwn": "setupOwn",
  "rule.setup.setupForeign": "setupForeign",
  "rule.setup.setupPercent": "setupPercent",
  "rule.setup.bagMinSetup": "bagMinSetup",
  "rule.price.formCost": "formCost",
  "rule.price.formPrepCost": "formPrepCost",
  "rule.price.cutCostPerSheet": "cutCostPerSheet",
  "rule.price.finishCutCost": "finishCutCost",
  "rule.price.numberingCost": "numberingCost",
  "rule.price.designCost": "designCost",
  "rule.price.stampingSetup": "stampingSetup",
  "rule.price.stampingClicheMin": "stampingClicheMin",
  "rule.price.stampingClichePerCm2": "stampingClichePerCm2",
  "rule.price.stampingImpr": "stampingImpr",
  "rule.price.stampingImprNotebook": "stampingImprNotebook",
  "rule.price.operationSetupCost": "operationSetupCost",
  "rule.formats.maxPrintW": "maxPrintW",
  "rule.formats.maxPrintH": "maxPrintH",
  "rule.formats.altPrintW": "altPrintW",
  "rule.formats.altPrintH": "altPrintH",
};

export const RULE_KEY_MAP = KEY_MAP;

export async function loadCalcRules(): Promise<CalcRules> {
  await ensureSupabaseSession();
  const { data } = await (supabase as any)
    .from("system_settings")
    .select("key,value")
    .like("key", "rule.%");
  const rules: CalcRules = { ...DEFAULTS };
  for (const row of (data as { key: string; value: string }[]) || []) {
    const field = KEY_MAP[row.key];
    if (!field) continue;
    const num = Number(row.value);
    if (!Number.isNaN(num)) (rules as any)[field] = num;
  }
  return rules;
}

/** Загружает таблицу «Резы: печатный → конечный» и константу «Цена реза печатного листа». */
export async function loadCutRules(): Promise<CutRulesData> {
  await ensureSupabaseSession();
  const [rulesRes, constRes] = await Promise.all([
    (supabase as any).from("cut_count_rules").select("print_format,item_format,cuts"),
    (supabase as any).from("calc_constants").select("slug,value").eq("slug", "cut_price_per_print").maybeSingle(),
  ]);
  const table: Record<string, number> = {};
  for (const r of (rulesRes.data as { print_format: string; item_format: string; cuts: number }[]) || []) {
    const cuts = Number(r.cuts);
    if (!Number.isFinite(cuts) || cuts < 0) continue;
    table[`${r.print_format}|${r.item_format}`] = cuts;
  }
  const price = Number((constRes.data as any)?.value);
  return { pricePerCut: Number.isFinite(price) && price > 0 ? price : 1, table };
}