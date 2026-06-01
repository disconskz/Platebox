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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { fmtMoney, fmtNum } from "@/lib/format";
import TemplateActions from "@/components/calc/TemplateActions";

import LegacyCostByStageBlock from "@/components/calc/multipage/LegacyCostByStageBlock";
/**
 * Шаблон «Фирменный бланк / Бланк» — листовая логика с поддержкой
 * тонкой бумаги, NCR-самокопирки, нумерации, перфорации, склейки
 * в блок и упаковки в пачки. Доработка 76.
 */

type BlankKind =
  | "simple" | "numbered" | "qr" | "perforated" | "block"
  | "ncr" | "receipt" | "invoice" | "act" | "strict";
const KINDS: { value: BlankKind; label: string }[] = [
  { value: "simple", label: "Простой фирменный бланк" },
  { value: "numbered", label: "Бланк с нумерацией" },
  { value: "qr", label: "Бланк с QR" },
  { value: "perforated", label: "Бланк с перфорацией" },
  { value: "block", label: "Бланк в блоке (склейка)" },
  { value: "ncr", label: "Самокопирующийся NCR" },
  { value: "receipt", label: "Квитанционный" },
  { value: "invoice", label: "Накладная" },
  { value: "act", label: "Акт" },
  { value: "strict", label: "Бланк строгой отчётности" },
];

type Material = {
  value: string; label: string; type: string; density: number;
  pricePerSheet: number; sheetW: number; sheetH: number; ncr?: boolean;
};
const MATERIALS: Material[] = [
  { value: "offset-60", label: "Офсетная 60 г", type: "offset", density: 60, pricePerSheet: 55, sheetW: 620, sheetH: 940 },
  { value: "offset-70", label: "Офсетная 70 г", type: "offset", density: 70, pricePerSheet: 65, sheetW: 620, sheetH: 940 },
  { value: "offset-80", label: "Офсетная 80 г", type: "offset", density: 80, pricePerSheet: 75, sheetW: 620, sheetH: 940 },
  { value: "writing-80", label: "Писчая 80 г", type: "writing", density: 80, pricePerSheet: 70, sheetW: 620, sheetH: 940 },
  { value: "coated-90", label: "Мелованная 90 г", type: "coated", density: 90, pricePerSheet: 95, sheetW: 720, sheetH: 1020 },
  { value: "coated-115", label: "Мелованная 115 г", type: "coated", density: 115, pricePerSheet: 115, sheetW: 720, sheetH: 1020 },
  { value: "color-80", label: "Цветная бумага 80 г", type: "color", density: 80, pricePerSheet: 110, sheetW: 620, sheetH: 940 },
  { value: "kraft-80", label: "Крафт 80 г", type: "kraft", density: 80, pricePerSheet: 90, sheetW: 620, sheetH: 940 },
  { value: "designer-100", label: "Дизайнерская 100 г", type: "designer", density: 100, pricePerSheet: 280, sheetW: 720, sheetH: 1020 },
  { value: "ncr-top", label: "NCR верхний слой", type: "ncr", density: 50, pricePerSheet: 95, sheetW: 620, sheetH: 940, ncr: true },
  { value: "ncr-middle", label: "NCR средний слой", type: "ncr", density: 50, pricePerSheet: 110, sheetW: 620, sheetH: 940, ncr: true },
  { value: "ncr-bottom", label: "NCR нижний слой", type: "ncr", density: 60, pricePerSheet: 100, sheetW: 620, sheetH: 940, ncr: true },
];

type PrintMode = "auto" | "digital" | "offset";
type PackKind = "none" | "p50" | "p100" | "p500" | "box" | "individual";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "p50", label: "Пачка по 50", price: 18, perPack: 50 },
  { value: "p100", label: "Пачка по 100", price: 25, perPack: 100 },
  { value: "p500", label: "Пачка по 500", price: 55, perPack: 500 },
  { value: "box", label: "В коробку", price: 220, perPack: 1000 },
  { value: "individual", label: "Индивидуальная", price: 14, perPack: 1 },
];

