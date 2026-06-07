import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Megaphone } from "lucide-react";
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
 * Шаблон «POS-материалы» — воблер, шелфтокер, хенгер, стоппер, тейбл-тент,
 * ценникодержатель, некхенгер, рекламный указатель, фигурный POS. Доработка 74.
 */

type PosKind =
  | "wobbler" | "shelftalker" | "hanger" | "stopper" | "tabletent"
  | "neckhanger" | "pricetag" | "shaped" | "premium";
const KINDS: { value: PosKind; label: string }[] = [
  { value: "wobbler", label: "Воблер" },
  { value: "shelftalker", label: "Шелфтокер" },
  { value: "hanger", label: "Хенгер" },
  { value: "stopper", label: "Стоппер" },
  { value: "tabletent", label: "Тейбл-тент" },
  { value: "neckhanger", label: "Некхенгер" },
  { value: "pricetag", label: "Ценникодержатель" },
  { value: "shaped", label: "Фигурный POS" },
  { value: "premium", label: "Premium POS" },
];

type Material = {
  value: string; label: string; type: string; density: number; thicknessMm?: number;
  pricePerSheet: number; sheetW: number; sheetH: number; pricePerM2: number;
  plastic?: boolean; designer?: boolean; transparent?: boolean;
};
const MATERIALS: Material[] = [
  { value: "coated-300", label: "Мел. картон 300 г", type: "coated", density: 300, pricePerSheet: 320, sheetW: 720, sheetH: 1020, pricePerM2: 440 },
  { value: "coated-350", label: "Мел. картон 350 г", type: "coated", density: 350, pricePerSheet: 380, sheetW: 720, sheetH: 1020, pricePerM2: 520 },
  { value: "designer-300", label: "Дизайн. картон 300 г", type: "designer", density: 300, pricePerSheet: 720, sheetW: 720, sheetH: 1020, pricePerM2: 980, designer: true },
  { value: "kraft-300", label: "Крафт-картон 300 г", type: "kraft", density: 300, pricePerSheet: 260, sheetW: 720, sheetH: 1020, pricePerM2: 360 },
  { value: "pvc-0.5", label: "ПВХ 0.5 мм", type: "pvc", density: 0, thicknessMm: 0.5, pricePerSheet: 980, sheetW: 700, sheetH: 1000, pricePerM2: 1400, plastic: true },
  { value: "pvc-1.0", label: "ПВХ 1.0 мм", type: "pvc", density: 0, thicknessMm: 1.0, pricePerSheet: 1680, sheetW: 700, sheetH: 1000, pricePerM2: 2400, plastic: true },
  { value: "pet-0.4", label: "PET 0.4 мм", type: "pet", density: 0, thicknessMm: 0.4, pricePerSheet: 1100, sheetW: 700, sheetH: 1000, pricePerM2: 1570, plastic: true, transparent: true },
  { value: "plastic-clear", label: "Прозр. пластик 0.5 мм", type: "plastic", density: 0, thicknessMm: 0.5, pricePerSheet: 1450, sheetW: 700, sheetH: 1000, pricePerM2: 2070, plastic: true, transparent: true },
  { value: "selfadhesive", label: "Самоклейка 80 г", type: "selfadhesive", density: 80, pricePerSheet: 240, sheetW: 700, sheetH: 1000, pricePerM2: 340 },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 140 },
  { value: "gloss", label: "Глянцевая", price: 120 },
  { value: "soft", label: "Soft-touch", price: 320 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv";

type Leg = { value: string; label: string; price: number; install: number };
const LEGS: Leg[] = [
  { value: "none", label: "Без ножки", price: 0, install: 0 },
  { value: "pet-spring", label: "PET-пружина", price: 18, install: 6 },
  { value: "plastic", label: "Пластиковая ножка", price: 14, install: 5 },
  { value: "cardboard", label: "Картонная ножка", price: 8, install: 4 },
  { value: "premium", label: "Premium-крепление", price: 45, install: 10 },
];

type Hook = { value: string; label: string; price: number; install: number };
const HOOKS: Hook[] = [
  { value: "none", label: "Без крючка", price: 0, install: 0 },
  { value: "plastic", label: "Пластиковый крючок", price: 6, install: 3 },
  { value: "metal", label: "Металлический крючок", price: 12, install: 4 },
  { value: "loop", label: "Подвес-петля", price: 4, install: 2 },
];

type Tape = { value: string; label: string; pricePerM: number; install: number };
const TAPES: Tape[] = [
  { value: "none", label: "Без скотча", pricePerM: 0, install: 0 },
  { value: "regular", label: "Двусторонний скотч", pricePerM: 35, install: 3 },
  { value: "foam", label: "Скотч на вспене", pricePerM: 90, install: 4 },
  { value: "removable", label: "Съёмный скотч", pricePerM: 55, install: 3 },
];

type PackKind = "none" | "stack" | "box" | "individual" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "stack", label: "В пачки по 50", price: 25, perPack: 50 },
  { value: "box", label: "В коробку по 100", price: 180, perPack: 100 },
  { value: "individual", label: "Индивидуальная", price: 25, perPack: 1 },
  { value: "premium", label: "Premium упаковка", price: 120, perPack: 10 },
];

