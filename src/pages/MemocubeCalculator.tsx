import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Box } from "lucide-react";
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

/**
 * Шаблон «Кубарик / Блок для записей» — внутренний блок, печать листов,
 * подложка, ламинация, высечка, формирование, проклейка ПВА, подрезка блока,
 * печать по торцу, термоусадка и комплектовка. Доработка 70.
 */

type Kind = "simple" | "glued" | "backed" | "cashed_back" | "edge_print" | "shaped" | "premium";
const KINDS: { value: Kind; label: string }[] = [
  { value: "simple", label: "Простой кубарик" },
  { value: "glued", label: "С проклейкой ПВА" },
  { value: "backed", label: "С подложкой" },
  { value: "cashed_back", label: "С кашир. подложкой" },
  { value: "edge_print", label: "С боковой печатью" },
  { value: "shaped", label: "Фигурный блок" },
  { value: "premium", label: "Premium блок" },
];

type Paper = {
  value: string; label: string; type: string; density: number;
  sheetW: number; sheetH: number; pricePerSheet: number;
  designer?: boolean; premium?: boolean;
};
const PAPERS: Paper[] = [
  { value: "offset-70", label: "Офсетная 70 г", type: "offset", density: 70, sheetW: 700, sheetH: 1000, pricePerSheet: 18 },
  { value: "offset-80", label: "Офсетная 80 г", type: "offset", density: 80, sheetW: 700, sheetH: 1000, pricePerSheet: 22 },
  { value: "offset-90", label: "Офсетная 90 г", type: "offset", density: 90, sheetW: 700, sheetH: 1000, pricePerSheet: 26 },
  { value: "coated-100", label: "Мелованная 100 г", type: "coated", density: 100, sheetW: 720, sheetH: 1020, pricePerSheet: 34 },
  { value: "colored-80", label: "Цветная 80 г", type: "colored", density: 80, sheetW: 700, sheetH: 1000, pricePerSheet: 32 },
  { value: "kraft-90", label: "Крафт 90 г", type: "kraft", density: 90, sheetW: 700, sheetH: 1000, pricePerSheet: 28, designer: true },
  { value: "designer-100", label: "Дизайн. бумага 100 г", type: "designer", density: 100, sheetW: 700, sheetH: 1000, pricePerSheet: 68, designer: true },
  { value: "premium-120", label: "Premium 120 г", type: "designer", density: 120, sheetW: 700, sheetH: 1000, pricePerSheet: 110, designer: true, premium: true },
];

type Back = {
  value: string; label: string; thickness: number; pricePerSheet: number; sheetW: number; sheetH: number;
  microflute?: boolean; bind?: boolean; designer?: boolean;
};
const BACKS: Back[] = [
  { value: "none", label: "Без подложки", thickness: 0, pricePerSheet: 0, sheetW: 700, sheetH: 1000 },
  { value: "card-300", label: "Картон 300 г", thickness: 0.4, pricePerSheet: 80, sheetW: 700, sheetH: 1000 },
  { value: "card-400", label: "Картон 400 г", thickness: 0.5, pricePerSheet: 115, sheetW: 700, sheetH: 1000 },
  { value: "bind-1.5", label: "Переплётный 1.5 мм", thickness: 1.5, pricePerSheet: 200, sheetW: 700, sheetH: 1000, bind: true },
  { value: "bind-2", label: "Переплётный 2 мм", thickness: 2.0, pricePerSheet: 260, sheetW: 700, sheetH: 1000, bind: true },
  { value: "microflute-e", label: "Микрогофра E", thickness: 1.5, pricePerSheet: 130, sheetW: 720, sheetH: 1020, microflute: true },
  { value: "designer-300", label: "Дизайн. картон 300 г", thickness: 0.4, pricePerSheet: 220, sheetW: 700, sheetH: 1000, designer: true },
];

type LamType = "none" | "mat" | "gloss" | "soft";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 160 },
  { value: "gloss", label: "Глянцевая", price: 140 },
  { value: "soft", label: "Soft-touch", price: 340 },
];

type CashType = "none" | "auto" | "manual";
const CASHINGS: { value: CashType; label: string; pricePerM2: number }[] = [
  { value: "none", label: "Без кашировки", pricePerM2: 0 },
  { value: "auto", label: "Автоматическая", pricePerM2: 600 },
  { value: "manual", label: "Ручная", pricePerM2: 1400 },
];

