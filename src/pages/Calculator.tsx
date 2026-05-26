import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, FileText, Sparkles, AlertTriangle, Check as CheckIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stepper } from "@/components/calc/Stepper";
import { LayoutPreview } from "@/components/calc/LayoutPreview";
import AiOrderAssistant, { type ParsedOrder } from "@/components/calc/AiOrderAssistant";
import { FORMAT_PRESETS, runCalculation, setCalcRules, setCutRules, setMaterialPrices } from "@/lib/calc/engine";
import { loadCalcRules, loadCutRules, loadMaterialPrices } from "@/lib/calc/rules";
import { runVariant as runVariantFormula, collectStageRefs } from "@/lib/calc/variants/engine";
import { VARIABLE_KEYS } from "@/lib/calc/variants/types";
import { CalcInput, ProductType, FormatType } from "@/lib/calc/types";
import { PRODUCT_PRESETS } from "@/lib/calc/presets";
import { fmtMoney, fmtNum } from "@/lib/format";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { handleSupabaseError } from "@/lib/supabase-error";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronUp } from "lucide-react";
import { HelpHint } from "@/components/HelpHint";
import { cn } from "@/lib/utils";
import { useProductGlossary, GlossaryItem, CATEGORY_LABELS, GlossaryCategory } from "@/lib/glossary";
import { useAuth } from "@/hooks/useAuth";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { CatalogOperationsPicker } from "@/components/calc/CatalogOperationsPicker";
import type { SpecItem } from "@/lib/calc/types";
import { PriceBreakdownTree } from "@/components/calc/PriceBreakdownTree";
import { FormulaWizard } from "@/components/calc/FormulaWizard";
import { CutInfoCard } from "@/components/calc/CutInfoCard";

type Material = { id: string; name: string; type: string; density: number; format_width: number; format_height: number; cost_per_sheet: number };
type LamRow = { film_type: string; size_range: string; cost_per_side: number };
type Equipment = { id: string; name: string; type: string; max_format_width: number | null; max_format_height: number | null; cost_per_impression: number | null };
type PrintFormatRow = { id: string; width: number; height: number; sort_order: number; purchase_format_id: string | null };
type PurchaseFormatRow = { id: string; width: number; height: number; material_category: string; sort_order: number };
type PressMachineRow = {
  id: string;
  name: string;
  max_format_width: number;
  max_format_height: number;
  cost_per_impression: number;
  sort_order: number;
  machine_type?: string | null;
  min_circulation?: number | null;
  max_circulation?: number | null;
  min_sheets?: number | null;
  max_sheets?: number | null;
  setup_sheets?: number | null;
  setup_cost?: number | null;
  product_types?: string[] | null;
  priority?: number | null;
  is_active?: boolean | null;
};
type CirculationRuleRow = {
  id: string;
  product_type: string;
  min_circulation: number;
  max_circulation: number | null;
  preferred_machine_id: string | null;
  sort_order: number;
};
type OperationRow = { id: string; name: string; category: string; subgroup: string | null; fixed_cost: number; variable_cost: number; min_cost?: number; description?: string | null; unit: string | null };

type ExtraOpState = { qty: number };

const MATERIAL_CATEGORIES: { value: string; label: string }[] = [
  { value: "cardboard", label: "Картон" },
  { value: "coated", label: "Мелованная" },
  { value: "offset", label: "Офсетная" },
  { value: "self_adhesive", label: "Самоклейка" },
  { value: "other", label: "Другое" },
];

function inferCategory(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("cardboard") || t.includes("картон")) return "cardboard";
  if (t.includes("coated") || t.includes("мелов")) return "coated";
  if (t.includes("offset") || t.includes("офсет")) return "offset";
  if (t.includes("self") || t.includes("самокл")) return "self_adhesive";
  return "other";
}

/**
 * Доработка 7. Определение типа материала для высечки и его цены за лист.
 * Цены: картон 5, микрогофра 10, поролон 20, переплётный картон 10, пластик 7.
 */
function detectDieCutMaterial(m: any): "binding_cardboard" | "microflute" | "foam" | "plastic" | "cardboard" | "unknown" {
  if (!m) return "unknown";
  const blob = [m.type, m.subgroup, m.name].filter(Boolean).join(" ").toLowerCase();
  if (!blob) return "unknown";
  if (/переплет|переплёт|binding/.test(blob)) return "binding_cardboard";
  if (/микрогофр|microflute|гофрокартон|гофро/.test(blob)) return "microflute";
  if (/поролон|foam/.test(blob)) return "foam";
  if (/пластик|plastic|pet\b|pvc\b/.test(blob)) return "plastic";
  if (/картон|cardboard/.test(blob)) return "cardboard";
  return "unknown";
}
function pickDieCutPrice(m: any): number {
  switch (detectDieCutMaterial(m)) {
    case "cardboard": return 5;
    case "microflute": return 10;
    case "foam": return 20;
    case "binding_cardboard": return 10;
    case "plastic": return 7;
    default: return 5;
  }
}
function dieCutMaterialLabel(m: any): string {
  switch (detectDieCutMaterial(m)) {
    case "cardboard": return "картон";
    case "microflute": return "микрогофра";
    case "foam": return "поролон";
    case "binding_cardboard": return "переплётный картон";
    case "plastic": return "пластик";
    default: return "материал по умолчанию";
  }
}

