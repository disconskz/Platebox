/**
 * Доработка 30 — расчёт операции «Наклейка скотча».
 * Чистая функция без React/Supabase.
 */

export type TapeCalcMode = "per_length" | "per_point" | "per_item";
export type TapeType =
  | "double_sided" | "foam" | "transparent" | "reinforced" | "mounting" | "thin" | "special";
export type TapeApplicationMethod = "manual" | "semi_auto" | "auto";

export interface TapeRule {
  id?: string;
  name?: string;
  tape_type: TapeType | string;
  tape_width_mm: number;
  application_method: TapeApplicationMethod | string;
  calc_mode: TapeCalcMode | string;

  price_per_meter: number;
  price_per_point: number;
  price_per_item_apply: number;

  setup_cost: number;
  min_cost: number;

  coef_standard: number;
  coef_foam: number;
  coef_manual: number;
  coef_nonstandard_format: number;
  coef_complex_position: number;
  coef_small_circulation: number;
  coef_many_strips: number;

  small_circulation_threshold: number;
  many_strips_threshold: number;
}

export interface TapeInput {
  circulation: number;
  stripLengthMm: number;
  stripsPerItem: number;
  pointsPerItem: number;
  formatShortMm?: number;
  formatLongMm?: number;
  nonstandardFormat?: boolean;
  complexPosition?: boolean;
  calcModeOverride?: TapeCalcMode;
  pricePerMeterOverride?: number;
  pricePerPointOverride?: number;
  pricePerItemApplyOverride?: number;
  complexityCoefOverride?: number;
  setupOverride?: number;
  minCostOverride?: number;
}

export interface TapeResult {
  calcMode: TapeCalcMode;
  totalLengthM: number;
  materialCost: number;
  applyCost: number;
  complexityCoef: number;
  setupCost: number;
  minCost: number;
  baseCost: number;
  finalCost: number;
  breakdown: string;
  warnings: string[];
}

function pickComplexityCoef(rule: TapeRule, input: TapeInput): number {
  if (typeof input.complexityCoefOverride === "number" && input.complexityCoefOverride > 0) {
    return input.complexityCoefOverride;
  }
  let coef = rule.coef_standard || 1;
  if (rule.tape_type === "foam") coef *= rule.coef_foam;
  if (rule.application_method === "manual") coef *= rule.coef_manual;
  if (input.nonstandardFormat) coef *= rule.coef_nonstandard_format;
  if (input.complexPosition) coef *= rule.coef_complex_position;
  if (input.circulation > 0 && input.circulation < rule.small_circulation_threshold) {
    coef *= rule.coef_small_circulation;
  }
  if ((input.stripsPerItem ?? 0) >= rule.many_strips_threshold) {
    coef *= rule.coef_many_strips;
  }
  return coef;
}

export function calcTape(rule: TapeRule, input: TapeInput): TapeResult {
  const warnings: string[] = [];
  const calcMode: TapeCalcMode =
    (input.calcModeOverride || (rule.calc_mode as TapeCalcMode) || "per_length");

  const pricePerMeter = input.pricePerMeterOverride ?? rule.price_per_meter;
  const pricePerPoint = input.pricePerPointOverride ?? rule.price_per_point;
  const pricePerItemApply = input.pricePerItemApplyOverride ?? rule.price_per_item_apply;

  const lengthM = Math.max(0, input.stripLengthMm) / 1000;
  const totalLengthM = lengthM * Math.max(0, input.stripsPerItem) * Math.max(0, input.circulation);

  let materialCost = 0;
  let applyCost = 0;
  let breakdown = "";

  if (calcMode === "per_length") {
    materialCost = totalLengthM * pricePerMeter;
    applyCost = Math.max(0, input.circulation) * pricePerItemApply;
    breakdown = `${totalLengthM.toFixed(2)} м × ${pricePerMeter} ₸/м + ${input.circulation} × ${pricePerItemApply} ₸/шт`;
  } else if (calcMode === "per_point") {
    const points = Math.max(0, input.pointsPerItem) * Math.max(0, input.circulation);
    materialCost = points * pricePerPoint;
    applyCost = 0;
    breakdown = `${input.circulation} × ${input.pointsPerItem} тчк × ${pricePerPoint} ₸`;
  } else {
    materialCost = 0;
    applyCost = Math.max(0, input.circulation) * pricePerItemApply;
    breakdown = `${input.circulation} × ${pricePerItemApply} ₸/шт`;
  }

  const complexityCoef = pickComplexityCoef(rule, input);
  const setupCost = Math.max(0, input.setupOverride ?? rule.setup_cost);
  const minCost = Math.max(0, input.minCostOverride ?? rule.min_cost);

  const baseCost = (materialCost + applyCost) * complexityCoef;
  const finalCost = Math.max(minCost, baseCost + setupCost);

  return {
    calcMode, totalLengthM, materialCost, applyCost, complexityCoef,
    setupCost, minCost, baseCost, finalCost, breakdown, warnings,
  };
}