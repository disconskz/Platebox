import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MultiSkuTable } from "@/components/calc/MultiSkuTable";
import { VariantCompareCard } from "@/components/calc/VariantCompareCard";
import { HelpHint } from "@/components/HelpHint";
import { loadCalcRules } from "@/lib/calc/rules";
import { setCalcRules } from "@/lib/calc/engine";
import { runMultiSkuCalculation, type SkuItem, type MultiSkuResult } from "@/lib/calc/multi-sku";
import { fmtMoney } from "@/lib/format";
import MobileTabBar from "@/components/MobileTabBar";
import { useAuth } from "@/hooks/useAuth";
import { ensureSupabaseSession } from "@/lib/auth-session";

type Material = { id: string; name: string; type: string; density: number; format_width: number; format_height: number; cost_per_sheet: number };
type PrintFormatRow = { id: string; width: number; height: number; sort_order: number; purchase_format_id: string | null };
type PurchaseFormatRow = { id: string; width: number; height: number; material_category: string };

function inferCategory(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("cardboard") || t.includes("картон")) return "cardboard";
  if (t.includes("coated") || t.includes("мелов")) return "coated";
  if (t.includes("offset") || t.includes("офсет")) return "offset";
  if (t.includes("self") || t.includes("самокл")) return "self_adhesive";
  return "other";
}

