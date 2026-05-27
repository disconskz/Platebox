/**
 * Доработка 32 — расчёт операции «Удаление облоя».
 * Чистая функция без React/Supabase.
 */

export type FlashRemovalCalcMode = "per_item" | "per_sheet" | "per_time";
export type FlashRemovalMethod = "manual" | "semi_auto" | "auto";
export type FlashContour =
  | "simple" | "std_box" | "complex_box" | "small_parts" | "label" | "microflute";
export type FlashMaterial =
  | "paper" | "cardboard" | "thick_cardboard" | "microflute" | "plastic";

export interface FlashRemovalRule {
  id?: string;
  name?: string;
  product_type: string;
  removal_method: FlashRemovalMethod | string;
  calc_mode: FlashRemovalCalcMode | string;

  price_per_item: number;
  price_per_sheet: number;
  price_per_hour: number;
  default_seconds_per_sheet: number;

  setup_cost: number;
  min_cost: number;

  coef_contour_simple: number;
  coef_contour_std_box: number;
  coef_contour_complex_box: number;
  coef_contour_small_parts: number;
  coef_contour_label: number;
  coef_contour_microflute: number;

  coef_mat_paper: number;
  coef_mat_cardboard: number;
  coef_mat_thick_cardboard: number;
  coef_mat_microflute: number;
  coef_mat_plastic: number;

  coef_bridges_low: number;
  coef_bridges_med: number;
  coef_bridges_high: number;
  coef_bridges_extra: number;
  bridges_low_max: number;
  bridges_med_max: number;
  bridges_high_max: number;

  coef_manual: number;
}

export interface FlashRemovalInput {
  printSheets: number;
  itemsPerSheet: number;
  contour?: FlashContour;
  material?: FlashMaterial;
  bridgesPerItem?: number;
  totalTimeHours?: number;

  calcModeOverride?: FlashRemovalCalcMode;
  pricePerItemOverride?: number;
  pricePerSheetOverride?: number;
  pricePerHourOverride?: number;
  contourCoefOverride?: number;
  materialCoefOverride?: number;
  bridgesCoefOverride?: number;
  methodCoefOverride?: number;
  setupOverride?: number;
  minCostOverride?: number;
}

export interface FlashRemovalResult {
  calcMode: FlashRemovalCalcMode;
  totalItems: number;
  contourCoef: number;
  materialCoef: number;
  bridgesCoef: number;
  methodCoef: number;
  setupCost: number;
  minCost: number;
  baseCost: number;
  finalCost: number;
  breakdown: string;
  warnings: string[];
}

function pickContourCoef(rule: FlashRemovalRule, contour?: FlashContour): number {
  switch (contour) {
    case "std_box": return rule.coef_contour_std_box;
    case "complex_box": return rule.coef_contour_complex_box;
    case "small_parts": return rule.coef_contour_small_parts;
    case "label": return rule.coef_contour_label;
    case "microflute": return rule.coef_contour_microflute;
    case "simple":
    default: return rule.coef_contour_simple;
  }
}

function pickMaterialCoef(rule: FlashRemovalRule, material?: FlashMaterial): number {
  switch (material) {
    case "cardboard": return rule.coef_mat_cardboard;
    case "thick_cardboard": return rule.coef_mat_thick_cardboard;
    case "microflute": return rule.coef_mat_microflute;
    case "plastic": return rule.coef_mat_plastic;
    case "paper":
    default: return rule.coef_mat_paper;
  }
}

function pickBridgesCoef(rule: FlashRemovalRule, bridges: number): number {
  if (bridges <= rule.bridges_low_max) return rule.coef_bridges_low;
  if (bridges <= rule.bridges_med_max) return rule.coef_bridges_med;
  if (bridges <= rule.bridges_high_max) return rule.coef_bridges_high;
  return rule.coef_bridges_extra;
}

export function calcFlashRemoval(rule: FlashRemovalRule, input: FlashRemovalInput): FlashRemovalResult {
  const warnings: string[] = [];
  const calcMode: FlashRemovalCalcMode =
    (input.calcModeOverride || (rule.calc_mode as FlashRemovalCalcMode) || "per_item");

  const sheets = Math.max(0, input.printSheets || 0);
  const itemsPerSheet = Math.max(0, input.itemsPerSheet || 0);
  const totalItems = sheets * itemsPerSheet;

  const pricePerItem = input.pricePerItemOverride ?? rule.price_per_item;
  const pricePerSheet = input.pricePerSheetOverride ?? rule.price_per_sheet;
  const pricePerHour = input.pricePerHourOverride ?? rule.price_per_hour;

  const contourCoef = input.contourCoefOverride ?? pickContourCoef(rule, input.contour);
  const materialCoef = input.materialCoefOverride ?? pickMaterialCoef(rule, input.material);
  const bridges = Math.max(0, input.bridgesPerItem ?? 0);
  const bridgesCoef = input.bridgesCoefOverride ?? pickBridgesCoef(rule, bridges);
  const methodCoef = input.methodCoefOverride
    ?? (rule.removal_method === "manual" ? rule.coef_manual : 1);

  const setupCost = Math.max(0, input.setupOverride ?? rule.setup_cost);
  const minCost = Math.max(0, input.minCostOverride ?? rule.min_cost);

  let baseByMode = 0;
  let breakdown = "";

  if (calcMode === "per_item") {
    baseByMode = totalItems * pricePerItem * contourCoef;
    breakdown = `${sheets} лист × ${itemsPerSheet} шт × ${pricePerItem} ₸ × контур ${contourCoef}`;
  } else if (calcMode === "per_sheet") {
    baseByMode = sheets * pricePerSheet * contourCoef;
    breakdown = `${sheets} лист × ${pricePerSheet} ₸ × контур ${contourCoef}`;
  } else {
    const sec = input.totalTimeHours !== undefined && input.totalTimeHours > 0
      ? input.totalTimeHours * 3600
      : sheets * (rule.default_seconds_per_sheet || 0);
    const hours = sec / 3600;
    baseByMode = hours * pricePerHour;
    breakdown = `${hours.toFixed(2)} ч × ${pricePerHour} ₸/ч`;
    if (hours <= 0) warnings.push("Не задано время работы и нет времени на лист по умолчанию");
  }

  const baseCost = baseByMode * materialCoef * bridgesCoef * methodCoef;
  const finalCost = Math.max(minCost, baseCost + setupCost);

  return {
    calcMode, totalItems, contourCoef, materialCoef, bridgesCoef, methodCoef,
    setupCost, minCost, baseCost, finalCost, breakdown, warnings,
  };
}