import { bestPair, calculateForms, determineTurnaround, getCalcRules, rankPairs, setCalcRules } from "./engine";
import { CalcInput, CalcResult, FormatPair, LayoutResult, PrintFormat, ProductType, SpecItem, Turnaround } from "./types";
import type { CalcRules } from "./rules";

export interface SkuItem {
  /** Произвольное имя дизайна/SKU. */
  name: string;
  /** Ширина изделия, мм. */
  width: number;
  /** Высота изделия, мм. */
  height: number;
  /** Тираж этого SKU. */
  circulation: number;
}

export interface MultiSkuInput {
  productType: ProductType;
  skus: SkuItem[];
  colorFront: number;
  colorBack: number;
  material: CalcInput["material"];
  formatPairs?: FormatPair[];
  printFormats?: PrintFormat[];
  priorityPrintFormats?: PrintFormat[];
  /** Запрос на чётное число изделий на лист (для свой оборот). */
  requireEvenItems?: boolean;
  printCostPerImpression?: number;
  vatPercent?: number;
  /** Сколько дополнительных спусков перебирать сверх минимального. */
  maxExtraImpositions?: number;
}

export interface MultiSkuVariant {
  /** Метка варианта: "min_forms" — минимум спусков с пустотами, "no_empty" — без пустот, больше форм. */
  kind: "min_forms" | "no_empty";
  label: string;
  /** Сколько спусков. */
  impositions: number;
  /** Сколько позиций пустых на последнем спуске. */
  emptySlots: number;
  /** Сколько SKU отнесено к каждому спуску (длина = impositions). */
  skusPerImposition: number[];
  /** Сколько форм всего (impositions × красочность с учётом оборота). */
  formsTotal: number;
  /** Приладочных листов всего. */
  setupSheetsTotal: number;
  /** Печатных листов всего (нетто+приладка по всем спускам). */
  printSheetsTotal: number;
  /** Закупочных листов всего. */
  purchaseSheetsTotal: number;
  /** Раскладка (по самому крупному SKU). */
  layout: LayoutResult;
  /** Печатный/закупочный формат. */
  pair: { print: PrintFormat; purchase: PrintFormat };
  turnaround: Turnaround;
  /** Подробная спецификация. */
  spec: SpecItem[];
  prepress: SpecItem[];
  materials: SpecItem[];
  printItems: SpecItem[];
  postpress: SpecItem[];
  logistics: SpecItem[];
  /** Себестоимость без НДС. */
  totalCost: number;
  vatPercent: number;
  vatAmount: number;
  totalWithVat: number;
  warnings: string[];
}

export interface MultiSkuResult {
  /** Слотов (изделий) на одном печатном листе. */
  slotsPerSheet: number;
  /** Габарит «ячейки» = max ширина × max высота среди SKU. */
  cellWidth: number;
  cellHeight: number;
  /** Минимальное возможное число спусков (по формуле ceil(N/slots)). */
  minImpositions: number;
  /** Все рассчитанные варианты (минимум 1, максимум 2). */
  variants: MultiSkuVariant[];
  /** Индекс выгоднее по себестоимости. */
  bestIndex: number;
}

/**
 * Распределяет N SKU по `impositions` спускам, заполняя пустые позиции
 * повторами уже размещённых SKU (greedy round-robin). Возвращает массив длиной
 * `impositions`, где каждый элемент = число позиций (включая повторы).
 */
function distributeSkus(skuCount: number, slotsPerSheet: number, impositions: number, fillEmpty: boolean) {
  const totalSlots = impositions * slotsPerSheet;
  const skusPerImposition: number[] = new Array(impositions).fill(0);
  if (!fillEmpty) {
    let remaining = skuCount;
    for (let i = 0; i < impositions; i++) {
      const take = Math.min(slotsPerSheet, remaining);
      skusPerImposition[i] = take;
      remaining -= take;
    }
    const emptySlots = totalSlots - skuCount;
    return { skusPerImposition, emptySlots, totalSlots };
  }
  // fillEmpty: распределяем все слоты равномерно
  const base = Math.floor(totalSlots / impositions);
  const extra = totalSlots % impositions;
  for (let i = 0; i < impositions; i++) {
    skusPerImposition[i] = base + (i < extra ? 1 : 0);
  }
  return { skusPerImposition, emptySlots: 0, totalSlots };
}

/**
 * Себестоимость одного варианта: суммируем по спускам, для каждого спуска
 * используем существующий `runCalculation`-подобный подсчёт, но через прямые
 * формулы (без обращения к runCalculation, чтобы не дублировать постпечать).
 * Каждый спуск печатается тиражом = max(circulation среди его SKU) (упрощение MVP:
 * меньшие тиражи добиваются с избытком, излишек — отход).
 */
