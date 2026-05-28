import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sticker } from "lucide-react";
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
 * Шаблон «Наклейка / Стикер» — самоклеящаяся продукция:
 * лист / рулон, контурная резка, высечка, удаление облоя,
 * выборка, ламинация, премиальные стикеры. Доработка 64.
 */

type Kind =
  | "rect" | "round" | "oval" | "shaped" | "contour"
  | "transparent" | "white" | "vinyl" | "holographic"
  | "reflective" | "uvdtf" | "roll" | "sheet" | "premium";
const KINDS: { value: Kind; label: string }[] = [
  { value: "rect", label: "Прямоугольная" },
  { value: "round", label: "Круглая" },
  { value: "oval", label: "Овальная" },
  { value: "shaped", label: "Фигурная" },
  { value: "contour", label: "Контурная" },
  { value: "transparent", label: "Прозрачная" },
  { value: "white", label: "Белая" },
  { value: "vinyl", label: "Виниловая" },
  { value: "holographic", label: "Голографическая" },
  { value: "reflective", label: "Светоотражающая" },
  { value: "uvdtf", label: "UV DTF" },
  { value: "roll", label: "Рулонная" },
  { value: "sheet", label: "Листовая" },
  { value: "premium", label: "Premium sticker" },
];

type Material = {
  value: string; label: string; type: string; thickness: number;
  sheetW: number; sheetH: number; rollW: number;
  pricePerM2: number; pricePerLm: number; premium?: boolean; transparent?: boolean;
};
const MATERIALS: Material[] = [
  { value: "paper-white", label: "Самокл. бумага белая, глянц.", type: "paper", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 380, pricePerLm: 140 },
  { value: "paper-mat", label: "Самокл. бумага матовая", type: "paper", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 420, pricePerLm: 155 },
  { value: "pp-white", label: "ПП плёнка белая глянц.", type: "film", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 720, pricePerLm: 260 },
  { value: "pp-mat", label: "ПП плёнка матовая", type: "film", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 760, pricePerLm: 275 },
  { value: "pp-clear", label: "ПП плёнка прозрачная", type: "film", thickness: 80, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 820, pricePerLm: 295, transparent: true },
  { value: "vinyl", label: "Винил (наружный)", type: "vinyl", thickness: 100, sheetW: 500, sheetH: 700, rollW: 610, pricePerM2: 1450, pricePerLm: 880, premium: true },
  { value: "holographic", label: "Голографическая плёнка", type: "film", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 1900, pricePerLm: 680, premium: true },
  { value: "silver", label: "Silver (металлизир.)", type: "film", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 1700, pricePerLm: 620, premium: true },
  { value: "gold", label: "Gold (металлизир.)", type: "film", thickness: 90, sheetW: 320, sheetH: 450, rollW: 330, pricePerM2: 1750, pricePerLm: 640, premium: true },
  { value: "reflective", label: "Светоотражающая", type: "film", thickness: 120, sheetW: 500, sheetH: 700, rollW: 610, pricePerM2: 2400, pricePerLm: 1450, premium: true },
  { value: "dtf", label: "DTF плёнка", type: "dtf", thickness: 75, sheetW: 300, sheetH: 420, rollW: 600, pricePerM2: 1100, pricePerLm: 680 },
  { value: "uvdtf", label: "UV DTF плёнка", type: "uvdtf", thickness: 80, sheetW: 300, sheetH: 420, rollW: 600, pricePerM2: 1900, pricePerLm: 1180, premium: true },
];

type Shape = "rect" | "round" | "oval" | "shaped";
type Form = "sheet" | "roll";
type PrintMode = "auto" | "digital" | "uv" | "wide" | "roll";
type LamType = "none" | "mat" | "gloss" | "soft" | "antiscratch";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 180 },
  { value: "gloss", label: "Глянцевая", price: 160 },
  { value: "soft", label: "Soft-touch", price: 340 },
  { value: "antiscratch", label: "Anti-scratch", price: 380 },
];

type ContourComplex = "simple" | "mid" | "hard" | "extreme";
const CONTOUR_COEF: Record<ContourComplex, number> = { simple: 1.0, mid: 1.3, hard: 1.7, extreme: 2.5 };

type PackKind = "none" | "stack" | "bag" | "set" | "box";
const PACKS: { value: PackKind; label: string; price: number }[] = [
  { value: "none", label: "Без индивидуальной упаковки", price: 0 },
  { value: "stack", label: "В пачки", price: 0.4 },
  { value: "bag", label: "Индивидуальный пакет", price: 3 },
  { value: "set", label: "Sticker pack (комплектом)", price: 6 },
  { value: "box", label: "Коробка", price: 25 },
];

