/**
 * Доработка 33 — расчёт операции «Установка ригеля для настенного календаря».
 * Чистая функция без React/Supabase.
 */

export type RigelCalcMode = "per_item" | "per_length";
export type RigelInstallMethod = "manual" | "semi_auto" | "auto";

export interface RigelRule {
  id?: string;
  name?: string;
  rigel_type: string;
  rigel_material: string;
  rigel_color: string;
  calc_mode: RigelCalcMode | string;
  price_per_item: number;
  price_per_meter: number;
  length_allowance: number;
  has_hanger: boolean;
  hanger_included: boolean;
  hanger_price: number;
  install_price: number;
  install_method: RigelInstallMethod | string;
  setup_cost: number;
  min_cost: number;
  coef_standard: number;
  coef_nonstandard_length: number;
  coef_manual: number;
  coef_nonstandard_color: number;
  coef_small_circulation: number;
  coef_complex_position: number;
  small_circulation_threshold: number;
  min_width: number;
  max_width: number;
}

export interface RigelInput {
  circulation: number;
  calendarWidthMm: number;
  nonstandardColor?: boolean;
  complexPosition?: boolean;
  hasHangerOverride?: boolean;
  hangerIncludedOverride?: boolean;
  calcModeOverride?: RigelCalcMode;
  rigelLengthMmOverride?: number;
  pricePerItemOverride?: number;
  pricePerMeterOverride?: number;
  hangerPriceOverride?: number;
  installPriceOverride?: number;
  complexityCoefOverride?: number;
  setupOverride?: number;
  minCostOverride?: number;
}

export interface RigelResult {
  calcMode: RigelCalcMode;
  rigelLengthMm: number;
  rigelLengthM: number;
  rigelCost: number;
  hangerCost: number;
  installCost: number;
  complexityCoef: number;
  setupCost: number;
  minCost: number;
  baseCost: number;
  finalCost: number;
  breakdown: string;
  warnings: string[];
}

function pickComplexityCoef(rule: RigelRule, input: RigelInput, nonstandardLength: boolean): number {
  if (typeof input.complexityCoefOverride === "number" && input.complexityCoefOverride > 0) {
    return input.complexityCoefOverride;
  }
  let coef = rule.coef_standard || 1;
  if (nonstandardLength) coef *= rule.coef_nonstandard_length;
  if (rule.install_method === "manual") coef *= rule.coef_manual;
  if (input.nonstandardColor) coef *= rule.coef_nonstandard_color;
  if (input.complexPosition) coef *= rule.coef_complex_position;
  if (input.circulation > 0 && input.circulation < rule.small_circulation_threshold) {
    coef *= rule.coef_small_circulation;
  }
  return coef;
}

export function calcRigel(rule: RigelRule, input: RigelInput): RigelResult {
  const warnings: string[] = [];
  const calcMode: RigelCalcMode =
    (input.calcModeOverride || (rule.calc_mode as RigelCalcMode) || "per_item");

  const baseLengthMm = Math.max(0, input.calendarWidthMm) + Math.max(0, rule.length_allowance || 0);
  const rigelLengthMm = Math.max(0, input.rigelLengthMmOverride ?? baseLengthMm);
  const rigelLengthM = rigelLengthMm / 1000;

  const circulation = Math.max(0, input.circulation);
  if (rule.min_width && input.calendarWidthMm < rule.min_width) {
    warnings.push(`Ширина изделия меньше минимальной (${rule.min_width} мм).`);
  }
  if (rule.max_width && rigelLengthMm > rule.max_width) {
    warnings.push(`Длина ригеля больше максимально допустимой (${rule.max_width} мм).`);
  }

  const pricePerItem = input.pricePerItemOverride ?? rule.price_per_item;
  const pricePerMeter = input.pricePerMeterOverride ?? rule.price_per_meter;
  const installPrice = input.installPriceOverride ?? rule.install_price;
  const hangerPrice = input.hangerPriceOverride ?? rule.hanger_price;
  const hasHanger = input.hasHangerOverride ?? rule.has_hanger;
  const hangerIncluded = input.hangerIncludedOverride ?? rule.hanger_included;

  let rigelCost = 0;
  let breakdown = "";
  if (calcMode === "per_item") {
    rigelCost = circulation * pricePerItem;
    breakdown = `${circulation} × ${pricePerItem} ₸/шт (готовый)`;
  } else {
    rigelCost = circulation * rigelLengthM * pricePerMeter;
    breakdown = `${circulation} × ${rigelLengthM.toFixed(3)} м × ${pricePerMeter} ₸/м`;
  }

  const hangerCost = hasHanger && !hangerIncluded ? circulation * hangerPrice : 0;
  const installCost = circulation * installPrice;

  // Нестандартная длина: ригель длиннее закладки/max или равен 0 — здесь
  // используем «нестандартный» если калькуляторная длина отличается от ширины+запас.
  const nonstandardLength = input.rigelLengthMmOverride != null && input.rigelLengthMmOverride !== baseLengthMm;
  const complexityCoef = pickComplexityCoef(rule, input, nonstandardLength);
  const setupCost = Math.max(0, input.setupOverride ?? rule.setup_cost);
  const minCost = Math.max(0, input.minCostOverride ?? rule.min_cost);

  const baseCost = (rigelCost + hangerCost + installCost) * complexityCoef;
  const finalCost = Math.max(minCost, baseCost + setupCost);

  return {
    calcMode, rigelLengthMm, rigelLengthM,
    rigelCost, hangerCost, installCost,
    complexityCoef, setupCost, minCost,
    baseCost, finalCost, breakdown, warnings,
  };
}