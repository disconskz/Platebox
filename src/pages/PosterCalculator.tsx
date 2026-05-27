import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
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
import { fmtMoney, fmtNum } from "@/lib/format";
import TemplateActions from "@/components/calc/TemplateActions";

/**
 * Доработка 40 — выделенный шаблон «Афиша».
 * Доработка 58 — расширение «Плакат / постер»: UV / сольвент / экосольвент / latex,
 * кашировка, карманы, тубус, тиснение/конгрев, soft-touch, индивидуальная упаковка.
 * Технология подбирается автоматически по формату/тиражу/материалу или вручную.
 */

type PosterFormat = { value: string; label: string; w: number; h: number; bigFormat: boolean };

const POSTER_FORMATS: PosterFormat[] = [
  { value: "A3", label: "A3 (297×420)", w: 297, h: 420, bigFormat: false },
  { value: "A2", label: "A2 (420×594)", w: 420, h: 594, bigFormat: false },
  { value: "A1", label: "A1 (594×841)", w: 594, h: 841, bigFormat: true },
  { value: "A0", label: "A0 (841×1189)", w: 841, h: 1189, bigFormat: true },
  { value: "B2", label: "B2 (500×707)", w: 500, h: 707, bigFormat: false },
  { value: "B1", label: "B1 (707×1000)", w: 707, h: 1000, bigFormat: true },
  { value: "500x700", label: "500×700 мм", w: 500, h: 700, bigFormat: false },
  { value: "700x1000", label: "700×1000 мм", w: 700, h: 1000, bigFormat: true },
  { value: "custom", label: "Свой размер", w: 600, h: 900, bigFormat: false },
];

type MaterialKind = "coated" | "poster" | "photo" | "synthetic" | "banner" | "film" | "backlit" | "canvas" | "pvc" | "foamboard" | "composite";

const MATERIALS: { value: MaterialKind; label: string; pricePerM2: number; isRoll: boolean; supportsOffset: boolean; defaultDensity?: number }[] = [
  { value: "coated", label: "Мелованная бумага", pricePerM2: 80, isRoll: false, supportsOffset: true, defaultDensity: 150 },
  { value: "poster", label: "Постерная бумага", pricePerM2: 90, isRoll: true, supportsOffset: true, defaultDensity: 130 },
  { value: "photo", label: "Фотобумага", pricePerM2: 350, isRoll: true, supportsOffset: false, defaultDensity: 200 },
  { value: "synthetic", label: "Синтетическая бумага", pricePerM2: 280, isRoll: true, supportsOffset: false, defaultDensity: 180 },
  { value: "banner", label: "Баннер (440 г/м²)", pricePerM2: 350, isRoll: true, supportsOffset: false, defaultDensity: 440 },
  { value: "film", label: "Самоклеящаяся плёнка", pricePerM2: 450, isRoll: true, supportsOffset: false },
  { value: "backlit", label: "Backlit", pricePerM2: 700, isRoll: true, supportsOffset: false },
  { value: "canvas", label: "Canvas (холст)", pricePerM2: 1100, isRoll: true, supportsOffset: false },
  { value: "pvc", label: "ПВХ-лист", pricePerM2: 1800, isRoll: false, supportsOffset: false },
  { value: "foamboard", label: "Пенокартон", pricePerM2: 900, isRoll: false, supportsOffset: false },
  { value: "composite", label: "Композит", pricePerM2: 2500, isRoll: false, supportsOffset: false },
];

type PrintTech = "auto" | "digital" | "offset" | "wide" | "interior" | "uv" | "solvent" | "ecosolvent" | "latex";

const TECH_LABEL: Record<Exclude<PrintTech, "auto">, string> = {
  digital: "Цифровая печать",
  offset: "Офсетная печать",
  wide: "Широкоформатная печать",
  interior: "Интерьерная печать",
  uv: "UV-печать",
  solvent: "Сольвентная печать",
  ecosolvent: "Экосольвентная печать",
  latex: "Latex печать",
};

