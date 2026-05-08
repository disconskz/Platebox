import { CalcInput, CalcResult, DEFAULTS, FormatPair, LayoutResult, PrintFormat, SpecItem, Turnaround } from "./types";

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
  const bleed = DEFAULTS.bleed;
  const margins = { left: DEFAULTS.marginLR, right: DEFAULTS.marginLR, top: DEFAULTS.marginTop, bottom: DEFAULTS.marginBottom };
  const gap = isSticker ? DEFAULTS.stickerGap : 0;
  const edgeMargin = isSticker ? DEFAULTS.stickerEdge : 0;

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
          { width: DEFAULTS.maxPrintW, height: DEFAULTS.maxPrintH },
          { width: DEFAULTS.altPrintW, height: DEFAULTS.altPrintH },
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
  const maxArea = DEFAULTS.maxPrintW * DEFAULTS.maxPrintH;
  const productFitsInLimit = (() => {
    const w = Math.min(productW, productH);
    const h = Math.max(productW, productH);
    const lw = Math.min(DEFAULTS.maxPrintW, DEFAULTS.maxPrintH);
    const lh = Math.max(DEFAULTS.maxPrintW, DEFAULTS.maxPrintH);
    return w + 2 * DEFAULTS.bleed <= lw && h + 2 * DEFAULTS.bleed <= lh;
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

export function runCalculation(input: CalcInput): CalcResult {
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
  let setupSheets =
    input.manualSetupSheets ??
    Math.ceil((turnaround === "foreign" ? DEFAULTS.setupForeign : DEFAULTS.setupOwn) + netPrintSheets * DEFAULTS.setupPercent);
  if (isBag) setupSheets = Math.max(DEFAULTS.bagMinSetup, setupSheets);
  else setupSheets = Math.max(DEFAULTS.setupOwn, setupSheets);
  if (turnaround === "foreign" && !input.manualSetupSheets) {
    warnings.push("Чужой оборот: приладка увеличена до " + setupSheets + " листов.");
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

  // Cuts purchase -> print
  let cutsPerSheet = 0;
  if (purchaseNesting === 2) cutsPerSheet = 1;
  else if (purchaseNesting >= 3) cutsPerSheet = 2;
  else if (purchaseNesting === 4) cutsPerSheet = 2;
  const paperCutCost = cutsPerSheet * purchaseSheets * DEFAULTS.cutCostPerSheet;

  const formsCost = forms * DEFAULTS.formCost;
  const formsPrepCost = forms * DEFAULTS.formPrepCost;

  // Print
  const impressions = printSheets * (turnaround === "own" ? 2 : 1);
  const printPerImpr = input.printCostPerImpression ?? (turnaround === "foreign" ? 5 : 3);
  const printCost = impressions * printPerImpr;
  const inkCost = (input.inkCostPerSet ?? 500) * forms;

  // Postpress
  const postpress: SpecItem[] = [];

  // Резка готовых: листы × изделий × 4 × 1 тг
  const finishCutQty = printSheets * layout.itemsPerSheet * 4;
  postpress.push({ stage: "postpress", name: "Резка готовых листов", quantity: finishCutQty, unit: "рез", unitPrice: DEFAULTS.finishCutCost, total: finishCutQty * DEFAULTS.finishCutCost });

  if (isBooklet && input.hasFold) {
    const folds = (input.foldCount ?? 1) * input.circulation;
    const u = (input.foldCount ?? 1) === 1 ? 1.5 : 2.5;
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
    postpress.push({ stage: "postpress", name: `Ламинация ${input.laminationFilm} (${sides} ст.)`, quantity: input.circulation * sides, unit: "сторона", unitPrice: price, total: input.circulation * sides * price });
  }

  if (input.hasNumbering && input.numbersPerSheet) {
    const qty = input.numbersPerSheet * input.circulation;
    postpress.push({ stage: "postpress", name: "Нумерация", quantity: qty, unit: "номер", unitPrice: DEFAULTS.numberingCost, total: qty * DEFAULTS.numberingCost });
  }

  if (input.hasStamping && input.stampingClicheW && input.stampingClicheH) {
    const area = input.stampingClicheW * input.stampingClicheH;
    const cliche = Math.max(DEFAULTS.stampingClicheMin, area * DEFAULTS.stampingClichePerCm2);
    const impr = input.stampingNotebook ? DEFAULTS.stampingImprNotebook : DEFAULTS.stampingImpr;
    postpress.push({ stage: "postpress", name: "Тиснение (приладка)", quantity: 1, unit: "шт", unitPrice: DEFAULTS.stampingSetup, total: DEFAULTS.stampingSetup });
    postpress.push({ stage: "postpress", name: "Тиснение (клише)", quantity: area, unit: "см²", unitPrice: DEFAULTS.stampingClichePerCm2, total: cliche });
    postpress.push({ stage: "postpress", name: "Тиснение (оттиски)", quantity: input.circulation, unit: "оттиск", unitPrice: impr, total: input.circulation * impr });
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
  const designTotal = (input.designQty ?? 2) * DEFAULTS.designCost;
  prepress.push({ stage: "prepress", name: "Дизайн / подготовка", quantity: input.designQty ?? 2, unit: "шт", unitPrice: DEFAULTS.designCost, total: designTotal });
  if (input.photoOutputUnitCost > 0) {
    prepress.push({ stage: "prepress", name: "Фотовывод", quantity: forms, unit: "шт", unitPrice: input.photoOutputUnitCost, total: forms * input.photoOutputUnitCost });
  }
  prepress.push({ stage: "prepress", name: "Пластины (формы)", quantity: forms, unit: "шт", unitPrice: DEFAULTS.formCost, total: formsCost });
  prepress.push({ stage: "prepress", name: "Подготовка к печати", quantity: forms, unit: "форма", unitPrice: DEFAULTS.formPrepCost, total: formsPrepCost });
  if (paperCutCost > 0) {
    prepress.push({ stage: "prepress", name: "Резка закупочного формата", quantity: cutsPerSheet * purchaseSheets, unit: "рез", unitPrice: DEFAULTS.cutCostPerSheet, total: paperCutCost });
  }

  const materials: SpecItem[] = [
    { stage: "material", name: input.material.name, quantity: purchaseSheets, unit: "лист", unitPrice: input.material.cost_per_sheet, total: paperCost },
  ];

  const printItems: SpecItem[] = [
    { stage: "print", name: `Печать офсетная (${turnaround === "foreign" ? "чужой" : turnaround === "own" ? "свой" : "без оборота"})`, quantity: impressions, unit: "оттиск", unitPrice: printPerImpr, total: printCost },
    { stage: "print", name: "Краска (комплект)", quantity: forms, unit: "комплект", unitPrice: input.inkCostPerSet ?? 500, total: inkCost },
  ];

  const spec = [...prepress, ...materials, ...printItems, ...postpress, ...logistics];
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
    const printArea = r.pair.print.width * r.pair.print.height;
    const wasteShare = printArea > 0 ? r.layout.wasteArea / printArea : 0;
    const altWaste = altPaper * wasteShare;
    return {
      printW: r.pair.print.width,
      printH: r.pair.print.height,
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