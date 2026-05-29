/**
 * Доработка 84 — этап 2: движок авто-спусков для коробок.
 *
 * Задача: для каждой детали (или группы одинаковых деталей) выбрать самый
 * выгодный печатный формат из доступных. Машины A1 в производстве нет —
 * поэтому A1 запрещён, и если деталь физически помещается на A1, программа
 * раскладывает её на 2 листа A2+ и считает именно по A2+.
 *
 * Это первая итерация: каждая деталь спускается независимо. Общая раскладка
 * нескольких деталей на один спуск (когда совпадают материал/печать/ламинация)
 * добавится в этапе 3 — после того, как менеджеры подтвердят, что текущая
 * автологика выбирает «правильные» форматы.
 */

export interface PrintFormat {
  id: string;
  label: string;
  /** мм */
  w: number;
  /** мм */
  h: number;
  /** Стоимость 1 листа печати 4+0, тг (база для масштабирования по цветности). */
  pricePerSheet: number;
  /** Стоимость приладки за форму, тг. */
  setupPerForm: number;
}

/** Доступные печатные форматы. A1 НАМЕРЕННО отсутствует (нет машины). */
export const PRINT_FORMATS: PrintFormat[] = [
  { id: "A3+", label: "A3+ (330×480)", w: 330, h: 480, pricePerSheet: 25, setupPerForm: 3000 },
  { id: "A2+", label: "A2+ (488×680)", w: 488, h: 680, pricePerSheet: 50, setupPerForm: 5000 },
];

/** Формат A1 — для проверки «помещается ли на A1» и автоматического сплита. */
export const A1_FORMAT = { id: "A1", w: 610, h: 860 };

/** Сколько деталей помещается на лист заданного формата (с обоими поворотами). */
export function itemsPerSheet(devW: number, devH: number, sheetW: number, sheetH: number): number {
  if (devW <= 0 || devH <= 0 || sheetW <= 0 || sheetH <= 0) return 0;
  const a = Math.floor(sheetW / devW) * Math.floor(sheetH / devH);
  const b = Math.floor(sheetW / devH) * Math.floor(sheetH / devW);
  return Math.max(a, b);
}

export interface ImposeInput {
  /** Развёртка детали, мм */
  developW: number;
  developH: number;
  /** Общее количество деталей (тираж × qtyPerBox) */
  totalParts: number;
  /** Закупочный лист (мм) — печатный не может быть больше. */
  sheetW: number;
  sheetH: number;
  /** Сумма цветности (front + back), нужна для пропорционального скейла цены печати. */
  colorSum: number;
  /** Цена одного закупочного листа (для расчёта стоимости материала). */
  pricePerPurchaseSheet: number;
  /** % отходов материала. */
  wastePct: number;
}

export interface ImposeVariant {
  format: PrintFormat;
  itemsPerSheet: number;
  sheets: number;
  materialCost: number;
  printCost: number;
  /** Себестоимость материал+печать (без постпечати/штампа). */
  total: number;
  /** Сколько печатных листов умещается в одном закупочном (для оценки расхода). */
  printsPerPurchase: number;
  /** Доля занятой площади печатного листа (для подсказки «отходы»). */
  utilization: number;
  /** Помечено true, если выбран из-за запрета A1. */
  pickedDueToA1Block?: boolean;
}

export interface ImposeResult {
  best: ImposeVariant | null;
  variants: ImposeVariant[];
  /** Поясняющая подсказка для UI (Доработка 84, §33). */
  hint: string;
  /** Деталь физически помещалась на A1, но мы сплитнули на 2×A2+. */
  splitFromA1: boolean;
}

function calcVariant(input: ImposeInput, fmt: PrintFormat): ImposeVariant | null {
  // Печатный формат не может быть больше закупочного листа
  const effW = Math.min(fmt.w, input.sheetW);
  const effH = Math.min(fmt.h, input.sheetH);
  const per = itemsPerSheet(input.developW, input.developH, effW, effH);
  if (per <= 0) return null;
  const printsPerPurchase =
    Math.max(1, Math.floor(input.sheetW / fmt.w) * Math.floor(input.sheetH / fmt.h)) || 1;
  const printSheetsRaw = Math.ceil(input.totalParts / per);
  const sheetsWithWaste = Math.ceil(printSheetsRaw * (1 + input.wastePct / 100));
  const purchaseSheets = Math.ceil(sheetsWithWaste / printsPerPurchase);
  const materialCost = purchaseSheets * input.pricePerPurchaseSheet;
  const colorFactor = input.colorSum > 0 ? input.colorSum / 4 : 0;
  const printCost =
    colorFactor > 0
      ? sheetsWithWaste * fmt.pricePerSheet * colorFactor + fmt.setupPerForm
      : 0;
  const itemArea = input.developW * input.developH;
  const utilization = (per * itemArea) / (effW * effH);
  return {
    format: fmt,
    itemsPerSheet: per,
    sheets: sheetsWithWaste,
    materialCost,
    printCost,
    total: materialCost + printCost,
    printsPerPurchase,
    utilization,
  };
}

/**
 * Подобрать самый выгодный печатный формат для одной детали.
 * — Перебирает A3+ / A2+ (A1 запрещён).
 * — Если деталь помещалась на A1, программа честно говорит об этом и сплитит
 *   на A2+ (фактически тот же выбор, но в подсказке появляется пояснение).
 */
export function pickBestFormat(input: ImposeInput): ImposeResult {
  const variants: ImposeVariant[] = [];
  for (const fmt of PRINT_FORMATS) {
    const v = calcVariant(input, fmt);
    if (v) variants.push(v);
  }
  variants.sort((a, b) => a.total - b.total);
  const best = variants[0] ?? null;

  const fitsA1 = itemsPerSheet(input.developW, input.developH, A1_FORMAT.w, A1_FORMAT.h) > 0;
  const splitFromA1 =
    fitsA1 &&
    itemsPerSheet(input.developW, input.developH, PRINT_FORMATS[1].w, PRINT_FORMATS[1].h) === 0;

  let hint = "";
  if (!best) {
    hint = "Деталь не помещается ни в один доступный печатный формат. Уменьшите развёртку или смените материал.";
  } else if (splitFromA1) {
    hint = `Деталь помещалась на A1, но машины A1 нет — раскладка на 2 × ${best.format.id}.`;
    best.pickedDueToA1Block = true;
  } else if (variants.length > 1) {
    const second = variants[1];
    const diff = Math.max(0, second.total - best.total);
    hint = `Выгоднее ${best.format.id}: экономия ${Math.round(diff)} ₸ против ${second.format.id}.`;
  } else {
    hint = `Доступен только ${best.format.id}.`;
  }

  return { best, variants, hint, splitFromA1 };
}