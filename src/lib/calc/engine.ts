import { CalcInput, CalcResult, DEFAULTS, FormatPair, LayoutResult, PrintFormat, SpecItem, Turnaround } from "./types";
import type { CalcRules } from "./rules";
import { validateCalcInput, cutsForNesting, finishCutsPerItem } from "./validation";

// Глобально настраиваемые правила. Калькулятор грузит их из БД и вызывает
// setCalcRules(rules) перед run/layout. Если не задано — используем DEFAULTS.
let CURRENT_RULES: CalcRules = { ...DEFAULTS };
export function setCalcRules(r: CalcRules) {
  CURRENT_RULES = { ...DEFAULTS, ...r };
}
export function getCalcRules(): CalcRules {
  return CURRENT_RULES;
}
const R = () => CURRENT_RULES;

// === Резка печатный → конечный (из справочника cut_count_rules + константа) ===
export interface CutRulesData {
  /** Цена одного реза печатного листа, ₸. */
  pricePerCut: number;
  /** Карта "PRINT|ITEM" -> число резов на один печатный лист. */
  table: Record<string, number>;
}
let CUT_RULES: CutRulesData = { pricePerCut: 1, table: {} };
export function setCutRules(d: CutRulesData) {
  CUT_RULES = { pricePerCut: Number(d.pricePerCut) || 1, table: { ...d.table } };
}
export function getCutRules(): CutRulesData {
  return CUT_RULES;
}

// === Расходные материалы (фольга для тиснения и т.п.) ===
export interface MaterialPrices {
  /** Цена 1 см² фольги для тиснения, ₸. */
  foilPerCm2: number;
}
let MATERIAL_PRICES: MaterialPrices = { foilPerCm2: 6 };
export function setMaterialPrices(p: Partial<MaterialPrices>) {
  MATERIAL_PRICES = { ...MATERIAL_PRICES, ...p };
}
export function getMaterialPrices(): MaterialPrices {
  return MATERIAL_PRICES;
}

/** A-форматы в мм для распознавания печатного листа по фактическим размерам. */
const A_FORMATS: Array<{ name: string; w: number; h: number }> = [
  { name: "A0", w: 841, h: 1189 },
  { name: "A1", w: 594, h: 841 },
  { name: "A2", w: 420, h: 594 },
  { name: "A3", w: 297, h: 420 },
  { name: "A4", w: 210, h: 297 },
  { name: "A5", w: 148, h: 210 },
  { name: "A6", w: 105, h: 148 },
];
/** Определить имя печатного листа по фактическим размерам (±15 мм допуск, любая ориентация). */
export function detectPrintFormatName(w: number, h: number, tol = 15): string | null {
  const lo = Math.min(w, h);
  const hi = Math.max(w, h);
  for (const f of A_FORMATS) {
    if (Math.abs(f.w - lo) <= tol && Math.abs(f.h - hi) <= tol) return f.name;
  }
  // SRA/печатные форматы > A2 — приравниваем к ближайшему «надформату»
  if (hi >= 700) return "A1";
  if (hi >= 500) return "A2";
  if (hi >= 380) return "A3";
  return null;
}
/** Поиск количества резов в таблице. Возвращает null, если связки нет. */
export function lookupCutCount(printName: string | null, itemName: string | null): number | null {
  if (!printName || !itemName) return null;
  const key = `${printName}|${itemName}`;
  const v = CUT_RULES.table[key];
  return typeof v === "number" && v >= 0 ? v : null;
}

/**
 * Авто-расчёт количества резов по фактической раскладке (ТЗ).
 * - 1 изделие на листе → 4 реза (обрезка по периметру);
 * - иначе → 2 × (cols + rows).
 */
export function autoCutsFromLayout(layout: { cols: number; rows: number; itemsPerSheet: number }): number {
  const items = Math.max(1, layout.itemsPerSheet | 0);
  if (items <= 1) return 4;
  const cols = Math.max(1, layout.cols | 0);
  const rows = Math.max(1, layout.rows | 0);
  return 2 * (cols + rows);
}

export function calculateLayout(
  productW: number,
  productH: number,
  printW: number,
  printH: number,
  isSticker: boolean
): LayoutResult | null {
  const variants = layoutVariants(productW, productH, printW, printH, isSticker);
  if (!variants.length) return null;
  variants.sort((a, b) => b.itemsPerSheet - a.itemsPerSheet);
  return variants[0];
}

/**
 * Возвращает ВСЕ валидные варианты раскладки (обе ориентации) для данного
 * печатного листа. Используется ранжированием, чтобы можно было выбирать
 * подходящий вариант (например, чётное число изделий для «своего оборота»),
 * а не только тот, что даёт максимум шт/лист.
 */
