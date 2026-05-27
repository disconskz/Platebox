import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { runCalculation, FORMAT_PRESETS } from "@/lib/calc/engine";
import type { CalcInput, FormatType, SpecItem } from "@/lib/calc/types";
import { fmtMoney, fmtNum } from "@/lib/format";
import { toast } from "sonner";

/**
 * Доработка 36 — выделенный шаблон «Листовка».
 * Динамический маршрут: обязательные операции включены всегда, дополнительные
 * подключаются только по выбранным чекбоксам. Скрыты операции, не применимые
 * к листовке (форзацы, марля, каптал, шитьё блока, ригель и т.п.).
 */

type Material = {
  id: string;
  name: string;
  cost_per_sheet: number;
  format_width: number;
  format_height: number;
  density?: number | null;
};

type PrintFormatRow = { id: string; name: string; width: number; height: number; sort_order?: number };

type PresetFormat = { value: string; label: string; type: FormatType; w?: number; h?: number };

const LEAFLET_FORMATS: PresetFormat[] = [
  { value: "A6", label: "A6 (105×148)", type: "A6" },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "A4", label: "A4 (210×297)", type: "A4" },
  { value: "A3", label: "A3 (297×420)", type: "A3" },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const FLYER_FORMATS: PresetFormat[] = [
  { value: "A6", label: "A6 (105×148)", type: "A6" },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "A4", label: "A4 (210×297)", type: "A4" },
  { value: "DL", label: "DL (99×210)", type: "custom", w: 99, h: 210 },
  { value: "EURO", label: "Евроформат (100×210)", type: "custom", w: 100, h: 210 },
  { value: "105x148", label: "105×148 мм", type: "custom", w: 105, h: 148 },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const EUROFLYER_FORMATS: PresetFormat[] = [
  { value: "EURO", label: "Евроформат (100×210)", type: "custom", w: 100, h: 210 },
  { value: "DL", label: "DL (99×210)", type: "custom", w: 99, h: 210 },
  { value: "105x148", label: "105×148 мм", type: "custom", w: 105, h: 148 },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "A4", label: "A4 (210×297)", type: "A4" },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const BUSINESSCARD_FORMATS: PresetFormat[] = [
  { value: "90x50", label: "90×50 мм", type: "custom", w: 90, h: 50 },
  { value: "85x55", label: "85×55 мм (евро)", type: "custom", w: 85, h: 55 },
  { value: "90x55", label: "90×55 мм", type: "custom", w: 90, h: 55 },
  { value: "55x55", label: "55×55 мм (квадрат)", type: "custom", w: 55, h: 55 },
  { value: "65x65", label: "65×65 мм (квадрат)", type: "custom", w: 65, h: 65 },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const INSERT_FORMATS: PresetFormat[] = [
  { value: "A6", label: "A6 (105×148)", type: "A6" },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "A4", label: "A4 (210×297)", type: "A4" },
  { value: "A3", label: "A3 (297×420)", type: "A3" },
  { value: "100x210", label: "100×210 мм (folded)", type: "custom", w: 100, h: 210 },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const COUPON_FORMATS: PresetFormat[] = [
  { value: "50x90", label: "50×90 мм", type: "custom", w: 50, h: 90 },
  { value: "70x150", label: "70×150 мм", type: "custom", w: 70, h: 150 },
  { value: "DL", label: "DL (99×210)", type: "custom", w: 99, h: 210 },
  { value: "EURO", label: "Евроформат (100×210)", type: "custom", w: 100, h: 210 },
  { value: "A6", label: "A6 (105×148)", type: "A6" },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const FORM_FORMATS: PresetFormat[] = [
  { value: "A6", label: "A6 (105×148)", type: "A6" },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "A4", label: "A4 (210×297)", type: "A4" },
  { value: "A3", label: "A3 (297×420)", type: "A3" },
  { value: "DL", label: "DL (99×210)", type: "custom", w: 99, h: 210 },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const BOOKLET_FORMATS: PresetFormat[] = [
  { value: "A6", label: "A6 (105×148)", type: "A6" },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "A4", label: "A4 (210×297)", type: "A4" },
  { value: "A3", label: "A3 (297×420)", type: "A3" },
  { value: "DL", label: "DL (99×210)", type: "custom", w: 99, h: 210 },
  { value: "210x210", label: "Квадрат 210×210", type: "custom", w: 210, h: 210 },
  { value: "148x148", label: "Квадрат 148×148", type: "custom", w: 148, h: 148 },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const EUROBOOKLET_FORMATS: PresetFormat[] = [
  { value: "EUROBOOKLET", label: "Евробуклет (100×210, разворот A4)", type: "custom", w: 100, h: 210 },
  { value: "DL", label: "DL (99×210, разворот A4)", type: "custom", w: 99, h: 210 },
  { value: "A5", label: "A5 (148×210)", type: "A5" },
  { value: "custom", label: "Свой размер", type: "custom" },
];

const _LEGACY_FORMAT_OPTIONS: { value: FormatType; label: string }[] = [
  { value: "A6", label: "A6 (105×148)" },
  { value: "A5", label: "A5 (148×210)" },
  { value: "A4", label: "A4 (210×297)" },
  { value: "A3", label: "A3 (297×420)" },
  { value: "custom", label: "Свой размер" },
];

export interface LeafletLikeProps {
  mode?: "leaflet" | "flyer" | "euroflyer" | "businesscard" | "insert" | "coupon" | "form" | "booklet" | "eurobooklet";
}

export default function LeafletCalculator({ mode = "leaflet" }: LeafletLikeProps = {}) {
  const isFlyer = mode === "flyer";
  const isEuro = mode === "euroflyer";
  const isCard = mode === "businesscard";
  const isInsert = mode === "insert";
  const isCoupon = mode === "coupon";
  const isForm = mode === "form";
  const isBooklet = mode === "booklet";
  const isEurobooklet = mode === "eurobooklet";
  // Флаер/визитка/купон — без фальцовки/биговки/склейки. Еврофлаер/вкладыш/анкета — с фальцовкой.
  const hideFoldBlock = isFlyer || isCard || isCoupon;
  const FORMATS = isCard
    ? BUSINESSCARD_FORMATS
    : isEurobooklet
    ? EUROBOOKLET_FORMATS
    : isCoupon
      ? COUPON_FORMATS
      : isForm
      ? FORM_FORMATS
      : isBooklet
      ? BOOKLET_FORMATS
      : isInsert
      ? INSERT_FORMATS
      : isEuro ? EUROFLYER_FORMATS : isFlyer ? FLYER_FORMATS : LEAFLET_FORMATS;
  const titleLabel = isCard ? "Визитка" : isEurobooklet ? "Евробуклет" : isCoupon ? "Купон" : isForm ? "Анкета" : isBooklet ? "Буклет" : isInsert ? "Вкладыш" : isEuro ? "Еврофлаер" : isFlyer ? "Флаер" : "Листовка";
  const subtitle = isCard
    ? "Премиальная мелкоформатная продукция — акцент на постпечатные операции"
    : isEurobooklet
    ? "Рекламный евробуклет — фиксированный евроформат, обязательная биговка + еврофальц"
    : isCoupon
      ? "Купоны, талоны, билеты — обязательная перфорация, нумерация, QR/штрихкоды"
      : isForm
      ? "Анкеты и опросные листы — поддержка NCR, нумерации, скрепления и сборки в блок"
      : isBooklet
      ? "Буклеты и евробуклеты — обязательная биговка + фальцовка, поддержка сложных схем сгиба"
      : isInsert
      ? "Вкладыши и инструкции — акцент на фальцовку, автобиговка при плотной бумаге"
      : isEuro
      ? "Рекламный евроформат — автоматическая биговка при плотной бумаге + фальцовка"
      : isFlyer
        ? "Рекламная листовая продукция — упрощённый маршрут с предустановленными форматами"
        : "Динамический маршрут — операции подключаются по выбранным опциям";
  const dorNum = isCard ? 39 : isEurobooklet ? 46 : isBooklet ? 45 : isForm ? 43 : isCoupon ? 42 : isInsert ? 41 : isEuro ? 38 : isFlyer ? 37 : 36;
  // Основные параметры
  const [circulation, setCirculation] = useState(1000);
  const [presetKey, setPresetKey] = useState<string>(
    isCard ? "90x50" : isEurobooklet ? "EUROBOOKLET" : isCoupon ? "70x150" : isForm ? "A4" : isBooklet ? "A4" : isInsert ? "A5" : isEuro ? "EURO" : isFlyer ? "DL" : "A4"
  );
  const [customW, setCustomW] = useState(210);
  const [customH, setCustomH] = useState(297);
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [margin, setMargin] = useState(30);
  const [vatPercent, setVatPercent] = useState(16);

  // Бумага
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState<string>("");
  const [printFormats, setPrintFormats] = useState<PrintFormatRow[]>([]);

  // Постпечатные опции (чекбоксы)
  const [optLam, setOptLam] = useState(false);
  const [optLamSides, setOptLamSides] = useState<1 | 2>(1);
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optVarnish, setOptVarnish] = useState(false);
  const [varnishType, setVarnishType] = useState<"uv_full" | "uv_spot" | "vd">("uv_full");
  const [optBig, setOptBig] = useState(false);
  const [bigCount, setBigCount] = useState(1);
  const [optFold, setOptFold] = useState(false);
  const [foldCount, setFoldCount] = useState(2);
  const [optPerf, setOptPerf] = useState(false);
  const [perfLineMm, setPerfLineMm] = useState(100);
  const [perfLines, setPerfLines] = useState(1);
  const [optNum, setOptNum] = useState(false);
  const [numsPerSheet, setNumsPerSheet] = useState(1);
  const [optStamp, setOptStamp] = useState(false);
  const [stampW, setStampW] = useState(5);
  const [stampH, setStampH] = useState(3);
  const [optEmboss, setOptEmboss] = useState(false);
  const [embossW, setEmbossW] = useState(5);
  const [embossH, setEmbossH] = useState(3);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);
  const [optBlockGlue, setOptBlockGlue] = useState(false);
  const [blockCount, setBlockCount] = useState(20);

  useEffect(() => {
    (async () => {
      try {
        const [mR, pfR, sR] = await Promise.all([
          supabase.from("materials").select("id,name,cost_per_sheet,format_width,format_height,density").order("name"),
          (supabase as any).from("print_formats").select("id,name,width,height,sort_order").order("sort_order"),
          supabase.from("system_settings").select("value").eq("key", "vat_percent").maybeSingle(),
        ]);
        const m = (mR.data as Material[]) || [];
        setMaterials(m);
        if (m.length && !materialId) setMaterialId(m[0].id);
        setPrintFormats(((pfR.data as unknown as PrintFormatRow[]) || []));
        if (sR.data?.value) setVatPercent(Number(sR.data.value) || 16);
      } catch (e: any) {
        toast.error("Не удалось загрузить справочники: " + (e?.message || ""));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const material = useMemo(() => materials.find((m) => m.id === materialId), [materials, materialId]);

  // Еврофлаер: автоматически включаем биговку, если выбрана фальцовка и плотность бумаги выше порога.
  useEffect(() => {
    const density = Number(material?.density) || 0;
    const threshold = isCard ? 300 : isEuro || isInsert || isBooklet ? 170 : Infinity;
    // Для буклета: биговка автоматически и при ламинации
    if (optFold && (density > threshold || (isBooklet && optLam)) && !optBig) setOptBig(true);
  }, [isCard, isEuro, isInsert, isBooklet, optFold, optLam, material?.density, optBig]);

  // Буклет: фальцовка и биговка — обязательные операции, включаем по умолчанию.
  useEffect(() => {
    if (isBooklet) {
      if (!optFold) setOptFold(true);
      if (!optBig) setOptBig(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBooklet]);

  // Купон: перфорация — обязательная операция, включаем по умолчанию.
  useEffect(() => {
    if (isCoupon && !optPerf) setOptPerf(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoupon]);

  const preset = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[0], [FORMATS, presetKey]);
  const formatType: FormatType = preset.type;
  const itemSize = useMemo(() => {
    if (preset.w && preset.h) return { w: preset.w, h: preset.h };
    if (preset.type === "custom") return { w: customW, h: customH };
    const p = FORMAT_PRESETS[preset.type];
    return p ? { w: p.w, h: p.h } : { w: customW, h: customH };
  }, [preset, customW, customH]);

  const calc = useMemo(() => {
    if (!material) return null;
    const input: CalcInput = {
      productType: "leaflet",
      circulation,
      formatType,
      formatWidth: itemSize.w,
      formatHeight: itemSize.h,
      colorFront,
      colorBack,
      material: {
        id: material.id,
        name: material.name,
        format_width: material.format_width,
        format_height: material.format_height,
        cost_per_sheet: Number(material.cost_per_sheet) || 0,
      },
      designQty: hasDesign ? 1 : 0,
      photoOutputUnitCost: 0,
      printFormats: printFormats.map((p) => ({ width: p.width, height: p.height })),
      hasFold: optFold,
      foldCount,
      hasDieCut: optDieCut,
      hasLamination: optLam,
      laminationSides: optLamSides,
      hasNumbering: optNum,
      numbersPerSheet: numsPerSheet,
      hasStamping: optStamp,
      stampingCliches: optStamp ? [{ w: stampW, h: stampH, points: 1 }] : undefined,
      hasEmbossing: optEmboss,
      embossingCliches: optEmboss ? [{ w: embossW, h: embossH, points: 1 }] : undefined,
      vatPercent,
    };
    try {
      const r = runCalculation(input);
      return r;
    } catch (e) {
      console.error("[LeafletCalculator] runCalculation failed", e);
      return null;
    }
  }, [
    material, circulation, formatType, itemSize.w, itemSize.h, colorFront, colorBack,
    hasDesign, printFormats, optFold, foldCount, optDieCut, optLam, optLamSides,
    optNum, numsPerSheet, optStamp, stampW, stampH, optEmboss, embossW, embossH, vatPercent,
  ]);

  // Дополнительные строки, которые не покрывает engine напрямую (формулы из ТЗ).
  const extraLines = useMemo<SpecItem[]>(() => {
    const out: SpecItem[] = [];
    const setup = 1500;
    if (optVarnish) {
      const sheets = calc?.printSheets ?? circulation;
      const price = varnishType === "uv_full" ? 8 : varnishType === "uv_spot" ? 12 : 4;
      out.push({ stage: "postpress", name: `Лак (${varnishType === "vd" ? "ВД" : varnishType === "uv_spot" ? "УФ выборочный" : "УФ сплошной"}) — приладка`, quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Лак — нанесение", quantity: sheets, unit: "лист", unitPrice: price, total: sheets * price });
      // Выборочный лак — отдельная подготовка + доп. приладка (ТЗ 39 §13.2, §14)
      if (varnishType === "uv_spot") {
        out.push({ stage: "prepress", name: "Выборочный лак — подготовка трафарета", quantity: 1, unit: "шт", unitPrice: 3000, total: 3000 });
        out.push({ stage: "postpress", name: "Выборочный лак — доп. приладка", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      }
    }
    // Soft-touch ламинация
    if (optSoftTouch) {
      const sheets = calc?.printSheets ?? circulation;
      const price = 35; // тг за лист
      out.push({ stage: "postpress", name: "Soft-touch (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Soft-touch ламинация", quantity: sheets, unit: "лист", unitPrice: price, total: sheets * price });
      // Коэффициент сложности при сочетании soft-touch + тиснение (ТЗ 39 §14)
      if (optStamp) {
        const surcharge = 0.25 * (calc?.totalCost ? 0 : 0) + 1500; // фикс. доплата за совместимость материалов
        out.push({ stage: "postpress", name: "Тиснение по soft-touch (коэф. сложности)", quantity: 1, unit: "шт", unitPrice: surcharge, total: surcharge });
      }
    }
    if (optBig) {
      const price = 1.5;
      const tot = circulation * Math.max(1, bigCount) * price + setup;
      out.push({ stage: "postpress", name: `Биговка (${bigCount} биг.)`, quantity: circulation * Math.max(1, bigCount), unit: "биг", unitPrice: price, total: circulation * Math.max(1, bigCount) * price });
      out.push({ stage: "postpress", name: "Биговка (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      void tot;
    }
    // фальцовка обрабатывается engine через hasFold/foldCount — здесь не дублируем
    if (optPerf) {
      const lengthM = Math.max(0, perfLineMm) / 1000;
      const price = 15; // тг за метр (дефолт)
      const lines = Math.max(1, perfLines);
      const totalM = lengthM * lines * circulation;
      out.push({ stage: "postpress", name: "Перфорация (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Перфорация (${lines} лин. × ${perfLineMm} мм)`, quantity: Math.round(totalM * 100) / 100, unit: "м", unitPrice: price, total: totalM * price });
    }
    if (optDieCut && optDeflash) {
      const ips = calc?.layout.itemsPerSheet ?? 1;
      const sheets = calc?.printSheets ?? 1;
      const price = 0.5;
      const items = ips * sheets;
      out.push({ stage: "postpress", name: "Удаление облоя (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Удаление облоя", quantity: items, unit: "изд", unitPrice: price, total: items * price });
    }
    if (optRound) {
      const price = 0.8;
      const corners = Math.max(1, roundCorners);
      out.push({ stage: "postpress", name: "Скругление углов (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Скругление углов (${corners} угла)`, quantity: circulation * corners, unit: "угол", unitPrice: price, total: circulation * corners * price });
    }
    if (optBlockGlue) {
      const blocks = Math.max(1, Math.ceil(circulation / Math.max(1, blockCount)));
      const gluePerBlock = 40; // тг
      const press = 25; // тг/блок
      out.push({ stage: "postpress", name: "Склейка в блок (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Склейка в блок ПВА (${blocks} блок.)`, quantity: blocks, unit: "блок", unitPrice: gluePerBlock + press, total: blocks * (gluePerBlock + press) });
    }
    return out;
  }, [optVarnish, varnishType, optBig, bigCount, optPerf, perfLineMm, perfLines, optDieCut, optDeflash, optRound, roundCorners, optBlockGlue, blockCount, circulation, calc]);

  const fullSpec = useMemo(() => {
    const base = calc?.spec ?? [];
    return [...base, ...extraLines];
  }, [calc, extraLines]);

  const totals = useMemo(() => {
    const cost = (calc?.totalCost ?? 0) + extraLines.reduce((s, l) => s + l.total, 0) + (hasDelivery ? deliveryCost : 0) + (hasDesign ? 5000 : 0);
    const sale = cost * (1 + Math.max(0, margin) / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [calc, extraLines, hasDelivery, deliveryCost, hasDesign, margin, vatPercent, circulation]);

  // Маршрут (динамика)
  const route = useMemo(() => {
    const steps: string[] = [];
    if (hasDesign) steps.push("Дизайн");
    steps.push("Проверка макета");
    steps.push("Подбор формата и раскладка");
    steps.push("Бумага");
    steps.push("Резка закупочного → печатный");
    const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);
    if (offset) {
      steps.push("Вывод печатных форм");
      steps.push("Приладка");
    }
    steps.push(offset ? "Печать офсет" : "Печать цифра");
    if (optLam) steps.push("Ламинация");
    if (optSoftTouch) steps.push("Soft-touch ламинация");
    if (optVarnish) steps.push("Лакировка");
    if (optBig) steps.push("Биговка");
    if (optFold) steps.push("Фальцовка");
    if (optPerf) steps.push("Перфорация");
    if (optNum) steps.push("Нумерация");
    if (optStamp) steps.push("Тиснение");
    if (optEmboss) steps.push("Конгрев");
    if (optDieCut) steps.push("Высечка");
    if (optDieCut && optDeflash) steps.push("Удаление облоя");
    if (optRound) steps.push("Скругление углов");
    if (optBlockGlue) steps.push("Склейка в блок ПВА");
    steps.push("Резка готовой продукции");
    steps.push("Контроль качества");
    steps.push("Упаковка");
    if (hasDelivery) steps.push("Доставка");
    return steps;
  }, [hasDesign, printMode, circulation, optLam, optSoftTouch, optVarnish, optBig, optFold, optPerf, optNum, optStamp, optEmboss, optDieCut, optDeflash, optRound, optBlockGlue]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <FileText className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: {titleLabel}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка {dorNum}</Badge>
        </PageHeaderRow>
      </PageHeader>

      <PageMain>
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
                    <Label>Готовый размер</Label>
                    <Select value={presetKey} onValueChange={(v) => setPresetKey(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {preset.value === "custom" && (
                    <>
                      <div>
                        <Label>Ширина, мм</Label>
                        <Input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Высота, мм</Label>
                        <Input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value) || 0)} />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Цветность лицо</Label>
                    <Input type="number" min={0} max={6} value={colorFront} onChange={(e) => setColorFront(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Цветность оборот</Label>
                    <Input type="number" min={0} max={6} value={colorBack} onChange={(e) => setColorBack(Number(e.target.value) || 0)} />
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

              {/* 2. Бумага */}
              <Card>
                <CardHeader><CardTitle className="text-sm">2. Бумага и печать</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Бумага</Label>
                    <Select value={materialId} onValueChange={setMaterialId}>
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
                  {calc && (
                    <div className="sm:col-span-2 text-xs text-muted-foreground space-y-0.5">
                      <div>Раскладка: {calc.layout.cols}×{calc.layout.rows} = {calc.layout.itemsPerSheet} изд./лист{calc.layout.rotated ? " (повёрнуто)" : ""}</div>
                      <div>Печатный формат: {calc.layout.printFormat.width}×{calc.layout.printFormat.height} мм</div>
                      <div>Печатных листов: {calc.printSheets} (полезных {calc.netPrintSheets}, приладка {calc.setupSheets})</div>
                      <div>Закупочных листов: {calc.purchaseSheets}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Постпечатные операции */}
              <Card>
                <CardHeader><CardTitle className="text-sm">3. Постпечатные операции</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <PostpressRow label="Ламинация" checked={optLam} onChange={setOptLam}>
                    <Select value={String(optLamSides)} onValueChange={(v) => setOptLamSides(Number(v) as 1 | 2)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 сторона</SelectItem>
                        <SelectItem value="2">2 стороны</SelectItem>
                      </SelectContent>
                    </Select>
                  </PostpressRow>
                  {isCard && (
                    <PostpressRow label="Soft-touch" checked={optSoftTouch} onChange={setOptSoftTouch} />
                  )}
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
                  {!hideFoldBlock && <PostpressRow label={isEuro ? "Биговка (авто при плотной бумаге + фальцовке)" : "Биговка"} checked={optBig} onChange={setOptBig}>
                    <Input className="h-8 w-24" type="number" min={1} value={bigCount} onChange={(e) => setBigCount(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">биг.</span>
                  </PostpressRow>}
                  {!hideFoldBlock && <PostpressRow label="Фальцовка" checked={optFold} onChange={setOptFold}>
                    <Input className="h-8 w-24" type="number" min={1} value={foldCount} onChange={(e) => setFoldCount(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">фальц.</span>
                  </PostpressRow>}
                  <PostpressRow label="Перфорация" checked={optPerf} onChange={setOptPerf}>
                    <Input className="h-8 w-20" type="number" min={1} value={perfLines} onChange={(e) => setPerfLines(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">лин. ×</span>
                    <Input className="h-8 w-24" type="number" min={1} value={perfLineMm} onChange={(e) => setPerfLineMm(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">мм</span>
                  </PostpressRow>
                  <PostpressRow label="Нумерация" checked={optNum} onChange={setOptNum}>
                    <Input className="h-8 w-24" type="number" min={1} value={numsPerSheet} onChange={(e) => setNumsPerSheet(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">нумер./изд.</span>
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
                  <PostpressRow label="Высечка" checked={optDieCut} onChange={setOptDieCut}>
                    <Checkbox id="deflash" checked={optDeflash} onCheckedChange={(v) => setOptDeflash(!!v)} disabled={!optDieCut} />
                    <Label htmlFor="deflash" className="cursor-pointer text-xs">+ удаление облоя</Label>
                  </PostpressRow>
                  <PostpressRow label="Скругление углов" checked={optRound} onChange={setOptRound}>
                    <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">угла</span>
                  </PostpressRow>
                  {!hideFoldBlock && !isEuro && <PostpressRow label="Склейка в блок (ПВА)" checked={optBlockGlue} onChange={setOptBlockGlue}>
                    <Input className="h-8 w-24" type="number" min={1} value={blockCount} onChange={(e) => setBlockCount(Number(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">листов/блок</span>
                  </PostpressRow>}
                </CardContent>
              </Card>

              {/* 4. Упаковка и доставка */}
              <Card>
                <CardHeader><CardTitle className="text-sm">4. Упаковка и доставка</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
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
                </CardContent>
              </Card>
            </div>

            {/* Правая колонка: маршрут + итог */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Технологический маршрут</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 list-decimal pl-5">
                    {route.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">5. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Себестоимость" value={fmtMoney(totals.cost)} />
                  <Row label={`Наценка ${margin}%`} value={fmtMoney(totals.sale - totals.cost)} />
                  <Row label="Цена продажи" value={fmtMoney(totals.sale)} />
                  <Row label={`НДС ${vatPercent}%`} value={fmtMoney(totals.withVat - totals.sale)} />
                  <Separator />
                  <Row label="Итого с НДС" value={fmtMoney(totals.withVat)} bold />
                  <Row label="За штуку" value={fmtMoney(totals.perItem)} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Спецификация */}
          {fullSpec.length > 0 && (
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
                    {fullSpec.map((it, i) => (
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

          {calc?.warnings?.length ? (
            <Card className="mt-4 border-amber-500/40">
              <CardHeader><CardTitle className="text-sm text-amber-600">Предупреждения</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                {calc.warnings.map((w, i) => <div key={i}>• {w}</div>)}
              </CardContent>
            </Card>
          ) : null}
        </PageContainer>
      </PageMain>
    </PageShell>
  );
}

function PostpressRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  const id = `pp-${label.replace(/\s+/g, "-")}`;
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