type GlueType = "pva_auto" | "pva_manual" | "hotmelt" | "thermal";
const GLUES: { value: GlueType; label: string; pricePerM: number; pricePerItem: number; manual?: boolean }[] = [
  { value: "pva_auto", label: "ПВА (автомат)", pricePerM: 1.4, pricePerItem: 4 },
  { value: "pva_manual", label: "ПВА (ручная)", pricePerM: 1.2, pricePerItem: 14, manual: true },
  { value: "hotmelt", label: "Hotmelt", pricePerM: 2.2, pricePerItem: 5 },
  { value: "thermal", label: "Термоклей", pricePerM: 2.8, pricePerItem: 6 },
];

type PrintMode = "auto" | "digital" | "offset";

type PackKind = "none" | "stack" | "shrink" | "box" | "individual" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "stack", label: "В пачки по 25", price: 30, perPack: 25 },
  { value: "shrink", label: "Термоусадка (поштучно)", price: 14, perPack: 1 },
  { value: "box", label: "Коробка по 50", price: 220, perPack: 50 },
  { value: "individual", label: "Индивидуальная", price: 35, perPack: 1 },
  { value: "premium", label: "Premium упаковка", price: 180, perPack: 10 },
];

export default function MemocubeCalculator() {
  // Основные
  const [circulation, setCirculation] = useState(300);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<Kind>("glued");
  const [blockW, setBlockW] = useState(90);  // ширина блока, мм
  const [blockH, setBlockH] = useState(90);  // высота блока, мм
  const [stackH, setStackH] = useState(70);  // высота стопы, мм
  const [sheetsPerBlock, setSheetsPerBlock] = useState(700);
  const [blocksPerSet, setBlocksPerSet] = useState(1);
  const [leadDays, setLeadDays] = useState(7);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Внутренний блок
  const [paperKey, setPaperKey] = useState("offset-80");
  const [innerPrint, setInnerPrint] = useState(true);
  const [innerColors, setInnerColors] = useState(1);
  const [innerColorsBack, setInnerColorsBack] = useState(0);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [edgePrint, setEdgePrint] = useState(false);
  const [edgeSides, setEdgeSides] = useState(3);

  // Подложка
  const [backKey, setBackKey] = useState("none");
  const [backPrint, setBackPrint] = useState(false);
  const [backColors, setBackColors] = useState(4);
  const [backLam, setBackLam] = useState<LamType>("none");
  const [backCash, setBackCash] = useState<CashType>("none");
  const [backDieCut, setBackDieCut] = useState(false);

  // Постпечать
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optCongrev, setOptCongrev] = useState(false);
  const [embossAreaCm2, setEmbossAreaCm2] = useState(20);
  const [optShapeDieCut, setOptShapeDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);

  // Склейка
  const [glueType, setGlueType] = useState<GlueType>("pva_auto");
  const [glueSides, setGlueSides] = useState(1);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("shrink");
  const [hasShrink, setHasShrink] = useState(true);

  const paper = useMemo(() => PAPERS.find((p) => p.value === paperKey)!, [paperKey]);
  const back = useMemo(() => BACKS.find((b) => b.value === backKey)!, [backKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === backLam)!, [backLam]);
  const cashing = useMemo(() => CASHINGS.find((c) => c.value === backCash)!, [backCash]);
  const glue = useMemo(() => GLUES.find((g) => g.value === glueType)!, [glueType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу блока
  useEffect(() => {
    if (kind === "backed" && backKey === "none") setBackKey("card-300");
    if (kind === "cashed_back") {
      if (backKey === "none") setBackKey("bind-1.5");
      if (backCash === "none") setBackCash("auto");
    }
    if (kind === "edge_print") setEdgePrint(true);
    if (kind === "shaped") { setOptShapeDieCut(true); setOptDeflash(true); }
    if (kind === "premium") {
      setPaperKey((p) => (PAPERS.find((x) => x.value === p)?.premium ? p : "premium-120"));
      if (backKey === "none") setBackKey("designer-300");
      if (backCash === "none") setBackCash("auto");
      setOptSoftTouch(true); setOptEmboss(true);
      if (packKind === "none" || packKind === "shrink") setPackKind("premium");
    }
    if (kind === "glued" && glueType !== "pva_auto" && glueType !== "pva_manual") setGlueType("pva_auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (circulation * sheetsPerBlock >= 50000) return "offset";
    return "digital";
  }, [printMode, circulation, sheetsPerBlock]);

  // Premium-коэффициент сложности
  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (paper.premium) k += 0.15;
    if (paper.designer) k += 0.05;
    if (back.designer) k += 0.05;
    if (backLam === "soft" || optSoftTouch) k += 0.10;
    if (kind === "premium") k += 0.25;
    if (optEmboss) k += 0.05;
    if (optCongrev) k += 0.05;
    return +k.toFixed(2);
  }, [paper, back, backLam, optSoftTouch, kind, optEmboss, optCongrev]);

  // Раскладка листов блока на печатном листе
  const innerLayout = useMemo(() => {
    const wCell = blockW + 4;
    const hCell = blockH + 4;
    const sw = paper.sheetW, sh = paper.sheetH;
    const a = Math.floor(sw / wCell) * Math.floor(sh / hCell);
    const b = Math.floor(sw / hCell) * Math.floor(sh / wCell);
    const up = Math.max(1, a, b);
    const totalInnerSheets = Math.max(0, circulation * sheetsPerBlock);
    const netSheets = Math.ceil(totalInnerSheets / up);
    const setupOwn = innerColorsBack > 0 ? 0 : 150;
    const setupForeign = innerColorsBack > 0 ? 300 : 0;
    const setup = effectivePrintMode === "offset"
      ? (setupOwn + setupForeign) + Math.ceil(netSheets * 0.01)
      : 20;
    const printSheets = netSheets + setup;
    return { up, netSheets, printSheets, setup, totalInnerSheets };
  }, [paper, blockW, blockH, circulation, sheetsPerBlock, innerColorsBack, effectivePrintMode]);

  // Раскладка подложек
  const backLayout = useMemo(() => {
    if (backKey === "none") return { up: 0, sheets: 0, areaM2: 0, printSheets: 0, setup: 0 };
    const wCell = blockW + 8;
    const hCell = blockH + 8;
    const a = Math.floor(back.sheetW / wCell) * Math.floor(back.sheetH / hCell);
    const b = Math.floor(back.sheetW / hCell) * Math.floor(back.sheetH / wCell);
    const up = Math.max(1, a, b);
    const sheets = Math.ceil(circulation / up);
    const areaM2 = +((sheets * back.sheetW * back.sheetH) / 1_000_000).toFixed(3);
    const setup = backPrint && effectivePrintMode === "offset" ? 150 + Math.ceil(sheets * 0.01) : 20;
    const printSheets = sheets + (backPrint ? setup : 0);
    return { up, sheets, areaM2, printSheets, setup };
  }, [back, backKey, blockW, blockH, circulation, backPrint, effectivePrintMode]);

  // Длина клеевого шва на блок
  const glueSeamPerBlockM = useMemo(() => {
    const perimeter = 2 * (blockW + blockH); // мм
    const sideMm = (glueSides === 1 ? blockW : glueSides === 2 ? (blockW + blockH) : perimeter);
    return sideMm / 1000;
  }, [blockW, blockH, glueSides]);
  const glueSeamTotalM = useMemo(() => +(glueSeamPerBlockM * circulation).toFixed(2), [glueSeamPerBlockM, circulation]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн блока", Math.max(1, designsCount), "макет", 6000);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 1200);
    push("Препресс", "Раскладка", 1, "усл.", 1000);

    // Внутренний блок — бумага и резка
    push("Материалы", `${paper.label} (лист ${paper.sheetW}×${paper.sheetH})`,
      innerLayout.printSheets, "лист", paper.pricePerSheet);
    push("Препресс", "Резка закупочного на печатный", innerLayout.printSheets, "лист", 2);

    // Печать листов блока
    if (innerPrint) {
      if (effectivePrintMode === "offset") {
        const forms = (innerColors + pantoneCount) + (innerColorsBack > 0 ? (innerColorsBack + pantoneCount) : 0);
        push("Печать", "Печатные формы (блок)", forms * Math.max(1, designsCount), "форма", 1500);
        push("Печать", "Приладка офсета (блок)", 1, "усл.", innerLayout.setup * 5);
        push("Печать", "Офсетная печать листов", innerLayout.printSheets * (innerColorsBack > 0 ? 2 : 1), "оттиск", 5);
      } else {
        push("Печать", "Цифровая печать листов", innerLayout.printSheets * (innerColorsBack > 0 ? 2 : 1), "оттиск",
          +(28 + innerColors * 1.5).toFixed(2));
      }
    }

    // Подрезка листов на формат блока
    push("Постпечать", "Подрезка листов на формат", innerLayout.printSheets, "лист", 2);

    // Подложка
    if (backKey !== "none") {
      push("Материалы", `Подложка: ${back.label}`, backLayout.printSheets, "лист", back.pricePerSheet);
      push("Препресс", "Резка подложки", backLayout.printSheets, "лист", 2);
      if (backPrint) {
        if (effectivePrintMode === "offset") {
          push("Печать", "Печатные формы (подложка)", backColors * Math.max(1, designsCount), "форма", 1500);
          push("Печать", "Приладка офсета (подложка)", 1, "усл.", backLayout.setup * 5);
          push("Печать", "Офсетная печать подложки", backLayout.printSheets, "оттиск", 6);
        } else {
          push("Печать", "Цифровая печать подложки", backLayout.printSheets, "оттиск",
            +(32 + backColors * 1.5).toFixed(2));
        }
      }
      if (backLam !== "none") {
        push("Постпечать", `Ламинация подложки: ${lam.label}`, backLayout.areaM2, "м²", lam.price);
        push("Постпечать", "Приладка ламинации", 1, "усл.", 800);
      }
      if (backCash !== "none") {
        push("Постпечать", `Кашировка подложки: ${cashing.label}`, backLayout.areaM2, "м²",
          +(cashing.pricePerM2 * (backCash === "manual" ? premiumCoef : 1)).toFixed(2));
        push("Постпечать", "Приладка кашировки", 1, "усл.", 2500);
      }
      if (backDieCut || kind === "shaped") {
        push("Постпечать", "Штамп высечки подложки", Math.max(1, designsCount), "шт", 6000);
        push("Постпечать", "Приладка высечки подложки", 1, "усл.", 2000);
        push("Постпечать", "Высечка подложки", backLayout.printSheets, "лист", +(8 * premiumCoef).toFixed(2));
      }
    }

    // Фигурный блок: высечка листов + удаление облоя
    if (optShapeDieCut) {
      push("Постпечать", "Штамп высечки блока", Math.max(1, designsCount), "шт", 9000);
      push("Постпечать", "Приладка высечки блока", 1, "усл.", 2500);
      push("Постпечать", "Высечка листов", innerLayout.printSheets, "лист", +(10 * premiumCoef).toFixed(2));
      if (optDeflash) push("Постпечать", "Удаление облоя",
        circulation * sheetsPerBlock, "лист", 0.05);
    }

    // Soft-touch (если не выбран в ламинации)
    if (optSoftTouch && backLam !== "soft" && backKey !== "none") {
      push("Постпечать", "Soft-touch подложки", backLayout.areaM2, "м²", 360);
    }

    // Тиснение / конгрев — обычно по подложке
    if (optEmboss) {
      const cliche = Math.max(5000, embossAreaCm2 * 200);
      push("Постпечать", "Клише тиснения", 1, "шт", cliche);
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Тиснение", circulation, "оттиск", +(22 * premiumCoef).toFixed(2));
    }
    if (optCongrev) {
      const cliche = Math.max(8000, embossAreaCm2 * 350);
      push("Постпечать", "Клише конгрева", 1, "шт", cliche);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1800);
      push("Постпечать", "Конгрев", circulation, "оттиск", +(28 * premiumCoef).toFixed(2));
    }

    // Формирование блока (укладка стопы)
    const formCoef = kind === "premium" ? 1.5 : back.bind || back.microflute ? 1.3 : 1.0;
    push("Постпечать", `Формирование блока${formCoef > 1 ? ` (×${formCoef.toFixed(2)})` : ""}`,
      circulation, "блок", +(6 * formCoef).toFixed(2));

    // Проклейка ПВА
    if (kind !== "simple" || glueType !== "pva_auto") {
      // если "простой" не имеет проклейки — пропускаем
      const handCoef = glue.manual ? 1.4 : 1.0;
      push("Постпечать", "Приладка проклейки", 1, "усл.", 1500);
      push("Постпечать", `Клей: ${glue.label}`, glueSeamTotalM, "пог.м", +(glue.pricePerM * handCoef).toFixed(2));
      push("Постпечать", "Работа по проклейке блоков", circulation, "блок", +(glue.pricePerItem * handCoef).toFixed(2));
    }

    // Подрезка блока после проклейки
    const cutsPerBlock = edgePrint ? 4 : 3;
    push("Постпечать", "Подрезка блока", circulation * cutsPerBlock, "рез", 1.5);

    // Печать по торцу
    if (edgePrint) {
      push("Постпечать", "Приладка печати по торцу", 1, "усл.", 2500);
      push("Постпечать", `Печать по торцу (${edgeSides} стор.)`,
        circulation * Math.max(1, edgeSides), "сторона", +(8 * premiumCoef).toFixed(2));
    }

    // Термоусадка
    if (hasShrink) {
      push("Упаковка", "Термоусадка", circulation, "блок", 6);
    }

    // Комплектовка
    if (blocksPerSet > 1) {
      const sets = Math.max(1, Math.ceil(circulation / blocksPerSet));
      push("Упаковка", `Комплектовка по ${blocksPerSet} шт`, sets, "комплект", 25);
    }

    // Контроль качества
    const qcCoef = (kind !== "simple" ? 1.2 : 1.0) * (edgePrint ? 1.2 : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      circulation, "блок", +(1.5 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none" && packKind !== "shrink") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, paper, innerLayout, innerPrint, innerColors, innerColorsBack, pantoneCount,
    effectivePrintMode, backKey, back, backLayout, backPrint, backColors,
    backLam, lam, backCash, cashing, backDieCut, premiumCoef, kind,
    optShapeDieCut, optDeflash, sheetsPerBlock,
    optSoftTouch, optEmboss, optCongrev, embossAreaCm2,
    glueType, glue, glueSeamTotalM, edgePrint, edgeSides,
    hasShrink, blocksPerSet, packKind, pack, hasDelivery, deliveryCost, circulation,
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
    s.push("Проверка макета", "Раскладка", "Расчёт бумаги", "Резка закупочного");
    if (innerPrint) {
      if (effectivePrintMode === "offset") s.push("Вывод печатных форм", "Приладка офсета", "Офсетная печать листов");
      else s.push("Цифровая печать листов");
    }
    if (backKey !== "none") {
      s.push("Подготовка подложки");
      if (backPrint) s.push(effectivePrintMode === "offset" ? "Офсетная печать подложки" : "Цифровая печать подложки");
      if (backLam !== "none") s.push(`Ламинация подложки: ${lam.label}`);
      if (backCash !== "none") s.push(`Кашировка подложки: ${cashing.label}`);
      if (backDieCut || kind === "shaped") s.push("Высечка подложки");
    }
    if (optShapeDieCut) s.push("Высечка листов");
    if (optDeflash) s.push("Удаление облоя");
    if (optEmboss) s.push("Тиснение");
    if (optCongrev) s.push("Конгрев");
    s.push("Подрезка листов", "Формирование блока");
    if (kind !== "simple" || glueType !== "pva_auto") s.push(`Проклейка (${glue.label})`);
    s.push("Подрезка блока");
    if (edgePrint) s.push("Печать по торцу");
    if (hasShrink) s.push("Термоусадка");
    if (blocksPerSet > 1) s.push("Комплектовка");
    s.push("Контроль качества");
    if (packKind !== "none" && packKind !== "shrink") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, innerPrint, effectivePrintMode, backKey, backPrint, backLam, lam, backCash, cashing,
      backDieCut, kind, optShapeDieCut, optDeflash, optEmboss, optCongrev, glueType, glue,
      edgePrint, hasShrink, blocksPerSet, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Box className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Кубарик / Блок для записей</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Внутренний блок, подложка, проклейка ПВА, подрезка, печать торца, термоусадка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 70</Badge>
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
                    <Label>Тип блока</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина блока, мм</Label><Input type="number" value={blockW} onChange={(e) => setBlockW(+e.target.value || 0)} /></div>
                  <div><Label>Высота блока, мм</Label><Input type="number" value={blockH} onChange={(e) => setBlockH(+e.target.value || 0)} /></div>
                  <div><Label>Высота стопы, мм</Label><Input type="number" value={stackH} onChange={(e) => setStackH(+e.target.value || 0)} /></div>
                  <div><Label>Листов в блоке</Label><Input type="number" min={1} value={sheetsPerBlock} onChange={(e) => setSheetsPerBlock(+e.target.value || 1)} /></div>
                  <div><Label>Блоков в комплекте</Label><Input type="number" min={1} value={blocksPerSet} onChange={(e) => setBlocksPerSet(+e.target.value || 1)} /></div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
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
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    Листов всего: <b>{innerLayout.totalInnerSheets.toLocaleString("ru-RU")}</b> · На лист: <b>{innerLayout.up}</b> · печ. листов: <b>{innerLayout.printSheets}</b>
                    {" · "}режим: <b>{effectivePrintMode}</b>{back.value !== "none" && <> · подложек: <b>{backLayout.printSheets}</b></>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["inner", "back", "print", "post", "glue", "ship"]} className="w-full">
                    <AccordionItem value="inner">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Внутренний блок
                          <Badge variant="secondary" className="text-[10px]">{paper.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Бумага блока</Label>
                            <Select value={paperKey} onValueChange={setPaperKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PAPERS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerSheet)}/лист)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Row label="Печать на листах" checked={innerPrint} onChange={setInnerPrint} />
                          {innerPrint && (<>
                            <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={innerColors} onChange={(e) => setInnerColors(+e.target.value || 0)} /></div>
                            <div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={innerColorsBack} onChange={(e) => setInnerColorsBack(+e.target.value || 0)} /></div>
                            <div><Label>Pantone</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          </>)}
                          <Row label="Печать по торцу" checked={edgePrint} onChange={setEdgePrint} />
                          {edgePrint && <div><Label>Сторон печати торца</Label><Input type="number" min={1} max={4} value={edgeSides} onChange={(e) => setEdgeSides(+e.target.value || 1)} /></div>}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="back">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Подложка
                          <Badge variant={backKey !== "none" ? "default" : "outline"} className="text-[10px]">{back.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Материал подложки</Label>
                            <Select value={backKey} onValueChange={setBackKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {BACKS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}{b.pricePerSheet ? ` (${fmtMoney(b.pricePerSheet)}/лист)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {backKey !== "none" && (<>
                            <Row label="Печать подложки" checked={backPrint} onChange={setBackPrint} />
                            {backPrint && <div><Label>Цветность подложки</Label><Input type="number" min={0} max={8} value={backColors} onChange={(e) => setBackColors(+e.target.value || 0)} /></div>}
                            <div>
                              <Label>Ламинация подложки</Label>
                              <Select value={backLam} onValueChange={(v) => setBackLam(v as LamType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/м²)` : ""}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Кашировка подложки</Label>
                              <Select value={backCash} onValueChange={(v) => setBackCash(v as CashType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CASHINGS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}{c.pricePerM2 ? ` (${fmtMoney(c.pricePerM2)}/м²)` : ""}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <Row label="Высечка подложки" checked={backDieCut} onChange={setBackDieCut} />
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="post">
                      <AccordionTrigger>4. Постпечатные операции</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Soft-touch (доп.)" checked={optSoftTouch} onChange={setOptSoftTouch} />
                          <Row label="Тиснение" checked={optEmboss} onChange={setOptEmboss} />
                          <Row label="Конгрев" checked={optCongrev} onChange={setOptCongrev} />
                          {(optEmboss || optCongrev) && (
                            <div className="sm:col-span-2">
                              <Label>Площадь клише, см²</Label>
                              <Input type="number" min={1} value={embossAreaCm2} onChange={(e) => setEmbossAreaCm2(+e.target.value || 1)} />
                            </div>
                          )}
                          <Row label="Фигурная высечка блока" checked={optShapeDieCut} onChange={setOptShapeDieCut} />
                          <Row label="Удаление облоя" checked={optDeflash} onChange={setOptDeflash} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="glue">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Проклейка
                          <Badge variant="outline" className="text-[10px]">{glue.label} · {glueSides} стор.</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип клея</Label>
                            <Select value={glueType} onValueChange={(v) => setGlueType(v as GlueType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GLUES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label} ({fmtMoney(g.pricePerM)}/м + {fmtMoney(g.pricePerItem)}/блок)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Сторон проклейки</Label>
                            <Select value={String(glueSides)} onValueChange={(v) => setGlueSides(+v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 (верх)</SelectItem>
                                <SelectItem value="2">2 (верх + бок)</SelectItem>
                                <SelectItem value="4">4 (по периметру)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Клеевой шов: <b>{glueSeamTotalM} пог.м</b> · Премиум коэф.: <b>×{premiumCoef.toFixed(2)}</b>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>6. Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Термоусадка (поштучно)" checked={hasShrink} onChange={setHasShrink} />
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
                <CardHeader><CardTitle className="text-sm">7. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                  <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="kubus"
                defaultName={`Кубарик ${blockW}×${blockH}×${stackH} · ${sheetsPerBlock} л. · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

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