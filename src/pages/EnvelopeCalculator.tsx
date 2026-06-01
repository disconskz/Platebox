import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
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
 * Шаблон «Конверт» — почтовые/фирменные/подарочные конверты, с окном,
 * клапаном, склейкой, печатью на готовом или изготовление с нуля. Доработка 75.
 */

type EnvKind =
  | "c6" | "c5" | "c4" | "dl" | "cert" | "gift"
  | "window" | "triangle_flap" | "straight_flap" | "premium" | "custom";
const KINDS: { value: EnvKind; label: string; w: number; h: number }[] = [
  { value: "c6", label: "C6 (114×162)", w: 162, h: 114 },
  { value: "c5", label: "C5 (162×229)", w: 229, h: 162 },
  { value: "c4", label: "C4 (229×324)", w: 324, h: 229 },
  { value: "dl", label: "DL / E65 (110×220)", w: 220, h: 110 },
  { value: "cert", label: "Сертификатный (A4-сложение)", w: 230, h: 160 },
  { value: "gift", label: "Подарочный", w: 200, h: 150 },
  { value: "window", label: "С окном", w: 220, h: 110 },
  { value: "triangle_flap", label: "С треугольным клапаном", w: 162, h: 114 },
  { value: "straight_flap", label: "С прямым клапаном", w: 162, h: 114 },
  { value: "premium", label: "Premium конверт", w: 220, h: 170 },
  { value: "custom", label: "Нестандартный", w: 200, h: 100 },
];

type Material = {
  value: string; label: string; type: string; density: number;
  pricePerSheet: number; sheetW: number; sheetH: number; pricePerM2: number;
  designer?: boolean; premium?: boolean;
};
const MATERIALS: Material[] = [
  { value: "offset-80", label: "Офсетная 80 г", type: "offset", density: 80, pricePerSheet: 110, sheetW: 720, sheetH: 1020, pricePerM2: 150 },
  { value: "offset-100", label: "Офсетная 100 г", type: "offset", density: 100, pricePerSheet: 140, sheetW: 720, sheetH: 1020, pricePerM2: 190 },
  { value: "coated-120", label: "Мелованная 120 г", type: "coated", density: 120, pricePerSheet: 165, sheetW: 720, sheetH: 1020, pricePerM2: 225 },
  { value: "coated-170", label: "Мелованная 170 г", type: "coated", density: 170, pricePerSheet: 220, sheetW: 720, sheetH: 1020, pricePerM2: 300 },
  { value: "designer-120", label: "Дизайн. бумага 120 г", type: "designer", density: 120, pricePerSheet: 380, sheetW: 720, sheetH: 1020, pricePerM2: 520, designer: true },
  { value: "designer-250", label: "Дизайн. бумага 250 г", type: "designer", density: 250, pricePerSheet: 620, sheetW: 720, sheetH: 1020, pricePerM2: 850, designer: true, premium: true },
  { value: "kraft-100", label: "Крафт 100 г", type: "kraft", density: 100, pricePerSheet: 130, sheetW: 720, sheetH: 1020, pricePerM2: 180, designer: true },
  { value: "kraft-150", label: "Крафт 150 г", type: "kraft", density: 150, pricePerSheet: 175, sheetW: 720, sheetH: 1020, pricePerM2: 240, designer: true },
  { value: "tracing-100", label: "Калька 100 г", type: "tracing", density: 100, pricePerSheet: 320, sheetW: 720, sheetH: 1020, pricePerM2: 440, designer: true },
  { value: "touch-250", label: "Touch paper 250 г", type: "designer", density: 250, pricePerSheet: 980, sheetW: 720, sheetH: 1020, pricePerM2: 1340, designer: true, premium: true },
  { value: "metallic-120", label: "Metallic paper 120 г", type: "designer", density: 120, pricePerSheet: 560, sheetW: 720, sheetH: 1020, pricePerM2: 770, designer: true, premium: true },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 140 },
  { value: "gloss", label: "Глянцевая", price: 120 },
  { value: "soft", label: "Soft-touch", price: 320 },
];