export default function MultiSkuCalculator() {
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState<string>("");
  const [printFormats, setPrintFormats] = useState<PrintFormatRow[]>([]);
  const [purchaseFormats, setPurchaseFormats] = useState<PurchaseFormatRow[]>([]);
  const [vatPercent, setVatPercent] = useState(0);

  const [skus, setSkus] = useState<SkuItem[]>([
    { name: "SKU-1", width: 105, height: 148, circulation: 100 },
  ]);
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(0);

  const [result, setResult] = useState<MultiSkuResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"min_forms" | "no_empty" | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      await ensureSupabaseSession();
      const rules = await loadCalcRules();
      setCalcRules(rules);
      const { data: m } = await supabase.from("materials").select("*").order("name");
      const { data: pf } = await supabase.from("print_formats" as any).select("*").order("sort_order");
      const { data: buyf } = await supabase.from("purchase_formats" as any).select("*").order("sort_order");
      const { data: s } = await supabase.from("system_settings").select("value").eq("key", "vat_percent").maybeSingle();
      setMaterials((m as Material[]) || []);
      setPrintFormats(((pf as any) || []) as PrintFormatRow[]);
      setPurchaseFormats(((buyf as any) || []) as PurchaseFormatRow[]);
      if (s?.value) setVatPercent(Number(s.value) || 0);
      if (m && m.length) setMaterialId((m[0] as Material).id);
    })();
  }, [authLoading, user?.id]);

  const material = materials.find((m) => m.id === materialId);

  const formatPairs = useMemo(() => {
    if (!material) return [];
    const purchaseById = new Map(purchaseFormats.map((p) => [p.id, p]));
    const cat = inferCategory(material.type);
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
  }, [printFormats, purchaseFormats, material]);

  const handleCalc = () => {
    setError(null);
    setResult(null);
    setSelectedKind(null);
    if (!material) {
      setError("Выберите материал.");
      return;
    }
    if (!skus.length) {
      setError("Добавьте хотя бы один вид.");
      return;
    }
    if (skus.some((s) => !s.width || !s.height || !s.circulation)) {
      setError("Заполните все поля у каждого вида.");
      return;
    }
    if (!formatPairs.length) {
      setError("Нет пар форматов под выбранный материал.");
      return;
    }
    try {
      const r = runMultiSkuCalculation({
        productType: "leaflet",
        skus,
        colorFront,
        colorBack,
        material,
        formatPairs,
        vatPercent,
        priorityPrintFormats: [
          { width: 520, height: 360 },
          { width: 460, height: 320 },
        ],
      });
      setResult(r);
      setSelectedKind(r.variants[r.bestIndex].kind);
    } catch (e: any) {
      setError(e.message || "Ошибка расчёта");
    }
  };

  const handleSave = async () => {
    if (!result || !material || !selectedKind) return;
    const v = result.variants.find((x) => x.kind === selectedKind);
    if (!v) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Нет авторизации");
      const totalCirc = skus.reduce((s, x) => s + x.circulation, 0);
      const { data: calc, error: err } = await supabase
        .from("calculations")
        .insert({
          user_id: userId,
          name: name || `Групповой расчёт · ${skus.length} видов`,
          product_type: "leaflet",
          category: "sheet",
          circulation: totalCirc,
          format_type: "custom",
          format_width: result.cellWidth,
          format_height: result.cellHeight,
          color_front: colorFront,
          color_back: colorBack,
          material_id: material.id,
          print_format_width: v.pair.print.width,
          print_format_height: v.pair.print.height,
          purchase_format_width: v.pair.purchase.width,
          purchase_format_height: v.pair.purchase.height,
          items_per_sheet: v.layout.itemsPerSheet,
          turnaround_type: v.turnaround,
          forms_count: v.formsTotal,
          setup_sheets: v.setupSheetsTotal,
          print_sheets: v.printSheetsTotal,
          purchase_sheets: v.purchaseSheetsTotal,
          paper_cost: v.materials[0]?.total ?? 0,
          forms_cost: v.formsTotal * 1000,
          print_cost: v.printItems[0]?.total ?? 0,
          ink_cost: 0,
          total_cost: v.totalCost,
          margin_percent: 30,
          is_multi_sku: true,
          sku_count: skus.length,
          impositions_count: v.impositions,
          empty_slots: v.emptySlots,
        } as any)
        .select("id")
        .single();
      if (err) throw err;
      // Save SKUs
      await supabase.from("calculation_skus" as any).insert(
        skus.map((s, i) => ({
          calculation_id: calc.id,
          name: s.name,
          width: s.width,
          height: s.height,
          circulation: s.circulation,
          sort_order: i,
        }))
      );
      // Save items
      await supabase.from("calculation_items").insert(
        v.spec.map((it, i) => ({
          calculation_id: calc.id,
          stage: it.stage,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unitPrice,
          total_price: it.total,
          sort_order: i,
        }))
      );
      toast.success("Расчёт сохранён");
      navigate(`/calculation/${calc.id}`);
    } catch (e: any) {
      toast.error(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const best = result ? result.variants[result.bestIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
    <div className="container max-w-6xl py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link to="/calculator">
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Обычный калькулятор</span>
            </Link>
          </Button>
          <h1 className="text-base sm:text-xl font-semibold flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <span className="truncate">Групповой спуск</span>
            <HelpHint title="Что это" learnMore="multi-sku">
              Расчёт тиража из нескольких разных видов изделий, печатающихся вместе на одном печатном листе.
              Один лист = один спуск. Система покажет два варианта: минимум форм vs без пустот на листе.
            </HelpHint>
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Параметры тиража</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Материал</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Красочность лицо</Label>
            <Input type="number" value={colorFront} onChange={(e) => setColorFront(Number(e.target.value))} />
          </div>
          <div>
            <Label>Красочность оборот</Label>
            <Input type="number" value={colorBack} onChange={(e) => setColorBack(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Список видов (SKU)</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSkuTable skus={skus} onChange={setSkus} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleCalc} size="lg">Рассчитать варианты</Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      {result && (
        <div className="space-y-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Печатный лист" value={`${result.variants[0].pair.print.width}×${result.variants[0].pair.print.height} мм`} />
              <Stat label="Закупочный лист" value={`${result.variants[0].pair.purchase.width}×${result.variants[0].pair.purchase.height} мм`} />
              <Stat label="Слотов на лист" value={`${result.slotsPerSheet}`} />
              <Stat label="Минимум спусков" value={`${result.minImpositions}`} />
            </CardContent>
          </Card>

          <div className={`grid grid-cols-1 ${result.variants.length > 1 ? "md:grid-cols-2" : ""} gap-4`}>
            {result.variants.map((v) => {
              const isBest = result.variants.indexOf(v) === result.bestIndex;
              const diff = best ? v.totalCost - best.totalCost : 0;
              return (
                <VariantCompareCard
                  key={v.kind}
                  variant={v}
                  isBest={isBest}
                  selected={selectedKind === v.kind}
                  diffVsBest={diff}
                  onApply={() => setSelectedKind(v.kind)}
                />
              );
            })}
          </div>

          {selectedKind && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Сохранение расчёта</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <Label>Название расчёта</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Групповой · ${skus.length} видов`} />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" /> {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
    <MobileTabBar />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}