export function layoutVariants(
  productW: number,
  productH: number,
  printW: number,
  printH: number,
  isSticker: boolean
): LayoutResult[] {
  const r = R();
  const bleed = r.bleed;
  const margins = { left: r.marginLeft, right: r.marginRight, top: r.marginTop, bottom: r.marginBottom };
  const gap = isSticker ? r.stickerGap : 0;
  const edgeMargin = isSticker ? r.stickerEdge : 0;

  const effW = productW + bleed * 2 + gap;
  const effH = productH + bleed * 2 + gap;

  const variants: LayoutResult[] = [];
  // Перебираем 4 комбинации: ориентация изделия × ориентация листа.
  // Лист физически один и тот же — захват можно расположить по любой
  // стороне. Из-за асимметрии полей (top vs bottom — захват) ориентация
  // листа влияет на число изделий.
  for (const sheetRotated of [false, true]) {
    const sw = sheetRotated ? printH : printW;
    const sh = sheetRotated ? printW : printH;
    const availW = sw - margins.left - margins.right - edgeMargin * 2;
    const availH = sh - margins.top - margins.bottom - edgeMargin * 2;
    if (availW <= 0 || availH <= 0) continue;
    for (const rotated of [false, true]) {
      const w = rotated ? effH : effW;
      const h = rotated ? effW : effH;
      const cols = Math.floor(availW / w);
      const rows = Math.floor(availH / h);
      if (cols > 0 && rows > 0) {
        const used = cols * rows * w * h;
        const total = sw * sh;
        variants.push({
          itemsPerSheet: cols * rows,
          rotated,
          cols,
          rows,
          printFormat: { width: sw, height: sh },
          wasteArea: total - used,
          effectiveItemW: w,
          effectiveItemH: h,
          margins,
          edgeMargin,
          gap,
        });
      }
    }
  }
  return variants;
}

export function bestLayout(
  productW: number,
  productH: number,
  isSticker: boolean,
  formats?: PrintFormat[]
): LayoutResult | null {
  const list: PrintFormat[] =
    formats && formats.length
      ? formats
      : [
          { width: R().maxPrintW, height: R().maxPrintH },
          { width: R().altPrintW, height: R().altPrintH },
        ];
  // Сортировка по возрастанию площади — выбираем САМЫЙ МАЛЕНЬКИЙ лист,
  // в который помещается нужное количество (минимизируем отходы).
  const sorted = [...list].sort((a, b) => a.width * a.height - b.width * b.height);
  let best: LayoutResult | null = null;
  let bestScore = Infinity; // меньше — лучше: отходы на 1 изделие
  for (const f of sorted) {
    const l = calculateLayout(productW, productH, f.width, f.height, isSticker);
    if (!l) continue;
    const wastePerItem = l.wasteArea / Math.max(1, l.itemsPerSheet);
    if (wastePerItem < bestScore) {
      bestScore = wastePerItem;
      best = l;
    }
  }
  return best;
}

/**
 * Подбор пары (печатный, закупочный) из жёстких связок справочника.
 * Выбирается пара с минимумом отходов на изделие.
 */
export function bestPair(
  productW: number,
  productH: number,
  isSticker: boolean,
  pairs: FormatPair[]
): { layout: LayoutResult; pair: FormatPair } | null {
  const ranked = rankPairs(productW, productH, isSticker, pairs);
  return ranked[0] ?? null;
}

/**
 * Ранжирует все пары: max изделий с закупочного, тай-брейк — меньший печатный формат.
 */
