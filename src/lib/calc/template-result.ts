import type { BoxPriceResult } from "@/components/calc/BoxPriceBreakdown";

export interface TemplateCostLine {
  stage: string;
  total: number;
}

export type TemplateBucket = "materials" | "printCost" | "postCost" | "fittings" | "assembly";

function bucketOf(stage: string): TemplateBucket {
  const s = String(stage || "").toLowerCase();

  const aliases: Record<TemplateBucket, string[]> = {
    materials: ["материал", "матеріал", "material", "materials", "paper", "бумага", "бумаг", "base"],
    printCost: [
      "печат",
      "print",
      "prepress",
      "photo",
      "форма",
      "формат",
      "form",
      "cmyk",
      "rgb",
      "скан",
    ],
    postCost: [
      "пост",
      "посл",
      "postpress",
      "laminat",
      "lamination",
      "фольг",
      "foil",
      "клише",
      "cliche",
      "выруб",
      "эмбосс",
    ],
    fittings: [
      "настрой",
      "setup",
      "подготов",
      "дизайн",
      "верст",
      "крой",
      "доработ",
      "fitting",
      "склей",
      "вырез",
    ],
    assembly: [
      "сбор",
      "assembly",
      "logistic",
      "logistics",
      "упак",
      "pack",
      "расклад",
      "транспорт",
      "доставка",
    ],
  };

  for (const bucket of Object.keys(aliases) as TemplateBucket[]) {
    if (aliases[bucket].some((keyword) => s.includes(keyword))) return bucket;
  }

  if (s === "material" || s === "prepress" || s === "print") return "printCost";
  if (s === "logistics" || s === "assembly") return "assembly";
  return "assembly";
}

export interface ToTemplateResultOpts {
  margin: number;
  vatPercent: number;
  circulation: number;
}

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
