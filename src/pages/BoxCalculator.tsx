import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
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

import LegacyCostByStageBlock from "@/components/calc/multipage/LegacyCostByStageBlock";
/**
 * Шаблон «Коробка» — упаковочная/конструктивная продукция: развёртка, высечка,
 * биговка, кашировка, микрогофра, ложементы, магниты, ленты, окна, склейка,
 * ручная сборка, premium-конструкции. Доработка 68.
 */

type BoxKind =
  | "self_assemble" | "lid_bottom" | "pencil" | "magnet" | "ribbon"
  | "window" | "tray" | "microflute" | "cashed" | "premium" | "custom";
const KINDS: { value: BoxKind; label: string }[] = [
  { value: "self_assemble", label: "Самосборная" },
  { value: "lid_bottom", label: "Крышка-дно" },
  { value: "pencil", label: "Коробка-пенал" },
  { value: "magnet", label: "С магнитом" },
  { value: "ribbon", label: "С лентой" },
  { value: "window", label: "С окном" },
  { value: "tray", label: "С ложементом" },
  { value: "microflute", label: "Из микрогофры" },
  { value: "cashed", label: "Кашированная" },
  { value: "premium", label: "Premium" },
  { value: "custom", label: "Нестандартная" },
];

type Material = {
  value: string; label: string; type: string; density: number; thickness: number;
  sheetW: number; sheetH: number; pricePerSheet: number;
  designer?: boolean; premium?: boolean; plastic?: boolean; microflute?: boolean;
};
const MATERIALS: Material[] = [
  { value: "coated-250", label: "Мел. картон 250 г", type: "coated", density: 250, thickness: 0.30, sheetW: 720, sheetH: 1020, pricePerSheet: 65 },
  { value: "coated-300", label: "Мел. картон 300 г", type: "coated", density: 300, thickness: 0.36, sheetW: 720, sheetH: 1020, pricePerSheet: 80 },
  { value: "coated-350", label: "Мел. картон 350 г", type: "coated", density: 350, thickness: 0.42, sheetW: 720, sheetH: 1020, pricePerSheet: 95 },
  { value: "coated-400", label: "Мел. картон 400 г", type: "coated", density: 400, thickness: 0.50, sheetW: 720, sheetH: 1020, pricePerSheet: 115 },
  { value: "designer-300", label: "Дизайн. картон 300 г", type: "designer", density: 300, thickness: 0.38, sheetW: 700, sheetH: 1000, pricePerSheet: 220, designer: true },
  { value: "touch-350", label: "Touch cover 350 г", type: "designer", density: 350, thickness: 0.45, sheetW: 700, sheetH: 1000, pricePerSheet: 340, designer: true, premium: true },
  { value: "kraft-300", label: "Крафт 300 г", type: "kraft", density: 300, thickness: 0.38, sheetW: 700, sheetH: 1000, pricePerSheet: 90, designer: true },
  { value: "bind-1mm", label: "Переплётный 1 мм", type: "bind", density: 700, thickness: 1.0, sheetW: 700, sheetH: 1000, pricePerSheet: 140 },
  { value: "bind-1.5mm", label: "Переплётный 1.5 мм", type: "bind", density: 1050, thickness: 1.5, sheetW: 700, sheetH: 1000, pricePerSheet: 200 },
  { value: "bind-2mm", label: "Переплётный 2 мм", type: "bind", density: 1400, thickness: 2.0, sheetW: 700, sheetH: 1000, pricePerSheet: 260 },
  { value: "microflute-e", label: "Микрогофра E", type: "microflute", density: 350, thickness: 1.5, sheetW: 720, sheetH: 1020, pricePerSheet: 130, microflute: true },
  { value: "microflute-b", label: "Микрогофра B", type: "microflute", density: 450, thickness: 3.0, sheetW: 720, sheetH: 1020, pricePerSheet: 170, microflute: true },
  { value: "plastic-pvc", label: "ПВХ", type: "plastic", density: 300, thickness: 0.50, sheetW: 700, sheetH: 1000, pricePerSheet: 280, plastic: true },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 160 },
  { value: "gloss", label: "Глянцевая", price: 140 },
  { value: "soft", label: "Soft-touch", price: 340 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv";

type BottomType = "auto_lock" | "glued" | "cross" | "flat";
const BOTTOMS: { value: BottomType; label: string }[] = [
  { value: "auto_lock", label: "Автомат. замок" },
  { value: "glued", label: "Склеенное дно" },
  { value: "cross", label: "Крестовое дно" },
  { value: "flat", label: "Плоское / съёмное" },
];

type Tray = { value: string; label: string; price: number; install: number };
const TRAYS: Tray[] = [
  { value: "none", label: "Без ложемента", price: 0, install: 0 },
  { value: "card", label: "Картонный ложемент", price: 90, install: 12 },
  { value: "eva", label: "EVA ложемент", price: 220, install: 18 },
  { value: "foam", label: "Поролоновый", price: 140, install: 14 },
  { value: "plastic", label: "Пластиковый (PET)", price: 280, install: 20 },
  { value: "designer", label: "Дизайнерский", price: 450, install: 30 },
];

type Magnet = { value: string; label: string; price: number; install: number };
const MAGNETS: Magnet[] = [
  { value: "10x2", label: "Магнит 10×2 мм", price: 8, install: 4 },
  { value: "15x2", label: "Магнит 15×2 мм", price: 12, install: 5 },
  { value: "20x3", label: "Магнит 20×3 мм", price: 22, install: 6 },
];

type Ribbon = { value: string; label: string; pricePerM: number; install: number };
const RIBBONS: Ribbon[] = [
  { value: "satin-10", label: "Атласная 10 мм", pricePerM: 60, install: 6 },
  { value: "satin-20", label: "Атласная 20 мм", pricePerM: 95, install: 8 },
  { value: "grosgrain-15", label: "Репсовая 15 мм", pricePerM: 110, install: 8 },
];

type GlueType = "pva" | "hotmelt" | "tape" | "manual";
const GLUES: { value: GlueType; label: string; pricePerM: number; pricePerItem: number; manual?: boolean }[] = [
  { value: "pva", label: "ПВА (автомат)", pricePerM: 1.4, pricePerItem: 4 },
  { value: "hotmelt", label: "Hotmelt (автомат)", pricePerM: 2.2, pricePerItem: 5 },
  { value: "tape", label: "Двухсторонний скотч", pricePerM: 9, pricePerItem: 7 },
  { value: "manual", label: "Ручная склейка", pricePerM: 1.2, pricePerItem: 16, manual: true },
];

type CashType = "none" | "auto" | "manual";
const CASHINGS: { value: CashType; label: string; pricePerM2: number }[] = [
  { value: "none", label: "Без кашировки", pricePerM2: 0 },
  { value: "auto", label: "Автоматическая", pricePerM2: 600 },
  { value: "manual", label: "Ручная", pricePerM2: 1400 },
];

type PackKind = "none" | "stack" | "box" | "shrink" | "individual" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "stack", label: "В пачки по 25", price: 30, perPack: 25 },
  { value: "box", label: "Коробка по 50", price: 220, perPack: 50 },
  { value: "shrink", label: "Термоусадка", price: 14, perPack: 1 },
  { value: "individual", label: "Индивидуальная", price: 35, perPack: 1 },
  { value: "premium", label: "Premium упаковка", price: 180, perPack: 10 },
];

