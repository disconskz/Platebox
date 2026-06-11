/**
 * ERP-движок обложки (Задача 5, §9-§12).
 * Чистые функции: себестоимость, маршрут, тех. отчёт, предупреждения.
 * Использует `CoverState` из `components/calc/multipage/sections/CoverSection`.
 */
import type { CoverSpecOpKey, CoverState } from "@/components/calc/multipage/sections/CoverSection";
import { COVER_SPEC_OP_CATALOG, coverSpecOpTotal } from "@/components/calc/multipage/sections/CoverSection";

export interface CoverCalcContext {
  /** Глобальный формат изделия (мм). */
  itemW: number;
  itemH: number;
  /** Глобальный тираж (используется если override выключен). */
  circulation: number;
  /** Глобальный тип печати (используется если override выключен). */
  printType?: string;
  /** Толщина корешка (мм), 0 для одностраничных. */
  spineMm?: number;
  /** Размер печатного листа, мм (по умолчанию 720×1020). */
  sheetW?: number;
  sheetH?: number;
}

export interface CoverLine {
  stage: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

export interface CoverReport {
  /** Цены за лист бумаги обложки. */
  paperPricePerSheet: number;
  /** Размер развёрнутой обложки, мм. */
  spreadW: number;
  spreadH: number;
  /** Кол-во обложек на печатном листе. */
  upPerSheet: number;
  /** Закупочные листы. */
  purchaseSheets: number;
  /** Печатные листы (включая приладку). */
  printSheets: number;
  /** Отходы. */
  wasteSheets: number;
  /** Кол-во форм печати. */
  formsCount: number;
  /** Эффективный тираж обложки. */
  circulation: number;
  /** Эффективный тип печати. */
  printType: "offset" | "digital" | "uv";
  /** Премиальный коэффициент (soft-touch и т.п.). */
  premiumCoef: number;
  /** Доп. дней к сроку производства. */
  extraLeadDays: number;
}

function resolvePrintType(c: CoverState, ctx: CoverCalcContext): "offset" | "digital" | "uv" {
  const local = c.override ? c.localPrintType ?? c.printType : c.printType;
  const eff = local && local !== "auto" ? local : (ctx.printType ?? "auto");
  if (eff === "offset") return "offset";
  if (eff === "uv") return "uv";
  if (eff === "digital") return "digital";
  // auto → офсет от 500 экз.
  return ctx.circulation >= 500 ? "offset" : "digital";
}

export function buildCoverReport(c: CoverState, ctx: CoverCalcContext): CoverReport {
  const circulation = c.override && c.localCirculation ? c.localCirculation : ctx.circulation;
  const printType = resolvePrintType(c, ctx);
  const spineMm = ctx.spineMm ?? 0;
  const spreadW = ctx.itemW * 2 + spineMm;
  const spreadH = ctx.itemH;
  const sheetW = ctx.sheetW ?? 720;
  const sheetH = ctx.sheetH ?? 1020;
  const cols = Math.max(0, Math.floor(sheetW / spreadW));
  const rows = Math.max(0, Math.floor(sheetH / spreadH));
  const upPerSheet = Math.max(1, cols * rows) || 1;
  const netSheets = Math.max(1, Math.ceil(circulation / upPerSheet));
  const setup = printType === "offset" ? 150 : 20;
  const printSheets = netSheets + setup;
  const purchaseSheets = Math.ceil(printSheets * 1.05);
  const wasteSheets = Math.max(0, printSheets - netSheets);
  // Цена за лист: грубо по плотности (₸/лист), 7 коп. за г/м².
  const paperPricePerSheet = Math.max(8, +(c.density * 0.22).toFixed(2));
  // §13 ERP — авто-расчёт форм по красочности и обороту.
  // Без оборота: front+0 → front. Чужой оборот: front+back → front+back.
  const formsCount = (c.colorFront || 0) + (c.twoSided ? (c.colorBack || 0) : 0);

  // §9 — premium-коэф. и срок
  let premiumCoef = 1;
  let extraLeadDays = 0;
  if (c.lamType === "soft_touch") { premiumCoef *= 1.2; extraLeadDays += 1; }
  if (c.lamType === "anti_scratch") { premiumCoef *= 1.15; }
  if (c.stamping) extraLeadDays += 1;
  if (c.foil) extraLeadDays += 1;
  if (c.figuredCut) extraLeadDays += 2;
  if (c.dieCut) extraLeadDays += 1;

  return {
    paperPricePerSheet, spreadW, spreadH, upPerSheet,
    purchaseSheets, printSheets, wasteSheets, formsCount,
    circulation, printType, premiumCoef, extraLeadDays,
  };
}

export function buildCoverLines(c: CoverState, ctx: CoverCalcContext): CoverLine[] {
  const out: CoverLine[] = [];
  const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
    out.push({ stage, name, qty, unit, price, total: +(qty * price).toFixed(2) });
  const r = buildCoverReport(c, ctx);
  const k = r.premiumCoef;

  // Материалы
  push("Материалы", `Обложка: ${c.paper} ${c.density} г/м²`, r.printSheets, "лист", r.paperPricePerSheet);

  // Печать обложки
  if (r.printType === "offset" && r.formsCount > 0) {
    push("Печать обложки", "Формы обложки", r.formsCount, "форма", 1500);
  }
  if (c.makeready) {
    push("Печать обложки", "Приладка обложки", 1, "усл.", r.printType === "offset" ? 800 : 300);
  }
  const printPrice = r.printType === "offset" ? 7 : r.printType === "uv" ? 18 : 35;
  push(
    "Печать обложки",
    `Печать обложки (${r.printType === "offset" ? "офсет" : r.printType === "uv" ? "UV" : "цифра"})`,
    r.printSheets,
    "лист",
    +(printPrice * k).toFixed(2),
  );
  if (c.pantone) {
    push("Печать обложки", `Pantone (${c.pantone})`, 1, "форма", 2500);
  }

  // Ламинация
  if (c.lamType !== "none") {
    const areaM2 = +((r.spreadW * r.spreadH) / 1_000_000 * r.printSheets * c.lamSides).toFixed(3);
    const rate =
      c.lamType === "soft_touch" ? 380 :
      c.lamType === "anti_scratch" ? 320 :
      c.lamType === "gloss" ? 220 : 220; // matte
    push("Постпечать обложки", `Ламинация (${c.lamType}, ${c.lamSides} ст.)`, areaM2, "м²", rate);
  }

  // Биговка
  if (c.bigging) {
    push("Постпечать обложки", "Биговка обложки", r.circulation * 2, "биг", +(1.5 * k).toFixed(2));
  }

  // §9 — Спецоперации
  const opKeys: CoverSpecOpKey[] = [
    "spotVarnish", "stamping", "embossing", "uv",
    "roundCorners", "dieCut", "window", "figuredCut",
  ];
  for (const key of opKeys) {
    if (!(c as any)[key]) continue;
    const cat = COVER_SPEC_OP_CATALOG[key];
    const params = c.specOps?.[key];
    const calc = coverSpecOpTotal(key, params, {
      circulation: r.circulation,
      printSheets: r.printSheets,
      premiumCoef: k,
    });
    if (calc.manual) {
      push("Постпечать обложки", `${cat.label} (ручная стоимость)`, 1, "усл.", calc.total);
      continue;
    }
    if (calc.setup > 0) {
      push("Постпечать обложки", `${cat.label}: ${cat.setupLabel}`, 1, "усл.", calc.setup);
    }
    if (calc.qty > 0 && calc.rate > 0) {
      push("Постпечать обложки", cat.label, calc.qty, cat.unit, +(calc.rate * k).toFixed(2));
    }
  }

  return out;
}

export function buildCoverRoute(c: CoverState, ctx: CoverCalcContext): string[] {
  const r = buildCoverReport(c, ctx);
  const s: string[] = [];
  s.push(`Бумага обложки: ${c.paper} ${c.density} г/м²`);
  if (r.printType === "offset") s.push("Вывод форм обложки");
  if (c.makeready) s.push("Приладка обложки");
  s.push(`Печать обложки (${r.printType === "offset" ? "офсет" : r.printType === "uv" ? "UV" : "цифра"})`);
  if (c.lamType !== "none") s.push(`Ламинация (${c.lamType})`);
  if (c.bigging) s.push("Биговка");
  if (c.spotVarnish) s.push("Выборочный лак");
  if (c.uv) s.push("УФ-лак");
  if (c.stamping) s.push("Тиснение");
  if (c.embossing) s.push("Конгрев");
  if (c.dieCut) s.push("Вырубка");
  if (c.window) s.push("Окно");
  if (c.figuredCut) s.push("Фигурная высечка");
  if (c.roundCorners) s.push("Скругление углов");
  return s;
}

export function buildCoverWarnings(c: CoverState, ctx: CoverCalcContext): string[] {
  const w: string[] = [];
  const sheetW = ctx.sheetW ?? 720;
  const sheetH = ctx.sheetH ?? 1020;
  const spreadW = ctx.itemW * 2 + (ctx.spineMm ?? 0);
  const spreadH = ctx.itemH;
  if ((c.lamType !== "none" || c.lamination) && !c.bigging && c.density >= 200) {
    w.push("Ламинация без биговки — риск трещин на сгибе. Рекомендуется биговка.");
  }
  if (c.density < 170 && (c.kind === "hard" || c.kind === "thick")) {
    w.push("Плотность слишком маленькая для выбранного типа обложки.");
  }
  if (spreadW > sheetW || spreadH > sheetH) {
    w.push(`Формат обложки ${spreadW}×${spreadH} мм не помещается на печатный лист ${sheetW}×${sheetH} мм.`);
  }
  if (c.stamping && c.lamType === "soft_touch") {
    w.push("Soft-touch плохо подходит под тиснение — возможен брак.");
  }
  if (c.figuredCut && c.density < 200) {
    w.push("Для фигурной высечки рекомендуется плотность ≥ 200 г/м².");
  }
  return w;
}