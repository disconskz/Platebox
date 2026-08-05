import { CalcInput, CalcResult, DEFAULTS, FormatPair, LayoutResult, PrintFormat, SpecItem, Turnaround } from "./types";
import type { CalcRules } from "./rules";
import { validateCalcInput, cutsForNesting } from "./validation";

// Р“Р»РѕР±Р°Р»СЊРЅРѕ РЅР°СЃС‚СЂР°РёРІР°РµРјС‹Рµ РїСЂР°РІРёР»Р°. РљР°Р»СЊРєСѓР»СЏС‚РѕСЂ РіСЂСѓР·РёС‚ РёС… РёР· Р‘Р” Рё РІС‹Р·С‹РІР°РµС‚
// setCalcRules(rules) РїРµСЂРµРґ run/layout. Р•СЃР»Рё РЅРµ Р·Р°РґР°РЅРѕ вЂ” РёСЃРїРѕР»СЊР·СѓРµРј DEFAULTS.
let CURRENT_RULES: CalcRules = { ...DEFAULTS };
export function setCalcRules(r: CalcRules) {
  CURRENT_RULES = { ...DEFAULTS, ...r };
}
export function getCalcRules(): CalcRules {
  return CURRENT_RULES;
}
const R = () => CURRENT_RULES;

// === Р РµР·РєР° РїРµС‡Р°С‚РЅС‹Р№ в†’ РєРѕРЅРµС‡РЅС‹Р№ (РёР· СЃРїСЂР°РІРѕС‡РЅРёРєР° cut_count_rules + РєРѕРЅСЃС‚Р°РЅС‚Р°) ===
export interface CutRulesData {
  /** Р¦РµРЅР° РѕРґРЅРѕРіРѕ СЂРµР·Р° РїРµС‡Р°С‚РЅРѕРіРѕ Р»РёСЃС‚Р°, в‚ё. */
  pricePerCut: number;
  /** РљР°СЂС‚Р° "PRINT|ITEM" -> С‡РёСЃР»Рѕ СЂРµР·РѕРІ РЅР° РѕРґРёРЅ РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚. */
  table: Record<string, number>;
}
let CUT_RULES: CutRulesData = { pricePerCut: 1, table: {} };
export function setCutRules(d: CutRulesData) {
  CUT_RULES = { pricePerCut: Number(d.pricePerCut) || 1, table: { ...d.table } };
}
export function getCutRules(): CutRulesData {
  return CUT_RULES;
}

// === Р Р°СЃС…РѕРґРЅС‹Рµ РјР°С‚РµСЂРёР°Р»С‹ (С„РѕР»СЊРіР° РґР»СЏ С‚РёСЃРЅРµРЅРёСЏ Рё С‚.Рї.) ===
export interface MaterialPrices {
  /** Р¦РµРЅР° 1 СЃРјВІ С„РѕР»СЊРіРё РґР»СЏ С‚РёСЃРЅРµРЅРёСЏ, в‚ё. */
  foilPerCm2: number;
}
let MATERIAL_PRICES: MaterialPrices = { foilPerCm2: 6 };
export function setMaterialPrices(p: Partial<MaterialPrices>) {
  MATERIAL_PRICES = { ...MATERIAL_PRICES, ...p };
}
export function getMaterialPrices(): MaterialPrices {
  return MATERIAL_PRICES;
}

/** A-С„РѕСЂРјР°С‚С‹ РІ РјРј РґР»СЏ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ РїРµС‡Р°С‚РЅРѕРіРѕ Р»РёСЃС‚Р° РїРѕ С„Р°РєС‚РёС‡РµСЃРєРёРј СЂР°Р·РјРµСЂР°Рј. */
const A_FORMATS: Array<{ name: string; w: number; h: number }> = [
  { name: "A0", w: 841, h: 1189 },
  { name: "A1", w: 594, h: 841 },
  { name: "A2", w: 420, h: 594 },
  { name: "A3", w: 297, h: 420 },
  { name: "A4", w: 210, h: 297 },
  { name: "A5", w: 148, h: 210 },
  { name: "A6", w: 105, h: 148 },
];
/** РћРїСЂРµРґРµР»РёС‚СЊ РёРјСЏ РїРµС‡Р°С‚РЅРѕРіРѕ Р»РёСЃС‚Р° РїРѕ С„Р°РєС‚РёС‡РµСЃРєРёРј СЂР°Р·РјРµСЂР°Рј (В±15 РјРј РґРѕРїСѓСЃРє, Р»СЋР±Р°СЏ РѕСЂРёРµРЅС‚Р°С†РёСЏ). */
export function detectPrintFormatName(w: number, h: number, tol = 15): string | null {
  const lo = Math.min(w, h);
  const hi = Math.max(w, h);
  for (const f of A_FORMATS) {
    if (Math.abs(f.w - lo) <= tol && Math.abs(f.h - hi) <= tol) return f.name;
  }
  // SRA/РїРµС‡Р°С‚РЅС‹Рµ С„РѕСЂРјР°С‚С‹ > A2 вЂ” РїСЂРёСЂР°РІРЅРёРІР°РµРј Рє Р±Р»РёР¶Р°Р№С€РµРјСѓ В«РЅР°РґС„РѕСЂРјР°С‚СѓВ»
  if (hi >= 700) return "A1";
  if (hi >= 500) return "A2";
  if (hi >= 380) return "A3";
  return null;
}
/** РџРѕРёСЃРє РєРѕР»РёС‡РµСЃС‚РІР° СЂРµР·РѕРІ РІ С‚Р°Р±Р»РёС†Рµ. Р’РѕР·РІСЂР°С‰Р°РµС‚ null, РµСЃР»Рё СЃРІСЏР·РєРё РЅРµС‚. */
export function lookupCutCount(printName: string | null, itemName: string | null): number | null {
  if (!printName || !itemName) return null;
  const key = `${printName}|${itemName}`;
  const v = CUT_RULES.table[key];
  return typeof v === "number" && v >= 0 ? v : null;
}

/**
 * РђРІС‚Рѕ-СЂР°СЃС‡С‘С‚ РєРѕР»РёС‡РµСЃС‚РІР° СЂРµР·РѕРІ РїРѕ С„Р°РєС‚РёС‡РµСЃРєРѕР№ СЂР°СЃРєР»Р°РґРєРµ (РўР—).
 * - 1 РёР·РґРµР»РёРµ РЅР° Р»РёСЃС‚Рµ в†’ 4 СЂРµР·Р° (РѕР±СЂРµР·РєР° РїРѕ РїРµСЂРёРјРµС‚СЂСѓ);
 * - РёРЅР°С‡Рµ в†’ 2 Г— (cols + rows).
 */
export function autoCutsFromLayout(layout: { cols: number; rows: number; itemsPerSheet: number }): number {
  const items = Math.max(1, layout.itemsPerSheet | 0);
  if (items <= 1) return 4;
  const cols = Math.max(1, layout.cols | 0);
  const rows = Math.max(1, layout.rows | 0);
  return 2 * (cols + rows);
}

