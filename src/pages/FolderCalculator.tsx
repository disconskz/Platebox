import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";
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
 * Шаблон «Папка» — конструктивное изделие с биговкой, высечкой,
 * карманами, клапанами, склейкой и фурнитурой. Доработка 61.
 */

type FormatOpt = { value: string; label: string; w: number; h: number };
const FORMATS: FormatOpt[] = [
  { value: "a4", label: "A4 220×310 (готовая)", w: 220, h: 310 },
  { value: "a4plus", label: "A4+ 230×320", w: 230, h: 320 },
  { value: "a5", label: "A5 160×220", w: 160, h: 220 },
  { value: "euro", label: "Евро 110×220", w: 110, h: 220 },
  { value: "square", label: "Квадрат 240×240", w: 240, h: 240 },
  { value: "custom", label: "Свой размер", w: 220, h: 310 },
];

type Material = {
  value: string; label: string; type: string;
  density: number; thickMm: number;
  sheetW: number; sheetH: number; pricePerSheet: number; premium?: boolean;
};
const MATERIALS: Material[] = [
  { value: "coated250", label: "Мелованный картон 250 г/м²", type: "coated", density: 250, thickMm: 0.30, sheetW: 620, sheetH: 940, pricePerSheet: 90 },
  { value: "coated300", label: "Мелованный картон 300 г/м²", type: "coated", density: 300, thickMm: 0.36, sheetW: 620, sheetH: 940, pricePerSheet: 110 },
  { value: "coated350", label: "Мелованный картон 350 г/м²", type: "coated", density: 350, thickMm: 0.42, sheetW: 620, sheetH: 940, pricePerSheet: 130 },
  { value: "designer300", label: "Дизайнерский картон 300 г/м²", type: "designer", density: 300, thickMm: 0.40, sheetW: 720, sheetH: 1020, pricePerSheet: 240, premium: true },
  { value: "designer350", label: "Дизайнерский картон 350 г/м²", type: "designer", density: 350, thickMm: 0.46, sheetW: 720, sheetH: 1020, pricePerSheet: 280, premium: true },
  { value: "kraft300", label: "Крафт-картон 300 г/м²", type: "kraft", density: 300, thickMm: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 95 },
  { value: "bookbind1mm", label: "Переплётный картон 1.0 мм", type: "bookbind", density: 700, thickMm: 1.0, sheetW: 700, sheetH: 1000, pricePerSheet: 220, premium: true },
  { value: "plastic", label: "Пластик ПП 0.5 мм", type: "plastic", density: 500, thickMm: 0.5, sheetW: 700, sheetH: 1000, pricePerSheet: 320, premium: true },
];

type FolderKind =
  | "plain" | "pocket1" | "pocket2" | "flap" | "bizcut" | "spine"
  | "elastic" | "rings" | "magnet" | "kashed" | "lozhement" | "premium" | "custom";
const KINDS: { value: FolderKind; label: string; complexity: number }[] = [
  { value: "plain", label: "Простая (без кармана)", complexity: 1.0 },
  { value: "pocket1", label: "С 1 карманом", complexity: 1.2 },
  { value: "pocket2", label: "С 2 карманами", complexity: 1.4 },
  { value: "flap", label: "С клапанами", complexity: 1.3 },
  { value: "bizcut", label: "С прорезью под визитку", complexity: 1.2 },
  { value: "spine", label: "С корешком", complexity: 1.3 },
  { value: "elastic", label: "На резинке", complexity: 1.5 },
  { value: "rings", label: "На кольцах", complexity: 1.6 },
  { value: "magnet", label: "С магнитом", complexity: 1.5 },
  { value: "kashed", label: "Кашированная (на переплётном картоне)", complexity: 1.7 },
  { value: "lozhement", label: "С ложементом", complexity: 1.7 },
  { value: "premium", label: "Premium", complexity: 1.8 },
  { value: "custom", label: "Нестандартная конструкция", complexity: 1.5 },
];

type LamType = "none" | "mat" | "gloss" | "soft" | "antiscratch";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 220 },
  { value: "gloss", label: "Глянцевая", price: 200 },
  { value: "soft", label: "Soft-touch", price: 380 },
  { value: "antiscratch", label: "Anti-scratch", price: 420 },
];