type PrintMode = "auto" | "digital" | "offset";

type FlapType = "none" | "straight" | "triangle" | "rounded";
const FLAPS: { value: FlapType; label: string }[] = [
  { value: "none", label: "Без клапана" },
  { value: "straight", label: "Прямой клапан" },
  { value: "triangle", label: "Треугольный клапан" },
  { value: "rounded", label: "Скруглённый клапан" },
];

type GlueType = "none" | "pva" | "hotmelt" | "silicone" | "removable_tape";
const GLUES: { value: GlueType; label: string; pricePerM: number; install: number }[] = [
  { value: "none", label: "Без клея", pricePerM: 0, install: 0 },
  { value: "pva", label: "ПВА клей", pricePerM: 6, install: 2 },
  { value: "hotmelt", label: "Hot-melt", pricePerM: 9, install: 2.5 },
  { value: "silicone", label: "Силикон. полоса", pricePerM: 18, install: 4 },
  { value: "removable_tape", label: "Съёмная клеевая полоса", pricePerM: 22, install: 3.5 },
];

type PackKind = "none" | "stack" | "box" | "individual" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "stack", label: "В пачки по 100", price: 25, perPack: 100 },
  { value: "box", label: "В коробку по 250", price: 220, perPack: 250 },
  { value: "individual", label: "Индивидуальная", price: 18, perPack: 1 },
  { value: "premium", label: "Premium упаковка", price: 110, perPack: 25 },
];

