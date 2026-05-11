import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductType } from "@/lib/calc/types";

export type GlossaryCategory =
  | "print_small" | "multipage" | "calendar" | "large_format"
  | "sticker" | "pos" | "document" | "packaging_bag" | "packaging_box"
  | "souvenir" | "other";

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  print_small: "Малые тиражные изделия",
  multipage: "Многостраничные",
  calendar: "Календари",
  large_format: "Широкоформатная печать",
  sticker: "Наклейки и этикетки",
  pos: "POS-материалы",
  document: "Документы и фирменный стиль",
  packaging_bag: "Пакеты",
  packaging_box: "Коробки и упаковка",
  souvenir: "Сувенирная продукция",
  other: "Прочее",
};

export interface GlossaryItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: GlossaryCategory;
  base_product_type: ProductType | null;
  is_calculable: boolean;
  sort_order: number;
}

export function useProductGlossary() {
  const [items, setItems] = useState<GlossaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("product_glossary")
      .select("*")
      .order("sort_order");
    setItems(((data as any[]) || []) as GlossaryItem[]);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  return { items, loading, reload };
}

export function groupByCategory(items: GlossaryItem[]) {
  const map = new Map<GlossaryCategory, GlossaryItem[]>();
  for (const it of items) {
    const arr = map.get(it.category) || [];
    arr.push(it);
    map.set(it.category, arr);
  }
  return map;
}