type GlueType = "none" | "pva" | "hotmelt" | "tape" | "manual" | "auto";
const GLUES: { value: GlueType; label: string; pricePerM: number; perItem: number }[] = [
  { value: "none", label: "Без склейки", pricePerM: 0, perItem: 0 },
  { value: "pva", label: "ПВА", pricePerM: 4, perItem: 2 },
  { value: "hotmelt", label: "Hotmelt", pricePerM: 6, perItem: 2.5 },
  { value: "tape", label: "Двусторонний скотч", pricePerM: 12, perItem: 1.5 },
  { value: "manual", label: "Ручная склейка", pricePerM: 0, perItem: 6 },
  { value: "auto", label: "Автоматическая склейка", pricePerM: 3, perItem: 1.2 },
];

type PackKind = "none" | "bag" | "shrink" | "box" | "premium";
const PACKS: { value: PackKind; label: string; price: number }[] = [
  { value: "none", label: "Без индивидуальной упаковки", price: 0 },
  { value: "bag", label: "Пакет", price: 8 },
  { value: "shrink", label: "Термоусадка", price: 4 },
  { value: "box", label: "Коробка", price: 35 },
  { value: "premium", label: "Premium упаковка", price: 120 },
];

export default function FolderCalculator() {
  // 3.1 Основные
  const [presetKey, setPresetKey] = useState("a4");
  const [customW, setCustomW] = useState(220);
  const [customH, setCustomH] = useState(310);
  const [circulation, setCirculation] = useState(300);
  const [kind, setKind] = useState<FolderKind>("pocket1");
  const [spineMm, setSpineMm] = useState(5);
  const [hasSpine, setHasSpine] = useState(false);
  const [margin, setMargin] = useState(35);
  const [vatPercent] = useState(16);
  const [leadDays, setLeadDays] = useState(7);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [ownTurn, setOwnTurn] = useState(true);

  // 3.3 Материал / 3.4 Печать
  const [materialKey, setMaterialKey] = useState("coated300");
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(0);
  const [pantoneCount, setPantoneCount] = useState(0);

  // 3.5 Конструкция
  const [pocketCount, setPocketCount] = useState(1);
  const [pocketW, setPocketW] = useState(220);
  const [pocketH, setPocketH] = useState(100);
  const [hasFlap, setHasFlap] = useState(false);
  const [flapCount, setFlapCount] = useState(1);
  const [hasBizCut, setHasBizCut] = useState(false);
  const [bizCutCount, setBizCutCount] = useState(2);
  const [hasHoles, setHasHoles] = useState(false);
  const [holesCount, setHolesCount] = useState(2);

  // 3.6 Постпечать
  const [lamType, setLamType] = useState<LamType>("mat");
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [spotVarnishAreaCm2, setSpotVarnishAreaCm2] = useState(80);
  const [optStamp, setOptStamp] = useState(false);
  const [stampAreaCm2, setStampAreaCm2] = useState(40);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optDieCut, setOptDieCut] = useState(true);
  const [optDeflash, setOptDeflash] = useState(true);
  const [optBig, setOptBig] = useState(true);
  const [bigsCount, setBigsCount] = useState(2);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);

  // Склейка
  const [glueType, setGlueType] = useState<GlueType>("pva");
  const [glueSeamM, setGlueSeamM] = useState(0.25);

  // Фурнитура
  const [optElastic, setOptElastic] = useState(false);
  const [optEyelets, setOptEyelets] = useState(false);
  const [eyeletsCount, setEyeletsCount] = useState(2);
  const [optRings, setOptRings] = useState(false);
  const [optMagnet, setOptMagnet] = useState(false);
  const [magnetCount, setMagnetCount] = useState(1);

  // Кашировка
  const [optKashirovka, setOptKashirovka] = useState(false);
  const [kashPricePerM2, setKashPricePerM2] = useState(420);
  const [kashBoardKey, setKashBoardKey] = useState("bookbind1mm");

  // Ложемент
  const [optLozhement, setOptLozhement] = useState(false);
  const [lozhementType, setLozhementType] = useState<"foam" | "eva" | "cardboard" | "velvet">("foam");
  const [lozhementAreaCm2, setLozhementAreaCm2] = useState(450);
  const [lozhementAssemblyPrice, setLozhementAssemblyPrice] = useState(35);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("none");

  const format = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[0], [presetKey]);
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;
  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const glue = useMemo(() => GLUES.find((g) => g.value === glueType)!, [glueType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);
  const kindCfg = useMemo(() => KINDS.find((k) => k.value === kind)!, [kind]);

  // Автологика по типу
  useEffect(() => {
    if (kind === "pocket1") { setPocketCount(1); }
    if (kind === "pocket2") { setPocketCount(2); }
    if (kind === "spine") { setHasSpine(true); }
    if (kind === "elastic") { setOptElastic(true); setHasHoles(true); }
    if (kind === "rings") { setOptRings(true); setHasHoles(true); }
    if (kind === "flap") { setHasFlap(true); }
    if (kind === "bizcut") { setHasBizCut(true); }
    if (kind === "premium") {
      if (lamType === "none") setLamType("soft");
      setOptStamp(true);
    }
    if (kind === "magnet") setOptMagnet(true);
    if (kind === "kashed") {
      setOptKashirovka(true);
      if (!material.premium) setMaterialKey("bookbind1mm");
    }
    if (kind === "lozhement") setOptLozhement(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Биговка обязательна для плотных материалов / при наличии сгибов
  useEffect(() => {
    if (material.density >= 250 || hasSpine || hasFlap || pocketCount > 0) {
      setOptBig(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialKey, hasSpine, hasFlap, pocketCount]);

  // Высечка → автоматически удаление облоя
  useEffect(() => { if (optDieCut && !optDeflash) setOptDeflash(true); }, [optDieCut, optDeflash]);

  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 300);

  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.1;
    if (lamType === "soft" || lamType === "antiscratch") k += 0.1;
    if (optStamp) k += 0.05;
    if (optEmboss) k += 0.05;
    if (lamType === "soft" && optStamp) k += 0.05;
    if (kind === "premium") k += 0.1;
    return +k.toFixed(2);
  }, [material, lamType, optStamp, optEmboss, kind]);

  // Развёртка папки: ширина = 2*itemW + корешок + клапан + карман-припуски
  const spreadW = useMemo(() => {
    let w = itemW * 2;
    if (hasSpine) w += spineMm;
    if (hasFlap) w += 80 * flapCount;
    return w;
  }, [itemW, hasSpine, spineMm, hasFlap, flapCount]);
  const spreadH = useMemo(() => {
    let h = itemH;
    if (pocketCount > 0) h = Math.max(h, itemH + pocketH);
    return h;
  }, [itemH, pocketCount, pocketH]);

  // Раскладка
  const layout = useMemo(() => {
    const sw = material.sheetW, sh = material.sheetH;
    const a = Math.floor(sw / spreadW) * Math.floor(sh / spreadH);
    const b = Math.floor(sw / spreadH) * Math.floor(sh / spreadW);
    const up = Math.max(1, a, b);
    const net = Math.ceil(circulation / up);
    const setup = offset ? (ownTurn ? 150 : 300) + Math.ceil(net * 0.01) : 20;
    return { up, net, printSheets: net + setup, areaM2: (spreadW * spreadH) / 1_000_000 };
  }, [material, spreadW, spreadH, circulation, offset, ownTurn]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн папки", 1, "усл.", 12000);
    push("Препресс", "Проверка и спуск полос", 1, "усл.", 1500);

    // Материал
    push("Материалы", `Материал: ${material.label}`, layout.printSheets, "лист", material.pricePerSheet);

    // Резка закупочного на печатный (если больше формата машины 520×740)
    if (material.sheetW > 720 || material.sheetH > 1020) {
      push("Препресс", "Резка закупочного листа", layout.printSheets, "лист", 0.4);
    }

    // Печать
    if (offset) {
      let forms = Math.max(colorFront, 0) + Math.max(colorBack, 0);
      if (!ownTurn && colorFront > 0 && colorBack > 0) forms = colorFront + colorBack; // чужой оборот: суммируем
      forms += pantoneCount;
      push("Печать", "Печатные формы", forms, "форма", 1500);
      const setupCost = (ownTurn ? 150 : 300) + Math.ceil(layout.printSheets * 0.01);
      push("Печать", "Приладка", 1, "усл.", setupCost);
    }
    push("Печать", offset ? "Печать (офсет)" : "Печать (цифра)",
      layout.printSheets, "лист", offset ? 7 : 38);

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`,
        +(layout.areaM2 * layout.printSheets).toFixed(3), "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }
    if (optVarnish) push("Постпечать", "УФ/ВД-лак", layout.printSheets, "лист", 6);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 3500);
      push("Постпечать", "Приладка выб. лака", 1, "усл.", 1500);
      const areaM2 = (spotVarnishAreaCm2 / 10000) * circulation;
      push("Постпечать", "Выборочный лак", +areaM2.toFixed(3), "м²", 1200);
    }
    if (optStamp) {
      push("Постпечать", "Клише тиснения", 1, "усл.", Math.max(2500, stampAreaCm2 * 80));
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Фольга (площадь)",
        +((stampAreaCm2 / 10000) * circulation).toFixed(3), "м²", 1800);
      push("Постпечать", "Тиснение фольгой (нанесение)",
        circulation, "оттиск", +(Math.max(8, stampAreaCm2 * 0.6) * premiumCoef).toFixed(2));
    }
    if (optEmboss) {
      push("Постпечать", "Клише конгрева", 1, "усл.", 3800);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1500);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", +(14 * premiumCoef).toFixed(2));
    }

    // Высечка
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", 8500);
      push("Постпечать", "Приладка высечки", 1, "усл.", 2000);
      push("Постпечать", "Высечка", layout.printSheets, "лист", 5);
      if (optDeflash) {
        push("Постпечать", "Удаление облоя",
          layout.printSheets * layout.up, "изд.", +(1.2 * premiumCoef).toFixed(2));
      }
    }
    // Биговка
    if (optBig) {
      push("Сборка", "Биговка", circulation * Math.max(1, bigsCount), "биг", 1.6);
      push("Сборка", "Приладка биговки", 1, "усл.", 800);
    }
    // Скругление
    if (optRound) push("Постпечать", "Скругление углов", circulation * roundCorners, "угол", 0.8);

    // Прорезь под визитку (если не покрывается высечкой)
    if (hasBizCut && !optDieCut) {
      push("Постпечать", "Прорезь под визитку", circulation * bizCutCount, "прорезь", 1.5);
      push("Постпечать", "Приладка прорези", 1, "усл.", 800);
    }

    // Склейка / сборка
    if (glueType !== "none" && (pocketCount > 0 || hasFlap || kind === "custom")) {
      const seamM = glueSeamM * Math.max(1, pocketCount + (hasFlap ? flapCount : 0));
      if (glue.pricePerM > 0)
        push("Сборка", `Склейка: ${glue.label} (шов)`, +(seamM * circulation).toFixed(2), "м", glue.pricePerM);
      push("Сборка", `Склейка: ${glue.label} (работа)`, circulation, "изд.", glue.perItem);
    }

    // Фурнитура
    if (hasHoles) {
      push("Сборка", "Отверстия (пробивка)", circulation * holesCount, "отв.", 0.6);
    }
    if (optEyelets) {
      push("Фурнитура", "Люверс (материал)", circulation * eyeletsCount, "шт.", 1.5);
      push("Фурнитура", "Установка люверсов", circulation * eyeletsCount, "шт.", 2.5);
    }
    if (optElastic) {
      push("Фурнитура", "Резинка (материал)", circulation, "шт.", 8);
      push("Фурнитура", "Установка резинки", circulation, "шт.", 6);
    }
    if (optRings) {
      push("Фурнитура", "Кольцевой механизм (материал)", circulation, "шт.", 85);
      push("Фурнитура", "Установка механизма", circulation, "шт.", 15);
    }
    if (optMagnet) {
      push("Фурнитура", "Магнит (материал)", circulation * magnetCount, "шт.", 12);
      push("Фурнитура", "Установка магнита", circulation * magnetCount, "шт.", 6);
    }

    // Кашировка
    if (optKashirovka) {
      const board = MATERIALS.find((m) => m.value === kashBoardKey) ?? material;
      const boardSheets = Math.max(1, Math.ceil(circulation / Math.max(1, layout.up)));
      push("Материалы", `Переплётный картон: ${board.label}`, boardSheets, "лист", board.pricePerSheet);
      const kashM2 = +(layout.areaM2 * circulation).toFixed(3);
      push("Постпечать", "Приладка кашировки", 1, "усл.", 2500);
      push("Постпечать", "Кашировка", kashM2, "м²", kashPricePerM2);
    }

    // Ложемент
    if (optLozhement) {
      const lozhM2 = +((lozhementAreaCm2 / 10000) * circulation).toFixed(3);
      const matPrice =
        lozhementType === "foam" ? 280 :
        lozhementType === "eva" ? 480 :
        lozhementType === "velvet" ? 720 : 180;
      push("Материалы", `Материал ложемента (${lozhementType})`, lozhM2, "м²", matPrice);
      push("Постпечать", "Высечка ложемента", circulation, "изд.", 3.5);
      push("Сборка", "Сборка ложемента", circulation, "изд.", lozhementAssemblyPrice);
    }

    // Финальная сборка
    const assemblyPrice = +(8 * kindCfg.complexity * premiumCoef).toFixed(2);
    push("Сборка", `Финальная сборка (×${kindCfg.complexity})`, circulation, "изд.", assemblyPrice);

    // Контроль и упаковка
    push("Логистика", "Контроль качества", circulation, "изд.", 1.5);
    if (packKind !== "none") push("Упаковка", `Индивидуальная: ${pack.label}`, circulation, "шт.", pack.price);
    push("Логистика", "Упаковка тиража в пачки", circulation, "шт.", 2);
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [hasDesign, material, layout, offset, ownTurn, colorFront, colorBack, pantoneCount,
      lamType, lam, optVarnish, optSpotVarnish, spotVarnishAreaCm2, optStamp, stampAreaCm2,
      optEmboss, optDieCut, optDeflash, optBig, bigsCount, optRound, roundCorners,
      hasBizCut, bizCutCount, glueType, glue, glueSeamM, pocketCount, hasFlap, flapCount,
      hasHoles, holesCount, optEyelets, eyeletsCount, optElastic, optRings, optMagnet, magnetCount,
      optKashirovka, kashBoardKey, kashPricePerM2,
      optLozhement, lozhementType, lozhementAreaCm2, lozhementAssemblyPrice,
      kind, kindCfg, premiumCoef, circulation, hasDelivery, deliveryCost, packKind, pack]);

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
    s.push("Проверка макета", "Подбор печатного формата и раскладка", "Расчёт материала");
    if (material.sheetW > 720 || material.sheetH > 1020) s.push("Резка закупочного листа");
    if (offset) s.push("Вывод печатных форм", "Приладка");
    s.push(offset ? "Печать (офсет)" : "Печать (цифра)");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optVarnish) s.push("УФ/ВД-лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optStamp) s.push("Тиснение фольгой");
    if (optEmboss) s.push("Конгрев");
    if (optDieCut) { s.push("Высечка"); if (optDeflash) s.push("Удаление облоя"); }
    if (optBig) s.push("Биговка");
    if (hasBizCut && !optDieCut) s.push("Прорезь под визитку");
    if (glueType !== "none" && (pocketCount > 0 || hasFlap || kind === "custom")) s.push(`Склейка: ${glue.label}`);
    if (hasHoles) s.push("Пробивка отверстий");
    if (optEyelets) s.push("Люверсы");
    if (optElastic) s.push("Установка резинки");
    if (optRings) s.push("Установка кольцевого механизма");
    if (optMagnet) s.push("Установка магнитов");
    if (optRound) s.push("Скругление углов");
    if (optKashirovka) s.push("Кашировка на переплётный картон");
    if (optLozhement) s.push("Изготовление и установка ложемента");
    s.push("Финальная сборка", "Контроль качества");
    if (packKind !== "none") s.push(`Индивидуальная упаковка: ${pack.label}`);
    s.push("Упаковка тиража");
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, material, offset, lamType, lam, optVarnish, optSpotVarnish, optStamp, optEmboss,
      optDieCut, optDeflash, optBig, hasBizCut, glueType, glue, pocketCount, hasFlap, kind,
      hasHoles, optEyelets, optElastic, optRings, optMagnet, optRound,
      optKashirovka, optLozhement, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <FolderOpen className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Папка</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Конструктивное изделие: карманы, клапаны, корешок, биговка, высечка, склейка, фурнитура.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 81</Badge>
        </PageHeaderRow>
      </PageHeader>

      <PageMain>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Готовый формат папки</Label>
                    <Select value={presetKey} onValueChange={setPresetKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  {presetKey === "custom" && (<>
                    <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 0)} /></div>
                    <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 0)} /></div>
                  </>)}
                  <div>
                    <Label>Тип папки</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as FolderKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground self-end">
                    Развёртка: <b>{spreadW}×{spreadH}</b> мм · коэф. сложности ×{kindCfg.complexity}
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="spine" checked={hasSpine} onCheckedChange={(v) => setHasSpine(!!v)} />
                    <Label htmlFor="spine" className="cursor-pointer">Есть корешок</Label>
                  </div>
                  {hasSpine && (
                    <div><Label>Ширина корешка, мм</Label><Input type="number" min={1} value={spineMm} onChange={(e) => setSpineMm(+e.target.value || 1)} /></div>
                  )}
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
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="ownturn" checked={ownTurn} onCheckedChange={(v) => setOwnTurn(!!v)} />
                    <Label htmlFor="ownturn" className="cursor-pointer">Свой оборот</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "construction", "postpress"]} className="w-full">
                    {/* Материал и печать */}
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал и печать
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Материал папки</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerSheet)}/лист){m.premium ? " · premium" : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Плотность, г/м²</Label><Input value={material.density} readOnly /></div>
                          <div><Label>Толщина, мм</Label><Input value={material.thickMm} readOnly /></div>
                          <div><Label>Цветность (лицо)</Label><Input type="number" min={0} max={6} value={colorFront} onChange={(e) => setColorFront(+e.target.value || 0)} /></div>
                          <div><Label>Цветность (оборот)</Label><Input type="number" min={0} max={6} value={colorBack} onChange={(e) => setColorBack(+e.target.value || 0)} /></div>
                          <div><Label>Pantone-красок</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          <div className="sm:col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            На лист: <b>{layout.up}</b> шт. · Полезных листов: <b>{layout.net}</b> · С приладкой: <b>{layout.printSheets}</b>.
                            Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>.
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Конструкция */}
                    <AccordionItem value="construction">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Конструкция папки
                          <Badge variant="outline" className="text-[10px]">
                            карманов: {pocketCount} · клапанов: {hasFlap ? flapCount : 0}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Карманов</Label><Input type="number" min={0} max={2} value={pocketCount} onChange={(e) => setPocketCount(+e.target.value || 0)} /></div>
                          {pocketCount > 0 && (<>
                            <div><Label>Ширина кармана, мм</Label><Input type="number" value={pocketW} onChange={(e) => setPocketW(+e.target.value || 0)} /></div>
                            <div><Label>Высота кармана, мм</Label><Input type="number" value={pocketH} onChange={(e) => setPocketH(+e.target.value || 0)} /></div>
                          </>)}
                          <div className="sm:col-span-2 space-y-2 text-sm">
                            <Row label="Клапаны" checked={hasFlap} onChange={setHasFlap}>
                              <Input className="h-8 w-20" type="number" min={1} max={3} value={flapCount} onChange={(e) => setFlapCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">шт.</span>
                            </Row>
                            <Row label="Прорезь под визитку" checked={hasBizCut} onChange={setHasBizCut}>
                              <Input className="h-8 w-20" type="number" min={1} max={4} value={bizCutCount} onChange={(e) => setBizCutCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">шт.</span>
                            </Row>
                            <Row label="Отверстия (для резинки / колец)" checked={hasHoles} onChange={setHasHoles}>
                              <Input className="h-8 w-20" type="number" min={1} value={holesCount} onChange={(e) => setHolesCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">шт.</span>
                            </Row>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Постпечать */}
                    <AccordionItem value="postpress">
                      <AccordionTrigger>4. Постпечатные операции</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Ламинация</Label>
                            <Select value={lamType} onValueChange={(v) => setLamType(v as LamType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}{l.price ? ` (${fmtMoney(l.price)}/м²)` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 space-y-2 text-sm">
                            <Row label="УФ / ВД-лак" checked={optVarnish} onChange={setOptVarnish} />
                            <Row label="Выборочный лак" checked={optSpotVarnish} onChange={setOptSpotVarnish}>
                              <Input className="h-8 w-24" type="number" min={1} value={spotVarnishAreaCm2} onChange={(e) => setSpotVarnishAreaCm2(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">см²/изд.</span>
                            </Row>
                            <Row label="Тиснение фольгой" checked={optStamp} onChange={setOptStamp}>
                              <Input className="h-8 w-24" type="number" min={1} value={stampAreaCm2} onChange={(e) => setStampAreaCm2(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">см² клише</span>
                            </Row>
                            <Row label="Конгрев" checked={optEmboss} onChange={setOptEmboss} />
                            <Row label="Высечка (штамп)" checked={optDieCut} onChange={setOptDieCut} />
                            <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                            <Row label="Биговка" checked={optBig} onChange={setOptBig}>
                              <Input className="h-8 w-20" type="number" min={1} value={bigsCount} onChange={(e) => setBigsCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">бигов/изд.</span>
                            </Row>
                            <Row label="Скругление углов" checked={optRound} onChange={setOptRound}>
                              <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">угла</span>
                            </Row>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Склейка / сборка */}
                    <AccordionItem value="glue">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Склейка и сборка
                          <Badge variant={glueType !== "none" ? "default" : "outline"} className="text-[10px]">{glue.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип склейки</Label>
                            <Select value={glueType} onValueChange={(v) => setGlueType(v as GlueType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GLUES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {glueType !== "none" && (
                            <div><Label>Длина клеевого шва, м/изд.</Label>
                              <Input type="number" step={0.01} min={0} value={glueSeamM} onChange={(e) => setGlueSeamM(+e.target.value || 0)} />
                            </div>
                          )}
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Финальная сборка добавляется автоматически с коэффициентом сложности типа папки (×{kindCfg.complexity}).
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Фурнитура */}
                    <AccordionItem value="hardware">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Фурнитура
                          <Badge variant="outline" className="text-[10px]">
                            {[optElastic && "резинка", optRings && "кольца", optMagnet && "магнит", optEyelets && "люверсы"].filter(Boolean).join(", ") || "—"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <div className="sm:col-span-2 space-y-2">
                            <Row label="Резинка" checked={optElastic} onChange={setOptElastic} />
                            <Row label="Люверсы" checked={optEyelets} onChange={setOptEyelets}>
                              <Input className="h-8 w-20" type="number" min={1} value={eyeletsCount} onChange={(e) => setEyeletsCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">шт./изд.</span>
                            </Row>
                            <Row label="Кольцевой механизм" checked={optRings} onChange={setOptRings} />
                            <Row label="Магниты" checked={optMagnet} onChange={setOptMagnet}>
                              <Input className="h-8 w-20" type="number" min={1} value={magnetCount} onChange={(e) => setMagnetCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">шт./изд.</span>
                            </Row>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Кашировка и ложемент */}
                    <AccordionItem value="kashlozh">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">7. Кашировка и ложемент
                          {optKashirovka && <Badge variant="outline" className="text-[10px]">кашировка</Badge>}
                          {optLozhement && <Badge variant="outline" className="text-[10px]">ложемент</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <div className="sm:col-span-2 space-y-2">
                            <Row label="Кашировка на переплётный картон" checked={optKashirovka} onChange={setOptKashirovka} />
                          </div>
                          {optKashirovka && (<>
                            <div className="sm:col-span-2">
                              <Label>Переплётный картон</Label>
                              <Select value={kashBoardKey} onValueChange={setKashBoardKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MATERIALS.filter((m) => m.type === "bookbind" || m.thickMm >= 0.5).map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label} · {fmtMoney(m.pricePerSheet)}/лист</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Цена кашировки, ₸/м²</Label>
                              <Input type="number" min={0} value={kashPricePerM2} onChange={(e) => setKashPricePerM2(+e.target.value || 0)} /></div>
                          </>)}
                          <div className="sm:col-span-2 space-y-2 pt-2">
                            <Row label="Ложемент" checked={optLozhement} onChange={setOptLozhement} />
                          </div>
                          {optLozhement && (<>
                            <div>
                              <Label>Тип ложемента</Label>
                              <Select value={lozhementType} onValueChange={(v) => setLozhementType(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="foam">Поролон</SelectItem>
                                  <SelectItem value="eva">EVA</SelectItem>
                                  <SelectItem value="cardboard">Картон</SelectItem>
                                  <SelectItem value="velvet">Бархат / флок</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Площадь ложемента, см²</Label>
                              <Input type="number" min={1} value={lozhementAreaCm2} onChange={(e) => setLozhementAreaCm2(+e.target.value || 1)} /></div>
                            <div><Label>Сборка ложемента, ₸/изд.</Label>
                              <Input type="number" min={0} value={lozhementAssemblyPrice} onChange={(e) => setLozhementAssemblyPrice(+e.target.value || 0)} /></div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Упаковка / доставка */}
                    <AccordionItem value="ship">
                      <AccordionTrigger>8. Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Индивидуальная упаковка</Label>
                            <Select value={packKind} onValueChange={(v) => setPackKind(v as PackKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PACKS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}{p.price ? ` · ${fmtMoney(p.price)}/шт` : ""}</SelectItem>)}
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
                defaultName={`Папка ${kindCfg.label} ${circulation} шт`}
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