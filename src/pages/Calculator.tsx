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
import { fmtMoney, fmtNum } from "@/lib/format";
import { toast } from "sonner";

type Material = { id: string; name: string; type: string; density: number; format_width: number; format_height: number; cost_per_sheet: number };
type LamRow = { film_type: string; size_range: string; cost_per_side: number };
type Equipment = { id: string; name: string; type: string; max_format_width: number | null; max_format_height: number | null; cost_per_impression: number | null };

const PRODUCT_OPTIONS: { value: ProductType; label: string; category: "sheet" | "book_journal" }[] = [
  { value: "leaflet", label: "Листовка", category: "sheet" },
  { value: "booklet", label: "Буклет", category: "sheet" },
  { value: "leaflet_diecut", label: "Листовка с вырубкой", category: "sheet" },
  { value: "sticker", label: "Стикер", category: "sheet" },
  { value: "sticker_diecut", label: "Стикер с вырубкой", category: "sheet" },
  { value: "bag", label: "Пакет", category: "book_journal" },
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
  const [saving, setSaving] = useState(false);

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
  const [materialId, setMaterialId] = useState<string>("");
  const [equipmentId, setEquipmentId] = useState<string>("");

  // Step 3
  const [designQty, setDesignQty] = useState(2);
  const [photoOutput, setPhotoOutput] = useState(false);
  const [photoOutputCost, setPhotoOutputCost] = useState(800);
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
      setMaterials((m as Material[]) || []);
      setLam((l as LamRow[]) || []);
      setEquipment((e as Equipment[]) || []);
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

  // Auto select bag defaults
  useEffect(() => {
    if (productType === "bag") {
      setHasLamPrepress(true);
      setHasDieCut(true);
    }
    if (productType === "booklet") setHasFold(true);
  }, [productType]);

  const dims = useMemo(() => {
    if (formatType === "custom") return { w: customW, h: customH };
    const p = FORMAT_PRESETS[formatType];
    return { w: p.w, h: p.h };
  }, [formatType, customW, customH]);

  const material = materials.find((m) => m.id === materialId);
  const selectedEquipment = equipment.find((e) => e.id === equipmentId);

  const lamMap = useMemo(() => {
    const map: Record<string, number> = {};
    lam.forEach((r) => (map[`${r.film_type}:${r.size_range}`] = Number(r.cost_per_side)));
    return map;
  }, [lam]);

  const calcInput: CalcInput | null = useMemo(() => {
    if (!material) return null;
    return {
      productType,
      circulation,
      formatType,
      formatWidth: dims.w,
      formatHeight: dims.h,
      colorFront,
      colorBack,
      material,
      designQty,
      photoOutputUnitCost: photoOutput ? photoOutputCost : 0,
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
      printCostPerImpression: selectedEquipment?.cost_per_impression
        ? Number(selectedEquipment.cost_per_impression)
        : undefined,
    };
  }, [material, selectedEquipment, productType, circulation, formatType, dims, colorFront, colorBack, designQty, photoOutput, photoOutputCost, manualForms, manualSetup, hasFold, foldCount, hasDieCut, hasLamination, laminationFilm, laminationSides, lamMap, hasNumbering, numbersPerSheet, hasStamping, stampW, stampH, hasLamPrepress, lamPrepressSides]);

  const result = useMemo(() => {
    if (!calcInput) return null;
    try {
      return runCalculation(calcInput);
    } catch (e: any) {
      return { error: e.message } as any;
    }
  }, [calcInput]);

  const goto = (n: number) => {
    setStep(n);
    setMaxReached((m) => Math.max(m, n));
  };

  const next = () => goto(Math.min(7, step + 1));
  const prev = () => goto(Math.max(1, step - 1));

  const totalCost = result && !("error" in result) ? result.totalCost : 0;
  const salePrice = totalCost * (1 + margin / 100);
  const profit = salePrice - totalCost;

  // Validations per step
  const stepError = useMemo(() => {
    if (step >= 1 && (!circulation || circulation < 1)) return "Укажите тираж больше 0";
    if (step >= 1 && (!dims.w || !dims.h || dims.w < 10 || dims.h < 10)) return "Укажите корректный формат";
    if (step >= 2 && !materialId) return "Выберите материал";
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
    const { data, error } = await supabase.from("calculations").insert(payload).select("id").single();
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
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> Все расчёты
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Новый расчёт</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6">
        <Stepper current={step} maxReached={maxReached} onStepClick={goto} />

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle>1. Продукция и параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Название расчёта</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Авто, если оставить пустым" />
                  </div>
                  <div>
                    <Label>Вид продукции</Label>
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
                    <Label>Тираж, шт</Label>
                    <Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Формат</Label>
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
                    <Label>Цветность фронт</Label>
                    <Input type="number" min={1} max={10} value={colorFront} onChange={(e) => setColorFront(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Цветность оборот (0 = без оборота)</Label>
                    <Input type="number" min={0} max={10} value={colorBack} onChange={(e) => setColorBack(Number(e.target.value))} />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader><CardTitle>2. Бумага</CardTitle></CardHeader>
                <CardContent>
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
                    <Input className="w-32" type="number" value={photoOutputCost} onChange={(e) => setPhotoOutputCost(Number(e.target.value))} disabled={!photoOutput} />
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
                <CardHeader><CardTitle>4. Раскладка</CardTitle></CardHeader>
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
                <CardHeader><CardTitle>5. Послепечатные операции</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {productType === "booklet" && (
                    <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-3">
                      <Checkbox checked={hasLamPrepress} onCheckedChange={(v) => setHasLamPrepress(!!v)} id="lp" />
                      <Label htmlFor="lp" className="flex-1">Припрессовка плёнки</Label>
                      <Select value={String(lamPrepressSides)} onValueChange={(v) => setLamPrepressSides(Number(v) as 1 | 2)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="1">1 сторона</SelectItem><SelectItem value="2">2 стороны</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Checkbox checked={hasLamination} onCheckedChange={(v) => setHasLamination(!!v)} id="lam" />
                    <Label htmlFor="lam" className="flex-1">Ламинация</Label>
                    <Select value={laminationFilm} onValueChange={(v) => setLaminationFilm(v as any)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gloss">Глянец</SelectItem>
                        <SelectItem value="matte">Матовая</SelectItem>
                        <SelectItem value="velvet">Велюр</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={String(laminationSides)} onValueChange={(v) => setLaminationSides(Number(v) as 1 | 2)}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="1">1 ст.</SelectItem><SelectItem value="2">2 ст.</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={hasNumbering} onCheckedChange={(v) => setHasNumbering(!!v)} id="num" />
                    <Label htmlFor="num" className="flex-1">Нумерация</Label>
                    <Input className="w-32" type="number" value={numbersPerSheet} onChange={(e) => setNumbersPerSheet(Number(e.target.value))} disabled={!hasNumbering} />
                    <span className="text-xs text-muted-foreground">номеров/лист</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={hasStamping} onCheckedChange={(v) => setHasStamping(!!v)} id="st" />
                    <Label htmlFor="st" className="flex-1">Тиснение</Label>
                    <Input className="w-20" type="number" value={stampW} onChange={(e) => setStampW(Number(e.target.value))} disabled={!hasStamping} />
                    <span className="text-xs">×</span>
                    <Input className="w-20" type="number" value={stampH} onChange={(e) => setStampH(Number(e.target.value))} disabled={!hasStamping} />
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
                    <Button variant="outline" disabled><FileText className="mr-2 h-4 w-4" /> КП в PDF (скоро)</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && "error" in result && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5" /> {String(result.error)}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={prev} disabled={step === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
              <Button onClick={next} disabled={step === 7}>Далее <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {result && !("error" in result) && (
              <Card className="sticky top-20 shadow-elevated">
                <CardHeader className="pb-3"><CardTitle className="text-base">Раскладка</CardTitle></CardHeader>
                <CardContent>
                  <LayoutPreview layout={result.layout} productW={dims.w} productH={dims.h} />
                </CardContent>
                <div className="border-t p-4 space-y-3 bg-gradient-subtle rounded-b-lg">
                  <Row label="Себестоимость" value={fmtMoney(totalCost)} />
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Наценка</span><span>{margin}%</span></div>
                    <Slider value={[margin]} onValueChange={([v]) => setMargin(v)} min={0} max={200} step={1} />
                  </div>
                  <Row label="Цена продажи" value={fmtMoney(salePrice)} bold />
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
    <div className="overflow-hidden rounded-md border">
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