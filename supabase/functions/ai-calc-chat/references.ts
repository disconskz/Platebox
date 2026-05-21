// Загрузка полного снапшота справочников для ИИ-ассистента.
// Включает расширенный датасет: каталог операций с параметрами/формулами,
// библиотеку этапов, кастомные справочники, константы с описаниями.

import { createClient } from "npm:@supabase/supabase-js@2";

export type OperationParam = {
  code: number;
  name: string;
  default_value: string;
  formula: string;
  notes: string;
  sort_order: number;
};

export type OperationWork = {
  code: number;
  name: string;
  price_source: string;
  quantity_source: string;
  notes: string;
  sort_order: number;
};

export type OperationFull = {
  code: number;
  name: string;
  category: string;
  description: string;
  parameters: OperationParam[];
  work_items: OperationWork[];
};

export type ReferenceSnapshot = {
  materials: Array<{
    id: string; name: string; type: string; subgroup: string | null;
    density: number; w: number; h: number; price: number;
  }>;
  print_formats: Array<{ id: string; w: number; h: number; purchase_format_id: string | null; subgroup: string | null }>;
  purchase_formats: Array<{ id: string; w: number; h: number; category: string; subgroup: string | null }>;
  press_machines: Array<{
    id: string; name: string; type: string; subgroup: string | null;
    max_w: number; max_h: number; min_circ: number; max_circ: number | null;
    setup_sheets: number; setup_cost: number; cost_per_impression: number;
    product_types: string[] | null; priority: number;
  }>;
  equipment: Array<{ id: string; name: string; type: string; subgroup: string | null; max_w: number | null; max_h: number | null; cost_per_impression: number; notes: string | null }>;
  lamination: Array<{ film: string; size: string; price_per_side: number; subgroup: string | null }>;
  operations_legacy: Array<{ name: string; category: string; fixed: number; variable: number; unit: string; setup_sheets: number; subgroup: string | null }>;
  operation_catalog: OperationFull[];
  calc_stage_library: Array<{ name: string; category: string; unit: string; formula: unknown }>;
  calc_variants: Array<{
    id: string; name: string; description: string;
    category: string; base_product_type: string;
    stages: Array<{ name: string; unit: string; sort_order: number; material_id: string | null }>;
  }>;
  custom_references: Array<{
    slug: string; name: string;
    fields: unknown;
    rows: Array<{ subgroup: string | null; data: Record<string, unknown> }>;
  }>;
  constants: Array<{ slug: string; name: string; value: number; unit: string; description: string }>;
  circulation_rules: Array<{ product_type: string; min: number; max: number | null; preferred_machine_id: string | null; subgroup: string | null }>;
  glossary: Array<{ slug: string; name: string; base_product_type: string | null; category: string; is_calculable: boolean; description: string }>;
  format_presets: Array<{ name: string; w: number; h: number; category: string }>;
  envelope_formats: Array<{ name: string; w: number; h: number; subgroup: string | null }>;
  vat_percent: number;
};

let snapshotCache: { data: ReferenceSnapshot; ts: number } | null = null;
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

