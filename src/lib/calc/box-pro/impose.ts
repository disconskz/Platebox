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

// ─── Этап 3: групповая раскладка ─────────────────────────────────────

/** Входная деталь группы (материал в группе общий, см. groupSignature). */
export interface GroupPart {
  id: string;
  developW: number;
  developH: number;
  totalParts: number;
}

/** Сигнатура группировки: совпадают материал, печать, ламинация. */
export function groupSignature(p: {
  materialId: string;
  colorFront: number;
  colorBack: number;
  hasLam: boolean;
  lamSides: number;
}): string {
  return [p.materialId, p.colorFront, p.colorBack, p.hasLam ? "L" + p.lamSides : "n"].join("|");
}

export interface GroupImposeInput {
  parts: GroupPart[];
  sheetW: number;
  sheetH: number;
  pricePerPurchaseSheet: number;
  wastePct: number;
  colorSum: number;
}

export interface GroupImposeVariant {
  format: PrintFormat;
  /** Один общий тираж листов на всю группу. */
  sheets: number;
  materialCost: number;
  printCost: number;
  total: number;
  /** Какая деталь стала «ведущей» — определила тираж листов. */
  leadingPartId: string;
  /** Раскладка по деталям: id → итог по этой детали в составе группы. */
  perPart: Record<string, { itemsPerSheet: number; attributedMaterial: number; attributedPrint: number; sheets: number }>;
}

export interface GroupImposeResult {
  best: GroupImposeVariant | null;
  variants: GroupImposeVariant[];
  /** Сколько стоила бы группа без совмещения (сумма независимых раскладок). */
  independentTotal: number;
  /** Экономия от совмещения, тг (>=0). */
  savings: number;
  hint: string;
}

function calcGroupVariant(input: GroupImposeInput, fmt: PrintFormat): GroupImposeVariant | null {
  const effW = Math.min(fmt.w, input.sheetW);
  const effH = Math.min(fmt.h, input.sheetH);
  const perParts = input.parts.map((p) => {
    const per = itemsPerSheet(p.developW, p.developH, effW, effH);
    const sheetsInd = per > 0 ? Math.ceil(p.totalParts / per) : Infinity;
    return { part: p, per, sheetsInd };
  });
  // Все детали должны хотя бы помещаться на печатный формат
  if (perParts.some((x) => x.per <= 0)) return null;
  // Ведущая деталь = самая «тяжёлая» (максимум листов независимо)
  const lead = perParts.reduce((m, x) => (x.sheetsInd > m.sheetsInd ? x : m), perParts[0]);
  const printSheetsRaw = lead.sheetsInd;
  const sheetsWithWaste = Math.ceil(printSheetsRaw * (1 + input.wastePct / 100));
  const printsPerPurchase =
    Math.max(1, Math.floor(input.sheetW / fmt.w) * Math.floor(input.sheetH / fmt.h)) || 1;
  const purchaseSheets = Math.ceil(sheetsWithWaste / printsPerPurchase);
  const materialCost = purchaseSheets * input.pricePerPurchaseSheet;
  const colorFactor = input.colorSum > 0 ? input.colorSum / 4 : 0;
  const printCost =
    colorFactor > 0 ? sheetsWithWaste * fmt.pricePerSheet * colorFactor + fmt.setupPerForm : 0;
  // Атрибуция стоимости: пропорционально требуемым в группе тиражам деталей
  const totalReq = perParts.reduce((s, x) => s + x.sheetsInd, 0) || 1;
  const perPart: GroupImposeVariant["perPart"] = {};
  for (const x of perParts) {
    const w = x.sheetsInd / totalReq;
    perPart[x.part.id] = {
      itemsPerSheet: x.per,
      sheets: x.sheetsInd,
      attributedMaterial: materialCost * w,
      attributedPrint: printCost * w,
    };
  }
  return {
    format: fmt,
    sheets: sheetsWithWaste,
    materialCost,
    printCost,
    total: materialCost + printCost,
    leadingPartId: lead.part.id,
    perPart,
  };
}

/**
 * Подобрать лучший формат для группы деталей с совмещённым спуском.
 * Возвращает также независимую базовую стоимость и экономию.
 */
export function pickBestForGroup(input: GroupImposeInput): GroupImposeResult {
  const variants: GroupImposeVariant[] = [];
  for (const fmt of PRINT_FORMATS) {
    const v = calcGroupVariant(input, fmt);
    if (v) variants.push(v);
  }
  variants.sort((a, b) => a.total - b.total);
  const best = variants[0] ?? null;

  // Базовая «независимая» стоимость — сумма pickBestFormat по каждой детали
  let independentTotal = 0;
  for (const p of input.parts) {
    const r = pickBestFormat({
      developW: p.developW,
      developH: p.developH,
      totalParts: p.totalParts,
      sheetW: input.sheetW,
      sheetH: input.sheetH,
      colorSum: input.colorSum,
      pricePerPurchaseSheet: input.pricePerPurchaseSheet,
      wastePct: input.wastePct,
    });
    independentTotal += r.best?.total ?? 0;
  }
  const savings = best ? Math.max(0, independentTotal - best.total) : 0;

  let hint = "";
  if (!best) {
    hint = "Группа не помещается на доступных форматах.";
  } else if (input.parts.length === 1) {
    hint = `${best.format.id}: одиночная деталь, совмещение не нужно.`;
  } else if (savings > 0) {
    hint = `${best.format.id}: совмещение ${input.parts.length} деталей экономит ${Math.round(savings)} ₸ (одна форма вместо ${input.parts.length}).`;
  } else {
    hint = `${best.format.id}: совмещение не даёт экономии — печатаем раздельно.`;
  }

  return { best, variants, independentTotal, savings, hint };
}