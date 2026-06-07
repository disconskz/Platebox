import { useEffect, useMemo, useState } from "react";
import { SpecTable } from "@/components/calc/SpecTable";
import { Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
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
 * Шаблон «Этикетка» — самоклеящаяся продукция с акцентом на рулон,
 * штрихкоды, переменные данные, партии, контроль. Доработка 65.
 */

type Kind =
  | "product" | "food" | "cosmetic" | "technical" | "marking"
  | "barcode" | "qr" | "numbered" | "transparent" | "film"
  | "kraft" | "waterproof" | "thermal" | "thermotransfer"
  | "shaped" | "roll" | "sheet" | "premium";
const KINDS: { value: Kind; label: string }[] = [
  { value: "product", label: "Товарная" },
  { value: "food", label: "Пищевая" },
  { value: "cosmetic", label: "Косметическая" },
  { value: "technical", label: "Техническая" },
  { value: "marking", label: "Маркировочная" },
  { value: "barcode", label: "Со штрихкодом" },
  { value: "qr", label: "С QR-кодом" },
  { value: "numbered", label: "С нумерацией" },
  { value: "transparent", label: "Прозрачная" },
  { value: "film", label: "Плёночная" },
  { value: "kraft", label: "Крафт" },
  { value: "waterproof", label: "Влагостойкая" },
  { value: "thermal", label: "Термоэтикетка" },
  { value: "thermotransfer", label: "Термотрансферная" },
  { value: "shaped", label: "Фигурная" },
  { value: "roll", label: "Рулонная" },
  { value: "sheet", label: "Листовая" },
  { value: "premium", label: "Premium" },
];

type Material = {
  value: string; label: string; type: string; thickness: number;
  sheetW: number; sheetH: number; rollW: number;
  pricePerM2: number; pricePerLm: number;
  waterproof?: boolean; freezeproof?: boolean; transparent?: boolean; premium?: boolean;
};
const MATERIALS: Material[] = [
  { value: "paper-semigloss", label: "Самокл. бумага semi-gloss", type: "paper", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 360, pricePerLm: 130 },
  { value: "paper-mat", label: "Самокл. бумага матовая", type: "paper", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 380, pricePerLm: 140 },
  { value: "kraft", label: "Крафт-самоклейка", type: "kraft", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 460, pricePerLm: 170 },
  { value: "pp-white", label: "ПП плёнка белая глянц.", type: "film", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 720, pricePerLm: 260, waterproof: true },
  { value: "pp-mat", label: "ПП плёнка матовая", type: "film", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 760, pricePerLm: 275, waterproof: true },
  { value: "pp-clear", label: "ПП плёнка прозрачная", type: "film", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 820, pricePerLm: 295, waterproof: true, transparent: true },
  { value: "synthetic", label: "Синтетическая самоклейка", type: "synthetic", thickness: 100, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 980, pricePerLm: 360, waterproof: true, freezeproof: true, premium: true },
  { value: "thermal", label: "Термобумага", type: "thermal", thickness: 70, sheetW: 320, sheetH: 450, rollW: 58, pricePerM2: 280, pricePerLm: 25 },
  { value: "thermotransfer", label: "Термотрансферная бумага", type: "thermotransfer", thickness: 75, sheetW: 320, sheetH: 450, rollW: 110, pricePerM2: 320, pricePerLm: 45 },
  { value: "metallized", label: "Металлизированная плёнка", type: "film", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 1700, pricePerLm: 620, premium: true },
  { value: "gold", label: "Gold material", type: "film", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 1750, pricePerLm: 640, premium: true },
  { value: "silver", label: "Silver material", type: "film", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 1700, pricePerLm: 620, premium: true },
];

type Shape = "rect" | "round" | "oval" | "shaped";
type Form = "sheet" | "roll";
type PrintMode = "auto" | "digital" | "offset" | "uv" | "roll";
type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 180 },
  { value: "gloss", label: "Глянцевая", price: 160 },
  { value: "soft", label: "Soft-touch", price: 340 },
];

