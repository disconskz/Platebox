import { Fragment, useEffect, useMemo, useState } from "react";
import { buildCoverLines } from "@/lib/calc/cover/cost";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { PageShell, PageHeader, PageHeaderRow, PageMain, PageContainer } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { fmtMoney, fmtNum } from "@/lib/format";
import TemplateActions from "@/components/calc/TemplateActions";
import { toTemplatePriceResult } from "@/lib/calc/template-result";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvancedOnly, TechOnly } from "@/components/calc/multipage/ModeVisibility";
import CostByStageBlock from "@/components/calc/multipage/CostByStageBlock";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";
import PrepressSection, { DEFAULT_PREPRESS, type PrepressState } from "@/components/calc/multipage/sections/PrepressSection";
import QualityControlSection, { DEFAULT_QC, type QcState } from "@/components/calc/multipage/sections/QualityControlSection";
import PackagingSection, { DEFAULT_PACKAGING, type PackagingState } from "@/components/calc/multipage/sections/PackagingSection";
import CoverSection, { DEFAULT_COVER, type CoverState } from "@/components/calc/multipage/sections/CoverSection";
import UnderlaySection, { DEFAULT_UNDERLAY, type UnderlayState } from "@/components/calc/multipage/sections/UnderlaySection";
import AssemblySection, { DEFAULT_ASSEMBLY, type AssemblyState } from "@/components/calc/multipage/sections/AssemblySection";
import SpecialOpsSection, { DEFAULT_SPECIAL_OPS, type SpecialOpsState } from "@/components/calc/multipage/sections/SpecialOpsSection";
import RouteTimeline from "@/components/calc/multipage/RouteTimeline";
import TechWarnings from "@/components/calc/multipage/TechWarnings";
import CompositionTable from "@/components/calc/multipage/CompositionTable";
import TechReport from "@/components/calc/multipage/TechReport";

/**
 * Шаблон «Календарь карманный» — листовая логика с ламинацией,
 * скруглением углов, календарной сеткой и упаковкой. Доработка 63.
 */

type FormatOpt = { value: string; label: string; w: number; h: number };
const FORMATS: FormatOpt[] = [
  { value: "70x100", label: "70×100 мм (классика)", w: 70, h: 100 },
  { value: "100x70", label: "100×70 мм (горизонт.)", w: 100, h: 70 },
  { value: "90x50", label: "90×50 мм (мини)", w: 90, h: 50 },
  { value: "85x55", label: "85×55 мм (визитка)", w: 85, h: 55 },
  { value: "custom", label: "Свой размер", w: 70, h: 100 },
];

type Material = {
  value: string; label: string; type: string; density: number;
  sheetW: number; sheetH: number; pricePerSheet: number; designer?: boolean; premium?: boolean;
};
const MATERIALS: Material[] = [
  { value: "coated250", label: "Мелованная 250 г/м²", type: "coated", density: 250, sheetW: 620, sheetH: 940, pricePerSheet: 70 },
  { value: "coatedboard300", label: "Мелованный картон 300 г/м²", type: "coated-board", density: 300, sheetW: 620, sheetH: 940, pricePerSheet: 95 },
  { value: "coatedboard350", label: "Мелованный картон 350 г/м²", type: "coated-board", density: 350, sheetW: 620, sheetH: 940, pricePerSheet: 120 },
  { value: "coatedboard400", label: "Мелованный картон 400 г/м²", type: "coated-board", density: 400, sheetW: 620, sheetH: 940, pricePerSheet: 145 },
  { value: "designer300", label: "Дизайнерский картон 300 г/м²", type: "designer", density: 300, sheetW: 720, sheetH: 1020, pricePerSheet: 240, designer: true, premium: true },
  { value: "touch300", label: "Touch cover 300 г/м²", type: "touch", density: 300, sheetW: 720, sheetH: 1020, pricePerSheet: 320, designer: true, premium: true },
  { value: "synthetic", label: "Синтетическая бумага 300 мкм", type: "synthetic", density: 300, sheetW: 700, sheetH: 1000, pricePerSheet: 280, premium: true },
  { value: "plastic", label: "Пластик ПВХ 0.3 мм", type: "plastic", density: 350, sheetW: 700, sheetH: 1000, pricePerSheet: 350, premium: true },
];

