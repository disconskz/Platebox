import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, fmtNum } from "@/lib/format";
import { toast } from "sonner";
import TemplateActions from "@/components/calc/TemplateActions";
import { toTemplatePriceResult } from "@/lib/calc/template-result";
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
 * Доработка 57 — выделенный шаблон «Календарь-домик».
 * Настольный календарь-домик с основанием, перекидными листами,
 * биговкой, высечкой, пружиной и конструктивной сборкой.
 */

type Material = {
  id: string;
  name: string;
  cost_per_sheet: number;
  format_width: number;
  format_height: number;
  density?: number | null;
};

type SpecItem = {
  stage: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

const BASE_FORMATS: { value: string; label: string; w: number; h: number }[] = [
  { value: "small", label: "Малый (150×170 мм)", w: 150, h: 170 },
  { value: "medium", label: "Средний (170×200 мм)", w: 170, h: 200 },
  { value: "large", label: "Большой (200×230 мм)", w: 200, h: 230 },
  { value: "custom", label: "Свой размер", w: 170, h: 200 },
];

export interface DeskCalendarCalculatorProps {
  embedded?: boolean;
  onResult?: (payload: import("@/pages/BoxProCalculator").BoxProResultPayload) => void;
}
export default function DeskCalendarCalculator({ embedded = false, onResult }: DeskCalendarCalculatorProps = {}) {
  // Основные параметры
  const [circulation, setCirculation] = useState(100);
  const [basePreset, setBasePreset] = useState("medium");
  const [baseW, setBaseW] = useState(170);
  const [baseH, setBaseH] = useState(200);
  const [foldedW, setFoldedW] = useState(85);
  const [foldedH, setFoldedH] = useState(200);
  const [spreadW, setSpreadW] = useState(340);
  const [spreadH, setSpreadH] = useState(200);
  const [colorBaseFront, setColorBaseFront] = useState(4);
  const [colorBaseBack, setColorBaseBack] = useState(0);
  const [colorLeafFront, setColorLeafFront] = useState(4);
  const [colorLeafBack, setColorLeafBack] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [margin, setMargin] = useState(30);
  const [vatPercent, setVatPercent] = useState(16);

  // Перекидные листы
  const [hasFlipSheets, setHasFlipSheets] = useState(true);
  const [flipSheetCount, setFlipSheetCount] = useState(12);

  // Бумага (справочник)
  const [materials, setMaterials] = useState<Material[]>([]);
  const [baseMaterialId, setBaseMaterialId] = useState<string>("");
  const [leafMaterialId, setLeafMaterialId] = useState<string>("");

  // Постпечатные опции
  const [optBaseLam, setOptBaseLam] = useState(false);
  const [optBaseLamSides, setOptBaseLamSides] = useState<1 | 2>(1);
  const [optLeafLam, setOptLeafLam] = useState(false);
  const [optLeafLamSides, setOptLeafLamSides] = useState<1 | 2>(1);
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optVarnish, setOptVarnish] = useState(false);
  const [varnishType, setVarnishType] = useState<"uv_full" | "uv_spot" | "vd">("uv_full");
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);
  const [optBigBase, setOptBigBase] = useState(true);
  const [bigBaseCount, setBigBaseCount] = useState(2);
  const [optSpring, setOptSpring] = useState(true);
  const [springHoles, setSpringHoles] = useState(12);
  const [optStamp, setOptStamp] = useState(false);
  const [stampW, setStampW] = useState(5);
  const [stampH, setStampH] = useState(3);
  const [optEmboss, setOptEmboss] = useState(false);
  const [embossW, setEmbossW] = useState(5);
  const [embossH, setEmbossH] = useState(3);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);
  const [optMagnets, setOptMagnets] = useState(false);
  const [magnetsPerItem, setMagnetsPerItem] = useState(2);
  const [optIndividualPack, setOptIndividualPack] = useState(false);
  const [packType, setPackType] = useState<"bag" | "shrink" | "box" | "premium">("bag");

  // Доработка 85 — ERP-обвязка
  const [prepress, setPrepress] = useState<PrepressState>(DEFAULT_PREPRESS);
  const [qc, setQc] = useState<QcState>(DEFAULT_QC);
  const [packaging, setPackaging] = useState<PackagingState>(DEFAULT_PACKAGING);
  const [cover, setCover] = useState<CoverState>(DEFAULT_COVER);
  const [underlay, setUnderlay] = useState<UnderlayState>(DEFAULT_UNDERLAY);
  const [assembly, setAssembly] = useState<AssemblyState>(DEFAULT_ASSEMBLY);
  const [specialOps, setSpecialOps] = useState<SpecialOpsState>(DEFAULT_SPECIAL_OPS);

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
        const known = BASE_FORMATS.find((f) => f.value === data.format_type);
        setBasePreset(known ? known.value : "custom");
      }
      if (data.format_width) setBaseW(Number(data.format_width));
      if (data.format_height) setBaseH(Number(data.format_height));
      if (data.color_front != null) {
        setColorBaseFront(Number(data.color_front));
        setColorLeafFront(Number(data.color_front));
      }
      if (data.color_back != null) {
        setColorBaseBack(Number(data.color_back));
        setColorLeafBack(Number(data.color_back));
      }
      if (data.margin_percent) setMargin(Number(data.margin_percent));
      toast.info("Шаблон применён");
    })();
    return () => { cancelled = true; };
  }, [embedded, searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("materials")
          .select("id,name,cost_per_sheet,format_width,format_height,density")
          .order("name");
        if (error) throw error;
        const m = (data as Material[]) || [];
        setMaterials(m);
        if (m.length) {
          if (!baseMaterialId) setBaseMaterialId(m[0].id);
          if (!leafMaterialId) setLeafMaterialId(m[0].id);
        }
      } catch (e: any) {
        toast.error("Не удалось загрузить справочники: " + (e?.message || ""));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseMaterial = useMemo(() => materials.find((m) => m.id === baseMaterialId), [materials, baseMaterialId]);
  const leafMaterial = useMemo(() => materials.find((m) => m.id === leafMaterialId), [materials, leafMaterialId]);

  const preset = useMemo(() => BASE_FORMATS.find((f) => f.value === basePreset) ?? BASE_FORMATS[1], [basePreset]);
  const baseSize = useMemo(() => {
    if (preset.value === "custom") return { w: baseW, h: baseH };
    return { w: preset.w, h: preset.h };
  }, [preset, baseW, baseH]);

  // Доработка 85 — синхронизация глобальных параметров
  const calcCtx = useMultipageCalcOptional();
  useEffect(() => {
    if (!calcCtx) return;
    calcCtx.setGlobal({
      format: preset.value === "custom" ? `${baseSize.w}×${baseSize.h}` : preset.value,
      formatWidth: baseSize.w,
      formatHeight: baseSize.h,
      circulation,
      printType: printMode,
      bindingType: optSpring ? "spring" : "none",
      marginPercent: margin,
    });
  }, [calcCtx, preset.value, baseSize.w, baseSize.h, circulation, printMode, optSpring, margin]);

  // Автоматическая логика
  useEffect(() => {
    // Если есть перекидные листы → пружина
    if (hasFlipSheets && !optSpring) setOptSpring(true);
    // Если нет перекидных листов → убрать пружину
    if (!hasFlipSheets && optSpring) setOptSpring(false);
    // Если есть высечка → удаление облоя
    if (optDieCut && !optDeflash) setOptDeflash(true);
    if (!optDieCut && optDeflash) setOptDeflash(false);
    // Биговка основания обязательна
    if (!optBigBase) setOptBigBase(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFlipSheets, optDieCut]);

  // ========== РАСЧЁТЫ ==========
  const setup = 1500;

  // Площадь листа основания (м²)
  const baseAreaM2 = (baseSize.w * baseSize.h) / 1_000_000;
  // Площадь листа перекидных листов (м²)
  const leafAreaM2 = (spreadW * spreadH) / 1_000_000;

  // Раскладка (упрощённо)
  const baseLayout = useMemo(() => {
    if (!baseMaterial) return null;
    const pw = baseMaterial.format_width;
    const ph = baseMaterial.format_height;
    const cols = Math.max(1, Math.floor(pw / (baseSize.w + 2)));
    const rows = Math.max(1, Math.floor(ph / (baseSize.h + 2)));
    const items = cols * rows;
    return { cols, rows, itemsPerSheet: items, printW: pw, printH: ph };
  }, [baseMaterial, baseSize.w, baseSize.h]);

  const leafLayout = useMemo(() => {
    if (!leafMaterial) return null;
    const pw = leafMaterial.format_width;
    const ph = leafMaterial.format_height;
    const cols = Math.max(1, Math.floor(pw / (spreadW + 2)));
    const rows = Math.max(1, Math.floor(ph / (spreadH + 2)));
    const items = cols * rows;
    return { cols, rows, itemsPerSheet: items, printW: pw, printH: ph };
  }, [leafMaterial, spreadW, spreadH]);

  // Печатные листы
  const basePrintSheets = useMemo(() => {
    if (!baseLayout) return 0;
    const sheets = Math.ceil(circulation / baseLayout.itemsPerSheet);
    // Приладка
    const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);
    const setupSheets = offset ? Math.max(150, Math.round(sheets * 0.01)) : 0;
    return sheets + setupSheets;
  }, [baseLayout, circulation, printMode]);

  const leafPrintSheets = useMemo(() => {
    if (!hasFlipSheets || !leafLayout) return 0;
    const totalSheets = circulation * flipSheetCount;
    const sheets = Math.ceil(totalSheets / leafLayout.itemsPerSheet);
    const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);
    const setupSheets = offset ? Math.max(150, Math.round(sheets * 0.01)) : 0;
    return sheets + setupSheets;
  }, [hasFlipSheets, leafLayout, circulation, flipSheetCount, printMode]);

  // Цены печати
  const printPricePerSheet = useMemo(() => {
    const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);
    const colors = Math.max(colorBaseFront, colorBaseBack);
    if (offset) {
      return colors <= 1 ? 12 : colors <= 2 ? 18 : colors <= 4 ? 28 : 40;
    }
    return colors <= 1 ? 25 : colors <= 2 ? 35 : colors <= 4 ? 55 : 80;
  }, [printMode, circulation, colorBaseFront, colorBaseBack]);

  const leafPrintPricePerSheet = useMemo(() => {
    const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);
    const colors = Math.max(colorLeafFront, colorLeafBack);
    if (offset) {
      return colors <= 1 ? 12 : colors <= 2 ? 18 : colors <= 4 ? 28 : 40;
    }
    return colors <= 1 ? 25 : colors <= 2 ? 35 : colors <= 4 ? 55 : 80;
  }, [printMode, circulation, colorLeafFront, colorLeafBack]);

  // Формы (офсет)
  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);
  const baseForms = offset ? Math.ceil((colorBaseFront + colorBaseBack) / 2) : 0;
  const leafForms = offset && hasFlipSheets ? Math.ceil((colorLeafFront + colorLeafBack) / 2) : 0;
  const formPrice = 3500;

  // Спецификация
  const spec = useMemo<SpecItem[]>(() => {
    const out: SpecItem[] = [];

    // Дизайн
    if (hasDesign) {
      out.push({ stage: "prepress", name: "Дизайн основания", quantity: 1, unit: "шт", unitPrice: 5000, total: 5000 });
      if (hasFlipSheets) {
        out.push({ stage: "prepress", name: "Дизайн перекидных листов", quantity: 1, unit: "шт", unitPrice: 3000, total: 3000 });
      }
    }

    // Проверка макета
    out.push({ stage: "prepress", name: "Проверка и подготовка макета", quantity: 1, unit: "шт", unitPrice: 500, total: 500 });

    // Подбор формата
    out.push({ stage: "prepress", name: "Подбор печатного формата и раскладка", quantity: 1, unit: "шт", unitPrice: 300, total: 300 });

    // Бумага основания
    if (baseMaterial) {
      const price = Number(baseMaterial.cost_per_sheet) || 0;
      out.push({ stage: "material", name: `Бумага основания: ${baseMaterial.name}`, quantity: basePrintSheets, unit: "лист", unitPrice: price, total: basePrintSheets * price });
    }

    // Бумага перекидных листов
    if (hasFlipSheets && leafMaterial) {
      const price = Number(leafMaterial.cost_per_sheet) || 0;
      out.push({ stage: "material", name: `Бумага перекидных листов: ${leafMaterial.name}`, quantity: leafPrintSheets, unit: "лист", unitPrice: price, total: leafPrintSheets * price });
    }

    // Формы
    if (baseForms > 0) {
      out.push({ stage: "prepress", name: "Вывод печатных форм (основание)", quantity: baseForms, unit: "шт", unitPrice: formPrice, total: baseForms * formPrice });
    }
    if (leafForms > 0) {
      out.push({ stage: "prepress", name: "Вывод печатных форм (перекидные листы)", quantity: leafForms, unit: "шт", unitPrice: formPrice, total: leafForms * formPrice });
    }

    // Приладка
    if (offset) {
      const baseSetup = Math.max(150, Math.round((basePrintSheets || 0) * 0.01));
      const leafSetup = hasFlipSheets ? Math.max(150, Math.round((leafPrintSheets || 0) * 0.01)) : 0;
      out.push({ stage: "print", name: "Приладка (основание)", quantity: baseSetup, unit: "лист", unitPrice: printPricePerSheet, total: baseSetup * printPricePerSheet });
      if (hasFlipSheets) {
        out.push({ stage: "print", name: "Приладка (перекидные листы)", quantity: leafSetup, unit: "лист", unitPrice: leafPrintPricePerSheet, total: leafSetup * leafPrintPricePerSheet });
      }
    }

    // Печать основания
    if (basePrintSheets > 0) {
      out.push({ stage: "print", name: "Печать основания", quantity: basePrintSheets, unit: "лист", unitPrice: printPricePerSheet, total: basePrintSheets * printPricePerSheet });
    }

    // Печать перекидных листов
    if (hasFlipSheets && leafPrintSheets > 0) {
      out.push({ stage: "print", name: "Печать перекидных листов", quantity: leafPrintSheets, unit: "лист", unitPrice: leafPrintPricePerSheet, total: leafPrintSheets * leafPrintPricePerSheet });
    }

    // Ламинация основания
    if (optBaseLam && baseMaterial) {
      const price = 18; // тг за м²
      const area = baseAreaM2 * (optBaseLamSides as number);
      out.push({ stage: "postpress", name: `Ламинация основания (${optBaseLamSides} стор.) — приладка`, quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Ламинация основания`, quantity: basePrintSheets, unit: "лист", unitPrice: area * price, total: basePrintSheets * area * price });
    }

    // Ламинация перекидных листов
    if (hasFlipSheets && optLeafLam && leafMaterial) {
      const price = 18;
      const area = leafAreaM2 * (optLeafLamSides as number);
      out.push({ stage: "postpress", name: `Ламинация перекидных листов (${optLeafLamSides} стор.) — приладка`, quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Ламинация перекидных листов`, quantity: leafPrintSheets, unit: "лист", unitPrice: area * price, total: leafPrintSheets * area * price });
    }

    // Soft-touch
    if (optSoftTouch) {
      const sheets = basePrintSheets;
      out.push({ stage: "postpress", name: "Soft-touch ламинация (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Soft-touch ламинация", quantity: sheets, unit: "лист", unitPrice: 35, total: sheets * 35 });
    }

    // Лак
    if (optVarnish) {
      const sheets = basePrintSheets;
      const price = varnishType === "uv_full" ? 8 : varnishType === "uv_spot" ? 12 : 4;
      out.push({ stage: "postpress", name: `Лак (${varnishType === "vd" ? "ВД" : varnishType === "uv_spot" ? "УФ выборочный" : "УФ сплошной"}) — приладка`, quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Лак — нанесение", quantity: sheets, unit: "лист", unitPrice: price, total: sheets * price });
      if (varnishType === "uv_spot") {
        out.push({ stage: "prepress", name: "Выборочный лак — подготовка трафарета", quantity: 1, unit: "шт", unitPrice: 3000, total: 3000 });
        out.push({ stage: "postpress", name: "Выборочный лак — доп. приладка", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      }
    }

    // Высечка
    if (optDieCut) {
      const price = 2.5;
      out.push({ stage: "postpress", name: "Высечка (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Высечка", quantity: circulation, unit: "изд", unitPrice: price, total: circulation * price });
      out.push({ stage: "postpress", name: "Стоимость штампа высечки", quantity: 1, unit: "шт", unitPrice: 15000, total: 15000 });
    }

    // Удаление облоя
    if (optDieCut && optDeflash) {
      const price = 0.5;
      out.push({ stage: "postpress", name: "Удаление облоя (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Удаление облоя", quantity: circulation, unit: "изд", unitPrice: price, total: circulation * price });
    }

    // Биговка основания (обязательная)
    if (optBigBase) {
      const price = 1.5;
      out.push({ stage: "postpress", name: `Биговка основания (${bigBaseCount} биг.)`, quantity: circulation * bigBaseCount, unit: "биг", unitPrice: price, total: circulation * bigBaseCount * price });
      out.push({ stage: "postpress", name: "Биговка основания (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
    }

    // Перфорация под пружину
    if (hasFlipSheets && optSpring) {
      const price = 0.3;
      out.push({ stage: "postpress", name: `Перфорация под пружину (${springHoles} отв.)`, quantity: circulation * springHoles, unit: "отв.", unitPrice: price, total: circulation * springHoles * price });
      out.push({ stage: "postpress", name: "Перфорация (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
    }

    // Навивка пружины
    if (hasFlipSheets && optSpring) {
      const price = 45;
      const springPrice = 25;
      out.push({ stage: "postpress", name: "Навивка пружины", quantity: circulation, unit: "изд", unitPrice: price, total: circulation * price });
      out.push({ stage: "material", name: "Пружина", quantity: circulation, unit: "шт", unitPrice: springPrice, total: circulation * springPrice });
      out.push({ stage: "postpress", name: "Навивка пружины (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
    }

    // Сборка конструкции
    {
      const complexity = (optSoftTouch || optStamp || optBaseLam) ? 1.3 : 1.0;
      const price = 80 * complexity;
      out.push({ stage: "assembly", name: `Сборка конструкции домика (коэф. ${complexity.toFixed(1)})`, quantity: circulation, unit: "изд", unitPrice: price, total: circulation * price });
    }

    // Тиснение
    if (optStamp) {
      const area = stampW * stampH;
      out.push({ stage: "postpress", name: "Тиснение (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Тиснение — нанесение", quantity: circulation, unit: "изд", unitPrice: area * 12, total: circulation * area * 12 });
      out.push({ stage: "postpress", name: "Тиснение — фольга", quantity: circulation, unit: "изд", unitPrice: area * 8, total: circulation * area * 8 });
      out.push({ stage: "prepress", name: "Тиснение — клише", quantity: 1, unit: "шт", unitPrice: 8000, total: 8000 });
    }

    // Конгрев
    if (optEmboss) {
      const area = embossW * embossH;
      out.push({ stage: "postpress", name: "Конгрев (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Конгрев — нанесение", quantity: circulation, unit: "изд", unitPrice: area * 10, total: circulation * area * 10 });
      out.push({ stage: "prepress", name: "Конгрев — клише", quantity: 1, unit: "шт", unitPrice: 8000, total: 8000 });
    }

    // Скругление углов
    if (optRound) {
      const price = 0.8;
      out.push({ stage: "postpress", name: "Скругление углов (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Скругление углов (${roundCorners} угла)`, quantity: circulation * roundCorners, unit: "угол", unitPrice: price, total: circulation * roundCorners * price });
    }

    // Магниты
    if (optMagnets) {
      const installPrice = 35;
      const magnetPrice = 25;
      out.push({ stage: "assembly", name: "Установка магнитов", quantity: circulation * magnetsPerItem, unit: "шт", unitPrice: installPrice, total: circulation * magnetsPerItem * installPrice });
      out.push({ stage: "material", name: "Магниты", quantity: circulation * magnetsPerItem, unit: "шт", unitPrice: magnetPrice, total: circulation * magnetsPerItem * magnetPrice });
    }

    // Индивидуальная упаковка
    if (optIndividualPack) {
      const packPrices: Record<string, number> = { bag: 15, shrink: 25, box: 120, premium: 350 };
      out.push({ stage: "packing", name: `Индивидуальная упаковка (${packType})`, quantity: circulation, unit: "изд", unitPrice: packPrices[packType], total: circulation * packPrices[packType] });
    }

    // Упаковка
    out.push({ stage: "packing", name: "Упаковка", quantity: circulation, unit: "изд", unitPrice: 8, total: circulation * 8 });

    // Контроль качества
    out.push({ stage: "qc", name: "Контроль качества", quantity: circulation, unit: "изд", unitPrice: 5, total: circulation * 5 });

    // Доставка
    if (hasDelivery) {
      out.push({ stage: "delivery", name: "Доставка", quantity: 1, unit: "шт", unitPrice: deliveryCost, total: deliveryCost });
    }

    return out;
  }, [
    hasDesign, hasFlipSheets, flipSheetCount, baseMaterial, leafMaterial, basePrintSheets, leafPrintSheets,
    baseForms, leafForms, formPrice, offset, printPricePerSheet, leafPrintPricePerSheet, circulation,
    optBaseLam, optBaseLamSides, optLeafLam, optLeafLamSides, optSoftTouch, optVarnish, varnishType,
    optDieCut, optDeflash, optBigBase, bigBaseCount, optSpring, springHoles, optStamp, stampW, stampH,
    optEmboss, embossW, embossH, optRound, roundCorners, optMagnets, magnetsPerItem, optIndividualPack,
    packType, hasDelivery, deliveryCost, baseAreaM2, leafAreaM2,
  ]);

  const totals = useMemo(() => {
    const cost = spec.reduce((s, it) => s + it.total, 0);
    const sale = cost * (1 + Math.max(0, margin) / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [spec, margin, vatPercent, circulation]);

  useEffect(() => {
    if (!onResult) return;
    const result = toTemplatePriceResult(spec, { margin, vatPercent, circulation });
    onResult({ result, margin, vatPercent });
  }, [spec, margin, vatPercent, circulation, onResult]);

  // Технологический маршрут
  const route = useMemo(() => {
    const steps: string[] = [];
    if (hasDesign) steps.push("Дизайн");
    steps.push("Проверка и подготовка макета");
    steps.push("Подбор печатного формата и раскладка");
    steps.push("Бумага основания");
    if (hasFlipSheets) steps.push("Бумага перекидных листов");
    if (offset) {
      steps.push("Вывод печатных форм");
      steps.push("Приладка");
    }
    steps.push("Печать основания");
    if (hasFlipSheets) steps.push("Печать перекидных листов");
    if (optBaseLam) steps.push("Ламинация основания");
    if (hasFlipSheets && optLeafLam) steps.push("Ламинация перекидных листов");
    if (optSoftTouch) steps.push("Soft-touch ламинация");
    if (optVarnish) steps.push("Лакировка");
    if (optDieCut) {
      steps.push("Высечка");
      if (optDeflash) steps.push("Удаление облоя");
    }
    steps.push("Биговка основания");
    if (hasFlipSheets && optSpring) {
      steps.push("Перфорация под пружину");
      steps.push("Навивка пружины");
    }
    steps.push("Сборка конструкции домика");
    if (optStamp) steps.push("Тиснение");
    if (optEmboss) steps.push("Конгрев");
    if (optRound) steps.push("Скругление углов");
    if (optMagnets) steps.push("Установка магнитов");
    steps.push("Контроль качества");
    if (optIndividualPack) steps.push("Индивидуальная упаковка");
    steps.push("Упаковка");
    if (hasDelivery) steps.push("Доставка");
    return steps;
  }, [hasDesign, offset, hasFlipSheets, optBaseLam, optLeafLam, optSoftTouch, optVarnish, optDieCut, optDeflash, optSpring, optStamp, optEmboss, optRound, optMagnets, optIndividualPack, hasDelivery]);

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
            <FileText className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Календарь-домик</h1>
              <p className="text-[11px] text-muted-foreground truncate">Настольный календарь с основанием, перекидными листами и конструктивной сборкой</p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 57</Badge>
        </PageHeaderRow>
      </PageHeader>
      )}

      <Main>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* 1. Основные параметры */}
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Тираж</Label>
                    <Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Размер основания</Label>
                    <Select value={basePreset} onValueChange={(v) => setBasePreset(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BASE_FORMATS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {basePreset === "custom" && (
                    <>
                      <div>
                        <Label>Ширина основания, мм</Label>
                        <Input type="number" value={baseW} onChange={(e) => setBaseW(Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Высота основания, мм</Label>
                        <Input type="number" value={baseH} onChange={(e) => setBaseH(Number(e.target.value) || 0)} />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Размер в собранном виде (ш×в), мм</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={foldedW} onChange={(e) => setFoldedW(Number(e.target.value) || 0)} />
                      <Input type="number" value={foldedH} onChange={(e) => setFoldedH(Number(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <Label>Размер в развороте (ш×в), мм</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={spreadW} onChange={(e) => setSpreadW(Number(e.target.value) || 0)} />
                      <Input type="number" value={spreadH} onChange={(e) => setSpreadH(Number(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <Label>Цветность основания — лицо</Label>
                    <Input type="number" min={0} max={6} value={colorBaseFront} onChange={(e) => setColorBaseFront(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Цветность основания — оборот</Label>
                    <Input type="number" min={0} max={6} value={colorBaseBack} onChange={(e) => setColorBaseBack(Number(e.target.value) || 0)} />
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
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен дизайн</Label>
                  </div>
                </CardContent>
              </Card>

              <AdvancedOnly>
                <CoverSection value={cover} onChange={setCover} title="2. Обложка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <UnderlaySection value={underlay} onChange={setUnderlay} title="3. Подложка" />
              </AdvancedOnly>

              {/* 4. Внутренние блоки — основание */}
              <Card>
                <CardHeader><CardTitle className="text-sm">4. Внутренние блоки — основание</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Бумага основания</Label>
                    <Select value={baseMaterialId} onValueChange={setBaseMaterialId}>
                      <SelectTrigger><SelectValue placeholder="Выберите материал" /></SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.format_width}×{m.format_height}, {fmtMoney(Number(m.cost_per_sheet) || 0)}/лист)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {baseLayout && (
                    <AdvancedOnly>
                      <div className="sm:col-span-2 text-xs text-muted-foreground space-y-0.5">
                        <div>Раскладка: {baseLayout.cols}×{baseLayout.rows} = {baseLayout.itemsPerSheet} изд./лист</div>
                        <div>Печатный формат: {baseLayout.printW}×{baseLayout.printH} мм</div>
                        <div>Печатных листов: {basePrintSheets}</div>
                      </div>
                    </AdvancedOnly>
                  )}
                </CardContent>
              </Card>

              {/* 3. Перекидные листы */}
              <Card>
                <CardHeader><CardTitle className="text-sm">3. Перекидные листы</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="flip" checked={hasFlipSheets} onCheckedChange={(v) => setHasFlipSheets(!!v)} />
                    <Label htmlFor="flip" className="cursor-pointer">Есть перекидные листы</Label>
                  </div>
                  {hasFlipSheets && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Количество перекидных листов</Label>
                        <Input type="number" min={1} value={flipSheetCount} onChange={(e) => setFlipSheetCount(Number(e.target.value) || 1)} />
                      </div>
                      <div>
                        <Label>Цветность листов — лицо</Label>
                        <Input type="number" min={0} max={6} value={colorLeafFront} onChange={(e) => setColorLeafFront(Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Цветность листов — оборот</Label>
                        <Input type="number" min={0} max={6} value={colorLeafBack} onChange={(e) => setColorLeafBack(Number(e.target.value) || 0)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Бумага перекидных листов</Label>
                        <Select value={leafMaterialId} onValueChange={setLeafMaterialId}>
                          <SelectTrigger><SelectValue placeholder="Выберите материал" /></SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} ({m.format_width}×{m.format_height}, {fmtMoney(Number(m.cost_per_sheet) || 0)}/лист)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {leafLayout && (
                        <AdvancedOnly>
                          <div className="sm:col-span-2 text-xs text-muted-foreground space-y-0.5">
                            <div>Раскладка: {leafLayout.cols}×{leafLayout.rows} = {leafLayout.itemsPerSheet} изд./лист</div>
                            <div>Печатный формат: {leafLayout.printW}×{leafLayout.printH} мм</div>
                            <div>Печатных листов: {leafPrintSheets}</div>
                          </div>
                        </AdvancedOnly>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 4. Биговка и конструкция */}
              <Card>
                <CardHeader><CardTitle className="text-sm">4. Биговка и конструкция</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <PostpressRow label="Биговка основания (обязательно)" checked={optBigBase} onChange={setOptBigBase}>
                    <Input className="h-8 w-24" type="number" min={1} value={bigBaseCount} onChange={(e) => setBigBaseCount(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">биг.</span>
                  </PostpressRow>
                  <PostpressRow label="Высечка" checked={optDieCut} onChange={setOptDieCut}>
                    <Checkbox id="deflash" checked={optDeflash} onCheckedChange={(v) => setOptDeflash(!!v)} disabled={!optDieCut} />
                    <Label htmlFor="deflash" className="cursor-pointer text-xs">+ удаление облоя</Label>
                  </PostpressRow>
                </CardContent>
              </Card>

              {/* 5. Пружина */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Пружина</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="spring" checked={optSpring} onCheckedChange={(v) => setOptSpring(!!v)} disabled={!hasFlipSheets} />
                    <Label htmlFor="spring" className="cursor-pointer">Навивка пружины</Label>
                  </div>
                  {optSpring && (
                    <div>
                      <Label>Количество отверстий под пружину</Label>
                      <Input type="number" min={1} value={springHoles} onChange={(e) => setSpringHoles(Number(e.target.value) || 1)} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6. Премиальные операции */}
              <Card>
                <CardHeader><CardTitle className="text-sm">6. Премиальные операции</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <PostpressRow label="Ламинация основания" checked={optBaseLam} onChange={setOptBaseLam}>
                    <Select value={String(optBaseLamSides)} onValueChange={(v) => setOptBaseLamSides(Number(v) as 1 | 2)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 сторона</SelectItem>
                        <SelectItem value="2">2 стороны</SelectItem>
                      </SelectContent>
                    </Select>
                  </PostpressRow>
                  {hasFlipSheets && (
                    <PostpressRow label="Ламинация перекидных листов" checked={optLeafLam} onChange={setOptLeafLam}>
                      <Select value={String(optLeafLamSides)} onValueChange={(v) => setOptLeafLamSides(Number(v) as 1 | 2)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 сторона</SelectItem>
                          <SelectItem value="2">2 стороны</SelectItem>
                        </SelectContent>
                      </Select>
                    </PostpressRow>
                  )}
                  <PostpressRow label="Soft-touch" checked={optSoftTouch} onChange={setOptSoftTouch} />
                  <PostpressRow label="Лак (УФ/ВД)" checked={optVarnish} onChange={setOptVarnish}>
                    <Select value={varnishType} onValueChange={(v) => setVarnishType(v as any)}>
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uv_full">УФ сплошной</SelectItem>
                        <SelectItem value="uv_spot">УФ выборочный</SelectItem>
                        <SelectItem value="vd">ВД-лак</SelectItem>
                      </SelectContent>
                    </Select>
                  </PostpressRow>
                  <PostpressRow label="Тиснение" checked={optStamp} onChange={setOptStamp}>
                    <Input className="h-8 w-20" type="number" min={0} value={stampW} onChange={(e) => setStampW(Number(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground">×</span>
                    <Input className="h-8 w-20" type="number" min={0} value={stampH} onChange={(e) => setStampH(Number(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground">см</span>
                  </PostpressRow>
                  <PostpressRow label="Конгрев" checked={optEmboss} onChange={setOptEmboss}>
                    <Input className="h-8 w-20" type="number" min={0} value={embossW} onChange={(e) => setEmbossW(Number(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground">×</span>
                    <Input className="h-8 w-20" type="number" min={0} value={embossH} onChange={(e) => setEmbossH(Number(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground">см</span>
                  </PostpressRow>
                  <PostpressRow label="Скругление углов" checked={optRound} onChange={setOptRound}>
                    <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">угла</span>
                  </PostpressRow>
                  <PostpressRow label="Магниты" checked={optMagnets} onChange={setOptMagnets}>
                    <Input className="h-8 w-24" type="number" min={1} value={magnetsPerItem} onChange={(e) => setMagnetsPerItem(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">шт/изд.</span>
                  </PostpressRow>
                </CardContent>
              </Card>

              {/* 7. Упаковка и доставка */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Доставка и оплата</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <PostpressRow label="Индивидуальная упаковка" checked={optIndividualPack} onChange={setOptIndividualPack}>
                    <Select value={packType} onValueChange={(v) => setPackType(v as any)}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bag">Пакет</SelectItem>
                        <SelectItem value="shrink">Термоусадка</SelectItem>
                        <SelectItem value="box">Коробка</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </PostpressRow>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-end gap-2">
                      <Checkbox id="delivery" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                      <Label htmlFor="delivery" className="cursor-pointer">Нужна доставка</Label>
                    </div>
                    {hasDelivery && (
                      <div>
                        <Label>Стоимость доставки, ₸</Label>
                        <Input type="number" min={0} value={deliveryCost} onChange={(e) => setDeliveryCost(Number(e.target.value) || 0)} />
                      </div>
                    )}
                    <div>
                      <Label>Наценка, %</Label>
                      <Input type="number" min={0} value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>НДС, %</Label>
                      <Input type="number" min={0} value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value) || 0)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Правая колонка */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">12. Технологический маршрут</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 list-decimal pl-5">
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
                <TechReport data={{ material: { name: preset.value }, imposition: {}, print: { type: printMode }, postpress: [], route: route.map((label, idx) => ({ id: String(idx), label, stage: "assembly" as const })) }} />
              </TechOnly>

              <Card>
                <CardHeader><CardTitle className="text-sm">13. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Себестоимость" value={fmtMoney(totals.cost)} />
                  <Row label={`Наценка ${margin}%`} value={fmtMoney(totals.sale - totals.cost)} />
                  <Row label="Цена продажи" value={fmtMoney(totals.sale)} />
                  <Row label={`НДС ${vatPercent}%`} value={fmtMoney(totals.withVat - totals.sale)} />
                  <Separator />
                  <Row label="Итого с НДС" value={fmtMoney(totals.withVat)} bold />
                  <Row label="Цена за штуку" value={fmtMoney(totals.perItem)} />
                </CardContent>
              </Card>

              <TemplateActions
                productType="calendar_desk"
                defaultName={`Календарь-домик ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={spec}
              />
            </div>
          </div>

          {/* Спецификация */}
          {spec.length > 0 && (
            <div className="mt-4">
              <CostByStageBlock
                storageKey="desk-calendar"
                spec={spec.map((l) => ({ stage: l.stage, name: l.name, qty: l.quantity, unit: l.unit, price: l.unitPrice, total: l.total }))}
                metrics={{
                  printSheets: basePrintSheets + leafPrintSheets,
                }}
              />
            </div>
          )}
          {spec.length > 0 && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-sm">Спецификация работ и материалов</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Этап</TableHead>
                      <TableHead>Наименование</TableHead>
                      <TableHead className="text-right">Кол-во</TableHead>
                      <TableHead>Ед.</TableHead>
                      <TableHead className="text-right">Цена</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spec.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{it.stage}</TableCell>
                        <TableCell>{it.name}</TableCell>
                        <TableCell className="text-right">{fmtNum(it.quantity)}</TableCell>
                        <TableCell>{it.unit}</TableCell>
                        <TableCell className="text-right">{fmtMoney(it.unitPrice)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(it.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </PageContainer>
      </Main>
    </Shell>
  );
}

function PostpressRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  const id = `dc-${label.replace(/\s+/g, "-").slice(0, 30)}`;
  return (
    <div className="flex flex-wrap items-center gap-2 py-1 border-b border-border/40 last:border-0">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <Label htmlFor={id} className="cursor-pointer min-w-[170px]">{label}</Label>
      {checked && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-base" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