export function rankPairs(
  productW: number,
  productH: number,
  isSticker: boolean,
  pairs: FormatPair[],
  options?: { requireEvenItems?: boolean; priorityPrintFormats?: PrintFormat[] }
): Array<{ layout: LayoutResult; pair: FormatPair; itemsPerPurchase: number; nesting: number }> {
  const out: Array<{ layout: LayoutResult; pair: FormatPair; itemsPerPurchase: number; nesting: number }> = [];
  // Лимит максимального печатного формата (по правкам fortress: 520×360).
  // Если изделие физически не помещается в этот лимит — лимит снимается.
  const r = R();
  const maxArea = r.maxPrintW * r.maxPrintH;
  const productFitsInLimit = (() => {
    const w = Math.min(productW, productH);
    const h = Math.max(productW, productH);
    const lw = Math.min(r.maxPrintW, r.maxPrintH);
    const lh = Math.max(r.maxPrintW, r.maxPrintH);
    return w + 2 * r.bleed <= lw && h + 2 * r.bleed <= lh;
  })();
  const filtered = productFitsInLimit
    ? pairs.filter((p) => p.print.width * p.print.height <= maxArea)
    : pairs;

  // Приоритетный (рабочий) печатный формат — точное совпадение по габаритам.
  const isPriority = (p: FormatPair) => {
    const list = options?.priorityPrintFormats;
    if (!list || !list.length) return false;
    return list.some(
      (f) =>
        (f.width === p.print.width && f.height === p.print.height) ||
        (f.width === p.print.height && f.height === p.print.width)
    );
  };

  // Перебираем ВСЕ варианты раскладки (обе ориентации) для каждой пары —
  // чтобы под условие requireEvenItems можно было выбрать подходящий
  // вариант, а не только тот, что даёт максимум шт/лист.
  for (const p of (filtered.length ? filtered : pairs)) {
    const variants = layoutVariants(productW, productH, p.print.width, p.print.height, isSticker);
    if (!variants.length) continue;
    const nesting = Math.max(
      1,
      nestingPurchaseToPrint(p.purchase.width, p.purchase.height, p.print.width, p.print.height)
    );
    for (const l of variants) {
      out.push({ layout: l, pair: p, itemsPerPurchase: l.itemsPerSheet * nesting, nesting });
    }
  }

  // Чётное число изделий на лист (печать «свой оборот»).
  let pool = out;
  if (options?.requireEvenItems) {
    const even = out.filter((r) => r.layout.itemsPerSheet % 2 === 0);
    if (even.length) pool = even;
  }

  // ЖЁСТКИЙ приоритет рабочих форматов: если изделие помещается хотя бы в
  // один приоритетный печатный формат — оптимальный вариант выбирается ТОЛЬКО
  // среди приоритетных. Раскройные форматы (500×350, 250×700 и т.п.) могут
  // оставаться лишь как альтернативы, но не как «оптимальные».
  const priorityPool = pool.filter((r) => isPriority(r.pair));
  const mainPool = priorityPool.length ? priorityPool : pool;

  // Внутри отфильтрованного пула — финансово-выгодное ранжирование:
  //   1) больше изделий на печатном листе (меньше с/с на изделие);
  //   2) меньше отходов на изделие (рациональность);
  //   3) больше изделий с закупочного (меньше закупаем);
  //   4) меньший печатный лист (меньше остатков).
  const sortFn = (
    a: (typeof out)[number],
    b: (typeof out)[number]
  ) => {
    if (b.layout.itemsPerSheet !== a.layout.itemsPerSheet)
      return b.layout.itemsPerSheet - a.layout.itemsPerSheet;
    const wa = a.layout.wasteArea / Math.max(1, a.layout.itemsPerSheet);
    const wb = b.layout.wasteArea / Math.max(1, b.layout.itemsPerSheet);
    if (wa !== wb) return wa - wb;
    if (b.itemsPerPurchase !== a.itemsPerPurchase)
      return b.itemsPerPurchase - a.itemsPerPurchase;
    return a.pair.print.width * a.pair.print.height - b.pair.print.width * b.pair.print.height;
  };

  mainPool.sort(sortFn);

  // Альтернативы — все остальные варианты (включая раскройные), отсортированные
  // тем же правилом, без дублей по (печатный, закупочный, ориентация).
  const taken = new Set(
    mainPool.map((r) => `${r.pair.print.width}x${r.pair.print.height}|${r.pair.purchase.width}x${r.pair.purchase.height}|${r.layout.rotated}`)
  );
  const alts = pool
    .filter((r) => !taken.has(`${r.pair.print.width}x${r.pair.print.height}|${r.pair.purchase.width}x${r.pair.purchase.height}|${r.layout.rotated}`))
    .sort(sortFn);

  // Дедуп по (печатный, закупочный) — оставляем лучший вариант ориентации,
  // чтобы не плодить дубликаты в превью.
  const dedup = (arr: typeof out) => {
    const seen = new Set<string>();
    const res: typeof out = [];
    for (const r of arr) {
      const key = `${r.pair.print.width}x${r.pair.print.height}|${r.pair.purchase.width}x${r.pair.purchase.height}`;
      if (seen.has(key)) continue;
      seen.add(key);
      res.push(r);
    }
    return res;
  };

  return [...dedup(mainPool), ...dedup(alts)];
}