type FastenKind = "none" | "glue_pva" | "staple";

export default function LetterheadCalculator() {
  // Основные
  const [circulation, setCirculation] = useState(1000);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<BlankKind>("simple");
  const [finishedW, setFinishedW] = useState(210); // A4
  const [finishedH, setFinishedH] = useState(297);
  const [sheetsPerSet, setSheetsPerSet] = useState(1);
  const [setsCount, setSetsCount] = useState(0); // 0 = равен тиражу
  const [twoSided, setTwoSided] = useState(false);
  const [colorsFront, setColorsFront] = useState(1);
  const [colorsBack, setColorsBack] = useState(0);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [leadDays, setLeadDays] = useState(3);
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("offset-80");

  // NCR
  const [ncrLayers, setNcrLayers] = useState(3); // кол-во слоёв
  const [ncrOrder, setNcrOrder] = useState("Белый → Жёлтый → Розовый");
  const [ncrGlue, setNcrGlue] = useState(true);

  // Доп. операции
  const [hasNumbering, setHasNumbering] = useState(false);
  const [numbersPerItem, setNumbersPerItem] = useState(1);
  const [hasQr, setHasQr] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(1);

  const [hasPerforation, setHasPerforation] = useState(false);
  const [perfLines, setPerfLines] = useState(1);
  const [perfLineLenMm, setPerfLineLenMm] = useState(210);

  const [hasCollate, setHasCollate] = useState(false);
  const [hasFold, setHasFold] = useState(false);
  const [foldCount, setFoldCount] = useState(1);
  const [hasBiegovka, setHasBiegovka] = useState(false);
  const [biegovkaCount, setBiegovkaCount] = useState(1);

  const [fastenKind, setFastenKind] = useState<FastenKind>("none");
  const [blockSize, setBlockSize] = useState(50); // листов в блоке
  const [staplesPerBlock, setStaplesPerBlock] = useState(2);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("p100");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу бланка
  useEffect(() => {
    if (kind === "numbered") setHasNumbering(true);
    if (kind === "qr") setHasQr(true);
    if (kind === "perforated") setHasPerforation(true);
    if (kind === "ncr") {
      if (!material.ncr) setMaterialKey("ncr-top");
      setHasCollate(true);
    }
    if (kind === "block") {
      setHasCollate(true);
      if (fastenKind === "none") setFastenKind("glue_pva");
    }
    if (kind === "receipt" || kind === "invoice" || kind === "act") {
      setHasNumbering(true);
    }
    if (kind === "strict") {
      setHasNumbering(true);
      setHasPerforation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const sets = setsCount > 0 ? setsCount : circulation;
  const blocks = useMemo(() => Math.max(1, Math.ceil(sets / Math.max(1, blockSize))), [sets, blockSize]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.ncr) return "offset";
    if (circulation * Math.max(1, sheetsPerSet) >= 1000) return "offset";
    return "digital";
  }, [printMode, material, circulation, sheetsPerSet]);

  // Раскладка
  const printableW = material.sheetW - 20;
  const printableH = material.sheetH - 20;
  const itemW = Math.max(1, finishedW + 4);
  const itemH = Math.max(1, finishedH + 4);
  const itemsPerSheet = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH]);

  // На каждый слой комплекта — отдельный тираж листов
  const sheetsPerLayer = useMemo(() => Math.ceil(circulation / itemsPerSheet), [circulation, itemsPerSheet]);
  const totalLayers = material.ncr ? Math.max(1, ncrLayers) : Math.max(1, sheetsPerSet);
  const netSheets = sheetsPerLayer * totalLayers;
  const setupSheets = effectivePrintMode === "offset" ? 150 + Math.ceil(netSheets * 0.01) : 10;
  const printSheets = netSheets + setupSheets;

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн бланка", Math.max(1, designsCount), "макет", 2500);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 800);
    push("Препресс", "Подбор печатного формата · раскладка", 1, "усл.", 600);

    // Материалы
    if (material.ncr) {
      // На каждый слой — свой тип NCR. Здесь используем выбранный как базовую цену.
      const layerLabels = ["верхний", "средний", "нижний", "доп. слой", "доп. слой"];
      for (let i = 0; i < totalLayers; i++) {
        const label = `NCR ${layerLabels[i] || "слой"} (${ncrOrder.split("→")[i]?.trim() || "цвет"})`;
        push("Материалы", label, sheetsPerLayer + Math.ceil(setupSheets / totalLayers), "лист", material.pricePerSheet);
      }
    } else {
      push("Материалы", material.label, printSheets, "лист", material.pricePerSheet);
    }
    push("Препресс", "Резка закупочного листа", printSheets, "лист", 0.8);

    // Печать
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    if (effectivePrintMode === "offset") {
      const forms = (colorsTotal + pantoneCount) * Math.max(1, designsCount) * totalLayers;
      push("Печать", "Печатные формы", forms, "форма", 1000);
      push("Печать", "Вывод форм (подготовка)", forms, "форма", 500);
      push("Печать", "Приладка офсета", totalLayers, "ед.", 150 + Math.ceil(netSheets * 0.01));
      push("Печать", `Офсетная печать${twoSided ? " (2 стороны)" : ""}`,
        printSheets * (twoSided ? 2 : 1), "оттиск", 4.5);
    } else {
      push("Печать", `Цифровая печать${twoSided ? " (2 стороны)" : ""}`,
        printSheets * (twoSided ? 2 : 1), "оттиск", +(15 + colorsTotal * 1.5).toFixed(2));
    }

    // Нумерация
    if (hasNumbering) {
      const totalNumbers = circulation * Math.max(1, numbersPerItem);
      push("Постпечать", "Подготовка нумератора", 1, "усл.", 1500);
      push("Постпечать", "Нумерация", totalNumbers, "номер", 0.6);
    }
    // QR / штрихкод / персонализация
    if (hasQr) {
      push("Постпечать", "Подготовка базы QR", 1, "усл.", 2000);
      push("Постпечать", "Печать QR-кодов", circulation, "шт", 1.2);
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

    // Подборка (NCR/комплект)
    if (hasCollate) {
      push("Постпечать", "Подборка комплектов", sets * totalLayers, "лист", 0.6);
    }

    // Перфорация
    if (hasPerforation) {
      const meters = +(circulation * perfLines * perfLineLenMm / 1000).toFixed(2);
      push("Постпечать", "Приладка перфорации", 1, "усл.", 1200);
      push("Постпечать", "Перфорация", meters, "пог.м", 8);
    }

    // Фальцовка / биговка
    if (hasFold) {
      push("Постпечать", "Приладка фальцовки", 1, "усл.", 1000);
      push("Постпечать", "Фальцовка", circulation * Math.max(1, foldCount), "фальц", 0.8);
    }
    if (hasBiegovka) {
      push("Постпечать", "Приладка биговки", 1, "усл.", 1000);
      push("Постпечать", "Биговка", circulation * Math.max(1, biegovkaCount), "биг", 1.0);
    }

    // Склейка в блок / скоба
    if (fastenKind === "glue_pva" || (material.ncr && ncrGlue)) {
      const seamM = +((finishedH / 1000) * blocks).toFixed(2);
      push("Материалы", "Клей ПВА", seamM, "пог.м", 12);
      push("Постпечать", "Приладка проклейки", 1, "усл.", 1200);
      push("Постпечать", "Проклейка блоков", blocks, "блок", 35);
    }
    if (fastenKind === "staple") {
      const totalStaples = blocks * Math.max(1, staplesPerBlock);
      push("Материалы", "Скоба", totalStaples, "шт", 0.4);
      push("Постпечать", "Установка скобы", totalStaples, "шт", 1.2);
      push("Постпечать", "Приладка скобления", 1, "усл.", 800);
    }

    // Резка готовой продукции
    push("Постпечать", "Резка готовой продукции", printSheets, "лист", 0.6);

    // Контроль качества
    const qcCoef = hasNumbering ? 1.3 : 1.0;
    push("Логистика", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef.toFixed(2) + ")" : ""}`,
      circulation, "шт", +(0.4 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);
    return out;
  }, [
    hasDesign, designsCount, material, totalLayers, sheetsPerLayer, setupSheets, printSheets, netSheets,
    effectivePrintMode, colorsFront, colorsBack, twoSided, pantoneCount, ncrOrder,
    hasNumbering, numbersPerItem, hasQr, hasBarcode, hasPersonalization, variableElements,
    hasCollate, sets, hasPerforation, perfLines, perfLineLenMm,
    hasFold, foldCount, hasBiegovka, biegovkaCount,
    fastenKind, blocks, finishedH, staplesPerBlock, ncrGlue,
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
    s.push("Проверка макета", "Подбор печатного формата", "Раскладка",
      "Расчёт бумаги", "Резка закупочного листа");
    if (effectivePrintMode === "offset") s.push("Вывод форм", "Приладка", "Офсетная печать");
    else s.push("Цифровая печать");
    if (hasNumbering) s.push("Нумерация");
    if (hasQr) s.push("Печать QR");
    if (hasBarcode) s.push("Печать штрихкодов");
    if (hasPersonalization) s.push("Персонализация");
    if (hasCollate) s.push("Подборка комплектов");
    if (hasPerforation) s.push("Перфорация");
    if (hasFold) s.push("Фальцовка");
    if (hasBiegovka) s.push("Биговка");
    if (fastenKind === "glue_pva" || (material.ncr && ncrGlue)) s.push("Проклейка ПВА в блок");
    if (fastenKind === "staple") s.push("Скрепление скобой");
    s.push("Резка готовой продукции", "Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, hasNumbering, hasQr, hasBarcode, hasPersonalization,
      hasCollate, hasPerforation, hasFold, hasBiegovka, fastenKind, material, ncrGlue,
      packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <FileText className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Фирменный бланк / Бланк</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                A4-листовая логика, NCR-самокопирка, нумерация, перфорация, блоки и упаковка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 76</Badge>
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
                    <Label>Тип бланка</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as BlankKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Готовый Ш, мм</Label><Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} /></div>
                  <div><Label>Готовый В, мм</Label><Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} /></div>
                  <div><Label>Листов в комплекте</Label><Input type="number" min={1} value={sheetsPerSet} onChange={(e) => setSheetsPerSet(+e.target.value || 1)} /></div>
                  <div><Label>Комплектов (0 = тираж)</Label><Input type="number" min={0} value={setsCount} onChange={(e) => setSetsCount(+e.target.value || 0)} /></div>
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
                  <div className="flex items-end gap-2">
                    <Checkbox id="two-sided" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two-sided" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} /></div>
                  {twoSided && (<div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>)}
                  <div><Label>Pantone красок</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    На лист: <b>{itemsPerSheet}</b> · слоёв: <b>{totalLayers}</b> · печ. листов всего: <b>{printSheets}</b>
                    {" · "}приладка: <b>{setupSheets}</b> · режим: <b>{effectivePrintMode}</b>
                    {fastenKind !== "none" && <> · блоков: <b>{blocks}</b></>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "ncr", "ops", "perf", "fasten", "pack"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Бумага
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип бумаги</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label} · {fmtMoney(m.pricePerSheet)}/лист · {m.sheetW}×{m.sheetH}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Плотность: <b>{material.density}</b> г/м² · формат: <b>{material.sheetW}×{material.sheetH}</b>
                            {material.ncr && <> · <Badge variant="outline" className="text-[10px]">NCR самокопирка</Badge></>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {material.ncr && (
                      <AccordionItem value="ncr">
                        <AccordionTrigger>
                          <span className="flex items-center gap-2">3. NCR-комплект
                            <Badge variant="outline" className="text-[10px]">{ncrLayers} сл.</Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-3 sm:grid-cols-2 pt-2">
                            <div>
                              <Label>Количество слоёв</Label>
                              <Select value={String(ncrLayers)} onValueChange={(v) => setNcrLayers(+v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2">2 слоя</SelectItem>
                                  <SelectItem value="3">3 слоя</SelectItem>
                                  <SelectItem value="4">4 слоя</SelectItem>
                                  <SelectItem value="5">5 слоёв</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Порядок цветов</Label><Input value={ncrOrder} onChange={(e) => setNcrOrder(e.target.value)} placeholder="Белый → Жёлтый → Розовый" /></div>
                            <Row label="Проклейка комплекта" checked={ncrGlue} onChange={setNcrGlue} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    <AccordionItem value="ops">
                      <AccordionTrigger>4. Нумерация / переменные данные</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Нумерация" checked={hasNumbering} onChange={setHasNumbering} />
                          {hasNumbering && (
                            <div><Label>Номеров на изделие</Label><Input type="number" min={1} value={numbersPerItem} onChange={(e) => setNumbersPerItem(+e.target.value || 1)} /></div>
                          )}
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
                          <Row label="Штрихкод" checked={hasBarcode} onChange={setHasBarcode} />
                          <Row label="Персонализация" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (
                            <div><Label>Переменных элементов</Label><Input type="number" min={1} value={variableElements} onChange={(e) => setVariableElements(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Подборка комплектов" checked={hasCollate} onChange={setHasCollate} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="perf">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Перфорация / фальцовка / биговка
                          {hasPerforation && <Badge variant="outline" className="text-[10px]">перф ×{perfLines}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Перфорация" checked={hasPerforation} onChange={setHasPerforation} />
                          {hasPerforation && (<>
                            <div><Label>Линий на изделие</Label><Input type="number" min={1} value={perfLines} onChange={(e) => setPerfLines(+e.target.value || 1)} /></div>
                            <div><Label>Длина линии, мм</Label><Input type="number" min={1} value={perfLineLenMm} onChange={(e) => setPerfLineLenMm(+e.target.value || 1)} /></div>
                          </>)}
                          <Row label="Фальцовка" checked={hasFold} onChange={setHasFold} />
                          {hasFold && (<div><Label>Кол-во фальцев</Label><Input type="number" min={1} value={foldCount} onChange={(e) => setFoldCount(+e.target.value || 1)} /></div>)}
                          <Row label="Биговка" checked={hasBiegovka} onChange={setHasBiegovka} />
                          {hasBiegovka && (<div><Label>Кол-во бигов</Label><Input type="number" min={1} value={biegovkaCount} onChange={(e) => setBiegovkaCount(+e.target.value || 1)} /></div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="fasten">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Склейка в блок / скрепление
                          <Badge variant="outline" className="text-[10px]">
                            {fastenKind === "glue_pva" ? "Проклейка ПВА" : fastenKind === "staple" ? "Скоба" : "Без скрепления"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип скрепления</Label>
                            <Select value={fastenKind} onValueChange={(v) => setFastenKind(v as FastenKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Без скрепления</SelectItem>
                                <SelectItem value="glue_pva">Проклейка ПВА (в блок)</SelectItem>
                                <SelectItem value="staple">Скоба</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {fastenKind !== "none" && (
                            <div><Label>Листов в блоке</Label><Input type="number" min={1} value={blockSize} onChange={(e) => setBlockSize(+e.target.value || 1)} /></div>
                          )}
                          {fastenKind === "staple" && (
                            <div><Label>Скоб на блок</Label><Input type="number" min={1} value={staplesPerBlock} onChange={(e) => setStaplesPerBlock(+e.target.value || 1)} /></div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="pack">
                      <AccordionTrigger>7. Упаковка и доставка</AccordionTrigger>
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
                productType="blank"
                defaultName={`Бланк ${KINDS.find((k) => k.value === kind)?.label || ""} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-letterhead" />
          
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