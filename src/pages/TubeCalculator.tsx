import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Cylinder } from "lucide-react";
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
 * Шаблон «Тубус» — цилиндрическая упаковка: навивка, кашировка, крышки, дно,
 * втулка, ложементы, магниты, ленты, окно, premium-конструкции. Доработка 69.
 */

type TubeKind =
  | "simple" | "lid" | "metal_lid" | "plastic_parts" | "tray"
  | "ribbon" | "magnet" | "window" | "premium";
const KINDS: { value: TubeKind; label: string }[] = [
  { value: "simple", label: "Простой тубус" },
  { value: "lid", label: "С крышкой" },
  { value: "metal_lid", label: "С металл. крышкой" },
  { value: "plastic_parts", label: "С пластик. элементами" },
  { value: "tray", label: "С ложементом" },
  { value: "ribbon", label: "С лентой" },
  { value: "magnet", label: "С магнитом" },
  { value: "window", label: "С окном" },
  { value: "premium", label: "Premium тубус" },
];

type Liner = {
  value: string; label: string; type: string; density: number;
  pricePerM2: number; designer?: boolean; premium?: boolean; plastic?: boolean;
};
const LINERS: Liner[] = [
  { value: "coated-150", label: "Мел. бумага 150 г", type: "coated", density: 150, pricePerM2: 420 },
  { value: "coated-200", label: "Мел. бумага 200 г", type: "coated", density: 200, pricePerM2: 560 },
  { value: "designer-250", label: "Дизайн. бумага 250 г", type: "designer", density: 250, pricePerM2: 920, designer: true },
  { value: "touch-300", label: "Touch cover 300 г", type: "designer", density: 300, pricePerM2: 1480, designer: true, premium: true },
  { value: "kraft-180", label: "Крафт 180 г", type: "kraft", density: 180, pricePerM2: 380, designer: true },
  { value: "plastic-coated", label: "Plastic coated paper", type: "plastic", density: 220, pricePerM2: 1100, plastic: true },
];

type Core = {
  value: string; label: string; thicknessMm: number; pricePerM: number;
  microflute?: boolean; bind?: boolean;
};
const CORES: Core[] = [
  { value: "spiral-1.5", label: "Навивной картон 1.5 мм", thicknessMm: 1.5, pricePerM: 220 },
  { value: "spiral-2", label: "Навивной картон 2 мм", thicknessMm: 2.0, pricePerM: 300 },
  { value: "spiral-3", label: "Навивной картон 3 мм", thicknessMm: 3.0, pricePerM: 420 },
  { value: "spiral-4", label: "Навивной картон 4 мм", thicknessMm: 4.0, pricePerM: 560 },
  { value: "bind-2", label: "Переплётный 2 мм", thicknessMm: 2.0, pricePerM: 380, bind: true },
  { value: "microflute", label: "Микрогофрокартон E", thicknessMm: 1.5, pricePerM: 250, microflute: true },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 160 },
  { value: "gloss", label: "Глянцевая", price: 140 },
  { value: "soft", label: "Soft-touch", price: 340 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv";

type LidType = "none" | "card" | "metal" | "plastic" | "wooden" | "premium";
const LIDS: { value: LidType; label: string; price: number }[] = [
  { value: "none", label: "Без крышки", price: 0 },
  { value: "card", label: "Картонная крышка", price: 60 },
  { value: "metal", label: "Металлическая", price: 220 },
  { value: "plastic", label: "Пластиковая", price: 140 },
  { value: "wooden", label: "Деревянная", price: 320 },
  { value: "premium", label: "Premium крышка", price: 480 },
];

type BottomLidType = "card" | "metal" | "plastic" | "wooden";
const BOTTOMS: { value: BottomLidType; label: string; price: number }[] = [
  { value: "card", label: "Картонное дно", price: 40 },
  { value: "metal", label: "Металлическое дно", price: 180 },
  { value: "plastic", label: "Пластиковое дно", price: 110 },
  { value: "wooden", label: "Деревянное дно", price: 260 },
];

type Tray = { value: string; label: string; price: number; install: number };
const TRAYS: Tray[] = [
  { value: "none", label: "Без ложемента", price: 0, install: 0 },
  { value: "card", label: "Картонный", price: 90, install: 12 },
  { value: "eva", label: "EVA", price: 240, install: 18 },
  { value: "foam", label: "Поролоновый", price: 140, install: 14 },
  { value: "designer", label: "Дизайнерский", price: 480, install: 30 },
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

type CashType = "none" | "auto" | "manual";
const CASHINGS: { value: CashType; label: string; pricePerM2: number }[] = [
  { value: "none", label: "Без кашировки", pricePerM2: 0 },
  { value: "auto", label: "Автоматическая", pricePerM2: 600 },
  { value: "manual", label: "Ручная", pricePerM2: 1400 },
];

type PackKind = "none" | "stack" | "box" | "individual" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "stack", label: "В пачки по 20", price: 30, perPack: 20 },
  { value: "box", label: "В коробку по 30", price: 220, perPack: 30 },
  { value: "individual", label: "Индивидуальная", price: 35, perPack: 1 },
  { value: "premium", label: "Premium упаковка", price: 200, perPack: 10 },
];