export async function loadReferenceSnapshot(force = false): Promise<ReferenceSnapshot> {
  const now = Date.now();
  if (!force && snapshotCache && now - snapshotCache.ts < SNAPSHOT_TTL_MS) return snapshotCache.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [
    materialsR, printFormatsR, purchaseFormatsR, pressR, equipmentR, lamR,
    opsLegacyR, opCatR, opParamsR, opWorkR,
    stageLibR, variantsR, variantStagesR,
    customRefsR, customRowsR,
    constR, circR, glossR, presetsR, envR, settingsR,
  ] = await Promise.all([
    admin.from("materials").select("id,name,type,subgroup,density,format_width,format_height,cost_per_sheet").order("name"),
    admin.from("print_formats").select("id,width,height,purchase_format_id,subgroup").order("sort_order"),
    admin.from("purchase_formats").select("id,width,height,material_category,subgroup").order("sort_order"),
    admin.from("press_machines").select("id,name,machine_type,subgroup,max_format_width,max_format_height,min_circulation,max_circulation,setup_sheets,setup_cost,cost_per_impression,product_types,priority").eq("is_active", true).order("priority"),
    admin.from("equipment").select("id,name,type,subgroup,max_format_width,max_format_height,cost_per_impression,notes"),
    admin.from("lamination_prices").select("film_type,size_range,cost_per_side,subgroup"),
    admin.from("operations").select("name,category,fixed_cost,variable_cost,unit,setup_sheets,subgroup"),
    admin.from("operation_catalog").select("code,name,category,description").order("sort_order"),
    admin.from("operation_parameters").select("operation_code,code,name,default_value,formula,notes,sort_order").order("sort_order"),
    admin.from("operation_work_items").select("operation_code,code,name,price_source,quantity_source,notes,sort_order").order("sort_order"),
    admin.from("calc_stage_library").select("name,category,unit,formula").order("sort_order"),
    admin.from("calc_variants").select("id,name,description,category,base_product_type").eq("is_active", true).order("sort_order"),
    admin.from("calc_variant_stages").select("variant_id,name,unit,sort_order,material_id").order("sort_order"),
    admin.from("custom_references").select("id,slug,name,fields").order("sort_order"),
    admin.from("custom_reference_rows").select("reference_id,subgroup,data").order("sort_order"),
    admin.from("calc_constants").select("slug,name,value,unit,description").order("sort_order"),
    admin.from("product_circulation_rules").select("product_type,min_circulation,max_circulation,preferred_machine_id,subgroup").order("sort_order"),
    admin.from("product_glossary").select("slug,name,base_product_type,category,is_calculable,description").order("sort_order"),
    admin.from("format_presets").select("name,width,height,category"),
    admin.from("envelope_formats").select("name,width,height,subgroup").order("sort_order"),
    admin.from("system_settings").select("key,value"),
  ]);

  // Сборка operation_catalog: операция + её параметры + работы.
  const paramsByOp = new Map<number, OperationParam[]>();
  for (const p of (opParamsR.data ?? []) as any[]) {
    const arr = paramsByOp.get(p.operation_code) ?? [];
    arr.push({
      code: p.code, name: p.name, default_value: p.default_value ?? "",
      formula: p.formula ?? "", notes: p.notes ?? "", sort_order: p.sort_order ?? 0,
    });
    paramsByOp.set(p.operation_code, arr);
  }
  const workByOp = new Map<number, OperationWork[]>();
  for (const w of (opWorkR.data ?? []) as any[]) {
    const arr = workByOp.get(w.operation_code) ?? [];
    arr.push({
      code: w.code, name: w.name, price_source: w.price_source ?? "",
      quantity_source: w.quantity_source ?? "", notes: w.notes ?? "", sort_order: w.sort_order ?? 0,
    });
    workByOp.set(w.operation_code, arr);
  }
  const operation_catalog: OperationFull[] = ((opCatR.data ?? []) as any[]).map((o) => ({
    code: o.code, name: o.name, category: o.category ?? "", description: o.description ?? "",
    parameters: paramsByOp.get(o.code) ?? [],
    work_items: workByOp.get(o.code) ?? [],
  }));

  // Варианты + их этапы
  const stagesByVariant = new Map<string, Array<{ name: string; unit: string; sort_order: number; material_id: string | null }>>();
  for (const s of (variantStagesR.data ?? []) as any[]) {
    const arr = stagesByVariant.get(s.variant_id) ?? [];
    arr.push({ name: s.name, unit: s.unit, sort_order: s.sort_order ?? 0, material_id: s.material_id ?? null });
    stagesByVariant.set(s.variant_id, arr);
  }

  // Кастомные справочники + их строки
  const rowsByRef = new Map<string, Array<{ subgroup: string | null; data: Record<string, unknown> }>>();
  for (const r of (customRowsR.data ?? []) as any[]) {
    const arr = rowsByRef.get(r.reference_id) ?? [];
    arr.push({ subgroup: r.subgroup ?? null, data: (r.data ?? {}) as Record<string, unknown> });
    rowsByRef.set(r.reference_id, arr);
  }

  let vatPercent = 12;
  for (const r of (settingsR.data ?? []) as Array<{ key: string; value: string }>) {
    if (r.key === "vat_percent") vatPercent = Number(r.value) || vatPercent;
  }

  const snapshot: ReferenceSnapshot = {
    materials: ((materialsR.data ?? []) as any[]).map((m) => ({
      id: m.id, name: m.name, type: m.type, subgroup: m.subgroup ?? null,
      density: m.density, w: m.format_width, h: m.format_height,
      price: Number(m.cost_per_sheet) || 0,
    })),
    print_formats: ((printFormatsR.data ?? []) as any[]).map((p) => ({
      id: p.id, w: p.width, h: p.height, purchase_format_id: p.purchase_format_id ?? null, subgroup: p.subgroup ?? null,
    })),
    purchase_formats: ((purchaseFormatsR.data ?? []) as any[]).map((p) => ({
      id: p.id, w: p.width, h: p.height, category: p.material_category, subgroup: p.subgroup ?? null,
    })),
    press_machines: ((pressR.data ?? []) as any[]).map((p) => ({
      id: p.id, name: p.name, type: p.machine_type, subgroup: p.subgroup ?? null,
      max_w: p.max_format_width, max_h: p.max_format_height,
      min_circ: p.min_circulation, max_circ: p.max_circulation,
      setup_sheets: p.setup_sheets, setup_cost: Number(p.setup_cost) || 0,
      cost_per_impression: Number(p.cost_per_impression) || 0,
      product_types: p.product_types ?? null, priority: p.priority,
    })),
    equipment: ((equipmentR.data ?? []) as any[]).map((e) => ({
      id: e.id, name: e.name, type: e.type, subgroup: e.subgroup ?? null,
      max_w: e.max_format_width ?? null, max_h: e.max_format_height ?? null,
      cost_per_impression: Number(e.cost_per_impression) || 0,
      notes: e.notes ?? null,
    })),
    lamination: ((lamR.data ?? []) as any[]).map((l) => ({
      film: l.film_type, size: l.size_range, price_per_side: Number(l.cost_per_side) || 0,
      subgroup: l.subgroup ?? null,
    })),
    operations_legacy: ((opsLegacyR.data ?? []) as any[]).map((o) => ({
      name: o.name, category: o.category,
      fixed: Number(o.fixed_cost) || 0, variable: Number(o.variable_cost) || 0,
      unit: o.unit ?? "", setup_sheets: o.setup_sheets ?? 0, subgroup: o.subgroup ?? null,
    })),
    operation_catalog,
    calc_stage_library: ((stageLibR.data ?? []) as any[]).map((s) => ({
      name: s.name, category: s.category, unit: s.unit, formula: s.formula,
    })),
    calc_variants: ((variantsR.data ?? []) as any[]).map((v) => ({
      id: v.id, name: v.name, description: v.description ?? "",
      category: v.category ?? "other", base_product_type: v.base_product_type ?? "leaflet",
      stages: stagesByVariant.get(v.id) ?? [],
    })),
    custom_references: ((customRefsR.data ?? []) as any[]).map((r) => ({
      slug: r.slug, name: r.name, fields: r.fields,
      rows: rowsByRef.get(r.id) ?? [],
    })),
    constants: ((constR.data ?? []) as any[]).map((c) => ({
      slug: c.slug, name: c.name ?? c.slug,
      value: Number(c.value) || 0,
      unit: c.unit ?? "", description: c.description ?? "",
    })),
    circulation_rules: ((circR.data ?? []) as any[]).map((c) => ({
      product_type: c.product_type, min: c.min_circulation, max: c.max_circulation,
      preferred_machine_id: c.preferred_machine_id, subgroup: c.subgroup ?? null,
    })),
    glossary: ((glossR.data ?? []) as any[]).map((g) => ({
      slug: g.slug, name: g.name, base_product_type: g.base_product_type ?? null,
      category: g.category, is_calculable: g.is_calculable, description: g.description ?? "",
    })),
    format_presets: ((presetsR.data ?? []) as any[]).map((f) => ({
      name: f.name, w: f.width, h: f.height, category: f.category ?? "standard",
    })),
    envelope_formats: ((envR.data ?? []) as any[]).map((e) => ({
      name: e.name, w: e.width, h: e.height, subgroup: e.subgroup ?? null,
    })),
    vat_percent: vatPercent,
  };

  snapshotCache = { data: snapshot, ts: now };
  return snapshot;
}

export function constantsToMap(snapshot: ReferenceSnapshot): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of snapshot.constants) out[c.slug] = c.value;
  return out;
}