type Kind = "simple" | "ad" | "corporate" | "logo" | "qr" | "personal" | "premium";
const KINDS: { value: Kind; label: string }[] = [
  { value: "simple", label: "Простой карманный" },
  { value: "ad", label: "Рекламный" },
  { value: "corporate", label: "Корпоративный" },
  { value: "logo", label: "С логотипом" },
  { value: "qr", label: "С QR-кодом" },
  { value: "personal", label: "С персонализацией" },
  { value: "premium", label: "Premium" },
];

type LamType = "none" | "mat" | "gloss" | "soft" | "antiscratch";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 220 },
  { value: "gloss", label: "Глянцевая", price: 200 },
  { value: "soft", label: "Soft-touch", price: 380 },
  { value: "antiscratch", label: "Anti-scratch", price: 420 },
];

type GridLang = "ru" | "kz" | "en" | "mix";
const GRID_LANGS: { value: GridLang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "kz", label: "Казахский" },
  { value: "en", label: "Английский" },
  { value: "mix", label: "Смешанный" },
];

type PackKind = "none" | "stack" | "rubber" | "shrink" | "bag" | "box";
const PACKS: { value: PackKind; label: string; price: number }[] = [
  { value: "none", label: "Без индивидуальной упаковки", price: 0 },
  { value: "stack", label: "Упаковка в пачки", price: 0.5 },
  { value: "rubber", label: "Резинка / стяжка", price: 0.8 },
  { value: "shrink", label: "Термоусадка", price: 2 },
  { value: "bag", label: "Индивидуальный пакет", price: 4 },
  { value: "box", label: "Коробка", price: 25 },
];

