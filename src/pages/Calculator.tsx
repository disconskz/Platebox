import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, FileText, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Stepper } from "@/components/calc/Stepper";
import { LayoutPreview } from "@/components/calc/LayoutPreview";
import { FORMAT_PRESETS, runCalculation } from "@/lib/calc/engine";
import { CalcInput, ProductType, FormatType } from "@/lib/calc/types";
import { PRODUCT_PRESETS } from "@/lib/calc/presets";
import { fmtMoney, fmtNum } from "@/lib/format";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronUp } from "lucide-react";
import { HelpHint } from "@/components/HelpHint";

type Material = { id: string; name: string; type: string; density: number; format_width: number; format_height: number; cost_per_sheet: number };
type LamRow = { film_type: string; size_range: string; cost_per_side: number };
type Equipment = { id: string; name: string; type: string; max_format_width: number | null; max_format_height: number | null; cost_per_impression: number | null };
type PrintFormatRow = { id: string; width: number; height: number; sort_order: number };
type PurchaseFormatRow = { id: string; width: number; height: number; material_category: string; sort_order: number };
type PressMachineRow = { id: string; name: string; max_format_width: number; max_format_height: number; cost_per_impression: number; sort_order: number };

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

const Calculator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lam, setLam] = useState<LamRow[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [printFormats, setPrintFormats] = useState<PrintFormatRow[]>([]);
  const [purchaseFormats, setPurchaseFormats] = useState<PurchaseFormatRow[]>([]);
  const [pressMachines, setPressMachines] = useState<PressMachineRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);

  // Step 1
  const [productType, setProductType] = useState<ProductType>("leaflet");
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
  const [designQty, setDesignQty] = useState(2);
  const [manualForms, setManualForms] = useState<number | "">("");
  const [manualSetup, setManualSetup] = useState<number | "">("");

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
  const [stampW, setStampW] = useState(5);
  const [stampH, setStampH] = useState(3);
  const [hasLamPrepress, setHasLamPrepress] = useState(false);
  const [lamPrepressSides, setLamPrepressSides] = useState<1 | 2>(1);

  // Step 6
  const [margin, setMargin] = useState(30);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase.from("materials").select("*").order("name");
      const { data: l } = await supabase.from("lamination_prices").select("film_type,size_range,cost_per_side");
      const { data: e } = await supabase.from("equipment").select("*").eq("type", "print").order("name");
      const { data: s } = await supabase.from("system_settings").select("value").eq("key", "vat_percent").maybeSingle();
      const { data: pf } = await supabase.from("print_formats" as any).select("*").order("sort_order");
      const { data: buyf } = await supabase.from("purchase_formats" as any).select("*").order("sort_order");
      const { data: pm } = await supabase.from("press_machines" as any).select("*").order("sort_order");
      if (s?.value) setVatPercent(Number(s.value) || 0);
      setMaterials((m as Material[]) || []);
      setLam((l as LamRow[]) || []);
      setEquipment((e as Equipment[]) || []);
      setPrintFormats(((pf as any) || []) as PrintFormatRow[]);
      setPurchaseFormats(((buyf as any) || []) as PurchaseFormatRow[]);
      setPressMachines(((pm as any) || []) as PressMachineRow[]);
      if (m && m.length) setMaterialId((m[0] as Material).id);
      if (e && e.length) setEquipmentId((e[0] as Equipment).id);
    })();
  }, []);

  // Load template/clone if requested
  useEffect(() => {
    const tpl = searchParams.get("from");
    if (!tpl) return;
    (async () => {
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

  // Подбор оптимальной печатной машины по подобранному печатному формату
  const autoPickMachine = (printW: number, printH: number): PressMachineRow | null => {
    const fitW = Math.max(printW, printH);
    const fitH = Math.min(printW, printH);
    const sorted = [...pressMachines].sort(
      (a, b) => a.max_format_width * a.max_format_height - b.max_format_width * b.max_format_height
    );
    for (const pm of sorted) {
      const mW = Math.max(pm.max_format_width, pm.max_format_height);
      const mH = Math.min(pm.max_format_width, pm.max_format_height);
      if (fitW <= mW && fitH <= mH) return pm;
    }
    return null;
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

  // Авто-машина: вычисляется после раскладки (см. ниже useMemo result)

  const lamMap = useMemo(() => {
    const map: Record<string, number> = {};
    lam.forEach((r) => (map[`${r.film_type}:${r.size_range}`] = Number(r.cost_per_side)));
    return map;
  }, [lam]);

  const calcInput: CalcInput | null = useMemo(() => {
    if (!effectiveMaterial) return null;
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
      designQty,
      photoOutputUnitCost: 0,
      manualForms: manualForms === "" ? undefined : Number(manualForms),
      manualSetupSheets: manualSetup === "" ? undefined : Number(manualSetup),
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
      stampingClicheW: stampW,
      stampingClicheH: stampH,
      hasLamPrepress,
      lamPrepressSides,
      printCostPerImpression: undefined, // подставится ниже после автоподбора машины
      vatPercent,
    };
  }, [effectiveMaterial, productType, circulation, formatType, dims, colorFront, colorBack, designQty, manualForms, manualSetup, hasFold, foldCount, hasDieCut, hasLamination, laminationFilm, laminationSides, lamMap, hasNumbering, numbersPerSheet, hasStamping, stampW, stampH, hasLamPrepress, lamPrepressSides, vatPercent, printFormatList]);

  // Промежуточный расчёт (без авто-цены машины)
  const preResult = useMemo(() => {
    if (!calcInput) return null;
    try {
      return runCalculation(calcInput);
    } catch (e: any) {
      return { error: e.message } as any;
    }
  }, [calcInput]);

  // Авто-выбранная машина по подобранному печатному формату
  const autoMachine = useMemo<PressMachineRow | null>(() => {
    if (!preResult || "error" in preResult) return null;
    const pf = preResult.layout.printFormat;
    return autoPickMachine(pf.width, pf.height);
  }, [preResult, pressMachines]);

  // Финальный расчёт с подставленной ценой оттиска (либо авто, либо ручной из equipment)
  const result = useMemo(() => {
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
  };

  const next = () => goto(Math.min(7, step + 1));
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
    if (!result || "error" in result || !calcInput || !material) return;
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
      material_id: materialId,
      equipment_id: equipmentId || null,
      print_cost_per_impression: selectedEquipment?.cost_per_impression ?? null,
      print_format_width: result.layout.printFormat.width,
      print_format_height: result.layout.printFormat.height,
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

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar pb-32 md:pb-0">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">Все расчёты</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Новый расчёт</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-3 sm:py-6 px-4">
        <Stepper current={step} maxReached={maxReached} onStepClick={goto} />

        <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4 lg:order-1 order-1">
            {step === 1 && (
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
                    <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>
                      Тираж, шт
                      <HelpHint title="Тираж" learnMore="calc-sheets">
                        Сколько готовых изделий нужно. От тиража напрямую зависит число тиражных листов.
                      </HelpHint>
                    </Label>
                    <Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(Number(e.target.value) || 0)} />
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
                      Цветность фронт
                      <HelpHint title="Красочность" learnMore="calc-forms">
                        Число красок на лицо. CMYK = 4, моно = 1. От этого зависит количество печатных форм.
                      </HelpHint>
                    </Label>
                    <Input type="number" min={1} max={10} value={colorFront} onChange={(e) => setColorFront(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>
                      Цветность оборот (0 = без оборота)
                      <HelpHint title="Оборот" learnMore="calc-forms">
                        0 — печать только с лица. Иначе указывает красочность оборотной стороны; влияет на формы и оттиски.
                      </HelpHint>
                    </Label>
                    <Input type="number" min={0} max={10} value={colorBack} onChange={(e) => setColorBack(Number(e.target.value))} />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader><CardTitle>2. Бумага</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                  <Label>
                    Материал
                    <HelpHint title="Материал" learnMore="calc-material">
                      Список из справочника «Бумага». Формат закупочного листа и цена за лист идут в раскладку и в стоимость.
                    </HelpHint>
                  </Label>
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
                  <div>
                    <Label>
                      Печатная машина
                      <HelpHint title="Оборудование" learnMore="calc-print">
                        Задаёт максимальный печатный формат и стоимость одного оттиска. Если изделие крупнее лимита — будет ошибка.
                      </HelpHint>
                    </Label>
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
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader><CardTitle>3. Допечатные операции</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label>Дизайн / подготовка макета (кол-во × 500 ₸)</Label>
                      <Input type="number" min={0} value={designQty} onChange={(e) => setDesignQty(Number(e.target.value))} />
                    </div>
                    <div className="text-right text-sm text-muted-foreground pb-2">= {fmtMoney(designQty * 500)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={photoOutput} onCheckedChange={(v) => setPhotoOutput(!!v)} id="po" />
                    <Label htmlFor="po" className="flex-1">Фотовывод</Label>
                    <Input className="w-28" type="number" inputMode="numeric" value={photoOutputCost} onChange={(e) => setPhotoOutputCost(Number(e.target.value))} disabled={!photoOutput} />
                    <span className="text-xs text-muted-foreground">₸/шт</span>
                  </div>
                  {(productType === "sticker" || productType === "sticker_diecut") && (
                    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
                      <div>
                        <Label>Кол-во пластин (вручную)</Label>
                        <Input type="number" value={manualForms} onChange={(e) => setManualForms(e.target.value === "" ? "" : Number(e.target.value))} placeholder="авто" />
                      </div>
                      <div>
                        <Label>Приладка, листов (вручную)</Label>
                        <Input type="number" value={manualSetup} onChange={(e) => setManualSetup(e.target.value === "" ? "" : Number(e.target.value))} placeholder="авто" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    4. Раскладка
                    <HelpHint title="Раскладка" learnMore="calc-layout">
                      Автоматически подбирается оптимальное число изделий на печатном листе с учётом поворота и полей.
                    </HelpHint>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Раскладка подбирается автоматически из печатных форматов 520×360 и 460×320. Превью справа.
                  {result && !("error" in result) && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-foreground">
                      <Stat label="Печатный формат" value={`${result.layout.printFormat.width}×${result.layout.printFormat.height}`} />
                      <Stat label="Тип оборота" value={result.turnaround === "none" ? "Без оборота" : result.turnaround === "own" ? "Свой" : "Чужой"} />
                      <Stat label="Форм" value={String(result.forms)} />
                      <Stat label="Приладка" value={`${result.setupSheets} л.`} />
                      <Stat label="Печатных листов" value={fmtNum(result.printSheets)} />
                      <Stat label="Закупочных листов" value={fmtNum(result.purchaseSheets)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    5. Послепечатные операции
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
                  <div className="flex flex-wrap items-center gap-3">
                    <Checkbox checked={hasLamination} onCheckedChange={(v) => setHasLamination(!!v)} id="lam" />
                    <Label htmlFor="lam" className="flex-1">Ламинация</Label>
                    <Select value={laminationFilm} onValueChange={(v) => setLaminationFilm(v as any)}>
                      <SelectTrigger className="w-32 flex-1 sm:flex-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gloss">Глянец</SelectItem>
                        <SelectItem value="matte">Матовая</SelectItem>
                        <SelectItem value="velvet">Велюр</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={String(laminationSides)} onValueChange={(v) => setLaminationSides(Number(v) as 1 | 2)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="1">1 ст.</SelectItem><SelectItem value="2">2 ст.</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Checkbox checked={hasNumbering} onCheckedChange={(v) => setHasNumbering(!!v)} id="num" />
                    <Label htmlFor="num" className="flex-1">Нумерация</Label>
                    <Input className="w-28" type="number" inputMode="numeric" value={numbersPerSheet} onChange={(e) => setNumbersPerSheet(Number(e.target.value))} disabled={!hasNumbering} />
                    <span className="text-xs text-muted-foreground">номеров/лист</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Checkbox checked={hasStamping} onCheckedChange={(v) => setHasStamping(!!v)} id="st" />
                    <Label htmlFor="st" className="flex-1">Тиснение</Label>
                    <Input className="w-20" type="number" inputMode="numeric" value={stampW} onChange={(e) => setStampW(Number(e.target.value))} disabled={!hasStamping} />
                    <span className="text-xs">×</span>
                    <Input className="w-20" type="number" inputMode="numeric" value={stampH} onChange={(e) => setStampH(Number(e.target.value))} disabled={!hasStamping} />
                    <span className="text-xs text-muted-foreground">см</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 6 && result && !("error" in result) && (
              <Card>
                <CardHeader><CardTitle>6. Спецификация</CardTitle></CardHeader>
                <CardContent>
                  <SpecTable result={result} />
                </CardContent>
              </Card>
            )}

            {step === 7 && (
              <Card>
                <CardHeader><CardTitle>7. Сохранение</CardTitle></CardHeader>
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
            )}

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

            {/* Desktop nav buttons */}
            <div className="hidden sm:flex justify-between pt-2">
              <Button variant="outline" onClick={prev} disabled={step === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
              <Button onClick={next} disabled={step === 7 || !!stepError}>Далее <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>

          {/* Desktop sidebar with totals */}
          <div className="hidden lg:block lg:col-span-2 space-y-4 lg:order-2">
            {result && !("error" in result) && (
              <Card className="lg:sticky lg:top-20 shadow-elevated">
                <CardHeader className="pb-3"><CardTitle className="text-base">Раскладка</CardTitle></CardHeader>
                <CardContent>
                  <LayoutPreview layout={result.layout} productW={dims.w} productH={dims.h} productType={productType} />
                </CardContent>
                <div className="border-t p-4 space-y-3 bg-gradient-subtle rounded-b-lg">
                  <Row label="Себестоимость" value={fmtMoney(totalCost)} />
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
              <div className="mt-4 space-y-3">
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
                  <div className="mt-3"><LayoutPreview layout={result.layout} productW={dims.w} productH={dims.h} productType={productType} /></div>
                </details>
              </div>
            </SheetContent>
          </Sheet>
        )}
        <div className="bg-background border-t border-border grid grid-cols-2 gap-2 px-4 py-2">
          <Button variant="outline" onClick={prev} disabled={step === 1} className="h-11"><ArrowLeft className="mr-1 h-4 w-4" /> Назад</Button>
          <Button onClick={next} disabled={step === 7 || !!stepError} className="h-11">Далее <ArrowRight className="ml-1 h-4 w-4" /></Button>
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
          {Object.entries(grouped).map(([stage, items]: any) => (
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