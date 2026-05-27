import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Save, ChevronLeft, ChevronRight, AlertTriangle,
  Copy, Download, Upload, MoreHorizontal, Search, X, Link2, Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { HelpHint } from "@/components/HelpHint";
import { PRODUCT_LABELS } from "@/lib/calc/products";
import CalcRulesEditor from "@/components/references/CalcRulesEditor";
import CustomReferences from "@/components/references/CustomReferences";
import ProductGlossary from "@/components/references/ProductGlossary";
import CalcConstants from "@/components/references/CalcConstants";
import OperationCatalog from "@/components/references/OperationCatalog";
import { useAuth } from "@/hooks/useAuth";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { logDataIssue, noSessionIssue } from "@/lib/data-issue";
import { DataState } from "@/components/DataState";
import { Badge } from "@/components/ui/badge";

type AnyRow = Record<string, any>;

// Русские подписи для значений select-полей. Ключи — реальные значения, хранящиеся в БД.
const OPT_LABELS: Record<string, string> = {
  // materials.type
  coated: "Меловка",
  offset: "Офсетная",
  self_adhesive: "Самоклейка",
  cardboard: "Картон",
  other: "Другое",
  // operations.category
  prepress: "Допечать",
  print: "Печать",
  postpress: "Послепечать",
  logistics: "Логистика",
  // equipment.type
  cut: "Резка",
  fold: "Фальцовка",
  laminate: "Ламинация",
  die_cut: "Вырубка",
  stamp: "Тиснение",
  // lamination.film_type
  gloss: "Глянцевая",
  matte: "Матовая",
  velvet: "Софт-тач (вельвет)",
  gold: "Золото",
  silver: "Серебро",
  color: "Цветная",
  // lamination.size_range
  up_to_a4_plus: "до A4+",
  a4_plus_to_a3_plus: "A4+ — A3+",
  a3_plus_to_a2_plus: "A3+ — A2+",
  a2_plus_to_a1: "A2+ — A1",
  // press_machines.machine_type
  digital: "Цифровая",
  // booleans
  "true": "Да",
  "false": "Нет",
  // продукты — берём из общего справочника
  ...Object.fromEntries(Object.entries(PRODUCT_LABELS)),
};

const optLabel = (v: string) => OPT_LABELS[v] ?? v;

// Динамические опции (загружаются из БД) для select-полей со ссылками на другие таблицы
type DynamicOptions = {
  purchase_formats?: { value: string; label: string }[];
  press_machines?: { value: string; label: string }[];
};

const useDynamicOptions = (enabled: boolean): DynamicOptions => {
  const [opts, setOpts] = useState<DynamicOptions>({});
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const fetchOpts = async () => {
      await ensureSupabaseSession();
      if (cancelled) return;
      const [pfRes, pmRes] = await Promise.all([
        (supabase as any).from("purchase_formats").select("id,width,height").order("sort_order"),
        (supabase as any).from("press_machines").select("id,name").order("sort_order"),
      ]);
      if (cancelled) return;
      if (pfRes.error) console.error("[useDynamicOptions] purchase_formats:", pfRes.error);
      if (pmRes.error) console.error("[useDynamicOptions] press_machines:", pmRes.error);
      setOpts({
        purchase_formats: ((pfRes.data as any[]) || []).map((r) => ({
          value: r.id,
          label: `${r.width} × ${r.height}`,
        })),
        press_machines: ((pmRes.data as any[]) || []).map((r) => ({ value: r.id, label: r.name })),
      });
    };
    fetchOpts();
    // Перезагрузить опции, если сессия обновилась (логин/рефреш токена).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.access_token && !cancelled) fetchOpts();
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [enabled]);
  return opts;
};

const PRODUCT_TYPE_OPTS = [
  "leaflet","leaflet_diecut","booklet","sticker","sticker_diecut","bag","businesscard","envelope",
  "box","blank","selfcopy","folder","poster","notepad","book","magazine","brochure","label",
  "calendar_wall","calendar_desk","calendar_quarter","wobbler","shelftalker","kubus",
];

