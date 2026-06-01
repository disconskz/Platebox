import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag } from "lucide-react";
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
 * Шаблон «Пакет» — упаковочная продукция: развёртка, конструкция, высечка,
 * биговка, склейка, ручки, люверсы, окно, усиление, сборка, premium.
 * Доработка 67.
 */

type BagKind =
  | "no_handle" | "rope" | "ribbon" | "diecut" | "eyelet"
  | "window" | "reinforced_bottom" | "reinforced_handle" | "card_reinforce"
  | "kraft" | "premium";
const KINDS: { value: BagKind; label: string }[] = [
  { value: "no_handle", label: "Без ручек" },
  { value: "rope", label: "С верёвочными ручками" },
  { value: "ribbon", label: "С ленточными ручками" },
  { value: "diecut", label: "С вырубной ручкой" },
  { value: "eyelet", label: "С люверсами" },
  { value: "window", label: "С окном" },
  { value: "reinforced_bottom", label: "С усиленным дном" },
  { value: "reinforced_handle", label: "С усиленной ручкой" },
  { value: "card_reinforce", label: "С картонным усилением" },
  { value: "kraft", label: "Крафт-пакет" },
  { value: "premium", label: "Premium пакет" },
];

type Material = {
  value: string; label: string; type: string; density: number; thickness: number;
  sheetW: number; sheetH: number; pricePerSheet: number;
  designer?: boolean; premium?: boolean; plastic?: boolean;
};
const MATERIALS: Material[] = [
  { value: "coated-170", label: "Мелованная 170 г", type: "coated", density: 170, thickness: 0.20, sheetW: 720, sheetH: 1020, pricePerSheet: 45 },
  { value: "coated-200", label: "Мелованная 200 г", type: "coated", density: 200, thickness: 0.24, sheetW: 720, sheetH: 1020, pricePerSheet: 55 },
  { value: "coated-250", label: "Мелованная 250 г", type: "coated", density: 250, thickness: 0.30, sheetW: 720, sheetH: 1020, pricePerSheet: 65 },
  { value: "coated-300", label: "Мелованная 300 г", type: "coated", density: 300, thickness: 0.36, sheetW: 720, sheetH: 1020, pricePerSheet: 80 },
  { value: "coated-350", label: "Мелованная 350 г", type: "coated", density: 350, thickness: 0.42, sheetW: 720, sheetH: 1020, pricePerSheet: 95 },
  { value: "kraft-170", label: "Крафт 170 г", type: "kraft", density: 170, thickness: 0.22, sheetW: 700, sheetH: 1000, pricePerSheet: 50, designer: true },
  { value: "kraft-250", label: "Крафт 250 г", type: "kraft", density: 250, thickness: 0.32, sheetW: 700, sheetH: 1000, pricePerSheet: 70, designer: true },
  { value: "designer-250", label: "Дизайнерская 250 г", type: "designer", density: 250, thickness: 0.30, sheetW: 700, sheetH: 1000, pricePerSheet: 180, designer: true },
  { value: "designer-300", label: "Дизайнерская 300 г", type: "designer", density: 300, thickness: 0.38, sheetW: 700, sheetH: 1000, pricePerSheet: 220, designer: true },
  { value: "touch-300", label: "Touch cover 300 г", type: "designer", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 320, designer: true, premium: true },
  { value: "metallic-300", label: "Metallic paper 300 г", type: "designer", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 380, designer: true, premium: true },
  { value: "laminated-300", label: "Ламинированная бумага 300 г", type: "laminated", density: 300, thickness: 0.38, sheetW: 700, sheetH: 1000, pricePerSheet: 260 },
  { value: "plastic-coated", label: "Plastic coated paper 250", type: "plastic", density: 250, thickness: 0.30, sheetW: 700, sheetH: 1000, pricePerSheet: 240, plastic: true },
  { value: "synthetic-300", label: "Синтетическая бумага 300", type: "synthetic", density: 300, thickness: 0.30, sheetW: 700, sheetH: 1000, pricePerSheet: 230, plastic: true },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 160 },
  { value: "gloss", label: "Глянцевая", price: 140 },
  { value: "soft", label: "Soft-touch", price: 320 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv";

type BottomType = "flat" | "auto_lock" | "cross_bottom" | "glued";
const BOTTOMS: { value: BottomType; label: string }[] = [
  { value: "flat", label: "Плоское дно" },
  { value: "auto_lock", label: "Автомат. замок" },
  { value: "cross_bottom", label: "Крестовое дно" },
  { value: "glued", label: "Склеенное дно" },
];

type Handle = { value: string; label: string; mode: "per_pair" | "per_m"; price: number };
const HANDLES: Handle[] = [
  { value: "rope-cotton", label: "Верёвка хлопковая", mode: "per_pair", price: 24 },
  { value: "rope-polyester", label: "Верёвка полиэстер", mode: "per_pair", price: 18 },
  { value: "ribbon-satin", label: "Лента атласная", mode: "per_pair", price: 32 },
  { value: "ribbon-grosgrain", label: "Лента репсовая", mode: "per_pair", price: 36 },
  { value: "cord-meter", label: "Шнур (по метражу)", mode: "per_m", price: 35 },
  { value: "ribbon-meter", label: "Лента (по метражу)", mode: "per_m", price: 80 },
  { value: "plastic-handle", label: "Пластиковая ручка", mode: "per_pair", price: 28 },
];

type Eyelet = { value: string; label: string; price: number; install: number };
const EYELETS: Eyelet[] = [
  { value: "metal-8", label: "Люверс металл. ⌀8 мм", price: 6, install: 3 },
  { value: "metal-10", label: "Люверс металл. ⌀10 мм", price: 8, install: 4 },
  { value: "metal-12", label: "Люверс металл. ⌀12 мм", price: 10, install: 4 },
  { value: "brass-10", label: "Люверс латунь ⌀10 мм", price: 14, install: 5 },
  { value: "plastic-10", label: "Люверс пластик ⌀10 мм", price: 3, install: 3 },
];

type GlueType = "pva" | "hotmelt" | "tape" | "manual";
const GLUES: { value: GlueType; label: string; pricePerM: number; pricePerItem: number; manual?: boolean }[] = [
  { value: "pva", label: "ПВА (автомат)", pricePerM: 1.2, pricePerItem: 3 },
  { value: "hotmelt", label: "Hotmelt (автомат)", pricePerM: 2.0, pricePerItem: 4 },
  { value: "tape", label: "Двухсторонний скотч", pricePerM: 8, pricePerItem: 6 },
  { value: "manual", label: "Ручная склейка", pricePerM: 1.0, pricePerItem: 12, manual: true },
];

type PackKind = "none" | "stack" | "box" | "bag" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "stack", label: "В пачки по 50", price: 25, perPack: 50 },
  { value: "box", label: "Коробка по 100", price: 180, perPack: 100 },
  { value: "bag", label: "Индивидуальный пакет", price: 5, perPack: 1 },
  { value: "premium", label: "Premium упаковка", price: 120, perPack: 25 },
];

