/**
 * Доработка 34 — расчёт операции «Тиснение».
 * Чистая функция без React/Supabase.
 *
 * Полная формула (ТЗ §8):
 *   Итого = (Стоимость нанесения + Стоимость фольги) × Коэф. сложности
 *         + Стоимость клише + Стоимость приладки
 *   Итого = MAX(Итого, Мин. стоимость операции)
 *
 *   Стоимость клише = MAX(площадь × цена_см², мин_клише)
 *   Стоимость нанесения = тираж × цена_оттиска
 *   Стоимость фольги = площадь × цена_фольги_см² × тираж (если используется)
 */

export type EmbossingType = "standard" | "congrev" | "double" | "blind";

export interface EmbossingRule {
  id?: string;
  name?: string;
  embossing_type: EmbossingType | string;
  foil_type: string;
  uses_foil: boolean;
  cliche_price_per_cm2: number;
  cliche_min_cost: number;
  setup_cost: number;
  price_per_impression: number;
  foil_price_per_cm2: number;
  complexity_coef: number;
  min_cost: number;
  coef_standard: number;
  coef_congrev: number;
  coef_double: number;
  coef_leather: number;
  coef_complex_position: number;
}

export interface EmbossingInput {
  circulation: number;
  clicheWidthCm: number;
  clicheHeightCm: number;
  /** Кожа/кожзам */
  leather?: boolean;
  /** Сложное позиционирование */
  complexPosition?: boolean;
  usesFoilOverride?: boolean;
  clicheAreaOverride?: number;
  clichePricePerCm2Override?: number;
  clicheCostOverride?: number;
  setupOverride?: number;
  pricePerImpressionOverride?: number;
  foilPricePerCm2Override?: number;
  complexityCoefOverride?: number;
  minCostOverride?: number;
}

export interface EmbossingResult {
  clicheAreaCm2: number;
  clicheCost: number;
  setupCost: number;
  impressionCost: number;
  foilCost: number;
  complexityCoef: number;
  minCost: number;
  usesFoil: boolean;
  baseCost: number;
  finalCost: number;
  breakdown: string;
  warnings: string[];
}

function pickTypeCoef(rule: EmbossingRule): number {
  switch (rule.embossing_type) {
    case "congrev": return rule.coef_congrev || 1;
    case "double": return rule.coef_double || 1;
    case "blind":
    case "standard":
    default: return rule.coef_standard || 1;
  }
}

export function calcEmbossing(rule: EmbossingRule, input: EmbossingInput): EmbossingResult {
  const warnings: string[] = [];
  const circulation = Math.max(0, input.circulation || 0);
  const w = Math.max(0, input.clicheWidthCm || 0);
  const h = Math.max(0, input.clicheHeightCm || 0);
  const clicheAreaCm2 = input.clicheAreaOverride != null
    ? Math.max(0, input.clicheAreaOverride)
    : w * h;

  if (clicheAreaCm2 <= 0) warnings.push("Площадь клише равна 0 — укажите размеры.");
  if (circulation <= 0) warnings.push("Тираж равен 0.");

  const clichePrice = input.clichePricePerCm2Override ?? rule.cliche_price_per_cm2;
  const clicheMin = rule.cliche_min_cost || 0;
  const clicheCost = input.clicheCostOverride != null
    ? Math.max(0, input.clicheCostOverride)
    : Math.max(clicheAreaCm2 * clichePrice, clicheMin);

  const setupCost = Math.max(0, input.setupOverride ?? rule.setup_cost);
  const pricePerImp = input.pricePerImpressionOverride ?? rule.price_per_impression;
  const impressionCost = circulation * pricePerImp;

  const usesFoil = input.usesFoilOverride ?? rule.uses_foil;
  const foilPrice = input.foilPricePerCm2Override ?? rule.foil_price_per_cm2;
  const foilCost = usesFoil ? clicheAreaCm2 * foilPrice * circulation : 0;

  // Коэффициент сложности: из правила (по типу), плюс кожа/позиция, либо override.
  let complexityCoef = pickTypeCoef(rule);
  if (input.leather) complexityCoef *= rule.coef_leather || 1;
  if (input.complexPosition) complexityCoef *= rule.coef_complex_position || 1;
  // Базовый коэф. сложности из справочника (обычно 1) можно перемножать тоже.
  complexityCoef *= rule.complexity_coef || 1;
  if (input.complexityCoefOverride != null && input.complexityCoefOverride > 0) {
    complexityCoef = input.complexityCoefOverride;
  }

  const minCost = Math.max(0, input.minCostOverride ?? rule.min_cost);
  const baseCost = (impressionCost + foilCost) * complexityCoef + clicheCost + setupCost;
  const finalCost = Math.max(minCost, baseCost);

  const breakdown =
    `(${impressionCost.toFixed(0)} нан. + ${foilCost.toFixed(0)} фольга) × ${complexityCoef}` +
    ` + ${clicheCost.toFixed(0)} клише + ${setupCost.toFixed(0)} приладка`;

  return {
    clicheAreaCm2, clicheCost, setupCost, impressionCost, foilCost,
    complexityCoef, minCost, usesFoil, baseCost, finalCost,
    breakdown, warnings,
  };
}