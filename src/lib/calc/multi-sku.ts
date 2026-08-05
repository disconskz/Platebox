import { calculateForms, determineTurnaround, getCalcRules, rankPairs, resolveFinishCut, setCalcRules } from "./engine";
import { CalcInput, CalcResult, FormatPair, LayoutResult, PrintFormat, ProductType, SpecItem, Turnaround } from "./types";
import type { CalcRules } from "./rules";
import { validateMultiSkuInput } from "./validation";
import { cutsForPurchaseLayout } from "./engine";

export interface SkuItem {
  /** РџСЂРѕРёР·РІРѕР»СЊРЅРѕРµ РёРјСЏ РґРёР·Р°Р№РЅР°/SKU. */
  name: string;
  /** РЁРёСЂРёРЅР° РёР·РґРµР»РёСЏ, РјРј. */
  width: number;
  /** Р’С‹СЃРѕС‚Р° РёР·РґРµР»РёСЏ, РјРј. */
  height: number;
  /** РўРёСЂР°Р¶ СЌС‚РѕРіРѕ SKU. */
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
  /** Р—Р°РїСЂРѕСЃ РЅР° С‡С‘С‚РЅРѕРµ С‡РёСЃР»Рѕ РёР·РґРµР»РёР№ РЅР° Р»РёСЃС‚ (РґР»СЏ СЃРІРѕР№ РѕР±РѕСЂРѕС‚). */
  requireEvenItems?: boolean;
  printCostPerImpression?: number;
  vatPercent?: number;
  /** РЎРєРѕР»СЊРєРѕ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹С… СЃРїСѓСЃРєРѕРІ РїРµСЂРµР±РёСЂР°С‚СЊ СЃРІРµСЂС… РјРёРЅРёРјР°Р»СЊРЅРѕРіРѕ. */
  maxExtraImpositions?: number;
  /** Р¦РµРЅР° СѓРїР°РєРѕРІРєРё Р·Р° РµРґРёРЅРёС†Сѓ (РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ 5). */
  packagingPerUnit?: number;
  /** РџРµСЂРµРѕРїСЂРµРґРµР»РµРЅРёРµ С‡РёСЃР»Р° С„РёРЅРёС€РЅС‹С… СЂРµР·РѕРІ РЅР° РёР·РґРµР»РёРµ. */
  cutsPerSheetOverride?: number;
  /** Ð Ð¾Ð»ÐµÐ²Ð¾Ð¹ Ð°Ð»Ð¸Ð°Ñ: paperCutsPerSheetOverride (Ð´Ð»Ñ Ð¸Ð½Ð°Ð²Ð°Ð·Ð°Ð¸Ð½Ð¾Ð¹Ð¾Ð·Ð´Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾Ð¸ Ñ€Ð°Ð½Ð¾Ð¼Ð½Ð¾Ð¹ Ð¿Ð¾Ð»ÐµÐ²Ð¾Ð¹ Ð¸Ð½Ñ‚ÐµÑ€Ð¾Ð¿Ñ€ÐµÑ‚Ð°Ñ†Ð¸Ð¸). */
  paperCutsPerSheetOverride?: number;
}