export default function TubeCalculator() {
  // Основные
  const [circulation, setCirculation] = useState(300);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<TubeKind>("lid");
  const [outerDiameter, setOuterDiameter] = useState(80); // мм
  const [wallThickness, setWallThickness] = useState(2);  // мм
  const [tubeHeight, setTubeHeight] = useState(250);      // мм
  const [leadDays, setLeadDays] = useState(10);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(50);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материалы
  const [linerKey, setLinerKey] = useState("coated-200");
  const [coreKey, setCoreKey] = useState("spiral-2");
  const [hasInnerSleeve, setHasInnerSleeve] = useState(false);

  // Печать
  const [colors, setColors] = useState(4);
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
  const [embossAreaCm2, setEmbossAreaCm2] = useState(25);

  // Кашировка / навивка
  const [cashType, setCashType] = useState<CashType>("auto");
  const [windingPricePerM, setWindingPricePerM] = useState(220);

  // Крышка / дно
  const [lidType, setLidType] = useState<LidType>("card");
  const [bottomLidType, setBottomLidType] = useState<BottomLidType>("card");

  // Окно
  const [hasWindow, setHasWindow] = useState(false);
  const [windowW, setWindowW] = useState(60);
  const [windowH, setWindowH] = useState(80);
  const [windowFilmPricePerM2, setWindowFilmPricePerM2] = useState(900);

  // Ложемент
  const [trayKey, setTrayKey] = useState("none");

  // Магниты
  const [hasMagnets, setHasMagnets] = useState(false);
  const [magnetKey, setMagnetKey] = useState("15x2");
  const [magnetsPerTube, setMagnetsPerTube] = useState(2);

  // Лента
  const [hasRibbon, setHasRibbon] = useState(false);
  const [ribbonKey, setRibbonKey] = useState("satin-20");
  const [ribbonLengthM, setRibbonLengthM] = useState(0.4);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const liner = useMemo(() => LINERS.find((l) => l.value === linerKey)!, [linerKey]);
  const core = useMemo(() => CORES.find((c) => c.value === coreKey)!, [coreKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const lid = useMemo(() => LIDS.find((l) => l.value === lidType)!, [lidType]);
  const bottomLid = useMemo(() => BOTTOMS.find((b) => b.value === bottomLidType)!, [bottomLidType]);
  const tray = useMemo(() => TRAYS.find((t) => t.value === trayKey)!, [trayKey]);
  const magnet = useMemo(() => MAGNETS.find((m) => m.value === magnetKey)!, [magnetKey]);
  const ribbon = useMemo(() => RIBBONS.find((r) => r.value === ribbonKey)!, [ribbonKey]);
  const cashing = useMemo(() => CASHINGS.find((c) => c.value === cashType)!, [cashType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу тубуса
  useEffect(() => {
    if (kind === "lid" && lidType === "none") setLidType("card");
    if (kind === "metal_lid") setLidType("metal");
    if (kind === "plastic_parts") setLidType("plastic");
    if (kind === "tray") { if (trayKey === "none") setTrayKey("eva"); }
    if (kind === "ribbon") setHasRibbon(true);
    if (kind === "magnet") setHasMagnets(true);
    if (kind === "window") setHasWindow(true);
    if (kind === "premium") {
      if (lidType === "none" || lidType === "card") setLidType("premium");
      if (lamType === "none") setLamType("soft");
      setOptEmboss(true);
      if (cashType === "none") setCashType("auto");
      if (trayKey === "none") setTrayKey("eva");
      setHasRibbon(true);
      if (packKind === "none" || packKind === "stack") setPackKind("premium");
      setLinerKey((m) => (LINERS.find((x) => x.value === m)?.premium ? m : "touch-300"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (liner.plastic) return "uv";
    if (circulation >= 800) return "offset";
    return "digital";
  }, [printMode, liner, circulation]);

  // Premium-коэффициент сложности
  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (liner.premium) k += 0.15;
    if (liner.designer) k += 0.05;
    if (lamType === "soft" || optSoftTouch) k += 0.10;
    if (kind === "premium") k += 0.30;
    if (optEmboss) k += 0.05;
    if (optCongrev) k += 0.05;
    if (optFoil) k += 0.05;
    return +k.toFixed(2);
  }, [liner, lamType, optSoftTouch, kind, optEmboss, optCongrev, optFoil]);

  // Геометрия
  const innerDiameter = useMemo(() => Math.max(1, outerDiameter - 2 * wallThickness), [outerDiameter, wallThickness]);
  const circumferenceMm = useMemo(() => Math.PI * outerDiameter, [outerDiameter]);
  // Технологический запас на склейку и припуск
  const linerOverlap = 15; // мм
  const linerWidthMm = useMemo(() => circumferenceMm + linerOverlap, [circumferenceMm]);
  const linerHeightMm = tubeHeight + 4; // припуск по высоте
  const linerAreaPerTubeM2 = useMemo(() => (linerWidthMm * linerHeightMm) / 1_000_000, [linerWidthMm, linerHeightMm]);
  const totalLinerAreaM2 = useMemo(() => +(linerAreaPerTubeM2 * circulation).toFixed(3), [linerAreaPerTubeM2, circulation]);
  const coreLengthM = useMemo(() => +((tubeHeight * circulation) / 1000).toFixed(2), [tubeHeight, circulation]);
  const innerSleeveM = useMemo(() => hasInnerSleeve ? +((tubeHeight * 0.8 * circulation) / 1000).toFixed(2) : 0, [hasInnerSleeve, tubeHeight, circulation]);

  // Печатные «листы» для офсета — печатается развёртка лайнера. Считаем,
  // что на стандартный 720×1020 укладывается несколько лайнеров.
  const sheetW = 720, sheetH = 1020;
  const linersPerSheet = useMemo(() => {
    const wCell = linerWidthMm + 8;
    const hCell = linerHeightMm + 8;
    const a = Math.floor(sheetW / wCell) * Math.floor(sheetH / hCell);
    const b = Math.floor(sheetW / hCell) * Math.floor(sheetH / wCell);
    return Math.max(1, a, b);
  }, [linerWidthMm, linerHeightMm]);
  const netSheets = useMemo(() => Math.ceil(circulation / linersPerSheet), [circulation, linersPerSheet]);
  const setupSheets = effectivePrintMode === "offset" ? 150 + Math.ceil(netSheets * 0.01)
                    : effectivePrintMode === "uv" ? 40 : 20;
  const printSheets = netSheets + setupSheets;
  const printAreaM2 = +((printSheets * sheetW * sheetH) / 1_000_000).toFixed(3);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн тубуса", Math.max(1, designsCount), "макет", 8000);
    push("Препресс", "Проверка макета и подготовка развёртки лайнера", Math.max(1, designsCount), "макет", 2000);
    push("Препресс", "Раскладка", 1, "усл.", 1000);

    // Материалы
    push("Материалы", `Лайнер: ${liner.label}`, totalLinerAreaM2, "м²", liner.pricePerM2);
    push("Материалы", `Втулка: ${core.label}`, coreLengthM, "пог.м", core.pricePerM);
    if (hasInnerSleeve) push("Материалы", "Внутренняя втулка", innerSleeveM, "пог.м", +(core.pricePerM * 0.8).toFixed(2));

    // Печать
    if (effectivePrintMode === "offset") {
      const forms = colors + pantoneCount;
      push("Печать", "Печатные формы", forms * Math.max(1, designsCount), "форма", 1500);
      push("Печать", "Приладка офсета", 1, "усл.", setupSheets * 5);
      push("Печать", "Офсетная печать", printSheets, "оттиск", 7);
    } else if (effectivePrintMode === "uv") {
      push("Печать", "Приладка UV", 1, "усл.", 3000);
      push("Печать", "UV-печать", printAreaM2, "м²",
        +(2400 + (whiteInk ? 500 : 0) + pantoneCount * 200).toFixed(2));
    } else {
      push("Печать", "Цифровая печать", printSheets, "оттиск",
        +(36 + colors * 2 + (whiteInk ? 10 : 0)).toFixed(2));
    }
    if (optVarnish) push("Печать", "Защитный лак", printAreaM2, "м²", 240);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Выборочный лак", printAreaM2, "м²", 1300);
    }

    // Ламинация / soft-touch
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`, printAreaM2, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 800);
    }
    if (optSoftTouch && lamType !== "soft") {
      push("Постпечать", "Soft-touch покрытие", printAreaM2, "м²", 360);
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
      push("Постпечать", `Кашировка: ${cashing.label}`, totalLinerAreaM2, "м²",
        +(cashing.pricePerM2 * (cashType === "manual" ? premiumCoef : 1)).toFixed(2));
      push("Постпечать", "Приладка кашировки", 1, "усл.", 2500);
    }

    // Навивка цилиндра
    push("Постпечать", "Приладка навивки", 1, "усл.", 3000);
    push("Постпечать", "Навивка цилиндра", coreLengthM, "пог.м", +(windingPricePerM * premiumCoef).toFixed(2));

    // Крышка
    if (lidType !== "none") {
      push("Материалы", `Крышка: ${lid.label}`, circulation, "шт", lid.price);
      push("Постпечать", "Установка крышки", circulation, "тубус", +(6 * premiumCoef).toFixed(2));
    }
    // Дно
    push("Материалы", `Дно: ${bottomLid.label}`, circulation, "шт", bottomLid.price);
    push("Постпечать", "Установка дна", circulation, "тубус", +(5 * premiumCoef).toFixed(2));

    // Окно
    if (hasWindow) {
      const windowAreaM2 = (windowW * windowH) / 1_000_000;
      push("Постпечать", "Высечка окна", circulation, "тубус", 6);
      push("Постпечать", "Приладка вклейки окна", 1, "усл.", 1800);
      push("Материалы", "Плёнка для окна", +(windowAreaM2 * circulation).toFixed(3), "м²", windowFilmPricePerM2);
      push("Постпечать", "Вклейка окна", circulation, "тубус", 10);
    }

    // Ложемент
    if (trayKey !== "none") {
      push("Материалы", `${tray.label}`, circulation, "шт", tray.price);
      push("Постпечать", "Установка ложемента", circulation, "тубус", tray.install);
    }

    // Магниты
    if (hasMagnets) {
      const eq = circulation * Math.max(1, magnetsPerTube);
      push("Материалы", `${magnet.label}`, eq, "шт", magnet.price);
      push("Постпечать", "Установка магнитов", eq, "шт", magnet.install);
      push("Постпечать", "Приладка установки магнитов", 1, "усл.", 1200);
    }

    // Лента
    if (hasRibbon) {
      const meters = +(circulation * ribbonLengthM).toFixed(2);
      push("Материалы", `${ribbon.label}`, meters, "пог.м", ribbon.pricePerM);
      push("Постпечать", "Установка ленты", circulation, "тубус", ribbon.install);
      push("Постпечать", "Приладка установки ленты", 1, "усл.", 1000);
    }

    // Финальная сборка
    const assemblyKindCoef =
      kind === "premium" ? 2.0 :
      trayKey !== "none" ? 1.6 :
      hasWindow ? 1.4 :
      lidType !== "none" ? 1.2 : 1.0;
    push("Постпечать", `Финальная сборка${assemblyKindCoef > 1 ? ` (×${assemblyKindCoef.toFixed(2)})` : ""}`,
      circulation, "тубус", +(8 * assemblyKindCoef).toFixed(2));

    // Контроль качества
    const qcCoef = (hasMagnets || trayKey !== "none" ? 1.4 : 1.0) * (kind === "premium" ? 1.2 : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "тубус", +(2 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, liner, core, hasInnerSleeve, innerSleeveM,
    totalLinerAreaM2, coreLengthM,
    effectivePrintMode, colors, pantoneCount, whiteInk, optVarnish, optSpotVarnish,
    setupSheets, printSheets, printAreaM2,
    lamType, lam, optSoftTouch, optEmboss, optCongrev, optFoil, embossAreaCm2, premiumCoef,
    cashType, cashing, windingPricePerM,
    lidType, lid, bottomLid,
    hasWindow, windowW, windowH, windowFilmPricePerM2,
    trayKey, tray,
    hasMagnets, magnet, magnetsPerTube,
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
    s.push("Проверка макета", "Подготовка развёртки лайнера", "Расчёт материала");
    if (effectivePrintMode === "offset") s.push("Вывод печатных форм", "Приладка офсета", "Офсетная печать лайнера");
    else if (effectivePrintMode === "uv") s.push("UV-печать лайнера");
    else s.push("Цифровая печать лайнера");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optVarnish) s.push("Защитный лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optEmboss) s.push("Тиснение");
    if (optCongrev) s.push("Конгрев");
    if (optFoil) s.push("Фольгирование");
    if (cashType !== "none") s.push(`Кашировка: ${cashing.label}`);
    s.push("Навивка цилиндра");
    if (lidType !== "none") s.push(`Изготовление и установка крышки: ${lid.label}`);
    s.push(`Установка дна: ${bottomLid.label}`);
    if (hasWindow) s.push("Высечка окна", "Вклейка окна");
    if (trayKey !== "none") s.push(`Установка ложемента: ${tray.label}`);
    if (hasMagnets) s.push("Установка магнитов");
    if (hasRibbon) s.push("Установка ленты");
    s.push("Финальная сборка", "Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, lamType, lam, optVarnish, optSpotVarnish, optEmboss, optCongrev, optFoil,
      cashType, cashing, lidType, lid, bottomLid, hasWindow, trayKey, tray, hasMagnets, hasRibbon,
      packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Cylinder className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Тубус</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Навивка, кашировка, крышки, дно, ложементы, магниты, ленты, окна, premium-сборка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 69</Badge>
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
                    <Label>Тип тубуса</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as TubeKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Внешний диаметр, мм</Label><Input type="number" value={outerDiameter} onChange={(e) => setOuterDiameter(+e.target.value || 0)} /></div>
                  <div><Label>Толщина стенки, мм</Label><Input type="number" step={0.5} value={wallThickness} onChange={(e) => setWallThickness(+e.target.value || 0)} /></div>
                  <div><Label>Высота тубуса, мм</Label><Input type="number" value={tubeHeight} onChange={(e) => setTubeHeight(+e.target.value || 0)} /></div>
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
                    Внутр. диаметр: <b>{innerDiameter}</b> мм · Окружность: <b>{circumferenceMm.toFixed(1)}</b> мм · Развёртка лайнера: <b>{linerWidthMm.toFixed(0)}×{linerHeightMm}</b> мм · На лист: <b>{linersPerSheet}</b>
                    {" · "}печ. листов: <b>{printSheets}</b> · режим: <b>{effectivePrintMode}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "cash", "lids", "window", "tray", "hardware", "ship"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал
                          <Badge variant="secondary" className="text-[10px]">{liner.label}</Badge>
                          <Badge variant="outline" className="text-[10px]">{core.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Лайнер</Label>
                            <Select value={linerKey} onValueChange={setLinerKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LINERS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerM2)}/м²)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Втулочный картон</Label>
                            <Select value={coreKey} onValueChange={setCoreKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CORES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label} ({fmtMoney(c.pricePerM)}/пог.м)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="inner" checked={hasInnerSleeve} onCheckedChange={(v) => setHasInnerSleeve(!!v)} />
                            <Label htmlFor="inner" className="cursor-pointer">Внутренняя втулка</Label>
                          </div>
                          <div><Label>Цена навивки, тг/пог.м</Label><Input type="number" value={windingPricePerM} onChange={(e) => setWindingPricePerM(+e.target.value || 0)} /></div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Площадь лайнера: <b>{totalLinerAreaM2.toFixed(3)} м²</b> · Длина втулки: <b>{coreLengthM} пог.м</b>
                            {" · "}Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>
                            {liner.designer && <> · <Badge variant="outline" className="text-[10px]">дизайнерская</Badge></>}
                            {liner.premium && <> · <Badge variant="outline" className="text-[10px]">premium</Badge></>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать и покрытие</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цветность</Label><Input type="number" min={0} max={8} value={colors} onChange={(e) => setColors(+e.target.value || 0)} /></div>
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

                    <AccordionItem value="cash">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Кашировка
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

                    <AccordionItem value="lids">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Крышка и дно
                          <Badge variant="outline" className="text-[10px]">{lid.label}</Badge>
                          <Badge variant="outline" className="text-[10px]">{bottomLid.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Тип крышки</Label>
                            <Select value={lidType} onValueChange={(v) => setLidType(v as LidType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LIDS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/шт)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Тип дна</Label>
                            <Select value={bottomLidType} onValueChange={(v) => setBottomLidType(v as BottomLidType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {BOTTOMS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label} ({fmtMoney(b.price)}/шт)</SelectItem>)}
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
                            {[hasMagnets && `магн×${magnetsPerTube}`, hasRibbon && ribbon.label].filter(Boolean).join(", ") || "нет"}
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
                            <div><Label>Магнитов на тубус</Label><Input type="number" min={1} value={magnetsPerTube} onChange={(e) => setMagnetsPerTube(+e.target.value || 1)} /></div>
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

                    <AccordionItem value="ship">
                      <AccordionTrigger>9. Упаковка и доставка</AccordionTrigger>
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
                <CardHeader><CardTitle className="text-sm">10. Итоговая стоимость</CardTitle></CardHeader>
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
                defaultName={`Тубус Ø${outerDiameter}×${tubeHeight} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-tube" />
          
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