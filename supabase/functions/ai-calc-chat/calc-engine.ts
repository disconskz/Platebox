// Расчётный движок ИИ-ассистента. Повторяет ключевую логику фронтового
// калькулятора, но опирается на загруженный снапшот справочников и реальные
// формулы из operation_work_items.

import { evalFormula, parseDefault, type FormulaContext } from "./formula.ts";
import { constantsToMap, type OperationFull, type ReferenceSnapshot } from "./references.ts";

const FORMAT_DIMS: Record<string, { w: number; h: number }> = {
  A6: { w: 105, h: 148 },
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
};

export interface OrderInput {
  product_type: string;
  circulation: number;
  format: string;
  custom_width_mm?: number | null;
  custom_height_mm?: number | null;
  color_front: number;
  color_back: number;
  material_id?: string | null;
  press_machine_id?: string | null;
  print_format_id?: string | null;
  items_per_sheet?: number | null;
  postpress?: Array<{ operation_code: number; params?: Record<string, number>; name?: string }>;
  margin_percent?: number;
}

export interface SpecLine {
  stage: "material" | "prepress" | "print" | "postpress" | "logistics";
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface OrderEstimate {
  spec: SpecLine[];
  items_per_sheet: number;
  sheets_useful: number;
  sheets_setup: number;
  sheets_total: number;
  impressions: number;
  forms_count: number;
  paper_cost: number;
  prepress_cost: number;
  print_cost: number;
  postpress_cost: number;
  total_cost: number;
  margin_percent: number;
  margin_amount: number;
  vat_percent: number;
  vat_amount: number;
  sale_price: number;
  notes: string[];
  resolved: {
    material_name?: string;
    material_price_per_sheet?: number;
    press_machine_name?: string;
    cost_per_impression?: number;
    setup_cost?: number;
    print_format_label?: string;
    purchase_format_label?: string;
    purchase_format_id?: string;
  };
}

function getItemSize(input: OrderInput): { w: number; h: number } {
  if (input.format === "custom") {
    return { w: input.custom_width_mm || 0, h: input.custom_height_mm || 0 };
  }
  return FORMAT_DIMS[input.format] || { w: 0, h: 0 };
}

function pickMaterial(snapshot: ReferenceSnapshot, input: OrderInput) {
  if (input.material_id) return snapshot.materials.find((m) => m.id === input.material_id);
  return undefined;
}

function pickPress(snapshot: ReferenceSnapshot, input: OrderInput) {
  if (input.press_machine_id) return snapshot.press_machines.find((m) => m.id === input.press_machine_id);
  // авто-подбор по тиражу и типу продукции
  const cands = snapshot.press_machines.filter((m) => {
    const fitCirc = input.circulation >= m.min_circ && (m.max_circ == null || input.circulation <= m.max_circ);
    const fitType = !m.product_types?.length || m.product_types.includes(input.product_type);
    return fitCirc && fitType;
  });
  return cands[0] ?? snapshot.press_machines[0];
}

function pickPrintFormat(snapshot: ReferenceSnapshot, input: OrderInput, material?: { w: number; h: number }) {
  if (input.print_format_id) return snapshot.print_formats.find((p) => p.id === input.print_format_id);
  // выбрать формат, помещающийся в материал
  if (!material) return snapshot.print_formats[0];
  const fitting = snapshot.print_formats.filter((p) => p.w <= material.w && p.h <= material.h);
  return fitting.sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? snapshot.print_formats[0];
}

function calcItemsPerSheet(itemW: number, itemH: number, sheetW: number, sheetH: number): number {
  if (!itemW || !itemH || !sheetW || !sheetH) return 1;
  const a = Math.floor(sheetW / itemW) * Math.floor(sheetH / itemH);
  const b = Math.floor(sheetW / itemH) * Math.floor(sheetH / itemW);
  return Math.max(1, a, b);
}

/** Подсчёт всех значений параметров операции через дефолты и формулы. */
function resolveOperationParams(
  op: OperationFull,
  userParams: Record<string, number>,
  baseCtx: FormulaContext,
): { ctx: FormulaContext; missing: string[] } {
  const ctx: FormulaContext = { ...baseCtx, ...userParams };
  // Сначала дефолты для тех, что не задали
  for (const p of op.parameters) {
    if (ctx[p.name] !== undefined) continue;
    if (p.formula && p.formula.trim()) continue;
    const d = parseDefault(p.default_value, ctx);
    if (d != null && Number.isFinite(d)) ctx[p.name] = d;
  }
  // Затем итеративно — формульные
  for (let i = 0; i < 6; i++) {
    let changed = false;
    for (const p of op.parameters) {
      if (ctx[p.name] !== undefined) continue;
      if (!p.formula?.trim()) continue;
      const r = evalFormula(p.formula, ctx);
      if (r.ok) {
        ctx[p.name] = r.value;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const missing: string[] = [];
  for (const p of op.parameters) {
    if (ctx[p.name] === undefined) missing.push(p.name);
  }
  return { ctx, missing };
}

/** Полный расчёт заказа. */
export function estimateOrder(input: OrderInput, snapshot: ReferenceSnapshot): OrderEstimate {
  const notes: string[] = [];
  const consts = constantsToMap(snapshot);
  const formCost = consts["form_cost"] ?? consts["plate_cost"] ?? 0;
  const marginPercent = input.margin_percent ?? 30;
  const vatPercent = snapshot.vat_percent;

  const material = pickMaterial(snapshot, input);
  if (!material && input.material_id) notes.push("Материал из заявки не найден в справочнике");
  const press = pickPress(snapshot, input);
  const printFormat = pickPrintFormat(snapshot, input, material ? { w: material.w, h: material.h } : undefined);
  const purchaseFormat = printFormat?.purchase_format_id
    ? snapshot.purchase_formats.find((p) => p.id === printFormat!.purchase_format_id)
    : undefined;

  const item = getItemSize(input);
  const itemsPerSheet = input.items_per_sheet
    ?? calcItemsPerSheet(item.w, item.h, printFormat?.w ?? 0, printFormat?.h ?? 0);

  const sheetsUseful = Math.max(1, Math.ceil((input.circulation || 0) / Math.max(1, itemsPerSheet)));
  const colorMax = Math.max(input.color_front || 0, input.color_back || 0);
  const sheetsSetup = (press?.setup_sheets ?? 0) * Math.max(1, colorMax || 1);
  const sheetsTotal = sheetsUseful + sheetsSetup;
  const impressions = sheetsTotal * Math.max(1, colorMax || 1);

  const spec: SpecLine[] = [];

  // Материал
  const paperUnitPrice = material?.price ?? 0;
  const paperCost = sheetsTotal * paperUnitPrice;
  if (paperUnitPrice > 0) {
    spec.push({
      stage: "material",
      name: material ? `Бумага: ${material.name}` : "Бумага",
      quantity: sheetsTotal,
      unit: "лист",
      unit_price: paperUnitPrice,
      total: paperCost,
    });
  }

  // Допечатные — формы
  const formsCount = (input.color_front || 0) + (input.color_back || 0);
  const prepressCost = formsCount * formCost;
  if (prepressCost > 0) {
    spec.push({
      stage: "prepress",
      name: "Печатные формы",
      quantity: formsCount,
      unit: "форма",
      unit_price: formCost,
      total: prepressCost,
    });
  }

  // Печать
  const setupCost = press?.setup_cost ?? 0;
  const cpi = press?.cost_per_impression ?? 0;
  const printRunCost = impressions * cpi;
  const printCost = printRunCost + setupCost;
  if (cpi > 0) {
    spec.push({
      stage: "print",
      name: press ? `Печать: ${press.name}` : "Печать",
      quantity: impressions,
      unit: "оттиск",
      unit_price: cpi,
      total: printRunCost,
    });
  }
  if (setupCost > 0) {
    spec.push({
      stage: "print",
      name: "Приладка / setup машины",
      quantity: 1,
      unit: "шт",
      unit_price: setupCost,
      total: setupCost,
    });
  }

  // Постпечать через operation_catalog
  let postpressCost = 0;
  for (const item of input.postpress ?? []) {
    const op = snapshot.operation_catalog.find((o) => o.code === item.operation_code);
    if (!op) {
      notes.push(`Операция ${item.operation_code} не найдена в каталоге`);
      continue;
    }
    const baseCtx: FormulaContext = {
      "ТИРАЖ": input.circulation,
      "ЛИСТЫ": sheetsTotal,
      "ЛИСТЫ_ПОЛЕЗНЫЕ": sheetsUseful,
      "ОТТИСКИ": impressions,
      ...consts,
    };
    const { ctx, missing } = resolveOperationParams(op, item.params ?? {}, baseCtx);
    if (missing.length) {
      notes.push(`Операция "${op.name}": не хватает параметров — ${missing.join(", ")}`);
    }
    for (const w of op.work_items) {
      const q = evalFormula(w.quantity_source, ctx);
      const p = evalFormula(w.price_source, ctx);
      const qty = q.value;
      const price = p.value;
      const total = qty * price;
      postpressCost += total;
      spec.push({
        stage: "postpress",
        name: `${op.name} — ${w.name}`,
        quantity: Math.round(qty * 100) / 100,
        unit: "ед.",
        unit_price: Math.round(price * 100) / 100,
        total: Math.round(total * 100) / 100,
      });
      if (!q.ok || !p.ok) {
        notes.push(`Формула операции "${op.name} — ${w.name}" не разрешилась полностью`);
      }
    }
  }

  const totalCost = paperCost + prepressCost + printCost + postpressCost;
  const marginAmount = totalCost * (marginPercent / 100);
  const priceBeforeVat = totalCost + marginAmount;
  const vatAmount = priceBeforeVat * (vatPercent / 100);
  const salePrice = priceBeforeVat + vatAmount;

  return {
    spec,
    items_per_sheet: itemsPerSheet,
    sheets_useful: sheetsUseful,
    sheets_setup: sheetsSetup,
    sheets_total: sheetsTotal,
    impressions,
    forms_count: formsCount,
    paper_cost: Math.round(paperCost),
    prepress_cost: Math.round(prepressCost),
    print_cost: Math.round(printCost),
    postpress_cost: Math.round(postpressCost),
    total_cost: Math.round(totalCost),
    margin_percent: marginPercent,
    margin_amount: Math.round(marginAmount),
    vat_percent: vatPercent,
    vat_amount: Math.round(vatAmount),
    sale_price: Math.round(salePrice),
    notes,
    resolved: {
      material_name: material?.name,
      material_price_per_sheet: paperUnitPrice,
      press_machine_name: press ? `${press.name} (${press.type}, до ${press.max_w}×${press.max_h} мм)` : undefined,
      cost_per_impression: cpi,
      setup_cost: setupCost,
      print_format_label: printFormat ? `${printFormat.w}×${printFormat.h} мм` : undefined,
      purchase_format_label: purchaseFormat ? `${purchaseFormat.w}×${purchaseFormat.h} мм` : undefined,
      purchase_format_id: purchaseFormat?.id,
    },
  };
}