// Стоимость печати по технологиям
const PRINT_PRICE = {
  digital_perSheet: 120,   // тг/лист (A3-A2)
  offset_perSheet: 35,     // тг/печ. лист
  offset_setup: 4500,      // приладка
  offset_plate: 2800,      // 1 пластина
  wide_perM2: 1800,        // тг/м²
  interior_perM2: 4500,    // тг/м² (фото-качество)
  uv_perM2: 5500,          // тг/м² (UV)
  solvent_perM2: 1500,     // тг/м²
  ecosolvent_perM2: 2200,  // тг/м²
  latex_perM2: 3200,       // тг/м²
};

type Line = { stage: string; name: string; quantity: number; unit: string; unitPrice: number; total: number };

export default function PosterCalculator() {
  const [circulation, setCirculation] = useState(50);
  const [presetKey, setPresetKey] = useState("A2");
  const [customW, setCustomW] = useState(600);
  const [customH, setCustomH] = useState(900);
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(0);
  const [materialKind, setMaterialKind] = useState<MaterialKind>("coated");
  const [printTech, setPrintTech] = useState<PrintTech>("auto");
  const [interiorQuality, setInteriorQuality] = useState(false);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [margin, setMargin] = useState(35);
  const [vatPercent, setVatPercent] = useState(16);

  // Постпечатные опции
  const [optLam, setOptLam] = useState(false);
  const [lamType, setLamType] = useState<"matt" | "gloss" | "outdoor" | "antiscratch" | "softtouch">("matt");
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotUV, setOptSpotUV] = useState(false);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optKongrev, setOptKongrev] = useState(false);
  const [optCashir, setOptCashir] = useState(false);
  const [optGrommet, setOptGrommet] = useState(false);
  const [grommetCount, setGrommetCount] = useState(4);
  const [optPocket, setOptPocket] = useState(false);
  const [pocketCount, setPocketCount] = useState(1);
  const [optMount, setOptMount] = useState(false);
  const [mountBase, setMountBase] = useState<"pvc" | "foamboard" | "composite">("pvc");
  const [optPlotter, setOptPlotter] = useState(false);
  const [plotterLengthM, setPlotterLengthM] = useState(2);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);
  const [optBig, setOptBig] = useState(false);
  const [bigCount, setBigCount] = useState(1);
  const [optFold, setOptFold] = useState(false);
  const [foldCount, setFoldCount] = useState(2);
  const [optTube, setOptTube] = useState(false);
  const [tubePrice, setTubePrice] = useState(450);
  const [optCustomPack, setOptCustomPack] = useState(false);
  const [customPackKind, setCustomPackKind] = useState<"bag" | "tube" | "box" | "shrink">("box");

  const preset = useMemo(() => POSTER_FORMATS.find((f) => f.value === presetKey) ?? POSTER_FORMATS[0], [presetKey]);
  const itemSize = useMemo(() => (preset.value === "custom" ? { w: customW, h: customH } : { w: preset.w, h: preset.h }), [preset, customW, customH]);
  const itemAreaM2 = (itemSize.w * itemSize.h) / 1_000_000;

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKind)!, [materialKind]);

  // Авто-подбор технологии печати (ТЗ §6)
  const resolvedTech: Exclude<PrintTech, "auto"> = useMemo(() => {
    if (printTech !== "auto") return printTech;
    if (["banner", "film", "pvc"].includes(materialKind)) return "wide";
    if (interiorQuality || ["photo", "canvas", "backlit"].includes(materialKind)) return "interior";
    if (preset.bigFormat) return "wide";
    if (circulation >= 300 && material.supportsOffset) return "offset";
    return "digital";
  }, [printTech, materialKind, interiorQuality, preset.bigFormat, circulation, material]);

  // Если материал несовместим с офсетом — скрываем (ТЗ §14): принудительно перекидываем.
  const techDisplayed = resolvedTech === "offset" && !material.supportsOffset ? "wide" : resolvedTech;

  // Авто-добавление зависимых операций (ТЗ §14)
  useEffect(() => {
    if (optDieCut && !optDeflash) setOptDeflash(true);
  }, [optDieCut, optDeflash]);

  const lines = useMemo<Line[]>(() => {
    const out: Line[] = [];
    if (hasDesign) out.push({ stage: "prepress", name: "Дизайн", quantity: 1, unit: "шт", unitPrice: 5000, total: 5000 });
    out.push({ stage: "prepress", name: "Проверка макета", quantity: 1, unit: "шт", unitPrice: 800, total: 800 });

    const totalAreaM2 = itemAreaM2 * circulation;

    const wideLike = ["wide", "interior", "uv", "solvent", "ecosolvent", "latex"] as const;
    const isWideLike = (wideLike as readonly string[]).includes(techDisplayed);

    // Печать + материал
    if (isWideLike) {
      // Широкоформатная / интерьерная — расчёт по м² с учётом отходов 10%
      const areaWithWaste = totalAreaM2 * 1.1;
      const matCost = areaWithWaste * material.pricePerM2;
      out.push({ stage: "material", name: `${material.label} (с учётом отходов 10%)`, quantity: Math.round(areaWithWaste * 100) / 100, unit: "м²", unitPrice: material.pricePerM2, total: matCost });
      const printPrice =
        techDisplayed === "interior" ? PRINT_PRICE.interior_perM2 :
        techDisplayed === "uv" ? PRINT_PRICE.uv_perM2 :
        techDisplayed === "solvent" ? PRINT_PRICE.solvent_perM2 :
        techDisplayed === "ecosolvent" ? PRINT_PRICE.ecosolvent_perM2 :
        techDisplayed === "latex" ? PRINT_PRICE.latex_perM2 :
        PRINT_PRICE.wide_perM2;
      out.push({ stage: "print", name: TECH_LABEL[techDisplayed], quantity: Math.round(totalAreaM2 * 100) / 100, unit: "м²", unitPrice: printPrice, total: totalAreaM2 * printPrice });
    } else if (techDisplayed === "offset") {
      // Офсет — листовая печать
      const sheets = Math.ceil(circulation * 1.05); // 5% отходов
      const matCost = totalAreaM2 * 1.1 * material.pricePerM2;
      out.push({ stage: "material", name: material.label, quantity: Math.round(totalAreaM2 * 1.1 * 100) / 100, unit: "м²", unitPrice: material.pricePerM2, total: matCost });
      const plates = colorFront + colorBack;
      out.push({ stage: "prepress", name: "Вывод печатных форм", quantity: plates, unit: "пл", unitPrice: PRINT_PRICE.offset_plate, total: plates * PRINT_PRICE.offset_plate });
      const setupBase = 150;
      const setup = setupBase + 0.01 * sheets;
      out.push({ stage: "print", name: "Приладка офсет", quantity: 1, unit: "шт", unitPrice: PRINT_PRICE.offset_setup + setup, total: PRINT_PRICE.offset_setup + setup });
      out.push({ stage: "print", name: "Офсетная печать", quantity: sheets, unit: "лист", unitPrice: PRINT_PRICE.offset_perSheet, total: sheets * PRINT_PRICE.offset_perSheet });
    } else {
      // Цифровая печать
      const matCost = totalAreaM2 * 1.1 * material.pricePerM2;
      out.push({ stage: "material", name: material.label, quantity: Math.round(totalAreaM2 * 1.1 * 100) / 100, unit: "м²", unitPrice: material.pricePerM2, total: matCost });
      out.push({ stage: "print", name: "Цифровая печать", quantity: circulation, unit: "лист", unitPrice: PRINT_PRICE.digital_perSheet, total: circulation * PRINT_PRICE.digital_perSheet });
    }

    // Резка готовой продукции — обязательная
    {
      const cuts = 4;
      const price = isWideLike ? 6 : 2;
      out.push({ stage: "postpress", name: "Резка готовой продукции", quantity: circulation * cuts, unit: "рез", unitPrice: price, total: circulation * cuts * price });
    }

    const setup = 1500;

    // Ламинация
    if (optLam) {
      const price = lamType === "outdoor" ? 220 : lamType === "antiscratch" ? 260 : lamType === "softtouch" ? 320 : lamType === "gloss" ? 140 : 130;
      out.push({ stage: "postpress", name: `Ламинация (${lamType}) — приладка`, quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Ламинация (${lamType})`, quantity: Math.round(totalAreaM2 * 100) / 100, unit: "м²", unitPrice: price, total: totalAreaM2 * price });
    }
    // УФ/ВД лак — только для листовой (digital/offset)
    if (optVarnish && (techDisplayed === "digital" || techDisplayed === "offset")) {
      out.push({ stage: "postpress", name: "УФ-лак (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "УФ-лак", quantity: circulation, unit: "лист", unitPrice: 10, total: circulation * 10 });
    }
    // Выборочный УФ-лак
    if (optSpotUV && (techDisplayed === "digital" || techDisplayed === "offset")) {
      out.push({ stage: "postpress", name: "Выборочный УФ-лак (приладка + форма)", quantity: 1, unit: "шт", unitPrice: setup + 9000, total: setup + 9000 });
      out.push({ stage: "postpress", name: "Выборочный УФ-лак", quantity: circulation, unit: "лист", unitPrice: 18, total: circulation * 18 });
    }
    // Тиснение фольгой
    if (optEmboss) {
      const foilArea = Math.max(0.001, itemAreaM2 * 0.05); // ~5% площади
      const foilPrice = 1400; // тг/м² фольги
      const clichePrice = 12000;
      out.push({ stage: "postpress", name: "Тиснение (клише + приладка)", quantity: 1, unit: "шт", unitPrice: setup + clichePrice, total: setup + clichePrice });
      out.push({ stage: "postpress", name: "Фольга для тиснения", quantity: Math.round(foilArea * circulation * 1000) / 1000, unit: "м²", unitPrice: foilPrice, total: foilArea * circulation * foilPrice });
      out.push({ stage: "postpress", name: "Нанесение тиснения", quantity: circulation, unit: "лист", unitPrice: 8, total: circulation * 8 });
    }
    // Конгрев
    if (optKongrev) {
      const clichePrice = 10000;
      out.push({ stage: "postpress", name: "Конгрев (клише + приладка)", quantity: 1, unit: "шт", unitPrice: setup + clichePrice, total: setup + clichePrice });
      out.push({ stage: "postpress", name: "Нанесение конгрева", quantity: circulation, unit: "лист", unitPrice: 6, total: circulation * 6 });
    }
    // Кашировка
    if (optCashir) {
      const price = 950; // тг/м²
      out.push({ stage: "postpress", name: "Кашировка (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Кашировка", quantity: Math.round(totalAreaM2 * 100) / 100, unit: "м²", unitPrice: price, total: totalAreaM2 * price });
    }
    // Люверсы
    if (optGrommet) {
      const price = 35;
      const total = circulation * grommetCount * price;
      out.push({ stage: "postpress", name: "Пробивка люверсов (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Люверсы (${grommetCount} шт/изд)`, quantity: circulation * grommetCount, unit: "шт", unitPrice: price, total });
    }
    // Карманы
    if (optPocket) {
      const price = 180;
      out.push({ stage: "postpress", name: "Установка карманов (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: `Карманы (${pocketCount} шт/изд)`, quantity: circulation * pocketCount, unit: "шт", unitPrice: price, total: circulation * pocketCount * price });
    }
    // Накатка на основу
    if (optMount) {
      const baseLabel = mountBase === "pvc" ? "ПВХ" : mountBase === "foamboard" ? "пенокартон" : "композит";
      const basePrice = mountBase === "pvc" ? 1800 : mountBase === "foamboard" ? 900 : 2500;
      const mountPrice = 1500; // тг/м² накатки
      out.push({ stage: "postpress", name: `Накатка на ${baseLabel} (приладка)`, quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "material", name: `Основа: ${baseLabel}`, quantity: Math.round(totalAreaM2 * 100) / 100, unit: "м²", unitPrice: basePrice, total: totalAreaM2 * basePrice });
      out.push({ stage: "postpress", name: "Накатка", quantity: Math.round(totalAreaM2 * 100) / 100, unit: "м²", unitPrice: mountPrice, total: totalAreaM2 * mountPrice });
    }
    // Плоттерная резка
    if (optPlotter) {
      const price = 250; // тг/м
      const totalM = plotterLengthM * circulation;
      out.push({ stage: "postpress", name: "Плоттерная резка (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
      out.push({ stage: "postpress", name: "Плоттерная резка", quantity: totalM, unit: "м", unitPrice: price, total: totalM * price });
    }
    // Высечка + удаление облоя
    if (optDieCut) {
      const sheets = circulation;
      out.push({ stage: "postpress", name: "Высечка (приладка + штамп)", quantity: 1, unit: "шт", unitPrice: setup + 12000, total: setup + 12000 });
      out.push({ stage: "postpress", name: "Высечка", quantity: sheets, unit: "лист", unitPrice: 4, total: sheets * 4 });
      if (optDeflash) {
        out.push({ stage: "postpress", name: "Удаление облоя (приладка)", quantity: 1, unit: "шт", unitPrice: setup, total: setup });
        out.push({ stage: "postpress", name: "Удаление облоя", quantity: sheets, unit: "лист", unitPrice: 2, total: sheets * 2 });
      }
    }
    if (optRound) {
      const corners = Math.max(1, roundCorners);
      out.push({ stage: "postpress", name: `Скругление углов (${corners})`, quantity: circulation * corners, unit: "угол", unitPrice: 0.8, total: circulation * corners * 0.8 });
    }
    if (optBig) {
      out.push({ stage: "postpress", name: `Биговка (${bigCount} лин.)`, quantity: circulation * bigCount, unit: "биг", unitPrice: 1.5, total: circulation * bigCount * 1.5 });
    }
    if (optFold) {
      out.push({ stage: "postpress", name: `Фальцовка (${foldCount} сгибов)`, quantity: circulation, unit: "изд", unitPrice: 2 + foldCount, total: circulation * (2 + foldCount) });
    }

    // QC + упаковка
    out.push({ stage: "qc", name: "Контроль качества", quantity: 1, unit: "шт", unitPrice: 500, total: 500 });
    out.push({ stage: "pack", name: "Упаковка", quantity: 1, unit: "шт", unitPrice: 700, total: 700 });
    if (optTube) {
      out.push({ stage: "pack", name: "Упаковка в тубус", quantity: circulation, unit: "шт", unitPrice: tubePrice, total: circulation * tubePrice });
    }
    if (optCustomPack) {
      const label = customPackKind === "bag" ? "Пакет" : customPackKind === "tube" ? "Тубус" : customPackKind === "shrink" ? "Термоусадка" : "Коробка";
      const price = customPackKind === "bag" ? 80 : customPackKind === "tube" ? 450 : customPackKind === "shrink" ? 60 : 350;
      out.push({ stage: "pack", name: `Индивидуальная упаковка: ${label}`, quantity: circulation, unit: "шт", unitPrice: price, total: circulation * price });
    }
    if (hasDelivery) out.push({ stage: "delivery", name: "Доставка", quantity: 1, unit: "шт", unitPrice: deliveryCost, total: deliveryCost });

    return out;
  }, [
    hasDesign, circulation, itemAreaM2, techDisplayed, material, colorFront, colorBack,
    optLam, lamType, optVarnish, optSpotUV, optEmboss, optKongrev, optCashir,
    optGrommet, grommetCount, optPocket, pocketCount, optMount, mountBase,
    optPlotter, plotterLengthM, optDieCut, optDeflash, optRound, roundCorners,
    optBig, bigCount, optFold, foldCount, optTube, tubePrice, optCustomPack, customPackKind,
    hasDelivery, deliveryCost,
  ]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.total, 0);
    const sale = cost * (1 + Math.max(0, margin) / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [lines, margin, vatPercent, circulation]);

  // Маршрут (динамика)
  const route = useMemo(() => {
    const steps: string[] = [];
    if (hasDesign) steps.push("Дизайн");
    steps.push("Проверка макета");
    steps.push("Подбор материала");
    steps.push(`Подбор технологии: ${TECH_LABEL[techDisplayed]}`);
    if (techDisplayed === "digital" || techDisplayed === "offset") steps.push("Подбор раскладки");
    steps.push("Материал");
    if (techDisplayed === "offset") { steps.push("Вывод печатных форм"); steps.push("Приладка"); }
    steps.push(TECH_LABEL[techDisplayed]);
    if (optLam) steps.push("Ламинация");
    if (optVarnish && (techDisplayed === "digital" || techDisplayed === "offset")) steps.push("Лакировка");
    if (optSpotUV && (techDisplayed === "digital" || techDisplayed === "offset")) steps.push("Выборочный УФ-лак");
    if (optEmboss) steps.push("Тиснение");
    if (optKongrev) steps.push("Конгрев");
    if (optCashir) steps.push("Кашировка");
    if (optMount) steps.push("Накатка на основу");
    if (optGrommet) steps.push("Пробивка люверсов");
    if (optPocket) steps.push("Установка карманов");
    if (optPlotter) steps.push("Плоттерная резка");
    if (optDieCut) { steps.push("Высечка"); if (optDeflash) steps.push("Удаление облоя"); }
    if (optRound) steps.push("Скругление углов");
    if (optBig) steps.push("Биговка");
    if (optFold) steps.push("Фальцовка");
    steps.push("Резка готовой продукции");
    steps.push("Контроль качества");
    steps.push("Упаковка");
    if (optTube) steps.push("Упаковка в тубус");
    if (optCustomPack) steps.push("Индивидуальная упаковка");
    if (hasDelivery) steps.push("Доставка");
    return steps;
  }, [hasDesign, techDisplayed, optLam, optVarnish, optSpotUV, optEmboss, optKongrev, optCashir,
    optMount, optGrommet, optPocket, optPlotter, optDieCut, optDeflash, optRound, optBig, optFold,
    optTube, optCustomPack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageContainer>
          <PageHeaderRow>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link to="/app"><ArrowLeft className="h-4 w-4 mr-1" />Назад</Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Шаблон: Плакат / постер</h1>
                <p className="text-xs text-muted-foreground">Офсет / цифра / широкоформат / интерьер / UV / сольвент / latex. Доработка 58.</p>
              </div>
            </div>
            <Badge variant="secondary">{TECH_LABEL[techDisplayed]}</Badge>
          </PageHeaderRow>
        </PageContainer>
      </PageHeader>

      <PageMain>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Основные параметры</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Тираж</Label>
                  <Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Формат</Label>
                  <Select value={presetKey} onValueChange={setPresetKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSTER_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {preset.value === "custom" && (
                  <>
                    <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value) || 0)} /></div>
                    <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value) || 0)} /></div>
                  </>
                )}
                <div>
                  <Label>Цветность лицо</Label>
                  <Input type="number" min={0} max={6} value={colorFront} onChange={(e) => setColorFront(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Цветность оборот</Label>
                  <Input type="number" min={0} max={6} value={colorBack} onChange={(e) => setColorBack(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Материал</Label>
                  <Select value={materialKind} onValueChange={(v) => setMaterialKind(v as MaterialKind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Технология</Label>
                  <Select value={printTech} onValueChange={(v) => setPrintTech(v as PrintTech)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Авто</SelectItem>
                      <SelectItem value="digital">Цифровая</SelectItem>
                      <SelectItem value="offset" disabled={!material.supportsOffset}>Офсетная</SelectItem>
                      <SelectItem value="wide">Широкоформатная</SelectItem>
                      <SelectItem value="interior">Интерьерная</SelectItem>
                      <SelectItem value="uv">UV-печать</SelectItem>
                      <SelectItem value="solvent">Сольвентная</SelectItem>
                      <SelectItem value="ecosolvent">Экосольвентная</SelectItem>
                      <SelectItem value="latex">Latex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox id="iq" checked={interiorQuality} onCheckedChange={(v) => setInteriorQuality(!!v)} />
                  <Label htmlFor="iq">Интерьерное качество</Label>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox id="hd" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                  <Label htmlFor="hd">Нужен дизайн</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Маршрут</CardTitle></CardHeader>
              <CardContent>
                <ol className="text-sm space-y-1 list-decimal pl-5">
                  {route.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Постпечатные / монтаж</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="lam" checked={optLam} onCheckedChange={(v) => setOptLam(!!v)} />
                    <Label htmlFor="lam">Ламинация</Label>
                  </div>
                  {optLam && (
                    <Select value={lamType} onValueChange={(v) => setLamType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="matt">Матовая</SelectItem>
                        <SelectItem value="gloss">Глянцевая</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="antiscratch">Anti-scratch</SelectItem>
                        <SelectItem value="softtouch">Soft-touch</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="var" checked={optVarnish} onCheckedChange={(v) => setOptVarnish(!!v)} disabled={techDisplayed !== "digital" && techDisplayed !== "offset"} />
                  <Label htmlFor="var">УФ / ВД лак (только листовая)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="spuv" checked={optSpotUV} onCheckedChange={(v) => setOptSpotUV(!!v)} disabled={techDisplayed !== "digital" && techDisplayed !== "offset"} />
                  <Label htmlFor="spuv">Выборочный УФ-лак</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="emb" checked={optEmboss} onCheckedChange={(v) => setOptEmboss(!!v)} />
                  <Label htmlFor="emb">Тиснение фольгой</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="kng" checked={optKongrev} onCheckedChange={(v) => setOptKongrev(!!v)} />
                  <Label htmlFor="kng">Конгрев</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="cas" checked={optCashir} onCheckedChange={(v) => setOptCashir(!!v)} />
                  <Label htmlFor="cas">Кашировка</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="gr" checked={optGrommet} onCheckedChange={(v) => setOptGrommet(!!v)} />
                    <Label htmlFor="gr">Люверсы</Label>
                  </div>
                  {optGrommet && (
                    <Input type="number" min={1} value={grommetCount} onChange={(e) => setGrommetCount(Number(e.target.value) || 0)} placeholder="шт на изделие" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="pk" checked={optPocket} onCheckedChange={(v) => setOptPocket(!!v)} />
                    <Label htmlFor="pk">Карманы</Label>
                  </div>
                  {optPocket && (
                    <Input type="number" min={1} value={pocketCount} onChange={(e) => setPocketCount(Number(e.target.value) || 0)} placeholder="шт на изделие" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="mt" checked={optMount} onCheckedChange={(v) => setOptMount(!!v)} />
                    <Label htmlFor="mt">Накатка на основу</Label>
                  </div>
                  {optMount && (
                    <Select value={mountBase} onValueChange={(v) => setMountBase(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pvc">ПВХ</SelectItem>
                        <SelectItem value="foamboard">Пенокартон</SelectItem>
                        <SelectItem value="composite">Композит</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="plt" checked={optPlotter} onCheckedChange={(v) => setOptPlotter(!!v)} />
                    <Label htmlFor="plt">Плоттерная резка</Label>
                  </div>
                  {optPlotter && <Input type="number" min={0} step={0.1} value={plotterLengthM} onChange={(e) => setPlotterLengthM(Number(e.target.value) || 0)} placeholder="метров на изделие" />}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dc" checked={optDieCut} onCheckedChange={(v) => setOptDieCut(!!v)} />
                  <Label htmlFor="dc">Высечка (+ удаление облоя авто)</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="rc" checked={optRound} onCheckedChange={(v) => setOptRound(!!v)} />
                    <Label htmlFor="rc">Скругление углов</Label>
                  </div>
                  {optRound && <Input type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(Number(e.target.value) || 0)} />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="big" checked={optBig} onCheckedChange={(v) => setOptBig(!!v)} />
                    <Label htmlFor="big">Биговка</Label>
                  </div>
                  {optBig && <Input type="number" min={1} value={bigCount} onChange={(e) => setBigCount(Number(e.target.value) || 0)} placeholder="линий" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="fld" checked={optFold} onCheckedChange={(v) => setOptFold(!!v)} />
                    <Label htmlFor="fld">Фальцовка</Label>
                  </div>
                  {optFold && <Input type="number" min={1} value={foldCount} onChange={(e) => setFoldCount(Number(e.target.value) || 0)} placeholder="сгибов" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="tube" checked={optTube} onCheckedChange={(v) => setOptTube(!!v)} />
                    <Label htmlFor="tube">Упаковка в тубус</Label>
                  </div>
                  {optTube && <Input type="number" min={0} value={tubePrice} onChange={(e) => setTubePrice(Number(e.target.value) || 0)} placeholder="цена тубуса, тг" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="cp" checked={optCustomPack} onCheckedChange={(v) => setOptCustomPack(!!v)} />
                    <Label htmlFor="cp">Индивидуальная упаковка</Label>
                  </div>
                  {optCustomPack && (
                    <Select value={customPackKind} onValueChange={(v) => setCustomPackKind(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bag">Пакет</SelectItem>
                        <SelectItem value="tube">Тубус</SelectItem>
                        <SelectItem value="box">Коробка</SelectItem>
                        <SelectItem value="shrink">Термоусадка</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Доставка и наценка</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="dlv" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                  <Label htmlFor="dlv">Доставка</Label>
                </div>
                {hasDelivery && <div><Label>Стоимость доставки, тг</Label><Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(Number(e.target.value) || 0)} /></div>}
                <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} /></div>
                <div><Label>НДС, %</Label><Input type="number" value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value) || 0)} /></div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader><CardTitle className="text-base">Спецификация</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Этап</TableHead><TableHead>Операция</TableHead><TableHead className="text-right">Кол-во</TableHead><TableHead>Ед.</TableHead><TableHead className="text-right">Цена</TableHead><TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{l.stage}</TableCell>
                        <TableCell>{l.name}</TableCell>
                        <TableCell className="text-right">{fmtNum(l.quantity)}</TableCell>
                        <TableCell>{l.unit}</TableCell>
                        <TableCell className="text-right">{fmtMoney(l.unitPrice)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(l.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator className="my-4" />
                <div className="grid gap-2 sm:grid-cols-4 text-sm">
                  <div><div className="text-muted-foreground">Себестоимость</div><div className="font-semibold">{fmtMoney(totals.cost)}</div></div>
                  <div><div className="text-muted-foreground">Цена продажи</div><div className="font-semibold">{fmtMoney(totals.sale)}</div></div>
                  <div><div className="text-muted-foreground">С НДС</div><div className="font-semibold">{fmtMoney(totals.withVat)}</div></div>
                  <div><div className="text-muted-foreground">За штуку</div><div className="font-semibold">{fmtMoney(totals.perItem)}</div></div>
                </div>
              </CardContent>
            </Card>

            <TemplateActions
              productType="poster"
              defaultName={`Плакат ${circulation} шт`}
              circulation={circulation}
              totals={totals}
              margin={margin}
              vatPercent={vatPercent}
              spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, total: l.total }))}
            />
          </div>
        </PageContainer>
      </PageMain>
    </PageShell>
  );
}