export interface FinishCutResult {
  cutsPerSheet: number;
  source: "manual" | "table" | "auto";
  sourceLabel: string;
  pricePerCut: number;
  printName: string | null;
  itemName: string | null;
}

function resolveCutsOverride(values: Array<number | undefined | null>): number | null {
  const fallback = values.find((v) => Number.isFinite(v as number) && (v as number) > 0);
  return fallback != null ? Math.floor(fallback as number) : null;
}

export function resolveFinishCut({
  layout,
  printW,
  printH,
  productType,
  formatType,
  rule,
  paperCutsOverride,
  paperCutsPerSheetOverride,
}: {
  layout: LayoutResult;
  printW: number;
  printH: number;
  productType: string;
  formatType: string | null;
  rule: CalcRules;
  paperCutsOverride?: number | null;
  paperCutsPerSheetOverride?: number | null;
}): FinishCutResult {
  const printName = detectPrintFormatName(printW, printH);
  const itemName = formatType && formatType !== "custom" ? formatType : null;
  const cutPrice = CUT_RULES.pricePerCut ?? rule.finishCutCost ?? 1;
  const tableCuts = lookupCutCount(printName, itemName);
  const override = resolveCutsOverride([paperCutsOverride, paperCutsPerSheetOverride]);
  let cutsPerSheet: number;
  let source: "manual" | "table" | "auto";
  let sourceLabel: string;
  if (override != null) {
    cutsPerSheet = override;
    source = "manual";
    sourceLabel = `Р СћР ВµР В·Р С”Р В° (Р В°Р Р†РЎвЂљР С•: РЎР‚РЎС“РЎвЂЎР Р…Р В° Р С”Р С•РЎР‚РЎР‚Р ВµР С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р С”Р В°, ${cutsPerSheet} РЎР‚Р ВµР В·/Р В»Р С‘РЎРѓРЎвЂљ).`;
  } else if (tableCuts != null) {
    cutsPerSheet = tableCuts;
    source = "table";
    sourceLabel = `Р СћР ВµР В·Р С”Р В° ${printName} -> ${itemName} (РЎРѓР С—РЎР‚Р В°Р Р†Р С•РЎвЂЎР Р…Р С‘Р С”, ${cutsPerSheet} РЎР‚Р ВµР В·/Р В»Р С‘РЎРѓРЎвЂљ).`;
  } else {
    cutsPerSheet = autoCutsFromLayout(layout);
    source = "auto";
    sourceLabel =
      layout.itemsPerSheet <= 1
        ? `Р СћР ВµР В·Р С”Р В° (Р В°Р Р†РЎвЂљР С•: 1 Р С‘Р В·Р Т‘Р ВµР В»Р С‘Р Вµ -> 4 РЎР‚Р ВµР В·/Р В»Р С‘РЎРѓРЎвЂљ).`
        : `Р СћР ВµР В·Р С”Р В° (Р В°Р Р†РЎвЂљР С•: 2РІР‚вЂќ${layout.cols}+${layout.rows} = ${cutsPerSheet} РЎР‚Р ВµР В·/Р В»Р С‘РЎРѓРЎвЂљ).`;
  }
  return {
    cutsPerSheet,
    source,
    sourceLabel,
    pricePerCut: cutPrice,
    printName,
    itemName,
  };
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
 * Р’РѕР·РІСЂР°С‰Р°РµС‚ Р’РЎР• РІР°Р»РёРґРЅС‹Рµ РІР°СЂРёР°РЅС‚С‹ СЂР°СЃРєР»Р°РґРєРё (РѕР±Рµ РѕСЂРёРµРЅС‚Р°С†РёРё) РґР»СЏ РґР°РЅРЅРѕРіРѕ
 * РїРµС‡Р°С‚РЅРѕРіРѕ Р»РёСЃС‚Р°. РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ СЂР°РЅР¶РёСЂРѕРІР°РЅРёРµРј, С‡С‚РѕР±С‹ РјРѕР¶РЅРѕ Р±С‹Р»Рѕ РІС‹Р±РёСЂР°С‚СЊ
 * РїРѕРґС…РѕРґСЏС‰РёР№ РІР°СЂРёР°РЅС‚ (РЅР°РїСЂРёРјРµСЂ, С‡С‘С‚РЅРѕРµ С‡РёСЃР»Рѕ РёР·РґРµР»РёР№ РґР»СЏ В«СЃРІРѕРµРіРѕ РѕР±РѕСЂРѕС‚Р°В»),
 * Р° РЅРµ С‚РѕР»СЊРєРѕ С‚РѕС‚, С‡С‚Рѕ РґР°С‘С‚ РјР°РєСЃРёРјСѓРј С€С‚/Р»РёСЃС‚.
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
  // РџРµСЂРµР±РёСЂР°РµРј 4 РєРѕРјР±РёРЅР°С†РёРё: РѕСЂРёРµРЅС‚Р°С†РёСЏ РёР·РґРµР»РёСЏ Г— РѕСЂРёРµРЅС‚Р°С†РёСЏ Р»РёСЃС‚Р°.
  // Р›РёСЃС‚ С„РёР·РёС‡РµСЃРєРё РѕРґРёРЅ Рё С‚РѕС‚ Р¶Рµ вЂ” Р·Р°С…РІР°С‚ РјРѕР¶РЅРѕ СЂР°СЃРїРѕР»РѕР¶РёС‚СЊ РїРѕ Р»СЋР±РѕР№
  // СЃС‚РѕСЂРѕРЅРµ. РР·-Р·Р° Р°СЃРёРјРјРµС‚СЂРёРё РїРѕР»РµР№ (top vs bottom вЂ” Р·Р°С…РІР°С‚) РѕСЂРёРµРЅС‚Р°С†РёСЏ
  // Р»РёСЃС‚Р° РІР»РёСЏРµС‚ РЅР° С‡РёСЃР»Рѕ РёР·РґРµР»РёР№.
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
  // РЎРѕСЂС‚РёСЂРѕРІРєР° РїРѕ РІРѕР·СЂР°СЃС‚Р°РЅРёСЋ РїР»РѕС‰Р°РґРё вЂ” РІС‹Р±РёСЂР°РµРј РЎРђРњР«Р™ РњРђР›Р•РќР¬РљРР™ Р»РёСЃС‚,
  // РІ РєРѕС‚РѕСЂС‹Р№ РїРѕРјРµС‰Р°РµС‚СЃСЏ РЅСѓР¶РЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ (РјРёРЅРёРјРёР·РёСЂСѓРµРј РѕС‚С…РѕРґС‹).
  const sorted = [...list].sort((a, b) => a.width * a.height - b.width * b.height);
  let best: LayoutResult | null = null;
  let bestScore = Infinity; // РјРµРЅСЊС€Рµ вЂ” Р»СѓС‡С€Рµ: РѕС‚С…РѕРґС‹ РЅР° 1 РёР·РґРµР»РёРµ
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
 * РџРѕРґР±РѕСЂ РїР°СЂС‹ (РїРµС‡Р°С‚РЅС‹Р№, Р·Р°РєСѓРїРѕС‡РЅС‹Р№) РёР· Р¶С‘СЃС‚РєРёС… СЃРІСЏР·РѕРє СЃРїСЂР°РІРѕС‡РЅРёРєР°.
 * Р’С‹Р±РёСЂР°РµС‚СЃСЏ РїР°СЂР° СЃ РјРёРЅРёРјСѓРјРѕРј РѕС‚С…РѕРґРѕРІ РЅР° РёР·РґРµР»РёРµ.
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
 * Р Р°РЅР¶РёСЂСѓРµС‚ РІСЃРµ РїР°СЂС‹: max РёР·РґРµР»РёР№ СЃ Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ, С‚Р°Р№-Р±СЂРµР№Рє вЂ” РјРµРЅСЊС€РёР№ РїРµС‡Р°С‚РЅС‹Р№ С„РѕСЂРјР°С‚.
 */
export function rankPairs(
  productW: number,
  productH: number,
  isSticker: boolean,
  pairs: FormatPair[],
  options?: { requireEvenItems?: boolean; priorityPrintFormats?: PrintFormat[] }
): Array<{ layout: LayoutResult; pair: FormatPair; itemsPerPurchase: number; nesting: number }> {
  const out: Array<{ layout: LayoutResult; pair: FormatPair; itemsPerPurchase: number; nesting: number }> = [];
  // Р›РёРјРёС‚ РјР°РєСЃРёРјР°Р»СЊРЅРѕРіРѕ РїРµС‡Р°С‚РЅРѕРіРѕ С„РѕСЂРјР°С‚Р° (РїРѕ РїСЂР°РІРєР°Рј fortress: 520Г—360).
  // Р•СЃР»Рё РёР·РґРµР»РёРµ С„РёР·РёС‡РµСЃРєРё РЅРµ РїРѕРјРµС‰Р°РµС‚СЃСЏ РІ СЌС‚РѕС‚ Р»РёРјРёС‚ вЂ” Р»РёРјРёС‚ СЃРЅРёРјР°РµС‚СЃСЏ.
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

  // РџСЂРёРѕСЂРёС‚РµС‚РЅС‹Р№ (СЂР°Р±РѕС‡РёР№) РїРµС‡Р°С‚РЅС‹Р№ С„РѕСЂРјР°С‚ вЂ” С‚РѕС‡РЅРѕРµ СЃРѕРІРїР°РґРµРЅРёРµ РїРѕ РіР°Р±Р°СЂРёС‚Р°Рј.
  const isPriority = (p: FormatPair) => {
    const list = options?.priorityPrintFormats;
    if (!list || !list.length) return false;
    return list.some(
      (f) =>
        (f.width === p.print.width && f.height === p.print.height) ||
        (f.width === p.print.height && f.height === p.print.width)
    );
  };

  // РџРµСЂРµР±РёСЂР°РµРј Р’РЎР• РІР°СЂРёР°РЅС‚С‹ СЂР°СЃРєР»Р°РґРєРё (РѕР±Рµ РѕСЂРёРµРЅС‚Р°С†РёРё) РґР»СЏ РєР°Р¶РґРѕР№ РїР°СЂС‹ вЂ”
  // С‡С‚РѕР±С‹ РїРѕРґ СѓСЃР»РѕРІРёРµ requireEvenItems РјРѕР¶РЅРѕ Р±С‹Р»Рѕ РІС‹Р±СЂР°С‚СЊ РїРѕРґС…РѕРґСЏС‰РёР№
  // РІР°СЂРёР°РЅС‚, Р° РЅРµ С‚РѕР»СЊРєРѕ С‚РѕС‚, С‡С‚Рѕ РґР°С‘С‚ РјР°РєСЃРёРјСѓРј С€С‚/Р»РёСЃС‚.
  for (const p of (filtered.length ? filtered : pairs)) {
    const variants = layoutVariants(productW, productH, p.print.width, p.print.height, isSticker);
    if (!variants.length) continue;
    const nesting = Math.max(
      1,
      nestingPurchaseToPrint(p.purchase.width, p.purchase.height, p.print.width, p.print.height).nesting
    );
    for (const l of variants) {
      out.push({ layout: l, pair: p, itemsPerPurchase: l.itemsPerSheet * nesting, nesting });
    }
  }

  // Р§С‘С‚РЅРѕРµ С‡РёСЃР»Рѕ РёР·РґРµР»РёР№ РЅР° Р»РёСЃС‚ (РїРµС‡Р°С‚СЊ В«СЃРІРѕР№ РѕР±РѕСЂРѕС‚В»).
  let pool = out;
  if (options?.requireEvenItems) {
    const even = out.filter((r) => r.layout.itemsPerSheet % 2 === 0);
    if (even.length) pool = even;
  }

  // Р–РЃРЎРўРљРР™ РїСЂРёРѕСЂРёС‚РµС‚ СЂР°Р±РѕС‡РёС… С„РѕСЂРјР°С‚РѕРІ: РµСЃР»Рё РёР·РґРµР»РёРµ РїРѕРјРµС‰Р°РµС‚СЃСЏ С…РѕС‚СЏ Р±С‹ РІ
  // РѕРґРёРЅ РїСЂРёРѕСЂРёС‚РµС‚РЅС‹Р№ РїРµС‡Р°С‚РЅС‹Р№ С„РѕСЂРјР°С‚ вЂ” РѕРїС‚РёРјР°Р»СЊРЅС‹Р№ РІР°СЂРёР°РЅС‚ РІС‹Р±РёСЂР°РµС‚СЃСЏ РўРћР›Р¬РљРћ
  // СЃСЂРµРґРё РїСЂРёРѕСЂРёС‚РµС‚РЅС‹С…. Р Р°СЃРєСЂРѕР№РЅС‹Рµ С„РѕСЂРјР°С‚С‹ (500Г—350, 250Г—700 Рё С‚.Рї.) РјРѕРіСѓС‚
  // РѕСЃС‚Р°РІР°С‚СЊСЃСЏ Р»РёС€СЊ РєР°Рє Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹, РЅРѕ РЅРµ РєР°Рє В«РѕРїС‚РёРјР°Р»СЊРЅС‹РµВ».
  const priorityPool = pool.filter((r) => isPriority(r.pair));
  const mainPool = priorityPool.length ? priorityPool : pool;

  // Р’РЅСѓС‚СЂРё РѕС‚С„РёР»СЊС‚СЂРѕРІР°РЅРЅРѕРіРѕ РїСѓР»Р° вЂ” С„РёРЅР°РЅСЃРѕРІРѕ-РІС‹РіРѕРґРЅРѕРµ СЂР°РЅР¶РёСЂРѕРІР°РЅРёРµ:
  //   1) Р±РѕР»СЊС€Рµ РёР·РґРµР»РёР№ РЅР° РїРµС‡Р°С‚РЅРѕРј Р»РёСЃС‚Рµ (РјРµРЅСЊС€Рµ СЃ/СЃ РЅР° РёР·РґРµР»РёРµ);
  //   2) РјРµРЅСЊС€Рµ РѕС‚С…РѕРґРѕРІ РЅР° РёР·РґРµР»РёРµ (СЂР°С†РёРѕРЅР°Р»СЊРЅРѕСЃС‚СЊ);
  //   3) Р±РѕР»СЊС€Рµ РёР·РґРµР»РёР№ СЃ Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ (РјРµРЅСЊС€Рµ Р·Р°РєСѓРїР°РµРј);
  //   4) РјРµРЅСЊС€РёР№ РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚ (РјРµРЅСЊС€Рµ РѕСЃС‚Р°С‚РєРѕРІ).
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

  // РђР»СЊС‚РµСЂРЅР°С‚РёРІС‹ вЂ” РІСЃРµ РѕСЃС‚Р°Р»СЊРЅС‹Рµ РІР°СЂРёР°РЅС‚С‹ (РІРєР»СЋС‡Р°СЏ СЂР°СЃРєСЂРѕР№РЅС‹Рµ), РѕС‚СЃРѕСЂС‚РёСЂРѕРІР°РЅРЅС‹Рµ
  // С‚РµРј Р¶Рµ РїСЂР°РІРёР»РѕРј, Р±РµР· РґСѓР±Р»РµР№ РїРѕ (РїРµС‡Р°С‚РЅС‹Р№, Р·Р°РєСѓРїРѕС‡РЅС‹Р№, РѕСЂРёРµРЅС‚Р°С†РёСЏ).
  const taken = new Set(
    mainPool.map((r) => `${r.pair.print.width}x${r.pair.print.height}|${r.pair.purchase.width}x${r.pair.purchase.height}|${r.layout.rotated}`)
  );
  const alts = pool
    .filter((r) => !taken.has(`${r.pair.print.width}x${r.pair.print.height}|${r.pair.purchase.width}x${r.pair.purchase.height}|${r.layout.rotated}`))
    .sort(sortFn);

  // Р”РµРґСѓРї РїРѕ (РїРµС‡Р°С‚РЅС‹Р№, Р·Р°РєСѓРїРѕС‡РЅС‹Р№) вЂ” РѕСЃС‚Р°РІР»СЏРµРј Р»СѓС‡С€РёР№ РІР°СЂРёР°РЅС‚ РѕСЂРёРµРЅС‚Р°С†РёРё,
  // С‡С‚РѕР±С‹ РЅРµ РїР»РѕРґРёС‚СЊ РґСѓР±Р»РёРєР°С‚С‹ РІ РїСЂРµРІСЊСЋ.
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

function nestingPurchaseToPrint(
  purchaseW: number,
  purchaseH: number,
  printW: number,
  printH: number,
): { nesting: number; cols: number; rows: number } {
  // count print sheets per purchase sheet (try both orientations)
  let best = { nesting: 0, cols: 0, rows: 0 };
  for (const rotated of [false, true]) {
    const w = rotated ? printH : printW;
    const h = rotated ? printW : printH;
    const cols = Math.floor(purchaseW / w);
    const rows = Math.floor(purchaseH / h);
    const n = cols * rows;
    if (n > best.nesting) best = { nesting: n, cols, rows };
  }
  return best;
}

/**
 * РўРµС…РЅРѕР»РѕРіРёС‡РµСЃРєР°СЏ СЂРµР·РєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ Р»РёСЃС‚Р° РЅР° РїРµС‡Р°С‚РЅС‹Рµ.
 * cuts = cols + rows - 2 (РіРёР»СЊРѕС‚РёРЅРЅР°СЏ СЃС…РµРјР°: РІРґРѕР»СЊ Рё РїРѕРїРµСЂС‘Рє).
 * Р•СЃР»Рё РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚ РѕРґРёРЅ (cols=rows=1) вЂ” СЂРµР·РѕРІ 0.
 */
export function cutsForPurchaseLayout(cols: number, rows: number): number {
  const c = Math.max(1, Math.floor(cols));
  const r = Math.max(1, Math.floor(rows));
  return Math.max(0, c + r - 2);
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

  // Р•СЃР»Рё РїРµСЂРµРґР°РЅС‹ Р¶С‘СЃС‚РєРёРµ РїР°СЂС‹ (Р·Р°РєСѓРїРѕС‡РЅС‹Р№в†”РїРµС‡Р°С‚РЅС‹Р№) вЂ” РёСЃРїРѕР»СЊР·СѓРµРј РёС… Рё
  // Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРµСЂРµРѕРїСЂРµРґРµР»СЏРµРј Р·Р°РєСѓРїРѕС‡РЅС‹Р№ С„РѕСЂРјР°С‚ РјР°С‚РµСЂРёР°Р»Р°.
  let layout: LayoutResult | null;
  let pickedPurchase: PrintFormat | null = null;
  let alternatives: CalcResult["alternatives"] = [];
  let rankedPairs: ReturnType<typeof rankPairs> = [];
  if (input.formatPairs && input.formatPairs.length) {
    const ranked = rankPairs(input.formatWidth, input.formatHeight, isSticker, input.formatPairs, {
      requireEvenItems: input.requireEvenItems,
      priorityPrintFormats: input.priorityPrintFormats,
    });
    if (!ranked.length) throw new Error("РР·РґРµР»РёРµ РЅРµ РІРјРµС‰Р°РµС‚СЃСЏ РЅРё РІ РѕРґРёРЅ РґРѕСЃС‚СѓРїРЅС‹Р№ РїРµС‡Р°С‚РЅС‹Р№ С„РѕСЂРјР°С‚.");
    layout = ranked[0].layout;
    pickedPurchase = ranked[0].pair.purchase;
    rankedPairs = ranked;
  } else {
    layout = bestLayout(input.formatWidth, input.formatHeight, isSticker, input.printFormats);
    if (!layout) throw new Error("РР·РґРµР»РёРµ РЅРµ РІРјРµС‰Р°РµС‚СЃСЏ РІ РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚. Р’С‹Р±РµСЂРёС‚Рµ РґСЂСѓРіРѕР№ С„РѕСЂРјР°С‚.");
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
  // Р‘Р°Р·РѕРІР°СЏ С„РѕСЂРјСѓР»Р° РїСЂРёР»Р°РґРєРё (РґР»СЏ В«СЃРІРѕРµРіРѕ РѕР±РѕСЂРѕС‚Р°В»): setupOwn + 1% РѕС‚ С‚РёСЂР°Р¶Р° РїРµС‡Р°С‚РЅС‹С… Р»РёСЃС‚РѕРІ.
  // Р”Р»СЏ В«С‡СѓР¶РѕРіРѕ РѕР±РѕСЂРѕС‚Р°В» РїСЂРёР»Р°РґРєР° = 2 Г— Р±Р°Р·РѕРІР°СЏ (РїРµС‡Р°С‚Р°РµС‚СЃСЏ РґРІР° РїСЂРѕРіРѕРЅР°).
  // Р”Р»СЏ В«Р±РµР· РѕР±РѕСЂРѕС‚Р°В» вЂ” РїСЂРёР»Р°РґРєР° = Р±Р°Р·РѕРІР°СЏ (РѕРґРёРЅ РїСЂРѕРіРѕРЅ), РЅРѕ Р±РµР· РїСЂРѕС†РµРЅС‚РЅРѕР№ РЅР°РґР±Р°РІРєРё вЂ”
  // РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РєРѕРЅСЃС‚Р°РЅС‚С‹ setupOwn, РёРЅР°С‡Рµ С†РёС„СЂС‹ Р·Р°РІС‹С€РµРЅС‹.
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
    warnings.push("Р§СѓР¶РѕР№ РѕР±РѕСЂРѕС‚: РїСЂРёР»Р°РґРєР° = Г—2 РѕС‚ СЃРІРѕРµРіРѕ РѕР±РѕСЂРѕС‚Р° (" + setupSheets + " Р»РёСЃС‚РѕРІ).");
  }

  const printSheets = netPrintSheets + setupSheets;

  // Purchase sheets вЂ” Р·Р°РєСѓРїРѕС‡РЅС‹Р№ С„РѕСЂРјР°С‚ Р±РµСЂС‘Рј РёР· РїР°СЂС‹ (РµСЃР»Рё РµСЃС‚СЊ), РёРЅР°С‡Рµ РёР· РјР°С‚РµСЂРёР°Р»Р°
  const purchaseW = pickedPurchase?.width ?? input.material.format_width;
  const purchaseH = pickedPurchase?.height ?? input.material.format_height;
  const nestingInfo = nestingPurchaseToPrint(purchaseW, purchaseH, layout.printFormat.width, layout.printFormat.height);
  const purchaseNesting = Math.max(1, nestingInfo.nesting);
  const purchaseCols = Math.max(1, nestingInfo.cols);
  const purchaseRows = Math.max(1, nestingInfo.rows);
  const purchaseSheets = Math.ceil(printSheets / purchaseNesting);
  const paperCost = purchaseSheets * input.material.cost_per_sheet;

  if (paperCost === 0) {
    warnings.push("РЎС‚РѕРёРјРѕСЃС‚СЊ Р±СѓРјР°РіРё = 0. РџСЂРѕРІРµСЂСЊС‚Рµ РІС‹Р±РѕСЂ Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ С„РѕСЂРјР°С‚Р°.");
  }

  // Р РµР·РєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ в†’ РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚.
  // Р¤РѕСЂРјСѓР»Р°: cuts = cols + rows - 2 (РіРёР»СЊРѕС‚РёРЅРЅР°СЏ СЂРµР·РєР° СЃС‚РѕРїС‹).
  // Р¦РµРЅР° СЂРµР·Р° Р±РµСЂС‘С‚СЃСЏ РёР· rule.cutCostPerSheet (РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ 1 С‚Рі).
  // РўРµС…РЅРѕР»РѕРі РјРѕР¶РµС‚ РїРµСЂРµРѕРїСЂРµРґРµР»РёС‚СЊ РєРѕР»РёС‡РµСЃС‚РІРѕ СЂРµР·РѕРІ С‡РµСЂРµР· paperCutsPerSheetOverride.
  const autoPaperCutsPerSheet = cutsForPurchaseLayout(purchaseCols, purchaseRows);
  const paperCutsOverride = resolveCutsOverride([input.cutsPerSheetOverride, input.paperCutsPerSheetOverride]);
  const cutsPerSheet = paperCutsOverride ?? autoPaperCutsPerSheet;
  const paperCutCost = cutsPerSheet * purchaseSheets * rule.cutCostPerSheet;

  const formsCost = forms * rule.formCost;
  const formsPrepCost = forms * rule.formPrepCost;

  // Print
  // РљР°Р¶РґС‹Р№ РїСЂРѕРіРѕРЅ РєСЂР°СЃРєРё = РѕС‚РґРµР»СЊРЅС‹Р№ РѕС‚С‚РёСЃРє. РЎС‚РѕСЂРѕРЅС‹ СѓС‡РёС‚С‹РІР°СЋС‚СЃСЏ С‡РµСЂРµР·
  // colorFront + colorBack (РґР»СЏ В«СЃРІРѕР№ РѕР±РѕСЂРѕС‚В» РѕР±С‹С‡РЅРѕ colorBack > 0).
  const colorsTotal = Math.max(1, (input.colorFront || 0) + (input.colorBack || 0));
  const impressions = printSheets * colorsTotal;
  const setupImpressions = setupSheets * colorsTotal;
  const runImpressions = netPrintSheets * colorsTotal;
  const printPerImpr = input.printCostPerImpression ?? (turnaround === "foreign" ? 5 : 3);
  const printCost = impressions * printPerImpr;
  const inkCost = 0;

  // Postpress
  const postpress: SpecItem[] = [];
  // Р Р°СЃС…РѕРґРЅС‹Рµ РјР°С‚РµСЂРёР°Р»С‹ (С„РѕР»СЊРіР° Рё С‚.Рї.) вЂ” РІС‹РЅРѕСЃРёРј РІ РѕС‚РґРµР»СЊРЅСѓСЋ В«РєРѕСЂР·РёРЅСѓВ»
  // Рё РїРѕРєР°Р·С‹РІР°РµРј РІ РєРѕРЅС†Рµ СЃРІРѕРґРєРё РІРјРµСЃС‚Рµ СЃ Р±СѓРјР°РіРѕР№/РєСЂР°СЃРєРѕР№.
  const consumables: SpecItem[] = [];

  // Р РµР·РєР° РїРµС‡Р°С‚РЅРѕРіРѕ Р»РёСЃС‚Р° РЅР° РєРѕРЅРµС‡РЅС‹Р№ С„РѕСЂРјР°С‚ РёР·РґРµР»РёСЏ.
  // РџСЂРёРѕСЂРёС‚РµС‚ (РїРѕ РўР—):
  //   1) СЂСѓС‡РЅРѕРµ РїРµСЂРµРѕРїСЂРµРґРµР»РµРЅРёРµ (input.cutsPerSheetOverride);
  //   2) СЃРїСЂР°РІРѕС‡РЅРёРє cut_count_rules РїРѕ СЃРІСЏР·РєРµ В«РїРµС‡Р°С‚РЅС‹Р№ в†’ РєРѕРЅРµС‡РЅС‹Р№В»;
  //   3) Р°РІС‚Рѕ-СЂР°СЃС‡С‘С‚ РїРѕ С„Р°РєС‚РёС‡РµСЃРєРѕР№ СЂР°СЃРєР»Р°РґРєРµ: 1 в†’ 4 СЂРµР·Р°, РёРЅР°С‡Рµ 2Г—(cols+rows).
  const finishCut = resolveFinishCut({
    layout,
    printW: layout.printFormat.width,
    printH: layout.printFormat.height,
    productType: input.productType,
    formatType: input.formatType,
    rule,
    paperCutsOverride: input.cutsPerSheetOverride,
    paperCutsPerSheetOverride: input.paperCutsPerSheetOverride,
  });
  const finishCutsPerSheet = finishCut.cutsPerSheet;
  const cutSource = finishCut.source;
  const cutPrice = finishCut.pricePerCut;
  const cutLabel = finishCut.sourceLabel;
  const cutQty = Math.ceil(printSheets * finishCutsPerSheet);
  postpress.push({
    stage: "postpress",
    name: `${cutLabel} вЂ” ${finishCutsPerSheet} СЂРµР·/Р»РёСЃС‚ Г— ${printSheets} Р»РёСЃС‚.`,
    quantity: cutQty,
    unit: "СЂРµР·",
    unitPrice: cutPrice,
    total: cutQty * cutPrice,
  });
  const bleed = R().bleed;
  const cutInfo = {
    source: cutSource,
    printName: finishCut.printName,
    itemName: finishCut.itemName,
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

  // Р”РѕСЂР°Р±РѕС‚РєР° 5 Рё 7: СѓСЃС‚Р°СЂРµРІС€РёРµ Р¶С‘СЃС‚РєРёРµ Р±Р»РѕРєРё С„Р°Р»СЊС†РѕРІРєРё Рё РІС‹СЃРµС‡РєРё СѓРґР°Р»РµРЅС‹ вЂ”
  // С‚РµРїРµСЂСЊ РѕРЅРё СЃРѕР±РёСЂР°СЋС‚СЃСЏ РІ Calculator.tsx (РµРґРёРЅС‹Р№ Р±Р»РѕРє В«СЃРіРёР±С‹В» РїРѕ РїР»РѕС‚РЅРѕСЃС‚Рё
  // Рё РµРґРёРЅС‹Р№ Р±Р»РѕРє В«РІС‹СЃРµС‡РєР°В» РїРѕ С‚РёРїСѓ РјР°С‚РµСЂРёР°Р»Р° СЃРѕ С€С‚Р°РјРїРѕРј).

  if (input.hasLamPrepress || input.hasLamination) {
    const sides = input.lamPrepressSides ?? input.laminationSides ?? 1;
    const printW = layout.printFormat.width;
    const printH = layout.printFormat.height;
    const areaM2 = (printW * printH) / 1_000_000;
    const pricePerM2 = (input as any).lamPrepressPerM2 ?? (rule as any).lamPrepressPerM2 ?? 200;
    const setup = input.lamPrepressSetup ?? (rule as any).operationSetupCost ?? 1500;
    const minCost = input.lamPrepressMinCost ?? 0;
    const filmLabel = input.lamPrepressFilmLabel ? ` ${input.lamPrepressFilmLabel},` : "";
    const sheets = printSheets;
    let filmTotal = areaM2 * pricePerM2 * sheets * sides;
    let minAdjust = 0;
    if (minCost > 0 && filmTotal + setup < minCost) {
      minAdjust = minCost - (filmTotal + setup);
    }
    postpress.push({
      stage: "postpress",
      name: "РџСЂРёРїСЂРµСЃСЃ РїР»С‘РЅРєРѕР№ (РїСЂРёР»Р°РґРєР°)",
      quantity: 1,
      unit: "С€С‚",
      unitPrice: setup,
      total: setup,
    });
    postpress.push({
      stage: "postpress",
      name: `РџСЂРёРїСЂРµСЃСЃ РїР»С‘РЅРєРѕР№ (${printW}Г—${printH},${filmLabel} ${sides} СЃС‚.)`,
      quantity: Math.round(areaM2 * sheets * sides * 1000) / 1000,
      unit: "РјВІ",
      unitPrice: pricePerM2,
      total: filmTotal,
    });
    if (minAdjust > 0) {
      postpress.push({
        stage: "postpress",
        name: "РџСЂРёРїСЂРµСЃСЃ РїР»С‘РЅРєРѕР№ (РґРѕРїР»Р°С‚Р° РґРѕ РјРёРЅРёРјСѓРјР°)",
        quantity: 1,
        unit: "С€С‚",
        unitPrice: minAdjust,
        total: minAdjust,
      });
    }
  }

  if (input.hasNumbering && input.numbersPerSheet) {
    const qty = input.numbersPerSheet * input.circulation;
    postpress.push({ stage: "postpress", name: "РќСѓРјРµСЂР°С†РёСЏ (РїСЂРёР»Р°РґРєР°)", quantity: 1, unit: "С€С‚", unitPrice: (rule as any).operationSetupCost ?? 1500, total: (rule as any).operationSetupCost ?? 1500 });
    postpress.push({ stage: "postpress", name: "РќСѓРјРµСЂР°С†РёСЏ", quantity: qty, unit: "РЅРѕРјРµСЂ", unitPrice: rule.numberingCost, total: qty * rule.numberingCost });
  }

  if (input.hasStamping) {
    // РЎРїРёСЃРѕРє РєР»РёС€Рµ: Р»РёР±Рѕ РјР°СЃСЃРёРІ, Р»РёР±Рѕ РѕРґРёРЅРѕС‡РЅС‹Рµ W/H РґР»СЏ РѕР±СЂР°С‚РЅРѕР№ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё.
    const cliches = (input.stampingCliches && input.stampingCliches.length
      ? input.stampingCliches
      : (input.stampingClicheW && input.stampingClicheH
          ? [{ w: input.stampingClicheW, h: input.stampingClicheH }]
          : [])
    ).filter((c) => c.w > 0 && c.h > 0);
    if (cliches.length > 0) {
      const impr = input.stampingNotebook ? rule.stampingImprNotebook : rule.stampingImpr;
      postpress.push({ stage: "postpress", name: "РўРёСЃРЅРµРЅРёРµ (РїСЂРёР»Р°РґРєР°)", quantity: 1, unit: "С€С‚", unitPrice: rule.stampingSetup, total: rule.stampingSetup });
      const pointsList = cliches.map((c) => Math.max(1, Math.floor((c as any).points ?? 1)));
      const totalPoints = pointsList.reduce((s, n) => s + n, 0);
      cliches.forEach((c, i) => {
        const area = c.w * c.h;
        const cliche = Math.max(rule.stampingClicheMin, area * rule.stampingClichePerCm2);
        const p = pointsList[i];
        const label = cliches.length > 1 || p > 1
          ? ` #${i + 1} (${c.w}Г—${c.h} СЃРј${p > 1 ? `, ${p} С‚РѕС‡РµРє` : ""})`
          : "";
        postpress.push({ stage: "postpress", name: `РўРёСЃРЅРµРЅРёРµ (РєР»РёС€Рµ)${label}`, quantity: area, unit: "СЃРјВІ", unitPrice: rule.stampingClichePerCm2, total: cliche });
      });
      const totalImpr = input.circulation * totalPoints;
      postpress.push({
        stage: "postpress",
        name: totalPoints > 1 ? `РўРёСЃРЅРµРЅРёРµ (РѕС‚С‚РёСЃРєРё, ${totalPoints} С‚РѕС‡РµРє)` : "РўРёСЃРЅРµРЅРёРµ (РѕС‚С‚РёСЃРєРё)",
        quantity: totalImpr,
        unit: "РѕС‚С‚РёСЃРє",
        unitPrice: impr,
        total: totalImpr * impr,
      });
      // Р¤РѕР»СЊРіР°: СЂР°СЃС…РѕРґ = СЃСѓРјРјР° РїР»РѕС‰Р°РґРµР№ РєР»РёС€Рµ СЃ СѓС‡С‘С‚РѕРј С‚РѕС‡РµРє Г— С‚РёСЂР°Р¶.
      const totalFoilAreaPerImpr = cliches.reduce((s, c, i) => s + c.w * c.h * pointsList[i], 0);
      const foilArea = totalFoilAreaPerImpr * input.circulation;
      const foilPrice = MATERIAL_PRICES.foilPerCm2;
      if (foilArea > 0 && foilPrice > 0) {
        consumables.push({
          stage: "material",
          name: "Р¤РѕР»СЊРіР° РґР»СЏ С‚РёСЃРЅРµРЅРёСЏ",
          quantity: Math.ceil(foilArea),
          unit: "СЃРјВІ",
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
      postpress.push({ stage: "postpress", name: "РљРѕРЅРіСЂРµРІ (РїСЂРёР»Р°РґРєР°)", quantity: 1, unit: "С€С‚", unitPrice: rule.stampingSetup, total: rule.stampingSetup });
      const pointsList = cliches.map((c) => Math.max(1, Math.floor((c as any).points ?? 1)));
      const totalPoints = pointsList.reduce((s, n) => s + n, 0);
      cliches.forEach((c, i) => {
        const area = c.w * c.h;
        const cliche = Math.max(rule.stampingClicheMin, area * rule.stampingClichePerCm2);
        const p = pointsList[i];
        const label = cliches.length > 1 || p > 1
          ? ` #${i + 1} (${c.w}Г—${c.h} СЃРј${p > 1 ? `, ${p} С‚РѕС‡РµРє` : ""})`
          : "";
        postpress.push({ stage: "postpress", name: `РљРѕРЅРіСЂРµРІ (РєР»РёС€Рµ)${label}`, quantity: area, unit: "СЃРјВІ", unitPrice: rule.stampingClichePerCm2, total: cliche });
      });
      const totalImpr = input.circulation * totalPoints;
      postpress.push({
        stage: "postpress",
        name: totalPoints > 1 ? `РљРѕРЅРіСЂРµРІ (РѕС‚С‚РёСЃРєРё, ${totalPoints} С‚РѕС‡РµРє)` : "РљРѕРЅРіСЂРµРІ (РѕС‚С‚РёСЃРєРё)",
        quantity: totalImpr,
        unit: "РѕС‚С‚РёСЃРє",
        unitPrice: impr,
        total: totalImpr * impr,
      });
    }
  }

  // Logistics: СѓРїР°РєРѕРІРєР° Г—2 РґР»СЏ РІС‹СЂСѓР±РєРё
  const logistics: SpecItem[] = [];
  const packUnit = input.packagingPerUnit ?? 5;
  const packMult = isDieCut && !isBag ? 2 : 1;
  logistics.push({ stage: "logistics", name: packMult === 2 ? "РЈРїР°РєРѕРІРєР° (РґРІРѕР№РЅР°СЏ)" : "РЈРїР°РєРѕРІРєР°", quantity: input.circulation * packMult, unit: "С€С‚", unitPrice: packUnit, total: input.circulation * packMult * packUnit });
  if (isBag) {
    logistics.push({ stage: "logistics", name: "РЈРїР°РєРѕРІРєР° Р¶СѓСЂРЅР°Р»РѕРІ + СЂРµР·РєР°", quantity: input.circulation, unit: "С€С‚", unitPrice: 8, total: input.circulation * 8 });
  }

  // Prepress
  const prepress: SpecItem[] = [];
  if (input.photoOutputUnitCost > 0) {
    prepress.push({ stage: "prepress", name: "Р¤РѕС‚РѕРІС‹РІРѕРґ", quantity: forms, unit: "С€С‚", unitPrice: input.photoOutputUnitCost, total: forms * input.photoOutputUnitCost });
  }
  // Р’С‹РІРѕРґ РїРµС‡Р°С‚РЅС‹С… С„РѕСЂРј (РїР»Р°СЃС‚РёРЅС‹). Р•СЃР»Рё С†РµРЅР° РІ РїСЂР°РІРёР»Р°С… = 0, СЃС‚СЂРѕРєСѓ РЅРµ РґРѕР±Р°РІР»СЏРµРј вЂ”
  // РµС‘ Р·Р°РјРµРЅРёС‚ РїРѕР·РёС†РёСЏ В«Р’С‹РІРѕРґ С„РѕСЂРј CTPВ» РёР· СЃРїСЂР°РІРѕС‡РЅРёРєР° РѕРїРµСЂР°С†РёР№ (auto-РІРєР»СЋС‡Р°РµС‚СЃСЏ РІ UI).
  if (rule.formCost > 0) {
    prepress.push({ stage: "prepress", name: "Р’С‹РІРѕРґ РїРµС‡Р°С‚РЅС‹С… С„РѕСЂРј", quantity: forms, unit: "С€С‚", unitPrice: rule.formCost, total: formsCost });
  }
  prepress.push({ stage: "prepress", name: "РџРѕРґРіРѕС‚РѕРІРєР° Рє РїРµС‡Р°С‚Рё", quantity: forms, unit: "С„РѕСЂРјР°", unitPrice: rule.formPrepCost, total: formsPrepCost });
  // Р РµР·РєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ в†’ РїРµС‡Р°С‚РЅС‹Р№ Р»РёСЃС‚. РџРѕРєР°Р·С‹РІР°РµРј РІСЃРµРіРґР°, РєРѕРіРґР° РµСЃС‚СЊ СЂРµР·С‹ (>0),
  // РІРєР»СЋС‡Р°СЏ СЃР»СѓС‡Р°Р№ rule.cutCostPerSheet=0 вЂ” С‡С‚РѕР±С‹ РјРµРЅРµРґР¶РµСЂ РІРёРґРµР» РєРѕР»РёС‡РµСЃС‚РІРѕ.
  if (cutsPerSheet * purchaseSheets > 0) {
    const srcLabel = paperCutsOverride != null ? "СЂСѓС‡РЅР°СЏ РєРѕСЂСЂРµРєС‚РёСЂРѕРІРєР°" : `Р°РІС‚Рѕ: ${purchaseCols}+${purchaseRows}в€’2`;
    prepress.push({
      stage: "prepress",
      name: `Р РµР·РєР° Р·Р°РєСѓРїРѕС‡РЅРѕРіРѕ ${purchaseW}Г—${purchaseH} в†’ РїРµС‡Р°С‚РЅС‹Р№ ${layout.printFormat.width}Г—${layout.printFormat.height} (${purchaseCols}Г—${purchaseRows}, ${srcLabel})`,
      quantity: cutsPerSheet * purchaseSheets,
      unit: "СЂРµР·",
      unitPrice: rule.cutCostPerSheet,
      total: paperCutCost,
    });
  }

  const materials: SpecItem[] = [
    { stage: "material", name: input.material.name, quantity: purchaseSheets, unit: "Р»РёСЃС‚", unitPrice: input.material.cost_per_sheet, total: paperCost },
  ];

  // РџРµС‡Р°С‚СЊ: СЂР°Р·РґРµР»СЏРµРј РїСЂРёР»Р°РґРєСѓ Рё С‚РёСЂР°Р¶, С‡С‚РѕР±С‹ РјРµРЅРµРґР¶РµСЂ РІРёРґРµР» СЃС‚РѕРёРјРѕСЃС‚СЊ
  // РїСЂРёР»Р°РґРѕС‡РЅС‹С… РѕС‚С‚РёСЃРєРѕРІ РѕС‚РґРµР»СЊРЅРѕ РѕС‚ СЂР°Р±РѕС‡РµРіРѕ С‚РёСЂР°Р¶Р°.
  const turnLabel = turnaround === "foreign" ? "С‡СѓР¶РѕР№" : turnaround === "own" ? "СЃРІРѕР№" : "Р±РµР· РѕР±РѕСЂРѕС‚Р°";
  const printItems: SpecItem[] = [];
  if (setupImpressions > 0) {
    printItems.push({
      stage: "print",
      name: `РџРµС‡Р°С‚СЊ РѕС„СЃРµС‚РЅР°СЏ вЂ” РїСЂРёР»Р°РґРєР° (${turnLabel})`,
      quantity: setupImpressions,
      unit: "РѕС‚С‚РёСЃРє",
      unitPrice: printPerImpr,
      total: setupImpressions * printPerImpr,
    });
  }
  printItems.push({
    stage: "print",
    name: `РџРµС‡Р°С‚СЊ РѕС„СЃРµС‚РЅР°СЏ вЂ” С‚РёСЂР°Р¶ (${turnLabel})`,
    quantity: runImpressions,
    unit: "РѕС‚С‚РёСЃРє",
    unitPrice: printPerImpr,
    total: runImpressions * printPerImpr,
  });

  const spec = [...prepress, ...materials, ...printItems, ...postpress, ...logistics, ...consumables];
  const totalCost = spec.reduce((s, i) => s + i.total, 0);

  const vatPercent = input.vatPercent ?? 0;
  const vatAmount = totalCost * (vatPercent / 100);
  const totalWithVat = totalCost + vatAmount;

  // РЎС‚РѕРёРјРѕСЃС‚Рё РїРѕ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІР°Рј вЂ” СѓРїСЂРѕС‰С‘РЅРЅР°СЏ РјРѕРґРµР»СЊ: Р±СѓРјР°РіР° + РїРµС‡Р°С‚СЊ + РѕС‚С…РѕРґС‹.
  // РЎС‚РѕРёРјРѕСЃС‚СЊ РїРѕ Р°Р»СЊС‚РµСЂРЅР°С‚РёРІР°Рј — СѓРїСЂРѕС‰С‘РЅРЅР°СЏ РјРѕРґРµР»СЃРµ: Р±СѓРјР°РіР° + РїРµС‡Р°С‚СЊ + РѕС‚С…РѕРґРѕРІ.
  // РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ С‚РѕР»СЊРєРѕ РґР»СЃСЋ СЃСЂР°РІРЅРµРЅРёСЃСЊ РІР°СЂРёР°РЅС‚РѕРІ РІ РїСЂРµРІСЃРµ.
  alternatives = rankedPairs.slice(1, 4).map((r) => {
    const altNet = Math.ceil(input.circulation / r.layout.itemsPerSheet);
    const altPrintSheets = altNet + setupSheets;
    const altPurchaseSheets = Math.ceil(altPrintSheets / Math.max(1, r.nesting));
    const altPaper = altPurchaseSheets * input.material.cost_per_sheet;
    const altImpressions = altPrintSheets * (turnaround === "own" ? 2 : 1);
    const altPrint = altImpressions * printPerImpr;
    const altCutsForPurchase = cutsForPurchaseLayout(r.layout.cols, r.layout.rows);
    const altPaperCut = altCutsForPurchase * altPurchaseSheets * rule.cutCostPerSheet;
    const altFinishCut = resolveFinishCut({
      layout: r.layout,
      printW: r.layout.printFormat.width,
      printH: r.layout.printFormat.height,
      productType: input.productType,
      formatType: input.formatType,
      rule,
      paperCutsOverride: input.cutsPerSheetOverride,
      paperCutsPerSheetOverride: input.paperCutsPerSheetOverride,
    });
    const altFinishCutQty = Math.ceil(altPrintSheets * altFinishCut.cutsPerSheet);
    const altFinishCutCost = altFinishCutQty * altFinishCut.pricePerCut;
    const altLogisticsQty = input.circulation * (isDieCut && !isBag ? 2 : 1);
    const altBagLogistics = isBag ? input.circulation * 8 : 0;
    const altLogistics = altLogisticsQty * packUnit + altBagLogistics;
    // РЎС‚РѕРёРјРѕСЃС‚СЊ РѕС‚С…РѕРґРѕРІ = РґРѕР»СЏ Р±СѓРјР°РіРё, СѓС€РµРґС€Р°СЏ РІ РѕР±СЂРµР·РєРё РЅР° РїРµС‡Р°С‚РѕРј Р»РёСЃС‚Рµ
    const printArea = r.layout.printFormat.width * r.layout.printFormat.height;
    const wasteShare = printArea > 0 ? r.layout.wasteArea / printArea : 0;
    const altWaste = altPaper * wasteShare;
    const altTotal = altPaper + altPrint + altPaperCut + altFinishCutCost + altLogistics + formsCost + formsPrepCost;
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
      totalCost: Math.round(altTotal),
    };
  });
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