const TABLES = [
  {
    key: "materials",
    title: "Бумага",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "type", t: "select", label: "Тип", opts: ["coated", "offset", "self_adhesive", "cardboard", "other"] },
      { k: "density", t: "number", label: "Плотность" },
      { k: "purchase_format_id", t: "ref", label: "Закуп. формат", refKey: "purchase_formats" },
      { k: "format_width", t: "number", label: "Шир., мм" },
      { k: "format_height", t: "number", label: "Выс., мм" },
      { k: "cost_per_sheet", t: "number", label: "Цена/лист" },
    ],
    defaults: { name: "", type: "coated", density: 130, purchase_format_id: null, format_width: 640, format_height: 920, cost_per_sheet: 0 },
  },
  {
    key: "operations",
    title: "Типы работ",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "category", t: "select", label: "Категория", opts: ["prepress", "print", "postpress", "logistics"] },
      { k: "subgroup", t: "text", label: "Подгруппа" },
      { k: "fixed_cost", t: "number", label: "Приладка ₸" },
      { k: "variable_cost", t: "number", label: "Цена ₸/ед" },
      { k: "min_cost", t: "number", label: "Мин. ₸" },
      { k: "unit", t: "text", label: "Ед." },
      { k: "description", t: "text", label: "Комментарий" },
    ],
    defaults: { name: "", category: "postpress", subgroup: "", fixed_cost: 0, variable_cost: 0, min_cost: 0, unit: "шт", description: "" },
  },
  {
    key: "equipment",
    title: "Оборудование",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "type", t: "select", label: "Тип", opts: ["print", "cut", "fold", "laminate", "die_cut", "stamp", "other"] },
      { k: "max_format_width", t: "number", label: "Макс. шир." },
      { k: "max_format_height", t: "number", label: "Макс. выс." },
      { k: "cost_per_impression", t: "number", label: "₸/оттиск" },
      { k: "notes", t: "text", label: "Примечание" },
    ],
    defaults: { name: "", type: "print", max_format_width: 520, max_format_height: 360, cost_per_impression: 3, notes: "" },
  },
  {
    key: "lamination_prices",
    title: "Ламинация",
    cols: [
      { k: "film_type", t: "select", label: "Плёнка", opts: ["gloss", "matte", "velvet", "gold", "silver", "color"] },
      { k: "size_range", t: "select", label: "Размер", opts: ["up_to_a4_plus", "a4_plus_to_a3_plus", "a3_plus_to_a2_plus", "a2_plus_to_a1"] },
      { k: "cost_per_side", t: "number", label: "₸/сторону" },
    ],
    defaults: { film_type: "gloss", size_range: "up_to_a4_plus", cost_per_side: 17 },
  },
  {
    key: "film_prices",
    title: "Плёнки для припресса",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "film_type", t: "select", label: "Тип", opts: ["gloss", "matte", "velvet", "soft_touch", "gold", "silver", "color"] },
      { k: "price_per_m2", t: "number", label: "₸/м²" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "", film_type: "gloss", price_per_m2: 100, setup_cost: 3000, min_cost: 0, sort_order: 100 },
  },
  {
    key: "pouch_lamination_prices",
    title: "Пакетная ламинация",
    cols: [
      { k: "name", t: "text", label: "Формат" },
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "film_type", t: "select", label: "Тип плёнки", opts: ["gloss", "matte", "velvet", "soft_touch", "gold", "silver", "color"] },
      { k: "film_thickness", t: "number", label: "Толщина, мкм" },
      { k: "price_per_item", t: "number", label: "₸/изделие" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "", width: 154, height: 216, film_type: "gloss", film_thickness: 75, price_per_item: 25, min_cost: 3000, sort_order: 100 },
  },
  {
    key: "variable_print_prices",
    title: "Переменная печать",
    cols: [
      { k: "kind", t: "select", label: "Тип", opts: ["numbering", "barcode", "qrcode", "personalization", "data_import"] },
      { k: "name", t: "text", label: "Название" },
      { k: "price_per_apply", t: "number", label: "₸/нанесение" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "complexity", t: "number", label: "Коэф. сложности" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { kind: "numbering", name: "Нумерация", price_per_apply: 0.5, setup_cost: 1000, min_cost: 0, complexity: 1, is_active: true, sort_order: 100 },
  },
  {
    key: "wire_spring_prices",
    title: "Металлическая пружина (Wire-O)",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "spring_type", t: "select", label: "Тип", opts: ["wire_o_3_1", "wire_o_2_1"] },
      { k: "color", t: "select", label: "Цвет", opts: ["silver", "white", "black", "gold", "bronze", "color"] },
      { k: "diameter_mm", t: "number", label: "Диаметр, мм" },
      { k: "pitch_mm", t: "number", label: "Шаг, мм" },
      { k: "min_block_thickness", t: "number", label: "Толщина блока от, мм" },
      { k: "max_block_thickness", t: "number", label: "Толщина блока до, мм" },
      { k: "price_per_loop", t: "number", label: "₸/виток" },
      { k: "work_price_per_item", t: "number", label: "₸/работа за изделие" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Wire-O 3:1 ⌀8 мм", spring_type: "wire_o_3_1", color: "silver", diameter_mm: 8, pitch_mm: 8, min_block_thickness: 4, max_block_thickness: 6, price_per_loop: 1.4, work_price_per_item: 20, setup_cost: 3000, min_cost: 0, is_active: true, sort_order: 100 },
  },
  {
    key: "paper_thickness",
    title: "Толщина бумаги по плотности",
    cols: [
      { k: "density", t: "number", label: "Плотность, г/м²" },
      { k: "thickness_mm", t: "number", label: "Толщина листа, мм" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { density: 80, thickness_mm: 0.10, sort_order: 100 },
  },
  {
    key: "thermal_binding_prices",
    title: "Термобиндер (КБС)",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "glue_type", t: "select", label: "Тип клея", opts: ["eva", "pur"] },
      { k: "price_per_mm", t: "number", label: "₸ клея за 1 мм" },
      { k: "work_price_per_item", t: "number", label: "₸/работа за изделие" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "min_block_thickness", t: "number", label: "Толщина блока от, мм" },
      { k: "max_block_thickness", t: "number", label: "Толщина блока до, мм" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "EVA — стандарт", glue_type: "eva", price_per_mm: 1.5, work_price_per_item: 35, setup_cost: 3000, min_cost: 0, min_block_thickness: 2, max_block_thickness: 50, is_active: true, sort_order: 100 },
  },
  {
    key: "signature_folding_prices",
    title: "Фальцовка тетрадей",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "fold_type", t: "select", label: "Тип фальцовки", opts: ["parallel", "perpendicular", "combined", "window", "accordion", "engineering"] },
      { k: "machine_type", t: "select", label: "Оборудование", opts: ["machine", "manual"] },
      { k: "price_per_fold", t: "number", label: "₸/сгиб" },
      { k: "price_per_signature", t: "number", label: "₸/тетрадь" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_density_light", t: "number", label: "Коэф. ≤130 г/м²" },
      { k: "coef_density_medium", t: "number", label: "Коэф. 130–200 г/м²" },
      { k: "coef_density_heavy", t: "number", label: "Коэф. >200 г/м²" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "min_density", t: "number", label: "Плотность от, г/м²" },
      { k: "max_density", t: "number", label: "Плотность до, г/м²" },
      { k: "min_format_short", t: "number", label: "Короткая сторона от, мм" },
      { k: "max_format_long", t: "number", label: "Длинная сторона до, мм" },
      { k: "max_folds", t: "number", label: "Макс. сгибов" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Машинная — параллельная", fold_type: "parallel", machine_type: "machine", price_per_fold: 0.5, price_per_signature: 0, setup_cost: 3000, min_cost: 0, coef_density_light: 1, coef_density_medium: 1.2, coef_density_heavy: 1.5, coef_manual: 2, coef_nonstandard_format: 1.3, min_density: 0, max_density: 350, min_format_short: 0, max_format_long: 1200, max_folds: 4, is_active: true, sort_order: 100 },
  },
  {
    key: "signature_collation_prices",
    title: "Подборка тетрадей",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "collation_type", t: "select", label: "Тип подборки", opts: ["manual", "machine", "machine_inserts"] },
      { k: "price_per_signature", t: "number", label: "₸/тетрадь" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_standard_format", t: "number", label: "Коэф. станд. формата" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной" },
      { k: "coef_machine", t: "number", label: "Коэф. машинной" },
      { k: "coef_complex_sequence", t: "number", label: "Коэф. сложной последовательности" },
      { k: "coef_inserts", t: "number", label: "Коэф. вкладок/вставок" },
      { k: "coef_thin_paper", t: "number", label: "Коэф. тонкой бумаги" },
      { k: "coef_many_signatures", t: "number", label: "Коэф. большого кол-ва тетрадей" },
      { k: "min_format_short", t: "number", label: "Короткая сторона от, мм" },
      { k: "max_format_long", t: "number", label: "Длинная сторона до, мм" },
      { k: "min_density", t: "number", label: "Плотность от, г/м²" },
      { k: "max_density", t: "number", label: "Плотность до, г/м²" },
      { k: "min_circulation", t: "number", label: "Тираж от" },
      { k: "max_circulation", t: "number", label: "Тираж до" },
      { k: "max_signatures", t: "number", label: "Макс. тетрадей" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Машинная подборка", collation_type: "machine", price_per_signature: 0.8, setup_cost: 2000, min_cost: 5000, coef_standard_format: 1, coef_nonstandard_format: 1.2, coef_manual: 1.5, coef_machine: 1, coef_complex_sequence: 1.3, coef_inserts: 1.4, coef_thin_paper: 1.1, coef_many_signatures: 1.2, min_format_short: 0, max_format_long: 1200, min_density: 0, max_density: 350, min_circulation: 0, max_circulation: 1000000, max_signatures: 32, is_active: true, sort_order: 100 },
  },
  {
    key: "block_sewing_prices",
    title: "Шитьё блока",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "sewing_type", t: "select", label: "Тип шитья", opts: ["thread", "manual", "thread_glue", "combined", "stab", "thread_gauze", "thread_no_gauze"] },
      { k: "machine_type", t: "select", label: "Оборудование", opts: ["auto", "semi_auto", "manual"] },
      { k: "price_per_signature", t: "number", label: "₸/тетрадь (шитьё)" },
      { k: "thread_calc_mode", t: "select", label: "Расчёт ниток", opts: ["per_item", "per_signature"] },
      { k: "thread_price", t: "number", label: "₸ ниток" },
      { k: "gauze_price", t: "number", label: "₸/изд марля" },
      { k: "headband_price", t: "number", label: "₸/изд каптал" },
      { k: "endpaper_price", t: "number", label: "₸/изд форзацы" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_standard_format", t: "number", label: "Коэф. станд. формата" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_thick_block", t: "number", label: "Коэф. толстого блока" },
      { k: "coef_manual", t: "number", label: "Коэф. ручного шитья" },
      { k: "coef_thin_paper", t: "number", label: "Коэф. тонкой бумаги" },
      { k: "coef_heavy_paper", t: "number", label: "Коэф. плотной бумаги" },
      { k: "coef_many_signatures", t: "number", label: "Коэф. большого кол-ва тетрадей" },
      { k: "thick_block_threshold", t: "number", label: "Порог толстого блока, мм" },
      { k: "min_format_short", t: "number", label: "Короткая сторона от, мм" },
      { k: "max_format_long", t: "number", label: "Длинная сторона до, мм" },
      { k: "min_block_thickness", t: "number", label: "Толщина блока от, мм" },
      { k: "max_block_thickness", t: "number", label: "Толщина блока до, мм" },
      { k: "min_density", t: "number", label: "Плотность от, г/м²" },
      { k: "max_density", t: "number", label: "Плотность до, г/м²" },
      { k: "min_circulation", t: "number", label: "Тираж от" },
      { k: "max_circulation", t: "number", label: "Тираж до" },
      { k: "max_signatures", t: "number", label: "Макс. тетрадей" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Автомат — ниткошвейка", sewing_type: "thread", machine_type: "auto", price_per_signature: 2, thread_calc_mode: "per_item", thread_price: 5, gauze_price: 3, headband_price: 4, endpaper_price: 6, setup_cost: 5000, min_cost: 8000, coef_standard_format: 1, coef_nonstandard_format: 1.2, coef_thick_block: 1.3, coef_manual: 2, coef_thin_paper: 1.1, coef_heavy_paper: 1.2, coef_many_signatures: 1.2, thick_block_threshold: 25, min_format_short: 0, max_format_long: 1200, min_block_thickness: 0, max_block_thickness: 60, min_density: 0, max_density: 350, min_circulation: 0, max_circulation: 1000000, max_signatures: 64, is_active: true, sort_order: 100 },
  },
  {
    key: "endpaper_prices",
    title: "Форзацы",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "endpaper_type", t: "select", label: "Тип форзаца", opts: ["standard", "designer", "printed", "custom"] },
      { k: "paper_name", t: "text", label: "Бумага" },
      { k: "paper_density", t: "number", label: "Плотность, г/м²" },
      { k: "paper_calc_mode", t: "select", label: "Расчёт бумаги", opts: ["per_m2", "per_sheet"] },
      { k: "paper_price_per_m2", t: "number", label: "Цена за м², ₸" },
      { k: "paper_price_per_sheet", t: "number", label: "Цена за лист, ₸" },
      { k: "sheet_width", t: "number", label: "Лист — ширина, мм" },
      { k: "sheet_height", t: "number", label: "Лист — высота, мм" },
      { k: "endpapers_per_item", t: "number", label: "Форзацев на изделие" },
      { k: "needs_print", t: "select", label: "Печатный форзац", opts: ["true", "false"] },
      { k: "print_price_per_sheet", t: "number", label: "Цена печати, ₸/шт" },
      { k: "fold_price", t: "number", label: "Фальцовка, ₸/шт" },
      { k: "crease_price", t: "number", label: "Биговка, ₸/шт" },
      { k: "density_threshold", t: "number", label: "Порог биговки, г/м²" },
      { k: "glue_price_per_item", t: "number", label: "Приклейка, ₸/шт" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_standard", t: "number", label: "Коэф. стандарт" },
      { k: "coef_printed", t: "number", label: "Коэф. печатного" },
      { k: "coef_heavy_paper", t: "number", label: "Коэф. плотной бумаги" },
      { k: "coef_designer_paper", t: "number", label: "Коэф. дизайнерской бумаги" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_manual_glue", t: "number", label: "Коэф. ручной приклейки" },
      { k: "heavy_paper_threshold", t: "number", label: "Порог плотной бумаги, г/м²" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Стандартный форзац (офсет 120г)", endpaper_type: "standard", paper_name: "Офсет", paper_density: 120, paper_calc_mode: "per_m2", paper_price_per_m2: 200, paper_price_per_sheet: 0, sheet_width: 700, sheet_height: 1000, endpapers_per_item: 2, needs_print: false, print_price_per_sheet: 0, fold_price: 2, crease_price: 3, density_threshold: 150, glue_price_per_item: 8, setup_cost: 1500, min_cost: 0, coef_standard: 1, coef_printed: 1.2, coef_heavy_paper: 1.2, coef_designer_paper: 1.3, coef_nonstandard_format: 1.3, coef_manual_glue: 1.5, heavy_paper_threshold: 170, is_active: true, sort_order: 100 },
  },
  {
    key: "gauze_prices",
    title: "Марля",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "gauze_type", t: "select", label: "Тип марли", opts: ["standard", "reinforced", "designer"] },
      { k: "density", t: "number", label: "Плотность, г/м²" },
      { k: "calc_mode", t: "select", label: "Тип расчёта", opts: ["per_m2", "per_meter", "per_item"] },
      { k: "price_per_m2", t: "number", label: "Цена за м², ₸" },
      { k: "price_per_meter", t: "number", label: "Цена за метр, ₸" },
      { k: "price_per_item", t: "number", label: "Цена за изделие, ₸" },
      { k: "glue_price_per_item", t: "number", label: "Приклейка, ₸/шт" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "height_allowance", t: "number", label: "Тех. запас по высоте, мм" },
      { k: "side_overlap", t: "number", label: "Заходы на сторону, мм" },
      { k: "min_format_short", t: "number", label: "Мин. формат (короткая), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длинная), мм" },
      { k: "min_block_thickness", t: "number", label: "Мин. толщина блока, мм" },
      { k: "max_block_thickness", t: "number", label: "Макс. толщина блока, мм" },
      { k: "thick_block_threshold", t: "number", label: "Порог толстого блока, мм" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "coef_standard_format", t: "number", label: "Коэф. стандарт. формата" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_thick_block", t: "number", label: "Коэф. толстого блока" },
      { k: "coef_heavy_block", t: "number", label: "Коэф. тяжёлого блока" },
      { k: "coef_manual_glue", t: "number", label: "Коэф. ручной приклейки" },
      { k: "coef_designer", t: "number", label: "Коэф. дизайнерской" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Марля стандартная (по площади)", gauze_type: "standard", density: 60, calc_mode: "per_m2", price_per_m2: 400, price_per_meter: 0, price_per_item: 0, glue_price_per_item: 8, setup_cost: 2000, min_cost: 1500, height_allowance: 20, side_overlap: 25, min_format_short: 0, max_format_long: 1200, min_block_thickness: 0, max_block_thickness: 80, thick_block_threshold: 25, min_circulation: 0, max_circulation: 1000000, coef_standard_format: 1, coef_nonstandard_format: 1.3, coef_thick_block: 1.2, coef_heavy_block: 1.3, coef_manual_glue: 1.5, coef_designer: 1.2, is_active: true, sort_order: 100 },
  },
  {
    key: "headband_prices",
    title: "Каптал",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "headband_type", t: "select", label: "Тип каптала", opts: ["standard", "colored", "premium"] },
      { k: "color", t: "text", label: "Цвет" },
      { k: "price_per_meter", t: "number", label: "Цена за метр, ₸" },
      { k: "install_price_per_piece", t: "number", label: "Установка, ₸/шт" },
      { k: "tech_allowance_mm", t: "number", label: "Тех. запас, мм" },
      { k: "headbands_per_item", t: "number", label: "Капталов на изделие" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_standard", t: "number", label: "Коэф. стандарт." },
      { k: "coef_nonstandard_color", t: "number", label: "Коэф. нестанд. цвета" },
      { k: "coef_thick_block", t: "number", label: "Коэф. толстого блока" },
      { k: "coef_manual_install", t: "number", label: "Коэф. ручной установки" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_small_circulation", t: "number", label: "Коэф. малого тиража" },
      { k: "thick_block_threshold", t: "number", label: "Порог толстого блока, мм" },
      { k: "small_circulation_threshold", t: "number", label: "Порог малого тиража" },
      { k: "min_format_short", t: "number", label: "Мин. формат (короткая), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длинная), мм" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Стандартный белый каптал", headband_type: "standard", color: "white", price_per_meter: 80, install_price_per_piece: 5, tech_allowance_mm: 10, headbands_per_item: 2, setup_cost: 1000, min_cost: 500, coef_standard: 1, coef_nonstandard_color: 1.1, coef_thick_block: 1.2, coef_manual_install: 1.5, coef_nonstandard_format: 1.2, coef_small_circulation: 1.2, thick_block_threshold: 25, small_circulation_threshold: 100, min_format_short: 0, max_format_long: 1200, is_active: true, sort_order: 100 },
  },
  {
    key: "block_pressing_prices",
    title: "Прессовка блока",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "pressing_type", t: "select", label: "Тип прессовки", opts: ["block", "final", "sewing", "endpaper"] },
      { k: "machine_type", t: "select", label: "Оборудование", opts: ["manual", "mechanical", "hydraulic", "auto"] },
      { k: "calc_mode", t: "select", label: "Режим расчёта", opts: ["per_item", "per_time"] },
      { k: "price_per_item", t: "number", label: "Цена за изделие, ₸" },
      { k: "price_per_hour", t: "number", label: "Цена часа, ₸" },
      { k: "time_per_item_sec", t: "number", label: "Время прессовки, сек/изд" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_thickness_thin", t: "number", label: "Коэф. толщ. (тонк.)" },
      { k: "coef_thickness_med", t: "number", label: "Коэф. толщ. (сред.)" },
      { k: "coef_thickness_thick", t: "number", label: "Коэф. толщ. (толст.)" },
      { k: "coef_thickness_extra", t: "number", label: "Коэф. толщ. (>макс)" },
      { k: "thickness_thin_max", t: "number", label: "Порог тонкого блока, мм" },
      { k: "thickness_med_max", t: "number", label: "Порог среднего блока, мм" },
      { k: "thickness_thick_max", t: "number", label: "Порог толстого блока, мм" },
      { k: "coef_format_a5", t: "number", label: "Коэф. формата A5" },
      { k: "coef_format_a4", t: "number", label: "Коэф. формата A4" },
      { k: "coef_format_a3", t: "number", label: "Коэф. формата A3" },
      { k: "coef_format_nonstandard", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_thick_block", t: "number", label: "Коэф. толстого блока" },
      { k: "coef_heavy_block", t: "number", label: "Коэф. тяжёлого блока" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной прессовки" },
      { k: "coef_designer_paper", t: "number", label: "Коэф. дизайн. бумаги" },
      { k: "coef_small_circulation", t: "number", label: "Коэф. малого тиража" },
      { k: "thick_block_threshold", t: "number", label: "Порог толст. блока (доп.), мм" },
      { k: "heavy_block_threshold", t: "number", label: "Порог тяж. блока, г" },
      { k: "small_circulation_threshold", t: "number", label: "Порог малого тиража" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "min_block_thickness", t: "number", label: "Мин. толщ. блока, мм" },
      { k: "max_block_thickness", t: "number", label: "Макс. толщ. блока, мм" },
      { k: "max_block_weight", t: "number", label: "Макс. вес блока, г" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Гидравлический пресс — блок", pressing_type: "block", machine_type: "hydraulic", calc_mode: "per_item", price_per_item: 15, price_per_hour: 5000, time_per_item_sec: 6, setup_cost: 3000, min_cost: 1500, coef_thickness_thin: 1, coef_thickness_med: 1.1, coef_thickness_thick: 1.3, coef_thickness_extra: 1.5, thickness_thin_max: 10, thickness_med_max: 20, thickness_thick_max: 40, coef_format_a5: 1, coef_format_a4: 1.2, coef_format_a3: 1.5, coef_format_nonstandard: 1.4, coef_thick_block: 1.2, coef_heavy_block: 1.2, coef_manual: 1.5, coef_designer_paper: 1.2, coef_small_circulation: 1.2, thick_block_threshold: 25, heavy_block_threshold: 1500, small_circulation_threshold: 100, min_format_short: 0, max_format_long: 1200, min_block_thickness: 0, max_block_thickness: 80, max_block_weight: 5000, min_circulation: 0, max_circulation: 1000000, is_active: true, sort_order: 100 },
  },
  {
    key: "block_trimming_prices",
    title: "Обрезка блока",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "trim_type", t: "select", label: "Тип обрезки", opts: ["three_sided", "one_sided", "two_sided", "figured", "manual", "auto"] },
      { k: "machine_type", t: "select", label: "Оборудование", opts: ["guillotine", "three_knife", "auto_line", "manual"] },
      { k: "calc_mode", t: "select", label: "Режим расчёта", opts: ["per_cut", "per_item", "per_time"] },
      { k: "cuts_count", t: "number", label: "Кол-во резов (по умолч.)" },
      { k: "price_per_cut", t: "number", label: "Цена реза, ₸" },
      { k: "price_per_item", t: "number", label: "Цена за изделие, ₸" },
      { k: "price_per_hour", t: "number", label: "Цена часа, ₸" },
      { k: "time_per_item_sec", t: "number", label: "Время, сек/изд" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_thickness_thin", t: "number", label: "Коэф. толщ. (тонк.)" },
      { k: "coef_thickness_med", t: "number", label: "Коэф. толщ. (сред.)" },
      { k: "coef_thickness_thick", t: "number", label: "Коэф. толщ. (толст.)" },
      { k: "coef_thickness_extra", t: "number", label: "Коэф. толщ. (>макс)" },
      { k: "thickness_thin_max", t: "number", label: "Порог тонкого блока, мм" },
      { k: "thickness_med_max", t: "number", label: "Порог среднего блока, мм" },
      { k: "thickness_thick_max", t: "number", label: "Порог толстого блока, мм" },
      { k: "coef_format_a5", t: "number", label: "Коэф. формата A5" },
      { k: "coef_format_a4", t: "number", label: "Коэф. формата A4" },
      { k: "coef_format_a3", t: "number", label: "Коэф. формата A3" },
      { k: "coef_format_nonstandard", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_figured", t: "number", label: "Коэф. фигурной" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной" },
      { k: "coef_heavy_paper", t: "number", label: "Коэф. плотной бумаги" },
      { k: "coef_thick_block", t: "number", label: "Коэф. толст. блока" },
      { k: "coef_designer_paper", t: "number", label: "Коэф. дизайн. бумаги" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата (доп.)" },
      { k: "thick_block_threshold", t: "number", label: "Порог толст. блока, мм" },
      { k: "heavy_paper_threshold", t: "number", label: "Порог плотной бумаги, г/м²" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "min_block_thickness", t: "number", label: "Мин. толщ. блока, мм" },
      { k: "max_block_thickness", t: "number", label: "Макс. толщ. блока, мм" },
      { k: "max_paper_density", t: "number", label: "Макс. плотность бумаги, г/м²" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Трёхножевой резак — стандарт", trim_type: "three_sided", machine_type: "three_knife", calc_mode: "per_cut", cuts_count: 3, price_per_cut: 4, price_per_item: 0, price_per_hour: 5000, time_per_item_sec: 0, setup_cost: 2000, min_cost: 1000, coef_thickness_thin: 1, coef_thickness_med: 1.1, coef_thickness_thick: 1.3, coef_thickness_extra: 1.5, thickness_thin_max: 10, thickness_med_max: 20, thickness_thick_max: 40, coef_format_a5: 1, coef_format_a4: 1.2, coef_format_a3: 1.5, coef_format_nonstandard: 1.4, coef_figured: 1.5, coef_manual: 1.5, coef_heavy_paper: 1.2, coef_thick_block: 1.3, coef_designer_paper: 1.2, coef_nonstandard_format: 1.3, thick_block_threshold: 25, heavy_paper_threshold: 170, min_format_short: 0, max_format_long: 1200, min_block_thickness: 0, max_block_thickness: 80, max_paper_density: 350, min_circulation: 0, max_circulation: 1000000, is_active: true, sort_order: 100 },
  },
  {
    key: "binding_cardboard_prices",
    title: "Переплётный картон",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "board_type", t: "select", label: "Тип картона", opts: ["chipboard", "grey", "designer"] },
      { k: "board_thickness", t: "number", label: "Толщина картона, мм" },
      { k: "calc_mode", t: "select", label: "Режим расчёта", opts: ["per_m2", "per_sheet", "per_cover"] },
      { k: "price_per_m2", t: "number", label: "Цена, ₸/м²" },
      { k: "price_per_sheet", t: "number", label: "Цена закуп. листа, ₸" },
      { k: "price_per_cover", t: "number", label: "Цена за крышку, ₸" },
      { k: "sheet_width", t: "number", label: "Ширина листа, мм" },
      { k: "sheet_height", t: "number", label: "Высота листа, мм" },
      { k: "width_allowance", t: "number", label: "Запас по ширине, мм" },
      { k: "height_allowance", t: "number", label: "Запас по высоте, мм" },
      { k: "spine_allowance", t: "number", label: "Запас отстава, мм" },
      { k: "sides_per_item", t: "number", label: "Сторонок на крышку" },
      { k: "spines_per_item", t: "number", label: "Отставов на крышку" },
      { k: "gap_between", t: "number", label: "Зазор между деталями, мм" },
      { k: "edge_margin", t: "number", label: "Поле листа, мм" },
      { k: "cuts_per_sheet", t: "number", label: "Резов на лист" },
      { k: "price_per_cut", t: "number", label: "Цена реза, ₸" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_standard_format", t: "number", label: "Коэф. стандарт. формата" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_thick_board", t: "number", label: "Коэф. толст. картона" },
      { k: "coef_manual_cut", t: "number", label: "Коэф. ручной резки" },
      { k: "coef_complex_layout", t: "number", label: "Коэф. сложн. раскладки" },
      { k: "coef_designer_board", t: "number", label: "Коэф. дизайн. картона" },
      { k: "thick_board_threshold", t: "number", label: "Порог толст. картона, мм" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Картон переплётный 2.0 мм", board_type: "chipboard", board_thickness: 2.0, calc_mode: "per_m2", price_per_m2: 1500, price_per_sheet: 1200, price_per_cover: 0, sheet_width: 700, sheet_height: 1000, width_allowance: 4, height_allowance: 6, spine_allowance: 2, sides_per_item: 2, spines_per_item: 1, gap_between: 3, edge_margin: 10, cuts_per_sheet: 10, price_per_cut: 2, setup_cost: 3000, min_cost: 1500, coef_standard_format: 1, coef_nonstandard_format: 1.2, coef_thick_board: 1.2, coef_manual_cut: 1.5, coef_complex_layout: 1.2, coef_designer_board: 1.3, thick_board_threshold: 2.5, min_format_short: 0, max_format_long: 1200, is_active: true, sort_order: 100 },
  },
  {
    key: "board_cutting_prices",
    title: "Резка переплётного картона",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "cutting_type", t: "select", label: "Тип резки", opts: ["guillotine", "manual", "auto", "package", "figured"] },
      { k: "machine_type", t: "select", label: "Оборудование", opts: ["manual_guillotine", "electric_guillotine", "auto_line", "industrial"] },
      { k: "price_per_cut", t: "number", label: "Цена реза, ₸" },
      { k: "default_cuts", t: "number", label: "Резов по умолчанию" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_thickness_thin", t: "number", label: "Коэф. толщ. тонк." },
      { k: "coef_thickness_med", t: "number", label: "Коэф. толщ. сред." },
      { k: "coef_thickness_thick", t: "number", label: "Коэф. толщ. толст." },
      { k: "coef_thickness_extra", t: "number", label: "Коэф. толщ. экстра" },
      { k: "thickness_thin_max", t: "number", label: "Тонкий до, мм" },
      { k: "thickness_med_max", t: "number", label: "Средний до, мм" },
      { k: "thickness_thick_max", t: "number", label: "Толстый до, мм" },
      { k: "coef_figured", t: "number", label: "Коэф. фигур. резки" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной резки" },
      { k: "coef_thick_board", t: "number", label: "Коэф. толст. картона" },
      { k: "coef_complex_layout", t: "number", label: "Коэф. сложн. раскладки" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_standard_format", t: "number", label: "Коэф. станд. формата" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "min_board_thickness", t: "number", label: "Мин. толщ. картона, мм" },
      { k: "max_board_thickness", t: "number", label: "Макс. толщ. картона, мм" },
      { k: "max_stack_height", t: "number", label: "Макс. высота стопы, мм" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Гильотина электрическая — стандарт", cutting_type: "guillotine", machine_type: "electric_guillotine", price_per_cut: 2, default_cuts: 12, setup_cost: 3000, min_cost: 1500, coef_thickness_thin: 1, coef_thickness_med: 1.1, coef_thickness_thick: 1.3, coef_thickness_extra: 1.5, thickness_thin_max: 1.5, thickness_med_max: 2.0, thickness_thick_max: 3.0, coef_figured: 1.5, coef_manual: 1.5, coef_thick_board: 1.2, coef_complex_layout: 1.2, coef_nonstandard_format: 1.3, coef_standard_format: 1, min_format_short: 0, max_format_long: 1200, min_board_thickness: 0, max_board_thickness: 5, max_stack_height: 100, min_circulation: 0, max_circulation: 1000000, is_active: true, sort_order: 100 },
  },
  {
    key: "casing_prices",
    title: "Кашировка",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "casing_method", t: "select", label: "Способ", opts: ["manual", "semi_auto", "auto"] },
      { k: "cover_material_type", t: "select", label: "Покровный материал", opts: ["paper", "designer_paper", "fabric", "leatherette", "printed"] },
      { k: "base_type", t: "select", label: "Основа", opts: ["chipboard", "grey", "designer"] },
      { k: "material_calc_mode", t: "select", label: "Расчёт материала", opts: ["per_m2", "per_sheet"] },
      { k: "material_price_per_m2", t: "number", label: "Материал, ₸/м²" },
      { k: "material_price_per_sheet", t: "number", label: "Материал, ₸/лист" },
      { k: "sheet_width", t: "number", label: "Лист, шир., мм" },
      { k: "sheet_height", t: "number", label: "Лист, выс., мм" },
      { k: "glue_calc_mode", t: "select", label: "Расчёт клея", opts: ["per_m2", "per_item"] },
      { k: "glue_price_per_m2", t: "number", label: "Клей, ₸/м²" },
      { k: "glue_price_per_item", t: "number", label: "Клей, ₸/шт" },
      { k: "work_calc_mode", t: "select", label: "Расчёт работы", opts: ["per_m2", "per_item"] },
      { k: "work_price_per_m2", t: "number", label: "Работа, ₸/м²" },
      { k: "work_price_per_item", t: "number", label: "Работа, ₸/шт" },
      { k: "fold_left", t: "number", label: "Загиб слева, мм" },
      { k: "fold_right", t: "number", label: "Загиб справа, мм" },
      { k: "fold_top", t: "number", label: "Загиб сверху, мм" },
      { k: "fold_bottom", t: "number", label: "Загиб снизу, мм" },
      { k: "spine_gap", t: "number", label: "Расстав, мм" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_standard_format", t: "number", label: "Коэф. станд. формата" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной" },
      { k: "coef_fabric_leatherette", t: "number", label: "Коэф. ткани/кожзама" },
      { k: "coef_thick_board", t: "number", label: "Коэф. толст. картона" },
      { k: "coef_large_format", t: "number", label: "Коэф. большого формата" },
      { k: "coef_small_circulation", t: "number", label: "Коэф. малого тиража" },
      { k: "coef_designer_material", t: "number", label: "Коэф. дизайн. материала" },
      { k: "coef_printed_cover", t: "number", label: "Коэф. печатной обложки" },
      { k: "thick_board_threshold", t: "number", label: "Порог толст. картона, мм" },
      { k: "large_format_threshold", t: "number", label: "Порог большого формата, мм" },
      { k: "small_circulation_threshold", t: "number", label: "Порог малого тиража" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "max_board_thickness", t: "number", label: "Макс. толщ. картона, мм" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Кашировка бумагой (автомат)", casing_method: "auto", cover_material_type: "paper", base_type: "chipboard", material_calc_mode: "per_m2", material_price_per_m2: 300, material_price_per_sheet: 0, sheet_width: 700, sheet_height: 1000, glue_calc_mode: "per_m2", glue_price_per_m2: 50, glue_price_per_item: 0, work_calc_mode: "per_m2", work_price_per_m2: 200, work_price_per_item: 0, fold_left: 15, fold_right: 15, fold_top: 15, fold_bottom: 15, spine_gap: 7, setup_cost: 3000, min_cost: 1500, coef_standard_format: 1, coef_nonstandard_format: 1.2, coef_manual: 1.5, coef_fabric_leatherette: 1.4, coef_thick_board: 1.2, coef_large_format: 1.3, coef_small_circulation: 1.2, coef_designer_material: 1.2, coef_printed_cover: 1.1, thick_board_threshold: 2.5, large_format_threshold: 500, small_circulation_threshold: 100, min_format_short: 0, max_format_long: 1200, max_board_thickness: 5, min_circulation: 0, max_circulation: 1000000, is_active: true, sort_order: 100 },
  },
  {
    key: "cover_assembly_prices",
    title: "Сборка переплётной крышки",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "assembly_method", t: "select", label: "Способ сборки", opts: ["manual", "semi_auto", "auto"] },
      { k: "cover_material_type", t: "select", label: "Покровный материал", opts: ["paper", "designer_paper", "fabric", "leatherette", "printed"] },
      { k: "calc_mode", t: "select", label: "Тип расчёта", opts: ["per_m2", "per_item", "combined"] },
      { k: "price_per_m2", t: "number", label: "Цена сборки, ₸/м²" },
      { k: "price_per_item", t: "number", label: "Цена сборки, ₸/шт" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "gap_left", t: "number", label: "Расстав слева, мм" },
      { k: "gap_right", t: "number", label: "Расстав справа, мм" },
      { k: "fold_left", t: "number", label: "Загиб слева, мм" },
      { k: "fold_right", t: "number", label: "Загиб справа, мм" },
      { k: "fold_top", t: "number", label: "Загиб сверху, мм" },
      { k: "fold_bottom", t: "number", label: "Загиб снизу, мм" },
      { k: "coef_standard_format", t: "number", label: "Коэф. станд. формата" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной" },
      { k: "coef_fabric_leatherette", t: "number", label: "Коэф. ткани/кожзама" },
      { k: "coef_large_format", t: "number", label: "Коэф. большого формата" },
      { k: "coef_thick_board", t: "number", label: "Коэф. толст. картона" },
      { k: "coef_complex_material", t: "number", label: "Коэф. сложн. материала" },
      { k: "coef_small_circulation", t: "number", label: "Коэф. малого тиража" },
      { k: "large_format_threshold", t: "number", label: "Порог большого формата, мм" },
      { k: "thick_board_threshold", t: "number", label: "Порог толст. картона, мм" },
      { k: "small_circulation_threshold", t: "number", label: "Порог малого тиража" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "max_board_thickness", t: "number", label: "Макс. толщ. картона, мм" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Полуавтомат — бумага", assembly_method: "semi_auto", cover_material_type: "paper", calc_mode: "per_m2", price_per_m2: 250, price_per_item: 0, setup_cost: 3000, min_cost: 1500, gap_left: 7, gap_right: 7, fold_left: 15, fold_right: 15, fold_top: 15, fold_bottom: 15, coef_standard_format: 1, coef_nonstandard_format: 1.2, coef_manual: 1.5, coef_fabric_leatherette: 1.4, coef_large_format: 1.3, coef_thick_board: 1.2, coef_complex_material: 1.3, coef_small_circulation: 1.2, large_format_threshold: 500, thick_board_threshold: 2.5, small_circulation_threshold: 100, min_format_short: 0, max_format_long: 1200, max_board_thickness: 5, min_circulation: 0, max_circulation: 1000000, is_active: true, sort_order: 100 },
  },
  {
    key: "block_insertion_prices",
    title: "Вставка блока в крышку",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "insertion_method", t: "select", label: "Способ вставки", opts: ["manual", "semi_auto", "auto"] },
      { k: "cover_material_type", t: "select", label: "Покровный материал", opts: ["paper", "designer_paper", "fabric", "leatherette", "printed"] },
      { k: "endpaper_type", t: "select", label: "Тип форзаца", opts: ["standard", "designer", "printed", "fabric"] },
      { k: "price_per_item", t: "number", label: "Цена вставки, ₸/шт" },
      { k: "glue_calc_mode", t: "select", label: "Расчёт клея", opts: ["per_item", "per_m2"] },
      { k: "glue_price_per_item", t: "number", label: "Клей, ₸/шт" },
      { k: "glue_price_per_m2", t: "number", label: "Клей, ₸/м²" },
      { k: "endpapers_per_item", t: "number", label: "Форзацев на изделие" },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "min_cost", t: "number", label: "Мин. стоимость, ₸" },
      { k: "coef_format_a5", t: "number", label: "Коэф. A5/A6" },
      { k: "coef_format_a4", t: "number", label: "Коэф. A4" },
      { k: "coef_format_a3", t: "number", label: "Коэф. A3" },
      { k: "coef_format_nonstandard", t: "number", label: "Коэф. нестанд. формата" },
      { k: "thickness_thin_max", t: "number", label: "Тонкий блок до, мм" },
      { k: "thickness_med_max", t: "number", label: "Средний блок до, мм" },
      { k: "thickness_thick_max", t: "number", label: "Толстый блок до, мм" },
      { k: "coef_thickness_thin", t: "number", label: "Коэф. тонкого блока" },
      { k: "coef_thickness_med", t: "number", label: "Коэф. среднего блока" },
      { k: "coef_thickness_thick", t: "number", label: "Коэф. толст. блока" },
      { k: "coef_thickness_extra", t: "number", label: "Коэф. экстра-блока" },
      { k: "weight_light_max", t: "number", label: "Лёгкий блок до, г" },
      { k: "weight_med_max", t: "number", label: "Средний вес до, г" },
      { k: "weight_heavy_max", t: "number", label: "Тяжёлый вес до, г" },
      { k: "coef_weight_light", t: "number", label: "Коэф. лёгкого" },
      { k: "coef_weight_med", t: "number", label: "Коэф. среднего" },
      { k: "coef_weight_heavy", t: "number", label: "Коэф. тяжёлого" },
      { k: "coef_weight_extra", t: "number", label: "Коэф. экстра-веса" },
      { k: "coef_standard", t: "number", label: "Коэф. стандарт" },
      { k: "coef_manual", t: "number", label: "Коэф. ручной" },
      { k: "coef_fabric_leatherette", t: "number", label: "Коэф. ткани/кожзама" },
      { k: "coef_nonstandard_format", t: "number", label: "Коэф. нестанд. формата" },
      { k: "coef_thick_block", t: "number", label: "Коэф. толст. блока" },
      { k: "coef_complex_align", t: "number", label: "Коэф. сложн. совмещения" },
      { k: "coef_small_circulation", t: "number", label: "Коэф. малого тиража" },
      { k: "thick_block_threshold", t: "number", label: "Порог толст. блока, мм" },
      { k: "small_circulation_threshold", t: "number", label: "Порог малого тиража" },
      { k: "min_format_short", t: "number", label: "Мин. формат (коротк.), мм" },
      { k: "max_format_long", t: "number", label: "Макс. формат (длин.), мм" },
      { k: "max_block_thickness", t: "number", label: "Макс. толщ. блока, мм" },
      { k: "max_block_weight", t: "number", label: "Макс. вес блока, г" },
      { k: "min_circulation", t: "number", label: "Мин. тираж" },
      { k: "max_circulation", t: "number", label: "Макс. тираж" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "Полуавтомат — стандарт", insertion_method: "semi_auto", cover_material_type: "paper", endpaper_type: "standard", price_per_item: 25, glue_calc_mode: "per_item", glue_price_per_item: 5, glue_price_per_m2: 50, endpapers_per_item: 2, setup_cost: 3000, min_cost: 1500, coef_format_a5: 1, coef_format_a4: 1.2, coef_format_a3: 1.5, coef_format_nonstandard: 1.4, thickness_thin_max: 10, thickness_med_max: 20, thickness_thick_max: 40, coef_thickness_thin: 1, coef_thickness_med: 1.1, coef_thickness_thick: 1.3, coef_thickness_extra: 1.5, weight_light_max: 300, weight_med_max: 700, weight_heavy_max: 1200, coef_weight_light: 1, coef_weight_med: 1.1, coef_weight_heavy: 1.3, coef_weight_extra: 1.5, coef_standard: 1, coef_manual: 1.5, coef_fabric_leatherette: 1.3, coef_nonstandard_format: 1.3, coef_thick_block: 1.2, coef_complex_align: 1.4, coef_small_circulation: 1.2, thick_block_threshold: 25, small_circulation_threshold: 100, min_format_short: 0, max_format_long: 1200, max_block_thickness: 80, max_block_weight: 5000, min_circulation: 0, max_circulation: 1000000, is_active: true, sort_order: 100 },
  },
  {
    key: "system_settings",
    title: "Константы",
    cols: [
      { k: "key", t: "text", label: "Ключ" },
      { k: "value", t: "text", label: "Значение" },
      { k: "description", t: "text", label: "Описание" },
    ],
    defaults: { key: "", value: "", description: "" },
    pk: "key",
  },
  {
    key: "print_formats",
    title: "Печатные форматы",
    cols: [
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "purchase_format_id", t: "ref", label: "Закуп. формат", refKey: "purchase_formats" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { width: 520, height: 360, purchase_format_id: null, sort_order: 100 },
  },
  {
    key: "purchase_formats",
    title: "Закупочные форматы",
    cols: [
      { k: "material_category", t: "select", label: "Категория", opts: ["cardboard", "coated", "offset", "self_adhesive", "other"] },
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { material_category: "coated", width: 640, height: 920, sort_order: 100 },
  },
  {
    key: "press_machines",
    title: "Печатные машины",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "machine_type", t: "select", label: "Тип", opts: ["digital", "offset"] },
      { k: "max_format_width", t: "number", label: "Макс. шир." },
      { k: "max_format_height", t: "number", label: "Макс. выс." },
      { k: "cost_per_impression", t: "number", label: "₸/оттиск" },
      { k: "min_circulation", t: "number", label: "Тираж от" },
      { k: "max_circulation", t: "number", label: "Тираж до" },
      { k: "setup_sheets", t: "number", label: "Приладка, л." },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "product_types", t: "multiselect", label: "Типы продукции", opts: PRODUCT_TYPE_OPTS },
      { k: "priority", t: "number", label: "Приоритет" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "", machine_type: "offset", max_format_width: 520, max_format_height: 360, cost_per_impression: 3, min_circulation: 0, max_circulation: null, setup_sheets: 0, setup_cost: 0, product_types: null, priority: 100, is_active: true, sort_order: 100 },
  },
  {
    key: "product_circulation_rules",
    title: "Правила тиражей",
    cols: [
      { k: "product_type", t: "select", label: "Тип продукта", opts: PRODUCT_TYPE_OPTS },
      { k: "min_circulation", t: "number", label: "Тираж от" },
      { k: "max_circulation", t: "number", label: "Тираж до" },
      { k: "preferred_machine_id", t: "ref", label: "Машина", refKey: "press_machines" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { product_type: "leaflet", min_circulation: 0, max_circulation: null, preferred_machine_id: null, sort_order: 100 },
  },
  {
    key: "envelope_formats",
    title: "Конверты",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "", width: 110, height: 220, sort_order: 100 },
  },
  {
    key: "cut_count_rules",
    title: "Резы: печатный → конечный",
    cols: [
      { k: "print_format", t: "select", label: "Печатный лист", opts: ["A0", "A1", "A2", "A3", "A4", "A5"] },
      { k: "item_format", t: "select", label: "Конечный формат", opts: ["A1", "A2", "A3", "A4", "A5", "A6"] },
      { k: "cuts", t: "number", label: "Резов на 1 лист" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { print_format: "A1", item_format: "A3", cuts: 8, sort_order: 100 },
  },
] as const;

const References = () => {
  const { loading, user } = useAuth();
  const authReady = !loading && !!user;
  const dynOpts = useDynamicOptions(authReady);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle has-tabbar flex items-center justify-center text-sm text-muted-foreground">
        Восстанавливаем сессию…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">На главную</span>
          </Link>
          <div className="ml-auto text-sm font-medium truncate">Справочники (НСИ)</div>
        </div>
      </header>
      <main className="container mx-auto py-3 px-3 sm:px-4">
        <ReferencesNav dynOpts={dynOpts} authReady={authReady} />
      </main>
      <MobileTabBar />
    </div>
  );
};

/**
 * Описание раздела: что это, к каким таблицам относится для подсчёта строк,
 * с какими другими разделами связан (показываем чипами «связан с»).
 * countKey — реальная таблица в БД, по которой считаем количество строк;
 * для виртуальных разделов (__rules, __custom…) указываем null.
 */
type NavItem = {
  key: string;
  title: string;
  desc?: string;
  countKey?: string | null;
  relatedKeys?: string[];
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Материалы и форматы",
    items: [
      { key: "materials", title: "Бумага", desc: "Каталог бумаги: тип, плотность, формат и цена за лист.", countKey: "materials", relatedKeys: ["purchase_formats", "print_formats"] },
      { key: "purchase_formats", title: "Закупочные форматы", desc: "Форматы листа у поставщика. На них ссылается бумага и печатные форматы.", countKey: "purchase_formats", relatedKeys: ["materials", "print_formats"] },
      { key: "print_formats", title: "Печатные форматы", desc: "Рабочие форматы печати, вырезаемые из закупочного.", countKey: "print_formats", relatedKeys: ["purchase_formats", "press_machines"] },
      { key: "envelope_formats", title: "Конверты", desc: "Готовые конвертные форматы для расчёта.", countKey: "envelope_formats" },
    ],
  },
  {
    title: "Производство",
    items: [
      { key: "operations", title: "Типы работ", desc: "Справочник постпечатных и сопутствующих работ: цена, приладка, мин. стоимость. Изменения сразу подтягиваются в калькулятор.", countKey: "operations", relatedKeys: ["__op_catalog", "equipment"] },
      { key: "__op_catalog", title: "Виды работ (формулы)", desc: "Полный каталог операций с параметрами и формулами расчёта.", countKey: "operation_catalog", relatedKeys: ["operations"] },
      { key: "equipment", title: "Оборудование", desc: "Послепечатное оборудование и стоимость оттиска.", countKey: "equipment" },
      { key: "press_machines", title: "Печатные машины", desc: "Печатные машины, форматы, приладка, типы продукции.", countKey: "press_machines", relatedKeys: ["print_formats", "product_circulation_rules"] },
      { key: "lamination_prices", title: "Ламинация", desc: "Цены за сторону по плёнке и размеру.", countKey: "lamination_prices" },
      { key: "film_prices", title: "Плёнки для припресса", desc: "Каталог плёнок: цена за м², приладка, минимальная стоимость. Используется для авто-расчёта припресса.", countKey: "film_prices" },
      { key: "pouch_lamination_prices", title: "Пакетная ламинация", desc: "Форматы пакетов и цена за 1 изделие. Используется для авто-расчёта пакетной ламинации.", countKey: "pouch_lamination_prices" },
      { key: "variable_print_prices", title: "Переменная печать", desc: "Нумерация, штрихкоды, QR, персонализация: цена/нанесение, приладка, минимальная стоимость, коэф. сложности.", countKey: "variable_print_prices" },
      { key: "wire_spring_prices", title: "Металлическая пружина (Wire-O)", desc: "Диаметры, шаг, цена за виток, работа и приладка. Используется для авто-расчёта навивки.", countKey: "wire_spring_prices", relatedKeys: ["paper_thickness"] },
      { key: "paper_thickness", title: "Толщина бумаги", desc: "Толщина одного листа по плотности — нужна для авто-расчёта толщины блока при навивке.", countKey: "paper_thickness", relatedKeys: ["wire_spring_prices", "materials"] },
      { key: "thermal_binding_prices", title: "Термобиндер (КБС)", desc: "Тип клея (EVA/PUR), цена клея за 1 мм, работа, приладка и допустимая толщина блока. Используется для авто-расчёта клеевого бесшвейного скрепления.", countKey: "thermal_binding_prices", relatedKeys: ["paper_thickness"] },
      { key: "signature_folding_prices", title: "Фальцовка тетрадей", desc: "Тип фальцовки, тип оборудования (ручная/машинная), цена за сгиб и тетрадь, коэффициенты сложности и ограничения. Используется для авто-расчёта фальцовки многополосных изделий.", countKey: "signature_folding_prices" },
      { key: "signature_collation_prices", title: "Подборка тетрадей", desc: "Цена подборки одной тетради, коэффициенты сложности (формат, оборудование, последовательность, вкладки, тонкая бумага), ограничения. Используется для авто-расчёта операции подборки тетрадей.", countKey: "signature_collation_prices", relatedKeys: ["signature_folding_prices"] },
      { key: "block_sewing_prices", title: "Шитьё блока", desc: "Тип шитья и оборудования, цена шитья тетради, нитки (на изделие или тетрадь), марля/каптал/форзацы, коэффициенты сложности и ограничения. Используется для авто-расчёта операции шитья книжного блока.", countKey: "block_sewing_prices", relatedKeys: ["signature_folding_prices", "signature_collation_prices", "paper_thickness"] },
      { key: "endpaper_prices", title: "Форзацы", desc: "Бумага форзаца (по м² или по листам), плотность, печать, фальцовка/биговка по плотности, приклейка, коэффициенты сложности, приладка и минимальная стоимость. Используется для авто-расчёта операции «Форзацы».", countKey: "endpaper_prices", relatedKeys: ["block_sewing_prices"] },
      { key: "gauze_prices", title: "Марля", desc: "Тип марли и плотность, три режима расчёта (по м², по метру, за изделие), цена приклейки, технологический запас по высоте и заходы на корешок, коэффициенты сложности и ограничения. Используется для авто-расчёта операции «Марля».", countKey: "gauze_prices", relatedKeys: ["block_sewing_prices", "endpaper_prices", "paper_thickness"] },
      { key: "headband_prices", title: "Каптал", desc: "Тип и цвет каптала, цена за метр, цена установки, технологический запас, количество капталов на изделие, коэффициенты сложности и минимальная стоимость. Используется для авто-расчёта операции «Каптал».", countKey: "headband_prices", relatedKeys: ["block_sewing_prices", "gauze_prices", "endpaper_prices"] },
      { key: "block_pressing_prices", title: "Прессовка блока", desc: "Тип прессовки и оборудование, цена за изделие/час, время прессовки, коэффициенты по толщине, формату и сложности, ограничения по формату/толщине/весу блока, приладка и минимальная стоимость. Используется для авто-расчёта операции «Прессовка блока».", countKey: "block_pressing_prices", relatedKeys: ["block_sewing_prices", "gauze_prices", "headband_prices", "endpaper_prices", "paper_thickness"] },
      { key: "block_trimming_prices", title: "Обрезка блока", desc: "Тип обрезки (3/1/2 стороны, фигурная, ручная, авто) и оборудование (гильотина, трёхножевой резак, авто-линия, ручная), цена реза/изделия/часа, время, коэффициенты толщины/формата/сложности, ограничения по формату/толщине/плотности, приладка и минимальная стоимость. Используется для авто-расчёта операции «Обрезка блока».", countKey: "block_trimming_prices", relatedKeys: ["block_sewing_prices", "block_pressing_prices", "gauze_prices", "headband_prices", "paper_thickness"] },
      { key: "binding_cardboard_prices", title: "Переплётный картон", desc: "Тип и толщина переплётного картона, три режима расчёта (по м² / по листам / за крышку), формат закупочного листа, технологические запасы для сторонок и отстава, авто-раскладка с учётом зазоров и полей, цена реза, коэффициенты сложности и минимальная стоимость. Используется для авто-расчёта операции «Переплётный картон».", countKey: "binding_cardboard_prices", relatedKeys: ["block_sewing_prices", "block_pressing_prices", "endpaper_prices", "paper_thickness"] },
      { key: "board_cutting_prices", title: "Резка переплётного картона", desc: "Тип резки и оборудование (ручная/электр./авто/промышленная гильотина), цена реза, кол-во резов по умолчанию, коэффициенты по толщине картона и сложности (фигурная, ручная, толстый картон, сложная раскладка, нестандартный формат), ограничения по формату/толщине/стопе/тиражу, приладка и минимальная стоимость. Используется для авто-расчёта операции «Резка переплётного картона».", countKey: "board_cutting_prices", relatedKeys: ["binding_cardboard_prices"] },
      { key: "casing_prices", title: "Кашировка", desc: "Способ кашировки (ручная/полуавтомат/автомат), тип покровного материала (бумага/дизайн./ткань/кожзам/печатная обложка), режимы расчёта материала/клея/работы (по м² / за лист / за изделие), загибы и расставы, коэффициенты сложности (ручная, ткань/кожзам, толст. картон, большой формат, малый тираж, дизайн. материал, печатная обложка), ограничения по формату/толщине/тиражу, приладка и минимальная стоимость. Используется для авто-расчёта операции «Кашировка».", countKey: "casing_prices", relatedKeys: ["binding_cardboard_prices", "board_cutting_prices"] },
      { key: "cover_assembly_prices", title: "Сборка переплётной крышки", desc: "Способ сборки (ручная/полуавтомат/автомат), тип покровного материала, три режима расчёта (по м² / за изделие / комбинированный), расставы между сторонками и отставом, загибы покровного материала, коэффициенты сложности (нестанд. формат, ручная, ткань/кожзам, большой формат, толст. картон, сложн. материал, малый тираж), ограничения по формату/толщине/тиражу, приладка и минимальная стоимость. Размеры сторонок и отстава автоматически берутся из «Переплётного картона».", countKey: "cover_assembly_prices", relatedKeys: ["binding_cardboard_prices", "casing_prices", "board_cutting_prices"] },
    ],
  },
  {
    title: "Правила и настройки",
    items: [
      { key: "product_circulation_rules", title: "Правила тиражей", desc: "Какая машина обслуживает продукт в каком диапазоне тиражей.", countKey: "product_circulation_rules", relatedKeys: ["press_machines"] },
      { key: "__rules", title: "Правила расчёта", desc: "Конструктор правил для формул калькулятора.", countKey: null },
      { key: "cut_count_rules", title: "Резы: печатный → конечный", desc: "Сколько резов делает резак, чтобы из печатного листа получить конечный формат изделия (с подрезкой 2–3 мм).", countKey: "cut_count_rules" },
      { key: "system_settings", title: "Константы", desc: "Системные ключ-значение настройки.", countKey: "system_settings" },
      { key: "__calc_constants", title: "Константы формул", desc: "Числовые константы, используемые в формулах.", countKey: null },
    ],
  },
  {
    title: "Расширения",
    items: [
      { key: "__glossary", title: "Глоссарий продукции", desc: "Объяснения типов продукции для подсказок.", countKey: null },
      { key: "__custom", title: "Свои справочники", desc: "Пользовательские справочники для своих нужд.", countKey: null },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const NAV_BY_KEY: Record<string, NavItem> = Object.fromEntries(ALL_NAV_ITEMS.map((i) => [i.key, i]));

const ReferencesNav = ({ dynOpts, authReady }: { dynOpts: DynamicOptions; authReady: boolean }) => {
  const [active, setActive] = useState<string>("materials");
  const [navQuery, setNavQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Подсчёт строк в каждой реальной таблице — показываем рядом с пунктом.
  // Один проход на сессию: не блокирует UI, ошибки тихо игнорируем.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      const tables = Array.from(new Set(ALL_NAV_ITEMS.map((i) => i.countKey).filter(Boolean) as string[]));
      const results = await Promise.all(
        tables.map(async (t) => {
          try {
            const { count } = await (supabase as any).from(t).select("*", { count: "exact", head: true });
            return [t, count ?? 0] as const;
          } catch {
            return [t, 0] as const;
          }
        }),
      );
      if (cancelled) return;
      setCounts(Object.fromEntries(results));
    })();
    return () => { cancelled = true; };
  }, [authReady]);

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => i.title.toLowerCase().includes(q) || (i.desc || "").toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [navQuery]);

  const activeItem = NAV_BY_KEY[active];

  const renderContent = () => {
    if (active === "__rules") return <CalcRulesEditor />;
    if (active === "__custom") return <CustomReferences />;
    if (active === "__glossary") return <ProductGlossary />;
    if (active === "__calc_constants") return <CalcConstants />;
    if (active === "__op_catalog") return <OperationCatalog />;
    const spec = TABLES.find((t) => t.key === active);
    if (!spec) return null;
    return <RefTable spec={spec as any} dynOpts={dynOpts} authReady={authReady} />;
  };

  const countOf = (it: NavItem) => (it.countKey ? counts[it.countKey] : undefined);

  return (
    <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
      {/* Mobile: Select */}
      <div className="lg:hidden">
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NAV_GROUPS.map((g, gi) => (
              <Fragment key={g.title}>
                <div className={`px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground ${gi === 0 ? "" : "mt-1 border-t"}`}>{g.title}</div>
                {g.items.map((it) => {
                  const c = countOf(it);
                  return (
                    <SelectItem key={it.key} value={it.key}>
                      {it.title}{c != null ? ` (${c})` : ""}
                    </SelectItem>
                  );
                })}
              </Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: sidebar */}
      <nav className="hidden lg:block">
        <div className="sticky top-16 rounded-lg border bg-card overflow-hidden">
          <div className="px-2 py-2 border-b bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Найти раздел…"
                className="h-7 pl-7 pr-7 text-xs"
              />
              {navQuery && (
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setNavQuery("")}
                  aria-label="Очистить"
                ><X className="h-3 w-3" /></button>
              )}
            </div>
          </div>
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-1.5">
            {!filteredGroups.length && (
              <div className="px-2 py-3 text-xs text-muted-foreground">Ничего не найдено</div>
            )}
            {filteredGroups.map((g, gi) => (
              <div key={g.title} className={gi === 0 ? "" : "mt-2 pt-2 border-t"}>
                <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {g.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {g.items.map((it) => {
                    const isActive = active === it.key;
                    const c = countOf(it);
                    return (
                      <button
                        key={it.key}
                        onClick={() => setActive(it.key)}
                        className={`group text-left text-[13px] px-2 py-1 rounded-md flex items-center gap-2 transition-colors ${
                          isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="truncate flex-1">{it.title}</span>
                        {c != null && (
                          <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                            isActive ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-background"
                          }`}>{c}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-1.5 bg-muted/20">
            <Link
              to="/references/variants"
              className="group text-left text-[13px] px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span className="flex-1">Варианты просчёта</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="min-w-0 space-y-2">
        {activeItem && (
          <div className="rounded-lg border bg-card px-3 py-2.5">
            <div className="flex items-start gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold leading-tight">{activeItem.title}</h2>
                  {countOf(activeItem) != null && (
                    <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1.5">
                      {countOf(activeItem)} записей
                    </Badge>
                  )}
                  <HelpHint title="Справочники" learnMore="refs-materials">
                    Изменения видны во всех новых расчётах.
                  </HelpHint>
                </div>
                {activeItem.desc && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeItem.desc}</p>
                )}
              </div>
            </div>
            {!!activeItem.relatedKeys?.length && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t">
                <Link2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Связан с</span>
                {activeItem.relatedKeys.map((k) => {
                  const rel = NAV_BY_KEY[k];
                  if (!rel) return null;
                  return (
                    <button
                      key={k}
                      onClick={() => setActive(k)}
                      className="text-[11px] px-1.5 py-0.5 rounded border bg-background hover:bg-muted transition-colors"
                    >
                      {rel.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

const RefTable = ({ spec, dynOpts, authReady }: { spec: any; dynOpts: DynamicOptions; authReady: boolean }) => {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [draft, setDraft] = useState<AnyRow>({ ...spec.defaults });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>("__all");
  const [sectionList, setSectionList] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ rows: AnyRow[]; mode: "one" | "many" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasSubgroup = useMemo(() => {
    const cols = spec.cols.map((c: any) => c.k);
    // У этих таблиц мы добавили колонку subgroup миграцией; system_settings — нет.
    return spec.key !== "system_settings";
  }, [spec]);
  const PAGE_SIZE = 15;
  const pk = spec.pk || "id";

  const load = async () => {
    if (!authReady) return;
    setLoading(true);
    setLoadError(null);
    try {
      const session = await ensureSupabaseSession();
      if (!session?.access_token) {
        const issue = noSessionIssue(`References.load:${spec.key}`);
        setLoadError(issue.userMessage);
        return;
      }
      const { data, error } = await (supabase as any).from(spec.key).select("*").order(spec.cols[0].k);
      if (error) {
        const issue = logDataIssue(`References.load:${spec.key}`, error);
        setLoadError(`«${spec.title || spec.key}»: ${issue.userMessage}`);
        if (issue.kind === "forbidden" || issue.kind === "unauthorized" || issue.kind === "no_session") {
          toast.error(issue.userMessage);
        }
        return;
      }
      const list = (data as any[]) || [];
      if (list.length === 0) {
        // запрос прошёл, но строк нет — может быть RLS-фильтр либо просто пусто.
        logDataIssue(`References.load:${spec.key}`, null, { emptyResult: true });
      }
      setRows(list);
      setSelected(new Set());
    } catch (e: any) {
      const issue = logDataIssue(`References.load:${spec.key}`, e);
      setLoadError(issue.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    if (!authReady) { setSectionList([]); return; }
    if (!hasSubgroup) { setSectionList([]); return; }
    const session = await ensureSupabaseSession();
    if (!session?.access_token) return;
    const { data: rs } = await (supabase as any)
      .from("reference_sections")
      .select("name")
      .eq("table_key", spec.key)
      .order("sort_order");
    const fromSections = ((rs as any[]) || []).map((r) => r.name as string);
    // плюс уникальные значения subgroup в данных
    const fromRows = Array.from(new Set(rows.map((r) => r.subgroup).filter(Boolean) as string[]));
    const all = Array.from(new Set([...fromSections, ...fromRows]));
    setSectionList(all);
  };

  useEffect(() => {
    if (!authReady) return;
    load(); setPage(1); setActiveSection("__all"); setSearch("");
    // Если сессия обновится (логин или рефреш токена) — перезагрузить.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.access_token) load();
    });
    return () => sub.subscription.unsubscribe();
    /* eslint-disable-next-line */
  }, [spec.key, authReady]);
  useEffect(() => { loadSections(); /* eslint-disable-next-line */ }, [spec.key, rows.length]);

  const update = async (row: AnyRow, k: string, v: any) => {
    const next = { ...row, [k]: v };
    setRows(rows.map((r) => (r[pk] === row[pk] ? next : r)));
  };

  const save = async (row: AnyRow) => {
    const { [pk]: id, created_at, ...rest } = row;
    const { error } = await (supabase as any).from(spec.key).update(rest).eq(pk, id);
    if (error) toast.error(error.message); else toast.success("Сохранено");
  };

  // Тихое автосохранение по blur/change — без toast-успеха, только ошибки.
  const saveQuiet = async (row: AnyRow) => {
    const { [pk]: id, created_at, ...rest } = row;
    const { error } = await (supabase as any).from(spec.key).update(rest).eq(pk, id);
    if (error) toast.error(error.message);
  };

  // Берём актуальную версию строки из state (после setRows) и сохраняем.
  const commitRow = (rowId: any) => {
    setRows((rs) => {
      const cur = rs.find((r) => r[pk] === rowId);
      if (cur) void saveQuiet(cur);
      return rs;
    });
  };

  const remove = async (row: AnyRow) => {
    const { error } = await (supabase as any).from(spec.key).delete().eq(pk, row[pk]);
    if (error) toast.error(error.message); else { toast.success("Удалено"); load(); }
  };

  const removeMany = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await (supabase as any).from(spec.key).delete().in(pk, ids);
    if (error) toast.error(error.message);
    else { toast.success(`Удалено: ${ids.length}`); load(); }
  };

  const duplicate = async (row: AnyRow) => {
    const { [pk]: _id, created_at, ...rest } = row;
    if (typeof rest.name === "string") rest.name = `${rest.name} (копия)`;
    const { error } = await (supabase as any).from(spec.key).insert(rest);
    if (error) toast.error(error.message);
    else { toast.success("Скопировано"); load(); }
  };

  // ===== CSV =====
  const exportCsv = () => {
    const cols = spec.cols.map((c: any) => c.k);
    const labels = spec.cols.map((c: any) => c.label);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = Array.isArray(v) ? v.join("|") : String(v);
      if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [labels.join(";")];
    for (const r of filteredRows) {
      lines.push(cols.map((k: string) => escape(r[k])).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${spec.key}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): string[][] => {
    const out: string[][] = [];
    let cur: string[] = []; let cell = ""; let inQ = false;
    const t = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (inQ) {
        if (ch === '"') {
          if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
        } else cell += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ";") { cur.push(cell); cell = ""; }
        else if (ch === "\n") { cur.push(cell); out.push(cur); cur = []; cell = ""; }
        else if (ch === "\r") { /* skip */ }
        else cell += ch;
      }
    }
    if (cell.length || cur.length) { cur.push(cell); out.push(cur); }
    return out.filter((r) => r.length && r.some((c) => c.length));
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);
    if (grid.length < 2) { toast.error("CSV пустой"); return; }
    const header = grid[0];
    const labelToKey: Record<string, string> = {};
    for (const c of spec.cols) labelToKey[c.label] = c.k;
    const numKeys = new Set(spec.cols.filter((c: any) => c.t === "number").map((c: any) => c.k));
    const multiKeys = new Set(spec.cols.filter((c: any) => c.t === "multiselect").map((c: any) => c.k));
    const keys = header.map((h) => labelToKey[h] ?? h);
    const records = grid.slice(1).map((row) => {
      const obj: AnyRow = {};
      keys.forEach((k, i) => {
        let v: any = row[i];
        if (v === "" || v == null) { obj[k] = null; return; }
        if (numKeys.has(k)) v = Number(v);
        else if (multiKeys.has(k)) v = String(v).split("|").filter(Boolean);
        obj[k] = v;
      });
      return obj;
    });
    if (!confirm(`Импортировать ${records.length} строк? Существующие данные не удаляются.`)) return;
    const { error } = await (supabase as any).from(spec.key).insert(records);
    if (error) toast.error(error.message);
    else { toast.success(`Импортировано: ${records.length}`); load(); }
  };

  // ===== Sections =====
  const addSection = async () => {
    const name = prompt("Название раздела:")?.trim();
    if (!name) return;
    const { error } = await (supabase as any).from("reference_sections").insert({ table_key: spec.key, name });
    if (error) toast.error(error.message);
    else { setActiveSection(name); loadSections(); }
  };
  const removeSection = async (name: string) => {
    if (!confirm(`Удалить раздел «${name}»? Записи останутся, но потеряют принадлежность к разделу.`)) return;
    await (supabase as any).from("reference_sections").delete().eq("table_key", spec.key).eq("name", name);
    await (supabase as any).from(spec.key).update({ subgroup: null }).eq("subgroup", name);
    setActiveSection("__all");
    load(); loadSections();
  };

  const add = async () => {
    const { error } = await (supabase as any).from(spec.key).insert(draft);
    if (error) toast.error(error.message);
    else { toast.success("Добавлено"); setDraft({ ...spec.defaults }); setPage(1); load(); }
  };

  const renderField = (col: any, value: any, onChange: (v: any) => void, onCommit?: () => void) => {
    if (col.t === "ref") {
      const options = (dynOpts[col.refKey as keyof DynamicOptions] as { value: string; label: string }[]) || [];
      return (
        <Select value={value ?? ""} onValueChange={(v) => { onChange(v || null); onCommit?.(); }}>
          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (col.t === "multiselect") {
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (opt: string) => {
        const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
        onChange(next.length ? next : null);
        onCommit?.();
      };
      return (
        <div className="flex flex-wrap gap-1 max-w-[260px]">
          {col.opts.map((o: string) => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${arr.includes(o) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
            >
              {optLabel(o)}
            </button>
          ))}
        </div>
      );
    }
    if (col.t === "select") {
      const isBool = col.opts.length === 2 && col.opts[0] === "true" && col.opts[1] === "false";
      return (
        <Select value={String(value ?? "")} onValueChange={(v) => { onChange(isBool ? v === "true" : v); onCommit?.(); }}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{col.opts.map((o: string) => <SelectItem key={o} value={o}>{optLabel(o)}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type={col.t}
        className="h-8"
        value={value ?? ""}
        onChange={(e) => onChange(col.t === "number" ? Number(e.target.value) : e.target.value)}
        onBlur={() => onCommit?.()}
      />
    );
  };

  // Фильтрация по разделу + поиску
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (hasSubgroup && activeSection !== "__all") {
        if ((r.subgroup || "") !== activeSection) return false;
      }
      if (!q) return true;
      for (const c of spec.cols) {
        const v = r[c.k];
        if (v == null) continue;
        const text = Array.isArray(v) ? v.map(optLabel).join(" ") : optLabel(String(v));
        if (text.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [rows, search, activeSection, hasSubgroup, spec.cols]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredRows, currentPage]
  );
  const fromIdx = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  // При смене раздела — сбросить страницу
  useEffect(() => { setPage(1); }, [search, activeSection]);

  // Валидация диапазонов тиражей (для press_machines и product_circulation_rules)
  const rangeValidation = useMemo(() => {
    const errors = new Map<string, string[]>();          // блокирующие (min > max)
    const warnings = new Map<string, string[]>();        // пересечения
    const push = (map: Map<string, string[]>, id: string, msg: string) => {
      const cur = map.get(id) || [];
      if (!cur.includes(msg)) cur.push(msg);
      map.set(id, cur);
    };
    const isRange = spec.key === "press_machines" || spec.key === "product_circulation_rules";
    if (!isRange) return { errors, warnings };

    const all = rows.filter((r) => spec.key === "press_machines" ? r.is_active !== false : true);
    for (const r of all) {
      const min = Number(r.min_circulation ?? 0);
      const max = r.max_circulation == null ? null : Number(r.max_circulation);
      if (max != null && min > max) push(errors, r[pk], `«Тираж от» (${min}) больше «до» (${max})`);
    }
    // Пересечения попарно
    const overlap = (aMin: number, aMax: number | null, bMin: number, bMax: number | null) => {
      const aHi = aMax ?? Infinity;
      const bHi = bMax ?? Infinity;
      return aMin <= bHi && bMin <= aHi;
    };
    const groupKey = (r: AnyRow) =>
      spec.key === "product_circulation_rules" ? String(r.product_type || "") : "all";
    const groups = new Map<string, AnyRow[]>();
    for (const r of all) {
      const k = groupKey(r);
      const list = groups.get(k) || [];
      list.push(r);
      groups.set(k, list);
    }
    for (const [, list] of groups) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const aMin = Number(a.min_circulation ?? 0);
          const aMax = a.max_circulation == null ? null : Number(a.max_circulation);
          const bMin = Number(b.min_circulation ?? 0);
          const bMax = b.max_circulation == null ? null : Number(b.max_circulation);
          if (overlap(aMin, aMax, bMin, bMax)) {
            const label = (r: AnyRow) =>
              spec.key === "press_machines" ? (r.name || "—") : `тираж ${r.min_circulation ?? 0}–${r.max_circulation ?? "∞"}`;
            push(warnings, a[pk], `Пересечение с «${label(b)}»`);
            push(warnings, b[pk], `Пересечение с «${label(a)}»`);
          }
        }
      }
    }
    return { errors, warnings };
  }, [rows, spec.key, pk]);

  const guardedSave = async (row: AnyRow) => {
    const errs = rangeValidation.errors.get(row[pk]);
    if (errs && errs.length) { toast.error(errs.join("; ")); return; }
    return save(row);
  };
  const guardedAdd = async () => {
    const min = Number(draft.min_circulation ?? 0);
    const max = draft.max_circulation == null || draft.max_circulation === "" ? null : Number(draft.max_circulation);
    if (max != null && min > max) { toast.error(`«Тираж от» (${min}) больше «до» (${max})`); return; }
    return add();
  };

  return (
    <Card>
      <CardHeader className="pb-3 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center">
            {spec.title}
            <HelpHint title="Работа с таблицей" learnMore="refs-toolbar">
              <ul className="list-disc pl-4 space-y-1">
                <li><b>Поиск</b> — по всем колонкам.</li>
                <li><b>Разделы</b> группируют записи (поле subgroup).</li>
                <li><b>CSV</b>: экспорт текущей выборки, импорт добавляет строки.</li>
                <li><b>«⋯»</b> у строки — дублировать или удалить.</li>
                <li><b>Чекбоксы</b> — массовое удаление.</li>
              </ul>
            </HelpHint>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="h-8 pl-7 w-44"
              />
              {search && (
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                  aria-label="Очистить"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv} title="Экспорт CSV">
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} title="Импорт CSV">
              <Upload className="h-3.5 w-3.5 mr-1" /> Импорт
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }}
            />
          </div>
        </div>
        {hasSubgroup && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveSection("__all")}
              className={`text-xs px-2 py-1 rounded-md border ${activeSection === "__all" ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
            >Все</button>
            {sectionList.map((name) => (
              <span key={name} className="inline-flex items-center gap-0.5">
                <button
                  onClick={() => setActiveSection(name)}
                  className={`text-xs pl-2 pr-1 py-1 rounded-l-md border-y border-l ${activeSection === name ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                >{name}</button>
                <button
                  onClick={() => removeSection(name)}
                  className={`text-xs px-1 py-1 rounded-r-md border-y border-r ${activeSection === name ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:text-destructive"}`}
                  title="Удалить раздел"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={addSection}>
              <Plus className="h-3 w-3 mr-1" /> Раздел
            </Button>
          </div>
        )}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/40">
            <div className="text-sm">Выбрано: <span className="font-medium">{selected.size}</span></div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Снять выбор</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDelete({ rows: rows.filter((r) => selected.has(r[pk])), mode: "many" })}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить выбранные
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <DataState
          loading={loading}
          error={loadError}
          empty={!loading && !loadError && rows.length === 0 && !search && activeSection === "__all"}
          onRetry={load}
          variant="rows"
          rowCount={8}
          emptyTitle={`В справочнике «${spec.title || spec.key}» пока нет записей`}
          emptyDescription="Добавьте первую запись через форму выше или импортируйте CSV."
        >
        <div className="scroll-x overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8 p-2">
                  <Checkbox
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r[pk]))}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) pageRows.forEach((r) => next.add(r[pk]));
                      else pageRows.forEach((r) => next.delete(r[pk]));
                      setSelected(next);
                    }}
                  />
                </th>
                {spec.cols.map((c: any) => <th key={c.k} className="text-left p-2">{c.label}</th>)}
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-primary/5">
                <td className="p-1.5"></td>
                {spec.cols.map((c: any) => (
                  <td key={c.k} className="p-1.5">{renderField(c, draft[c.k], (v) => setDraft({ ...draft, [c.k]: v }))}</td>
                ))}
                <td className="p-1.5 text-right"><Button size="sm" onClick={guardedAdd}><Plus className="h-3.5 w-3.5" /></Button></td>
              </tr>
              {pageRows.map((row) => {
                const errs = rangeValidation.errors.get(row[pk]) || [];
                const warns = rangeValidation.warnings.get(row[pk]) || [];
                const rowCls = errs.length
                  ? "border-t bg-destructive/5"
                  : warns.length
                    ? "border-t bg-warning/5"
                    : "border-t";
                return (
                  <Fragment key={row[pk]}>
                    <tr className={rowCls}>
                      <td className="p-1.5">
                        <Checkbox
                          checked={selected.has(row[pk])}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(row[pk]); else next.delete(row[pk]);
                            setSelected(next);
                          }}
                        />
                      </td>
                      {spec.cols.map((c: any) => (
                        <td key={c.k} className="p-1.5">{renderField(c, row[c.k], (v) => update(row, c.k, v), () => commitRow(row[pk]))}</td>
                      ))}
                      <td className="p-1.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => guardedSave(row)} disabled={errs.length > 0}><Save className="h-3.5 w-3.5" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => duplicate(row)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Дублировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setConfirmDelete({ rows: [row], mode: "one" })}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                    {(errs.length > 0 || warns.length > 0) && (
                      <tr className={errs.length ? "bg-destructive/5" : "bg-warning/5"}>
                        <td colSpan={spec.cols.length + 2} className="px-3 py-1.5">
                          <div className={`flex items-start gap-1.5 text-[11px] ${errs.length ? "text-destructive" : "text-warning"}`}>
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <div>{[...errs, ...warns].join(" · ")}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredRows.length === 0 && (
                <tr className="border-t">
                  <td colSpan={spec.cols.length + 2} className="p-4 text-center text-xs text-muted-foreground">
                    {rows.length === 0 ? "Нет записей" : "Ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>
            {filteredRows.length > 0 ? (
              <>Показаны <span className="font-medium text-foreground">{fromIdx}–{toIdx}</span> из <span className="font-medium text-foreground">{filteredRows.length}</span>{filteredRows.length !== rows.length && <> (всего {rows.length})</>}</>
            ) : (
              <>0 записей</>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </DataState>
      </CardContent>
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.mode === "many"
                ? `Будут удалены ${confirmDelete.rows.length} записей. Действие необратимо.`
                : "Запись будет удалена. Действие необратимо."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.mode === "many") {
                  await removeMany(confirmDelete.rows.map((r) => r[pk]));
                } else {
                  await remove(confirmDelete.rows[0]);
                }
                setConfirmDelete(null);
              }}
            >Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default References;