export default function EnvelopeCalculator() {
  // Основные
  const [circulation, setCirculation] = useState(500);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<EnvKind>("dl");
  const [finishedW, setFinishedW] = useState(220);  // готовый формат
  const [finishedH, setFinishedH] = useState(110);
  const [flapSize, setFlapSize] = useState(40);     // мм
  const [spreadW, setSpreadW] = useState(260);      // развёртка
  const [spreadH, setSpreadH] = useState(220);
  const [mode, setMode] = useState<"finished" | "scratch">("scratch"); // готовый или с нуля
  const [printOnFinished, setPrintOnFinished] = useState(false);

  const [colorsFront, setColorsFront] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [twoSided, setTwoSided] = useState(false);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [whiteInk, setWhiteInk] = useState(false);
  const [leadDays, setLeadDays] = useState(5);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("offset-100");

  // Покрытие / постпечать
  const [lamType, setLamType] = useState<LamType>("none");
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optUvVarnish, setOptUvVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optCongrev, setOptCongrev] = useState(false);
  const [optFoil, setOptFoil] = useState(false);
  const [embossAreaCm2, setEmbossAreaCm2] = useState(15);

  // Конструкция
  const [flapType, setFlapType] = useState<FlapType>("straight");
  const [flapCount, setFlapCount] = useState(1);
  const [biegovkaCount, setBiegovkaCount] = useState(3);

  // Окно
  const [hasWindow, setHasWindow] = useState(false);
  const [windowW, setWindowW] = useState(95);
  const [windowH, setWindowH] = useState(35);
  const [windowShape, setWindowShape] = useState<"rect" | "rounded" | "shaped">("rect");
  const [windowFilmPricePerM2, setWindowFilmPricePerM2] = useState(900);

  // Склейка
  const [glueType, setGlueType] = useState<GlueType>("pva");
  const [glueSeamLengthMm, setGlueSeamLengthMm] = useState(220); // длина клеевого шва на конверт
  const [hasAdhesiveStrip, setHasAdhesiveStrip] = useState(false);

  // Персонализация
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(1);
  const [hasNumbering, setHasNumbering] = useState(false);
  const [hasQr, setHasQr] = useState(false);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const glue = useMemo(() => GLUES.find((g) => g.value === glueType)!, [glueType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу конверта
  useEffect(() => {
    const k = KINDS.find((x) => x.value === kind);
    if (k && kind !== "custom") {
      setFinishedW(k.w);
      setFinishedH(k.h);
      // Развёртка ~ готовый размер + 2× клапан + припуски
      setSpreadW(k.w + 20);
      setSpreadH(k.h + flapSize * 2 + 20);
    }
    if (kind === "window") {
      setHasWindow(true);
    }
    if (kind === "triangle_flap") setFlapType("triangle");
    if (kind === "straight_flap") setFlapType("straight");
    if (kind === "premium") {
      if (lamType === "none") setLamType("soft");
      setOptSoftTouch(true);
      setOptEmboss(true);
      if (packKind === "none" || packKind === "stack") setPackKind("individual");
      if (!MATERIALS.find((m) => m.value === materialKey)?.designer) setMaterialKey("designer-250");
    }
    if (kind === "gift" || kind === "cert") {
      if (lamType === "none") setLamType("mat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Если выбран готовый конверт — печать только на готовом
  useEffect(() => {
    if (mode === "finished") setPrintOnFinished(true);
  }, [mode]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (printOnFinished) return "digital"; // печать на готовом — почти всегда цифра
    if (circulation >= 800) return "offset";
    return "digital";
  }, [printMode, printOnFinished, circulation]);

  const qcCoef = useMemo(() => {
    let k = 1.0;
    if (hasWindow) k += 0.3;
    if (hasPersonalization) k += 0.4;
    if (kind === "premium") k += 0.2;
    return +k.toFixed(2);
  }, [hasWindow, hasPersonalization, kind]);

  const flashCoef = useMemo(() => (flapType === "triangle" || flapType === "rounded" || kind === "premium" ? 1.4 : 1.0),
    [flapType, kind]);

  // Раскладка
  const printableW = material.sheetW - 20;
  const printableH = material.sheetH - 20;
  const useSpread = mode === "scratch";
  const itemW = Math.max(1, (useSpread ? spreadW : finishedW) + 4);
  const itemH = Math.max(1, (useSpread ? spreadH : finishedH) + 4);
  const itemsPerSheet = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH]);
  const netSheets = useMemo(() => Math.ceil(circulation / itemsPerSheet), [circulation, itemsPerSheet]);
  const setupSheets = effectivePrintMode === "offset" ? 150 + Math.ceil(netSheets * 0.01) : 15;
  const printSheets = netSheets + setupSheets;
  const sheetAreaM2 = (material.sheetW * material.sheetH) / 1_000_000;
  const printAreaM2 = +(printSheets * sheetAreaM2).toFixed(3);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн конверта", Math.max(1, designsCount), "макет", 4500);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 1200);
    if (mode === "scratch") push("Препресс", "Подготовка развёртки", 1, "усл.", 1200);
    push("Препресс", "Раскладка", 1, "усл.", 800);

    // Материал
    if (mode === "scratch") {
      push("Материалы", `${material.label}`, printSheets, "лист", material.pricePerSheet);
      push("Препресс", "Резка закупочного листа", printSheets, "лист", 1.2);
    } else {
      // Готовый конверт — материал готовых конвертов
      const finishedUnitPrice = +(material.pricePerM2 * (finishedW * finishedH) / 1_000_000 * 1.6 + 2).toFixed(2);
      push("Материалы", `Готовый конверт ${finishedW}×${finishedH} (${material.label})`, circulation, "шт", finishedUnitPrice);
    }

    // Печать
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    if (effectivePrintMode === "offset") {
      const forms = colorsTotal + pantoneCount;
      push("Печать", "Печатные формы", forms * Math.max(1, designsCount), "форма", 1000);
      push("Печать", "Приладка офсета", 1, "усл.", 150 + Math.ceil(netSheets * 0.01));
      push("Печать", `Офсетная печать${twoSided ? " (2 стороны)" : ""}`, printSheets * (twoSided ? 2 : 1), "оттиск", 6);
    } else {
      if (printOnFinished) {
        push("Печать", `Цифровая печать на готовом${twoSided ? " (2 стороны)" : ""}`, circulation * (twoSided ? 2 : 1), "оттиск",
          +(45 + colorsTotal * 3 + (whiteInk ? 10 : 0)).toFixed(2));
      } else {
        push("Печать", `Цифровая печать${twoSided ? " (2 стороны)" : ""}`, printSheets * (twoSided ? 2 : 1), "оттиск",
          +(30 + colorsTotal * 2 + (whiteInk ? 8 : 0)).toFixed(2));
      }
    }

    // Ламинация / покрытие (только если не готовый конверт, иначе нанесение возможно, но обычно нет)
    if (lamType !== "none") {
      const sides = twoSided ? 2 : 1;
      push("Постпечать", `Ламинация: ${lam.label}${sides === 2 ? " ×2" : ""}`, printAreaM2 * sides, "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }
    if (optSoftTouch && lamType !== "soft") push("Постпечать", "Soft-touch покрытие", printAreaM2, "м²", 340);
    if (optUvVarnish) push("Постпечать", "УФ-лак сплошной", printAreaM2, "м²", 220);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2200);
      push("Постпечать", "Выборочный лак", printAreaM2, "м²", 1200);
    }

    // Тиснение / конгрев / фольга
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
    if (optFoil) {
      push("Постпечать", "Фольгирование", circulation * embossAreaCm2, "см²", 0.06);
      push("Постпечать", "Приладка фольги", 1, "усл.", 1500);
    }

    // Высечка / биговка / склейка — только если конверт с нуля
    if (mode === "scratch") {
      const knifeLengthM = +(((finishedW + finishedH) * 2 + flapSize * 3) / 1000).toFixed(2);
      const stamp = Math.max(4500, Math.round(knifeLengthM * 1000 * 12 + 1500));
      push("Постпечать", "Штамп для высечки конверта", 1, "шт", stamp);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      push("Постпечать", "Высечка", printSheets, "лист", 4);
      push("Постпечать", `Удаление облоя${flashCoef > 1 ? ` (×${flashCoef.toFixed(2)})` : ""}`,
        printSheets * itemsPerSheet, "изд.", +(0.4 * flashCoef).toFixed(2));
      push("Постпечать", "Приладка удаления облоя", 1, "усл.", 800);
      if (biegovkaCount > 0) {
        push("Постпечать", "Биговка", circulation * biegovkaCount, "биг", 1.2);
        push("Постпечать", "Приладка биговки", 1, "усл.", 1000);
      }
    }

    // Окно
    if (hasWindow) {
      const windowAreaM2 = (windowW * windowH) / 1_000_000;
      push("Постпечать", `Высечка окна (${windowShape})`, circulation, "шт", 2.5);
      push("Материалы", "Плёнка для окна", +(windowAreaM2 * circulation).toFixed(4), "м²", windowFilmPricePerM2);
      push("Постпечать", "Приладка вклейки окна", 1, "усл.", 1500);
      push("Постпечать", "Вклейка окна", circulation, "шт", 4);
    }

    // Склейка (только при изготовлении с нуля)
    if (mode === "scratch" && glueType !== "none") {
      const seamMeters = +(circulation * glueSeamLengthMm / 1000).toFixed(2);
      push("Материалы", `Клей: ${glue.label}`, seamMeters, "пог.м", glue.pricePerM);
      push("Постпечать", "Склейка конверта", circulation, "шт", +(glue.install + 1.5).toFixed(2));
      push("Постпечать", "Приладка склейки", 1, "усл.", 1200);
    }

    // Клеевая полоса (отдельно, если активна)
    if (hasAdhesiveStrip) {
      const stripMeters = +(circulation * finishedW / 1000).toFixed(2);
      push("Материалы", "Силиконизированная клеевая полоса", stripMeters, "пог.м", 18);
      push("Постпечать", "Нанесение клеевой полосы", circulation, "шт", 2.5);
      push("Постпечать", "Приладка клеевой полосы", 1, "усл.", 800);
    }

    // Персонализация
    if (hasPersonalization) {
      push("Постпечать", "Подготовка базы персонализации", 1, "усл.", 3000);
      push("Постпечать", "Нанесение переменных данных",
        circulation * Math.max(1, variableElements), "элем.", 1.5);
    }
    if (hasNumbering) push("Постпечать", "Нумерация", circulation, "шт", 1.2);
    if (hasQr) push("Постпечать", "QR-код (печать)", circulation, "шт", 1.8);

    // Контроль качества
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "шт", +(0.8 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, mode, material, printSheets, netSheets, printAreaM2,
    effectivePrintMode, colorsFront, colorsBack, twoSided, pantoneCount, whiteInk, printOnFinished,
    lamType, lam, optSoftTouch, optUvVarnish, optSpotVarnish, optEmboss, optCongrev, optFoil, embossAreaCm2,
    finishedW, finishedH, flapSize, biegovkaCount, itemsPerSheet, flashCoef,
    hasWindow, windowW, windowH, windowShape, windowFilmPricePerM2,
    glueType, glue, glueSeamLengthMm, hasAdhesiveStrip,
    hasPersonalization, variableElements, hasNumbering, hasQr,
    qcCoef, packKind, pack, circulation, hasDelivery, deliveryCost,
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
    if (mode === "scratch") s.push("Подготовка развёртки", "Раскладка", "Расчёт материала", "Резка закупочного листа");
    if (effectivePrintMode === "offset") s.push("Вывод печатных форм", "Приладка офсета", "Офсетная печать");
    else s.push(printOnFinished ? "Цифровая печать на готовом конверте" : "Цифровая печать");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optSoftTouch && lamType !== "soft") s.push("Soft-touch");
    if (optUvVarnish) s.push("УФ-лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optEmboss) s.push("Тиснение");
    if (optCongrev) s.push("Конгрев");
    if (optFoil) s.push("Фольгирование");
    if (mode === "scratch") {
      s.push("Высечка", "Удаление облоя");
      if (biegovkaCount > 0) s.push("Биговка");
    }
    if (hasWindow) s.push("Высечка окна", "Вклейка окна");
    if (mode === "scratch" && glueType !== "none") s.push(`Склейка конверта (${glue.label})`);
    if (hasAdhesiveStrip) s.push("Клеевая полоса");
    if (hasPersonalization) s.push("Персонализация");
    if (hasNumbering) s.push("Нумерация");
    if (hasQr) s.push("Печать QR");
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, mode, effectivePrintMode, printOnFinished, lamType, lam, optSoftTouch,
      optUvVarnish, optSpotVarnish, optEmboss, optCongrev, optFoil, biegovkaCount,
      hasWindow, glueType, glue, hasAdhesiveStrip, hasPersonalization, hasNumbering, hasQr,
      packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Mail className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Конверт</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                C6/C5/C4/DL, окно, клапан, склейка, печать на готовом или изготовление с нуля.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 75</Badge>
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
                    <Label>Тип конверта</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as EnvKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Изготовление</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as "finished" | "scratch")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scratch">С нуля (развёртка)</SelectItem>
                        <SelectItem value="finished">Печать на готовом</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Готовый Ш, мм</Label><Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} /></div>
                  <div><Label>Готовый В, мм</Label><Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} /></div>
                  {mode === "scratch" && (<>
                    <div><Label>Развёртка Ш, мм</Label><Input type="number" value={spreadW} onChange={(e) => setSpreadW(+e.target.value || 0)} /></div>
                    <div><Label>Развёртка В, мм</Label><Input type="number" value={spreadH} onChange={(e) => setSpreadH(+e.target.value || 0)} /></div>
                    <div><Label>Размер клапана, мм</Label><Input type="number" value={flapSize} onChange={(e) => setFlapSize(+e.target.value || 0)} /></div>
                  </>)}
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="two-sided" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two-sided" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} /></div>
                  {twoSided && (<div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>)}
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    На лист: <b>{itemsPerSheet}</b> · печ. листов: <b>{printSheets}</b>{" · "}
                    приладка: <b>{setupSheets}</b> · режим: <b>{effectivePrintMode}</b>{" · "}
                    {mode === "finished" ? "печать на готовом" : "изготовление с нуля"}
                    {" · "}коэф. QC: <b>×{qcCoef.toFixed(2)}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "construct", "window", "glue", "post", "personal", "ship"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>{mode === "scratch" ? "Бумага для развёртки" : "Готовый конверт из"}</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label} · {fmtMoney(m.pricePerSheet)}/лист · {fmtMoney(m.pricePerM2)}/м²
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Закупочный: <b>{material.sheetW}×{material.sheetH}</b> мм · {material.density} г/м²
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
                        <span className="flex items-center gap-2">4. Конструкция конверта
                          <Badge variant="outline" className="text-[10px]">{FLAPS.find((f) => f.value === flapType)?.label}</Badge>
                          {mode === "scratch" && <Badge variant="outline" className="text-[10px]">биг ×{biegovkaCount}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Тип клапана</Label>
                            <Select value={flapType} onValueChange={(v) => setFlapType(v as FlapType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FLAPS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Кол-во клапанов</Label><Input type="number" min={0} max={4} value={flapCount} onChange={(e) => setFlapCount(+e.target.value || 0)} /></div>
                          {mode === "scratch" && (
                            <div><Label>Кол-во бигов</Label><Input type="number" min={0} value={biegovkaCount} onChange={(e) => setBiegovkaCount(+e.target.value || 0)} /></div>
                          )}
                          <Row label="Клеевая полоса (силикон)" checked={hasAdhesiveStrip} onChange={setHasAdhesiveStrip} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="window">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Окно и плёнка
                          <Badge variant={hasWindow ? "default" : "outline"} className="text-[10px]">
                            {hasWindow ? `${windowW}×${windowH} мм (${windowShape})` : "без окна"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Окно с плёнкой" checked={hasWindow} onChange={setHasWindow} />
                          {hasWindow && (<>
                            <div><Label>Ширина окна, мм</Label><Input type="number" value={windowW} onChange={(e) => setWindowW(+e.target.value || 0)} /></div>
                            <div><Label>Высота окна, мм</Label><Input type="number" value={windowH} onChange={(e) => setWindowH(+e.target.value || 0)} /></div>
                            <div>
                              <Label>Форма окна</Label>
                              <Select value={windowShape} onValueChange={(v) => setWindowShape(v as "rect" | "rounded" | "shaped")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rect">Прямоугольное</SelectItem>
                                  <SelectItem value="rounded">Скруглённое</SelectItem>
                                  <SelectItem value="shaped">Фигурное</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Цена плёнки, тг/м²</Label><Input type="number" value={windowFilmPricePerM2} onChange={(e) => setWindowFilmPricePerM2(+e.target.value || 0)} /></div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {mode === "scratch" && (
                      <AccordionItem value="glue">
                        <AccordionTrigger>
                          <span className="flex items-center gap-2">6. Склейка
                            <Badge variant="outline" className="text-[10px]">{glue.label}</Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-3 sm:grid-cols-2 pt-2">
                            <div className="sm:col-span-2">
                              <Label>Тип клея</Label>
                              <Select value={glueType} onValueChange={(v) => setGlueType(v as GlueType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {GLUES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}{g.pricePerM ? ` (${fmtMoney(g.pricePerM)}/м + ${fmtMoney(g.install)}/шт)` : ""}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Длина клеевого шва, мм</Label><Input type="number" min={0} value={glueSeamLengthMm} onChange={(e) => setGlueSeamLengthMm(+e.target.value || 0)} /></div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    <AccordionItem value="personal">
                      <AccordionTrigger>7. Персонализация и нумерация</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Персонализация" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (
                            <div><Label>Переменных элементов на изделие</Label><Input type="number" min={1} value={variableElements} onChange={(e) => setVariableElements(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Нумерация" checked={hasNumbering} onChange={setHasNumbering} />
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
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
                productType="envelope"
                defaultName={`Конверт ${KINDS.find((k) => k.value === kind)?.label || ""} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-envelope" />
          
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