export interface PocketCalendarCalculatorProps {
  embedded?: boolean;
  onResult?: (payload: import("@/pages/BoxProCalculator").BoxProResultPayload) => void;
}
export default function PocketCalendarCalculator({ embedded = false, onResult }: PocketCalendarCalculatorProps = {}) {
  const [presetKey, setPresetKey] = useState("70x100");
  const [customW, setCustomW] = useState(70);
  const [customH, setCustomH] = useState(100);
  const [circulation, setCirculation] = useState(1000);
  const [kind, setKind] = useState<Kind>("ad");
  const [margin, setMargin] = useState(40);
  const [vatPercent] = useState(16);
  const [leadDays, setLeadDays] = useState(5);
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [gridLang, setGridLang] = useState<GridLang>("ru");
  const [hasGrid, setHasGrid] = useState(true);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [ownTurn, setOwnTurn] = useState(true);
  const [twoSides, setTwoSides] = useState(true);

  // Материал / печать
  const [materialKey, setMaterialKey] = useState("coatedboard300");
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(4);
  const [pantoneCount, setPantoneCount] = useState(0);

  // Постпечать
  const [lamType, setLamType] = useState<LamType>("gloss");
  const [lamSides, setLamSides] = useState(2);
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [spotVarnishAreaCm2, setSpotVarnishAreaCm2] = useState(20);
  const [optStamp, setOptStamp] = useState(false);
  const [stampAreaCm2, setStampAreaCm2] = useState(8);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(true);
  const [optRound, setOptRound] = useState(true);
  const [roundCorners, setRoundCorners] = useState(4);

  // Переменные данные
  const [optQR, setOptQR] = useState(false);
  const [optBarcode, setOptBarcode] = useState(false);
  const [optPersonal, setOptPersonal] = useState(false);
  const [personalCount, setPersonalCount] = useState(1);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("stack");

  // Доработка 85 — ERP-обвязка
  const [prepress, setPrepress] = useState<PrepressState>(DEFAULT_PREPRESS);
  const [qc, setQc] = useState<QcState>(DEFAULT_QC);
  const [packaging, setPackaging] = useState<PackagingState>(DEFAULT_PACKAGING);
  const [cover, setCover] = useState<CoverState>(DEFAULT_COVER);
  const [underlay, setUnderlay] = useState<UnderlayState>(DEFAULT_UNDERLAY);
  const [assembly, setAssembly] = useState<AssemblyState>(DEFAULT_ASSEMBLY);
  const [specialOps, setSpecialOps] = useState<SpecialOpsState>(DEFAULT_SPECIAL_OPS);

  const format = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[0], [presetKey]);
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;

  // Доработка 85 — глобальные параметры в ERP-контекст
  const calcCtx = useMultipageCalcOptional();
  useEffect(() => {
    if (!calcCtx) return;
    calcCtx.setGlobal({
      format: format.value === "custom" ? `${itemW}×${itemH}` : format.value,
      formatWidth: itemW,
      formatHeight: itemH,
      circulation,
      printType: printMode,
      bindingType: "none",
      marginPercent: margin,
    });
  }, [calcCtx, format.value, itemW, itemH, circulation, printMode, margin]);
  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу
  useEffect(() => {
    if (kind === "qr") setOptQR(true);
    if (kind === "personal") setOptPersonal(true);
    if (kind === "premium") {
      if (lamType === "none" || lamType === "gloss" || lamType === "mat") setLamType("soft");
      setOptStamp(true);
      setOptEmboss(true);
      if (packKind === "none" || packKind === "stack") setPackKind("bag");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => { if (optDieCut && !optDeflash) setOptDeflash(true); }, [optDieCut, optDeflash]);

  // При встраивании в Calculator (Новый расчёт) подхватываем шаблон ?from=…
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (!embedded) return;
    const tpl = searchParams.get("from");
    if (!tpl) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("calculations")
        .select("circulation,format_type,format_width,format_height,color_front,color_back,margin_percent")
        .eq("id", tpl)
        .single();
      if (cancelled || error || !data) return;
      if (data.circulation) setCirculation(Number(data.circulation));
      if (data.format_type) {
        const known = FORMATS.find((f) => f.value === data.format_type);
        setPresetKey(known ? known.value : "custom");
      }
      if (data.format_width) setCustomW(Number(data.format_width));
      if (data.format_height) setCustomH(Number(data.format_height));
      if (data.color_front != null) setColorFront(Number(data.color_front));
      if (data.color_back != null) setColorBack(Number(data.color_back));
      if (data.margin_percent) setMargin(Number(data.margin_percent));
      toast.info("Шаблон применён");
    })();
    return () => { cancelled = true; };
  }, [embedded, searchParams]);

  const variable = optQR || optBarcode || optPersonal;
  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500 && !variable);

  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.1;
    if (lamType === "soft" || lamType === "antiscratch") k += 0.1;
    if (optStamp) k += 0.05;
    if (optEmboss) k += 0.05;
    if (kind === "premium") k += 0.1;
    return +k.toFixed(2);
  }, [material, lamType, optStamp, optEmboss, kind]);

  const layout = useMemo(() => {
    const sw = material.sheetW, sh = material.sheetH;
    const w = itemW + 4; // вылеты
    const h = itemH + 4;
    const a = Math.floor(sw / w) * Math.floor(sh / h);
    const b = Math.floor(sw / h) * Math.floor(sh / w);
    const up = Math.max(1, a, b);
    const net = Math.ceil(circulation / up);
    const setup = offset ? (ownTurn ? 150 : 300) + Math.ceil(net * 0.01) : 20;
    return { up, net, printSheets: net + setup, areaM2: (sw * sh) / 1_000_000 };
  }, [material, itemW, itemH, circulation, offset, ownTurn]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн карманного календаря", 1, "усл.", 5000);
    push("Препресс", "Проверка и подготовка макета", 1, "усл.", 800);
    if (hasGrid) push("Препресс", `Календарная сетка ${year} (${GRID_LANGS.find(g => g.value === gridLang)?.label})`, 1, "усл.", 1200);

    // Материал
    push("Материалы", `Бумага: ${material.label}`, layout.printSheets, "лист", material.pricePerSheet);
    if (material.sheetW > 720 || material.sheetH > 1020) {
      push("Препресс", "Резка закупочного листа", layout.printSheets, "лист", 0.4);
    }

    // Печать
    if (offset) {
      let forms = Math.max(colorFront, 0) + (twoSides ? Math.max(colorBack, 0) : 0);
      if (!ownTurn && twoSides && colorFront > 0 && colorBack > 0) forms = colorFront + colorBack;
      forms += pantoneCount;
      push("Печать", "Печатные формы", forms, "форма", 1500);
      const setupCost = (ownTurn ? 150 : 300) + Math.ceil(layout.printSheets * 0.01);
      push("Печать", "Приладка", 1, "усл.", setupCost);
    }
    push("Печать", offset ? "Печать (офсет)" : "Печать (цифра)",
      layout.printSheets, "лист", offset ? 6 : 32);

    // Ламинация (по площади печатного листа × кол-во сторон)
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label} (${lamSides} ст.)`,
        +(layout.areaM2 * layout.printSheets * lamSides).toFixed(3), "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }
    if (optVarnish) push("Постпечать", "УФ/ВД-лак", layout.printSheets, "лист", 5);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Приладка выб. лака", 1, "усл.", 1500);
      const areaM2 = (spotVarnishAreaCm2 / 10000) * circulation;
      push("Постпечать", "Выборочный лак", +areaM2.toFixed(3), "м²", 1200);
    }
    if (optStamp) {
      push("Постпечать", "Клише тиснения", 1, "усл.", Math.max(2000, stampAreaCm2 * 80));
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1200);
      push("Постпечать", "Фольга (площадь)",
        +((stampAreaCm2 / 10000) * circulation).toFixed(3), "м²", 1800);
      push("Постпечать", "Тиснение фольгой (нанесение)",
        circulation, "оттиск", +(Math.max(6, stampAreaCm2 * 0.6) * premiumCoef).toFixed(2));
    }
    if (optEmboss) {
      push("Постпечать", "Клише конгрева", 1, "усл.", 3000);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1200);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", +(10 * premiumCoef).toFixed(2));
    }
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", 5500);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      push("Постпечать", "Высечка", layout.printSheets, "лист", 4);
      if (optDeflash)
        push("Постпечать", "Удаление облоя",
          layout.printSheets * layout.up, "изд.", +(1.0 * premiumCoef).toFixed(2));
    }

    // Резка готовой продукции
    push("Постпечать", "Резка готовой продукции", layout.printSheets, "лист", 1.0);
    if (optRound) push("Постпечать", "Скругление углов", circulation * roundCorners, "угол", 0.6);

    // Переменные данные
    if (optQR) {
      push("Персонализация", "QR-код (подготовка)", 1, "усл.", 2000);
      push("Персонализация", "QR-код (нанесение)", circulation, "элемент", 8);
    }
    if (optBarcode) {
      push("Персонализация", "Штрихкод (подготовка)", 1, "усл.", 1500);
      push("Персонализация", "Штрихкод (нанесение)", circulation, "элемент", 5);
    }
    if (optPersonal) {
      push("Персонализация", "Подготовка персонализации", 1, "усл.", 2500);
      push("Персонализация", "Персонализация (нанесение)",
        circulation * Math.max(1, personalCount), "элемент", 7);
    }

    // Контроль качества (с коэф. персонализации)
    const qcCoef = variable ? 1.5 : 1.0;
    push("Логистика", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef + ")" : ""}`,
      circulation, "изд.", +(0.8 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") push("Упаковка", `Упаковка: ${pack.label}`, circulation, "шт.", pack.price);
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [hasDesign, hasGrid, year, gridLang, material, layout, offset, ownTurn, twoSides,
      colorFront, colorBack, pantoneCount, lamType, lam, lamSides,
      optVarnish, optSpotVarnish, spotVarnishAreaCm2, optStamp, stampAreaCm2, optEmboss,
      optDieCut, optDeflash, optRound, roundCorners,
      optQR, optBarcode, optPersonal, personalCount, variable,
      packKind, pack, circulation, premiumCoef, hasDelivery, deliveryCost]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.total, 0);
    const sale = cost * (1 + margin / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [lines, margin, vatPercent, circulation]);

  useEffect(() => {
    if (!onResult) return;
    const result = toTemplatePriceResult(lines, { margin, vatPercent, circulation });
    onResult({ result, margin, vatPercent });
  }, [lines, margin, vatPercent, circulation, onResult]);

  const route = useMemo(() => {
    const s: string[] = [];
    if (hasDesign) s.push("Дизайн");
    s.push("Проверка макета");
    if (hasGrid) s.push(`Календарная сетка ${year}`);
    s.push("Подбор печатного формата и раскладка", "Расчёт материала");
    if (material.sheetW > 720 || material.sheetH > 1020) s.push("Резка закупочного листа");
    if (offset) s.push("Вывод печатных форм", "Приладка");
    s.push(offset ? "Печать (офсет)" : "Печать (цифра)");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label} (${lamSides} ст.)`);
    if (optVarnish) s.push("УФ/ВД-лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optStamp) s.push("Тиснение фольгой");
    if (optEmboss) s.push("Конгрев");
    if (optDieCut) { s.push("Высечка"); if (optDeflash) s.push("Удаление облоя"); }
    s.push("Резка готовой продукции");
    if (optRound) s.push("Скругление углов");
    if (optQR) s.push("QR-код");
    if (optBarcode) s.push("Штрихкод");
    if (optPersonal) s.push("Персонализация");
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, hasGrid, year, material, offset, lamType, lam, lamSides,
      optVarnish, optSpotVarnish, optStamp, optEmboss, optDieCut, optDeflash,
      optRound, optQR, optBarcode, optPersonal, packKind, pack, hasDelivery]);

  const Shell: any = embedded ? Fragment : PageShell;
  const Main: any = embedded ? Fragment : PageMain;
  return (
    <Shell>
      {!embedded && (
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <CalendarDays className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Календарь карманный</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Двусторонняя печать, ламинация, скругление углов, сетка, упаковка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 63</Badge>
        </PageHeaderRow>
      </PageHeader>
      )}

      <Main>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Готовый формат</Label>
                    <Select value={presetKey} onValueChange={setPresetKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  {presetKey === "custom" && (<>
                    <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 0)} /></div>
                    <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 0)} /></div>
                  </>)}
                  <div className="sm:col-span-2">
                    <Label>Тип изделия</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="twoSides" checked={twoSides} onCheckedChange={(v) => setTwoSides(!!v)} />
                    <Label htmlFor="twoSides" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="ownturn" checked={ownTurn} onCheckedChange={(v) => setOwnTurn(!!v)} />
                    <Label htmlFor="ownturn" className="cursor-pointer">Свой оборот</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground self-end">
                    Размер: <b>{itemW}×{itemH}</b> мм · {variable ? "переменные → цифра" : "стандартный режим"}
                  </div>
                </CardContent>
              </Card>

              <AdvancedOnly>
                <CoverSection value={cover} onChange={setCover} title="2. Обложка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <UnderlaySection value={underlay} onChange={setUnderlay} title="3. Подложка" />
              </AdvancedOnly>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "grid", "postpress"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал и печать
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Материал</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerSheet)}/лист){m.designer ? " · дизайнерская" : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Плотность, г/м²</Label><Input value={material.density} readOnly /></div>
                          <div><Label>Premium</Label><Input value={material.premium ? "да" : "нет"} readOnly /></div>
                          <div><Label>Цветность (лицо)</Label><Input type="number" min={0} max={6} value={colorFront} onChange={(e) => setColorFront(+e.target.value || 0)} /></div>
                          <div><Label>Цветность (оборот)</Label><Input type="number" min={0} max={6} value={colorBack} onChange={(e) => setColorBack(+e.target.value || 0)} disabled={!twoSides} /></div>
                          <div><Label>Pantone-красок</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          <AdvancedOnly>
                            <div className="sm:col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                              На лист: <b>{layout.up}</b> шт. · Полезных листов: <b>{layout.net}</b> · С приладкой: <b>{layout.printSheets}</b>.
                              Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>.
                            </div>
                          </AdvancedOnly>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="grid">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Календарная сетка
                          <Badge variant={hasGrid ? "default" : "outline"} className="text-[10px]">
                            {hasGrid ? `${year} · ${GRID_LANGS.find(g => g.value === gridLang)?.label}` : "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="hasGrid" checked={hasGrid} onCheckedChange={(v) => setHasGrid(!!v)} />
                            <Label htmlFor="hasGrid" className="cursor-pointer">Включить календарную сетку</Label>
                          </div>
                          {hasGrid && (<>
                            <div><Label>Год</Label><Input type="number" min={2024} value={year} onChange={(e) => setYear(+e.target.value || year)} /></div>
                            <div>
                              <Label>Язык сетки</Label>
                              <Select value={gridLang} onValueChange={(v) => setGridLang(v as GridLang)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {GRID_LANGS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="postpress">
                      <AccordionTrigger>4. Постпечатные операции</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Ламинация</Label>
                            <Select value={lamType} onValueChange={(v) => setLamType(v as LamType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/м²)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Сторон ламинации</Label>
                            <Select value={String(lamSides)} onValueChange={(v) => setLamSides(+v)} disabled={lamType === "none"}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Односторонняя</SelectItem>
                                <SelectItem value="2">Двусторонняя</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 space-y-2 text-sm">
                            <Row label="УФ / ВД-лак" checked={optVarnish} onChange={setOptVarnish} />
                            <Row label="Выборочный лак" checked={optSpotVarnish} onChange={setOptSpotVarnish}>
                              <Input className="h-8 w-24" type="number" min={1} value={spotVarnishAreaCm2} onChange={(e) => setSpotVarnishAreaCm2(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">см²/изд.</span>
                            </Row>
                            <Row label="Тиснение фольгой" checked={optStamp} onChange={setOptStamp}>
                              <Input className="h-8 w-24" type="number" min={1} value={stampAreaCm2} onChange={(e) => setStampAreaCm2(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">см² клише</span>
                            </Row>
                            <Row label="Конгрев" checked={optEmboss} onChange={setOptEmboss} />
                            <Row label="Высечка (фигурный календарь)" checked={optDieCut} onChange={setOptDieCut} />
                            <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                            <Row label="Скругление углов" checked={optRound} onChange={setOptRound}>
                              <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">угла</span>
                            </Row>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="variable">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Переменные данные
                          <Badge variant={variable ? "default" : "outline"} className="text-[10px]">
                            {[optQR && "QR", optBarcode && "штрихкод", optPersonal && "персонализация"].filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pt-2">
                          <Row label="QR-код" checked={optQR} onChange={setOptQR} />
                          <Row label="Штрихкод" checked={optBarcode} onChange={setOptBarcode} />
                          <Row label="Персонализация" checked={optPersonal} onChange={setOptPersonal}>
                            <Input className="h-8 w-20" type="number" min={1} value={personalCount} onChange={(e) => setPersonalCount(+e.target.value || 1)} />
                            <span className="text-xs text-muted-foreground">элем./изд.</span>
                          </Row>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>6. Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Упаковка</Label>
                            <Select value={packKind} onValueChange={(v) => setPackKind(v as PackKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PACKS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}{p.price ? ` · ${fmtMoney(p.price)}/шт` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="delivery" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                            <Label htmlFor="delivery" className="cursor-pointer">Включить доставку</Label>
                          </div>
                          {hasDelivery && (<div><Label>Стоимость доставки</Label><Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(+e.target.value || 0)} /></div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">12. Маршрут</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 list-decimal pl-4">
                    {route.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>

              <AdvancedOnly>
                <PrepressSection value={prepress} onChange={setPrepress} title="5. Допечатка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <AssemblySection value={assembly} onChange={setAssembly} title="8. Сборка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <SpecialOpsSection value={specialOps} onChange={setSpecialOps} title="9. Спецоперации" />
              </AdvancedOnly>
              <AdvancedOnly>
                <QualityControlSection value={qc} onChange={setQc} title="10. Контроль качества" />
              </AdvancedOnly>
              <AdvancedOnly>
                <PackagingSection value={packaging} onChange={setPackaging} title="11. Упаковка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <TechWarnings warnings={[]} />
              </AdvancedOnly>
              <AdvancedOnly>
                <RouteTimeline operations={route.map((label, idx) => ({ id: String(idx), label, stage: "assembly" as const }))} />
              </AdvancedOnly>
              <AdvancedOnly>
                <CompositionTable rows={[]} />
              </AdvancedOnly>
              <TechOnly>
                <TechReport data={{ material: { name: format.value }, imposition: {}, print: { type: printMode }, postpress: [], route: route.map((label, idx) => ({ id: String(idx), label, stage: "assembly" as const })) }} />
              </TechOnly>

              <Card>
                <CardHeader><CardTitle className="text-sm">13. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                  <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="leaflet"
                defaultName={`Карманный календарь ${year} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <CostByStageBlock
              storageKey="pocket-calendar"
              spec={lines.map((l) => ({ stage: l.stage, name: l.name, qty: l.qty, unit: l.unit, price: l.price, total: l.total }))}
              metrics={{
                printSheets: layout.printSheets,
                purchaseSheets: layout.net,
                wasteSheets: Math.max(0, layout.printSheets - layout.net) || undefined,
              }}
            />
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm">Спецификация</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Этап</TableHead>
                    <TableHead>Операция</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead>Ед.</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">Итого</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{l.stage}</TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell className="text-right">{fmtNum(l.qty)}</TableCell>
                      <TableCell>{l.unit}</TableCell>
                      <TableCell className="text-right">{fmtMoney(l.price)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(l.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageContainer>
      </Main>
    </Shell>
  );
}

function Row({ label, checked, onChange, children }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="flex-1 min-w-0">{label}</span>
      {children}
    </div>
  );
}