// Сколько раз печатный лист помещается в закупочный (с учётом обоих поворотов)
function nestingFit(purchaseW: number, purchaseH: number, printW: number, printH: number): number {
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

const PRODUCT_OPTIONS: { value: ProductType; label: string; category: "sheet" | "book_journal" }[] = [
  { value: "leaflet", label: "Листовка", category: "sheet" },
  { value: "booklet", label: "Буклет", category: "sheet" },
  { value: "leaflet_diecut", label: "Листовка с вырубкой", category: "sheet" },
  { value: "sticker", label: "Стикер", category: "sheet" },
  { value: "sticker_diecut", label: "Стикер с вырубкой", category: "sheet" },
  { value: "bag", label: "Пакет", category: "book_journal" },
  { value: "businesscard", label: "Визитки", category: "sheet" },
  { value: "envelope", label: "Конверт", category: "sheet" },
  { value: "box", label: "Коробка", category: "sheet" },
  { value: "blank", label: "Бланк", category: "sheet" },
  { value: "selfcopy", label: "Самокопир (2 слоя)", category: "sheet" },
  { value: "folder", label: "Папка", category: "sheet" },
  { value: "poster", label: "Плакат", category: "sheet" },
  { value: "label", label: "Этикетка", category: "sheet" },
  { value: "wobbler", label: "Воблер", category: "sheet" },
  { value: "shelftalker", label: "Шелфтокер", category: "sheet" },
  { value: "kubus", label: "Кубус", category: "sheet" },
  { value: "notepad", label: "Блокнот", category: "book_journal" },
  { value: "book", label: "Книга", category: "book_journal" },
  { value: "magazine", label: "Журнал", category: "book_journal" },
  { value: "brochure", label: "Брошюра", category: "book_journal" },
  { value: "calendar_wall", label: "Календарь настенный перекидной", category: "book_journal" },
  { value: "calendar_desk", label: "Календарь настольный перекидной", category: "book_journal" },
  { value: "calendar_quarter", label: "Календарь квартальный", category: "book_journal" },
];

const FORMAT_OPTIONS: FormatType[] = ["A6", "A5", "A4", "A4+", "A3", "A3+", "A2", "A1", "custom"];

// --- Zod-валидаторы для ключевых числовых полей ---
const circulationSchema = z.number().int().positive().max(10_000_000);
const colorSchema = z.number().int().min(0).max(8);
const formatDimSchema = z.number().int().positive().max(2000);

const Calculator = () => {
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const { items: glossary } = useProductGlossary();
  const [glossarySlug, setGlossarySlug] = useState<string>("leaflet");
  const [maxReached, setMaxReached] = useState(1);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lam, setLam] = useState<LamRow[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [printFormats, setPrintFormats] = useState<PrintFormatRow[]>([]);
  const [purchaseFormats, setPurchaseFormats] = useState<PurchaseFormatRow[]>([]);
  const [pressMachines, setPressMachines] = useState<PressMachineRow[]>([]);
  const [circulationRules, setCirculationRules] = useState<CirculationRuleRow[]>([]);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  // выбранные операции из справочника: id -> { qty, price }
  const [extraOps, setExtraOps] = useState<Record<string, ExtraOpState>>({});
  // id операций, которые пользователь снял вручную — авто-включение их не вернёт
  const [userRemovedOpIds, setUserRemovedOpIds] = useState<Set<string>>(new Set());
  // строки спецификации из справочника операций (operation_catalog + work_items)
  const [catalogOpsItems, setCatalogOpsItems] = useState<SpecItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  // Стоимость приладки за форму при печати (из справочника «Константы»).
  const [formSetupCostPerForm, setFormSetupCostPerForm] = useState(0);

  // Step 1
  const [productType, setProductType] = useState<ProductType>("leaflet");

  // Glossary slug → base productType mapping for engine
  useEffect(() => {
    const item = glossary.find((g) => g.slug === glossarySlug);
    if (item?.base_product_type) {
      setProductType(item.base_product_type as ProductType);
    }
  }, [glossarySlug, glossary]);

  // Активная формула из справочника «Варианты просчёта» для текущего типа продукции
  const [activeVariant, setActiveVariant] = useState<{ id: string; name: string } | null>(null);
  // Полная активная формула со ступенями + константы — нужны для применения её в расчёте
  const [activeVariantFull, setActiveVariantFull] = useState<any | null>(null);
  const [variantConstants, setVariantConstants] = useState<Record<string, number>>({});
  // Материалы, на которые ссылаются этапы активной формулы: id → {cost_per_sheet, name}
  const [variantMaterials, setVariantMaterials] = useState<Record<string, { cost_per_sheet: number; name: string }>>({});
  // Применять ли формулу для итоговой себестоимости (по умолчанию — да, если активна)
  const [useVariantOverride, setUseVariantOverride] = useState(true);
  // Тик для принудительного обновления активной формулы (после правки в справочнике)
  const [variantReloadTick, setVariantReloadTick] = useState(0);
  // Ручные переопределения переменных формулы (мастер формулы)
  const [variableOverrides, setVariableOverrides] = useState<Record<string, number>>({});
  // Ручная корректировка количества резов на печатный лист (ТЗ — резка)
  const [cutsOverride, setCutsOverride] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { getActiveVariantFor, getVariant, listConstants } = await import("@/lib/calc/variants/api");
        const v = await getActiveVariantFor(productType);
        if (!stop) setActiveVariant(v);
        if (v) {
          const [full, consts] = await Promise.all([getVariant(v.id), listConstants()]);
          if (!stop) {
            setActiveVariantFull(full);
            setVariantConstants(Object.fromEntries((consts as any[]).map((c) => [c.slug, Number(c.value) || 0])));
          }
        } else if (!stop) {
          setActiveVariantFull(null);
        }
      } catch { if (!stop) setActiveVariant(null); }
    })();
    return () => { stop = true; };
  }, [productType, variantReloadTick]);
  // Подгружаем материалы, на которые ссылаются этапы формулы
  useEffect(() => {
    let stop = false;
    (async () => {
      const ids: string[] = ((activeVariantFull?.stages || []) as any[])
        .map((s) => s.material_id)
        .filter((x: any): x is string => !!x);
      if (!ids.length) { if (!stop) setVariantMaterials({}); return; }
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await (supabase as any).from("materials").select("id,name,cost_per_sheet").in("id", ids);
        if (stop) return;
        const map: Record<string, { cost_per_sheet: number; name: string }> = {};
        ((data as any[]) || []).forEach((m) => { map[m.id] = { cost_per_sheet: Number(m.cost_per_sheet) || 0, name: m.name }; });
        setVariantMaterials(map);
      } catch { if (!stop) setVariantMaterials({}); }
    })();
    return () => { stop = true; };
  }, [activeVariantFull]);
  // Автоподхват изменений: при возврате во вкладку перечитываем активную формулу
  useEffect(() => {
    const onFocus = () => setVariantReloadTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  const [name, setName] = useState("");
  const [circulation, setCirculation] = useState(1000);
  const [formatType, setFormatType] = useState<FormatType>("A4");
  const [customW, setCustomW] = useState(210);
  const [customH, setCustomH] = useState(297);
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(4);

  // Step 2
  // Авто-режим: менеджер выбирает только тип материала + плотность,
  // система автоподбирает закупочный формат и печатную машину.
  // Расширенный режим: ручной выбор конкретной бумаги (как раньше).
  const [advancedMode, setAdvancedMode] = useState(false);
  const [materialCategory, setMaterialCategory] = useState<string>("coated");
  const [materialDensity, setMaterialDensity] = useState<number | "">("");
  const [materialId, setMaterialId] = useState<string>("");
  const [equipmentId, setEquipmentId] = useState<string>("");

  // Step 3

  // Step 4 — ручное переопределение пары (печатный/закупочный). null = авто.
  const [manualPair, setManualPair] = useState<{
    print: { width: number; height: number };
    purchase: { width: number; height: number };
  } | null>(null);

  // Step 5
  const [hasFold, setHasFold] = useState(false);
  const [foldCount, setFoldCount] = useState(1);
  const [hasDieCut, setHasDieCut] = useState(true);
  const [hasLamination, setHasLamination] = useState(false);
  const [laminationFilm, setLaminationFilm] = useState<"gloss" | "matte" | "velvet">("gloss");
  const [laminationSides, setLaminationSides] = useState<1 | 2>(1);
  const [hasNumbering, setHasNumbering] = useState(false);
  const [numbersPerSheet, setNumbersPerSheet] = useState(1);
  const [hasStamping, setHasStamping] = useState(false);
  const [stampCliches, setStampCliches] = useState<Array<{ w: number; h: number; points?: number }>>([{ w: 5, h: 3, points: 1 }]);
  const [hasEmbossing, setHasEmbossing] = useState(false);
  const [embossCliches, setEmbossCliches] = useState<Array<{ w: number; h: number; points?: number }>>([{ w: 5, h: 3, points: 1 }]);
  const [hasLamPrepress, setHasLamPrepress] = useState(false);
  const [lamPrepressSides, setLamPrepressSides] = useState<1 | 2>(1);

  // Доработка 5: единый блок «Кол-во сгибов на изделии».
  // Цена за сгиб выбирается автоматически по плотности бумаги.
  const [foldsPerItem, setFoldsPerItem] = useState(0);
  // Доработка 7: единый блок «Высечка».
  const [dieCutEnabled, setDieCutEnabled] = useState(false);
  const [dieCutStampMode, setDieCutStampMode] = useState<"existing" | "new">("existing");
  const [dieCutStampCost, setDieCutStampCost] = useState(0);

  // Step 6
  const [margin, setMargin] = useState(30);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Logout: clear cached reference data so the next user doesn't see stale rows.
      setMaterials([]);
      setLam([]);
      setEquipment([]);
      setPrintFormats([]);
      setPurchaseFormats([]);
      setPressMachines([]);
      setCirculationRules([]);
      setOperations([]);
      return;
    }
    (async () => {
      try {
        await ensureSupabaseSession();
        const calcRules = await loadCalcRules();
        setCalcRules(calcRules);
        try {
          const cutData = await loadCutRules();
          setCutRules(cutData);
        } catch (e) {
          console.warn("[Calculator] loadCutRules failed", e);
        }
        try {
          const mp = await loadMaterialPrices();
          setMaterialPrices(mp);
        } catch (e) {
          console.warn("[Calculator] loadMaterialPrices failed", e);
        }
      } catch (e: any) {
        toast.error("Не удалось загрузить правила расчёта: " + (e?.message || ""));
      }
      const [mR, lR, eR, sR, pfR, buyR, pmR, rulesR, opsR] = await Promise.all([
        supabase.from("materials").select("*").order("name"),
        supabase.from("lamination_prices").select("film_type,size_range,cost_per_side"),
        supabase.from("equipment").select("*").eq("type", "print").order("name"),
        supabase.from("system_settings").select("value").eq("key", "vat_percent").maybeSingle(),
        supabase.from("print_formats" as any).select("*").order("sort_order"),
        supabase.from("purchase_formats" as any).select("*").order("sort_order"),
        supabase.from("press_machines" as any).select("*").order("sort_order"),
        supabase.from("product_circulation_rules" as any).select("*").order("sort_order"),
        supabase.from("operations").select("*").order("subgroup").order("name"),
      ]);
      const m = mR.data, l = lR.data, e = eR.data, s = sR.data;
      const pf = pfR.data, buyf = buyR.data, pm = pmR.data, rules = rulesR.data, ops = opsR.data;
      handleSupabaseError(mR.error, "материалы");
      handleSupabaseError(lR.error, "ламинация");
      handleSupabaseError(eR.error, "оборудование");
      handleSupabaseError(sR.error, "настройки");
      handleSupabaseError(pfR.error, "печатные форматы");
      handleSupabaseError(buyR.error, "закупочные форматы");
      handleSupabaseError(pmR.error, "печатные машины");
      handleSupabaseError(rulesR.error, "правила тиражей");
      handleSupabaseError(opsR.error, "операции");
      if (s?.value) setVatPercent(Number(s.value) || 0);
      // Цена приладки за форму при печати — отдельный системный ключ.
      try {
        const fsR = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "приладка форм при печати")
          .maybeSingle();
        if (fsR.data?.value) setFormSetupCostPerForm(Number(fsR.data.value) || 0);
      } catch { /* не критично */ }
      setMaterials((m as Material[]) || []);
      setLam((l as LamRow[]) || []);
      setEquipment((e as Equipment[]) || []);
      setPrintFormats(((pf as any) || []) as PrintFormatRow[]);
      setPurchaseFormats(((buyf as any) || []) as PurchaseFormatRow[]);
      setPressMachines(((pm as any) || []) as PressMachineRow[]);
      setCirculationRules(((rules as any) || []) as CirculationRuleRow[]);
      setOperations(((ops as any) || []) as OperationRow[]);
      if (m && m.length) setMaterialId((m[0] as Material).id);
      if (e && e.length) setEquipmentId((e[0] as Equipment).id);
    })();
  }, [authLoading, user?.id]);

  // Load template/clone if requested
  useEffect(() => {
    const tpl = searchParams.get("from");
    if (!tpl) return;
    (async () => {
      await ensureSupabaseSession();
      const { data } = await supabase.from("calculations").select("*").eq("id", tpl).single();
      if (!data) return;
      setName((data.name || "") + (data.is_template ? "" : " (копия)"));
      setProductType(data.product_type as ProductType);
      setCirculation(data.circulation);
      setFormatType(data.format_type as FormatType);
      if (data.format_width) setCustomW(data.format_width);
      if (data.format_height) setCustomH(data.format_height);
      setColorFront(data.color_front);
      setColorBack(data.color_back);
      if (data.material_id) setMaterialId(data.material_id);
      if (data.equipment_id) setEquipmentId(data.equipment_id);
      if (data.margin_percent) setMargin(Number(data.margin_percent));
      toast.info(data.is_template ? "Загружен шаблон" : "Создана копия расчёта");
    })();
  }, [searchParams]);

  // Авто-пресет постпечати по типу продукции (из исторических маршрутов)
  useEffect(() => {
    const p = PRODUCT_PRESETS[productType];
    if (!p) return;
    if (p.hasFold !== undefined) setHasFold(p.hasFold);
    if (p.foldCount !== undefined) setFoldCount(p.foldCount);
    if (p.hasDieCut !== undefined) setHasDieCut(p.hasDieCut);
    if (p.hasLamPrepress !== undefined) setHasLamPrepress(p.hasLamPrepress);
    if (p.lamPrepressSides !== undefined) setLamPrepressSides(p.lamPrepressSides);
    if (p.hasLamination !== undefined) setHasLamination(p.hasLamination);
    if (p.laminationSides !== undefined) setLaminationSides(p.laminationSides);
  }, [productType]);

  const dims = useMemo(() => {
    if (formatType === "custom") return { w: customW, h: customH };
    const p = FORMAT_PRESETS[formatType];
    return { w: p.w, h: p.h };
  }, [formatType, customW, customH]);

  const material = materials.find((m) => m.id === materialId);
  const selectedEquipment = equipment.find((e) => e.id === equipmentId);

  // ===== АВТО-РЕЖИМ: предварительный подбор печатного формата по габаритам изделия
  const printFormatList = useMemo(
    () => printFormats.map((p) => ({ width: p.width, height: p.height })),
    [printFormats]
  );


  // Помещается ли печатный лист в формат машины (с учётом поворота)
  const fitsMachine = (pm: PressMachineRow, printW: number, printH: number) => {
    const fitW = Math.max(printW, printH);
    const fitH = Math.min(printW, printH);
    const mW = Math.max(pm.max_format_width, pm.max_format_height);
    const mH = Math.min(pm.max_format_width, pm.max_format_height);
    return fitW <= mW && fitH <= mH;
  };

  // Подбор оптимальной печатной машины: формат + тираж + тип продукции + правила
  type MachinePick = { machine: PressMachineRow | null; source: "rule" | "filter" | "fallback" | "none" };
  const autoPickMachine = (
    printW: number,
    printH: number,
    productType?: string,
    circulation?: number,
    printSheets?: number
  ): MachinePick => {
    const active = pressMachines.filter((pm) => pm.is_active !== false);

    // 0) Жёсткие бизнес-правила по габаритам печатного листа и числу листов
    const longSide = Math.max(printW, printH);
    const shortSide = Math.min(printW, printH);
    const fitsA3plus = longSide <= 520 && shortSide <= 360;
    const fitsA2plus = longSide <= 720 && shortSide <= 520;
    const findByMaxFormat = (w: number, h: number) =>
      active.find(
        (pm) =>
          Math.max(pm.max_format_width, pm.max_format_height) === w &&
          Math.min(pm.max_format_width, pm.max_format_height) === h
      );
    // > 720×520 → A1
    if (!fitsA2plus) {
      const a1 = findByMaxFormat(1040, 720);
      if (a1) return { machine: a1, source: "rule" };
    }
    // > 520×360 → A2+
    if (!fitsA3plus) {
      const a2 = findByMaxFormat(720, 520);
      if (a2) return { machine: a2, source: "rule" };
    }
    // Помещается в A3+: тираж листов >10000 → A2+, иначе A3+
    if (fitsA3plus) {
      if (printSheets != null && printSheets > 10000) {
        const a2 = findByMaxFormat(720, 520);
        if (a2) return { machine: a2, source: "rule" };
      } else {
        const a3 = findByMaxFormat(520, 360);
        if (a3) return { machine: a3, source: "rule" };
      }
    }

    // 1) Явное правило для (productType, circulation) из справочника
    if (productType && circulation != null) {
      const rule = circulationRules
        .filter((r) => r.product_type === productType)
        .filter((r) => circulation >= (r.min_circulation || 0) && (r.max_circulation == null || circulation <= r.max_circulation))
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      if (rule?.preferred_machine_id) {
        const pm = active.find((m) => m.id === rule.preferred_machine_id);
        if (pm && fitsMachine(pm, printW, printH)) return { machine: pm, source: "rule" };
      }
    }

    // 2) Фильтруем по всем условиям
    const candidates = active.filter((pm) => {
      if (!fitsMachine(pm, printW, printH)) return false;
      if (circulation != null) {
        if ((pm.min_circulation ?? 0) > circulation) return false;
        if (pm.max_circulation != null && pm.max_circulation < circulation) return false;
      }
      if (printSheets != null) {
        if ((pm.min_sheets ?? 0) > printSheets) return false;
        if (pm.max_sheets != null && pm.max_sheets < printSheets) return false;
      }
      if (productType && pm.product_types && pm.product_types.length > 0) {
        if (!pm.product_types.includes(productType)) return false;
      }
      return true;
    });

    candidates.sort((a, b) => {
      const pa = a.priority ?? 100;
      const pb = b.priority ?? 100;
      if (pa !== pb) return pa - pb;
      return a.max_format_width * a.max_format_height - b.max_format_width * b.max_format_height;
    });
    if (candidates.length) return { machine: candidates[0], source: "filter" };

    // 3) Fallback: по формату только (старая логика)
    const sorted = [...active].sort(
      (a, b) => a.max_format_width * a.max_format_height - b.max_format_width * b.max_format_height
    );
    for (const pm of sorted) if (fitsMachine(pm, printW, printH)) return { machine: pm, source: "fallback" };
    return { machine: null, source: "none" };
  };

  // Подбор оптимального закупочного формата (минимальный, в который кратно укладывается печатный)
  const autoPickPurchase = (
    printW: number,
    printH: number,
    category: string
  ): PurchaseFormatRow | null => {
    const candidates = purchaseFormats.filter((p) => p.material_category === category);
    const sorted = [...candidates].sort((a, b) => a.width * a.height - b.width * b.height);
    let best: PurchaseFormatRow | null = null;
    let bestUps = 0;
    for (const p of sorted) {
      const ups = nestingFit(p.width, p.height, printW, printH);
      if (ups > 0 && (best === null || ups > bestUps)) {
        best = p;
        bestUps = ups;
      }
      if (best && bestUps >= 1) break; // минимальный из подходящих
    }
    return best;
  };

  // Авто-материал из справочника materials по категории + плотности + закупочному формату
  const autoMaterial = useMemo<Material | null>(() => {
    if (advancedMode) return null;
    if (!materials.length || !printFormatList.length) return null;
    // Грубая прикидка раскладки на самом большом печатном формате,
    // чтобы определить какой закупочный формат нужен — но в финале движок выберет сам.
    // Для подстановки достаточно: берём любой материал нужной категории/плотности,
    // и закупочный формат = самый большой из доступных (движок всё равно режет).
    const catMatch = materials.filter((m) => inferCategory(m.type) === materialCategory);
    const dens = materialDensity === "" ? null : Number(materialDensity);
    const densMatch = dens ? catMatch.filter((m) => m.density === dens) : catMatch;
    const pool = densMatch.length ? densMatch : catMatch;
    if (!pool.length) return null;
    // Берём самый дешёвый (по цене за см²) — оптимизация.
    const scored = [...pool].sort(
      (a, b) =>
        a.cost_per_sheet / (a.format_width * a.format_height) -
        b.cost_per_sheet / (b.format_width * b.format_height)
    );
    return scored[0];
  }, [advancedMode, materials, materialCategory, materialDensity, printFormatList]);

  const effectiveMaterial = advancedMode ? material : autoMaterial;

  // Жёсткие пары (печатный↔закупочный) из справочника — фильтруем по категории материала
  const formatPairs = useMemo(() => {
    const purchaseById = new Map(purchaseFormats.map((p) => [p.id, p]));
    const cat = advancedMode
      ? (effectiveMaterial ? inferCategory(effectiveMaterial.type) : null)
      : materialCategory;
    return printFormats
      .map((pf) => {
        const buy = pf.purchase_format_id ? purchaseById.get(pf.purchase_format_id) : null;
        if (!buy) return null;
        if (cat && buy.material_category !== cat) return null;
        return {
          print: { width: pf.width, height: pf.height },
          purchase: { width: buy.width, height: buy.height },
        };
      })
      .filter(Boolean) as { print: { width: number; height: number }; purchase: { width: number; height: number } }[];
  }, [printFormats, purchaseFormats, advancedMode, materialCategory, effectiveMaterial]);

  // Авто-машина: вычисляется после раскладки (см. ниже useMemo result)

  const lamMap = useMemo(() => {
    const map: Record<string, number> = {};
    lam.forEach((r) => (map[`${r.film_type}:${r.size_range}`] = Number(r.cost_per_side)));
    return map;
  }, [lam]);

  const calcInput: CalcInput | null = useMemo(() => {
    if (!effectiveMaterial) return null;
    // «Свой оборот»: одинаковое чётное число цветов с обеих сторон, > 0
    const ownIntent =
      colorBack > 0 && colorFront === colorBack;
    // Приоритетные печатные форматы по требованиям бизнеса
    const priority = [
      { width: 520, height: 360 },
      { width: 460, height: 320 },
    ];
    // Ручной выбор пары: используем ровно её, без приоритетов и без чётности.
    const pairsToUse = manualPair ? [manualPair] : (formatPairs.length ? formatPairs : undefined);
    const useManual = !!manualPair;
    return {
      productType,
      circulation,
      formatType,
      formatWidth: dims.w,
      formatHeight: dims.h,
      colorFront,
      colorBack,
      material: effectiveMaterial,
      printFormats: printFormatList.length ? printFormatList : undefined,
      formatPairs: pairsToUse,
      requireEvenItems: useManual ? false : ownIntent,
      priorityPrintFormats: useManual ? undefined : priority,
      designQty: 2,
      photoOutputUnitCost: 0,
      hasFold: productType === "booklet" ? hasFold : false,
      foldCount,
      hasDieCut,
      hasLamination,
      laminationFilm,
      laminationSides,
      laminationPriceMap: lamMap,
      hasNumbering,
      numbersPerSheet,
      hasStamping,
      stampingCliches: stampCliches,
      stampingClicheW: stampCliches[0]?.w,
      stampingClicheH: stampCliches[0]?.h,
      hasEmbossing,
      embossingCliches: embossCliches,
      hasLamPrepress,
      lamPrepressSides,
      printCostPerImpression: undefined, // подставится ниже после автоподбора машины
      vatPercent,
      cutsPerSheetOverride: cutsOverride ?? undefined,
    };
  }, [effectiveMaterial, productType, circulation, formatType, dims, colorFront, colorBack, hasFold, foldCount, hasDieCut, hasLamination, laminationFilm, laminationSides, lamMap, hasNumbering, numbersPerSheet, hasStamping, stampCliches, hasEmbossing, embossCliches, hasLamPrepress, lamPrepressSides, vatPercent, printFormatList, formatPairs, manualPair, cutsOverride]);

  // Промежуточный расчёт (без авто-цены машины)
  const preResult = useMemo(() => {
    if (!calcInput) return null;
    try {
      return runCalculation(calcInput);
    } catch (e: any) {
      return { error: e.message } as any;
    }
  }, [calcInput]);

  // Сброс ручной пары при смене продукта/формата/материала
  useEffect(() => {
    setManualPair(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType, formatType, dims.w, dims.h, materialCategory]);

  // Если выбранная вручную пара исчезла из справочника — сбросить
  useEffect(() => {
    if (!manualPair) return;
    const ok = formatPairs.some(
      (p) =>
        p.print.width === manualPair.print.width &&
        p.print.height === manualPair.print.height &&
        p.purchase.width === manualPair.purchase.width &&
        p.purchase.height === manualPair.purchase.height
    );
    if (!ok) setManualPair(null);
  }, [formatPairs, manualPair]);

  // Авто-базовый результат (для расчёта Δ к авто, когда выбран ручной режим)
  const autoBaseResult = useMemo(() => {
    if (!calcInput || !manualPair) return null;
    const ownIntent = colorBack > 0 && colorFront === colorBack;
    const priority = [
      { width: 520, height: 360 },
      { width: 460, height: 320 },
    ];
    try {
      return runCalculation({
        ...calcInput,
        formatPairs: formatPairs.length ? formatPairs : undefined,
        requireEvenItems: ownIntent,
        priorityPrintFormats: priority,
      });
    } catch {
      return null;
    }
  }, [calcInput, manualPair, formatPairs, colorFront, colorBack]);

  // Авто-выбранная машина по подобранному печатному формату
  const autoMachinePick = useMemo<MachinePick>(() => {
    if (!preResult || "error" in preResult) return { machine: null, source: "none" };
    const pf = preResult.layout.printFormat;
    return autoPickMachine(pf.width, pf.height, productType, circulation, preResult.printSheets);
  }, [preResult, pressMachines, circulationRules, productType, circulation]);
  const autoMachine = autoMachinePick.machine;

  // Авто-подобранный закупочный формат для текущего печатного листа
  const autoPickedPurchase = useMemo(() => {
    if (!preResult || "error" in preResult) return null;
    const pw = preResult.layout.printFormat.width;
    const ph = preResult.layout.printFormat.height;
    const pair = formatPairs.find(
      (p) => p.print.width === pw && p.print.height === ph
    );
    return pair?.purchase ?? null;
  }, [preResult, formatPairs]);

  // Тираж выходит за рекомендуемый диапазон авто-машины
  const circulationOutOfRange = useMemo(() => {
    if (!autoMachine) return false;
    const min = autoMachine.min_circulation ?? 0;
    const max = autoMachine.max_circulation;
    if (circulation < min) return true;
    if (max != null && circulation > max) return true;
    return false;
  }, [autoMachine, circulation]);

  // Причина выбора A2+ (габарит изделия / большой тираж листов)
  const a2Reason = useMemo<null | "size" | "volume">(() => {
    if (!preResult || "error" in preResult || !autoMachine) return null;
    const isA2 =
      Math.max(autoMachine.max_format_width, autoMachine.max_format_height) === 720 &&
      Math.min(autoMachine.max_format_width, autoMachine.max_format_height) === 520;
    if (!isA2) return null;
    const w = preResult.layout.printFormat.width;
    const h = preResult.layout.printFormat.height;
    const fitsA3plus = Math.max(w, h) <= 520 && Math.min(w, h) <= 360;
    if (!fitsA3plus) return "size";
    if (preResult.printSheets > 10000) return "volume";
    return null;
  }, [preResult, autoMachine]);

  // Toast при смене авто-машины
  const prevMachineId = useRef<string | null>(null);
  useEffect(() => {
    if (advancedMode) return;
    const id = autoMachine?.id ?? null;
    if (prevMachineId.current && id && prevMachineId.current !== id) {
      const t = autoMachine?.machine_type === "digital" ? "цифра" : "офсет";
      toast.info(`Машина: ${autoMachine?.name} (${t}) — по тиражу ${circulation}`);
    }
    prevMachineId.current = id;
  }, [autoMachine?.id, advancedMode, circulation]);

  // Финальный расчёт с подставленной ценой оттиска (либо авто, либо ручной из equipment)
  const baseResult = useMemo(() => {
    if (!calcInput) return null;
    const cpi = advancedMode
      ? selectedEquipment?.cost_per_impression
        ? Number(selectedEquipment.cost_per_impression)
        : undefined
      : autoMachine?.cost_per_impression;
    try {
      return runCalculation({ ...calcInput, printCostPerImpression: cpi });
    } catch (e: any) {
      return { error: e.message } as any;
    }
  }, [calcInput, advancedMode, selectedEquipment, autoMachine]);

  // Авто-включение «форменных» операций из справочника (Допечать → Формы).
  // Чтобы пользователю не приходилось вручную ставить галочку «Вывод форм CTP».
  useEffect(() => {
    if (!operations.length) return;
    const forms = baseResult && !("error" in baseResult) ? (baseResult.forms ?? 0) : 0;
    const printSheets = baseResult && !("error" in baseResult) ? (baseResult.printSheets ?? 0) : 0;
    const qtyForUnit = (unit: string | null): number => {
      if (unit === "лист" || unit === "оттиск" || unit === "сгиб") return printSheets || circulation || 1;
      if (unit === "форма") return forms || 1;
      return circulation || 1;
    };
    const matchers: Array<(op: OperationRow) => boolean> = [
      // Допечать → Формы (Вывод форм CTP)
      (op) => {
        if (forms <= 0) return false;
        const sub = (op.subgroup || "").toLowerCase();
        const name = (op.name || "").toLowerCase();
        return (op.category || "").toLowerCase() === "prepress" && (sub.includes("форм") || name.includes("вывод форм"));
      },
    ];
    const autoOps = operations.filter((op) => matchers.some((m) => m(op)));
    if (!autoOps.length) return;
    setExtraOps((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const op of autoOps) {
        if (userRemovedOpIds.has(op.id)) continue;
        if (!next[op.id]) {
          const q = qtyForUnit(op.unit);
          if (q > 0) {
            next[op.id] = { qty: q };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [operations, baseResult, userRemovedOpIds, circulation]);

  // Доп. строки спецификации из выбранных операций справочника
  const extraSpecItems = useMemo(() => {
    return Object.entries(extraOps)
      .flatMap(([id, st]) => {
        const op = operations.find((o) => o.id === id);
        if (!op || !st.qty) return [];
        const stage = (op.category as any) || "postpress";
        const items: any[] = [];
        const setup = Number(op.fixed_cost || 0);
        const price = Number(op.variable_cost || 0);
        const minCost = Number(op.min_cost || 0);
        if (setup > 0) {
          items.push({
            stage,
            name: `${op.name} (приладка)`,
            quantity: 1,
            unit: "шт",
            unitPrice: setup,
            total: setup,
          });
        }
        items.push({
          stage,
          name: op.name,
          quantity: st.qty,
          unit: op.unit || "шт",
          unitPrice: price,
          total: st.qty * price,
        });
        // Добор до минимальной стоимости работы (если задана в справочнике)
        const sumSoFar = items.reduce((s, i) => s + i.total, 0);
        if (minCost > 0 && sumSoFar < minCost) {
          items.push({
            stage,
            name: `${op.name} (добор до мин. стоимости)`,
            quantity: 1,
            unit: "шт",
            unitPrice: minCost - sumSoFar,
            total: minCost - sumSoFar,
          });
        }
        return items;
      })
      ;
  }, [extraOps, operations]);

  // Итоговый result со склеенной спецификацией и пересчитанной суммой
  // Авто-значения переменных формулы (как вычисляет калькулятор)
  const autoVars = useMemo<Record<string, number>>(() => {
    if (!baseResult || "error" in baseResult) return {};
    const layout = baseResult.layout;
    const itemsPerSheet = layout?.itemsPerSheet ?? 0;
    const printSheets = baseResult.printSheets ?? 0;
    const setupSheets = baseResult.setupSheets ?? 0;
    const cutsPerSheet = (baseResult as any).cutInfo?.cutsPerSheet ?? 0;
    const sheetAreaM2 = ((layout?.printFormat?.width ?? 0) * (layout?.printFormat?.height ?? 0)) / 1_000_000;
    // Каноническая цена листа: фактическая, попавшая в себестоимость
    // (paperCost / purchaseSheets). Учитывает автоподбор пары формат/материал.
    const purchaseSheets = baseResult.purchaseSheets ?? 0;
    const paperPricePerSheet = purchaseSheets > 0
      ? (baseResult.paperCost ?? 0) / purchaseSheets
      : ((effectiveMaterial as any)?.cost_per_sheet ?? 0);
    return {
      тираж: circulation,
      кол_форм: baseResult.forms ?? 0,
      кол_красок: colorFront + colorBack,
      сторон: colorBack > 0 ? 2 : 1,
      печ_листов: printSheets,
      закуп_листов: baseResult.purchaseSheets ?? 0,
      // Резов на один печатный лист. Итог по тиражу = кол_резов × печ_листов.
      кол_резов: cutsPerSheet,
      кол_блоков: 0,
      площадь_печати: sheetAreaM2 * printSheets,
      приладка: setupSheets,
      плотность: (effectiveMaterial as any)?.density ?? 0,
      бумага_цена: paperPricePerSheet,
      изделий_на_листе: itemsPerSheet,
      лист_площадь: sheetAreaM2,
      приладка_тираж: circulation + setupSheets * itemsPerSheet,
    };
  }, [baseResult, circulation, colorFront, colorBack, effectiveMaterial]);

  const result = useMemo(() => {
    if (!baseResult || "error" in baseResult) return baseResult;
    const forms = baseResult.forms ?? 0;
    const printSheets = baseResult.printSheets ?? 0;
    const formSetupItems: SpecItem[] =
      formSetupCostPerForm > 0 && forms > 0
        ? [{
            stage: "print",
            name: "Приладка форм при печати",
            quantity: forms,
            unit: "форма",
            unitPrice: formSetupCostPerForm,
            total: forms * formSetupCostPerForm,
          }]
        : [];
    // Доработка 5: единая «Биговка/Фальцовка» по плотности бумаги.
    const density = Number((effectiveMaterial as any)?.density ?? 0);
    const foldItems: SpecItem[] = (() => {
      if (!(foldsPerItem > 0) || !(circulation > 0)) return [];
      const isFold = !(density > 150); // ≤150 г/м² → фальцовка
      const unitPrice = isFold ? 1 : 2;
      const label = isFold ? "Фальцовка (≤150 г/м²)" : "Биговка (>150 г/м²)";
      const qty = foldsPerItem * circulation;
      return [{ stage: "postpress", name: label, quantity: qty, unit: "сгиб", unitPrice, total: qty * unitPrice }];
    })();
    // Доработка 7: единая «Высечка» с авто-ценой по типу материала + приладка + (опц.) штамп.
    const dieCutItems: SpecItem[] = (() => {
      if (!dieCutEnabled || !(printSheets > 0)) return [];
      const price = pickDieCutPrice(effectiveMaterial);
      const items: SpecItem[] = [
        { stage: "postpress", name: "Высечка (приладка)", quantity: 1, unit: "шт", unitPrice: 5000, total: 5000 },
        { stage: "postpress", name: `Высечка (${dieCutMaterialLabel(effectiveMaterial)})`, quantity: printSheets, unit: "лист", unitPrice: price, total: printSheets * price },
      ];
      if (dieCutStampMode === "new" && dieCutStampCost > 0) {
        items.push({ stage: "postpress", name: "Изготовление штампа для высечки", quantity: 1, unit: "шт", unitPrice: dieCutStampCost, total: dieCutStampCost });
      }
      return items;
    })();
    const allExtras = [...extraSpecItems, ...catalogOpsItems, ...formSetupItems, ...foldItems, ...dieCutItems];
    let spec = allExtras.length ? [...baseResult.spec, ...allExtras] : baseResult.spec;
    const extrasTotal = allExtras.reduce((s: number, i: any) => s + i.total, 0);
    let totalCost = baseResult.totalCost + extrasTotal;
    let variantApplied: null | { name: string; total: number; stages: Array<{ name: string; unit: string; value: number; formulaText: string }> } = null;
    let variantWarning: string | null = null;

    // Если в справочнике задана активная формула — применяем её к итоговой себестоимости
    if (useVariantOverride && activeVariantFull && activeVariantFull.stages?.length) {
      try {
        const vars: Record<string, number> = { ...autoVars };
        for (const [k, v] of Object.entries(variableOverrides)) {
          if (Number.isFinite(v)) vars[k] = v;
        }
        // Системные значения из движка для source="system"
        const postpressTotal = (baseResult.postpress || []).reduce((s: number, x: any) => s + (x.total || 0), 0);
        const prepressTotal = (baseResult.prepress || []).reduce((s: number, x: any) => s + (x.total || 0), 0);
        const systemValues: Record<string, number> = {
          paper_cost: baseResult.paperCost ?? 0,
          paper_cut_cost: baseResult.paperCutCost ?? 0,
          print_cost: baseResult.printCost ?? 0,
          forms_cost: baseResult.formsCost ?? 0,
          forms_prep_cost: baseResult.formsPrepCost ?? 0,
          ink_cost: baseResult.inkCost ?? 0,
          postpress_total: postpressTotal,
          cuts_total: (baseResult as any).cutInfo?.total ?? 0,
          prepress_total: prepressTotal,
        };
        // Предварительная диагностика ссылок формулы
        const refs = collectStageRefs(activeVariantFull.stages);
        const unknownVars = [...refs.vars].filter((v) => !VARIABLE_KEYS.has(v));
        const unknownConsts = [...refs.consts].filter((s) => !(s in variantConstants));
        const zeroVars = [...refs.vars].filter((v) => VARIABLE_KEYS.has(v) && !(vars[v] > 0));

        const run = runVariantFormula(activeVariantFull, {
          vars,
          consts: variantConstants,
          systemValues,
          materials: variantMaterials,
        });
        const overrideKeys = Object.keys(variableOverrides).filter((k) => refs.vars.has(k));
        variantApplied = { name: activeVariantFull.name, total: run.total, stages: run.stages };
        // Smart-merge: формула ДОПОЛНЯЕТ авто-расчёт. Если этап формулы покрывает
        // какой-то блок (например, «Резка» / «Печать» / «Бумага») — удаляем
        // соответствующие строки из базовой спецификации, чтобы не было дубля.
        // Покрытие — теги для smart-merge.
        // Резку специально разделяем на закуп→печатный и печатный→готовый,
        // иначе одна формула «резка на готовый» съедает обе строки base spec.
        const COVERAGE: Array<{ rx: RegExp; tag: string }> = [
          { rx: /резк[аи]?[^.]{0,40}(закуп|на\s+печат|печатн\w*\s+форм)/i, tag: "cut_to_print" },
          { rx: /резк[аи]?[^.]{0,40}(готов|конеч|издели|на\s+готов)/i,      tag: "cut_to_final" },
          { rx: /резк/i,                                                    tag: "cut_any" },
          { rx: /печат/i,                tag: "print" },
          { rx: /бумаг/i,                tag: "paper" },
          { rx: /(упаков|логист)/i,      tag: "packing" },
          { rx: /(форм(ы|а)?|пластин)/i, tag: "forms" },
          { rx: /приладк/i,              tag: "prep" },
          { rx: /краск/i,                tag: "ink" },
          { rx: /ламин/i,                tag: "lam" },
          { rx: /тисн/i,                 tag: "stamp" },
          { rx: /конгрев/i,              tag: "emboss" },
          { rx: /(вырубк|биговк|нумерац|фальцовк)/i, tag: "postpress_other" },
        ];
        const stageTags = (name: string): Set<string> => {
          const t = new Set<string>();
          for (const c of COVERAGE) if (c.rx.test(name)) t.add(c.tag);
          // Уточняем: если уже определили конкретный под-тег резки — общий "cut_any"
          // не нужен (иначе он съест и парную строку base).
          if ((t.has("cut_to_print") || t.has("cut_to_final")) && t.has("cut_any")) t.delete("cut_any");
          return t;
        };
        const covered = new Set<string>();
        run.stages.forEach((st: any) => {
          if (st.source === "system" && st.systemKey) {
            // системные ключи → теги
            const map: Record<string, string> = {
              paper_cost: "paper",
              paper_cut_cost: "cut_to_print",
              print_cost: "print",
              forms_cost: "forms",
              forms_prep_cost: "prep",
              ink_cost: "ink",
              postpress_total: "postpress_other",
              cuts_total: "cut_to_final",
              prepress_total: "prep",
            };
            const t = map[st.systemKey];
            if (t) covered.add(t);
          } else {
            stageTags(st.name || "").forEach((t) => covered.add(t));
          }
        });
        // Сопоставление тег base-строки → какие covered-теги должны её удалить.
        const removalMatch = (baseTag: string): boolean => {
          if (baseTag === "cut_to_print") return covered.has("cut_to_print") || covered.has("cut_any");
          if (baseTag === "cut_to_final") return covered.has("cut_to_final") || covered.has("cut_any");
          if (baseTag === "cut_any")      return covered.has("cut_to_print") || covered.has("cut_to_final") || covered.has("cut_any");
          return covered.has(baseTag);
        };
        // Фильтруем базовую спецификацию: убираем то, что покрыто формулой
        const filteredBase = baseResult.spec.filter((it: any) => {
          const tags = stageTags(it.name || "");
          for (const t of tags) if (removalMatch(t)) return false;
          return true;
        });
        const removedTotal = baseResult.spec
          .filter((it: any) => !filteredBase.includes(it))
          .reduce((s: number, it: any) => s + (it.total || 0), 0);
        // Себестоимость = базовая − убранное + формула + допоперации
        totalCost = (baseResult.totalCost - removedTotal) + run.total + extrasTotal;
        // Маппинг тегов этапа в группу спецификации (для PriceBreakdownTree).
        const TAG_TO_STAGE: Record<string, string> = {
          paper: "material",
          cut_to_print: "prepress",
          forms: "prepress",
          prep: "prepress",
          ink: "prepress",
          print: "print",
          cut_to_final: "postpress",
          cut_any: "postpress",
          lam: "postpress",
          stamp: "postpress",
          emboss: "postpress",
          postpress_other: "postpress",
          packing: "logistics",
        };
        const stageForFormulaItem = (st: any): string => {
          if (st.source === "material") return "material";
          if (st.source === "system" && st.systemKey) {
            const sysMap: Record<string, string> = {
              paper_cost: "material",
              paper_cut_cost: "prepress",
              print_cost: "print",
              forms_cost: "prepress",
              forms_prep_cost: "prepress",
              ink_cost: "prepress",
              postpress_total: "postpress",
              cuts_total: "postpress",
              prepress_total: "prepress",
            };
            return sysMap[st.systemKey] || "postpress";
          }
          const tags = stageTags(st.name || "");
          for (const t of tags) if (TAG_TO_STAGE[t]) return TAG_TO_STAGE[t];
          return "postpress";
        };
        // Этапы формулы — отдельные строки, дописываются к отфильтрованной спецификации
        const formulaSpec = run.stages.map((st: any) => ({
          stage: stageForFormulaItem(st) as any,
          name: st.source === "material" && st.materialName
            ? `${st.name} · ${st.materialName}`
            : `${st.name} (формула)`,
          quantity: st.source === "material" ? (st.qty ?? 1) : 1,
          unit: st.unit || (st.source === "material" ? "лист" : "₸"),
          unitPrice: st.source === "material" ? (st.unitPrice ?? 0) : st.value,
          total: st.value,
        }));
        spec = allExtras.length
          ? [...filteredBase, ...formulaSpec, ...allExtras]
          : [...filteredBase, ...formulaSpec];

        if (unknownVars.length) {
          variantWarning = `Формула «${activeVariantFull.name}» использует неизвестные переменные: ${unknownVars.join(", ")}. Откройте формулу и исправьте.`;
        } else if (unknownConsts.length) {
          variantWarning = `Формула «${activeVariantFull.name}» ссылается на отсутствующие константы: @${unknownConsts.join(", @")}. Создайте их в справочнике.`;
        } else if (run.total <= 0 && zeroVars.length) {
          variantWarning = `Формула вернула 0. Возможно, ещё не определены значения для: ${zeroVars.join(", ")} (заполните данные на шагах 1–4).`;
        } else if (run.total <= 0) {
          variantWarning = `Формула «${activeVariantFull.name}» вернула 0 — проверьте этапы и константы.`;
        } else {
          const stageWarn = (run.stages as any[]).find((s) => s.warning)?.warning;
          if (stageWarn) variantWarning = stageWarn;
          else if (overrideKeys.length) variantWarning = `Применены ручные значения переменных: ${overrideKeys.join(", ")}.`;
        }
      } catch (e: any) {
        variantWarning = `Ошибка применения формулы: ${e?.message || "неизвестно"}. Используется системный расчёт.`;
      }
    } else if (useVariantOverride && activeVariant && !activeVariantFull) {
      variantWarning = "Активная формула не загрузилась. Проверьте справочник.";
    } else if (useVariantOverride && activeVariantFull && !activeVariantFull.stages?.length) {
      variantWarning = `В формуле «${activeVariantFull.name}» нет ни одного этапа. Добавьте этапы в редакторе.`;
    }

    const vatAmount = totalCost * ((baseResult.vatPercent || 0) / 100);
    return {
      ...baseResult,
      spec,
      totalCost,
      vatAmount,
      totalWithVat: totalCost + vatAmount,
      variantApplied,
      variantWarning,
    };
  }, [baseResult, extraSpecItems, catalogOpsItems, formSetupCostPerForm, foldsPerItem, circulation, effectiveMaterial, dieCutEnabled, dieCutStampMode, dieCutStampCost, useVariantOverride, activeVariant, activeVariantFull, variantConstants, variantMaterials, autoVars, variableOverrides, colorBack]);

  // Подсказка в расширенном режиме: если автоподбор материала дешевле выбранного
  const suggestionHint = useMemo(() => {
    if (!advancedMode || !material || !preResult || "error" in preResult) return null;
    const cat = inferCategory(material.type);
    const pf = preResult.layout.printFormat;
    const better = autoPickPurchase(pf.width, pf.height, cat);
    if (!better) return null;
    if (better.width === material.format_width && better.height === material.format_height) return null;
    return `Для печатного формата ${pf.width}×${pf.height} оптимальнее закупочный ${better.width}×${better.height} (вместо ${material.format_width}×${material.format_height}).`;
  }, [advancedMode, material, preResult, purchaseFormats]);

  const goto = (n: number) => {
    setStep(n);
    setMaxReached((m) => Math.max(m, n));
    // Все шаги отображаются одновременно — просто скроллим к нужной секции
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(`section-${n}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const next = () => goto(Math.min(6, step + 1));
  const prev = () => goto(Math.max(1, step - 1));

  const totalCost = result && !("error" in result) ? result.totalCost : 0;
  const priceBeforeVat = totalCost * (1 + margin / 100);
  const vatAmount = priceBeforeVat * (vatPercent / 100);
  const salePrice = priceBeforeVat + vatAmount;
  const profit = priceBeforeVat - totalCost;

  // Validations per step
  const stepError = useMemo(() => {
    if (step >= 1 && (!circulation || circulation < 1)) return "Укажите тираж больше 0";
    if (step >= 1 && (!dims.w || !dims.h || dims.w < 10 || dims.h < 10)) return "Укажите корректный формат";
    const gItem = glossary.find((g) => g.slug === glossarySlug);
    if (step >= 1 && gItem && !gItem.is_calculable) return `«${gItem.name}» — расчёт по запросу. Свяжитесь с менеджером.`;
    if (step >= 2 && advancedMode && !materialId) return "Выберите материал";
    if (step >= 2 && !advancedMode && !effectiveMaterial) return "Не найден материал. Добавьте бумагу нужной категории/плотности в справочник.";
    if (selectedEquipment && selectedEquipment.max_format_width && selectedEquipment.max_format_height) {
      const fitW = Math.max(dims.w, dims.h);
      const machineMax = Math.max(selectedEquipment.max_format_width, selectedEquipment.max_format_height);
      if (fitW > machineMax) return `Формат превышает возможности машины ${selectedEquipment.name}`;
    }
    return null;
  }, [step, circulation, dims, materialId, selectedEquipment]);

  const save = async (asTemplate = false) => {
    if (!result || "error" in result || !calcInput || !effectiveMaterial) return;
    // --- Валидация ключевых числовых полей перед сохранением ---
    const checks: Array<[ReturnType<typeof circulationSchema.safeParse>, string]> = [
      [circulationSchema.safeParse(circulation), "Тираж: 1 – 10 000 000"],
      [colorSchema.safeParse(colorFront), "Цветность лицо: 0 – 8"],
      [colorSchema.safeParse(colorBack), "Цветность оборот: 0 – 8"],
      [formatDimSchema.safeParse(dims.w), "Ширина формата: 1 – 2000 мм"],
      [formatDimSchema.safeParse(dims.h), "Высота формата: 1 – 2000 мм"],
    ];
    for (const [check, msg] of checks) {
      if (!check.success) { toast.error(msg); return; }
    }
    setSaving(true);
    const payload = {
      name: name || `${PRODUCT_OPTIONS.find((p) => p.value === productType)?.label} ${formatType} ${colorFront}+${colorBack}, тираж ${circulation}`,
      product_type: productType,
      category: PRODUCT_OPTIONS.find((p) => p.value === productType)?.category || "sheet",
      circulation,
      format_type: formatType,
      format_width: dims.w,
      format_height: dims.h,
      color_front: colorFront,
      color_back: colorBack,
      material_id: advancedMode ? materialId : effectiveMaterial.id,
      equipment_id: advancedMode ? (equipmentId || null) : null,
      print_cost_per_impression: advancedMode
        ? (selectedEquipment?.cost_per_impression ?? null)
        : (autoMachine?.cost_per_impression ?? null),
      print_format_width: result.layout.printFormat.width,
      print_format_height: result.layout.printFormat.height,
      purchase_format_width: (manualPair?.purchase ?? autoPickedPurchase ?? { width: effectiveMaterial.format_width }).width,
      purchase_format_height: (manualPair?.purchase ?? autoPickedPurchase ?? { height: effectiveMaterial.format_height }).height,
      items_per_sheet: result.layout.itemsPerSheet,
      is_rotated: result.layout.rotated,
      turnaround_type: result.turnaround,
      forms_count: result.forms,
      forms_cost: result.formsCost,
      forms_prep_cost: result.formsPrepCost,
      setup_sheets: result.setupSheets,
      purchase_sheets: result.purchaseSheets,
      paper_cost: result.paperCost,
      paper_cut_cost: result.paperCutCost,
      print_sheets: result.printSheets,
      print_cost: result.printCost,
      ink_cost: result.inkCost,
      postpress: result.postpress as any,
      total_cost: totalCost,
      margin_percent: margin,
      sale_price: salePrice,
      profit,
      is_template: asTemplate,
    };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Сессия истекла, войдите заново");
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.from("calculations").insert({ ...payload, user_id: user.id }).select("id").single();
    if (error) {
      toast.error("Ошибка сохранения: " + error.message);
      setSaving(false);
      return;
    }
    if (data) {
      const items = result.spec.map((s, i) => ({
        calculation_id: data.id,
        stage: s.stage,
        sort_order: i,
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        unit_price: s.unitPrice,
        total_price: s.total,
      }));
      await supabase.from("calculation_items").insert(items);
    }
    toast.success(asTemplate ? "Шаблон сохранён" : "Расчёт сохранён");
    setSaving(false);
    navigate("/");
  };

  const applyAiOrder = (o: ParsedOrder) => {
    const ptMap: Record<string, ProductType> = {
      leaflet: "leaflet",
      flyer: "leaflet",
      booklet: "booklet",
      business_card: "businesscard",
      poster: "poster",
      brochure: "brochure",
    };
    if (o.product_type && ptMap[o.product_type]) setProductType(ptMap[o.product_type]);
    if (o.name) setName(o.name);
    if (typeof o.circulation === "number" && o.circulation > 0) setCirculation(o.circulation);
    if (o.format) {
      const allowed = ["A3", "A4", "A5", "A6", "custom"] as const;
      if ((allowed as readonly string[]).includes(o.format)) setFormatType(o.format as FormatType);
    }
    if (typeof o.custom_width_mm === "number") setCustomW(o.custom_width_mm);
    if (typeof o.custom_height_mm === "number") setCustomH(o.custom_height_mm);
    if (typeof o.color_front === "number") setColorFront(o.color_front);
    if (typeof o.color_back === "number") setColorBack(o.color_back);
    if (o.material_category) setMaterialCategory(o.material_category);
    if (typeof o.material_density === "number") setMaterialDensity(o.material_density);
    if (o.material_id && materials.some((m) => m.id === o.material_id)) {
      setMaterialId(o.material_id);
    }
    if (typeof o.has_fold === "boolean") setHasFold(o.has_fold);
    if (typeof o.fold_count === "number") setFoldCount(o.fold_count);
    if (typeof o.has_die_cut === "boolean") setHasDieCut(o.has_die_cut);
    if (typeof o.has_lamination === "boolean") setHasLamination(o.has_lamination);
    if (o.lamination_film === "gloss" || o.lamination_film === "matte" || o.lamination_film === "velvet") setLaminationFilm(o.lamination_film);
    if (o.lamination_sides === 1 || o.lamination_sides === 2) setLaminationSides(o.lamination_sides);
    if (typeof o.has_numbering === "boolean") setHasNumbering(o.has_numbering);
    if (typeof o.has_stamping === "boolean") setHasStamping(o.has_stamping);
    if (typeof o.margin_percent === "number") setMargin(o.margin_percent);
  };

  // Apply prefill from /ai-calc once on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ai-calc-prefill");
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParsedOrder;
      // Если префилл содержит material_id, но материалы ещё не загружены — ждём
      if (parsed.material_id && !materials.some((m) => m.id === parsed.material_id)) {
        if (materials.length === 0) return; // повторим, когда materials появятся
      }
      sessionStorage.removeItem("ai-calc-prefill");
      applyAiOrder(parsed);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials]);

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar pb-32 md:pb-0">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">Все расчёты</span>
          </Link>
          {/* Контекстная сводка: что считаем + текущий итог */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground min-w-0 ml-2">
            <span className="px-2 py-0.5 rounded-full bg-secondary/60 text-foreground font-medium truncate max-w-[180px]">
              {PRODUCT_OPTIONS.find((p) => p.value === productType)?.label}
            </span>
            <span className="opacity-60">·</span>
            <span className="tabular-nums">{fmtNum(circulation)} шт</span>
            <span className="opacity-60">·</span>
            <span>{formatType === "custom" ? `${dims.w}×${dims.h}` : formatType}</span>
            <span className="opacity-60">·</span>
            <span>{colorFront}{colorBack ? `+${colorBack}` : ""}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <AiOrderAssistant onApply={applyAiOrder} />
            {result && !("error" in result) ? (
              <div className="hidden sm:flex items-center gap-3 text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">С/с</div>
                  <div className="text-sm font-semibold tabular-nums">{fmtMoney(totalCost)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Цена</div>
                  <div className="text-sm font-bold text-primary tabular-nums">{fmtMoney(salePrice)}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Новый расчёт</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="step-anchor" className="container mx-auto py-3 sm:py-6 px-4 scroll-mt-20">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4 lg:order-1 order-1">
            <section id="section-1" className="scroll-mt-24">
              <Card>
                <CardHeader><CardTitle>1. Продукция и параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Название расчёта</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Авто, если оставить пустым" />
                  </div>
                  <div>
                    <Label>
                      Вид продукции
                      <HelpHint title="Вид продукции" learnMore="calc-product">
                        Определяет автопресет постпечати и геометрию плитки в превью раскладки. Выберите ближайший по типу.
                      </HelpHint>
                    </Label>
                    <Select value={glossarySlug} onValueChange={setGlossarySlug}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {(Object.keys(CATEGORY_LABELS) as GlossaryCategory[]).map((cat) => {
                          const its = glossary.filter((g) => g.category === cat);
                          if (!its.length) return null;
                          return (
                            <Fragment key={cat}>
                              <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                {CATEGORY_LABELS[cat]}
                              </div>
                              {its.map((g) => (
                                <SelectItem key={g.slug} value={g.slug}>
                                  <span>{g.name}</span>
                                  {!g.is_calculable && <span className="ml-2 text-[10px] text-muted-foreground">(по запросу)</span>}
                                </SelectItem>
                              ))}
                            </Fragment>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const it = glossary.find((g) => g.slug === glossarySlug);
                      if (!it) return null;
                      return (
                        <div className="mt-1.5 text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="flex-1">{it.description}</span>
                          <HelpHint title={it.name}>{it.description}</HelpHint>
                        </div>
                      );
                    })()}
                    <div className="mt-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-[11px] flex items-center gap-2">
                      {activeVariant ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            {useVariantOverride ? "Применяется формула:" : "Формула отключена:"}
                          </span>
                          <Link to={`/references/variants/${activeVariant.id}`} className="font-medium text-foreground hover:underline truncate">
                            {activeVariant.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setUseVariantOverride((v) => !v)}
                            className="ml-auto text-primary hover:underline shrink-0"
                          >
                            {useVariantOverride ? "Отключить" : "Включить"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVariantReloadTick((t) => t + 1)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            title="Перечитать формулу из справочника"
                          >
                            ↻
                          </button>
                          <FormulaWizard
                            variant={activeVariantFull}
                            constants={variantConstants}
                            autoVars={autoVars}
                            overrides={variableOverrides}
                            onChangeOverrides={setVariableOverrides}
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground">Своя формула не задана — используется системный алгоритм.</span>
                          <Link to="/references/variants" className="ml-auto text-primary hover:underline shrink-0">Выбрать</Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>
                      Тираж, шт
                      <HelpHint title="Тираж" learnMore="calc-sheets">
                        Сколько готовых изделий нужно. От тиража напрямую зависит число тиражных листов.
                      </HelpHint>
                    </Label>
                    <Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(Number(e.target.value) || 0)} />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[100, 500, 1000, 2000, 5000, 10000].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCirculation(n)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs border transition-colors",
                            circulation === n
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                          )}
                        >
                          {n >= 1000 ? `${n / 1000}k` : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>
                      Формат
                      <HelpHint title="Формат изделия" learnMore="calc-product">
                        Размер готового изделия. «Нестандартный» — задайте ширину и высоту вручную.
                      </HelpHint>
                    </Label>
                    <Select value={formatType} onValueChange={(v) => setFormatType(v as FormatType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f === "custom" ? "Нестандартный" : f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {formatType === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} /></div>
                      <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} /></div>
                    </div>
                  )}
                  <div>
                    <Label>
                      Наценка, %
                      <HelpHint title="Наценка" learnMore="calc-margin">
                        Можно ввести вручную или поменять слайдером в итогах справа. Цена без НДС = себестоимость × (1 + наценка/100).
                      </HelpHint>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      value={margin}
                      onChange={(e) => setMargin(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[10, 20, 30, 40, 50, 70, 100].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMargin(m)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs border transition-colors",
                            margin === m
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                          )}
                        >
                          {m}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>
                      Красочность
                      <HelpHint title="Красочность" learnMore="calc-forms">
                        Сколько красок на лицо/оборот. CMYK = 4, моно = 1. 0 на обороте — печать только с лица.
                      </HelpHint>
                    </Label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[
                        { f: 4, b: 4, label: "4+4 CMYK двусторонний" },
                        { f: 4, b: 0, label: "4+0 CMYK односторонний" },
                        { f: 4, b: 1, label: "4+1" },
                        { f: 1, b: 1, label: "1+1 моно" },
                        { f: 1, b: 0, label: "1+0 моно" },
                      ].map((p) => {
                        const active = colorFront === p.f && colorBack === p.b;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => { setColorFront(p.f); setColorBack(p.b); }}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs border transition-colors",
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                            )}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Лицо</Label>
                        <Input type="number" min={1} max={10} value={colorFront} onChange={(e) => setColorFront(Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Оборот (0 = без)</Label>
                        <Input type="number" min={0} max={10} value={colorBack} onChange={(e) => setColorBack(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="section-2" className="scroll-mt-24">
              <Card>
                <CardHeader><CardTitle>2. Бумага</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                    <div>
                      <div className="text-sm font-medium">Расширенный режим</div>
                      <div className="text-xs text-muted-foreground">Ручной выбор бумаги и оборудования</div>
                    </div>
                    <Checkbox checked={advancedMode} onCheckedChange={(v) => setAdvancedMode(!!v)} />
                  </div>

                  {!advancedMode && (
                    <>
                      <div>
                        <Label>
                          Тип материала
                          <HelpHint title="Тип материала" learnMore="calc-material">
                            Закупочный формат и печатная машина подбираются автоматически.
                          </HelpHint>
                        </Label>
                        <div className="mt-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {MATERIAL_CATEGORIES.map((c) => {
                            const active = materialCategory === c.value;
                            return (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => setMaterialCategory(c.value)}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm transition-all text-left",
                                  active
                                    ? "border-primary bg-primary/10 text-foreground shadow-card"
                                    : "bg-card hover:border-primary/40 hover:bg-muted/40 text-muted-foreground"
                                )}
                              >
                                {active && <CheckIcon className="inline h-3 w-3 mr-1 text-primary" />}
                                {c.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <Label>Плотность, г/м²</Label>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {[null, 80, 90, 115, 130, 150, 170, 200, 250, 300, 350].map((d, i) => {
                            const active = (d === null && materialDensity === "") || materialDensity === d;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setMaterialDensity(d === null ? "" : d)}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs border transition-colors",
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                                )}
                              >
                                {d === null ? "Любая" : d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {effectiveMaterial ? (
                        <div className="rounded-md border bg-card p-3 text-sm space-y-1">
                          <div className="font-medium">{effectiveMaterial.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Закупочный формат:{" "}
                            {autoPickedPurchase
                              ? `${autoPickedPurchase.width}×${autoPickedPurchase.height}`
                              : `${effectiveMaterial.format_width}×${effectiveMaterial.format_height}`}{" "}
                            мм · {fmtMoney(effectiveMaterial.cost_per_sheet)}/лист
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">авто</span>
                          </div>
                          {preResult && !("error" in preResult) && autoMachine && (
                            <div className="text-xs text-muted-foreground">
                              Авто-машина: <span className="text-foreground font-medium">{autoMachine.name}</span>
                              {autoMachine.machine_type && (
                                <span className={`ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${autoMachine.machine_type === "digital" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                                  {autoMachine.machine_type === "digital" ? "цифра" : "офсет"}
                                </span>
                              )}
                              {" · "}печатный лист {preResult.layout.printFormat.width}×{preResult.layout.printFormat.height} · {fmtMoney(autoMachine.cost_per_impression)}/оттиск
                              {a2Reason && (
                                <div className="text-[11px] text-primary">
                                  Переключено на A2+: {a2Reason === "size" ? "формат изделия > 520×360" : `тираж листов > 10000 (${fmtNum(preResult.printSheets)})`}
                                </div>
                              )}
                              {(autoMachine.min_circulation != null || autoMachine.max_circulation != null) && (
                                <div
                                  className={cn(
                                    "text-[11px]",
                                    circulationOutOfRange
                                      ? "mt-1 inline-flex items-start gap-1 rounded border border-warning/40 bg-warning/10 px-2 py-1 text-warning"
                                      : "text-muted-foreground/80"
                                  )}
                                >
                                  {circulationOutOfRange && <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />}
                                  <span>
                                    Подходит для тиража: {autoMachine.min_circulation ?? 0}
                                    {autoMachine.max_circulation != null ? `–${autoMachine.max_circulation}` : "+"}
                                    {" · "}выбрано: тираж {circulation}
                                    {circulationOutOfRange && (
                                      <>
                                        . Тираж {circulation} выходит за рекомендуемый диапазон —
                                        согласуйте с производством или выберите другую машину.
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                              {autoMachinePick.source === "rule" && (
                                <div className="text-[11px] text-primary">Подбор по правилу справочника</div>
                              )}
                              {autoMachinePick.source === "fallback" && (
                                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-warning">
                                  <AlertTriangle className="h-3 w-3" />
                                  Нет правила для тиража {circulation} — выбрана по формату
                                </div>
                              )}
                            </div>
                          )}
                          {preResult && !("error" in preResult) && !autoMachine && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              Не нашли машину под формат {preResult.layout.printFormat.width}×{preResult.layout.printFormat.height} и тираж {circulation}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs">
                          В справочнике «Бумага» нет материала категории «{MATERIAL_CATEGORIES.find((c) => c.value === materialCategory)?.label}». Добавьте подходящую запись или включите расширенный режим.
                        </div>
                      )}
                    </>
                  )}

                  {advancedMode && (
                    <>
                      <div>
                        <Label>Материал</Label>
                        <Select value={materialId} onValueChange={setMaterialId}>
                          <SelectTrigger><SelectValue placeholder="Выберите бумагу" /></SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name} — {fmtMoney(m.cost_per_sheet)}/лист</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {material && (
                          <p className="mt-3 text-sm text-muted-foreground">Закупочный формат: {material.format_width}×{material.format_height} мм. Цена: {fmtMoney(material.cost_per_sheet)} за лист.</p>
                        )}
                      </div>
                      {suggestionHint && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                          <Sparkles className="inline h-3.5 w-3.5 mr-1 text-primary" />{suggestionHint}
                        </div>
                      )}
                      <div>
                        <Label>Печатная машина</Label>
                        <Select value={equipmentId} onValueChange={setEquipmentId}>
                          <SelectTrigger><SelectValue placeholder="Выберите оборудование" /></SelectTrigger>
                          <SelectContent>
                            {equipment.map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name} · до {eq.max_format_width}×{eq.max_format_height} · {fmtMoney(Number(eq.cost_per_impression || 0))}/оттиск
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedEquipment && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Макс. формат: {selectedEquipment.max_format_width}×{selectedEquipment.max_format_height} мм.
                            Цена оттиска: {fmtMoney(Number(selectedEquipment.cost_per_impression || 0))}.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            <section id="section-3" className="scroll-mt-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    3. Раскладка
                    <HelpHint title="Раскладка" learnMore="calc-layout">
                      Автоматически подбирается оптимальное число изделий на печатном листе с учётом поворота и полей.
                    </HelpHint>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-4">
                  {/* Переключатель Авто / Вручную */}
                  <Tabs
                    value={manualPair ? "manual" : "auto"}
                    onValueChange={(v) => {
                      if (v === "auto") setManualPair(null);
                      else if (!manualPair && formatPairs.length) {
                        // По умолчанию — текущая авто-пара
                        const cur = preResult && !("error" in preResult)
                          ? formatPairs.find(
                              (p) =>
                                p.print.width === preResult.layout.printFormat.width &&
                                p.print.height === preResult.layout.printFormat.height
                            )
                          : null;
                        setManualPair(cur ?? formatPairs[0]);
                      }
                    }}
                  >
                    <TabsList>
                      <TabsTrigger value="auto">Авто (рекомендовано)</TabsTrigger>
                      <TabsTrigger value="manual" disabled={!formatPairs.length}>Вручную</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {!manualPair && (
                    <div className="text-sm text-muted-foreground">
                      Система выбирает оптимальную пару (печатный + закупочный) исходя из формата изделия, тиража и приоритетных рабочих форматов.
                    </div>
                  )}

                  {manualPair && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Печатный формат</Label>
                        <Select
                          value={`${manualPair.print.width}x${manualPair.print.height}`}
                          onValueChange={(v) => {
                            const [w, h] = v.split("x").map(Number);
                            const first = formatPairs.find((p) => p.print.width === w && p.print.height === h);
                            if (first) setManualPair(first);
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              new Map(formatPairs.map((p) => [`${p.print.width}x${p.print.height}`, p.print])).values()
                            ).map((p) => {
                              const isPriority =
                                (p.width === 520 && p.height === 360) ||
                                (p.width === 460 && p.height === 320);
                              return (
                                <SelectItem key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                                  {p.width}×{p.height} мм {isPriority ? "★ рекомендуемый" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Закупочный формат</Label>
                        <Select
                          value={`${manualPair.purchase.width}x${manualPair.purchase.height}`}
                          onValueChange={(v) => {
                            const [w, h] = v.split("x").map(Number);
                            setManualPair({ ...manualPair, purchase: { width: w, height: h } });
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              new Map(
                                formatPairs
                                  .filter((p) => p.print.width === manualPair.print.width && p.print.height === manualPair.print.height)
                                  .map((p) => [`${p.purchase.width}x${p.purchase.height}`, p.purchase])
                              ).values()
                            ).map((p) => (
                              <SelectItem key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                                {p.width}×{p.height} мм
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between rounded-md border bg-muted/30 p-2">
                        <div className="text-xs text-muted-foreground">
                          Ручной режим: фильтр приоритетных форматов и «свой оборот» отключены.
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setManualPair(null)}>Сбросить к авто</Button>
                      </div>
                      {result && !("error" in result) && autoBaseResult && (
                        <div className="md:col-span-2 rounded-md border bg-card p-2 text-xs text-foreground">
                          {(() => {
                            const delta = result.totalCost - autoBaseResult.totalCost;
                            const sign = delta > 0 ? "+" : "";
                            const cls = delta > 0 ? "text-destructive" : delta < 0 ? "text-emerald-600" : "text-muted-foreground";
                            return (
                              <span>
                                Δ к авто:&nbsp;
                                <span className={cls + " font-medium"}>{sign}{fmtMoney(delta)}</span>
                                &nbsp;(авто: {fmtMoney(autoBaseResult.totalCost)} · {autoBaseResult.layout.printFormat.width}×{autoBaseResult.layout.printFormat.height})
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {result && "error" in result && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                      {result.error}
                    </div>
                  )}

                  {result && !("error" in result) && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-foreground">
                       <div className="rounded-md border bg-card p-2">
                         <div className="text-xs text-muted-foreground">Печатный формат</div>
                         <div className="text-sm font-medium flex items-center gap-2">
                           {result.layout.printFormat.width}×{result.layout.printFormat.height}
                         </div>
                       </div>
                       {(() => {
                         const pw = result.layout.printFormat.width;
                         const ph = result.layout.printFormat.height;
                         const options = Array.from(
                           new Map(
                             formatPairs
                               .filter((p) => p.print.width === pw && p.print.height === ph)
                               .map((p) => [`${p.purchase.width}x${p.purchase.height}`, p.purchase])
                           ).values()
                         );
                         const curPurchase = manualPair?.purchase
                           ?? autoPickedPurchase
                           ?? (effectiveMaterial
                             ? { width: effectiveMaterial.format_width, height: effectiveMaterial.format_height }
                             : null);
                         const curKey = curPurchase ? `${curPurchase.width}x${curPurchase.height}` : "";
                         const hasCurInOptions = options.some((o) => `${o.width}x${o.height}` === curKey);
                         return (
                           <div className="rounded-md border bg-card p-2 col-span-2 sm:col-span-1">
                             <div className="text-xs text-muted-foreground flex items-center justify-between">
                               <span>Закупочный формат</span>
                               {!manualPair && <span className="text-[10px] uppercase tracking-wide text-primary">авто</span>}
                             </div>
                             {options.length > 0 ? (
                               <Select
                                 value={curKey}
                                 onValueChange={(v) => {
                                   const [w, h] = v.split("x").map(Number);
                                   setManualPair({ print: { width: pw, height: ph }, purchase: { width: w, height: h } });
                                 }}
                               >
                                 <SelectTrigger className="h-8 mt-1 text-sm font-medium">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {!hasCurInOptions && curPurchase && (
                                     <SelectItem value={curKey}>
                                       {curPurchase.width}×{curPurchase.height} мм (текущий)
                                     </SelectItem>
                                   )}
                                   {options.map((o) => (
                                     <SelectItem key={`${o.width}x${o.height}`} value={`${o.width}x${o.height}`}>
                                       {o.width}×{o.height} мм
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             ) : (
                               <div className="text-sm font-medium mt-1">
                                 {curPurchase ? `${curPurchase.width}×${curPurchase.height} мм` : "—"}
                               </div>
                             )}
                           </div>
                         );
                       })()}
                      <Stat label="Тип оборота" value={result.turnaround === "none" ? "Без оборота" : result.turnaround === "own" ? "Свой" : "Чужой"} />
                      <Stat label="Форм" value={String(result.forms)} />
                      <Stat label="Приладка" value={`${result.setupSheets} л.`} />
                      <Stat label="Печатных листов" value={fmtNum(result.printSheets)} />
                      <Stat label="Закупочных листов" value={fmtNum(result.purchaseSheets)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section id="section-4" className="scroll-mt-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    4. Послепечатные операции
                    <HelpHint title="Постпечать" learnMore="calc-postpress">
                      Ламинация, фальцовка, высечка, нумерация, тиснение. Цены берутся из справочников.
                    </HelpHint>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const p = PRODUCT_PRESETS[productType];
                    if (!p || (!p.hint && !p.suggestedOps?.length)) return null;
                    return (
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                        {p.hint && <div className="text-foreground"><Sparkles className="inline h-3.5 w-3.5 mr-1 text-primary" />{p.hint}</div>}
                        {p.suggestedOps?.length ? (
                          <div className="mt-1.5 text-xs text-muted-foreground">
                            Типичные операции для этого изделия: <span className="text-foreground">{p.suggestedOps.join(" · ")}</span>. Их можно добавить вручную в спецификации после расчёта.
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                  {productType === "booklet" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Checkbox checked={hasFold} onCheckedChange={(v) => setHasFold(!!v)} id="fold" />
                      <Label htmlFor="fold" className="flex-1">Фальцовка</Label>
                      <Select value={String(foldCount)} onValueChange={(v) => setFoldCount(Number(v))}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="1">1 сгиб</SelectItem><SelectItem value="2">2 сгиба</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                  {(productType === "leaflet_diecut" || productType === "sticker_diecut" || productType === "bag") && (
                    <div className="flex items-center gap-3">
                      <Checkbox checked={hasDieCut} onCheckedChange={(v) => setHasDieCut(!!v)} id="dc" />
                      <Label htmlFor="dc">Высечка</Label>
                    </div>
                  )}
                  {productType === "bag" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Checkbox checked={hasLamPrepress} onCheckedChange={(v) => setHasLamPrepress(!!v)} id="lp" />
                      <Label htmlFor="lp" className="flex-1">Припрессовка плёнки</Label>
                      <Select value={String(lamPrepressSides)} onValueChange={(v) => setLamPrepressSides(Number(v) as 1 | 2)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="1">1 сторона</SelectItem><SelectItem value="2">2 стороны</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                  <ExtraOpsPicker
                    operations={operations.filter((o) => o.category === "postpress" || o.category === "logistics" || o.category === "print" || o.category === "prepress")}
                    extraOps={extraOps}
                    setExtraOps={setExtraOps}
                    circulation={circulation}
                    sheets={result && !("error" in result) ? result.printSheets : 0}
                    forms={result && !("error" in result) ? result.forms : 0}
                    onUserToggle={(opId, nowSelected) => {
                      setUserRemovedOpIds((prev) => {
                        const next = new Set(prev);
                        if (nowSelected) next.delete(opId);
                        else next.add(opId);
                        return next;
                      });
                    }}
                  />
                  <div className="pt-3 border-t mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <div className="font-medium text-sm">Дополнительные операции (по формулам справочника)</div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Выберите операцию — стоимость рассчитается по загруженным формулам (цена × количество). Поля параметров заполняются автоматически по тиражу; недостающие можно ввести вручную.
                    </p>
                    <CatalogOperationsPicker circulation={circulation} onChange={setCatalogOpsItems} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="section-5" className="scroll-mt-24">
              {result && !("error" in result) ? (
                <Card>
                  <CardHeader><CardTitle>5. Спецификация</CardTitle></CardHeader>
                  <CardContent>
                    <SpecTable result={result} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader><CardTitle>5. Спецификация</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground">Спецификация появится, когда расчёт станет валидным.</CardContent>
                </Card>
              )}
            </section>

            <section id="section-6" className="scroll-mt-24">
              <Card>
                <CardHeader><CardTitle>6. Сохранение</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Название</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Авто, если оставить пустым" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => save(false)} disabled={saving}><Save className="mr-2 h-4 w-4" /> Сохранить расчёт</Button>
                    <Button variant="outline" onClick={() => save(true)} disabled={saving}>Сохранить как шаблон</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Шаблон будет доступен на главной — из него можно создать новый расчёт одной кнопкой.</p>
                </CardContent>
              </Card>
            </section>

            {stepError && (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-warning" /> {stepError}
              </div>
            )}
            {result && "error" in result && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5" /> {String(result.error)}
              </div>
            )}

            {/* Десктопная навигация по шагам убрана: все секции на одном экране,
                перемещение — через Stepper сверху или скролл. */}
          </div>

          {/* Desktop sidebar with totals */}
          <div className="hidden lg:block lg:col-span-2 space-y-4 lg:order-2">
            {result && !("error" in result) && (
              <div className="lg:sticky lg:top-20 space-y-4">
              <PriceBreakdownTree
                spec={result.spec as any}
                totalCost={totalCost}
                marginPercent={margin}
                vatPercent={vatPercent}
                circulation={circulation}
                variantApplied={(result as any).variantApplied}
                variantWarning={(result as any).variantWarning}
              />
              {(result as any).cutInfo && (
                <CutInfoCard
                  info={(result as any).cutInfo}
                  override={cutsOverride}
                  onOverride={setCutsOverride}
                />
              )}
              <Card className="shadow-elevated">
                <CardHeader className="pb-3"><CardTitle className="text-base">Раскладка</CardTitle></CardHeader>
                <CardContent>
                  <LayoutPreview layout={result.layout} productW={dims.w} productH={dims.h} productType={productType} alternatives={result.alternatives} mainCosts={{ paperCost: result.paperCost, printCost: result.printCost, totalCost: result.totalCost }} />
                </CardContent>
                <div className="border-t p-4 space-y-3 bg-gradient-subtle rounded-b-lg">
                  <Row label="Себестоимость" value={fmtMoney(totalCost)} />
                  {/* Структура себестоимости: бумага / печать / прочее */}
                  {totalCost > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="bg-primary"
                          style={{ width: `${Math.min(100, (result.paperCost / totalCost) * 100)}%` }}
                          title={`Бумага: ${fmtMoney(result.paperCost)}`}
                        />
                        <div
                          className="bg-success/80"
                          style={{ width: `${Math.min(100, (result.printCost / totalCost) * 100)}%` }}
                          title={`Печать: ${fmtMoney(result.printCost)}`}
                        />
                        <div
                          className="bg-warning/80"
                          style={{ width: `${Math.max(0, 100 - ((result.paperCost + result.printCost) / totalCost) * 100)}%` }}
                          title="Прочее"
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Бумага {Math.round((result.paperCost / totalCost) * 100)}%</span>
                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success/80" /> Печать {Math.round((result.printCost / totalCost) * 100)}%</span>
                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning/80" /> Прочее {Math.max(0, 100 - Math.round(((result.paperCost + result.printCost) / totalCost) * 100))}%</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="inline-flex items-center">
                        Наценка
                        <HelpHint title="Наценка и итог" learnMore="calc-margin">
                          Цена без НДС = себестоимость × (1 + наценка/100). К ней добавляется НДС из системных констант.
                        </HelpHint>
                      </span>
                      <span>{margin}%</span>
                    </div>
                    <Slider value={[margin]} onValueChange={([v]) => setMargin(v)} min={0} max={200} step={1} />
                  </div>
                  <Row label="Цена без НДС" value={fmtMoney(priceBeforeVat)} />
                  <Row label={`НДС ${vatPercent}%`} value={fmtMoney(vatAmount)} />
                  <Row label="Цена продажи с НДС" value={fmtMoney(salePrice)} bold />
                  <Row label="Прибыль" value={fmtMoney(profit)} className="text-success" />
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
                    <div>За шт (с/с): <span className="text-foreground font-medium">{fmtMoney(totalCost / Math.max(1, circulation))}</span></div>
                    <div>За шт (продажа): <span className="text-foreground font-medium">{fmtMoney(salePrice / Math.max(1, circulation))}</span></div>
                  </div>
                  {result.warnings.length > 0 && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                      {result.warnings.map((w, i) => <div key={i} className="flex gap-1.5"><AlertTriangle className="h-3 w-3 mt-0.5 text-warning" /> {w}</div>)}
                    </div>
                  )}
                </div>
              </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom: totals + nav */}
      <div className="lg:hidden fixed left-0 right-0 z-40 bottom-[64px] safe-x">
        {result && !("error" in result) && (
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-full bg-card/95 backdrop-blur border-t border-border px-4 py-2.5 flex items-center justify-between text-left">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Цена продажи · {margin}%</div>
                  <div className="text-base font-bold tabular-nums">{fmtMoney(salePrice)}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>с/с {fmtMoney(totalCost)}</span>
                  <ChevronUp className="h-4 w-4" />
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader><SheetTitle>Итоги</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <PriceBreakdownTree
                  spec={result.spec as any}
                  totalCost={totalCost}
                  marginPercent={margin}
                  vatPercent={vatPercent}
                  circulation={circulation}
                  variantApplied={(result as any).variantApplied}
                  variantWarning={(result as any).variantWarning}
                />
                {(result as any).cutInfo && (
                  <CutInfoCard
                    info={(result as any).cutInfo}
                    override={cutsOverride}
                    onOverride={setCutsOverride}
                  />
                )}
                <Row label="Себестоимость" value={fmtMoney(totalCost)} />
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Наценка</span><span>{margin}%</span></div>
                  <Slider value={[margin]} onValueChange={([v]) => setMargin(v)} min={0} max={200} step={1} />
                </div>
                <Row label="Цена без НДС" value={fmtMoney(priceBeforeVat)} />
                <Row label={`НДС ${vatPercent}%`} value={fmtMoney(vatAmount)} />
                <Row label="Цена продажи с НДС" value={fmtMoney(salePrice)} bold />
                <Row label="Прибыль" value={fmtMoney(profit)} className="text-success" />
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
                  <div>За шт (с/с): <span className="text-foreground font-medium">{fmtMoney(totalCost / Math.max(1, circulation))}</span></div>
                  <div>За шт (продажа): <span className="text-foreground font-medium">{fmtMoney(salePrice / Math.max(1, circulation))}</span></div>
                </div>
                {result.warnings.length > 0 && (
                  <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                    {result.warnings.map((w, i) => <div key={i} className="flex gap-1.5"><AlertTriangle className="h-3 w-3 mt-0.5 text-warning" /> {w}</div>)}
                  </div>
                )}
                <details className="rounded-md border bg-card p-3">
                  <summary className="cursor-pointer text-sm font-medium">Превью раскладки</summary>
                  <div className="mt-3"><LayoutPreview layout={result.layout} productW={dims.w} productH={dims.h} productType={productType} alternatives={result.alternatives} mainCosts={{ paperCost: result.paperCost, printCost: result.printCost, totalCost: result.totalCost }} /></div>
                </details>
              </div>
            </SheetContent>
          </Sheet>
        )}
        <div className="bg-background border-t border-border grid grid-cols-2 gap-2 px-4 py-2">
          <Button variant="outline" onClick={prev} disabled={step === 1} className="h-11"><ArrowLeft className="mr-1 h-4 w-4" /> Назад</Button>
          <Button onClick={next} disabled={step === 6 || !!stepError} className="h-11">Далее <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

const Row = ({ label, value, className = "", bold }: { label: string; value: string; className?: string; bold?: boolean }) => (
  <div className={`flex items-center justify-between text-sm ${className}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className={bold ? "text-base font-bold text-foreground" : "font-medium text-foreground"}>{value}</span>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card px-3 py-2 shadow-card">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);

const CATEGORY_LABEL: Record<string, string> = {
  prepress: "Допечать",
  print: "Печать",
  postpress: "Постпечать",
  logistics: "Логистика",
};

const ExtraOpsPicker = ({
  operations,
  extraOps,
  setExtraOps,
  circulation,
  sheets,
  forms,
  onUserToggle,
}: {
  operations: OperationRow[];
  extraOps: Record<string, ExtraOpState>;
  setExtraOps: (v: Record<string, ExtraOpState>) => void;
  circulation: number;
  sheets: number;
  forms: number;
  onUserToggle?: (opId: string, nowSelected: boolean) => void;
}) => {
  // Группируем по категории → подгруппе
  const tree = useMemo(() => {
    const t: Record<string, Record<string, OperationRow[]>> = {};
    for (const op of operations) {
      const cat = op.category || "postpress";
      const sub = op.subgroup || "Прочее";
      (t[cat] ||= {})[sub] ||= [];
      t[cat][sub].push(op);
    }
    return t;
  }, [operations]);

  // Доработка 4: фиксированный порядок групп.
  const CATEGORY_ORDER = ["prepress", "print", "postpress", "logistics"] as const;
  const orderedTree = CATEGORY_ORDER
    .filter((c) => tree[c])
    .map((c) => [c, tree[c]] as const);

  const defaultQty = (unit: string | null): number => {
    if (!unit) return circulation || 1;
    if (unit === "лист" || unit === "оттиск" || unit === "сгиб") return sheets || circulation || 1;
    if (unit === "форма") return forms || 1;
    return circulation || 1;
  };

  const toggle = (op: OperationRow) => {
    const next = { ...extraOps };
    const nowSelected = !next[op.id];
    if (next[op.id]) {
      delete next[op.id];
    } else {
      next[op.id] = { qty: defaultQty(op.unit) };
    }
    setExtraOps(next);
    onUserToggle?.(op.id, nowSelected);
  };

  const update = (id: string, patch: Partial<ExtraOpState>) => {
    setExtraOps({ ...extraOps, [id]: { ...extraOps[id], ...patch } });
  };

  if (!operations.length) return null;

  return (
    <div className="rounded-md border bg-muted/20 p-3 mt-3">
      <div className="text-sm font-semibold mb-2">Операции из справочника</div>
      <div className="text-xs text-muted-foreground mb-3">
        Отметьте нужные. Цены подтянуты из справочника, можно перебить вручную.
      </div>
      <div className="space-y-3">
        {orderedTree.map(([cat, subs]) => (
          <details key={cat} className="rounded-md border bg-card">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
              {CATEGORY_LABEL[cat] || cat}
            </summary>
            <div className="px-3 pb-3 space-y-3">
              {Object.entries(subs).map(([sub, ops]) => (
                <div key={sub}>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-2 mb-1">{sub}</div>
                  <div className="space-y-1.5">
                    {ops.map((op) => {
                      const sel = extraOps[op.id];
                      return (
                        <div key={op.id} className="flex flex-wrap items-center gap-2 rounded border bg-background p-2 text-sm">
                          <Checkbox checked={!!sel} onCheckedChange={() => toggle(op)} id={`op-${op.id}`} />
                          <Label htmlFor={`op-${op.id}`} className="flex-1 cursor-pointer text-sm">
                            {op.name}
                            {op.description ? (
                              <span className="block text-[11px] text-muted-foreground font-normal">{op.description}</span>
                            ) : null}
                          </Label>
                          {sel && (
                            <>
                              <Input
                                type="number"
                                className="w-24 h-8"
                                value={sel.qty}
                                onChange={(e) => update(op.id, { qty: Number(e.target.value) || 0 })}
                              />
                              <span className="text-xs text-muted-foreground w-14">{op.unit || "шт"}</span>
                              <span
                                className="w-24 h-8 inline-flex items-center justify-end px-2 rounded border bg-muted/40 text-xs tabular-nums text-muted-foreground"
                                title="Цена из справочника «Типы работ». Изменить может только администратор."
                              >
                                {fmtMoney(Number(op.variable_cost || 0))}
                              </span>
                              <span className="text-xs font-medium tabular-nums w-24 text-right">
                                = {fmtMoney(
                                  Math.max(
                                    sel.qty * Number(op.variable_cost || 0) + Number(op.fixed_cost || 0),
                                    Number(op.min_cost || 0),
                                  ),
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

const STAGE_LABELS: Record<string, string> = {
  prepress: "Допечатные",
  material: "Материалы",
  print: "Печать",
  postpress: "Послепечатные",
  logistics: "Логистика",
};

const SpecTable = ({ result }: { result: any }) => {
  const grouped = result.spec.reduce((acc: Record<string, any[]>, it: any) => {
    (acc[it.stage] ||= []).push(it);
    return acc;
  }, {});
  // Доработка 4: фиксированный порядок этапов: допечать → материалы → печать → постпечать → логистика
  const STAGE_ORDER = ["prepress", "material", "print", "postpress", "logistics"] as const;
  const ordered = STAGE_ORDER
    .filter((s) => grouped[s]?.length)
    .map((s) => [s, grouped[s]] as const);
  return (
    <div className="scroll-x overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left p-2">Статья</th>
            <th className="text-right p-2 w-24">Кол-во</th>
            <th className="text-left p-2 w-20">Ед.</th>
            <th className="text-right p-2 w-28">Цена</th>
            <th className="text-right p-2 w-32">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map(([stage, items]: any) => (
            <Fragment key={stage}>
              <tr className="bg-secondary/40">
                <td colSpan={5} className="p-2 text-xs font-semibold uppercase tracking-wide text-foreground">{STAGE_LABELS[stage]}</td>
              </tr>
              {items.map((it: any, i: number) => (
                <tr key={`${stage}-${i}`} className="border-t hover:bg-muted/30">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 text-right tabular-nums">{fmtNum(it.quantity)}</td>
                  <td className="p-2 text-muted-foreground">{it.unit}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(it.unitPrice)}</td>
                  <td className="p-2 text-right tabular-nums font-medium">{fmtMoney(it.total)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
          <tr className="border-t-2 bg-primary/5">
            <td colSpan={4} className="p-2 text-right font-semibold">Итого себестоимость</td>
            <td className="p-2 text-right font-bold tabular-nums">{fmtMoney(result.totalCost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Calculator;