function buildVariant(
  kind: "min_forms" | "no_empty",
  label: string,
  impositions: number,
  fillEmpty: boolean,
  ctx: {
    skus: SkuItem[];
    layout: LayoutResult;
    pair: { print: PrintFormat; purchase: PrintFormat };
    purchaseNesting: number;
    rule: CalcRules;
    input: MultiSkuInput;
    turnaround: Turnaround;
    formsPerImposition: number;
    printPerImpr: number;
  }
): MultiSkuVariant {
  const { skus, layout, pair, purchaseNesting, rule, input, turnaround, formsPerImposition, printPerImpr } = ctx;
  const { skusPerImposition, emptySlots } = distributeSkus(skus.length, layout.itemsPerSheet, impositions, fillEmpty);

  // Группировать SKU по спускам и считать тираж спуска = max тираж среди его SKU
  // (упрощение MVP). Если fillEmpty — используем оригинальные SKU + повторы; все
  // повторы попадают в свой спуск, не увеличивая max.
  const sortedByCircDesc = [...skus].map((s, idx) => ({ s, idx })).sort((a, b) => b.s.circulation - a.s.circulation);
  // Жадно раскидываем по спускам: каждый SKU идёт в текущий спуск, пока не заполнен
  const groups: SkuItem[][] = Array.from({ length: impositions }, () => []);
  let cursor = 0;
  for (const { s } of sortedByCircDesc) {
    while (cursor < impositions && groups[cursor].length >= layout.itemsPerSheet) cursor++;
    if (cursor >= impositions) break;
    groups[cursor].push(s);
  }

  let netPrintSheetsTotal = 0;
  let setupSheetsTotal = 0;
  let printSheetsTotal = 0;
  for (const g of groups) {
    if (!g.length) continue;
    const maxCirc = Math.max(...g.map((s) => s.circulation));
    const net = Math.ceil(maxCirc / 1); // 1 копия каждого SKU за оттиск
    let setupS = Math.ceil((turnaround === "foreign" ? rule.setupForeign : rule.setupOwn) + net * rule.setupPercent);
    setupS = Math.max(rule.setupOwn, setupS);
    netPrintSheetsTotal += net;
    setupSheetsTotal += setupS;
    printSheetsTotal += net + setupS;
  }

  const formsTotal = impositions * formsPerImposition;
  const purchaseSheetsTotal = Math.ceil(printSheetsTotal / Math.max(1, purchaseNesting));
  const paperCost = purchaseSheetsTotal * input.material.cost_per_sheet;

  // Резка закупочного → печатного
  let cutsPerSheet = 0;
  if (purchaseNesting === 2) cutsPerSheet = 1;
  else if (purchaseNesting >= 3) cutsPerSheet = 2;
  const paperCutCost = cutsPerSheet * purchaseSheetsTotal * rule.cutCostPerSheet;

  const formsCost = formsTotal * rule.formCost;
  const formsPrepCost = formsTotal * rule.formPrepCost;

  const impressions = printSheetsTotal * (turnaround === "own" ? 2 : 1);
  const printCost = impressions * printPerImpr;

  const prepress: SpecItem[] = [];
  prepress.push({ stage: "prepress", name: "Пластины (формы)", quantity: formsTotal, unit: "шт", unitPrice: rule.formCost, total: formsCost });
  prepress.push({ stage: "prepress", name: "Подготовка к печати", quantity: formsTotal, unit: "форма", unitPrice: rule.formPrepCost, total: formsPrepCost });
  if (paperCutCost > 0) {
    prepress.push({ stage: "prepress", name: "Резка закупочного формата", quantity: cutsPerSheet * purchaseSheetsTotal, unit: "рез", unitPrice: rule.cutCostPerSheet, total: paperCutCost });
  }

  const materials: SpecItem[] = [
    { stage: "material", name: input.material.name, quantity: purchaseSheetsTotal, unit: "лист", unitPrice: input.material.cost_per_sheet, total: paperCost },
  ];

  const printItems: SpecItem[] = [
    { stage: "print", name: `Печать офсетная (${turnaround === "foreign" ? "чужой" : turnaround === "own" ? "свой" : "без оборота"}) · ${impositions} спуск(а)`, quantity: impressions, unit: "оттиск", unitPrice: printPerImpr, total: printCost },
  ];

  // Постпечать MVP: только финишная резка пропорционально общему тиражу всех SKU
  const totalCirculation = skus.reduce((s, x) => s + x.circulation, 0);
  const finishCutQty = printSheetsTotal * layout.itemsPerSheet * 4;
  const postpress: SpecItem[] = [
    { stage: "postpress", name: "Резка готовых листов", quantity: finishCutQty, unit: "рез", unitPrice: rule.finishCutCost, total: finishCutQty * rule.finishCutCost },
  ];

  // Логистика: упаковка по общему тиражу
  const logistics: SpecItem[] = [
    { stage: "logistics", name: "Упаковка", quantity: totalCirculation, unit: "шт", unitPrice: 5, total: totalCirculation * 5 },
  ];

  const spec = [...prepress, ...materials, ...printItems, ...postpress, ...logistics];
  const totalCost = spec.reduce((s, i) => s + i.total, 0);
  const vatPercent = input.vatPercent ?? 0;
  const vatAmount = totalCost * (vatPercent / 100);

  const warnings: string[] = [];
  if (emptySlots > 0) warnings.push(`На последнем спуске ${emptySlots} пустых позиций.`);

  return {
    kind,
    label,
    impositions,
    emptySlots,
    skusPerImposition,
    formsTotal,
    setupSheetsTotal,
    printSheetsTotal,
    purchaseSheetsTotal,
    layout,
    pair,
    turnaround,
    spec,
    prepress,
    materials,
    printItems,
    postpress,
    logistics,
    totalCost,
    vatPercent,
    vatAmount,
    totalWithVat: totalCost + vatAmount,
    warnings,
  };
}

