import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Magnet } from "lucide-react";
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
 * Шаблон «Магнит» — Доработка 83.
 * Производственная архитектура: печать на бумаге/самоклейке/картоне →
 * ламинация → резка магнитного винила из рулона → кашировка → контурная
 * резка / высечка → выборка → упаковка. Прямая печать по магниту не
 * используется.
 */

type MagnetKind =
  | "rect" | "round" | "shape" | "card" | "calendar"
  | "vinyl" | "laminated" | "qr" | "premium";
const KINDS: { value: MagnetKind; label: string }[] = [
  { value: "rect", label: "Прямоугольный магнит" },
  { value: "round", label: "Круглый магнит" },
  { value: "shape", label: "Фигурный магнит" },
  { value: "card", label: "Магнит-визитка" },
  { value: "calendar", label: "Календарный магнит" },
  { value: "vinyl", label: "Магнит на магнитном виниле" },
  { value: "laminated", label: "Магнит с ламинацией" },
  { value: "qr", label: "Магнит с QR" },
  { value: "premium", label: "Premium магнит" },
];

type PrintMat = {
  value: string; label: string; density: number; pricePerSheet: number;
  sheetW: number; sheetH: number; pricePerM2: number;
};
const PRINT_MATERIALS: PrintMat[] = [
  { value: "coated-150", label: "Мелованная 150 г", density: 150, pricePerSheet: 95, sheetW: 720, sheetH: 1020, pricePerM2: 130 },
  { value: "coated-250", label: "Мелованный картон 250 г", density: 250, pricePerSheet: 145, sheetW: 720, sheetH: 1020, pricePerM2: 200 },
  { value: "coated-300", label: "Мелованный картон 300 г", density: 300, pricePerSheet: 175, sheetW: 720, sheetH: 1020, pricePerM2: 240 },
  { value: "selfadh", label: "Самоклейка глянец", density: 90, pricePerSheet: 220, sheetW: 700, sheetH: 1000, pricePerM2: 320 },
  { value: "film", label: "Плёнка PVC", density: 100, pricePerSheet: 280, sheetW: 700, sheetH: 1000, pricePerM2: 400 },
  { value: "photo", label: "Фотобумага 200 г", density: 200, pricePerSheet: 180, sheetW: 720, sheetH: 1020, pricePerM2: 250 },
  { value: "designer-250", label: "Дизайнерская 250 г", density: 250, pricePerSheet: 320, sheetW: 720, sheetH: 1020, pricePerM2: 440 },
];

type Vinyl = {
  value: string; label: string; thicknessMm: number;
  rollWmm: number; rollLm: number; pricePerRoll: number; pricePerM2: number; adhesive: boolean;
};
const VINYLS: Vinyl[] = [
  { value: "v04", label: "Магнитный винил 0.4 мм (клейкий)", thicknessMm: 0.4, rollWmm: 620, rollLm: 30, pricePerRoll: 21000, pricePerM2: 1130, adhesive: true },
  { value: "v07", label: "Магнитный винил 0.7 мм (клейкий)", thicknessMm: 0.7, rollWmm: 620, rollLm: 30, pricePerRoll: 30000, pricePerM2: 1615, adhesive: true },
  { value: "v10", label: "Магнитный винил 1.0 мм (клейкий)", thicknessMm: 1.0, rollWmm: 620, rollLm: 30, pricePerRoll: 42000, pricePerM2: 2260, adhesive: true },
];

type PrintMode = "auto" | "digital" | "offset" | "wide";
type LamKind = "none" | "matte" | "gloss" | "soft" | "anti";
type CutKind = "straight" | "contour" | "plotter" | "diecut" | "laser";
type Complexity = "simple" | "medium" | "complex" | "fine" | "ultra";
type PackKind = "none" | "pack" | "bag" | "indiv" | "box" | "set" | "shrink";

const LAM_PRICE: Record<LamKind, number> = { none: 0, matte: 22, gloss: 22, soft: 60, anti: 55 };
const COMPLEX_COEF: Record<Complexity, number> = { simple: 1, medium: 1.3, complex: 1.7, fine: 2, ultra: 2.5 };
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "pack", label: "Пачка по 100", price: 25, perPack: 100 },
  { value: "bag", label: "Пакет по 50", price: 18, perPack: 50 },
  { value: "indiv", label: "Индивидуальный пакет", price: 6, perPack: 1 },
  { value: "box", label: "Коробка", price: 220, perPack: 500 },
  { value: "set", label: "Набор магнитов", price: 35, perPack: 10 },
  { value: "shrink", label: "Термоусадка", price: 14, perPack: 50 },
];

