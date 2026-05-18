import { z } from "zod";
import type { CalcInput } from "./types";
import type { MultiSkuInput } from "./multi-sku";

// Лёгкие переиспользуемые валидаторы
const positiveInt = z
  .number({ invalid_type_error: "должно быть числом" })
  .finite("должно быть конечным числом")
  .int("должно быть целым")
  .positive("должно быть > 0");

const nonNegNum = z
  .number({ invalid_type_error: "должно быть числом" })
  .finite("должно быть конечным числом")
  .nonnegative("должно быть >= 0");

const colorCount = z
  .number()
  .int()
  .min(0, "красочность >= 0")
  .max(8, "красочность <= 8");

const materialSchema = z.object({
  id: z.string(),
  name: z.string(),
  format_width: positiveInt.max(5000),
  format_height: positiveInt.max(5000),
  cost_per_sheet: nonNegNum.max(1e7, "слишком большая цена листа"),
});

export const calcInputSchema = z
  .object({
    productType: z.string().min(1),
    circulation: positiveInt.max(10_000_000, "слишком большой тираж"),
    formatType: z.string(),
    formatWidth: positiveInt.max(5000),
    formatHeight: positiveInt.max(5000),
    colorFront: colorCount,
    colorBack: colorCount,
    material: materialSchema,
    designQty: nonNegNum.max(1000),
    photoOutputUnitCost: nonNegNum.max(1e6),
    vatPercent: nonNegNum.max(100).optional(),
    printCostPerImpression: nonNegNum.max(1e5).optional(),
    packagingPerUnit: nonNegNum.max(1e5).optional(),
    finishCutsPerItem: nonNegNum.max(100).optional(),
    manualForms: nonNegNum.int().max(64).optional(),
    manualSetupSheets: nonNegNum.int().max(1e6).optional(),
    foldCount: nonNegNum.int().max(20).optional(),
    laminationSides: z.union([z.literal(1), z.literal(2)]).optional(),
    numbersPerSheet: nonNegNum.int().max(1000).optional(),
    stampingClicheW: nonNegNum.max(500).optional(),
    stampingClicheH: nonNegNum.max(500).optional(),
    lamPrepressSides: z.union([z.literal(1), z.literal(2)]).optional(),
  })
  .passthrough();

export const multiSkuInputSchema = z
  .object({
    productType: z.string().min(1),
    skus: z
      .array(
        z.object({
          name: z.string(),
          width: positiveInt.max(5000),
          height: positiveInt.max(5000),
          circulation: positiveInt.max(10_000_000),
        })
      )
      .min(1, "нужен хотя бы один SKU")
      .max(500, "слишком много SKU"),
    colorFront: colorCount,
    colorBack: colorCount,
    material: materialSchema,
    vatPercent: nonNegNum.max(100).optional(),
    printCostPerImpression: nonNegNum.max(1e5).optional(),
    maxExtraImpositions: nonNegNum.int().max(20).optional(),
  })
  .passthrough();

function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
    .join("; ");
}

export function validateCalcInput(input: CalcInput): CalcInput {
  const r = calcInputSchema.safeParse(input);
  if (!r.success) throw new Error("Некорректные входные данные расчёта — " + formatZodError(r.error));
  return input;
}

export function validateMultiSkuInput(input: MultiSkuInput): MultiSkuInput {
  const r = multiSkuInputSchema.safeParse(input);
  if (!r.success) throw new Error("Некорректные данные multi-SKU — " + formatZodError(r.error));
  return input;
}

/**
 * Финишная резка: число резов на готовое изделие.
 * Профиль маршрута зависит от продукта. По умолчанию 4 (исторически),
 * но многие маршруты режут стопу — это завышение.
 */
const FINISH_CUTS_BY_PRODUCT: Record<string, number> = {
  // Многие продукты режутся по 2 резам на изделие в стопе
  leaflet: 2,
  leaflet_diecut: 2,
  booklet: 2,
  poster: 2,
  blank: 2,
  selfcopy: 2,
  notepad: 2,
  // Маленькие изделия стопой: 4 реза остаётся актуальным
  businesscard: 4,
  label: 4,
  sticker: 4,
  sticker_diecut: 4,
};

/**
 * Сколько резов на изделие финишной резки.
 * Приоритет: явное значение в input → правило по типу продукции → DEFAULTS.
 */
export function finishCutsPerItem(
  productType: string,
  inputOverride: number | undefined,
  ruleDefault: number
): number {
  if (typeof inputOverride === "number" && Number.isFinite(inputOverride) && inputOverride >= 0)
    return inputOverride;
  if (productType in FINISH_CUTS_BY_PRODUCT) return FINISH_CUTS_BY_PRODUCT[productType];
  return ruleDefault;
}

/**
 * Резка закупочного → печатных листов. Бинарная модель гильотинной резки
 * стопы: ceil(log2(nesting)). Это устраняет «мёртвую» ветку `===4` и даёт
 * монотонную, осмысленную шкалу:
 *   nesting | cuts
 *   1       | 0
 *   2       | 1
 *   3..4    | 2
 *   5..8    | 3
 *   9..16   | 4
 */
export function cutsForNesting(nesting: number): number {
  const n = Math.max(1, Math.floor(nesting));
  if (n <= 1) return 0;
  return Math.ceil(Math.log2(n));
}