export function runMultiSkuCalculation(input: MultiSkuInput, rulesOverride?: CalcRules): MultiSkuResult {
  if (rulesOverride) setCalcRules(rulesOverride);
  const rule = getCalcRules();
  if (!input.skus.length) throw new Error("Список SKU пуст.");

  const isSticker = input.productType === "sticker" || input.productType === "sticker_diecut";

  // Габарит «ячейки» = max по всем SKU (упрощение).
  const cellWidth = Math.max(...input.skus.map((s) => s.width));
  const cellHeight = Math.max(...input.skus.map((s) => s.height));

  // Подбор пары печатный↔закупочный исходя из ячейки.
  let layout: LayoutResult;
  let pair: { print: PrintFormat; purchase: PrintFormat };
  let purchaseNesting = 1;
  if (input.formatPairs && input.formatPairs.length) {
    const ranked = rankPairs(cellWidth, cellHeight, isSticker, input.formatPairs, {
      requireEvenItems: input.requireEvenItems,
      priorityPrintFormats: input.priorityPrintFormats,
    });
    if (!ranked.length) throw new Error("Изделие не помещается ни в один доступный печатный формат.");
    layout = ranked[0].layout;
    pair = { print: ranked[0].pair.print, purchase: ranked[0].pair.purchase };
    purchaseNesting = ranked[0].nesting;
  } else {
    throw new Error("Необходим справочник пар форматов.");
  }

  const slotsPerSheet = layout.itemsPerSheet;
  if (slotsPerSheet < 1) throw new Error("На печатный лист не помещается ни одно изделие.");

  const turnaround = determineTurnaround(input.productType, "custom", cellWidth, cellHeight, input.colorFront, input.colorBack, slotsPerSheet);
  const formsPerImposition = calculateForms(input.colorFront, input.colorBack, turnaround);
  const printPerImpr = input.printCostPerImpression ?? (turnaround === "foreign" ? 5 : 3);

  const minImpositions = Math.ceil(input.skus.length / slotsPerSheet);

  const ctx = { skus: input.skus, layout, pair, purchaseNesting, rule, input, turnaround, formsPerImposition, printPerImpr };

  const variants: MultiSkuVariant[] = [];
  // Вариант A: минимум спусков (с возможной пустотой)
  variants.push(buildVariant("min_forms", "Минимум форм", minImpositions, false, ctx));

  // Вариант B: перебираем +1..+K, ищем наиболее дешёвый без пустот
  const K = input.maxExtraImpositions ?? 4;
  let bestNoEmpty: MultiSkuVariant | null = null;
  for (let extra = 1; extra <= K; extra++) {
    const imp = minImpositions + extra;
    const v = buildVariant("no_empty", "Без пустот", imp, true, ctx);
    if (!bestNoEmpty || v.totalCost < bestNoEmpty.totalCost) bestNoEmpty = v;
  }
  // Показываем Вариант B только если он отличается от A и не дороже более чем на 50%
  if (bestNoEmpty && bestNoEmpty.totalCost <= variants[0].totalCost * 1.5) {
    variants.push(bestNoEmpty);
  }

  let bestIndex = 0;
  for (let i = 1; i < variants.length; i++) {
    if (variants[i].totalCost < variants[bestIndex].totalCost) bestIndex = i;
  }

  return {
    slotsPerSheet,
    cellWidth,
    cellHeight,
    minImpositions,
    variants,
    bestIndex,
  };
}