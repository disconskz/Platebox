import type { BoxPriceResult } from "@/components/calc/BoxPriceBreakdown";

/**
 * Унифицированная строка стоимости шаблонных калькуляторов.
 * Названия этапов могут быть как русскими ("Препресс", "Материалы", "Печать",
 * "Постпечать", "Сборка", "Скрепление", "Логистика", "Тиражные", "Подложка",
 * "Подложка/Сборка"…), так и английскими ("prepress"|"material"|"print"|"postpress"|"assembly"|"logistics").
 */
export interface TemplateCostLine {
  stage: string;
  total: number;
}

export type TemplateBucket = "materials" | "printCost" | "postCost" | "fittings" | "assembly";

function bucketOf(stage: string): TemplateBucket {
  const s = String(stage || "").toLowerCase();
  if (s.includes("материал") || s.includes("бумаг") || s.includes("подлож") || s === "material") return "materials";
  if (s.includes("постпечат") || s.includes("тиражн") || s === "postpress") return "postCost";
  if (s.includes("скреплен") || s.includes("фурнит") || s.includes("пружин")) return "fittings";
  if (s.includes("сборк") || s.includes("логистик") || s === "assembly" || s === "logistics") return "assembly";
  // prepress, print → к стоимости печати/подготовки
  if (s.includes("печат") || s.includes("препресс") || s === "prepress" || s === "print") return "printCost";
  return "assembly";
}

export interface ToTemplateResultOpts {
  margin: number;
  vatPercent: number;
  circulation: number;
}

/**
 * Сворачивает массив строк сметы шаблона в payload, совместимый с
 * `BoxPriceBreakdown` (Calculator выводит его в боковой панели и заголовке).
 */
export function toTemplatePriceResult(lines: TemplateCostLine[], opts: ToTemplateResultOpts): BoxPriceResult {
  const buckets: Record<TemplateBucket, number> = {
    materials: 0,
    printCost: 0,
    postCost: 0,
    fittings: 0,
    assembly: 0,
  };
  let total = 0;
  for (const l of lines) {
    const v = Number(l.total) || 0;
    buckets[bucketOf(l.stage)] += v;
    total += v;
  }
  const salePrice = total * (1 + (opts.margin || 0) / 100);
  const totalWithVat = salePrice * (1 + (opts.vatPercent || 0) / 100);
  const perUnit = opts.circulation > 0 ? totalWithVat / opts.circulation : 0;
  return {
    materials: buckets.materials,
    printCost: buckets.printCost,
    postCost: buckets.postCost,
    fittings: buckets.fittings,
    assembly: buckets.assembly,
    totalCost: total,
    totalGroupSavings: 0,
    salePrice,
    totalWithVat,
    perUnit,
  };
}