type ContourComplex = "simple" | "mid" | "hard" | "fine" | "extreme";
const CONTOUR_COEF: Record<ContourComplex, number> = {
  simple: 1.0, mid: 1.3, hard: 1.7, fine: 2.0, extreme: 2.5,
};

type WindDir = "out" | "in";
type PackKind = "none" | "stack" | "rolls" | "bag" | "box";
const PACKS: { value: PackKind; label: string; price: number }[] = [
  { value: "none", label: "Без упаковки", price: 0 },
  { value: "stack", label: "В пачки", price: 0.4 },
  { value: "rolls", label: "По рулонам", price: 25 },
  { value: "bag", label: "Индивидуальный пакет", price: 3 },
  { value: "box", label: "Коробка", price: 35 },
];

export default function LabelCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [circulation, setCirculation] = useState(5000);
  const [designsCount, setDesignsCount] = useState(1);
  const [kindsCount, setKindsCount] = useState(1);
  const [itemW, setItemW] = useState(60);
  const [itemH, setItemH] = useState(40);
  const [shape, setShape] = useState<Shape>("rect");
  const [kind, setKind] = useState<Kind>("product");
  const [form, setForm] = useState<Form>("roll");
  const [gap, setGap] = useState(3);
  const [bleed, setBleed] = useState(2);
  const [leadDays, setLeadDays] = useState(4);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(40);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("paper-semigloss");
  const [removableGlue, setRemovableGlue] = useState(false);
  const [needWaterproof, setNeedWaterproof] = useState(false);
  const [needFreezeproof, setNeedFreezeproof] = useState(false);

  // Печать
  const [colors, setColors] = useState(4);
  const [whiteInk, setWhiteInk] = useState(false);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);

  // Переменные
  const [optBarcode, setOptBarcode] = useState(false);
  const [optQR, setOptQR] = useState(false);
  const [optNumber, setOptNumber] = useState(false);
  const [optProdDate, setOptProdDate] = useState(false);
  const [optExpDate, setOptExpDate] = useState(false);
  const [optBatch, setOptBatch] = useState(false);
  const [optSerial, setOptSerial] = useState(false);
  const [varElemsPerItem, setVarElemsPerItem] = useState(1);
  const [needDbCheck, setNeedDbCheck] = useState(true);

  // Резка / высечка
  const [contourCut, setContourCut] = useState(true);
  const [contourComplex, setContourComplex] = useState<ContourComplex>("simple");
  const [optDieCut, setOptDieCut] = useState(true);
  const [optDeflash, setOptDeflash] = useState(true);
  const [optWeeding, setOptWeeding] = useState(true);
  const [optNotch, setOptNotch] = useState(false);
  const [notchLines, setNotchLines] = useState(1);

  // Постпечать
  const [lamType, setLamType] = useState<LamType>("none");

  // Рулон / намотка
  const [labelsPerRoll, setLabelsPerRoll] = useState(1000);
  const [coreDiameterMm, setCoreDiameterMm] = useState(40);
  const [windDir, setWindDir] = useState<WindDir>("out");
  const [streams, setStreams] = useState(1);

  // Контроль и упаковка
  const [packKind, setPackKind] = useState<PackKind>("rolls");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика
  useEffect(() => {
    if (kind === "roll" || kind === "thermal" || kind === "thermotransfer") setForm("roll");
    if (kind === "sheet") setForm("sheet");
    if (kind === "thermal") setMaterialKey("thermal");
    if (kind === "thermotransfer") setMaterialKey("thermotransfer");
    if (kind === "transparent") setMaterialKey("pp-clear");
    if (kind === "kraft") setMaterialKey("kraft");
    if (kind === "film") setMaterialKey("pp-white");
    if (kind === "waterproof") { setMaterialKey("pp-white"); setNeedWaterproof(true); }
    if (kind === "shaped") { setShape("shaped"); setContourCut(true); }
    if (kind === "barcode") setOptBarcode(true);
    if (kind === "qr") setOptQR(true);
    if (kind === "numbered") setOptNumber(true);
    if (kind === "premium") {
      setMaterialKey((m) => (MATERIALS.find((x) => x.value === m)?.premium ? m : "synthetic"));
      if (lamType === "none") setLamType("soft");
      setOptSpotVarnish(true);
      if (packKind === "none" || packKind === "stack") setPackKind("bag");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => { if (optDieCut && !optDeflash) setOptDeflash(true); }, [optDieCut, optDeflash]);
  useEffect(() => { if (material.transparent && !whiteInk) setWhiteInk(true); }, [material.transparent]); // eslint-disable-line
  useEffect(() => { if ((optBarcode || optQR) && !needDbCheck) setNeedDbCheck(true); }, [optBarcode, optQR]); // eslint-disable-line

  const variable = optBarcode || optQR || optNumber || optProdDate || optExpDate || optBatch || optSerial;
  const codeControl = optBarcode || optQR;

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (form === "roll") return "roll";
    if (material.type === "film" || material.transparent) return "uv";
    if (circulation >= 5000 && !variable) return "offset";
    return "digital";
  }, [printMode, form, material, circulation, variable]);

  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.1;
    if (lamType === "soft") k += 0.1;
    if (kind === "premium") k += 0.15;
    if (contourComplex === "hard") k += 0.1;
    if (contourComplex === "fine") k += 0.15;
    if (contourComplex === "extreme") k += 0.25;
    if (needWaterproof) k += 0.05;
    if (needFreezeproof) k += 0.05;
    return +k.toFixed(2);
  }, [material, lamType, kind, contourComplex, needWaterproof, needFreezeproof]);

  // Раскладка
  const layout = useMemo(() => {
    const wCell = itemW + gap + 2 * bleed;
    const hCell = itemH + gap + 2 * bleed;
    const areaItemM2 = (itemW * itemH) / 1_000_000;
    const totalAreaM2 = circulation * areaItemM2;

    if (form === "roll") {
      const useRollW = material.rollW;
      const acrossMax = Math.max(1, Math.floor((useRollW - 6) / wCell));
      const across = Math.min(acrossMax, Math.max(1, streams));
      const linearMmTotal = (hCell * circulation) / across;
      const totalLm = linearMmTotal / 1000;
      const setupLm = 8 + Math.ceil(totalLm * 0.02);
      const rolls = Math.max(1, Math.ceil(circulation / Math.max(50, labelsPerRoll)));
      return {
        form: "roll" as const,
        up: across,
        sheets: 0,
        printSheets: 0,
        areaM2: totalAreaM2,
        linearM: +(totalLm + setupLm).toFixed(2),
        netLinearM: +totalLm.toFixed(2),
        rolls,
        printAreaM2: +((totalLm + setupLm) * (useRollW / 1000)).toFixed(3),
      };
    }

    const sw = material.sheetW, sh = material.sheetH;
    const a = Math.floor(sw / wCell) * Math.floor(sh / hCell);
    const b = Math.floor(sw / hCell) * Math.floor(sh / wCell);
    const up = Math.max(1, a, b);
    const net = Math.ceil(circulation / up);
    const setup =
      effectivePrintMode === "offset" ? 200 :
      effectivePrintMode === "uv" ? 20 : 10;
    const printSheets = net + setup;
    return {
      form: "sheet" as const,
      up,
      sheets: net,
      printSheets,
      areaM2: totalAreaM2,
      linearM: 0,
      netLinearM: 0,
      rolls: 0,
      printAreaM2: +((printSheets * sw * sh) / 1_000_000).toFixed(3),
    };
  }, [material, itemW, itemH, gap, bleed, circulation, form, streams, labelsPerRoll, effectivePrintMode]);

  const contourLengthM = useMemo(() => {
    let perItemMm = 0;
    if (shape === "round") perItemMm = Math.PI * itemW;
    else if (shape === "oval") perItemMm = Math.PI * ((itemW + itemH) / 2);
    else if (shape === "shaped") perItemMm = 2 * (itemW + itemH) * 1.4;
    else perItemMm = 2 * (itemW + itemH);
    return +((perItemMm * circulation) / 1000).toFixed(1);
  }, [shape, itemW, itemH, circulation]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number; details?: { label: string; value: string }[] }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number, details?: { label: string; value: string }[]) =>
      out.push({ stage, name, qty, unit, price, total: qty * price, details });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    if (hasDesign) push("Препресс", "Дизайн этикетки", Math.max(1, designsCount), "макет", 4000);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 600);
    if (kindsCount > 1) push("Препресс", `Сведение видов (${kindsCount} шт)`, kindsCount, "вид", 400);
    if (variable) {
      push("Препресс", "Подготовка базы переменных данных", 1, "усл.", 3000);
      if (needDbCheck) push("Препресс", "Проверка базы", 1, "усл.", 1500);
    }
    if (contourCut || optDieCut) push("Препресс", "Подготовка контура реза / высечки", Math.max(1, designsCount), "макет", 1000);
    push("Препресс", "Раскладка", 1, "усл.", 700);

    // Материал (с коэф. отходов)
    const wasteCoef = (contourCut || optDieCut) ? 1.1 : 1.05;
    if (layout.form === "roll") {
      push("Материалы", `${material.label} (рулон, ${material.rollW} мм)`,
        +(layout.linearM * wasteCoef).toFixed(2), "пог.м", material.pricePerLm);
    } else {
      push("Материалы", `${material.label} (лист ${material.sheetW}×${material.sheetH})`,
        layout.printSheets, "лист", +((material.pricePerM2 * material.sheetW * material.sheetH) / 1_000_000).toFixed(2));
    }
    if (removableGlue) push("Материалы", "Надбавка за съёмный клей", +layout.areaM2.toFixed(3), "м²", 50);
    if (needWaterproof && !material.waterproof)
      push("Материалы", "Доп. защитный лак (влагостойкость)", +layout.printAreaM2.toFixed(3), "м²", 180);
    if (needFreezeproof && !material.freezeproof)
      push("Материалы", "Надбавка за морозостойкость", +layout.areaM2.toFixed(3), "м²", 80);

    // Печать
    const printArea = layout.printAreaM2;
    if (effectivePrintMode === "roll") {
      push("Печать", "Приладка рулонной печати", 1, "усл.", 2500);
      push("Печать", "Печать (рулон)", layout.linearM, "пог.м",
        +(40 + colors * 5 + (whiteInk ? 16 : 0) + pantoneCount * 10).toFixed(2));
    } else if (effectivePrintMode === "uv") {
      push("Печать", "Приладка UV", 1, "усл.", 1800);
      push("Печать", "UV-печать", printArea, "м²",
        +(2000 + (whiteInk ? 400 : 0) + pantoneCount * 200).toFixed(2));
    } else if (effectivePrintMode === "offset") {
      const forms = colors + pantoneCount;
      push("Печать", "Печатные формы", forms, "форма", 1500);
      push("Печать", "Приладка офсета", 1, "усл.", 2500);
      push("Печать", "Офсетная печать", layout.printSheets, "лист", 5.5);
    } else {
      push("Печать", "Цифровая печать (лист)", layout.printSheets, "лист",
        +(26 + colors * 2 + (whiteInk ? 8 : 0)).toFixed(2));
    }
    if (optVarnish) push("Печать", "Защитный лак", printArea, "м²", 250);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Выборочный лак", printArea, "м²", 1200);
    }

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`, printArea, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }

    // Переменные данные (нанесение)
    if (optBarcode) {
      push("Персонализация", "Штрихкод (нанесение)", circulation * Math.max(1, varElemsPerItem), "элемент", 4);
    }
    if (optQR) {
      push("Персонализация", "QR-код (нанесение)", circulation * Math.max(1, varElemsPerItem), "элемент", 6);
    }
    if (optNumber) {
      push("Персонализация", "Нумерация", circulation, "элемент", 3);
    }
    if (optProdDate) push("Персонализация", "Дата производства", circulation, "элемент", 2);
    if (optExpDate) push("Персонализация", "Срок годности", circulation, "элемент", 2);
    if (optBatch) push("Персонализация", "Номер партии", circulation, "элемент", 2);
    if (optSerial) push("Персонализация", "Серийный номер", circulation, "элемент", 3);

    // Высечка
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", 5500);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      if (layout.form === "sheet")
        push("Постпечать", "Высечка", layout.printSheets, "лист", 4);
      else
        push("Постпечать", "Рулонная высечка", layout.linearM, "пог.м", 6);
    }

    // Контурная резка (плоттер)
    if (contourCut) {
      push("Постпечать", "Приладка плоттера", 1, "усл.", 1200);
      push("Постпечать", `Контурная резка (${contourComplex} ×${CONTOUR_COEF[contourComplex]})`,
        contourLengthM, "пог.м",
        +(7 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));
    }

    // Удаление облоя / выборка
    if (optDeflash && (optDieCut || contourCut))
      push("Постпечать", "Удаление облоя",
        circulation, "этикетка", +(0.5 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));
    if (optWeeding)
      push("Постпечать", "Выборка лишнего материала",
        circulation, "этикетка", +(0.8 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));

    // Надсечка
    if (optNotch) {
      const units = layout.form === "sheet" ? layout.printSheets : layout.linearM;
      const unit = layout.form === "sheet" ? "лист" : "пог.м";
      push("Постпечать", "Надсечка", notchLines * units, unit, 0.4);
    }

    // Резка / намотка
    if (layout.form === "sheet") {
      push("Постпечать", "Резка на листы", layout.printSheets, "лист", 1.0);
    } else {
      push("Постпечать", "Намотка в рулон", layout.rolls, "рулон", 320);
      push("Постпечать", `Втулка ⌀${coreDiameterMm} мм`, layout.rolls, "шт", coreDiameterMm >= 76 ? 140 : 80);
      if (streams > 1) push("Постпечать", `Разрезка на ${streams} ручьёв`, layout.linearM, "пог.м", 2.5 * streams);
    }

    // Контроль качества
    const qcCoef = (codeControl ? 1.6 : 1.0) * (variable ? 1.3 : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "этикетка", +(0.5 * qcCoef).toFixed(2));
    if (codeControl)
      push("Логистика", "Контроль читаемости кодов", circulation, "этикетка", 0.4);

    // Упаковка
    if (packKind === "rolls") {
      push("Упаковка", "Упаковка по рулонам", layout.rolls > 0 ? layout.rolls : 1, "рулон", pack.price);
    } else if (packKind !== "none") {
      push("Упаковка", `Упаковка: ${pack.label}`, circulation, "шт", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [hasDesign, designsCount, kindsCount, variable, needDbCheck, contourCut, optDieCut,
      layout, material, removableGlue, needWaterproof, needFreezeproof,
      effectivePrintMode, colors, whiteInk, pantoneCount, optVarnish, optSpotVarnish,
      lamType, lam, optBarcode, optQR, optNumber, optProdDate, optExpDate, optBatch, optSerial,
      varElemsPerItem, contourComplex, contourLengthM, premiumCoef,
      optDeflash, optWeeding, optNotch, notchLines, streams, coreDiameterMm,
      codeControl, packKind, pack, circulation, hasDelivery, deliveryCost]);

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
    if (contourCut || optDieCut) s.push("Подготовка контура резки / высечки");
    s.push("Раскладка", "Расчёт материала");
    s.push(
      effectivePrintMode === "roll" ? "Печать (рулон)" :
      effectivePrintMode === "uv" ? "UV-печать" :
      effectivePrintMode === "offset" ? "Офсетная печать" :
      "Цифровая печать"
    );
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optVarnish) s.push("Защитный лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optBarcode) s.push("Штрихкод");
    if (optQR) s.push("QR-код");
    if (optNumber) s.push("Нумерация");
    if (optProdDate || optExpDate || optBatch || optSerial) s.push("Переменные данные (дата/партия)");
    if (optDieCut) s.push("Высечка");
    if (contourCut) s.push(`Контурная резка (${contourComplex})`);
    if (optDeflash) s.push("Удаление облоя");
    if (optWeeding) s.push("Выборка");
    if (optNotch) s.push("Надсечка");
    if (layout.form === "sheet") s.push("Резка на листы");
    else s.push("Намотка в рулон");
    s.push("Контроль качества");
    if (codeControl) s.push("Контроль кодов");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, variable, contourCut, optDieCut, effectivePrintMode, lamType, lam,
      optVarnish, optSpotVarnish, optBarcode, optQR, optNumber, optProdDate, optExpDate, optBatch, optSerial,
      contourComplex, optDeflash, optWeeding, optNotch, layout.form, codeControl, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Tag className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Этикетка</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Лист / рулон, штрихкоды, переменные данные, высечка, намотка, контроль партии.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 65</Badge>
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
                    <Label>Тип этикетки</Label>
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
                  <div>
                    <Label>Лист / рулон</Label>
                    <Select value={form} onValueChange={(v) => setForm(v as Form)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sheet">Лист</SelectItem>
                        <SelectItem value="roll">Рулон</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div><Label>Видов</Label><Input type="number" min={1} value={kindsCount} onChange={(e) => setKindsCount(+e.target.value || 1)} /></div>
                  <div><Label>Расстояние между, мм</Label><Input type="number" min={0} value={gap} onChange={(e) => setGap(+e.target.value || 0)} /></div>
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
                        <SelectItem value="roll">Рулонная</SelectItem>
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
                    {layout.form === "roll"
                      ? <>Ручьёв: <b>{layout.up}</b> · пог.м: <b>{layout.linearM}</b> · рулонов: <b>{layout.rolls}</b></>
                      : <>На лист: <b>{layout.up}</b> · листов: <b>{layout.printSheets}</b></>}
                    {" "}· печать: <b>{effectivePrintMode}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "variable", "cutting", "roll"]} className="w-full">
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
                                {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerM2)}/м²)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Толщина, мкм</Label><Input value={material.thickness} readOnly /></div>
                          <div><Label>Ширина рулона, мм</Label><Input value={material.rollW} readOnly /></div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="removable" checked={removableGlue} onCheckedChange={(v) => setRemovableGlue(!!v)} />
                            <Label htmlFor="removable" className="cursor-pointer">Съёмный клей</Label>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="wp" checked={needWaterproof} onCheckedChange={(v) => setNeedWaterproof(!!v)} />
                            <Label htmlFor="wp" className="cursor-pointer">Влагостойкость</Label>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="fp" checked={needFreezeproof} onCheckedChange={(v) => setNeedFreezeproof(!!v)} />
                            <Label htmlFor="fp" className="cursor-pointer">Морозостойкость</Label>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Площадь этикеток: <b>{layout.areaM2.toFixed(3)} м²</b> ·
                            Площадь печати: <b>{layout.printAreaM2} м²</b> · Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цветность CMYK</Label><Input type="number" min={1} max={8} value={colors} onChange={(e) => setColors(+e.target.value || 1)} /></div>
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
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="variable">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Переменные данные
                          <Badge variant={variable ? "default" : "outline"} className="text-[10px]">
                            {[optBarcode && "штрихкод", optQR && "QR", optNumber && "нумерация",
                              optProdDate && "дата", optExpDate && "срок", optBatch && "партия", optSerial && "S/N"]
                              .filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <Row label="Штрихкод" checked={optBarcode} onChange={setOptBarcode} />
                          <Row label="QR-код" checked={optQR} onChange={setOptQR} />
                          <Row label="Нумерация" checked={optNumber} onChange={setOptNumber} />
                          <Row label="Дата производства" checked={optProdDate} onChange={setOptProdDate} />
                          <Row label="Срок годности" checked={optExpDate} onChange={setOptExpDate} />
                          <Row label="Номер партии" checked={optBatch} onChange={setOptBatch} />
                          <Row label="Серийный номер" checked={optSerial} onChange={setOptSerial} />
                          <Row label="Проверка базы" checked={needDbCheck} onChange={setNeedDbCheck} />
                          <div className="flex items-end gap-2 sm:col-span-2">
                            <Label className="text-xs">Элементов на этикетке</Label>
                            <Input className="h-8 w-24" type="number" min={1} value={varElemsPerItem} onChange={(e) => setVarElemsPerItem(+e.target.value || 1)} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="cutting">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Резка / высечка
                          <Badge variant={(contourCut || optDieCut) ? "default" : "outline"} className="text-[10px]">
                            {[optDieCut && "высечка", contourCut && `контур ${contourComplex}`].filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <Row label="Высечка штампом" checked={optDieCut} onChange={setOptDieCut} />
                          <Row label="Контурная резка (плоттер)" checked={contourCut} onChange={setContourCut} />
                          {contourCut && (
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
                          <Row label="Выборка" checked={optWeeding} onChange={setOptWeeding} />
                          <Row label="Надсечка" checked={optNotch} onChange={setOptNotch}>
                            <Input className="h-8 w-20" type="number" min={1} value={notchLines} onChange={(e) => setNotchLines(+e.target.value || 1)} />
                            <span className="text-xs text-muted-foreground">линий</span>
                          </Row>
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Длина контура: <b>{contourLengthM}</b> пог.м
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="roll">
                      <AccordionTrigger>6. Рулон / намотка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          {form === "roll" ? (<>
                            <div><Label>Этикеток в рулоне</Label><Input type="number" min={50} value={labelsPerRoll} onChange={(e) => setLabelsPerRoll(+e.target.value || 50)} /></div>
                            <div><Label>Диаметр втулки, мм</Label>
                              <Select value={String(coreDiameterMm)} onValueChange={(v) => setCoreDiameterMm(+v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="25">25 мм</SelectItem>
                                  <SelectItem value="40">40 мм</SelectItem>
                                  <SelectItem value="76">76 мм (3")</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Количество ручьёв</Label><Input type="number" min={1} value={streams} onChange={(e) => setStreams(+e.target.value || 1)} /></div>
                            <div><Label>Направление намотки</Label>
                              <Select value={windDir} onValueChange={(v) => setWindDir(v as WindDir)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="out">Лицом наружу</SelectItem>
                                  <SelectItem value="in">Лицом внутрь</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                              Рулонов всего: <b>{layout.rolls}</b> · полезных пог.м: <b>{layout.netLinearM}</b>
                            </div>
                          </>) : (
                            <div className="sm:col-span-2 text-xs text-muted-foreground">
                              Листовая этикетка — рулонные параметры скрыты.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>7. Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Упаковка</Label>
                            <Select value={packKind} onValueChange={(v) => setPackKind(v as PackKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PACKS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}{p.price ? ` · ${fmtMoney(p.price)}/ед` : ""}</SelectItem>)}
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
                defaultName={`Этикетка ${itemW}×${itemH} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-label" />
          
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm">Спецификация</CardTitle></CardHeader>
            <CardContent>
              <SpecTable lines={lines} />
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