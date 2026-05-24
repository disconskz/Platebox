import { supabase } from "@/integrations/supabase/client";
import { CalcConstant, CalcVariant, FormulaNode, VariantStage } from "./types";

const sb = supabase as any;

export async function listVariants(): Promise<Array<Omit<CalcVariant, "stages"> & { stage_count: number }>> {
  const { data: vars } = await sb.from("calc_variants").select("*").order("sort_order").order("name");
  const list = (vars as any[]) || [];
  if (!list.length) return [];
  const ids = list.map((v) => v.id);
  const { data: counts } = await sb.from("calc_variant_stages").select("variant_id").in("variant_id", ids);
  const countMap = new Map<string, number>();
  ((counts as any[]) || []).forEach((r) => countMap.set(r.variant_id, (countMap.get(r.variant_id) || 0) + 1));
  return list.map((v) => ({ ...v, stage_count: countMap.get(v.id) || 0 }));
}

export async function getVariant(id: string): Promise<CalcVariant | null> {
  const { data: v } = await sb.from("calc_variants").select("*").eq("id", id).maybeSingle();
  if (!v) return null;
  const { data: s } = await sb.from("calc_variant_stages").select("*").eq("variant_id", id).order("sort_order");
  const stages: VariantStage[] = ((s as any[]) || []).map((r) => ({
    id: r.id, name: r.name, unit: r.unit, sort_order: r.sort_order,
    formula: r.formula as FormulaNode,
    material_id: r.material_id,
    material_formula: r.material_formula as FormulaNode | null,
    source: (r.source as any) || "formula",
    system_key: r.system_key ?? null,
  }));
  return { ...(v as any), stages };
}

export async function createVariant(input: { name: string; base_product_type: string; category?: string; description?: string }): Promise<string> {
  const { data, error } = await sb.from("calc_variants").insert({
    name: input.name,
    base_product_type: input.base_product_type,
    category: input.category || "other",
    description: input.description || "",
  }).select("id").single();
  if (error) throw error;
  return (data as any).id;
}

export async function updateVariant(id: string, patch: Partial<Omit<CalcVariant, "id" | "stages">>) {
  const { error } = await sb.from("calc_variants").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteVariant(id: string) {
  const { error } = await sb.from("calc_variants").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateVariant(id: string): Promise<string> {
  const v = await getVariant(id);
  if (!v) throw new Error("Вариант не найден");
  const newId = await createVariant({
    name: v.name + " (копия)",
    base_product_type: v.base_product_type,
    category: v.category,
    description: v.description,
  });
  if (v.stages.length) {
    const rows = v.stages.map((s) => ({
      variant_id: newId, name: s.name, unit: s.unit, formula: s.formula,
      material_id: s.material_id ?? null, material_formula: s.material_formula ?? null, sort_order: s.sort_order,
      source: s.source ?? "formula", system_key: s.system_key ?? null,
    }));
    await sb.from("calc_variant_stages").insert(rows);
  }
  return newId;
}

export async function replaceStages(variantId: string, stages: VariantStage[]) {
  // Атомарная замена через RPC: DELETE + INSERT в одной транзакции.
  const payload = stages.map((s, i) => ({
    name: s.name,
    unit: s.unit,
    formula: s.formula,
    material_id: s.material_id ?? null,
    material_formula: s.material_formula ?? null,
    sort_order: s.sort_order ?? (i + 1) * 10,
    source: s.source ?? "formula",
    system_key: s.system_key ?? null,
  }));
  const { error } = await sb.rpc("replace_variant_stages", {
    _variant_id: variantId,
    _stages: payload,
  });
  if (error) throw error;
}

export async function listConstants(): Promise<CalcConstant[]> {
  const { data } = await sb.from("calc_constants").select("*").order("sort_order").order("name");
  return ((data as any[]) || []) as CalcConstant[];
}

export async function upsertConstant(c: Partial<CalcConstant> & { slug: string; name: string; value: number }) {
  const { error } = await sb.from("calc_constants").upsert({
    slug: c.slug, name: c.name, value: c.value,
    unit: c.unit ?? "₸", description: c.description ?? "", sort_order: c.sort_order ?? 100,
  }, { onConflict: "slug" });
  if (error) throw error;
}

export async function deleteConstant(id: string) {
  const { error } = await sb.from("calc_constants").delete().eq("id", id);
  if (error) throw error;
}

export async function listStageLibrary(): Promise<Array<{ id: string; name: string; unit: string; formula: FormulaNode; category: string }>> {
  const { data } = await sb.from("calc_stage_library").select("*").order("sort_order");
  return ((data as any[]) || []) as any;
}

/**
 * Делает вариант активным для своего base_product_type.
 * Все другие варианты этого же типа становятся неактивными — активен всегда один.
 */
export async function setActiveVariant(id: string): Promise<void> {
  // Атомарная активация: одна транзакция, нет окна «нет активной формулы».
  const { error } = await sb.rpc("set_active_variant", { _variant_id: id });
  if (error) throw error;
}

/** Снять признак активности с варианта. */
export async function deactivateVariant(id: string): Promise<void> {
  const { error } = await sb.from("calc_variants").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

/** Активный вариант для базового типа продукции, либо null. */
export async function getActiveVariantFor(baseProductType: string): Promise<{ id: string; name: string } | null> {
  const { data } = await sb.from("calc_variants").select("id,name").eq("base_product_type", baseProductType).eq("is_active", true).maybeSingle();
  return (data as any) || null;
}