export default function BagCalculator() {
  // Основные
  const [circulation, setCirculation] = useState(500);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<BagKind>("rope");
  const [bagW, setBagW] = useState(250);  // ширина пакета
  const [bagH, setBagH] = useState(350);  // высота пакета
  const [bagD, setBagD] = useState(100);  // глубина пакета
  const [leadDays, setLeadDays] = useState(7);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(40);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("coated-250");

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
  const [embossAreaCm2, setEmbossAreaCm2] = useState(20);

  // Конструктив
  const [bottomType, setBottomType] = useState<BottomType>("auto_lock");
  const [bigCount, setBigCount] = useState(6);
  const [optDeflash, setOptDeflash] = useState(true);

  // Окно
  const [hasWindow, setHasWindow] = useState(false);
  const [windowW, setWindowW] = useState(80);
  const [windowH, setWindowH] = useState(100);
  const [windowFilmPricePerM2, setWindowFilmPricePerM2] = useState(800);

  // Усиление
  const [hasBottomReinforce, setHasBottomReinforce] = useState(false);
  const [hasHandleReinforce, setHasHandleReinforce] = useState(false);
  const [hasCardReinforce, setHasCardReinforce] = useState(false);

  // Ручки / люверсы
  const [hasHandles, setHasHandles] = useState(true);
  const [handleKey, setHandleKey] = useState("rope-cotton");
  const [handleLengthM, setHandleLengthM] = useState(0.4); // длина одной ручки в м
  const [handlesPerBag, setHandlesPerBag] = useState(2);
  const [hasEyelets, setHasEyelets] = useState(false);
  const [eyeletKey, setEyeletKey] = useState("metal-10");
  const [eyeletsPerBag, setEyeletsPerBag] = useState(4);

  // Склейка
  const [glueType, setGlueType] = useState<GlueType>("hotmelt");

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const handle = useMemo(() => HANDLES.find((h) => h.value === handleKey)!, [handleKey]);
  const eyelet = useMemo(() => EYELETS.find((e) => e.value === eyeletKey)!, [eyeletKey]);
  const glue = useMemo(() => GLUES.find((g) => g.value === glueType)!, [glueType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);
  const bottom = useMemo(() => BOTTOMS.find((b) => b.value === bottomType)!, [bottomType]);

  // Автологика по типу пакета
  useEffect(() => {
    if (kind === "no_handle") { setHasHandles(false); setHasEyelets(false); }
    if (kind === "rope") { setHasHandles(true); setHandleKey("rope-cotton"); }
    if (kind === "ribbon") { setHasHandles(true); setHandleKey("ribbon-satin"); }
    if (kind === "diecut") { setHasHandles(false); setHasEyelets(false); }
    if (kind === "eyelet") { setHasEyelets(true); setHasHandles(true); }
    if (kind === "window") { setHasWindow(true); }
    if (kind === "reinforced_bottom") { setHasBottomReinforce(true); }
    if (kind === "reinforced_handle") { setHasHandles(true); setHasHandleReinforce(true); }
    if (kind === "card_reinforce") { setHasCardReinforce(true); }
    if (kind === "kraft") {
      setMaterialKey((m) => (MATERIALS.find((x) => x.value === m)?.type === "kraft" ? m : "kraft-170"));
    }
    if (kind === "premium") {
      setMaterialKey((m) => (MATERIALS.find((x) => x.value === m)?.premium ? m : "touch-300"));
      if (lamType === "none") setLamType("soft");
      setOptEmboss(true);
      setHasHandleReinforce(true);
      setHasBottomReinforce(true);
      if (packKind === "none" || packKind === "stack") setPackKind("premium");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Плотность ≥ 250 — биговка нужна обязательно (минимум по периметру + 2 на дно)
  useEffect(() => {
    if (material.density >= 250 && bigCount < 6) setBigCount(6);
  }, [material]); // eslint-disable-line

  // Пластик — белила
  useEffect(() => { if (material.plastic && !whiteInk) setWhiteInk(true); }, [material]); // eslint-disable-line

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.plastic) return "uv";
    if (circulation >= 500) return "offset";
    return "digital";
  }, [printMode, material, circulation]);

  // Premium коэффициент сложности
  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.15;
    if (material.designer) k += 0.05;
    if (lamType === "soft" || optSoftTouch) k += 0.1;
    if (kind === "premium") k += 0.2;
    if (optEmboss) k += 0.05;
    if (optCongrev) k += 0.05;
    if (optFoil) k += 0.05;
    return +k.toFixed(2);
  }, [material, lamType, optSoftTouch, kind, optEmboss, optCongrev, optFoil]);

  // Развёртка: упрощённо ширина = 2(W + D) + клапан склейки, высота = H + D + клапан дна
  const sideFlap = 20; // клапан склейки
  const bottomFlap = 30; // клапан дна
  const unfoldW = useMemo(() => 2 * (bagW + bagD) + sideFlap, [bagW, bagD]);
  const unfoldH = useMemo(() => bagH + bagD + bottomFlap, [bagH, bagD]);

  // Раскладка
  const layout = useMemo(() => {
    const wCell = unfoldW + 6;
    const hCell = unfoldH + 6;
    const sw = material.sheetW, sh = material.sheetH;
    // Печатный формат = закупочный (большие развёртки)
    const a = Math.floor(sw / wCell) * Math.floor(sh / hCell);
    const b = Math.floor(sw / hCell) * Math.floor(sh / wCell);
    const up = Math.max(1, a, b);
    const net = Math.ceil(circulation / up);
    const setupOwn = colorsBack > 0 ? 0 : 150;
    const setupForeign = colorsBack > 0 ? 300 : 0;
    const setupOffset = (setupOwn + setupForeign) + Math.ceil(net * 0.01);
    const setup = effectivePrintMode === "offset" ? setupOffset : effectivePrintMode === "uv" ? 30 : 15;
    const printSheets = net + setup;
    const purchaseSheets = printSheets; // 1:1 — формат уже = закупочному
    const areaUnfoldM2 = (unfoldW * unfoldH) / 1_000_000;
    const totalAreaM2 = circulation * areaUnfoldM2;
    const printAreaM2 = +((printSheets * sw * sh) / 1_000_000).toFixed(3);
    return { up, sheets: net, printSheets, purchaseSheets, areaM2: totalAreaM2, printAreaM2, setup };
  }, [material, unfoldW, unfoldH, circulation, colorsBack, effectivePrintMode]);

  // Длина клеевого шва (боковой шов + дно)
  const glueSeamM = useMemo(() => {
    const sideMm = bagH + bottomFlap;
    const bottomMm = 2 * (bagW + bagD);
    return +((sideMm + bottomMm) * circulation / 1000).toFixed(1);
  }, [bagH, bagW, bagD, circulation]);

  // Длина контура высечки на 1 разворот (приблиз.)
  const contourLengthM = useMemo(() => {
    return +((2 * (unfoldW + unfoldH) + 4 * bigCount * 30) * circulation / 1000).toFixed(1);
  }, [unfoldW, unfoldH, bigCount, circulation]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн пакета", Math.max(1, designsCount), "макет", 6000);
    push("Препресс", "Проверка макета и подготовка развёртки", Math.max(1, designsCount), "макет", 1500);
    push("Препресс", "Раскладка", 1, "усл.", 800);
    push("Препресс", "Подготовка штампа высечки", Math.max(1, designsCount), "макет", 2500);

    // Материал и резка
    push("Материалы", `${material.label} (лист ${material.sheetW}×${material.sheetH})`,
      layout.purchaseSheets, "лист", material.pricePerSheet);
    push("Препресс", "Резка закупочного на печатный", layout.purchaseSheets, "лист", 2);

    // Печать
    if (effectivePrintMode === "offset") {
      const forms = (colors + pantoneCount) + (colorsBack > 0 ? (colorsBack + pantoneCount) : 0);
      push("Печать", "Печатные формы", forms * Math.max(1, designsCount), "форма", 1500);
      push("Печать", "Приладка офсета", 1, "усл.", layout.setup * 5);
      push("Печать", "Офсетная печать", layout.printSheets * (colorsBack > 0 ? 2 : 1), "оттиск", 6.5);
    } else if (effectivePrintMode === "uv") {
      push("Печать", "Приладка UV", 1, "усл.", 2500);
      push("Печать", "UV-печать", layout.printAreaM2 * (colorsBack > 0 ? 2 : 1), "м²",
        +(2200 + (whiteInk ? 400 : 0) + pantoneCount * 200).toFixed(2));
    } else {
      push("Печать", "Цифровая печать", layout.printSheets * (colorsBack > 0 ? 2 : 1), "оттиск",
        +(32 + colors * 2 + (whiteInk ? 8 : 0)).toFixed(2));
    }
    if (optVarnish) push("Печать", "Защитный лак", layout.printAreaM2, "м²", 220);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Выборочный лак", layout.printAreaM2, "м²", 1200);
    }

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`, layout.printAreaM2, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 700);
    }
    if (optSoftTouch && lamType !== "soft") {
      push("Постпечать", "Soft-touch покрытие", layout.printAreaM2, "м²", 340);
    }

    // Тиснение / конгрев / фольга
    if (optEmboss) {
      const cliche = Math.max(5000, embossAreaCm2 * 200);
      push("Постпечать", "Клише тиснения", 1, "шт", cliche);
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Тиснение (нанесение)", circulation, "оттиск", +(20 * premiumCoef).toFixed(2));
      if (optFoil) push("Постпечать", "Фольга", circulation * embossAreaCm2, "см²", 0.05);
    }
    if (optCongrev) {
      const cliche = Math.max(8000, embossAreaCm2 * 350);
      push("Постпечать", "Клише конгрева", 1, "шт", cliche);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1800);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", +(25 * premiumCoef).toFixed(2));
    }
    if (optFoil && !optEmboss) {
      push("Постпечать", "Фольгирование", circulation * embossAreaCm2, "см²", 0.06);
      push("Постпечать", "Приладка фольги", 1, "усл.", 1500);
    }

    // Высечка + удаление облоя
    push("Постпечать", "Штамп высечки развёртки", 1, "усл.", Math.max(7500, contourLengthM * 25));
    push("Постпечать", "Приладка высечки", 1, "усл.", 2000);
    push("Постпечать", "Высечка развёртки", layout.printSheets, "лист", +(8 * premiumCoef).toFixed(2));
    if (optDeflash) push("Постпечать", "Удаление облоя", circulation, "пакет", +(0.8 * premiumCoef).toFixed(2));

    // Биговка
    if (bigCount > 0) {
      push("Постпечать", "Приладка биговки", 1, "усл.", 800);
      push("Постпечать", `Биговка (${bigCount} линий)`, circulation * bigCount, "биг", 0.4);
    }

    // Вклейка окна
    if (hasWindow) {
      const windowAreaM2 = (windowW * windowH) / 1_000_000;
      push("Материалы", "Плёнка для окна", +(windowAreaM2 * circulation).toFixed(3), "м²", windowFilmPricePerM2);
      push("Постпечать", "Приладка вклейки окна", 1, "усл.", 1500);
      push("Постпечать", "Вклейка окна", circulation, "пакет", 8);
    }

    // Усиление дна / ручек / картон
    if (hasBottomReinforce) push("Постпечать", "Усиление дна", circulation, "пакет", 4);
    if (hasHandleReinforce) push("Постпечать", "Усиление крепления ручек", circulation, "пакет", 3);
    if (hasCardReinforce) push("Постпечать", "Картонная вставка дна", circulation, "пакет", 12);

    // Склейка пакета
    push("Постпечать", `Склейка: ${glue.label}`, glueSeamM, "пог.м", glue.pricePerM);
    push("Постпечать", "Работа по склейке пакета", circulation, "пакет", glue.pricePerItem);
    push("Постпечать", "Приладка склейки", 1, "усл.", 1500);

    // Люверсы
    if (hasEyelets) {
      const eq = circulation * Math.max(1, eyeletsPerBag);
      push("Постпечать", `${eyelet.label} (материал)`, eq, "шт", eyelet.price);
      push("Постпечать", "Установка люверсов", eq, "шт", eyelet.install);
      push("Постпечать", "Приладка установки люверсов", 1, "усл.", 800);
    }

    // Ручки
    if (hasHandles) {
      if (kind === "diecut") {
        push("Постпечать", "Вырубная ручка (входит в высечку)", circulation, "пакет", 1);
      } else if (handle.mode === "per_m") {
        push("Постпечать", `${handle.label} (метраж)`,
          +(circulation * handleLengthM * handlesPerBag).toFixed(2), "пог.м", handle.price);
        push("Постпечать", "Установка ручек", circulation, "пакет", 8);
      } else {
        push("Постпечать", `${handle.label} (комплект)`, circulation, "комплект", handle.price);
        push("Постпечать", "Установка ручек", circulation, "пакет", 6);
      }
      push("Постпечать", "Приладка установки ручек", 1, "усл.", 1200);
    }

    // Финальная сборка
    const assemblyCoef = (hasHandles ? 1.2 : 1.0) * (hasWindow ? 1.4 : 1.0) * (kind === "premium" ? 1.8 : 1.0);
    push("Постпечать", `Финальная сборка пакета${assemblyCoef > 1 ? ` (×${assemblyCoef.toFixed(2)})` : ""}`,
      circulation, "пакет", +(4 * assemblyCoef).toFixed(2));

    // Контроль качества
    const qcCoef = (hasHandles || hasEyelets ? 1.3 : 1.0) * (kind === "premium" ? 1.2 : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "пакет", +(1.0 * qcCoef).toFixed(2));

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
    contourLengthM, optDeflash, bigCount,
    hasWindow, windowW, windowH, windowFilmPricePerM2,
    hasBottomReinforce, hasHandleReinforce, hasCardReinforce,
    glue, glueSeamM,
    hasEyelets, eyelet, eyeletsPerBag,
    hasHandles, handle, handleLengthM, handlesPerBag, kind,
    packKind, pack, circulation, hasDelivery, deliveryCost,
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
    s.push("Высечка развёртки");
    if (optDeflash) s.push("Удаление облоя");
    if (bigCount > 0) s.push(`Биговка (${bigCount} линий)`);
    if (hasWindow) s.push("Вклейка окна");
    s.push(`Склейка пакета (${glue.label})`);
    if (hasBottomReinforce) s.push("Усиление дна");
    if (hasCardReinforce) s.push("Картонная вставка дна");
    if (hasHandleReinforce) s.push("Усиление ручек");
    if (hasEyelets) s.push("Установка люверсов");
    if (hasHandles) s.push(kind === "diecut" ? "Вырубная ручка" : "Установка ручек");
    s.push("Финальная сборка", "Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, lamType, lam, optVarnish, optSpotVarnish, optEmboss, optCongrev, optFoil,
      optDeflash, bigCount, hasWindow, glue, hasBottomReinforce, hasCardReinforce, hasHandleReinforce,
      hasEyelets, hasHandles, kind, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <ShoppingBag className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Пакет</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Развёртка, конструкция, высечка, биговка, склейка, ручки, люверсы, окно, усиление, сборка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 67</Badge>
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
                    <Label>Тип пакета</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as BagKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина W, мм</Label><Input type="number" value={bagW} onChange={(e) => setBagW(+e.target.value || 0)} /></div>
                  <div><Label>Высота H, мм</Label><Input type="number" value={bagH} onChange={(e) => setBagH(+e.target.value || 0)} /></div>
                  <div><Label>Глубина D, мм</Label><Input type="number" value={bagD} onChange={(e) => setBagD(+e.target.value || 0)} /></div>
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
                    Развёртка: <b>{unfoldW}×{unfoldH}</b> мм · На лист: <b>{layout.up}</b> · печ. листов: <b>{layout.printSheets}</b>
                    {" · "}печать: <b>{effectivePrintMode}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "construct", "window", "hardware", "glue", "ship"]} className="w-full">
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
                          <Row label="Удаление облоя (после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                          <Row label="Усиление дна" checked={hasBottomReinforce} onChange={setHasBottomReinforce} />
                          <Row label="Усиление ручек" checked={hasHandleReinforce} onChange={setHasHandleReinforce} />
                          <Row label="Картонная вставка дна" checked={hasCardReinforce} onChange={setHasCardReinforce} />
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Длина контура высечки: <b>{contourLengthM}</b> пог.м · Клеевой шов: <b>{glueSeamM}</b> пог.м
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="window">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Окно и плёнка
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

                    <AccordionItem value="hardware">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Ручки и фурнитура
                          <Badge variant={(hasHandles || hasEyelets) ? "default" : "outline"} className="text-[10px]">
                            {[hasHandles && handle.label, hasEyelets && `люверс×${eyeletsPerBag}`].filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <Row label="Ручки" checked={hasHandles} onChange={setHasHandles} />
                          {hasHandles && kind !== "diecut" && (<>
                            <div className="sm:col-span-2">
                              <Label>Тип ручек</Label>
                              <Select value={handleKey} onValueChange={setHandleKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {HANDLES.map((h) => <SelectItem key={h.value} value={h.value}>
                                    {h.label} ({fmtMoney(h.price)}/{h.mode === "per_m" ? "пог.м" : "комплект"})
                                  </SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {handle.mode === "per_m" && (<>
                              <div><Label>Длина 1 ручки, м</Label><Input type="number" min={0.1} step={0.05} value={handleLengthM} onChange={(e) => setHandleLengthM(+e.target.value || 0.1)} /></div>
                              <div><Label>Ручек на пакет</Label><Input type="number" min={1} value={handlesPerBag} onChange={(e) => setHandlesPerBag(+e.target.value || 1)} /></div>
                            </>)}
                          </>)}
                          <Row label="Люверсы" checked={hasEyelets} onChange={setHasEyelets} />
                          {hasEyelets && (<>
                            <div className="sm:col-span-2">
                              <Label>Тип люверса</Label>
                              <Select value={eyeletKey} onValueChange={setEyeletKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {EYELETS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label} ({fmtMoney(e.price)}+{fmtMoney(e.install)}/шт)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Люверсов на пакет</Label><Input type="number" min={1} value={eyeletsPerBag} onChange={(e) => setEyeletsPerBag(+e.target.value || 1)} /></div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="glue">
                      <AccordionTrigger>7. Склейка и сборка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <div className="sm:col-span-2">
                            <Label>Тип склейки</Label>
                            <Select value={glueType} onValueChange={(v) => setGlueType(v as GlueType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GLUES.map((g) => <SelectItem key={g.value} value={g.value}>
                                  {g.label} ({fmtMoney(g.pricePerM)}/м + {fmtMoney(g.pricePerItem)}/шт)
                                </SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Сборка считается с коэффициентом: ручки ×1.2, окно ×1.4, premium ×1.8.
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>8. Упаковка и доставка</AccordionTrigger>
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
                <CardHeader><CardTitle className="text-sm">9. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                  <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="bag"
                defaultName={`Пакет ${bagW}×${bagH}×${bagD} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-bag" />
          
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