import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Tags } from "lucide-react";
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
import { useHandbook } from "@/lib/operations/HandbookProvider";
import { buildTryHandbook } from "@/lib/operations/applyHandbook";
/**
 * Шаблон «Бирка / Ярлык» — листовая продукция с акцентом на форму, высечку,
 * отверстия, люверсы, шнурки/ленты, тиснение, персонализацию и комплектовку.
 * Доработка 66.
 */

type Kind =
  | "rect" | "shaped" | "round"
  | "hole" | "eyelet" | "cord" | "ribbon"
  | "qr" | "barcode" | "numbered"
  | "clothing" | "gift" | "premium";
const KINDS: { value: Kind; label: string }[] = [
  { value: "rect", label: "Прямоугольная" },
  { value: "shaped", label: "Фигурная" },
  { value: "round", label: "Круглая" },
  { value: "hole", label: "С отверстием" },
  { value: "eyelet", label: "С люверсом" },
  { value: "cord", label: "Со шнурком" },
  { value: "ribbon", label: "С лентой" },
  { value: "qr", label: "С QR-кодом" },
  { value: "barcode", label: "Со штрихкодом" },
  { value: "numbered", label: "С нумерацией" },
  { value: "clothing", label: "Для одежды" },
  { value: "gift", label: "Подарочная" },
  { value: "premium", label: "Premium" },
];

type Shape = "rect" | "round" | "oval" | "shaped";

type Material = {
  value: string; label: string; type: string; density: number; thickness: number;
  sheetW: number; sheetH: number; pricePerSheet: number;
  designer?: boolean; premium?: boolean; plastic?: boolean;
};
const MATERIALS: Material[] = [
  { value: "coated-250", label: "Картон мелованный 250 г", type: "coated", density: 250, thickness: 0.30, sheetW: 720, sheetH: 1020, pricePerSheet: 60 },
  { value: "coated-300", label: "Картон мелованный 300 г", type: "coated", density: 300, thickness: 0.36, sheetW: 720, sheetH: 1020, pricePerSheet: 75 },
  { value: "coated-350", label: "Картон мелованный 350 г", type: "coated", density: 350, thickness: 0.42, sheetW: 720, sheetH: 1020, pricePerSheet: 90 },
  { value: "coated-400", label: "Картон мелованный 400 г", type: "coated", density: 400, thickness: 0.48, sheetW: 720, sheetH: 1020, pricePerSheet: 110 },
  { value: "kraft-300", label: "Крафт-картон 300 г", type: "kraft", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 85, designer: true },
  { value: "designer-300", label: "Дизайнерская 300 г", type: "designer", density: 300, thickness: 0.38, sheetW: 700, sheetH: 1000, pricePerSheet: 220, designer: true },
  { value: "designer-350", label: "Дизайнерская 350 г", type: "designer", density: 350, thickness: 0.45, sheetW: 700, sheetH: 1000, pricePerSheet: 260, designer: true },
  { value: "touch-300", label: "Touch cover 300 г", type: "designer", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 320, designer: true, premium: true },
  { value: "textured-300", label: "Textured paper 300 г", type: "designer", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 290, designer: true, premium: true },
  { value: "metallic-300", label: "Metallic paper 300 г", type: "designer", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 380, designer: true, premium: true },
  { value: "plastic-450", label: "Пластик 450 мкм", type: "plastic", density: 450, thickness: 0.45, sheetW: 700, sheetH: 1000, pricePerSheet: 260, plastic: true },
  { value: "pvc-500", label: "ПВХ 500 мкм", type: "plastic", density: 500, thickness: 0.50, sheetW: 700, sheetH: 1000, pricePerSheet: 290, plastic: true },
  { value: "synthetic-300", label: "Синтетическая бумага 300", type: "synthetic", density: 300, thickness: 0.30, sheetW: 700, sheetH: 1000, pricePerSheet: 240, plastic: true },
  { value: "leatherette", label: "Кожзам (premium)", type: "leatherette", density: 500, thickness: 0.60, sheetW: 700, sheetH: 1000, pricePerSheet: 520, designer: true, premium: true },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 160 },
  { value: "gloss", label: "Глянцевая", price: 140 },
  { value: "soft", label: "Soft-touch", price: 320 },
];