export default function StickerCalculator() {
  // Основные параметры
  const [circulation, setCirculation] = useState(1000);
  const [setsCount, setSetsCount] = useState(1); // в комплекте
  const [designsCount, setDesignsCount] = useState(1);
  const [itemW, setItemW] = useState(60);
  const [itemH, setItemH] = useState(60);
  const [shape, setShape] = useState<Shape>("rect");
  const [kind, setKind] = useState<Kind>("rect");
  const [form, setForm] = useState<Form>("sheet");
  const [gap, setGap] = useState(3); // расстояние между наклейками, мм
  const [bleed, setBleed] = useState(2); // вылеты, мм
  const [leadDays, setLeadDays] = useState(3);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("pp-white");
  const [removableGlue, setRemovableGlue] = useState(false);

  // Печать
  const [colors, setColors] = useState(4);
  const [whiteInk, setWhiteInk] = useState(false);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [optVarnish, setOptVarnish] = useState(false);

  // Контурная резка
  const [contourCut, setContourCut] = useState(false);
  const [contourComplex, setContourComplex] = useState<ContourComplex>("mid");

  // Постпечать
  const [lamType, setLamType] = useState<LamType>("gloss");
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);
  const [optWeeding, setOptWeeding] = useState(false); // выборка
  const [optNotch, setOptNotch] = useState(false); // надсечка
  const [notchLines, setNotchLines] = useState(2);
  const [optPerf, setOptPerf] = useState(false);

  // Переменные
  const [optQR, setOptQR] = useState(false);
  const [optBarcode, setOptBarcode] = useState(false);
  const [optNumber, setOptNumber] = useState(false);
  const [optPersonal, setOptPersonal] = useState(false);

  // Намотка / упаковка
  const [rollLengthLm, setRollLengthLm] = useState(100); // длина рулона в м
  const [packKind, setPackKind] = useState<PackKind>("stack");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика
  useEffect(() => {
    if (kind === "shaped" || kind === "contour") setContourCut(true);
    if (kind === "roll") setForm("roll");
    if (kind === "sheet") setForm("sheet");
    if (kind === "uvdtf") { setMaterialKey("uvdtf"); setForm("sheet"); }
    if (kind === "holographic") setMaterialKey("holographic");
    if (kind === "reflective") setMaterialKey("reflective");
    if (kind === "vinyl") setMaterialKey("vinyl");
    if (kind === "transparent") setMaterialKey("pp-clear");
    if (kind === "premium") {
      if (lamType === "none" || lamType === "gloss" || lamType === "mat") setLamType("soft");
      setContourCut(true);
      setContourComplex((c) => (c === "simple" ? "hard" : c));
      if (packKind === "none" || packKind === "stack") setPackKind("bag");
    }
    if (kind === "round" || kind === "oval") setShape(kind);
    if (kind === "rect") setShape("rect");
    if (kind === "shaped" || kind === "contour") setShape("shaped");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => { if (optDieCut && !optDeflash) setOptDeflash(true); }, [optDieCut, optDeflash]);
  useEffect(() => { if (material.transparent && !whiteInk) setWhiteInk(true); }, [material.transparent]); // eslint-disable-line

  const variable = optQR || optBarcode || optNumber || optPersonal;

  // Авто-режим печати
  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (form === "roll") return "roll";
    if (material.type === "uvdtf") return "uv";
    if (material.type === "vinyl" || (itemW * itemH) > 200 * 200) return "wide";
    return "digital";
  }, [printMode, form, material, itemW, itemH]);

  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (material.premium) k += 0.1;
    if (lamType === "soft" || lamType === "antiscratch") k += 0.1;
    if (kind === "premium") k += 0.15;
    if (contourComplex === "hard") k += 0.1;
    if (contourComplex === "extreme") k += 0.25;
    return +k.toFixed(2);
  }, [material, lamType, kind, contourComplex]);

  // Раскладка
  const layout = useMemo(() => {
    const totalQty = circulation * Math.max(1, setsCount);
    const wCell = itemW + gap + 2 * bleed;
    const hCell = itemH + gap + 2 * bleed;
    const areaItemM2 = (itemW * itemH) / 1_000_000;
    const totalAreaM2 = totalQty * areaItemM2;

    if (form === "roll") {
      const useRollW = material.rollW;
      const across = Math.max(1, Math.floor((useRollW - 10) / wCell));
      const linearMmPerItem = hCell;
      const totalLm = (linearMmPerItem * totalQty / across) / 1000;
      const rolls = Math.max(1, Math.ceil(totalLm / Math.max(10, rollLengthLm)));
      const setupLm = (effectivePrintMode === "roll" ? 8 : 4) + rolls * 2;
      return {
        form: "roll" as const,
        up: across,
        totalQty,
        sheets: 0,
        printSheets: 0,
        areaM2: totalAreaM2,
        linearM: +(totalLm + setupLm).toFixed(2),
        rolls,
        printAreaM2: +((totalLm + setupLm) * (useRollW / 1000)).toFixed(3),
      };
    }

    const sw = material.sheetW, sh = material.sheetH;
    const a = Math.floor(sw / wCell) * Math.floor(sh / hCell);
    const b = Math.floor(sw / hCell) * Math.floor(sh / wCell);
    const up = Math.max(1, a, b);
    const net = Math.ceil(totalQty / up);
    const setup = effectivePrintMode === "uv" || effectivePrintMode === "digital" ? 10 : 25;
    const printSheets = net + setup;
    return {
      form: "sheet" as const,
      up,
      totalQty,
      sheets: net,
      printSheets,
      areaM2: totalAreaM2,
      linearM: 0,
      rolls: 0,
      printAreaM2: +((printSheets * sw * sh) / 1_000_000).toFixed(3),
    };
  }, [material, itemW, itemH, gap, bleed, circulation, setsCount, form, rollLengthLm, effectivePrintMode]);

  // Длина контура — приближённо
  const contourLengthM = useMemo(() => {
    let perItemMm = 0;
    if (shape === "round") perItemMm = Math.PI * itemW;
    else if (shape === "oval") perItemMm = Math.PI * ((itemW + itemH) / 2);
    else if (shape === "shaped") perItemMm = 2 * (itemW + itemH) * 1.4;
    else perItemMm = 2 * (itemW + itemH);
    return +((perItemMm * layout.totalQty) / 1000).toFixed(1);
  }, [shape, itemW, itemH, layout.totalQty]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн / макет стикера", Math.max(1, designsCount), "макет", 4000);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 600);
    if (contourCut) push("Препресс", "Подготовка контура реза", Math.max(1, designsCount), "макет", 1200);
    push("Препресс", "Раскладка", 1, "усл.", 800);

    // Материал
    if (layout.form === "roll") {
      push("Материалы", `${material.label} (рулон, ${material.rollW} мм)`,
        layout.linearM, "пог.м", material.pricePerLm);
    } else {
      push("Материалы", `${material.label} (лист ${material.sheetW}×${material.sheetH})`,
        layout.printSheets, "лист", +((material.pricePerM2 * material.sheetW * material.sheetH) / 1_000_000).toFixed(2));
    }
    if (removableGlue) push("Материалы", "Надбавка за съёмный клей", +layout.areaM2.toFixed(3), "м²", 60);

    // Печать
    const printArea = layout.printAreaM2;
    if (effectivePrintMode === "roll") {
      push("Печать", "Приладка рулонной печати", 1, "усл.", 2500);
      push("Печать", "Печать (рулон)", layout.linearM, "пог.м",
        +(45 + colors * 6 + (whiteInk ? 18 : 0) + pantoneCount * 12).toFixed(2));
    } else if (effectivePrintMode === "uv") {
      push("Печать", "UV-печать", printArea, "м²",
        +(2200 + (whiteInk ? 400 : 0) + pantoneCount * 200).toFixed(2));
    } else if (effectivePrintMode === "wide") {
      push("Печать", "Широкоформатная печать", printArea, "м²",
        +(1400 + (whiteInk ? 300 : 0)).toFixed(2));
    } else {
      push("Печать", "Цифровая печать (лист)", layout.printSheets, "лист",
        +(28 + colors * 2 + (whiteInk ? 8 : 0)).toFixed(2));
    }
    if (optVarnish) push("Печать", "УФ / ВД-лак", printArea, "м²", 280);

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`, +printArea.toFixed(3), "м²", lam.price);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 600);
    }

    // Контурная резка / плоттер
    if (contourCut) {
      push("Постпечать", "Приладка плоттера", 1, "усл.", 1200);
      push("Постпечать", `Контурная резка (×${CONTOUR_COEF[contourComplex]})`,
        contourLengthM, "пог.м",
        +(8 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));
    }

    // Высечка
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", 5500);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1500);
      if (layout.form === "sheet")
        push("Постпечать", "Высечка", layout.printSheets, "лист", 4);
      else
        push("Постпечать", "Высечка (роллер)", layout.linearM, "пог.м", 6);
      if (optDeflash)
        push("Постпечать", "Удаление облоя",
          layout.totalQty, "изд.", +(0.8 * premiumCoef).toFixed(2));
    }

    // Выборка
    if (optWeeding)
      push("Постпечать", `Выборка (×${CONTOUR_COEF[contourComplex]})`,
        layout.totalQty, "изд.", +(1.2 * CONTOUR_COEF[contourComplex] * premiumCoef).toFixed(2));

    // Надсечка
    if (optNotch)
      push("Постпечать", "Надсечка", notchLines * layout.totalQty, "линия", 0.3);
    if (optPerf)
      push("Постпечать", "Перфорация", layout.totalQty, "изд.", 0.5);

    // Резка готовой продукции (для листов)
    if (layout.form === "sheet") push("Постпечать", "Резка готовой продукции", layout.printSheets, "лист", 1.0);

    // Переменные данные
    if (optQR) {
      push("Персонализация", "QR-код (подготовка)", 1, "усл.", 2000);
      push("Персонализация", "QR-код (нанесение)", layout.totalQty, "элемент", 7);
    }
    if (optBarcode) {
      push("Персонализация", "Штрихкод (подготовка)", 1, "усл.", 1500);
      push("Персонализация", "Штрихкод (нанесение)", layout.totalQty, "элемент", 5);
    }
    if (optNumber) {
      push("Персонализация", "Нумерация", layout.totalQty, "элемент", 3);
    }
    if (optPersonal) {
      push("Персонализация", "Переменные данные (подготовка)", 1, "усл.", 2500);
      push("Персонализация", "Переменные данные (нанесение)", layout.totalQty, "элемент", 6);
    }

    // Намотка / упаковка
    if (layout.form === "roll") {
      push("Упаковка", "Намотка в рулон", layout.rolls, "рулон", 350);
      push("Упаковка", "Втулка", layout.rolls, "шт", 80);
    }
    if (packKind === "set") {
      const setsTotal = Math.ceil(circulation);
      push("Упаковка", `Sticker pack (${setsCount} шт/комплект)`,
        setsTotal, "комплект", pack.price);
    } else if (packKind !== "none") {
      push("Упаковка", `Упаковка: ${pack.label}`, layout.totalQty, "шт", pack.price);
    }

    // Контроль качества
    const qcCoef = (variable ? 1.5 : 1.0) * (contourCut ? CONTOUR_COEF[contourComplex] : 1.0);
    push("Логистика", `Контроль качества${qcCoef > 1 ? ` (×${qcCoef.toFixed(2)})` : ""}`,
      layout.totalQty, "изд.", +(0.6 * qcCoef).toFixed(2));

    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [hasDesign, designsCount, contourCut, layout, material, removableGlue,
      effectivePrintMode, colors, whiteInk, pantoneCount, optVarnish,
      lamType, lam, contourComplex, contourLengthM, premiumCoef,
      optDieCut, optDeflash, optWeeding, optNotch, notchLines, optPerf,
      optQR, optBarcode, optNumber, optPersonal, variable,
      packKind, pack, setsCount, circulation, hasDelivery, deliveryCost]);

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
    if (contourCut) s.push("Подготовка контура реза");
    s.push("Раскладка", "Расчёт материала");
    s.push(
      effectivePrintMode === "roll" ? "Печать (рулон)" :
      effectivePrintMode === "uv" ? "UV-печать" :
      effectivePrintMode === "wide" ? "Широкоформатная печать" :
      "Цифровая печать"
    );
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (contourCut) s.push(`Контурная резка / плоттер (${contourComplex})`);
    if (optDieCut) { s.push("Высечка"); if (optDeflash) s.push("Удаление облоя"); }
    if (optWeeding) s.push("Выборка");
    if (optNotch) s.push("Надсечка");
    if (optPerf) s.push("Перфорация");
    if (layout.form === "sheet") s.push("Резка готовой продукции");
    if (optQR) s.push("QR-код");
    if (optBarcode) s.push("Штрихкод");
    if (optNumber) s.push("Нумерация");
    if (optPersonal) s.push("Переменные данные");
    if (layout.form === "roll") s.push("Намотка в рулон");
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, contourCut, effectivePrintMode, lamType, lam, contourComplex,
      optDieCut, optDeflash, optWeeding, optNotch, optPerf,
      optQR, optBarcode, optNumber, optPersonal,
      layout.form, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Sticker className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Наклейка / Стикер</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Самоклейка, лист/рулон, контурная резка, высечка, выборка, ламинация.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 64</Badge>
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
                    <Label>Тип наклейки</Label>
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
                        <SelectItem value="shaped">Фигурная / контурная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Рулон / лист</Label>
                    <Select value={form} onValueChange={(v) => setForm(v as Form)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sheet">Лист</SelectItem>
                        <SelectItem value="roll">Рулон</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div><Label>В комплекте, шт</Label><Input type="number" min={1} value={setsCount} onChange={(e) => setSetsCount(+e.target.value || 1)} /></div>
                  <div><Label>Расстояние между, мм</Label><Input type="number" min={0} value={gap} onChange={(e) => setGap(+e.target.value || 0)} /></div>
                  <div><Label>Вылеты, мм</Label><Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value || 0)} /></div>
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                        <SelectItem value="uv">UV</SelectItem>
                        <SelectItem value="wide">Широкоформат</SelectItem>
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
                    Изделий всего: <b>{fmtNum(layout.totalQty)}</b> ·{" "}
                    {layout.form === "roll"
                      ? <>пог.м: <b>{layout.linearM}</b> · рулонов: <b>{layout.rolls}</b></>
                      : <>на лист: <b>{layout.up}</b> · листов с приладкой: <b>{layout.printSheets}</b></>}
                    {" "}· печать: <b>{effectivePrintMode}</b>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "print", "contour", "postpress"]} className="w-full">
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
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            Площадь изделий: <b>{layout.areaM2.toFixed(3)} м²</b><br />
                            Площадь печати: <b>{layout.printAreaM2} м²</b>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цветность</Label><Input type="number" min={1} max={8} value={colors} onChange={(e) => setColors(+e.target.value || 1)} /></div>
                          <div><Label>Pantone</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="white" checked={whiteInk} onCheckedChange={(v) => setWhiteInk(!!v)} />
                            <Label htmlFor="white" className="cursor-pointer">Белила (для прозрачных)</Label>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox id="varnish" checked={optVarnish} onCheckedChange={(v) => setOptVarnish(!!v)} />
                            <Label htmlFor="varnish" className="cursor-pointer">УФ / ВД-лак</Label>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="contour">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Контурная резка
                          <Badge variant={contourCut ? "default" : "outline"} className="text-[10px]">
                            {contourCut ? `${contourComplex} · ${contourLengthM} пог.м` : "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="contour" checked={contourCut} onCheckedChange={(v) => setContourCut(!!v)} />
                            <Label htmlFor="contour" className="cursor-pointer">Включить контурную резку (плоттер)</Label>
                          </div>
                          {contourCut && (
                            <div className="sm:col-span-2">
                              <Label>Сложность контура</Label>
                              <Select value={contourComplex} onValueChange={(v) => setContourComplex(v as ContourComplex)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="simple">Простой (×1.0)</SelectItem>
                                  <SelectItem value="mid">Средний (×1.3)</SelectItem>
                                  <SelectItem value="hard">Сложный (×1.7)</SelectItem>
                                  <SelectItem value="extreme">Сверхсложный (×2.5)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="postpress">
                      <AccordionTrigger>5. Постпечатные операции</AccordionTrigger>
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
                            <Row label="Высечка штампом" checked={optDieCut} onChange={setOptDieCut} />
                            <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                            <Row label="Выборка (удаление лишнего)" checked={optWeeding} onChange={setOptWeeding} />
                            <Row label="Надсечка" checked={optNotch} onChange={setOptNotch}>
                              <Input className="h-8 w-20" type="number" min={1} value={notchLines} onChange={(e) => setNotchLines(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">линий/изд.</span>
                            </Row>
                            <Row label="Перфорация" checked={optPerf} onChange={setOptPerf} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="variable">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Переменные данные
                          <Badge variant={variable ? "default" : "outline"} className="text-[10px]">
                            {[optQR && "QR", optBarcode && "штрихкод", optNumber && "нумерация", optPersonal && "перем."].filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pt-2">
                          <Row label="QR-код" checked={optQR} onChange={setOptQR} />
                          <Row label="Штрихкод" checked={optBarcode} onChange={setOptBarcode} />
                          <Row label="Нумерация" checked={optNumber} onChange={setOptNumber} />
                          <Row label="Переменные данные / персонализация" checked={optPersonal} onChange={setOptPersonal} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>7. Намотка, упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          {form === "roll" && (
                            <div><Label>Длина рулона, м</Label><Input type="number" min={10} value={rollLengthLm} onChange={(e) => setRollLengthLm(+e.target.value || 10)} /></div>
                          )}
                          <div className="sm:col-span-2">
                            <Label>Упаковка</Label>
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
                  <div className="text-xs text-muted-foreground pt-1">
                    Коэф. сложности: ×{premiumCoef.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="leaflet"
                defaultName={`Стикер ${itemW}×${itemH} · ${circulation} шт`}
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