export function determineTurnaround(
  productType: string,
  formatType: string,
  formatW: number,
  formatH: number,
  colorFront: number,
  colorBack: number,
  itemsPerSheet: number
): Turnaround {
  if (colorBack === 0) return "none";
  if (colorFront !== colorBack) return "foreign";
  const isLargeFormat =
    formatType === "A3" || formatType === "A3+" || (formatType === "custom" && (formatW > 210 || formatH > 297));
  if (productType === "leaflet" || productType === "leaflet_diecut" || productType === "booklet") {
    if (!isLargeFormat) return "own";
    return "foreign";
  }
  if (itemsPerSheet % 2 === 0) return "own";
  return "foreign";
}

export function calculateForms(colorFront: number, colorBack: number, t: Turnaround): number {
  if (t === "none") return colorFront;
  if (t === "own") return colorFront;
  return colorFront + colorBack;
}

function nestingPurchaseToPrint(purchaseW: number, purchaseH: number, printW: number, printH: number) {
  // count print sheets per purchase sheet (try both orientations)
  let best = 0;
  for (const rotated of [false, true]) {
    const w = rotated ? printH : printW;
    const h = rotated ? printW : printH;
    const cols = Math.floor(purchaseW / w);
    const rows = Math.floor(purchaseH / h);
    const n = cols * rows;
    if (n > best) best = n;
  }
  return best;
}

function laminationKey(productW: number, productH: number): "up_to_a4_plus" | "a4_plus_to_a3_plus" | "a3_plus_to_a2_plus" | "a2_plus_to_a1" {
  const max = Math.max(productW, productH);
  const min = Math.min(productW, productH);
  if (max <= 320 && min <= 230) return "up_to_a4_plus"; // ~A4+
  if (max <= 460 && min <= 320) return "a4_plus_to_a3_plus"; // ~A3+
  if (max <= 640 && min <= 460) return "a3_plus_to_a2_plus";
  return "a2_plus_to_a1";
}