type ContourComplex = "simple" | "mid" | "hard" | "fine" | "extreme";
const CONTOUR_COEF: Record<ContourComplex, number> = {
  simple: 1.0, mid: 1.3, hard: 1.7, fine: 2.0, extreme: 2.5,
};

type PrintMode = "auto" | "digital" | "offset" | "uv";

type Eyelet = { value: string; label: string; price: number; install: number };
const EYELETS: Eyelet[] = [
  { value: "metal-5", label: "Люверс металл. ⌀5 мм", price: 4, install: 3 },
  { value: "metal-8", label: "Люверс металл. ⌀8 мм", price: 6, install: 3 },
  { value: "metal-10", label: "Люверс металл. ⌀10 мм", price: 8, install: 4 },
  { value: "plastic-5", label: "Люверс пластик ⌀5 мм", price: 2, install: 3 },
  { value: "brass-8", label: "Люверс латунь ⌀8 мм", price: 12, install: 4 },
  { value: "ring-15", label: "Кольцо металл. ⌀15 мм", price: 14, install: 4 },
];

type Cord = { value: string; label: string; mode: "per_item" | "per_m"; price: number };
const CORDS: Cord[] = [
  { value: "cotton-thin", label: "Хлопковый шнурок (тонкий)", mode: "per_item", price: 6 },
  { value: "cotton-thick", label: "Хлопковый шнурок (толстый)", mode: "per_item", price: 10 },
  { value: "polyester", label: "Полиэстер шнурок", mode: "per_item", price: 8 },
  { value: "cord-meter", label: "Шнурок (по метражу)", mode: "per_m", price: 25 },
  { value: "ribbon-satin", label: "Лента атласная", mode: "per_item", price: 15 },
  { value: "ribbon-grosgrain", label: "Лента репсовая", mode: "per_item", price: 18 },
  { value: "ribbon-meter", label: "Лента (по метражу)", mode: "per_m", price: 60 },
];

type PackKind = "none" | "stack" | "set" | "bag" | "box" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perSet: boolean }[] = [
  { value: "none", label: "Без упаковки", price: 0, perSet: false },
  { value: "stack", label: "В пачки", price: 0.3, perSet: false },
  { value: "set", label: "По комплектам", price: 12, perSet: true },
  { value: "bag", label: "Индивидуальный пакет", price: 5, perSet: false },
  { value: "box", label: "Коробка", price: 45, perSet: true },
  { value: "premium", label: "Premium упаковка", price: 80, perSet: true },
];