export interface MultiSkuVariant {
  /** РњРµС‚РєР° РІР°СЂРёР°РЅС‚Р°: "min_forms" вЂ” РјРёРЅРёРјСѓРј СЃРїСѓСЃРєРѕРІ СЃ РїСѓСЃС‚РѕС‚Р°РјРё, "no_empty" вЂ” Р±РµР· РїСѓСЃС‚РѕС‚, Р±РѕР»СЊС€Рµ С„РѕСЂРј. */
  kind: "min_forms" | "no_empty";
  label: string;
  /** РЎРєРѕР»СЊРєРѕ СЃРїСѓСЃРєРѕРІ. */
  impositions: number;
  /** РЎРєРѕР»СЊРєРѕ РїРѕР·РёС†РёР№ РїСѓСЃС‚С‹С… РЅР° РїРѕСЃР»РµРґРЅРµРј СЃРїСѓСЃРєРµ. */
  emptySlots: number;
  /** РЎРєРѕР»СЊРєРѕ SKU РѕС‚РЅРµСЃРµРЅРѕ Рє РєР°Р¶РґРѕРјСѓ СЃРїСѓСЃРєСѓ (РґР»РёРЅР° = impositions). */
  skusPerImposition: number[];
  /** РЎРєРѕР»СЊРєРѕ С„РѕСЂРј РІСЃРµРіРѕ (impositions Г— РєСЂР°СЃРѕС‡РЅРѕСЃС‚СЊ СЃ СѓС‡С‘С‚РѕРј РѕР±РѕСЂРѕС‚Р°). */
  formsTotal: number;
  /** РџСЂРёР»Р°РґРѕС‡РЅС‹С… Р»РёСЃС‚РѕРІ РІСЃРµРіРѕ. */
  setupSheetsTotal: number;
  /** РџРµС‡Р°С‚РЅС‹С… Р»РёСЃС‚РѕРІ РІСЃРµРіРѕ (РЅРµС‚С‚Рѕ+РїСЂРёР»Р°РґРєР° РїРѕ РІСЃРµРј СЃРїСѓСЃРєР°Рј). */
  printSheetsTotal: number;
  /** Р—Р°РєСѓРїРѕС‡РЅС‹С… Р»РёСЃС‚РѕРІ РІСЃРµРіРѕ. */
  purchaseSheetsTotal: number;
  /** Р Р°СЃРєР»Р°РґРєР° (РїРѕ СЃР°РјРѕРјСѓ РєСЂСѓРїРЅРѕРјСѓ SKU). */
  layout: LayoutResult;
  /** РџРµС‡Р°С‚РЅС‹Р№/Р·Р°РєСѓРїРѕС‡РЅС‹Р№ С„РѕСЂРјР°С‚. */
  pair: { print: PrintFormat; purchase: PrintFormat };
  turnaround: Turnaround;
  /** РџРѕРґСЂРѕР±РЅР°СЏ СЃРїРµС†РёС„РёРєР°С†РёСЏ. */
  spec: SpecItem[];
  prepress: SpecItem[];
  materials: SpecItem[];
  printItems: SpecItem[];
  postpress: SpecItem[];
  logistics: SpecItem[];
  /** РЎРµР±РµСЃС‚РѕРёРјРѕСЃС‚СЊ Р±РµР· РќР”РЎ. */
  totalCost: number;
  vatPercent: number;
  vatAmount: number;
  totalWithVat: number;
  warnings: string[];
}

export interface MultiSkuResult {
  /** РЎР»РѕС‚РѕРІ (РёР·РґРµР»РёР№) РЅР° РѕРґРЅРѕРј РїРµС‡Р°С‚РЅРѕРј Р»РёСЃС‚Рµ. */
  slotsPerSheet: number;
  /** Р“Р°Р±Р°СЂРёС‚ В«СЏС‡РµР№РєРёВ» = max С€РёСЂРёРЅР° Г— max РІС‹СЃРѕС‚Р° СЃСЂРµРґРё SKU. */
  cellWidth: number;
  cellHeight: number;
  /** РњРёРЅРёРјР°Р»СЊРЅРѕРµ РІРѕР·РјРѕР¶РЅРѕРµ С‡РёСЃР»Рѕ СЃРїСѓСЃРєРѕРІ (РїРѕ С„РѕСЂРјСѓР»Рµ ceil(N/slots)). */
  minImpositions: number;
  /** Р’СЃРµ СЂР°СЃСЃС‡РёС‚Р°РЅРЅС‹Рµ РІР°СЂРёР°РЅС‚С‹ (РјРёРЅРёРјСѓРј 1, РјР°РєСЃРёРјСѓРј 2). */
  variants: MultiSkuVariant[];
  /** РРЅРґРµРєСЃ РІС‹РіРѕРґРЅРµРµ РїРѕ СЃРµР±РµСЃС‚РѕРёРјРѕСЃС‚Рё. */
  bestIndex: number;
}