export default function BoxCalculator() {
  // Основные
  const [circulation, setCirculation] = useState(300);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<BoxKind>("self_assemble");
  const [boxW, setBoxW] = useState(200); // ширина
  const [boxL, setBoxL] = useState(300); // длина
  const [boxH, setBoxH] = useState(80);  // высота
  const [leadDays, setLeadDays] = useState(10);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("coated-300");

  // Печать
  const [colors, setColors] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [whiteInk, setWhiteInk] = useState(false);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);

  // Постпечать
  const [lamType, setLamType] = useState<LamType>("none");
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optCongrev, setOptCongrev] = useState(false);
  const [optFoil, setOptFoil] = useState(false);
  const [embossAreaCm2, setEmbossAreaCm2] = useState(30);

  // Конструктив
  const [bottomType, setBottomType] = useState<BottomType>("auto_lock");
  const [bigCount, setBigCount] = useState(8);
  const [optDeflash, setOptDeflash] = useState(true);

  // Кашировка
  const [cashType, setCashType] = useState<CashType>("none");

  // Окно
  const [hasWindow, setHasWindow] = useState(false);
  const [windowW, setWindowW] = useState(120);
  const [windowH, setWindowH] = useState(80);
  const [windowFilmPricePerM2, setWindowFilmPricePerM2] = useState(900);

  // Ложемент
  const [trayKey, setTrayKey] = useState("none");

  // Магниты
  const [hasMagnets, setHasMagnets] = useState(false);
  const [magnetKey, setMagnetKey] = useState("15x2");
  const [magnetsPerBox, setMagnetsPerBox] = useState(2);

  // Лента
  const [hasRibbon, setHasRibbon] = useState(false);
  const [ribbonKey, setRibbonKey] = useState("satin-20");
  const [ribbonLengthM, setRibbonLengthM] = useState(0.6);

  // Склейка
  const [glueType, setGlueType] = useState<GlueType>("hotmelt");

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const tray = useMemo(() => TRAYS.find((t) => t.value === trayKey)!, [trayKey]);
  const magnet = useMemo(() => MAGNETS.find((m) => m.value === magnetKey)!, [magnetKey]);
  const ribbon = useMemo(() => RIBBONS.find((r) => r.value === ribbonKey)!, [ribbonKey]);
  const glue = useMemo(() => GLUES.find((g) => g.value === glueType)!, [glueType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);
  const bottom = useMemo(() => BOTTOMS.find((b) => b.value === bottomType)!, [bottomType]);
  const cashing = useMemo(() => CASHINGS.find((c) => c.value === cashType)!, [cashType]);

  // Автологика по типу коробки
  useEffect(() => {
    if (kind === "magnet") { setHasMagnets(true); }
    if (kind === "ribbon") { setHasRibbon(true); }
    if (kind === "window") { setHasWindow(true); }
    if (kind === "tray") { if (trayKey === "none") setTrayKey("card"); }
    if (kind === "microflute") {
      setMaterialKey((m) => (MATERIALS.find((x) => x.value === m)?.microflute ? m : "microflute-e"));
    }
    if (kind === "cashed") {
      if (cashType === "none") setCashType("auto");
    }
    if (kind === "premium") {
      setMaterialKey((m) => (MATERIALS.find((x) => x.value === m)?.premium ? m : "touch-350"));
      if (lamType === "none") setLamType("soft");
      setOptEmboss(true);
      if (cashType === "none") setCashType("auto");
      if (trayKey === "none") setTrayKey("eva");
      setHasRibbon(true);
      if (packKind === "none" || packKind === "stack") setPackKind("premium");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Плотность ≥ 250 — биговка обязательна (хотя бы по 4 ребрам)
  useEffect(() => {
    if (material.density >= 250 && bigCount < 4) setBigCount(4);
    if (material.plastic && !whiteInk) setWhiteInk(true);
  }, [material]); // eslint-disable-line

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.plastic) return "uv";
    if (material.microflute) return "offset";
    if (circulation >= 500) return "offset";
    return "digital";
  }, [printMode, material, circulation]);

  // Коэффициент сложности
  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.15;
    if (material.designer) k += 0.05;
    if (material.microflute) k += 0.10;
    if (lamType === "soft" || optSoftTouch) k += 0.10;
    if (kind === "premium") k += 0.25;
    if (optEmboss) k += 0.05;
    if (optCongrev) k += 0.05;
    if (optFoil) k += 0.05;
    return +k.toFixed(2);
  }, [material, lamType, optSoftTouch, kind, optEmboss, optCongrev, optFoil]);

  // Развёртка (упрощённо): для крышка-дно две развёртки, для остальных одна
  const sideFlap = 25;
  const bottomFlap = 35;
  const unfoldW = useMemo(() => 2 * (boxW + boxL) + sideFlap, [boxW, boxL]);
  const unfoldH = useMemo(() => boxH + 2 * boxL + bottomFlap, [boxH, boxL]);
  const partsPerBox = kind === "lid_bottom" ? 2 : 1; // крышка + дно

  // Раскладка
  const layout = useMemo(() => {
    const wCell = unfoldW + 8;
    const hCell = unfoldH + 8;
    const sw = material.sheetW, sh = material.sheetH;
    const a = Math.floor(sw / wCell) * Math.floor(sh / hCell);
    const b = Math.floor(sw / hCell) * Math.floor(sh / wCell);
    const up = Math.max(1, a, b);
    const needBlanks = circulation * partsPerBox;
    const net = Math.ceil(needBlanks / up);
    const setupOwn = colorsBack > 0 ? 0 : 150;
    const setupForeign = colorsBack > 0 ? 300 : 0;
    const setupOffset = (setupOwn + setupForeign) + Math.ceil(net * 0.01);
    const setup = effectivePrintMode === "offset" ? setupOffset : effectivePrintMode === "uv" ? 40 : 20;
    const printSheets = net + setup;
    const purchaseSheets = printSheets;
    const areaUnfoldM2 = (unfoldW * unfoldH) / 1_000_000;
    const totalAreaM2 = needBlanks * areaUnfoldM2;
    const printAreaM2 = +((printSheets * sw * sh) / 1_000_000).toFixed(3);
    return { up, sheets: net, printSheets, purchaseSheets, areaM2: totalAreaM2, printAreaM2, setup, blanks: needBlanks };
  }, [material, unfoldW, unfoldH, circulation, colorsBack, effectivePrintMode, partsPerBox]);

  // Длина клеевого шва (вертикальный шов + дно)
  const glueSeamM = useMemo(() => {
    const sideMm = boxH + bottomFlap;
    const bottomMm = 2 * (boxW + boxL);
    const perBlank = sideMm + bottomMm;
    return +(perBlank * layout.blanks / 1000).toFixed(1);
  }, [boxH, boxW, boxL, layout.blanks]);

  // Контур высечки
  const contourLengthM = useMemo(() => {
    return +((2 * (unfoldW + unfoldH) + 4 * bigCount * 35) * layout.blanks / 1000).toFixed(1);
  }, [unfoldW, unfoldH, bigCount, layout.blanks]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн коробки", Math.max(1, designsCount), "макет", 8000);
    push("Препресс", "Проверка макета и подготовка развёртки", Math.max(1, designsCount), "макет", 2000);
    push("Препресс", "Раскладка", 1, "усл.", 1000);
    push("Препресс", "Подготовка штампа высечки", Math.max(1, designsCount), "макет", 3500);

    // Материал и резка
    push("Материалы", `${material.label} (лист ${material.sheetW}×${material.sheetH})`,
      layout.purchaseSheets, "лист", material.pricePerSheet);
    push("Препресс", "Резка закупочного на печатный", layout.purchaseSheets, "лист", 2);

    // Печать
    if (effectivePrintMode === "offset") {
      const forms = (colors + pantoneCount) + (colorsBack > 0 ? (colorsBack + pantoneCount) : 0);
      push("Печать", "Печатные формы", forms * Math.max(1, designsCount), "форма", 1500);
      push("Печать", "Приладка офсета", 1, "усл.", layout.setup * 5);
      push("Печать", "Офсетная печать", layout.printSheets * (colorsBack > 0 ? 2 : 1), "оттиск", 7);
    } else if (effectivePrintMode === "uv") {
      push("Печать", "Приладка UV", 1, "усл.", 3000);
      push("Печать", "UV-печать", layout.printAreaM2 * (colorsBack > 0 ? 2 : 1), "м²",
        +(2400 + (whiteInk ? 500 : 0) + pantoneCount * 200).toFixed(2));
    } else {
      push("Печать", "Цифровая печать", layout.printSheets * (colorsBack > 0 ? 2 : 1), "оттиск",
        +(36 + colors * 2 + (whiteInk ? 10 : 0)).toFixed(2));
    }
    if (optVarnish) push("Печать", "Защитный лак", layout.printAreaM2, "м²", 240);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Выборочный лак", layout.printAreaM2, "м²", 1300);
    }

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`, layout.printAreaM2, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 800);
    }
    if (optSoftTouch && lamType !== "soft") {
      push("Постпечать", "Soft-touch покрытие", layout.printAreaM2, "м²", 360);
    }

    // Тиснение / конгрев / фольга
    if (optEmboss) {
      const cliche = Math.max(5000, embossAreaCm2 * 200);
      push("Постпечать", "Клише тиснения", 1, "шт", cliche);
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Тиснение (нанесение)", circulation, "оттиск", +(22 * premiumCoef).toFixed(2));
      if (optFoil) push("Постпечать", "Фольга", circulation * embossAreaCm2, "см²", 0.05);
    }
    if (optCongrev) {
      const cliche = Math.max(8000, embossAreaCm2 * 350);
      push("Постпечать", "Клише конгрева", 1, "шт", cliche);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1800);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", +(28 * premiumCoef).toFixed(2));
    }
    if (optFoil && !optEmboss) {
      push("Постпечать", "Фольгирование", circulation * embossAreaCm2, "см²", 0.06);
      push("Постпечать", "Приладка фольги", 1, "усл.", 1500);
    }

    // Кашировка
    if (cashType !== "none") {
      const cashAreaM2 = +(layout.areaM2).toFixed(3);
      push("Постпечать", `Кашировка: ${cashing.label}`, cashAreaM2, "м²", +(cashing.pricePerM2 * (cashType === "manual" ? premiumCoef : 1)).toFixed(2));
      push("Постпечать", "Приладка кашировки", 1, "усл.", 2500);
    }

    // Высечка + удаление облоя
    push("Постпечать", "Штамп высечки развёртки", 1, "усл.", Math.max(9000, contourLengthM * 30));
    push("Постпечать", "Приладка высечки", 1, "усл.", 2500);
    push("Постпечать", "Высечка развёртки", layout.printSheets, "лист", +(10 * premiumCoef).toFixed(2));
    if (optDeflash) push("Постпечать", "Удаление облоя", layout.blanks, "развёртка", +(1.0 * premiumCoef).toFixed(2));

    // Биговка
    if (bigCount > 0) {
      push("Постпечать", "Приладка биговки", 1, "усл.", 1000);
      push("Постпечать", `Биговка (${bigCount} линий)`, layout.blanks * bigCount, "биг", 0.5);
    }

    // Вклейка окна
    if (hasWindow) {
      const windowAreaM2 = (windowW * windowH) / 1_000_000;
      push("Материалы", "Плёнка для окна", +(windowAreaM2 * circulation).toFixed(3), "м²", windowFilmPricePerM2);
      push("Постпечать", "Приладка вклейки окна", 1, "усл.", 1800);
      push("Постпечать", "Вклейка окна", circulation, "коробка", 10);
    }

    // Склейка
    push("Постпечать", `Склейка: ${glue.label}`, glueSeamM, "пог.м", glue.pricePerM);
    push("Постпечать", "Работа по склейке коробки", layout.blanks, "развёртка", glue.pricePerItem);
    push("Постпечать", "Приладка склейки", 1, "усл.", 1800);

    // Ложемент
    if (trayKey !== "none") {
      push("Материалы", `${tray.label}`, circulation, "шт", tray.price);
      push("Постпечать", "Установка ложемента", circulation, "коробка", tray.install);
    }

    // Магниты
    if (hasMagnets) {
      const eq = circulation * Math.max(1, magnetsPerBox);
      push("Материалы", `${magnet.label}`, eq, "шт", magnet.price);
      push("Постпечать", "Установка магнитов", eq, "шт", magnet.install);
      push("Постпечать", "Приладка установки магнитов", 1, "усл.", 1200);
    }

    // Лента
    if (hasRibbon) {
      const meters = +(circulation * ribbonLengthM).toFixed(2);
      push("Материалы", `${ribbon.label}`, meters, "пог.м", ribbon.pricePerM);
      push("Постпечать", "Установка ленты", circulation, "коробка", ribbon.install);
      push("Постпечать", "Приладка установки ленты", 1, "усл.", 1000);
    }

    // Финальная сборка
    const assemblyKindCoef =
      kind === "premium" ? 2.0 :
      trayKey !== "none" ? 1.7 :
      hasMagnets ? 1.5 :
      hasWindow ? 1.3 : 1.0;
    push("Постпечать", `Финальная сборка${assemblyKindCoef > 1 ? ` (×${assemblyKindCoef.toFixed(2)})` : ""}`,
      circulation, "коробка", +(6 * assemblyKindCoef).toFixed(2));

    // Контроль качества
    const qcCoef = (hasMagnets || trayKey !== "none" ? 1.4 : 1.0) * (kind === "premium" ? 1.2 : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "коробка", +(1.5 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, material, layout, effectivePrintMode,
    colors, colorsBack, pantoneCount, whiteInk, optVarnish, optSpotVarnish,
    lamType, lam, optSoftTouch, optEmboss, optCongrev, optFoil, embossAreaCm2, premiumCoef,
    cashType, cashing,
    contourLengthM, optDeflash, bigCount,
    hasWindow, windowW, windowH, windowFilmPricePerM2,
    glue, glueSeamM,
    trayKey, tray,
    hasMagnets, magnet, magnetsPerBox,
    hasRibbon, ribbon, ribbonLengthM,
    packKind, pack, kind, circulation, hasDelivery, deliveryCost,
  ]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.total, 0);
    const sale = cost * (1 + margin / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [lines, margin, vatPercent, circulation]);

  const route = useMemo(() => {
    const s: string[] = [];
    if (hasDesign) s.push("Дизайн");
    s.push("Проверка макета", "Подготовка развёртки", "Раскладка", "Расчёт материала", "Резка закупочного");
    if (effectivePrintMode === "offset") s.push("Вывод печатных форм", "Приладка офсета", "Офсетная печать");
    else if (effectivePrintMode === "uv") s.push("UV-печать");
    else s.push("Цифровая печать");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optVarnish) s.push("Защитный лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optEmboss) s.push("Тиснение");
    if (optCongrev) s.push("Конгрев");
    if (optFoil) s.push("Фольгирование");
    if (cashType !== "none") s.push(`Кашировка: ${cashing.label}`);
    s.push("Высечка развёртки");
    if (optDeflash) s.push("Удаление облоя");
    if (bigCount > 0) s.push(`Биговка (${bigCount} линий)`);
    if (hasWindow) s.push("Вклейка окна");
    s.push(`Склейка (${glue.label})`);
    if (trayKey !== "none") s.push(`Установка ложемента: ${tray.label}`);
    if (hasMagnets) s.push("Установка магнитов");
    if (hasRibbon) s.push("Установка ленты");
    s.push("Финальная сборка", "Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, lamType, lam, optVarnish, optSpotVarnish, optEmboss, optCongrev, optFoil,
      cashType, cashing, optDeflash, bigCount, hasWindow, glue, trayKey, tray, hasMagnets, hasRibbon,
      packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Package className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Коробка</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Развёртка, высечка, биговка, кашировка, ложемент, магниты, ленты, окно, сборка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 68</Badge>
        </PageHeaderRow>
      </PageHeader>

      <PageMain>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  <div>
                    <Label>Тип коробки</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as BoxKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина W, мм</Label><Input type="number" value={boxW} onChange={(e) => setBoxW(+e.target.value || 0)} /></div>
                  <div><Label>Длина L, мм</Label><Input type="number" value={boxL} onChange={(e) => setBoxL(+e.target.value || 0)} /></div>
                  <div><Label>Высота H, мм</Label><Input type="number" value={boxH} onChange={(e) => setBoxH(+e.target.value || 0)} /></div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                        <SelectItem value="uv">UV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    Развёртка: <b>{unfoldW}×{unfoldH}</b> мм · Деталей на коробку: <b>{partsPerBox}</b> · На лист: <b>{layout.up}</b> · печ. листов: <b>{layout.printSheets}</b>
                    {" · "}печать: <b>{effectivePrintMode}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "construct", "cash", "window", "tray", "hardware", "glue", "ship"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал
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
                                {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerSheet)}/лист)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Плотность, г/м²</Label><Input value={material.density} readOnly /></div>
                          <div><Label>Толщина, мм</Label><Input value={material.thickness} readOnly /></div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Площадь развёрток: <b>{layout.areaM2.toFixed(3)} м²</b> ·
                            Площадь печати: <b>{layout.printAreaM2} м²</b> · Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>
                            {material.designer && <> · <Badge variant="outline" className="text-[10px]">дизайнерская</Badge></>}
                            {material.premium && <> · <Badge variant="outline" className="text-[10px]">premium</Badge></>}
                            {material.microflute && <> · <Badge variant="outline" className="text-[10px]">микрогофра</Badge></>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать и покрытие</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colors} onChange={(e) => setColors(+e.target.value || 0)} /></div>
                          <div><Label>Цветность оборот (0 = без)</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>
                          <div><Label>Pantone</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="white" checked={whiteInk} onCheckedChange={(v) => setWhiteInk(!!v)} />
                            <Label htmlFor="white" className="cursor-pointer">Белила</Label>
                          </div>
                          <Row label="Защитный лак" checked={optVarnish} onChange={setOptVarnish} />
                          <Row label="Выборочный лак" checked={optSpotVarnish} onChange={setOptSpotVarnish} />
                          <div>
                            <Label>Ламинация</Label>
                            <Select value={lamType} onValueChange={(v) => setLamType(v as LamType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/м²)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Row label="Доп. soft-touch" checked={optSoftTouch} onChange={setOptSoftTouch} />
                          <Row label="Тиснение" checked={optEmboss} onChange={setOptEmboss} />
                          <Row label="Конгрев" checked={optCongrev} onChange={setOptCongrev} />
                          <Row label="Фольгирование" checked={optFoil} onChange={setOptFoil} />
                          {(optEmboss || optCongrev || optFoil) && (
                            <div className="sm:col-span-2">
                              <Label>Площадь клише / фольги, см²</Label>
                              <Input type="number" min={1} value={embossAreaCm2} onChange={(e) => setEmbossAreaCm2(+e.target.value || 1)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="construct">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Конструкция
                          <Badge variant="outline" className="text-[10px]">{bottom.label} · {bigCount} бигов</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Тип дна</Label>
                            <Select value={bottomType} onValueChange={(v) => setBottomType(v as BottomType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {BOTTOMS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Кол-во бигов</Label><Input type="number" min={0} value={bigCount} onChange={(e) => setBigCount(+e.target.value || 0)} /></div>
                          <Row label="Удаление облоя" checked={optDeflash} onChange={setOptDeflash} />
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Длина контура высечки: <b>{contourLengthM}</b> пог.м · Клеевой шов: <b>{glueSeamM}</b> пог.м
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="cash">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Кашировка
                          <Badge variant={cashType !== "none" ? "default" : "outline"} className="text-[10px]">{cashing.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип кашировки</Label>
                            <Select value={cashType} onValueChange={(v) => setCashType(v as CashType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CASHINGS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}{c.pricePerM2 ? ` (${fmtMoney(c.pricePerM2)}/м²)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="window">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Окно и плёнка
                          <Badge variant={hasWindow ? "default" : "outline"} className="text-[10px]">
                            {hasWindow ? `${windowW}×${windowH} мм` : "без окна"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Окно с плёнкой" checked={hasWindow} onChange={setHasWindow} />
                          {hasWindow && (<>
                            <div><Label>Ширина окна, мм</Label><Input type="number" value={windowW} onChange={(e) => setWindowW(+e.target.value || 0)} /></div>
                            <div><Label>Высота окна, мм</Label><Input type="number" value={windowH} onChange={(e) => setWindowH(+e.target.value || 0)} /></div>
                            <div><Label>Цена плёнки, тг/м²</Label><Input type="number" value={windowFilmPricePerM2} onChange={(e) => setWindowFilmPricePerM2(+e.target.value || 0)} /></div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="tray">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">7. Ложемент
                          <Badge variant={trayKey !== "none" ? "default" : "outline"} className="text-[10px]">{tray.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип ложемента</Label>
                            <Select value={trayKey} onValueChange={setTrayKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TRAYS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}{t.price ? ` (${fmtMoney(t.price)} + ${fmtMoney(t.install)}/уст.)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="hardware">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">8. Магниты и ленты
                          <Badge variant={(hasMagnets || hasRibbon) ? "default" : "outline"} className="text-[10px]">
                            {[hasMagnets && `магн×${magnetsPerBox}`, hasRibbon && ribbon.label].filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Магниты" checked={hasMagnets} onChange={setHasMagnets} />
                          {hasMagnets && (<>
                            <div className="sm:col-span-2">
                              <Label>Тип магнита</Label>
                              <Select value={magnetKey} onValueChange={setMagnetKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MAGNETS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.price)}+{fmtMoney(m.install)}/шт)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Магнитов на коробку</Label><Input type="number" min={1} value={magnetsPerBox} onChange={(e) => setMagnetsPerBox(+e.target.value || 1)} /></div>
                          </>)}
                          <Row label="Лента" checked={hasRibbon} onChange={setHasRibbon} />
                          {hasRibbon && (<>
                            <div className="sm:col-span-2">
                              <Label>Тип ленты</Label>
                              <Select value={ribbonKey} onValueChange={setRibbonKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {RIBBONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label} ({fmtMoney(r.pricePerM)}/м + {fmtMoney(r.install)}/уст.)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Длина ленты, м</Label><Input type="number" step={0.1} min={0.1} value={ribbonLengthM} onChange={(e) => setRibbonLengthM(+e.target.value || 0.1)} /></div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="glue">
                      <AccordionTrigger>9. Склейка и сборка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <div className="sm:col-span-2">
                            <Label>Тип склейки</Label>
                            <Select value={glueType} onValueChange={(v) => setGlueType(v as GlueType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GLUES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label} ({fmtMoney(g.pricePerM)}/м + {fmtMoney(g.pricePerItem)}/шт)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Финальная сборка: окно ×1.3, магнит ×1.5, ложемент ×1.7, premium ×2.
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>10. Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Упаковка</Label>
                            <Select value={packKind} onValueChange={(v) => setPackKind(v as PackKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PACKS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}{p.price ? ` · ${fmtMoney(p.price)}/ед.` : ""}</SelectItem>)}
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
                <CardHeader><CardTitle className="text-sm">Маршрут</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 list-decimal pl-4">
                    {route.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">11. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                  <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="box"
                defaultName={`Коробка ${boxW}×${boxL}×${boxH} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-box-legacy" />
          
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
      </PageMain>
    </PageShell>
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