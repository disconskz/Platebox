/**
 * Доработка 35 — расчёт операции «Конгрев».
 * Чистая функция без React/Supabase.
 *
 * Полная формула (ТЗ §9, §10):
 *   База = (Тираж × Цена оттиска) × Коэф. сложности
 *        + Стоимость клише + Стоимость приладки
 *   Итого = MAX(База, Мин. стоимость операции)
 *
 *   Стоимость клише = MAX(площадь_см² × цена_клише_см², мин_клише)
 *
 * Поддерживаемые типы (ТЗ §3):
 *   standard | reverse | multilevel | 3d | with_foil | micro | deep
 */

export type CongrevType =
  | "standard"
  | "reverse"
  | "multilevel"
  | "3d"
  | "with_foil"
  | "micro"
  | "deep";

export interface CongrevRule {
  id?: string;
  name?: string;
  congrev_type: CongrevType | string;
  allowed_materials?: string;
  cliche_price_per_cm2: number;
  cliche_min_cost: number;
  setup_cost: number;
  price_per_impression: number;
  complexity_coef: number;
  min_cost: number;
  coef_standard: number;
  coef_deep: number;
  coef_3d: number;
  coef_with_foil: number;
  coef_reverse: number;
  coef_multilevel: number;
  coef_micro: number;
  coef_leather: number;
  coef_complex_position: number;
  coef_small_elements: number;
}

export interface CongrevInput {
  circulation: number;
  clicheWidthCm: number;
  clicheHeightCm: number;
  /** Кожа/кожзам */
  leather?: boolean;
  /** Сложное совмещение/позиционирование */
  complexPosition?: boolean;
  /** Мелкие элементы */
  smallElements?: boolean;
  clicheAreaOverride?: number;
  clichePricePerCm2Override?: number;
  clicheCostOverride?: number;
  setupOverride?: number;
  pricePerImpressionOverride?: number;
  complexityCoefOverride?: number;
  minCostOverride?: number;
}

export interface CongrevResult {
  clicheAreaCm2: number;
  clicheCost: number;
  setupCost: number;
  impressionCost: number;
  complexityCoef: number;
  minCost: number;
  baseCost: number;
  finalCost: number;
  breakdown: string;
  warnings: string[];
}

function pickTypeCoef(rule: CongrevRule): number {
  switch (rule.congrev_type) {
    case "reverse": return rule.coef_reverse || 1;
    case "multilevel": return rule.coef_multilevel || 1;
    case "3d": return rule.coef_3d || 1;
    case "with_foil": return rule.coef_with_foil || 1;
    case "micro": return rule.coef_micro || 1;
    case "deep": return rule.coef_deep || 1;
    case "standard":
    default: return rule.coef_standard || 1;
  }
}

export function calcCongrev(rule: CongrevRule, input: CongrevInput): CongrevResult {
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

  // Коэффициент сложности: базовый × тип × модификаторы материала/позиции/элементов.
  let complexityCoef = pickTypeCoef(rule);
  if (input.leather) complexityCoef *= rule.coef_leather || 1;
  if (input.complexPosition) complexityCoef *= rule.coef_complex_position || 1;
  if (input.smallElements) complexityCoef *= rule.coef_small_elements || 1;
  complexityCoef *= rule.complexity_coef || 1;
  if (input.complexityCoefOverride != null && input.complexityCoefOverride > 0) {
    complexityCoef = input.complexityCoefOverride;
  }

  const minCost = Math.max(0, input.minCostOverride ?? rule.min_cost);
  const baseCost = impressionCost * complexityCoef + clicheCost + setupCost;
  const finalCost = Math.max(minCost, baseCost);

  const breakdown =
    `${impressionCost.toFixed(0)} нан. × ${complexityCoef}` +
    ` + ${clicheCost.toFixed(0)} клише + ${setupCost.toFixed(0)} приладка`;

  return {
    clicheAreaCm2, clicheCost, setupCost, impressionCost,
    complexityCoef, minCost, baseCost, finalCost,
    breakdown, warnings,
  };
}