/**
 * Р Р°СЃРїСЂРµРґРµР»СЏРµС‚ N SKU РїРѕ `impositions` СЃРїСѓСЃРєР°Рј, Р·Р°РїРѕР»РЅСЏСЏ РїСѓСЃС‚С‹Рµ РїРѕР·РёС†РёРё
 * РїРѕРІС‚РѕСЂР°РјРё СѓР¶Рµ СЂР°Р·РјРµС‰С‘РЅРЅС‹С… SKU (greedy round-robin). Р’РѕР·РІСЂР°С‰Р°РµС‚ РјР°СЃСЃРёРІ РґР»РёРЅРѕР№
 * `impositions`, РіРґРµ РєР°Р¶РґС‹Р№ СЌР»РµРјРµРЅС‚ = С‡РёСЃР»Рѕ РїРѕР·РёС†РёР№ (РІРєР»СЋС‡Р°СЏ РїРѕРІС‚РѕСЂС‹).
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
  // fillEmpty: СЂР°СЃРїСЂРµРґРµР»СЏРµРј РІСЃРµ СЃР»РѕС‚С‹ СЂР°РІРЅРѕРјРµСЂРЅРѕ
  const base = Math.floor(totalSlots / impositions);
  const extra = totalSlots % impositions;
  for (let i = 0; i < impositions; i++) {
    skusPerImposition[i] = base + (i < extra ? 1 : 0);
  }
  return { skusPerImposition, emptySlots: 0, totalSlots };
}

/**
 * РЎРµР±РµСЃС‚РѕРёРјРѕСЃС‚СЊ РѕРґРЅРѕРіРѕ РІР°СЂРёР°РЅС‚Р°: СЃСѓРјРјРёСЂСѓРµРј РїРѕ СЃРїСѓСЃРєР°Рј, РґР»СЏ РєР°Р¶РґРѕРіРѕ СЃРїСѓСЃРєР°
 * РёСЃРїРѕР»СЊР·СѓРµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ `runCalculation`-РїРѕРґРѕР±РЅС‹Р№ РїРѕРґСЃС‡С‘С‚, РЅРѕ С‡РµСЂРµР· РїСЂСЏРјС‹Рµ
 * С„РѕСЂРјСѓР»С‹ (Р±РµР· РѕР±СЂР°С‰РµРЅРёСЏ Рє runCalculation, С‡С‚РѕР±С‹ РЅРµ РґСѓР±Р»РёСЂРѕРІР°С‚СЊ РїРѕСЃС‚РїРµС‡Р°С‚СЊ).
 * РљР°Р¶РґС‹Р№ СЃРїСѓСЃРє РїРµС‡Р°С‚Р°РµС‚СЃСЏ С‚РёСЂР°Р¶РѕРј = max(circulation СЃСЂРµРґРё РµРіРѕ SKU) (СѓРїСЂРѕС‰РµРЅРёРµ MVP:
 * РјРµРЅСЊС€РёРµ С‚РёСЂР°Р¶Рё РґРѕР±РёРІР°СЋС‚СЃСЏ СЃ РёР·Р±С‹С‚РєРѕРј, РёР·Р»РёС€РµРє вЂ” РѕС‚С…РѕРґ).
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
    purchaseCols: number;
    purchaseRows: number;
    rule: CalcRules;
    input: MultiSkuInput;
    turnaround: Turnaround;
    formsPerImposition: number;
    printPerImpr: number;
  }
): MultiSkuVariant {
  const { skus, layout, pair, purchaseNesting, purchaseCols, purchaseRows, rule, input, turnaround, formsPerImposition, printPerImpr } = ctx;
  const { skusPerImposition, emptySlots } = distributeSkus(skus.length, layout.itemsPerSheet, impositions, fillEmpty);

  // Р“СЂСѓРїРїРёСЂРѕРІР°С‚СЊ SKU РїРѕ СЃРїСѓСЃРєР°Рј Рё СЃС‡РёС‚Р°С‚СЊ С‚РёСЂР°Р¶ СЃРїСѓСЃРєР° = max С‚РёСЂР°Р¶ СЃСЂРµРґРё РµРіРѕ SKU
  // (СѓРїСЂРѕС‰РµРЅРёРµ MVP). Р•СЃР»Рё fillEmpty вЂ” РёСЃРїРѕР»СЊР·СѓРµРј РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Рµ SKU + РїРѕРІС‚РѕСЂС‹; РІСЃРµ
  // РїРѕРІС‚РѕСЂС‹ РїРѕРїР°РґР°СЋС‚ РІ СЃРІРѕР№ СЃРїСѓСЃРє, РЅРµ СѓРІРµР»РёС‡РёРІР°СЏ max.
  const sortedByCircDesc = [...skus].map((s, idx) => ({ s, idx })).sort((a, b) => b.s.circulation - a.s.circulation);
  // Р–Р°РґРЅРѕ СЂР°СЃРєРёРґС‹РІР°РµРј РїРѕ СЃРїСѓСЃРєР°Рј: РєР°Р¶РґС‹Р№ SKU РёРґС‘С‚ РІ С‚РµРєСѓС‰РёР№ СЃРїСѓСЃРє, РїРѕРєР° РЅРµ Р·Р°РїРѕР»РЅРµРЅ
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
    const net = Math.ceil(maxCirc / 1); // 1 РєРѕРїРёСЏ РєР°Р¶РґРѕРіРѕ SKU Р·Р° РѕС‚С‚РёСЃРє
    let setupS = Math.ceil((turnaround === "foreign" ? rule.setupForeign : rule.setupOwn) + net * rule.setupPercent);
    setupS = Math.max(rule.setupOwn, setupS);
    netPrintSheetsTotal += net;
    setupSheetsTotal += setupS;
    printSheetsTotal += net + setupS;
  }

  const formsTotal = impositions * formsPerImposition;
  const purchaseSheetsTotal = Math.ceil(printSheetsTotal / Math.max(1, purchaseNesting));
  const paperCost = purchaseSheetsTotal * input.material.cost_per_sheet;

  // Р РµР·РєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ в†’ РїРµС‡Р°С‚РЅРѕРіРѕ (РµРґРёРЅР°СЏ РјРѕРґРµР»СЊ СЃ runCalculation):
  // cuts = cols + rows в€’ 2 РїРѕ С„Р°РєС‚РёС‡РµСЃРєРѕР№ СЂР°СЃРєР»Р°РґРєРµ.
  const cutsPerSheet = cutsForPurchaseLayout(purchaseCols, purchaseRows);
  const paperCutCost = cutsPerSheet * purchaseSheetsTotal * rule.cutCostPerSheet;

  const formsCost = formsTotal * rule.formCost;
  const formsPrepCost = formsTotal * rule.formPrepCost;

  const impressions = printSheetsTotal * (turnaround === "own" ? 2 : 1);
  const printCost = impressions * printPerImpr;

  const prepress: SpecItem[] = [];
  prepress.push({ stage: "prepress", name: "РџР»Р°СЃС‚РёРЅС‹ (С„РѕСЂРјС‹)", quantity: formsTotal, unit: "С€С‚", unitPrice: rule.formCost, total: formsCost });
  prepress.push({ stage: "prepress", name: "РџРѕРґРіРѕС‚РѕРІРєР° Рє РїРµС‡Р°С‚Рё", quantity: formsTotal, unit: "С„РѕСЂРјР°", unitPrice: rule.formPrepCost, total: formsPrepCost });
  if (cutsPerSheet * purchaseSheetsTotal > 0) {
    prepress.push({
      stage: "prepress",
      name: `Р РµР·РєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ ${pair.purchase.width}Г—${pair.purchase.height} в†’ РїРµС‡Р°С‚РЅС‹Р№ ${pair.print.width}Г—${pair.print.height} (${purchaseCols}Г—${purchaseRows})`,
      quantity: cutsPerSheet * purchaseSheetsTotal,
      unit: "СЂРµР·",
      unitPrice: rule.cutCostPerSheet,
      total: paperCutCost,
    });
  }

  const materials: SpecItem[] = [
    { stage: "material", name: input.material.name, quantity: purchaseSheetsTotal, unit: "Р»РёСЃС‚", unitPrice: input.material.cost_per_sheet, total: paperCost },
  ];

  const printItems: SpecItem[] = [
    { stage: "print", name: `РџРµС‡Р°С‚СЊ РѕС„СЃРµС‚РЅР°СЏ (${turnaround === "foreign" ? "С‡СѓР¶РѕР№" : turnaround === "own" ? "СЃРІРѕР№" : "Р±РµР· РѕР±РѕСЂРѕС‚Р°"}) В· ${impositions} СЃРїСѓСЃРє(Р°)`, quantity: impressions, unit: "РѕС‚С‚РёСЃРє", unitPrice: printPerImpr, total: printCost },
  ];

  // РџРѕСЃС‚РїРµС‡Р°С‚СЊ MVP: С„РёРЅРёС€РЅР°СЏ СЂРµР·РєР° РїРѕ С‚РѕР№ Р¶Рµ РјРѕРґРµР»Рё, С‡С‚Рѕ Рё РІ runCalculation
  // (РїР°СЂР°РјРµС‚СЂРёР·РѕРІР°РЅРЅС‹Р№ РјРЅРѕР¶РёС‚РµР»СЊ cutsPerItem РїРѕ С‚РёРїСѓ РїСЂРѕРґСѓРєС†РёРё / РїСЂР°РІРёР»Р°Рј).
  // Постпасс: единый механизм для корректных доработок с учётом формата печати/перекрытий.
  const totalCirculation = skus.reduce((s, x) => s + x.circulation, 0);
  const finishCut = resolveFinishCut({
    layout,
    printW: layout.printFormat.width,
    printH: layout.printFormat.height,
    productType: input.productType,
    formatType: null,
    rule,
    paperCutsOverride: input.cutsPerSheetOverride,
    paperCutsPerSheetOverride: input.paperCutsPerSheetOverride,
  });
  const finishCutQty = Math.ceil(printSheetsTotal * finishCut.cutsPerSheet);
  const postpress: SpecItem[] = [
    {
      stage: "postpress",
      name: `Р РµР·РєР° РіРѕС‚РѕРІС‹С… Р»РёСЃС‚РѕРІ (${finishCut.cutsPerSheet} / Р»РёСЃС‚)`,
      quantity: finishCutQty,
      unit: "СЂРµР·",
      unitPrice: finishCut.pricePerCut,
      total: finishCutQty * finishCut.pricePerCut,
    },
  ];
  const packUnit = input.packagingPerUnit ?? 5;
  const logistics: SpecItem[] = [
    {
      stage: "logistics",
      name: "РЈРїР°РєРѕРІРєР°",
      quantity: totalCirculation,
      unit: "С€С‚",
      unitPrice: packUnit,
      total: totalCirculation * packUnit,
    },
  ];

  const spec = [...prepress, ...materials, ...printItems, ...postpress, ...logistics];
  const totalCost = spec.reduce((s, i) => s + i.total, 0);
  const vatPercent = input.vatPercent ?? 0;
  const vatAmount = totalCost * (vatPercent / 100);

  const warnings: string[] = [];
  if (emptySlots > 0) warnings.push(`РќР° РїРѕСЃР»РµРґРЅРµРј СЃРїСѓСЃРєРµ ${emptySlots} РїСѓСЃС‚С‹С… РїРѕР·РёС†РёР№.`);

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
  validateMultiSkuInput(input);
  if (rulesOverride) setCalcRules(rulesOverride);
  const rule = getCalcRules();
  if (!input.skus.length) throw new Error("РЎРїРёСЃРѕРє SKU РїСѓСЃС‚.");

  const isSticker = input.productType === "sticker" || input.productType === "sticker_diecut";

  // Р“Р°Р±Р°СЂРёС‚ В«СЏС‡РµР№РєРёВ» = max РїРѕ РІСЃРµРј SKU (СѓРїСЂРѕС‰РµРЅРёРµ).
  const cellWidth = Math.max(...input.skus.map((s) => s.width));
  const cellHeight = Math.max(...input.skus.map((s) => s.height));

  // РџРѕРґР±РѕСЂ РїР°СЂС‹ РїРµС‡Р°С‚РЅС‹Р№в†”Р·Р°РєСѓРїРѕС‡РЅС‹Р№ РёСЃС…РѕРґСЏ РёР· СЏС‡РµР№РєРё.
  let layout: LayoutResult;
  let pair: { print: PrintFormat; purchase: PrintFormat };
  let purchaseNesting = 1;
  if (input.formatPairs && input.formatPairs.length) {
    const ranked = rankPairs(cellWidth, cellHeight, isSticker, input.formatPairs, {
      requireEvenItems: input.requireEvenItems,
      priorityPrintFormats: input.priorityPrintFormats,
    });
    if (!ranked.length) throw new Error("РР·РґРµР»РёРµ РЅРµ РїРѕРјРµС‰Р°РµС‚СЃСЏ РЅРё РІ РѕРґРёРЅ РґРѕСЃС‚СѓРїРЅС‹Р№ РїРµС‡Р°С‚РЅС‹Р№ С„РѕСЂРјР°С‚.");
    layout = ranked[0].layout;
    pair = { print: ranked[0].pair.print, purchase: ranked[0].pair.purchase };
    purchaseNesting = ranked[0].nesting;
  } else {
    throw new Error("РќРµРѕР±С…РѕРґРёРј СЃРїСЂР°РІРѕС‡РЅРёРє РїР°СЂ С„РѕСЂРјР°С‚РѕРІ.");
  }

  const slotsPerSheet = layout.itemsPerSheet;
  if (slotsPerSheet < 1) throw new Error("РќР° РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚ РЅРµ РїРѕРјРµС‰Р°РµС‚СЃСЏ РЅРё РѕРґРЅРѕ РёР·РґРµР»РёРµ.");

  const turnaround = determineTurnaround(input.productType, "custom", cellWidth, cellHeight, input.colorFront, input.colorBack, slotsPerSheet);
  const formsPerImposition = calculateForms(input.colorFront, input.colorBack, turnaround);
  const printPerImpr = input.printCostPerImpression ?? (turnaround === "foreign" ? 5 : 3);

  const minImpositions = Math.ceil(input.skus.length / slotsPerSheet);

  // Р Р°СЃРєР»Р°РґРєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ в†’ РїРµС‡Р°С‚РЅРѕРіРѕ: Р±РµСЂС‘Рј С‚Сѓ РѕСЂРёРµРЅС‚Р°С†РёСЋ, РіРґРµ РїРѕРјРµС‰Р°РµС‚СЃСЏ Р±РѕР»СЊС€Рµ Р»РёСЃС‚РѕРІ.
  const layoutCR = (() => {
    let best = { cols: 1, rows: 1, n: 0 };
    for (const rotated of [false, true]) {
      const w = rotated ? pair.print.height : pair.print.width;
      const h = rotated ? pair.print.width : pair.print.height;
      const cols = Math.floor(pair.purchase.width / w);
      const rows = Math.floor(pair.purchase.height / h);
      const n = cols * rows;
      if (n > best.n) best = { cols, rows, n };
    }
    return best;
  })();
  const purchaseCols = Math.max(1, layoutCR.cols);
  const purchaseRows = Math.max(1, layoutCR.rows);
  const ctx = { skus: input.skus, layout, pair, purchaseNesting, purchaseCols, purchaseRows, rule, input, turnaround, formsPerImposition, printPerImpr };

  const variants: MultiSkuVariant[] = [];
  // Р’Р°СЂРёР°РЅС‚ A: РјРёРЅРёРјСѓРј СЃРїСѓСЃРєРѕРІ (СЃ РІРѕР·РјРѕР¶РЅРѕР№ РїСѓСЃС‚РѕС‚РѕР№)
  variants.push(buildVariant("min_forms", "РњРёРЅРёРјСѓРј С„РѕСЂРј", minImpositions, false, ctx));

  // Р’Р°СЂРёР°РЅС‚ B: РїРµСЂРµР±РёСЂР°РµРј +1..+K, РёС‰РµРј РЅР°РёР±РѕР»РµРµ РґРµС€С‘РІС‹Р№ Р±РµР· РїСѓСЃС‚РѕС‚
  const K = input.maxExtraImpositions ?? 4;
  let bestNoEmpty: MultiSkuVariant | null = null;
  for (let extra = 1; extra <= K; extra++) {
    const imp = minImpositions + extra;
    const v = buildVariant("no_empty", "Р‘РµР· РїСѓСЃС‚РѕС‚", imp, true, ctx);
    if (!bestNoEmpty || v.totalCost < bestNoEmpty.totalCost) bestNoEmpty = v;
  }
  // РџРѕРєР°Р·С‹РІР°РµРј Р’Р°СЂРёР°РЅС‚ B С‚РѕР»СЊРєРѕ РµСЃР»Рё РѕРЅ РѕС‚Р»РёС‡Р°РµС‚СЃСЏ РѕС‚ A Рё РЅРµ РґРѕСЂРѕР¶Рµ Р±РѕР»РµРµ С‡РµРј РЅР° 50%
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