export default function HangtagCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [circulation, setCirculation] = useState(1000);
  const [designsCount, setDesignsCount] = useState(1);
  const [kindsCount, setKindsCount] = useState(1);
  const [perSet, setPerSet] = useState(1);
  const [itemW, setItemW] = useState(50);
  const [itemH, setItemH] = useState(80);
  const [shape, setShape] = useState<Shape>("rect");
  const [kind, setKind] = useState<Kind>("rect");
  const [gap, setGap] = useState(4);
  const [bleed, setBleed] = useState(2);
  const [leadDays, setLeadDays] = useState(5);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(40);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("coated-350");

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
  const [embossAreaCm2, setEmbossAreaCm2] = useState(6);

  // Высечка / форма
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(true);
  const [optRoundCorners, setOptRoundCorners] = useState(false);
  const [contourComplex, setContourComplex] = useState<ContourComplex>("simple");

  // Отверстия / фурнитура
  const [hasHole, setHasHole] = useState(true);
  const [holesPerItem, setHolesPerItem] = useState(1);
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [hasEyelet, setHasEyelet] = useState(false);
  const [eyeletKey, setEyeletKey] = useState("metal-5");
  const [eyeletsPerItem, setEyeletsPerItem] = useState(1);
  const [hasCord, setHasCord] = useState(false);
  const [cordKey, setCordKey] = useState("cotton-thin");
  const [cordLengthM, setCordLengthM] = useState(0.2);
  const [cordManual, setCordManual] = useState(true);

  // Персонализация
  const [optQR, setOptQR] = useState(false);
  const [optBarcode, setOptBarcode] = useState(false);
  const [optNumber, setOptNumber] = useState(false);
  const [optPersonalize, setOptPersonalize] = useState(false);
  const [varElemsPerItem, setVarElemsPerItem] = useState(1);
  const [needDbCheck, setNeedDbCheck] = useState(true);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const eyelet = useMemo(() => EYELETS.find((e) => e.value === eyeletKey)!, [eyeletKey]);
  const cord = useMemo(() => CORDS.find((c) => c.value === cordKey)!, [cordKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу
  useEffect(() => {
    if (kind === "shaped" || kind === "round") { setShape(kind === "round" ? "round" : "shaped"); setOptDieCut(true); }
    if (kind === "hole") { setHasHole(true); }
    if (kind === "eyelet") { setHasHole(true); setHasEyelet(true); }
    if (kind === "cord") { setHasHole(true); setHasCord(true); }
    if (kind === "ribbon") { setHasHole(true); setHasCord(true); setCordKey("ribbon-satin"); }
    if (kind === "qr") setOptQR(true);
    if (kind === "barcode") setOptBarcode(true);
    if (kind === "numbered") setOptNumber(true);
    if (kind === "clothing") { setHasHole(true); setMaterialKey((m) => m === "coated-350" ? "kraft-300" : m); }
    if (kind === "premium") {
      setMaterialKey((m) => (MATERIALS.find((x) => x.value === m)?.premium ? m : "touch-300"));
      if (lamType === "none") setLamType("soft");
      setOptEmboss(true);
      setHasEyelet(true);
      setHasCord(true);
      if (packKind === "none" || packKind === "stack") setPackKind("bag");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Если есть высечка — обычно есть удаление облоя
  useEffect(() => { if (optDieCut && !optDeflash) setOptDeflash(true); }, [optDieCut]); // eslint-disable-line
  // Прозрачный/пластик/синтетика — белила
  useEffect(() => { if (material.plastic && !whiteInk) setWhiteInk(true); }, [material]); // eslint-disable-line
  // Если QR/штрихкод — проверка базы
  useEffect(() => { if ((optQR || optBarcode) && !needDbCheck) setNeedDbCheck(true); }, [optQR, optBarcode]); // eslint-disable-line
  // Люверс требует отверстия
  useEffect(() => { if (hasEyelet) setHasHole(true); }, [hasEyelet]);

  const variable = optQR || optBarcode || optNumber || optPersonalize;
  const codeControl = optQR || optBarcode;

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.plastic) return "uv";
    if (variable) return "digital";
    if (circulation >= 1000) return "offset";
    return "digital";
  }, [printMode, material, circulation, variable]);

  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.15;
    if (material.designer) k += 0.05;
    if (lamType === "soft" || optSoftTouch) k += 0.1;
    if (kind === "premium") k += 0.15;
    if (contourComplex === "hard") k += 0.1;
    if (contourComplex === "fine") k += 0.15;
    if (contourComplex === "extreme") k += 0.25;
    if (optEmboss) k += 0.05;
    if (optCongrev) k += 0.05;
    if (optFoil) k += 0.05;
    return +k.toFixed(2);
  }, [material, lamType, optSoftTouch, kind, contourComplex, optEmboss, optCongrev, optFoil]);

  // Раскладка (всегда лист)
  const layout = useMemo(() => {
    const wCell = itemW + gap + 2 * bleed;
    const hCell = itemH + gap + 2 * bleed;
    const sw = material.sheetW, sh = material.sheetH;
    // печатный формат = половина закупочного
    const pw = Math.floor(sw / 2), ph = sh;
    const a = Math.floor(pw / wCell) * Math.floor(ph / hCell);
    const b = Math.floor(pw / hCell) * Math.floor(ph / wCell);
    const up = Math.max(1, a, b);
    const net = Math.ceil(circulation / up);
    const setupOwn = colorsBack > 0 ? 0 : 150;
    const setupForeign = colorsBack > 0 ? 300 : 0;
    const setupOffset = (setupOwn + setupForeign) + Math.ceil(net * 0.01);
    const setup = effectivePrintMode === "offset" ? setupOffset : effectivePrintMode === "uv" ? 25 : 12;
    const printSheets = net + setup;
    const purchaseSheets = Math.ceil(printSheets / 2); // 2 печатных листа = 1 закупочный
    const areaItemM2 = (itemW * itemH) / 1_000_000;
    const totalAreaM2 = circulation * areaItemM2;
    const printAreaM2 = +((printSheets * pw * ph) / 1_000_000).toFixed(3);
    return { up, sheets: net, printSheets, purchaseSheets, printW: pw, printH: ph, areaM2: totalAreaM2, printAreaM2, setup };
  }, [material, itemW, itemH, gap, bleed, circulation, colorsBack, effectivePrintMode]);

  const contourLengthM = useMemo(() => {
    let perItemMm = 0;
    if (shape === "round") perItemMm = Math.PI * itemW;
    else if (shape === "oval") perItemMm = Math.PI * ((itemW + itemH) / 2);
    else if (shape === "shaped") perItemMm = 2 * (itemW + itemH) * 1.4;
    else perItemMm = 2 * (itemW + itemH);
    return +((perItemMm * circulation) / 1000).toFixed(1);
  }, [shape, itemW, itemH, circulation]);

  const setsCount = useMemo(
    () => Math.max(1, Math.ceil(circulation / Math.max(1, perSet))),
    [circulation, perSet],
  );

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн бирки", Math.max(1, designsCount), "макет", 3500);
    push("Препресс", "Проверка и подготовка макета", Math.max(1, designsCount), "макет", 600);
    if (kindsCount > 1) push("Препресс", `Сведение видов (${kindsCount} шт)`, kindsCount, "вид", 400);
    if (variable) {
      push("Препресс", "Подготовка базы переменных данных", 1, "усл.", 3000);
      if (needDbCheck) push("Препресс", "Проверка базы", 1, "усл.", 1500);
    }
    if (optDieCut) push("Препресс", "Подготовка штампа высечки", Math.max(1, designsCount), "макет", 1200);
    push("Препресс", "Раскладка", 1, "усл.", 600);

    // Материал и резка
    push("Материалы", `${material.label} (лист ${material.sheetW}×${material.sheetH})`,
      layout.purchaseSheets, "лист", material.pricePerSheet);
    push("Препресс", "Резка закупочного на печатный", layout.purchaseSheets, "лист", 2);

    // Печать
    if (effectivePrintMode === "offset") {
      const forms = (colors + pantoneCount) + (colorsBack > 0 ? (colorsBack + pantoneCount) : 0);
      push("Печать", "Печатные формы", forms * Math.max(1, designsCount), "форма", 1500);
      push("Печать", "Приладка офсета", 1, "усл.", layout.setup * 5);
      push("Печать", "Офсетная печать", layout.printSheets * (colorsBack > 0 ? 2 : 1), "оттиск", 5.5);
    } else if (effectivePrintMode === "uv") {
      push("Печать", "Приладка UV", 1, "усл.", 2200);
      push("Печать", "UV-печать", layout.printAreaM2 * (colorsBack > 0 ? 2 : 1), "м²",
        +(2000 + (whiteInk ? 400 : 0) + pantoneCount * 200).toFixed(2));
    } else {
      push("Печать", "Цифровая печать", layout.printSheets * (colorsBack > 0 ? 2 : 1), "оттиск",
        +(28 + colors * 2 + (whiteInk ? 8 : 0)).toFixed(2));
    }
    if (optVarnish) push("Печать", "Защитный лак", layout.printAreaM2, "м²", 220);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Выборочный лак", layout.printAreaM2, "м²", 1200);
    }

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`, layout.printAreaM2, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }
    if (optSoftTouch && lamType !== "soft") {
      push("Постпечать", "Soft-touch покрытие", layout.printAreaM2, "м²", 340);
    }

    // Тиснение / конгрев / фольга
    if (optEmboss) {
      const cliche = Math.max(5000, embossAreaCm2 * 200);
      push("Постпечать", "Клише тиснения", 1, "шт", cliche);
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Тиснение (нанесение)", circulation, "оттиск", +(15 * premiumCoef).toFixed(2));
      if (optFoil) push("Постпечать", "Фольга", circulation * embossAreaCm2, "см²", 0.05);
    }
    if (optCongrev) {
      const cliche = Math.max(8000, embossAreaCm2 * 350);
      push("Постпечать", "Клише конгрева", 1, "шт", cliche);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1800);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", +(20 * premiumCoef).toFixed(2));
    }
    if (optFoil && !optEmboss) {
      push("Постпечать", "Фольгирование", circulation * embossAreaCm2, "см²", 0.06);
      push("Постпечать", "Приладка фольги", 1, "усл.", 1500);
    }

    // Высечка
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", Math.max(5500, contourLengthM * 30));
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      push("Постпечать", `Высечка (${shape}, ×${CONTOUR_COEF[contourComplex]})`,
        layout.printSheets, "лист", +(4 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));
      if (optDeflash)
        push("Постпечать", "Удаление облоя", circulation, "бирка",
          +(0.5 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));
    } else {
      push("Постпечать", "Резка готовой продукции", layout.printSheets, "лист", 1.5);
    }
    if (optRoundCorners)
      push("Постпечать", "Скругление углов", circulation, "бирка", 0.6);

    // Отверстия (если не входят в высечку)
    if (hasHole && !optDieCut) {
      push("Постпечать", "Приладка пробивки отверстий", 1, "усл.", 500);
      push("Постпечать", `Пробивка отверстий ⌀${holeDiameter} мм`,
        circulation * Math.max(1, holesPerItem), "отв.", 0.4);
    } else if (hasHole && optDieCut && holesPerItem > 1) {
      push("Постпечать", "Доп. отверстия (сверх высечки)",
        circulation * (holesPerItem - 1), "отв.", 0.4);
    }

    // Люверсы
    if (hasEyelet) {
      const eq = circulation * Math.max(1, eyeletsPerItem);
      push("Постпечать", `${eyelet.label} (материал)`, eq, "шт", eyelet.price);
      push("Постпечать", "Установка люверсов", eq, "шт", eyelet.install);
      push("Постпечать", "Приладка установки люверсов", 1, "усл.", 800);
    }

    // Шнурок / лента
    if (hasCord) {
      if (cord.mode === "per_m") {
        push("Постпечать", `${cord.label} (метраж)`, +(circulation * cordLengthM).toFixed(2), "пог.м", cord.price);
      } else {
        push("Постпечать", `${cord.label}`, circulation, "шт", cord.price);
      }
      push("Постпечать", "Установка шнурка / ленты", circulation, "шт", cordManual ? 4 : 2);
      push("Постпечать", "Приладка установки", 1, "усл.", 600);
    }

    // Персонализация
    if (optBarcode) push("Персонализация", "Штрихкод (нанесение)", circulation * Math.max(1, varElemsPerItem), "элемент", 4);
    if (optQR) push("Персонализация", "QR-код (нанесение)", circulation * Math.max(1, varElemsPerItem), "элемент", 6);
    if (optNumber) push("Персонализация", "Нумерация", circulation, "элемент", 3);
    if (optPersonalize) push("Персонализация", "Персонализация (ФИО / данные)", circulation * Math.max(1, varElemsPerItem), "элемент", 5);

    // Комплектовка
    if (perSet > 1) {
      push("Постпечать", `Комплектовка по ${perSet} шт`, setsCount, "комплект", 12);
    }

    // Контроль качества
    const qcCoef = (codeControl ? 1.6 : 1.0) * (variable ? 1.3 : 1.0) * (hasEyelet || hasCord ? 1.2 : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "бирка", +(0.6 * qcCoef).toFixed(2));
    if (codeControl)
      push("Логистика", "Контроль читаемости кодов", circulation, "бирка", 0.4);

    // Упаковка
    if (packKind !== "none") {
      const units = pack.perSet ? setsCount : circulation;
      const unit = pack.perSet ? "комплект" : "шт";
      push("Упаковка", `Упаковка: ${pack.label}`, units, unit, pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, kindsCount, variable, needDbCheck, optDieCut,
    material, layout, effectivePrintMode, colors, colorsBack, pantoneCount, whiteInk,
    optVarnish, optSpotVarnish, lamType, lam, optSoftTouch,
    optEmboss, optCongrev, optFoil, embossAreaCm2, premiumCoef,
    shape, contourComplex, contourLengthM, optDeflash, optRoundCorners,
    hasHole, holesPerItem, holeDiameter,
    hasEyelet, eyelet, eyeletsPerItem,
    hasCord, cord, cordLengthM, cordManual,
    optBarcode, optQR, optNumber, optPersonalize, varElemsPerItem,
    perSet, setsCount, codeControl, packKind, pack,
    circulation, hasDelivery, deliveryCost,
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
    s.push("Проверка макета");
    if (variable) s.push("Подготовка переменных данных");
    if (optDieCut) s.push("Подготовка штампа высечки");
    s.push("Раскладка", "Расчёт материала", "Резка закупочного на печатный");
    if (effectivePrintMode === "offset") s.push("Вывод печатных форм", "Приладка офсета", "Офсетная печать");
    else if (effectivePrintMode === "uv") s.push("UV-печать");
    else s.push("Цифровая печать");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optVarnish) s.push("Защитный лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optEmboss) s.push("Тиснение");
    if (optCongrev) s.push("Конгрев");
    if (optFoil) s.push("Фольгирование");
    if (optDieCut) s.push(`Высечка (${shape})`);
    else s.push("Резка готовой продукции");
    if (optDieCut && optDeflash) s.push("Удаление облоя");
    if (optRoundCorners) s.push("Скругление углов");
    if (hasHole && !optDieCut) s.push("Пробивка отверстий");
    if (hasEyelet) s.push("Установка люверсов");
    if (hasCord) s.push("Установка шнурка / ленты");
    if (optBarcode) s.push("Штрихкод");
    if (optQR) s.push("QR-код");
    if (optNumber) s.push("Нумерация");
    if (optPersonalize) s.push("Персонализация");
    if (perSet > 1) s.push(`Комплектовка по ${perSet} шт`);
    s.push("Контроль качества");
    if (codeControl) s.push("Контроль кодов");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, variable, optDieCut, effectivePrintMode, lamType, lam,
      optVarnish, optSpotVarnish, optEmboss, optCongrev, optFoil, shape, optDeflash, optRoundCorners,
      hasHole, hasEyelet, hasCord, optBarcode, optQR, optNumber, optPersonalize,
      perSet, codeControl, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Tags className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Бирка / Ярлык</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Форма, высечка, отверстия, люверсы, шнурки, тиснение, персонализация, комплектовка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 66</Badge>
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
                    <Label>Тип бирки</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина, мм</Label><Input type="number" value={itemW} onChange={(e) => setItemW(+e.target.value || 0)} /></div>
                  <div><Label>Высота, мм</Label><Input type="number" value={itemH} onChange={(e) => setItemH(+e.target.value || 0)} /></div>
                  <div>
                    <Label>Форма</Label>
                    <Select value={shape} onValueChange={(v) => setShape(v as Shape)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rect">Прямоугольная</SelectItem>
                        <SelectItem value="round">Круглая</SelectItem>
                        <SelectItem value="oval">Овальная</SelectItem>
                        <SelectItem value="shaped">Фигурная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div><Label>Видов</Label><Input type="number" min={1} value={kindsCount} onChange={(e) => setKindsCount(+e.target.value || 1)} /></div>
                  <div><Label>Бирок в комплекте</Label><Input type="number" min={1} value={perSet} onChange={(e) => setPerSet(+e.target.value || 1)} /></div>
                  <div><Label>Расстояние, мм</Label><Input type="number" min={0} value={gap} onChange={(e) => setGap(+e.target.value || 0)} /></div>
                  <div><Label>Вылеты, мм</Label><Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value || 0)} /></div>
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
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground self-end sm:col-span-2">
                    На лист: <b>{layout.up}</b> · печ. листов: <b>{layout.printSheets}</b> · закуп.: <b>{layout.purchaseSheets}</b>
                    {" · "}комплектов: <b>{setsCount}</b> · печать: <b>{effectivePrintMode}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "cutting", "hardware", "variable", "ship"]} className="w-full">
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
                            Площадь бирок: <b>{layout.areaM2.toFixed(3)} м²</b> ·
                            Площадь печати: <b>{layout.printAreaM2} м²</b> · Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>
                            {material.designer && <> · <Badge variant="outline" className="text-[10px]">дизайнерская</Badge></>}
                            {material.premium && <> · <Badge variant="outline" className="text-[10px]">premium</Badge></>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цветность лицо (CMYK)</Label><Input type="number" min={0} max={8} value={colors} onChange={(e) => setColors(+e.target.value || 0)} /></div>
                          <div><Label>Цветность оборот (0 = без)</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>
                          <div><Label>Pantone</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="white" checked={whiteInk} onCheckedChange={(v) => setWhiteInk(!!v)} />
                            <Label htmlFor="white" className="cursor-pointer">Белила</Label>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="varnish" checked={optVarnish} onCheckedChange={(v) => setOptVarnish(!!v)} />
                            <Label htmlFor="varnish" className="cursor-pointer">Защитный лак</Label>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="spot" checked={optSpotVarnish} onCheckedChange={(v) => setOptSpotVarnish(!!v)} />
                            <Label htmlFor="spot" className="cursor-pointer">Выборочный лак</Label>
                          </div>
                          <div>
                            <Label>Ламинация</Label>
                            <Select value={lamType} onValueChange={(v) => setLamType(v as LamType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/м²)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="soft" checked={optSoftTouch} onCheckedChange={(v) => setOptSoftTouch(!!v)} />
                            <Label htmlFor="soft" className="cursor-pointer">Доп. soft-touch покрытие</Label>
                          </div>
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

                    <AccordionItem value="cutting">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Форма и высечка
                          <Badge variant={optDieCut ? "default" : "outline"} className="text-[10px]">
                            {optDieCut ? `высечка ${shape}` : "только резка"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <Row label="Высечка штампом" checked={optDieCut} onChange={setOptDieCut} />
                          {optDieCut && (
                            <div className="sm:col-span-2">
                              <Label>Сложность контура</Label>
                              <Select value={contourComplex} onValueChange={(v) => setContourComplex(v as ContourComplex)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="simple">Простой (×1.0)</SelectItem>
                                  <SelectItem value="mid">Средний (×1.3)</SelectItem>
                                  <SelectItem value="hard">Сложный (×1.7)</SelectItem>
                                  <SelectItem value="fine">Мелкие элементы (×2.0)</SelectItem>
                                  <SelectItem value="extreme">Сверхсложный (×2.5)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                          <Row label="Скругление углов" checked={optRoundCorners} onChange={setOptRoundCorners} />
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Длина контура: <b>{contourLengthM}</b> пог.м
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="hardware">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Отверстия и фурнитура
                          <Badge variant={(hasHole || hasEyelet || hasCord) ? "default" : "outline"} className="text-[10px]">
                            {[hasHole && `отв×${holesPerItem}`, hasEyelet && `люверс×${eyeletsPerItem}`, hasCord && (cord.mode === "per_m" ? `${cord.label}` : cord.label)]
                              .filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <Row label="Отверстие" checked={hasHole} onChange={setHasHole} />
                          {hasHole && (<>
                            <div><Label>Отверстий на бирке</Label><Input type="number" min={1} value={holesPerItem} onChange={(e) => setHolesPerItem(+e.target.value || 1)} /></div>
                            <div><Label>Диаметр, мм</Label><Input type="number" min={1} value={holeDiameter} onChange={(e) => setHoleDiameter(+e.target.value || 1)} /></div>
                          </>)}
                          <Row label="Люверс" checked={hasEyelet} onChange={setHasEyelet} />
                          {hasEyelet && (<>
                            <div className="sm:col-span-2">
                              <Label>Тип люверса</Label>
                              <Select value={eyeletKey} onValueChange={setEyeletKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {EYELETS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label} ({fmtMoney(e.price)}+{fmtMoney(e.install)}/шт)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Люверсов на бирке</Label><Input type="number" min={1} value={eyeletsPerItem} onChange={(e) => setEyeletsPerItem(+e.target.value || 1)} /></div>
                          </>)}
                          <Row label="Шнурок / лента" checked={hasCord} onChange={setHasCord} />
                          {hasCord && (<>
                            <div className="sm:col-span-2">
                              <Label>Тип шнурка / ленты</Label>
                              <Select value={cordKey} onValueChange={setCordKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CORDS.map((c) => <SelectItem key={c.value} value={c.value}>
                                    {c.label} ({fmtMoney(c.price)}/{c.mode === "per_m" ? "пог.м" : "шт"})
                                  </SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {cord.mode === "per_m" && (
                              <div><Label>Длина на бирку, м</Label><Input type="number" min={0.05} step={0.05} value={cordLengthM} onChange={(e) => setCordLengthM(+e.target.value || 0.1)} /></div>
                            )}
                            <div className="flex items-end gap-2">
                              <Checkbox id="cord-manual" checked={cordManual} onCheckedChange={(v) => setCordManual(!!v)} />
                              <Label htmlFor="cord-manual" className="cursor-pointer">Ручное крепление</Label>
                            </div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="variable">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Персонализация
                          <Badge variant={variable ? "default" : "outline"} className="text-[10px]">
                            {[optQR && "QR", optBarcode && "штрихкод", optNumber && "нумерация", optPersonalize && "персонализация"]
                              .filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <Row label="QR-код" checked={optQR} onChange={setOptQR} />
                          <Row label="Штрихкод" checked={optBarcode} onChange={setOptBarcode} />
                          <Row label="Нумерация" checked={optNumber} onChange={setOptNumber} />
                          <Row label="Персонализация (ФИО / данные)" checked={optPersonalize} onChange={setOptPersonalize} />
                          <Row label="Проверка базы" checked={needDbCheck} onChange={setNeedDbCheck} />
                          {variable && (
                            <div className="flex items-end gap-2 sm:col-span-2">
                              <Label className="text-xs">Элементов на бирке</Label>
                              <Input className="h-8 w-24" type="number" min={1} value={varElemsPerItem} onChange={(e) => setVarElemsPerItem(+e.target.value || 1)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>7. Комплектовка, упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Упаковка</Label>
                            <Select value={packKind} onValueChange={(v) => setPackKind(v as PackKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PACKS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}{p.price ? ` · ${fmtMoney(p.price)}/${p.perSet ? "компл." : "ед"}` : ""}</SelectItem>)}
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
                <CardHeader><CardTitle className="text-sm">8. Итоговая стоимость</CardTitle></CardHeader>
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
                defaultName={`Бирка ${itemW}×${itemH} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-hangtag" />
          
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