export default function MagnetCalculator() {
  const { priceOp } = useHandbook();
  // 1. Основные
  const [name, setName] = useState("Расчёт магнита");
  const [kind, setKind] = useState<MagnetKind>("rect");
  const [circulation, setCirculation] = useState(500);
  const [finishedW, setFinishedW] = useState(90);
  const [finishedH, setFinishedH] = useState(55);
  const [shape, setShape] = useState<"rect" | "round" | "shape">("rect");
  const [designsCount, setDesignsCount] = useState(1);
  const [colorsFront, setColorsFront] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [twoSided, setTwoSided] = useState(false);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [leadDays, setLeadDays] = useState(3);
  const [margin, setMargin] = useState(50);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // 2. Печатный материал
  const [printMatKey, setPrintMatKey] = useState("coated-150");
  const [printWaste, setPrintWaste] = useState(0.1);

  // 3. Магнитный винил
  const [vinylKey, setVinylKey] = useState("v04");
  const [vinylAdhesive, setVinylAdhesive] = useState(true);
  const [vinylWaste, setVinylWaste] = useState(0.1);
  const [vinylSheetW, setVinylSheetW] = useState(620); // лист после резки
  const [vinylSheetH, setVinylSheetH] = useState(440);
  const [vinylCutPrice, setVinylCutPrice] = useState(15);
  const [vinylCutAuto, setVinylCutAuto] = useState(true);

  // 4. Печать
  const [platePrice, setPlatePrice] = useState(1000);
  const [printPricePerSheet, setPrintPricePerSheet] = useState(4.5);
  const [printPricePerM2, setPrintPricePerM2] = useState(450);
  const [minPrintCost, setMinPrintCost] = useState(0);

  // 5. Ламинация
  const [lamKind, setLamKind] = useState<LamKind>("none");
  const [lamTwoSide, setLamTwoSide] = useState(false);
  const [lamPrilad, setLamPrilad] = useState(800);

  // 6. Кашировка
  const [kashByArea, setKashByArea] = useState(true);
  const [kashAuto, setKashAuto] = useState(true);
  const [kashPricePerM2, setKashPricePerM2] = useState(180);
  const [kashPricePerSheet, setKashPricePerSheet] = useState(8);
  const [kashPrilad, setKashPrilad] = useState(1500);

  // 7. Резка / высечка
  const [cutKind, setCutKind] = useState<CutKind>("straight");
  const [complexity, setComplexity] = useState<Complexity>("simple");
  const [contourLenM, setContourLenM] = useState(0.3);
  const [contourPricePerM, setContourPricePerM] = useState(25);
  const [dieKnifeLenM, setDieKnifeLenM] = useState(0.3);
  const [dieKnifePricePerM, setDieKnifePricePerM] = useState(450);
  const [dieBasePrice, setDieBasePrice] = useState(2500);
  const [diePassPrice, setDiePassPrice] = useState(2.5);
  const [cutsCount, setCutsCount] = useState(4);
  const [straightCutPrice, setStraightCutPrice] = useState(0.8);
  const [pickPricePerItem, setPickPricePerItem] = useState(0.6);

  // 8. Персонализация
  const [hasQr, setHasQr] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(1);

  // 9. Упаковка
  const [packKind, setPackKind] = useState<PackKind>("pack");

  const printMat = useMemo(() => PRINT_MATERIALS.find((m) => m.value === printMatKey)!, [printMatKey]);
  const vinyl = useMemo(() => VINYLS.find((v) => v.value === vinylKey)!, [vinylKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Авто-логика
  useEffect(() => {
    if (kind === "shape") { setShape("shape"); setCutKind("contour"); }
    if (kind === "round") { setShape("round"); setCutKind("diecut"); }
    if (kind === "rect" || kind === "card" || kind === "calendar") { setShape("rect"); setCutKind("straight"); }
    if (kind === "laminated" && lamKind === "none") setLamKind("matte");
    if (kind === "qr") setHasQr(true);
    if (kind === "premium") {
      setVinylKey("v10");
      if (lamKind === "none") setLamKind("soft");
      setCutKind("contour");
      setPackKind("indiv");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Раскладка печати
  const printableW = printMat.sheetW - 20;
  const printableH = printMat.sheetH - 20;
  const itemW = Math.max(1, finishedW + 4);
  const itemH = Math.max(1, finishedH + 4);
  const itemsPerPrintSheet = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH]);

  const printNetSheets = useMemo(
    () => Math.ceil(circulation / itemsPerPrintSheet),
    [circulation, itemsPerPrintSheet]
  );

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (printMat.value === "film") return "wide";
    if (circulation * itemsPerPrintSheet >= 800) return "offset";
    return "digital";
  }, [printMode, printMat, circulation, itemsPerPrintSheet]);

  const setupSheets = effectivePrintMode === "offset" ? 150 + Math.ceil(printNetSheets * 0.01) : 10;
  const printSheets = Math.ceil((printNetSheets + setupSheets) * (1 + printWaste));
  const printSheetAreaM2 = (printMat.sheetW * printMat.sheetH) / 1_000_000;

  // Винил — расчёт по листам после нарезки рулона
  const vinylItemsPerSheet = useMemo(() => {
    const pW = vinylSheetW - 4;
    const pH = vinylSheetH - 4;
    const a = Math.floor(pW / itemW) * Math.floor(pH / itemH);
    const b = Math.floor(pW / itemH) * Math.floor(pH / itemW);
    return Math.max(1, a, b);
  }, [vinylSheetW, vinylSheetH, itemW, itemH]);
  const vinylSheetsNet = useMemo(
    () => Math.ceil(circulation / vinylItemsPerSheet),
    [circulation, vinylItemsPerSheet]
  );
  const vinylSheets = Math.ceil(vinylSheetsNet * (1 + vinylWaste));
  const vinylSheetAreaM2 = (vinylSheetW * vinylSheetH) / 1_000_000;
  // Сколько листов нарезается из одного рулона
  const sheetsPerRoll = Math.max(
    1,
    Math.floor((vinyl.rollLm * 1000) / vinylSheetH) * Math.floor(vinyl.rollWmm / vinylSheetW)
  );
  const rollsNeeded = Math.max(1, Math.ceil(vinylSheets / sheetsPerRoll));
  // Резов на каждый лист (приближённо)
  const cutsPerRollSheet = useMemo(() => {
    return Math.max(
      1,
      Math.floor((vinyl.rollLm * 1000) / vinylSheetH) - 1 +
        Math.floor(vinyl.rollWmm / vinylSheetW) - 1
    );
  }, [vinyl, vinylSheetH, vinylSheetW]);

  // Кашировка — по площади или листам
  const kashAreaM2 = vinylSheetAreaM2 * vinylSheets;

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, n: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name: n, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн магнита", Math.max(1, designsCount), "макет", 3000);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 800);
    push("Препресс", "Раскладка печати", 1, "усл.", 700);

    // 2. Печатный материал
    push("Материалы", printMat.label, printSheets, "лист", printMat.pricePerSheet);
    push("Препресс", "Резка закупочного листа", printSheets, "лист", 0.8);

    // 4. Печать (только по печатному материалу)
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    let printCost = 0;
    if (effectivePrintMode === "offset") {
      const forms = (colorsTotal + pantoneCount) * Math.max(1, designsCount);
      push("Печать", "Печатные формы", forms, "форма", platePrice);
      push("Печать", "Вывод форм", forms, "форма", 500);
      push("Печать", "Приладка офсета", 1, "ед.", 150 + Math.ceil(printNetSheets * 0.01));
      const off = printSheets * (twoSided ? 2 : 1);
      printCost = off * printPricePerSheet;
      push("Печать", `Офсетная печать${twoSided ? " (2 стороны)" : ""}`, off, "оттиск", printPricePerSheet);
    } else if (effectivePrintMode === "wide") {
      const areaM2 = +(printSheetAreaM2 * printSheets).toFixed(3);
      printCost = areaM2 * printPricePerM2;
      push("Печать", "Широкоформатная печать", areaM2, "м²", printPricePerM2);
    } else {
      const dig = printSheets * (twoSided ? 2 : 1);
      const dp = +(15 + colorsTotal * 1.5).toFixed(2);
      printCost = dig * dp;
      push("Печать", `Цифровая печать${twoSided ? " (2 стороны)" : ""}`, dig, "оттиск", dp);
    }
    if (minPrintCost > 0 && printCost < minPrintCost) {
      push("Печать", "Доплата до мин. стоимости печати", 1, "усл.", +(minPrintCost - printCost).toFixed(2));
    }

    // 5. Ламинация — только по печатному материалу
    if (lamKind !== "none") {
      const sides = lamTwoSide ? 2 : 1;
      const lamArea = +(printSheetAreaM2 * printSheets * sides).toFixed(3);
      push("Постпечать", "Приладка ламинации", 1, "усл.", lamPrilad);
      push("Постпечать", `Ламинация ${lamKind}${lamTwoSide ? " (2 стороны)" : ""}`, lamArea, "м²", LAM_PRICE[lamKind]);
    }

    // 3. Магнитный винил
    push("Материалы", `${vinyl.label} · рулон ${vinyl.rollWmm}×${vinyl.rollLm * 1000}`, rollsNeeded, "рулон", vinyl.pricePerRoll);
    // 10. Резка рулонного магнитного винила
    const totalVinylCuts = vinylSheets * cutsPerRollSheet;
    push("Постпечать", `Резка магнитного винила (${vinylCutAuto ? "авто" : "ручная"})`,
      totalVinylCuts, "рез", vinylCutPrice * (vinylCutAuto ? 1 : 1.4));

    // 6. Кашировка
    push("Постпечать", "Приладка кашировки", 1, "усл.", kashPrilad);
    if (kashByArea) {
      push("Постпечать", `Кашировка на магнит (${kashAuto ? "авто" : "ручная"}, по м²)`,
        +kashAreaM2.toFixed(3), "м²", kashPricePerM2 * (kashAuto ? 1 : 1.5));
    } else {
      push("Постпечать", `Кашировка на магнит (${kashAuto ? "авто" : "ручная"}, по листам)`,
        vinylSheets, "лист", kashPricePerSheet * (kashAuto ? 1 : 1.5));
    }

    // 7. Контурная резка / высечка
    const coef = COMPLEX_COEF[complexity];
    if (cutKind === "straight") {
      push("Постпечать", "Прямая резка готового магнита",
        vinylSheets * Math.max(1, cutsCount), "рез", straightCutPrice);
    } else if (cutKind === "contour" || cutKind === "plotter") {
      const meters = +(contourLenM * circulation * coef).toFixed(2);
      push("Постпечать", "Приладка контурной резки", 1, "усл.", 1500);
      push("Постпечать", `${cutKind === "plotter" ? "Плоттерная" : "Контурная"} резка (×${coef})`,
        meters, "пог.м", contourPricePerM);
    } else if (cutKind === "diecut") {
      const stampCost = +(dieKnifeLenM * dieKnifePricePerM + dieBasePrice).toFixed(2);
      push("Материалы", "Штамп высечки (ножи + основание)", 1, "шт", stampCost);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      push("Постпечать", "Высечка (проход)", vinylSheets, "лист", diePassPrice);
    } else if (cutKind === "laser") {
      const meters = +(contourLenM * circulation * coef).toFixed(2);
      push("Постпечать", "Приладка лазерной резки", 1, "усл.", 2000);
      push("Постпечать", `Лазерная резка (×${coef})`, meters, "пог.м", contourPricePerM * 1.5);
    }

    // 8. Выборка / удаление облоя (для фигурных)
    if (cutKind !== "straight") {
      push("Постпечать", `Выборка / удаление облоя (×${coef})`,
        circulation, "шт", +(pickPricePerItem * coef).toFixed(2));
    }

    // 9. Персонализация
    if (hasQr) {
      push("Постпечать", "Подготовка базы QR", 1, "усл.", 2000);
      push("Постпечать", "Печать QR-кодов", circulation, "шт", 1.2);
      push("Контроль", "Проверка считываемости QR", circulation, "шт", 0.2);
    }
    if (hasBarcode) {
      push("Постпечать", "Подготовка базы штрихкодов", 1, "усл.", 1500);
      push("Постпечать", "Печать штрихкодов", circulation, "шт", 0.9);
    }
    if (hasPersonalization) {
      push("Постпечать", "Подготовка базы персонализации", 1, "усл.", 3000);
      push("Постпечать", "Переменные данные",
        circulation * Math.max(1, variableElements), "элем.", 1.2);
    }

    // 10. Контроль качества
    const qcCoef = cutKind === "straight" ? 1.0 : 1.3;
    push("Контроль", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef.toFixed(2) + ")" : ""}`,
      circulation, "шт", +(0.5 * qcCoef).toFixed(2));

    // 11. Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, printMat, printSheets, printNetSheets, printSheetAreaM2,
    effectivePrintMode, colorsFront, colorsBack, twoSided, pantoneCount,
    platePrice, printPricePerSheet, printPricePerM2, minPrintCost,
    lamKind, lamTwoSide, lamPrilad,
    vinyl, rollsNeeded, vinylSheets, cutsPerRollSheet, vinylCutAuto, vinylCutPrice,
    kashByArea, kashAuto, kashAreaM2, kashPricePerM2, kashPricePerSheet, kashPrilad,
    cutKind, complexity, contourLenM, contourPricePerM,
    dieKnifeLenM, dieKnifePricePerM, dieBasePrice, diePassPrice,
    cutsCount, straightCutPrice, pickPricePerItem,
    hasQr, hasBarcode, hasPersonalization, variableElements,
    circulation, packKind, pack, hasDelivery, deliveryCost,
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
    s.push("Проверка макета", "Раскладка печати", "Расчёт печатного материала");
    if (effectivePrintMode === "offset") s.push("Вывод форм", "Приладка", "Печать (офсет)");
    else if (effectivePrintMode === "wide") s.push("Широкоформатная печать");
    else s.push("Цифровая печать");
    if (lamKind !== "none") s.push(`Ламинация ${lamKind}`);
    s.push("Расчёт магнитного винила", "Резка рулона магнитного винила", "Кашировка изображения на магнит");
    if (cutKind === "contour") s.push("Контурная резка");
    else if (cutKind === "plotter") s.push("Плоттерная резка");
    else if (cutKind === "diecut") s.push("Высечка штампом");
    else if (cutKind === "laser") s.push("Лазерная резка");
    else s.push("Прямая резка");
    if (cutKind !== "straight") s.push("Выборка / удаление облоя");
    if (hasQr) s.push("QR");
    if (hasBarcode) s.push("Штрихкод");
    if (hasPersonalization) s.push("Персонализация");
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, lamKind, cutKind, hasQr, hasBarcode, hasPersonalization, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Magnet className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Магнит</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Печать на бумаге/самоклейке/картоне → ламинация → кашировка на магнитный винил → резка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 83</Badge>
        </PageHeaderRow>
      </PageHeader>

      <PageMain>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Название расчёта</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Тип магнита</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as MagnetKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Тираж</Label>
                    <Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} />
                  </div>
                  <div><Label>Готовый Ш, мм</Label>
                    <Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} />
                  </div>
                  <div><Label>Готовый В, мм</Label>
                    <Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} />
                  </div>
                  <div>
                    <Label>Форма</Label>
                    <Select value={shape} onValueChange={(v) => setShape(v as typeof shape)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rect">Прямоугольная</SelectItem>
                        <SelectItem value="round">Круглая</SelectItem>
                        <SelectItem value="shape">Фигурная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Макетов</Label>
                    <Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} />
                  </div>
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                        <SelectItem value="wide">Широкоформат</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="two-sided" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two-sided" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div><Label>Цветность лицо</Label>
                    <Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} />
                  </div>
                  {twoSided && (
                    <div><Label>Цветность оборот</Label>
                      <Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} />
                    </div>
                  )}
                  <div><Label>Pantone красок</Label>
                    <Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} />
                  </div>
                  <div><Label>Срок, дней</Label>
                    <Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label>
                    <Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} />
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    Печ. на лист: <b>{itemsPerPrintSheet}</b> · печ. листов: <b>{printSheets}</b> · режим: <b>{effectivePrintMode}</b>
                    {" · "}винил листов: <b>{vinylSheets}</b> · рулонов: <b>{rollsNeeded}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["pmat", "vinyl", "print", "lam", "kash", "cut", "pers", "pack"]} className="w-full">
                    <AccordionItem value="pmat">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Печатный материал
                          <Badge variant="secondary" className="text-[10px]">{printMat.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип материала</Label>
                            <Select value={printMatKey} onValueChange={setPrintMatKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PRINT_MATERIALS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label} · {fmtMoney(m.pricePerSheet)}/лист · {m.sheetW}×{m.sheetH}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Коэф. отходов</Label>
                            <Input type="number" step="0.01" value={printWaste}
                              onChange={(e) => setPrintWaste(+e.target.value || 0)} />
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            Плотность <b>{printMat.density}</b> г/м² · м² <b>{fmtMoney(printMat.pricePerM2)}</b>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="vinyl">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Магнитный винил
                          <Badge variant="secondary" className="text-[10px]">{vinyl.thicknessMm} мм</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип магнитного винила</Label>
                            <Select value={vinylKey} onValueChange={setVinylKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {VINYLS.map((v) => (
                                  <SelectItem key={v.value} value={v.value}>
                                    {v.label} · рулон {v.rollWmm}×{v.rollLm * 1000} · {fmtMoney(v.pricePerRoll)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Row label="Клейкий слой" checked={vinylAdhesive} onChange={setVinylAdhesive} />
                          <div><Label>Коэф. отходов</Label>
                            <Input type="number" step="0.01" value={vinylWaste}
                              onChange={(e) => setVinylWaste(+e.target.value || 0)} />
                          </div>
                          <div><Label>Лист винила Ш, мм</Label>
                            <Input type="number" value={vinylSheetW}
                              onChange={(e) => setVinylSheetW(+e.target.value || 0)} />
                          </div>
                          <div><Label>Лист винила В, мм</Label>
                            <Input type="number" value={vinylSheetH}
                              onChange={(e) => setVinylSheetH(+e.target.value || 0)} />
                          </div>
                          <Row label="Автоматическая резка рулона" checked={vinylCutAuto} onChange={setVinylCutAuto} />
                          <div><Label>Цена реза рулона</Label>
                            <Input type="number" step="0.1" value={vinylCutPrice}
                              onChange={(e) => setVinylCutPrice(+e.target.value || 0)} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>4. Печать (только по печатному материалу)</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цена формы</Label>
                            <Input type="number" value={platePrice} onChange={(e) => setPlatePrice(+e.target.value || 0)} />
                          </div>
                          <div><Label>Офсет: цена/лист</Label>
                            <Input type="number" step="0.1" value={printPricePerSheet}
                              onChange={(e) => setPrintPricePerSheet(+e.target.value || 0)} />
                          </div>
                          <div><Label>Широкоформат: цена/м²</Label>
                            <Input type="number" value={printPricePerM2}
                              onChange={(e) => setPrintPricePerM2(+e.target.value || 0)} />
                          </div>
                          <div><Label>Мин. стоимость печати</Label>
                            <Input type="number" value={minPrintCost}
                              onChange={(e) => setMinPrintCost(+e.target.value || 0)} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="lam">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Ламинация
                          {lamKind !== "none" && <Badge variant="outline" className="text-[10px]">{lamKind}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Тип ламинации</Label>
                            <Select value={lamKind} onValueChange={(v) => setLamKind(v as LamKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Без ламинации</SelectItem>
                                <SelectItem value="matte">Матовая</SelectItem>
                                <SelectItem value="gloss">Глянцевая</SelectItem>
                                <SelectItem value="soft">Soft-touch</SelectItem>
                                <SelectItem value="anti">Anti-scratch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {lamKind !== "none" && (<>
                            <Row label="С двух сторон" checked={lamTwoSide} onChange={setLamTwoSide} />
                            <div><Label>Приладка ламинации</Label>
                              <Input type="number" value={lamPrilad}
                                onChange={(e) => setLamPrilad(+e.target.value || 0)} />
                            </div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="kash">
                      <AccordionTrigger>6. Кашировка / накатка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Расчёт по площади (м²)" checked={kashByArea} onChange={setKashByArea} />
                          <Row label="Автоматическая кашировка" checked={kashAuto} onChange={setKashAuto} />
                          {kashByArea ? (
                            <div><Label>Цена кашировки за м²</Label>
                              <Input type="number" value={kashPricePerM2}
                                onChange={(e) => setKashPricePerM2(+e.target.value || 0)} />
                            </div>
                          ) : (
                            <div><Label>Цена кашировки за лист</Label>
                              <Input type="number" step="0.1" value={kashPricePerSheet}
                                onChange={(e) => setKashPricePerSheet(+e.target.value || 0)} />
                            </div>
                          )}
                          <div><Label>Приладка</Label>
                            <Input type="number" value={kashPrilad}
                              onChange={(e) => setKashPrilad(+e.target.value || 0)} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="cut">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">7. Резка / высечка
                          <Badge variant="outline" className="text-[10px]">{cutKind}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Тип резки</Label>
                            <Select value={cutKind} onValueChange={(v) => setCutKind(v as CutKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="straight">Прямая резка</SelectItem>
                                <SelectItem value="contour">Контурная</SelectItem>
                                <SelectItem value="plotter">Плоттерная</SelectItem>
                                <SelectItem value="diecut">Высечка штампом</SelectItem>
                                <SelectItem value="laser">Лазерная</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Сложность контура</Label>
                            <Select value={complexity} onValueChange={(v) => setComplexity(v as Complexity)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="simple">Простой ×1</SelectItem>
                                <SelectItem value="medium">Средний ×1.3</SelectItem>
                                <SelectItem value="complex">Сложный ×1.7</SelectItem>
                                <SelectItem value="fine">Мелкие элементы ×2</SelectItem>
                                <SelectItem value="ultra">Сверхсложный ×2.5</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {cutKind === "straight" && (<>
                            <div><Label>Резов на лист</Label>
                              <Input type="number" min={1} value={cutsCount}
                                onChange={(e) => setCutsCount(+e.target.value || 1)} />
                            </div>
                            <div><Label>Цена реза</Label>
                              <Input type="number" step="0.1" value={straightCutPrice}
                                onChange={(e) => setStraightCutPrice(+e.target.value || 0)} />
                            </div>
                          </>)}
                          {(cutKind === "contour" || cutKind === "plotter" || cutKind === "laser") && (<>
                            <div><Label>Длина контура, м (на изделие)</Label>
                              <Input type="number" step="0.01" value={contourLenM}
                                onChange={(e) => setContourLenM(+e.target.value || 0)} />
                            </div>
                            <div><Label>Цена за пог.м</Label>
                              <Input type="number" value={contourPricePerM}
                                onChange={(e) => setContourPricePerM(+e.target.value || 0)} />
                            </div>
                          </>)}
                          {cutKind === "diecut" && (<>
                            <div><Label>Длина ножей, м</Label>
                              <Input type="number" step="0.01" value={dieKnifeLenM}
                                onChange={(e) => setDieKnifeLenM(+e.target.value || 0)} />
                            </div>
                            <div><Label>Цена за метр ножа</Label>
                              <Input type="number" value={dieKnifePricePerM}
                                onChange={(e) => setDieKnifePricePerM(+e.target.value || 0)} />
                            </div>
                            <div><Label>Цена основания штампа</Label>
                              <Input type="number" value={dieBasePrice}
                                onChange={(e) => setDieBasePrice(+e.target.value || 0)} />
                            </div>
                            <div><Label>Цена прохода (за лист)</Label>
                              <Input type="number" step="0.1" value={diePassPrice}
                                onChange={(e) => setDiePassPrice(+e.target.value || 0)} />
                            </div>
                          </>)}
                          {cutKind !== "straight" && (
                            <div><Label>Цена выборки облоя (за шт)</Label>
                              <Input type="number" step="0.1" value={pickPricePerItem}
                                onChange={(e) => setPickPricePerItem(+e.target.value || 0)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="pers">
                      <AccordionTrigger>8. Персонализация</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
                          <Row label="Штрихкод" checked={hasBarcode} onChange={setHasBarcode} />
                          <Row label="Переменные данные" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (
                            <div><Label>Переменных элементов</Label>
                              <Input type="number" min={1} value={variableElements}
                                onChange={(e) => setVariableElements(+e.target.value || 1)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="pack">
                      <AccordionTrigger>9. Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Упаковка</Label>
                            <Select value={packKind} onValueChange={(v) => setPackKind(v as PackKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PACKS.map((p) => <SelectItem key={p.value} value={p.value}>
                                  {p.label}{p.price ? ` · ${fmtMoney(p.price)}/ед.` : ""}
                                </SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="delivery" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                            <Label htmlFor="delivery" className="cursor-pointer">Включить доставку</Label>
                          </div>
                          {hasDelivery && (
                            <div><Label>Стоимость доставки</Label>
                              <Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(+e.target.value || 0)} />
                            </div>
                          )}
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
                <CardHeader><CardTitle className="text-sm">Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                  <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="magnet"
                defaultName={`${name} · ${KINDS.find((k) => k.value === kind)?.label || ""} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-magnet" />
          
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

function Row({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="flex-1 min-w-0">{label}</span>
    </div>
  );
}