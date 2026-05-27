/**
 * Доработка 29 — расчёт операции «Перфорация».
 * Чистая функция без React/Supabase. Применяется и в Calculator, и в тестах.
 */

export type PerforationCalcMode = "per_length" | "per_sheet" | "per_pass";
export type PerforationType =
  | "tear" | "micro" | "fold" | "big" | "round" | "figured" | "manual" | "machine";

export interface PerforationRule {
  id?: string;
  name?: string;
  perforation_type: PerforationType | string;
  equipment_type?: string;
  calc_mode: PerforationCalcMode | string;

  price_per_meter: number;
  price_per_sheet: number;
  price_per_pass: number;

  coef_paper_light: number;
  coef_paper_med: number;
  coef_paper_heavy: number;
  coef_cardboard: number;
  coef_plastic: number;
  density_light_max: number;
  density_med_max: number;
  density_heavy_max: number;

  coef_micro: number;
  coef_figured: number;
  coef_manual: number;
  coef_nonstandard_format: number;
  coef_many_lines: number;
  many_lines_threshold: number;

  min_format_short: number;
  max_format_long: number;
  max_paper_density: number;
  max_lines_per_pass: number;

  setup_cost: number;
  min_cost: number;
}

export interface PerforationInput {
  circulation: number;
  printSheets: number;
  lineLengthMm: number;
  linesPerItem: number;
  passes?: number;
  materialKind?: "paper" | "cardboard" | "plastic";
  paperDensity?: number;
  formatShortMm?: number;
  formatLongMm?: number;
  /** Переопределение способа расчёта. */
  calcModeOverride?: PerforationCalcMode;
  /** Переопределения коэф. */
  materialCoefOverride?: number;
  complexityCoefOverride?: number;
  /** Если перфорация выполнена в составе штампа высечки — не добавлять в маршрут. */
  includedInDieCut?: boolean;
}

export interface PerforationResult {
  totalLengthM: number;
  materialCoef: number;
  complexityCoef: number;
  calcMode: PerforationCalcMode;
  baseCost: number;
  setupCost: number;
  minCost: number;
  finalCost: number;
  warnings: string[];
  breakdown: string;
}

function pickMaterialCoef(rule: PerforationRule, input: PerforationInput): number {
  if (typeof input.materialCoefOverride === "number" && input.materialCoefOverride > 0) {
    return input.materialCoefOverride;
  }
  if (input.materialKind === "cardboard") return rule.coef_cardboard;
  if (input.materialKind === "plastic") return rule.coef_plastic;
  const d = Number(input.paperDensity ?? 0);
  if (d <= 0) return rule.coef_paper_light;
  if (d <= rule.density_light_max) return rule.coef_paper_light;
  if (d <= rule.density_med_max) return rule.coef_paper_med;
  if (d <= rule.density_heavy_max) return rule.coef_paper_heavy;
  return rule.coef_paper_heavy;
}

function pickComplexityCoef(rule: PerforationRule, input: PerforationInput): number {
  if (typeof input.complexityCoefOverride === "number" && input.complexityCoefOverride > 0) {
    return input.complexityCoefOverride;
  }
  let coef = 1;
  const t = rule.perforation_type;
  if (t === "micro") coef *= rule.coef_micro;
  if (t === "figured" || t === "round") coef *= rule.coef_figured;
  if (t === "manual" || rule.equipment_type === "manual") coef *= rule.coef_manual;
  // Нестандартный формат: за пределами стандартного диапазона записи.
  const longSide = Math.max(input.formatLongMm ?? 0, input.formatShortMm ?? 0);
  const shortSide = Math.min(input.formatLongMm ?? 0, input.formatShortMm ?? 0);
  if (longSide && (longSide > rule.max_format_long || shortSide < rule.min_format_short)) {
    coef *= rule.coef_nonstandard_format;
  }
  if ((input.linesPerItem ?? 0) >= rule.many_lines_threshold) {
    coef *= rule.coef_many_lines;
  }
  return coef;
}

export function calcPerforation(rule: PerforationRule, input: PerforationInput): PerforationResult {
  const warnings: string[] = [];
  const calcMode: PerforationCalcMode =
    (input.calcModeOverride || (rule.calc_mode as PerforationCalcMode) || "per_length");
  const lineLengthM = Math.max(0, input.lineLengthMm) / 1000;
  const totalLengthM = lineLengthM * Math.max(0, input.linesPerItem) * Math.max(0, input.circulation);
  const materialCoef = pickMaterialCoef(rule, input);
  const complexityCoef = pickComplexityCoef(rule, input);

  let baseCost = 0;
  let breakdown = "";
  if (calcMode === "per_length") {
    baseCost = totalLengthM * rule.price_per_meter * materialCoef * complexityCoef;
    breakdown = `${totalLengthM.toFixed(2)} м × ${rule.price_per_meter} ₸/м × мат.${materialCoef} × слож.${complexityCoef.toFixed(2)}`;
  } else if (calcMode === "per_sheet") {
    baseCost = Math.max(0, input.printSheets) * rule.price_per_sheet * complexityCoef;
    breakdown = `${input.printSheets} л × ${rule.price_per_sheet} ₸/л × слож.${complexityCoef.toFixed(2)}`;
  } else {
    const passes = Math.max(1, input.passes ?? 1);
    baseCost = Math.max(0, input.printSheets) * passes * rule.price_per_pass * complexityCoef;
    breakdown = `${input.printSheets} л × ${passes} прох. × ${rule.price_per_pass} ₸ × слож.${complexityCoef.toFixed(2)}`;
  }

  const setupCost = Math.max(0, rule.setup_cost);
  const minCost = Math.max(0, rule.min_cost);
  const finalCost = input.includedInDieCut ? 0 : Math.max(minCost, baseCost + setupCost);

  // Предупреждения по ограничениям оборудования
  if (input.paperDensity && input.paperDensity > rule.max_paper_density) {
    warnings.push(`Плотность ${input.paperDensity} г/м² выше максимальной для оборудования (${rule.max_paper_density}).`);
  }
  const longSide = Math.max(input.formatLongMm ?? 0, input.formatShortMm ?? 0);
  const shortSide = Math.min(input.formatLongMm ?? 0, input.formatShortMm ?? 0);
  if (longSide && longSide > rule.max_format_long) {
    warnings.push(`Длинная сторона ${longSide} мм больше допустимой (${rule.max_format_long}).`);
  }
  if (shortSide && rule.min_format_short && shortSide < rule.min_format_short) {
    warnings.push(`Короткая сторона ${shortSide} мм меньше допустимой (${rule.min_format_short}).`);
  }
  if (input.linesPerItem > rule.max_lines_per_pass) {
    warnings.push(`Линий на изделие (${input.linesPerItem}) больше, чем за один проход (${rule.max_lines_per_pass}).`);
  }

  return {
    totalLengthM, materialCoef, complexityCoef, calcMode,
    baseCost, setupCost, minCost, finalCost, warnings, breakdown,
  };
}