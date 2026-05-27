/**
 * Доработка 31 — расчёт операции «Наклейка окна на коробку».
 * Чистая функция без React/Supabase.
 */

export type WindowCalcMode = "per_area" | "per_window" | "combined";
export type WindowMaterial = "pet" | "pvc" | "clear_plastic" | "matte_plastic" | "soft_film" | "designer_film";
export type WindowShape = "rect" | "round" | "oval" | "figured" | "nonstandard";
export type WindowApplicationMethod = "manual" | "semi_auto" | "auto";

export interface WindowRule {
  id?: string;
  name?: string;
  window_material: WindowMaterial | string;
  window_shape: WindowShape | string;
  application_method: WindowApplicationMethod | string;
  equipment_type: string;
  calc_mode: WindowCalcMode | string;

  material_thickness_mkm: number;
  price_material_per_m2: number;
  price_apply_per_item: number;
  price_apply_per_m2: number;

  setup_cost: number;
  min_cost: number;

  coef_standard: number;
  coef_figured: number;
  coef_thick_pet: number;
  coef_manual: number;
  coef_nonstandard_format: number;
  coef_many_windows: number;
  coef_complex_position: number;

  thick_pet_threshold_mkm: number;
  many_windows_threshold: number;
  min_window_mm: number;
  max_window_mm: number;
  max_material_thickness_mkm: number;
  allowed_shapes: string;
}

export interface WindowInput {
  circulation: number;
  windowWidthMm: number;
  windowHeightMm: number;
  windowsPerItem: number;
  shapeOverride?: WindowShape;
  nonstandardFormat?: boolean;
  complexPosition?: boolean;
  calcModeOverride?: WindowCalcMode;
  priceMaterialOverride?: number;
  priceApplyItemOverride?: number;
  priceApplyM2Override?: number;
  complexityCoefOverride?: number;
  setupOverride?: number;
  minCostOverride?: number;
}

export interface WindowResult {
  calcMode: WindowCalcMode;
  windowAreaM2: number;
  totalAreaM2: number;
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

function pickComplexityCoef(rule: WindowRule, input: WindowInput): number {
  if (typeof input.complexityCoefOverride === "number" && input.complexityCoefOverride > 0) {
    return input.complexityCoefOverride;
  }
  const shape = input.shapeOverride || rule.window_shape;
  let coef = rule.coef_standard || 1;
  if (shape === "figured" || shape === "nonstandard") coef *= rule.coef_figured;
  if (rule.window_material === "pet" && (rule.material_thickness_mkm || 0) >= rule.thick_pet_threshold_mkm) {
    coef *= rule.coef_thick_pet;
  }
  if (rule.application_method === "manual") coef *= rule.coef_manual;
  if (input.nonstandardFormat) coef *= rule.coef_nonstandard_format;
  if ((input.windowsPerItem ?? 0) >= rule.many_windows_threshold) coef *= rule.coef_many_windows;
  if (input.complexPosition) coef *= rule.coef_complex_position;
  return coef;
}

export function calcWindow(rule: WindowRule, input: WindowInput): WindowResult {
  const warnings: string[] = [];
  const calcMode: WindowCalcMode =
    (input.calcModeOverride || (rule.calc_mode as WindowCalcMode) || "combined");

  const priceMaterial = input.priceMaterialOverride ?? rule.price_material_per_m2;
  const priceApplyItem = input.priceApplyItemOverride ?? rule.price_apply_per_item;
  const priceApplyM2 = input.priceApplyM2Override ?? rule.price_apply_per_m2;

  const w = Math.max(0, input.windowWidthMm);
  const h = Math.max(0, input.windowHeightMm);
  const windows = Math.max(0, input.windowsPerItem);
  const circ = Math.max(0, input.circulation);
  const windowAreaM2 = (w * h) / 1_000_000;
  const totalAreaM2 = windowAreaM2 * windows * circ;

  // Ограничения оборудования
  if (w > 0 && (w < rule.min_window_mm || w > rule.max_window_mm)) {
    warnings.push(`Ширина окна ${w} мм вне допустимого диапазона ${rule.min_window_mm}–${rule.max_window_mm} мм`);
  }
  if (h > 0 && (h < rule.min_window_mm || h > rule.max_window_mm)) {
    warnings.push(`Высота окна ${h} мм вне допустимого диапазона ${rule.min_window_mm}–${rule.max_window_mm} мм`);
  }
  if ((rule.material_thickness_mkm || 0) > rule.max_material_thickness_mkm) {
    warnings.push(`Толщина материала ${rule.material_thickness_mkm} мкм превышает ${rule.max_material_thickness_mkm} мкм — рекомендуется ручная наклейка`);
  }
  const shape = (input.shapeOverride || rule.window_shape) as string;
  const allowed = (rule.allowed_shapes || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(shape)) {
    warnings.push(`Форма «${shape}» не поддерживается оборудованием — рекомендуется ручная наклейка`);
  }

  let materialCost = 0;
  let applyCost = 0;
  let breakdown = "";

  if (calcMode === "per_area") {
    materialCost = totalAreaM2 * priceMaterial;
    applyCost = totalAreaM2 * priceApplyM2;
    breakdown = `${totalAreaM2.toFixed(4)} м² × (${priceMaterial} + ${priceApplyM2}) ₸/м²`;
  } else if (calcMode === "per_window") {
    materialCost = totalAreaM2 * priceMaterial;
    applyCost = circ * windows * priceApplyItem;
    breakdown = `${totalAreaM2.toFixed(4)} м² × ${priceMaterial} ₸/м² + ${circ}×${windows} × ${priceApplyItem} ₸/окно`;
  } else {
    // combined
    materialCost = totalAreaM2 * priceMaterial;
    applyCost = circ * windows * priceApplyItem + totalAreaM2 * priceApplyM2;
    breakdown = `материал ${totalAreaM2.toFixed(4)} м² × ${priceMaterial} ₸/м² + наклейка ${circ}×${windows} × ${priceApplyItem} ₸/окно`;
  }

  const complexityCoef = pickComplexityCoef(rule, input);
  const setupCost = Math.max(0, input.setupOverride ?? rule.setup_cost);
  const minCost = Math.max(0, input.minCostOverride ?? rule.min_cost);

  const baseCost = (materialCost + applyCost) * complexityCoef;
  const finalCost = Math.max(minCost, baseCost + setupCost);

  return {
    calcMode, windowAreaM2, totalAreaM2,
    materialCost, applyCost, complexityCoef,
    setupCost, minCost, baseCost, finalCost,
    breakdown, warnings,
  };
}