export default function PosCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [circulation, setCirculation] = useState(500);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<PosKind>("wobbler");
  const [productW, setProductW] = useState(90);    // мм
  const [productH, setProductH] = useState(120);   // мм
  const [spreadW, setSpreadW] = useState(0);       // для тейбл-тента и пр.
  const [spreadH, setSpreadH] = useState(0);
  const [shape, setShape] = useState<"rect" | "shaped">("rect");
  const [twoSided, setTwoSided] = useState(false);
  const [colorsFront, setColorsFront] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [leadDays, setLeadDays] = useState(5);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("coated-350");

  // Печать
  const [pantoneCount, setPantoneCount] = useState(0);
  const [whiteInk, setWhiteInk] = useState(false);

  // Покрытие / постпечать
  const [lamType, setLamType] = useState<LamType>("gloss");
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optUvVarnish, setOptUvVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optCongrev, setOptCongrev] = useState(false);
  const [embossAreaCm2, setEmbossAreaCm2] = useState(20);

  // Высечка / биговка / облой
  const [hasDieCut, setHasDieCut] = useState(true);
  const [knifeLengthM, setKnifeLengthM] = useState(0.6); // длина ножей штампа
  const [hasFlashRemoval, setHasFlashRemoval] = useState(true);
  const [hasBiegovka, setHasBiegovka] = useState(false);
  const [biegovkaCount, setBiegovkaCount] = useState(1);
  const [hasFolding, setHasFolding] = useState(false);
  const [foldingCount, setFoldingCount] = useState(1);

  // Углы / отверстия
  const [hasCornerRound, setHasCornerRound] = useState(false);
  const [cornerCount, setCornerCount] = useState(4);
  const [hasHoles, setHasHoles] = useState(false);
  const [holesCount, setHolesCount] = useState(1);

  // Крепления
  const [legKey, setLegKey] = useState("none");
  const [hookKey, setHookKey] = useState("none");
  const [hookCount, setHookCount] = useState(1);
  const [tapeKey, setTapeKey] = useState("none");
  const [tapeStripsCount, setTapeStripsCount] = useState(2);
  const [tapeStripLengthMm, setTapeStripLengthMm] = useState(40);

  // Сборка / упаковка
  const [hasAssembly, setHasAssembly] = useState(false);
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const leg = useMemo(() => LEGS.find((l) => l.value === legKey)!, [legKey]);
  const hook = useMemo(() => HOOKS.find((h) => h.value === hookKey)!, [hookKey]);
  const tape = useMemo(() => TAPES.find((t) => t.value === tapeKey)!, [tapeKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу POS
  useEffect(() => {
    if (kind === "wobbler") {
      setHasDieCut(true);
      setHasFlashRemoval(true);
      if (tapeKey === "none" && legKey === "none") setTapeKey("regular");
      setHasAssembly(true);
    } else if (kind === "shelftalker") {
      setHasBiegovka(true);
      if (biegovkaCount < 1) setBiegovkaCount(1);
      if (tapeKey === "none") setTapeKey("foam");
      setHasAssembly(true);
    } else if (kind === "hanger" || kind === "neckhanger") {
      setHasDieCut(true);
      setHasFlashRemoval(true);
      setHasHoles(true);
      if (holesCount < 1) setHolesCount(1);
      if (hookKey === "none" && kind === "hanger") setHookKey("plastic");
    } else if (kind === "stopper") {
      setHasDieCut(true);
      setHasFlashRemoval(true);
      if (tapeKey === "none") setTapeKey("regular");
    } else if (kind === "tabletent") {
      setHasBiegovka(true);
      setBiegovkaCount((c) => Math.max(2, c));
      setHasFolding(true);
      setFoldingCount((c) => Math.max(1, c));
      setHasAssembly(true);
    } else if (kind === "pricetag") {
      setHasDieCut(true);
      setHasFlashRemoval(true);
    } else if (kind === "shaped") {
      setShape("shaped");
      setHasDieCut(true);
      setHasFlashRemoval(true);
    } else if (kind === "premium") {
      if (lamType === "none" || lamType === "gloss") setLamType("soft");
      setOptSoftTouch(true);
      setOptSpotVarnish(true);
      setOptEmboss(true);
      if (packKind === "none" || packKind === "stack") setPackKind("individual");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.plastic) return "uv";
    if (circulation >= 500) return "offset";
    return "digital";
  }, [printMode, material, circulation]);

  // Premium-коэффициент сложности
  const assemblyCoef = useMemo(() => {
    if (kind === "premium") return 1.8;
    if (shape === "shaped" || kind === "shaped") return 1.5;
    if (hookKey !== "none") return 1.3;
    if (legKey !== "none") return 1.2;
    return 1.0;
  }, [kind, shape, hookKey, legKey]);

  const flashCoef = useMemo(() => (shape === "shaped" || kind === "shaped" ? 1.5 : 1.0), [shape, kind]);

  // Раскладка на печатный лист
  const printableW = material.sheetW - 20; // запас под захваты
  const printableH = material.sheetH - 20;
  const itemW = Math.max(1, productW + 4); // bleed
  const itemH = Math.max(1, productH + 4);
  const itemsPerSheet = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH]);
  const netSheets = useMemo(() => Math.ceil(circulation / itemsPerSheet), [circulation, itemsPerSheet]);
  const setupSheets = effectivePrintMode === "offset" ? 150 + Math.ceil(netSheets * 0.01)
                    : effectivePrintMode === "uv" ? 30 : 15;
  const printSheets = netSheets + setupSheets;
  const sheetAreaM2 = (material.sheetW * material.sheetH) / 1_000_000;
  const printAreaM2 = +(printSheets * sheetAreaM2).toFixed(3);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн POS-материала", Math.max(1, designsCount), "макет", 4500);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 1200);
    push("Препресс", "Подбор печатного формата и раскладка", 1, "усл.", 800);

    // Материал
    push("Материалы", `${material.label}`, printSheets, "лист", material.pricePerSheet);
    push("Препресс", "Резка закупочного листа на печатный", printSheets, "лист", 1.2);

    // Печать
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    if (effectivePrintMode === "offset") {
      const forms = colorsTotal + pantoneCount;
      push("Печать", "Печатные формы", forms * Math.max(1, designsCount), "форма", 1000);
      push("Печать", "Приладка офсета", 1, "усл.", 150 + Math.ceil(netSheets * 0.01));
      push("Печать", `Офсетная печать${twoSided ? " (2 стороны)" : ""}`, printSheets * (twoSided ? 2 : 1), "оттиск", 6);
    } else if (effectivePrintMode === "uv") {
      push("Печать", "Приладка UV", 1, "усл.", 2500);
      push("Печать", "UV-печать", printAreaM2 * (twoSided ? 2 : 1), "м²",
        +(2200 + (whiteInk ? 500 : 0) + pantoneCount * 200).toFixed(2));
    } else {
      push("Печать", `Цифровая печать${twoSided ? " (2 стороны)" : ""}`, printSheets * (twoSided ? 2 : 1), "оттиск",
        +(30 + colorsTotal * 2 + (whiteInk ? 8 : 0)).toFixed(2));
    }

    // Ламинация / покрытие
    if (lamType !== "none") {
      const sides = twoSided ? 2 : 1;
      push("Постпечать", `Ламинация: ${lam.label}${sides === 2 ? " ×2" : ""}`, printAreaM2 * sides, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }
    if (optSoftTouch && lamType !== "soft") {
      push("Постпечать", "Soft-touch покрытие", printAreaM2, "м²", 340);
    }
    if (optUvVarnish) push("Постпечать", "УФ-лак сплошной", printAreaM2, "м²", 220);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2200);
      push("Постпечать", "Выборочный лак", printAreaM2, "м²", 1200);
    }

    // Тиснение / конгрев
    if (optEmboss) {
      const cliche = Math.max(4500, embossAreaCm2 * 180);
      push("Постпечать", "Клише тиснения", 1, "шт", cliche);
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Тиснение (нанесение)", circulation, "оттиск", 18);
    }
    if (optCongrev) {
      const cliche = Math.max(7000, embossAreaCm2 * 320);
      push("Постпечать", "Клише конгрева", 1, "шт", cliche);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1800);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", 24);
    }

    // Высечка
    if (hasDieCut) {
      const stamp = Math.max(3500, Math.round(knifeLengthM * 1000 * 12 + 1500));
      push("Постпечать", "Штамп для высечки", 1, "шт", stamp);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      push("Постпечать", "Высечка", printSheets, "лист", 4);
    }

    // Удаление облоя
    if (hasFlashRemoval) {
      push("Постпечать", `Удаление облоя${flashCoef > 1 ? ` (×${flashCoef.toFixed(2)})` : ""}`,
        printSheets * itemsPerSheet, "изд.", +(0.4 * flashCoef).toFixed(2));
      push("Постпечать", "Приладка удаления облоя", 1, "усл.", 800);
    }

    // Биговка
    if (hasBiegovka && biegovkaCount > 0) {
      push("Постпечать", "Биговка", circulation * biegovkaCount, "биг", 1.2);
      push("Постпечать", "Приладка биговки", 1, "усл.", 1000);
    }
    // Фальцовка
    if (hasFolding && foldingCount > 0) {
      push("Постпечать", "Фальцовка", circulation * foldingCount, "сгиб", 1.0);
      push("Постпечать", "Приладка фальцовки", 1, "усл.", 800);
    }

    // Углы / отверстия
    if (hasCornerRound && cornerCount > 0) {
      push("Постпечать", "Скругление углов", circulation * cornerCount, "угол", 0.6);
      push("Постпечать", "Приладка скругления", 1, "усл.", 500);
    }
    if (hasHoles && holesCount > 0) {
      push("Постпечать", "Отверстия", circulation * holesCount, "отв.", 0.8);
      push("Постпечать", "Приладка отверстий", 1, "усл.", 400);
    }

    // Скотч
    if (tapeKey !== "none") {
      const stripsTotal = circulation * Math.max(1, tapeStripsCount);
      const tapeMeters = +((stripsTotal * Math.max(1, tapeStripLengthMm)) / 1000).toFixed(2);
      push("Материалы", `${tape.label}`, tapeMeters, "пог.м", tape.pricePerM);
      push("Постпечать", "Нанесение скотча", stripsTotal, "полос", tape.install);
      push("Постпечать", "Приладка скотчирования", 1, "усл.", 600);
    }

    // Ножка
    if (legKey !== "none") {
      push("Материалы", `${leg.label}`, circulation, "шт", leg.price);
      push("Постпечать", "Приклейка ножки", circulation, "шт", leg.install);
      push("Постпечать", "Приладка установки ножки", 1, "усл.", 700);
    }

    // Крючок
    if (hookKey !== "none") {
      const eq = circulation * Math.max(1, hookCount);
      push("Материалы", `${hook.label}`, eq, "шт", hook.price);
      push("Постпечать", "Установка крючка", eq, "шт", hook.install);
    }

    // Финальная сборка
    if (hasAssembly || kind === "wobbler" || kind === "tabletent" || kind === "shelftalker" || kind === "premium") {
      push("Постпечать", `Финальная сборка${assemblyCoef > 1 ? ` (×${assemblyCoef.toFixed(2)})` : ""}`,
        circulation, "изд.", +(4 * assemblyCoef).toFixed(2));
    }

    // Контроль качества
    push("Логистика", "Контроль качества", circulation, "изд.", +(1.2 * assemblyCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, material, printSheets, netSheets, printAreaM2, sheetAreaM2,
    effectivePrintMode, colorsFront, colorsBack, twoSided, pantoneCount, whiteInk,
    lamType, lam, optSoftTouch, optUvVarnish, optSpotVarnish, optEmboss, optCongrev, embossAreaCm2,
    hasDieCut, knifeLengthM, hasFlashRemoval, flashCoef, itemsPerSheet,
    hasBiegovka, biegovkaCount, hasFolding, foldingCount,
    hasCornerRound, cornerCount, hasHoles, holesCount,
    tapeKey, tape, tapeStripsCount, tapeStripLengthMm,
    legKey, leg, hookKey, hook, hookCount,
    hasAssembly, assemblyCoef, kind, packKind, pack, circulation, hasDelivery, deliveryCost,
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
    s.push("Проверка макета", "Подбор печатного формата", "Раскладка", "Расчёт материала", "Резка закупочного листа");
    if (effectivePrintMode === "offset") s.push("Вывод печатных форм", "Приладка офсета", "Офсетная печать");
    else if (effectivePrintMode === "uv") s.push("UV-печать");
    else s.push("Цифровая печать");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optSoftTouch && lamType !== "soft") s.push("Soft-touch");
    if (optUvVarnish) s.push("УФ-лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optEmboss) s.push("Тиснение");
    if (optCongrev) s.push("Конгрев");
    if (hasDieCut) s.push("Высечка");
    if (hasFlashRemoval) s.push("Удаление облоя");
    if (hasBiegovka) s.push("Биговка");
    if (hasFolding) s.push("Фальцовка");
    if (hasCornerRound) s.push("Скругление углов");
    if (hasHoles) s.push("Отверстия");
    if (tapeKey !== "none") s.push(`Скотчирование: ${tape.label}`);
    if (legKey !== "none") s.push(`Приклейка ножки: ${leg.label}`);
    if (hookKey !== "none") s.push(`Установка крючка: ${hook.label}`);
    s.push("Финальная сборка", "Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, lamType, lam, optSoftTouch, optUvVarnish, optSpotVarnish,
      optEmboss, optCongrev, hasDieCut, hasFlashRemoval, hasBiegovka, hasFolding,
      hasCornerRound, hasHoles, tapeKey, tape, legKey, leg, hookKey, hook,
      packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Megaphone className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: POS-материалы</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Воблер, шелфтокер, хенгер, стоппер, тейбл-тент, некхенгер, ценник, фигурный POS.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 74</Badge>
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
                    <Label>Тип POS-изделия</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as PosKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина изделия, мм</Label><Input type="number" value={productW} onChange={(e) => setProductW(+e.target.value || 0)} /></div>
                  <div><Label>Высота изделия, мм</Label><Input type="number" value={productH} onChange={(e) => setProductH(+e.target.value || 0)} /></div>
                  <div><Label>Развёртка Ш, мм</Label><Input type="number" value={spreadW} onChange={(e) => setSpreadW(+e.target.value || 0)} /></div>
                  <div><Label>Развёртка В, мм</Label><Input type="number" value={spreadH} onChange={(e) => setSpreadH(+e.target.value || 0)} /></div>
                  <div>
                    <Label>Форма</Label>
                    <Select value={shape} onValueChange={(v) => setShape(v as "rect" | "shaped")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rect">Прямоугольная</SelectItem>
                        <SelectItem value="shaped">Фигурная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="two-sided" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two-sided" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} /></div>
                  {twoSided && (<div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>)}
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
                    На лист: <b>{itemsPerSheet}</b> · печ. листов: <b>{printSheets}</b>{" · "}
                    приладка: <b>{setupSheets}</b> · режим: <b>{effectivePrintMode}</b>{" · "}
                    коэф. сборки: <b>×{assemblyCoef.toFixed(2)}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "post", "diecut", "hardware", "ship"]} className="w-full">
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
                                {MATERIALS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label} · {m.sheetW}×{m.sheetH} мм · {fmtMoney(m.pricePerSheet)}/лист
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Закупочный лист: <b>{material.sheetW}×{material.sheetH}</b> мм · цена/м²: <b>{fmtMoney(material.pricePerM2)}</b>
                            {material.plastic && <> · <Badge variant="outline" className="text-[10px]">пластик</Badge></>}
                            {material.transparent && <> · <Badge variant="outline" className="text-[10px]">прозрачный</Badge></>}
                            {material.designer && <> · <Badge variant="outline" className="text-[10px]">дизайнерский</Badge></>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать и покрытие</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Pantone</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="white" checked={whiteInk} onCheckedChange={(v) => setWhiteInk(!!v)} />
                            <Label htmlFor="white" className="cursor-pointer">Белила</Label>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Ламинация</Label>
                            <Select value={lamType} onValueChange={(v) => setLamType(v as LamType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/м²)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Row label="Доп. soft-touch" checked={optSoftTouch} onChange={setOptSoftTouch} />
                          <Row label="УФ-лак сплошной" checked={optUvVarnish} onChange={setOptUvVarnish} />
                          <Row label="Выборочный лак" checked={optSpotVarnish} onChange={setOptSpotVarnish} />
                          <Row label="Тиснение" checked={optEmboss} onChange={setOptEmboss} />
                          <Row label="Конгрев" checked={optCongrev} onChange={setOptCongrev} />
                          {(optEmboss || optCongrev) && (
                            <div className="sm:col-span-2">
                              <Label>Площадь клише, см²</Label>
                              <Input type="number" min={1} value={embossAreaCm2} onChange={(e) => setEmbossAreaCm2(+e.target.value || 1)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="diecut">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Высечка, биговка, облой
                          {hasDieCut && <Badge variant="outline" className="text-[10px]">высечка</Badge>}
                          {hasBiegovka && <Badge variant="outline" className="text-[10px]">биг ×{biegovkaCount}</Badge>}
                          {hasFolding && <Badge variant="outline" className="text-[10px]">фальц ×{foldingCount}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Высечка" checked={hasDieCut} onChange={setHasDieCut} />
                          {hasDieCut && (
                            <div><Label>Длина ножей штампа, м</Label><Input type="number" step={0.1} value={knifeLengthM} onChange={(e) => setKnifeLengthM(+e.target.value || 0)} /></div>
                          )}
                          <Row label="Удаление облоя" checked={hasFlashRemoval} onChange={setHasFlashRemoval} />
                          <Row label="Биговка" checked={hasBiegovka} onChange={setHasBiegovka} />
                          {hasBiegovka && (
                            <div><Label>Кол-во бигов</Label><Input type="number" min={1} value={biegovkaCount} onChange={(e) => setBiegovkaCount(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Фальцовка" checked={hasFolding} onChange={setHasFolding} />
                          {hasFolding && (
                            <div><Label>Кол-во сгибов</Label><Input type="number" min={1} value={foldingCount} onChange={(e) => setFoldingCount(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Скругление углов" checked={hasCornerRound} onChange={setHasCornerRound} />
                          {hasCornerRound && (
                            <div><Label>Углов</Label><Input type="number" min={1} max={8} value={cornerCount} onChange={(e) => setCornerCount(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Отверстия" checked={hasHoles} onChange={setHasHoles} />
                          {hasHoles && (
                            <div><Label>Отверстий на изделие</Label><Input type="number" min={1} value={holesCount} onChange={(e) => setHolesCount(+e.target.value || 1)} /></div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="hardware">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Крепления и сборка
                          {tapeKey !== "none" && <Badge variant="outline" className="text-[10px]">{tape.label}</Badge>}
                          {legKey !== "none" && <Badge variant="outline" className="text-[10px]">{leg.label}</Badge>}
                          {hookKey !== "none" && <Badge variant="outline" className="text-[10px]">{hook.label} ×{hookCount}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Скотч</Label>
                            <Select value={tapeKey} onValueChange={setTapeKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TAPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}{t.pricePerM ? ` (${fmtMoney(t.pricePerM)}/м + ${fmtMoney(t.install)}/полос)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {tapeKey !== "none" && (<>
                            <div><Label>Полос скотча на изделие</Label><Input type="number" min={1} value={tapeStripsCount} onChange={(e) => setTapeStripsCount(+e.target.value || 1)} /></div>
                            <div><Label>Длина одной полосы, мм</Label><Input type="number" min={1} value={tapeStripLengthMm} onChange={(e) => setTapeStripLengthMm(+e.target.value || 1)} /></div>
                          </>)}
                          <div className="sm:col-span-2">
                            <Label>Ножка / крепление</Label>
                            <Select value={legKey} onValueChange={setLegKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LEGS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)} + ${fmtMoney(l.install)}/уст.)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Крючок / подвес</Label>
                            <Select value={hookKey} onValueChange={setHookKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {HOOKS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}{h.price ? ` (${fmtMoney(h.price)} + ${fmtMoney(h.install)}/уст.)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {hookKey !== "none" && (
                            <div><Label>Крючков на изделие</Label><Input type="number" min={1} value={hookCount} onChange={(e) => setHookCount(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Финальная сборка" checked={hasAssembly} onChange={setHasAssembly} />
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
                productType="wobbler"
                defaultName={`${KINDS.find((k) => k.value === kind)?.label || "POS"} ${productW}×${productH} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-pos" />
          
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