export function runCalculation(input: CalcInput, rulesOverride?: CalcRules): CalcResult {
  validateCalcInput(input);
  if (rulesOverride) setCalcRules(rulesOverride);
  const rule = R();
  const warnings: string[] = [];
  const isSticker = input.productType === "sticker" || input.productType === "sticker_diecut";
  const isDieCut = input.productType === "leaflet_diecut" || input.productType === "sticker_diecut" || input.productType === "bag";
  const isBag = input.productType === "bag";
  const isBooklet = input.productType === "booklet";

  // Если переданы жёсткие пары (закупочный↔печатный) — используем их и
  // автоматически переопределяем закупочный формат материала.
  let layout: LayoutResult | null;
  let pickedPurchase: PrintFormat | null = null;
  let alternatives: CalcResult["alternatives"] = [];
  let rankedPairs: ReturnType<typeof rankPairs> = [];
  if (input.formatPairs && input.formatPairs.length) {
    const ranked = rankPairs(input.formatWidth, input.formatHeight, isSticker, input.formatPairs, {
      requireEvenItems: input.requireEvenItems,
      priorityPrintFormats: input.priorityPrintFormats,
    });
    if (!ranked.length) throw new Error("Изделие не вмещается ни в один доступный печатный формат.");
    layout = ranked[0].layout;
    pickedPurchase = ranked[0].pair.purchase;
    rankedPairs = ranked;
  } else {
    layout = bestLayout(input.formatWidth, input.formatHeight, isSticker, input.printFormats);
    if (!layout) throw new Error("Изделие не вмещается в печатный лист. Выберите другой формат.");
  }

  const turnaround = determineTurnaround(
    input.productType,
    input.formatType,
    input.formatWidth,
    input.formatHeight,
    input.colorFront,
    input.colorBack,
    layout.itemsPerSheet
  );

  const forms = input.manualForms ?? calculateForms(input.colorFront, input.colorBack, turnaround);

  // Net print sheets
  const netPrintSheets = Math.ceil(input.circulation / layout.itemsPerSheet);

  // Setup sheets
  // Базовая формула приладки (для «своего оборота»): setupOwn + 1% от тиража печатных листов.
  // Для «чужого оборота» приладка = 2 × базовая (печатается два прогона).
  // Для «без оборота» — приладка = базовая (один прогон), но без процентной надбавки —
  // достаточно константы setupOwn, иначе цифры завышены.
  let setupSheets: number;
  if (input.manualSetupSheets !== undefined && input.manualSetupSheets !== null) {
    setupSheets = input.manualSetupSheets;
  } else {
    const baseOwn = Math.ceil(rule.setupOwn + netPrintSheets * rule.setupPercent);
    if (turnaround === "foreign") {
      setupSheets = baseOwn * 2;
    } else if (turnaround === "none") {
      setupSheets = Math.max(1, Math.ceil(rule.setupOwn));
    } else {
      setupSheets = baseOwn;
    }
  }
  if (isBag) setupSheets = Math.max(rule.bagMinSetup, setupSheets);
  if (turnaround === "foreign" && (input.manualSetupSheets === undefined || input.manualSetupSheets === null)) {
    warnings.push("Чужой оборот: приладка = ×2 от своего оборота (" + setupSheets + " листов).");
  }

  const printSheets = netPrintSheets + setupSheets;

  // Purchase sheets — закупочный формат берём из пары (если есть), иначе из материала
  const purchaseW = pickedPurchase?.width ?? input.material.format_width;
  const purchaseH = pickedPurchase?.height ?? input.material.format_height;
  const purchaseNesting = Math.max(
    1,
    nestingPurchaseToPrint(purchaseW, purchaseH, layout.printFormat.width, layout.printFormat.height)
  );
  const purchaseSheets = Math.ceil(printSheets / purchaseNesting);
  const paperCost = purchaseSheets * input.material.cost_per_sheet;

  if (paperCost === 0) {
    warnings.push("Стоимость бумаги = 0. Проверьте выбор закупочного формата.");
  }

  // Cuts purchase -> print (бинарная гильотина, см. cutsForNesting)
  const cutsPerSheet = cutsForNesting(purchaseNesting);
  const paperCutCost = cutsPerSheet * purchaseSheets * rule.cutCostPerSheet;

  const formsCost = forms * rule.formCost;
  const formsPrepCost = forms * rule.formPrepCost;

  // Print
  // Каждый прогон краски = отдельный оттиск. Стороны учитываются через
  // colorFront + colorBack (для «свой оборот» обычно colorBack > 0).
  const colorsTotal = Math.max(1, (input.colorFront || 0) + (input.colorBack || 0));
  const impressions = printSheets * colorsTotal;
  const setupImpressions = setupSheets * colorsTotal;
  const runImpressions = netPrintSheets * colorsTotal;
  const printPerImpr = input.printCostPerImpression ?? (turnaround === "foreign" ? 5 : 3);
  const printCost = impressions * printPerImpr;
  const inkCost = 0;

  // Postpress
  const postpress: SpecItem[] = [];
  // Расходные материалы (фольга и т.п.) — выносим в отдельную «корзину»
  // и показываем в конце сводки вместе с бумагой/краской.
  const consumables: SpecItem[] = [];

  // Резка печатного листа на конечный формат изделия.
  // Приоритет (по ТЗ):
  //   1) ручное переопределение (input.cutsPerSheetOverride);
  //   2) справочник cut_count_rules по связке «печатный → конечный»;
  //   3) авто-расчёт по фактической раскладке: 1 → 4 реза, иначе 2×(cols+rows).
  const printName = detectPrintFormatName(layout.printFormat.width, layout.printFormat.height);
  const itemName = input.formatType && input.formatType !== "custom" ? input.formatType : null;
  const cutPrice = CUT_RULES.pricePerCut ?? rule.finishCutCost ?? 1;
  const tableCuts = lookupCutCount(printName, itemName);
  const override = Number.isFinite(input.cutsPerSheetOverride as number) && (input.cutsPerSheetOverride as number) >= 0
    ? Math.floor(input.cutsPerSheetOverride as number)
    : null;
  let finishCutsPerSheet: number;
  let cutSource: "manual" | "table" | "auto";
  let cutLabel: string;
  if (override != null) {
    finishCutsPerSheet = override;
    cutSource = "manual";
    cutLabel = `Резка (ручная корректировка, ${finishCutsPerSheet} рез/лист)`;
  } else if (tableCuts != null) {
    finishCutsPerSheet = tableCuts;
    cutSource = "table";
    cutLabel = `Резка ${printName} → ${itemName} (справочник, ${finishCutsPerSheet} рез/лист)`;
  } else {
    finishCutsPerSheet = autoCutsFromLayout(layout);
    cutSource = "auto";
    cutLabel = layout.itemsPerSheet <= 1
      ? `Резка (авто: 1 изделие → 4 реза)`
      : `Резка (авто: 2×(${layout.cols}+${layout.rows}) = ${finishCutsPerSheet} рез/лист)`;
  }
  const cutQty = Math.ceil(printSheets * finishCutsPerSheet);
  postpress.push({
    stage: "postpress",
    name: `${cutLabel} — ${finishCutsPerSheet} рез/лист × ${printSheets} лист.`,
    quantity: cutQty,
    unit: "рез",
    unitPrice: cutPrice,
    total: cutQty * cutPrice,
  });
  const bleed = R().bleed;
  const cutInfo = {
    source: cutSource,
    printName,
    itemName,
    cols: layout.cols,
    rows: layout.rows,
    itemsPerSheet: layout.itemsPerSheet,
    cutsPerSheet: finishCutsPerSheet,
    pricePerCut: cutPrice,
    printSheets,
    total: cutQty * cutPrice,
    bleed,
    productW: input.formatWidth,
    productH: input.formatHeight,
    productWithBleedW: input.formatWidth + bleed * 2,
    productWithBleedH: input.formatHeight + bleed * 2,
    printW: layout.printFormat.width,
    printH: layout.printFormat.height,
    margins: layout.margins,
    usableW: Math.max(0, layout.printFormat.width - layout.margins.left - layout.margins.right),
    usableH: Math.max(0, layout.printFormat.height - layout.margins.top - layout.margins.bottom),
  };

  if (isBooklet && input.hasFold) {
    const folds = (input.foldCount ?? 1) * input.circulation;
    const u = (input.foldCount ?? 1) === 1 ? 1.5 : 2.5;
    postpress.push({ stage: "postpress", name: "Фальцовка (приладка)", quantity: 1, unit: "шт", unitPrice: (rule as any).operationSetupCost ?? 1500, total: (rule as any).operationSetupCost ?? 1500 });
    postpress.push({ stage: "postpress", name: `Фальцовка (${input.foldCount ?? 1} сг.)`, quantity: folds, unit: "сгиб", unitPrice: u, total: folds * u });
  }

  if (isDieCut && input.hasDieCut !== false) {
    postpress.push({ stage: "postpress", name: "Высечка (приладка)", quantity: 1, unit: "шт", unitPrice: 2000, total: 2000 });
    postpress.push({ stage: "postpress", name: "Высечка", quantity: input.circulation, unit: "шт", unitPrice: 2, total: input.circulation * 2 });
  }

  if (input.hasLamPrepress) {
    const sides = input.lamPrepressSides ?? 1;
    postpress.push({ stage: "postpress", name: "Припрессовка плёнки (приладка)", quantity: sides, unit: "сторона", unitPrice: 1000, total: 1000 * sides });
    postpress.push({ stage: "postpress", name: "Припрессовка плёнки", quantity: input.circulation * sides, unit: "лист", unitPrice: 8, total: input.circulation * sides * 8 });
  }

  if (input.hasLamination && input.laminationFilm) {
    const key = laminationKey(input.formatWidth, input.formatHeight);
    const mapKey = `${input.laminationFilm}:${key}`;
    const price = input.laminationPriceMap?.[mapKey] ?? 25;
    const sides = input.laminationSides ?? 1;
    postpress.push({ stage: "postpress", name: "Ламинация (приладка)", quantity: sides, unit: "сторона", unitPrice: (rule as any).operationSetupCost ?? 1500, total: ((rule as any).operationSetupCost ?? 1500) * sides });
    postpress.push({ stage: "postpress", name: `Ламинация ${input.laminationFilm} (${sides} ст.)`, quantity: input.circulation * sides, unit: "сторона", unitPrice: price, total: input.circulation * sides * price });
  }

  if (input.hasNumbering && input.numbersPerSheet) {
    const qty = input.numbersPerSheet * input.circulation;
    postpress.push({ stage: "postpress", name: "Нумерация (приладка)", quantity: 1, unit: "шт", unitPrice: (rule as any).operationSetupCost ?? 1500, total: (rule as any).operationSetupCost ?? 1500 });
    postpress.push({ stage: "postpress", name: "Нумерация", quantity: qty, unit: "номер", unitPrice: rule.numberingCost, total: qty * rule.numberingCost });
  }

  if (input.hasStamping) {
    // Список клише: либо массив, либо одиночные W/H для обратной совместимости.
    const cliches = (input.stampingCliches && input.stampingCliches.length
      ? input.stampingCliches
      : (input.stampingClicheW && input.stampingClicheH
          ? [{ w: input.stampingClicheW, h: input.stampingClicheH }]
          : [])
    ).filter((c) => c.w > 0 && c.h > 0);
    if (cliches.length > 0) {
      const impr = input.stampingNotebook ? rule.stampingImprNotebook : rule.stampingImpr;
      postpress.push({ stage: "postpress", name: "Тиснение (приладка)", quantity: 1, unit: "шт", unitPrice: rule.stampingSetup, total: rule.stampingSetup });
      const pointsList = cliches.map((c) => Math.max(1, Math.floor((c as any).points ?? 1)));
      const totalPoints = pointsList.reduce((s, n) => s + n, 0);
      cliches.forEach((c, i) => {
        const area = c.w * c.h;
        const cliche = Math.max(rule.stampingClicheMin, area * rule.stampingClichePerCm2);
        const p = pointsList[i];
        const label = cliches.length > 1 || p > 1
          ? ` #${i + 1} (${c.w}×${c.h} см${p > 1 ? `, ${p} точек` : ""})`
          : "";
        postpress.push({ stage: "postpress", name: `Тиснение (клише)${label}`, quantity: area, unit: "см²", unitPrice: rule.stampingClichePerCm2, total: cliche });
      });
      const totalImpr = input.circulation * totalPoints;
      postpress.push({
        stage: "postpress",
        name: totalPoints > 1 ? `Тиснение (оттиски, ${totalPoints} точек)` : "Тиснение (оттиски)",
        quantity: totalImpr,
        unit: "оттиск",
        unitPrice: impr,
        total: totalImpr * impr,
      });
      // Фольга: расход = сумма площадей клише с учётом точек × тираж.
      const totalFoilAreaPerImpr = cliches.reduce((s, c, i) => s + c.w * c.h * pointsList[i], 0);
      const foilArea = totalFoilAreaPerImpr * input.circulation;
      const foilPrice = MATERIAL_PRICES.foilPerCm2;
      if (foilArea > 0 && foilPrice > 0) {
        consumables.push({
          stage: "material",
          name: "Фольга для тиснения",
          quantity: Math.ceil(foilArea),
          unit: "см²",
          unitPrice: foilPrice,
          total: Math.ceil(foilArea) * foilPrice,
        });
      }
    }
  }

  if (input.hasEmbossing) {
    const cliches = (input.embossingCliches && input.embossingCliches.length ? input.embossingCliches : [])
      .filter((c) => c.w > 0 && c.h > 0);
    if (cliches.length > 0) {
      const impr = input.embossingNotebook ? rule.stampingImprNotebook : rule.stampingImpr;
      postpress.push({ stage: "postpress", name: "Конгрев (приладка)", quantity: 1, unit: "шт", unitPrice: rule.stampingSetup, total: rule.stampingSetup });
      const pointsList = cliches.map((c) => Math.max(1, Math.floor((c as any).points ?? 1)));
      const totalPoints = pointsList.reduce((s, n) => s + n, 0);
      cliches.forEach((c, i) => {
        const area = c.w * c.h;
        const cliche = Math.max(rule.stampingClicheMin, area * rule.stampingClichePerCm2);
        const p = pointsList[i];
        const label = cliches.length > 1 || p > 1
          ? ` #${i + 1} (${c.w}×${c.h} см${p > 1 ? `, ${p} точек` : ""})`
          : "";
        postpress.push({ stage: "postpress", name: `Конгрев (клише)${label}`, quantity: area, unit: "см²", unitPrice: rule.stampingClichePerCm2, total: cliche });
      });
      const totalImpr = input.circulation * totalPoints;
      postpress.push({
        stage: "postpress",
        name: totalPoints > 1 ? `Конгрев (оттиски, ${totalPoints} точек)` : "Конгрев (оттиски)",
        quantity: totalImpr,
        unit: "оттиск",
        unitPrice: impr,
        total: totalImpr * impr,
      });
    }
  }

  // Logistics: упаковка ×2 для вырубки
  const logistics: SpecItem[] = [];
  const packUnit = input.packagingPerUnit ?? 5;
  const packMult = isDieCut && !isBag ? 2 : 1;
  logistics.push({ stage: "logistics", name: packMult === 2 ? "Упаковка (двойная)" : "Упаковка", quantity: input.circulation * packMult, unit: "шт", unitPrice: packUnit, total: input.circulation * packMult * packUnit });
  if (isBag) {
    logistics.push({ stage: "logistics", name: "Упаковка журналов + резка", quantity: input.circulation, unit: "шт", unitPrice: 8, total: input.circulation * 8 });
  }

  // Prepress
  const prepress: SpecItem[] = [];
  if (input.photoOutputUnitCost > 0) {
    prepress.push({ stage: "prepress", name: "Фотовывод", quantity: forms, unit: "шт", unitPrice: input.photoOutputUnitCost, total: forms * input.photoOutputUnitCost });
  }
  // Вывод печатных форм (пластины). Если цена в правилах = 0, строку не добавляем —
  // её заменит позиция «Вывод форм CTP» из справочника операций (auto-включается в UI).
  if (rule.formCost > 0) {
    prepress.push({ stage: "prepress", name: "Вывод печатных форм", quantity: forms, unit: "шт", unitPrice: rule.formCost, total: formsCost });
  }
  prepress.push({ stage: "prepress", name: "Подготовка к печати", quantity: forms, unit: "форма", unitPrice: rule.formPrepCost, total: formsPrepCost });
  // Резка закупочного → печатный лист. Показываем, если режем (nesting > 1),
  // даже когда цена реза = 0 — чтобы менеджер видел количество резов.
  if (cutsPerSheet * purchaseSheets > 0 && rule.cutCostPerSheet > 0) {
    prepress.push({
      stage: "prepress",
      name: "Резка на печатный формат",
      quantity: cutsPerSheet * purchaseSheets,
      unit: "рез",
      unitPrice: rule.cutCostPerSheet,
      total: paperCutCost,
    });
  }

  const materials: SpecItem[] = [
    { stage: "material", name: input.material.name, quantity: purchaseSheets, unit: "лист", unitPrice: input.material.cost_per_sheet, total: paperCost },
  ];

  // Печать: разделяем приладку и тираж, чтобы менеджер видел стоимость
  // приладочных оттисков отдельно от рабочего тиража.
  const turnLabel = turnaround === "foreign" ? "чужой" : turnaround === "own" ? "свой" : "без оборота";
  const printItems: SpecItem[] = [];
  if (setupImpressions > 0) {
    printItems.push({
      stage: "print",
      name: `Печать офсетная — приладка (${turnLabel})`,
      quantity: setupImpressions,
      unit: "оттиск",
      unitPrice: printPerImpr,
      total: setupImpressions * printPerImpr,
    });
  }
  printItems.push({
    stage: "print",
    name: `Печать офсетная — тираж (${turnLabel})`,
    quantity: runImpressions,
    unit: "оттиск",
    unitPrice: printPerImpr,
    total: runImpressions * printPerImpr,
  });

  const spec = [...prepress, ...materials, ...printItems, ...postpress, ...logistics, ...consumables];
  const totalCost = spec.reduce((s, i) => s + i.total, 0);

  const vatPercent = input.vatPercent ?? 0;
  const vatAmount = totalCost * (vatPercent / 100);
  const totalWithVat = totalCost + vatAmount;

  // Стоимости по альтернативам — упрощённая модель: бумага + печать + отходы.
  // Используется только для сравнения вариантов в превью.
  alternatives = rankedPairs.slice(1, 4).map((r) => {
    const altNet = Math.ceil(input.circulation / r.layout.itemsPerSheet);
    const altPrintSheets = altNet + setupSheets;
    const altPurchaseSheets = Math.ceil(altPrintSheets / Math.max(1, r.nesting));
    const altPaper = altPurchaseSheets * input.material.cost_per_sheet;
    const altImpressions = altPrintSheets * (turnaround === "own" ? 2 : 1);
    const altPrint = altImpressions * printPerImpr;
    // Стоимость отходов = доля бумаги, ушедшая в обрезки на печатном листе
    const printArea = r.layout.printFormat.width * r.layout.printFormat.height;
    const wasteShare = printArea > 0 ? r.layout.wasteArea / printArea : 0;
    const altWaste = altPaper * wasteShare;
    return {
      printW: r.layout.printFormat.width,
      printH: r.layout.printFormat.height,
      purchaseW: r.pair.purchase.width,
      purchaseH: r.pair.purchase.height,
      itemsPerSheet: r.layout.itemsPerSheet,
      itemsPerPurchase: r.itemsPerPurchase,
      layout: r.layout,
      paperCost: Math.round(altPaper),
      printCost: Math.round(altPrint),
      wasteCost: Math.round(altWaste),
      totalCost: Math.round(altPaper + altPrint),
    };
  });

  return {
    layout,
    turnaround,
    forms,
    setupSheets,
    printSheets,
    netPrintSheets,
    purchaseSheets,
    purchaseNesting,
    paperCost,
    paperCutCost,
    formsCost,
    formsPrepCost,
    printCost,
    inkCost,
    postpress,
    prepress,
    materials,
    printItems,
    logistics,
    spec,
    totalCost,
    vatPercent,
    vatAmount,
    totalWithVat,
    warnings,
    alternatives,
    cutInfo,
  };
}

export const FORMAT_PRESETS: Record<string, { w: number; h: number }> = {
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  "A3+": { w: 320, h: 460 },
  A4: { w: 210, h: 297 },
  "A4+": { w: 230, h: 320 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
};