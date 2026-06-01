import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Layers } from "lucide-react";
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
 * Шаблон «Самокопирующийся бланк / NCR» — отдельный калькулятор
 * многослойной NCR-продукции: бланки, квитанции, накладные, акты,
 * чековые книжки, БСО, NCR-комплекты, блоки и книги. Доработка 82.
 */

type NcrKind =
  | "blank" | "receipt" | "invoice" | "check" | "book"
  | "block" | "set" | "numbered" | "perforated" | "premium";
const KINDS: { value: NcrKind; label: string }[] = [
  { value: "blank", label: "NCR-бланк" },
  { value: "receipt", label: "NCR-квитанция" },
  { value: "invoice", label: "NCR-накладная" },
  { value: "check", label: "NCR-чек" },
  { value: "book", label: "NCR-книга" },
  { value: "block", label: "NCR-блок" },
  { value: "set", label: "NCR-комплект" },
  { value: "numbered", label: "NCR с нумерацией" },
  { value: "perforated", label: "NCR с перфорацией" },
  { value: "premium", label: "NCR premium" },
];

type NcrPaper = { value: string; label: string; role: "CB" | "CFB" | "CF"; pricePerSheet: number };
const NCR_TOP: NcrPaper[] = [
  { value: "cb-white", label: "CB Белый (верх)", role: "CB", pricePerSheet: 95 },
];
const NCR_MID: NcrPaper[] = [
  { value: "cfb-yellow", label: "CFB Жёлтый (середина)", role: "CFB", pricePerSheet: 110 },
  { value: "cfb-blue", label: "CFB Голубой (середина)", role: "CFB", pricePerSheet: 110 },
  { value: "cfb-green", label: "CFB Зелёный (середина)", role: "CFB", pricePerSheet: 115 },
  { value: "cfb-pink", label: "CFB Розовый (середина)", role: "CFB", pricePerSheet: 110 },
];
const NCR_BOT: NcrPaper[] = [
  { value: "cf-white", label: "CF Белый (низ)", role: "CF", pricePerSheet: 100 },
  { value: "cf-yellow", label: "CF Жёлтый (низ)", role: "CF", pricePerSheet: 105 },
  { value: "cf-blue", label: "CF Голубой (низ)", role: "CF", pricePerSheet: 105 },
  { value: "cf-green", label: "CF Зелёный (низ)", role: "CF", pricePerSheet: 110 },
];
const ALL_NCR = [...NCR_TOP, ...NCR_MID, ...NCR_BOT];

type PrintMode = "auto" | "digital" | "offset";
type FastenKind = "none" | "glue_pva" | "staple" | "spine" | "book";
type PackKind = "none" | "pack" | "block" | "box" | "shrink" | "individual";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "pack", label: "Пачка по 100", price: 25, perPack: 100 },
  { value: "block", label: "По блокам", price: 18, perPack: 50 },
  { value: "box", label: "Коробка", price: 220, perPack: 1000 },
  { value: "shrink", label: "Термоусадка", price: 14, perPack: 50 },
  { value: "individual", label: "Индивидуальная", price: 12, perPack: 1 },
];

const SHEET_W = 620;
const SHEET_H = 940;
const PURCHASE_PRICE_PER_NCR_SHEET = 0; // расчёт идёт по выбранным слоям

export default function NcrCalculator() {
  // 1. Основные параметры
  const [name, setName] = useState("Расчёт NCR");
  const [kind, setKind] = useState<NcrKind>("blank");
  const [setsCirculation, setSetsCirculation] = useState(1000); // тираж комплектов
  const [copiesPerSet, setCopiesPerSet] = useState(1); // экземпляров (под копирку)
  const [finishedW, setFinishedW] = useState(148); // A5
  const [finishedH, setFinishedH] = useState(210);
  const [designsCount, setDesignsCount] = useState(1);
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
  const [ownTurn, setOwnTurn] = useState(true);

  // 2. NCR-слои
  const [layers, setLayers] = useState(3);
  const [topKey, setTopKey] = useState("cb-white");
  const [midKey, setMidKey] = useState("cfb-yellow");
  const [botKey, setBotKey] = useState("cf-white");
  const [autoCollate, setAutoCollate] = useState(true); // ручная / автоподборка
  const [collatePricePerSheet, setCollatePricePerSheet] = useState(0.6);

  // 3. Печать
  const [platePrice, setPlatePrice] = useState(1000);
  const [printPricePerSheet, setPrintPricePerSheet] = useState(4.5);

  // 4. Нумерация / переменные данные
  const [hasNumbering, setHasNumbering] = useState(false);
  const [numbersPerSet, setNumbersPerSet] = useState(1);
  const [numberingPrice, setNumberingPrice] = useState(0.6);
  const [hasQr, setHasQr] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(1);

  // 5. Перфорация
  const [hasPerforation, setHasPerforation] = useState(false);
  const [perfLines, setPerfLines] = useState(1);
  const [perfLineLenMm, setPerfLineLenMm] = useState(148);
  const [perfPricePerM, setPerfPricePerM] = useState(8);

  // 6. Скрепление
  const [fastenKind, setFastenKind] = useState<FastenKind>("glue_pva");
  const [setsPerBlock, setSetsPerBlock] = useState(50);
  const [staplesPerBlock, setStaplesPerBlock] = useState(2);
  const [staplePrice, setStaplePrice] = useState(0.4);
  const [stapleInstallPrice, setStapleInstallPrice] = useState(1.2);
  const [gluePricePerM, setGluePricePerM] = useState(12);
  const [glueBlockPrice, setGlueBlockPrice] = useState(35);

  // 7. Упаковка
  const [packKind, setPackKind] = useState<PackKind>("block");

  const topPaper = useMemo(() => ALL_NCR.find((p) => p.value === topKey)!, [topKey]);
  const midPaper = useMemo(() => ALL_NCR.find((p) => p.value === midKey)!, [midKey]);
  const botPaper = useMemo(() => ALL_NCR.find((p) => p.value === botKey) || NCR_BOT[0], [botKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Авто-логика по типу изделия
  useEffect(() => {
    if (kind === "numbered") setHasNumbering(true);
    if (kind === "perforated") setHasPerforation(true);
    if (kind === "receipt" || kind === "invoice" || kind === "check") {
      setHasNumbering(true);
    }
    if (kind === "book") {
      setFastenKind((f) => (f === "none" ? "glue_pva" : f));
      setHasPerforation(true);
      setPackKind("block");
    }
    if (kind === "block") {
      setFastenKind((f) => (f === "none" ? "glue_pva" : f));
    }
    if (kind === "premium") {
      setLayers((l) => (l < 4 ? 4 : l));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Если слой 1 — слоёв 2 (CB+CF). Если 3+ — добавляются CFB. Если 5+ — больше CFB.
  const layersTotal = Math.max(1, layers);
  const totalSets = Math.max(1, setsCirculation);

  // Раскладка
  const printableW = SHEET_W - 20;
  const printableH = SHEET_H - 20;
  const itemW = Math.max(1, finishedW + 4);
  const itemH = Math.max(1, finishedH + 4);
  const itemsPerSheet = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH]);

  // Печатных листов на каждый слой
  const sheetsPerLayer = useMemo(
    () => Math.ceil(totalSets / itemsPerSheet),
    [totalSets, itemsPerSheet]
  );
  const setupSheets = useMemo(
    () => (printMode === "digital" ? 10 : 150 + Math.ceil(sheetsPerLayer * 0.01)),
    [printMode, sheetsPerLayer]
  );
  const printSheetsPerLayer = sheetsPerLayer + setupSheets;
  const totalSheetsAllLayers = printSheetsPerLayer * layersTotal;

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    // NCR почти всегда офсет
    if (totalSets * layersTotal >= 500) return "offset";
    return "digital";
  }, [printMode, totalSets, layersTotal]);

  const blocks = useMemo(
    () => Math.max(1, Math.ceil(totalSets / Math.max(1, setsPerBlock))),
    [totalSets, setsPerBlock]
  );

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, n: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name: n, qty, unit, price, total: qty * price });

    // Препресс
    if (hasDesign) push("Препресс", "Дизайн NCR-бланка", Math.max(1, designsCount), "макет", 2800);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 800);
    push("Препресс", "Раскладка и расчёт NCR-слоёв", 1, "усл.", 800);

    // 1. NCR-бумага по слоям
    const midLayersCount = Math.max(0, layersTotal - 2);
    // верх (CB)
    push("Материалы", topPaper.label, sheetsPerLayer + Math.ceil(setupSheets / Math.max(1, layersTotal)),
      "лист", topPaper.pricePerSheet);
    // средние (CFB)
    for (let i = 0; i < midLayersCount; i++) {
      push("Материалы", `${midPaper.label} · слой ${i + 2}`,
        sheetsPerLayer + Math.ceil(setupSheets / Math.max(1, layersTotal)),
        "лист", midPaper.pricePerSheet);
    }
    // низ (CF)
    if (layersTotal >= 2) {
      push("Материалы", botPaper.label,
        sheetsPerLayer + Math.ceil(setupSheets / Math.max(1, layersTotal)),
        "лист", botPaper.pricePerSheet);
    }
    push("Препресс", "Резка закупочного NCR-листа", totalSheetsAllLayers, "лист", 0.8);

    // 2. Печать NCR
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    if (effectivePrintMode === "offset") {
      const forms = (colorsTotal + pantoneCount) * Math.max(1, designsCount) * layersTotal;
      push("Печать", "Печатные формы", forms, "форма", platePrice);
      push("Печать", "Вывод форм (подготовка)", forms, "форма", 500);
      const prilad = (ownTurn ? 150 : 300) + Math.ceil(sheetsPerLayer * 0.01);
      push("Печать", `Приладка офсета (${ownTurn ? "свой" : "чужой"} оборот)`, layersTotal, "ед.", prilad);
      push("Печать", `Офсетная печать NCR${twoSided ? " (2 стороны)" : ""}`,
        totalSheetsAllLayers * (twoSided ? 2 : 1), "оттиск", printPricePerSheet);
    } else {
      push("Печать", `Цифровая печать NCR${twoSided ? " (2 стороны)" : ""}`,
        totalSheetsAllLayers * (twoSided ? 2 : 1), "оттиск", +(15 + colorsTotal * 1.5).toFixed(2));
    }

    // 3. Нумерация
    if (hasNumbering) {
      const totalNumbers = totalSets * Math.max(1, numbersPerSet);
      push("Постпечать", "Подготовка нумератора", 1, "усл.", 1500);
      push("Постпечать", "Нумерация комплектов", totalNumbers, "номер", numberingPrice);
      push("Контроль", "Проверка последовательности / дублей", totalSets, "компл.", 0.3);
    }

    // 4. QR / штрихкод / персонализация
    if (hasQr) {
      push("Постпечать", "Подготовка базы QR", 1, "усл.", 2000);
      push("Постпечать", "Печать QR-кодов", totalSets, "шт", 1.2);
      push("Контроль", "Проверка считываемости QR", totalSets, "шт", 0.2);
    }
    if (hasBarcode) {
      push("Постпечать", "Подготовка базы штрихкодов", 1, "усл.", 1500);
      push("Постпечать", "Печать штрихкодов", totalSets, "шт", 0.9);
      push("Контроль", "Проверка считываемости штрихкодов", totalSets, "шт", 0.2);
    }
    if (hasPersonalization) {
      push("Постпечать", "Подготовка базы персонализации", 1, "усл.", 3000);
      push("Постпечать", "Переменные данные",
        totalSets * Math.max(1, variableElements), "элем.", 1.2);
    }

    // 5. Подборка NCR (если слоёв > 1)
    if (layersTotal > 1) {
      const collateQty = totalSets * layersTotal;
      const price = autoCollate ? collatePricePerSheet : +(collatePricePerSheet * 1.6).toFixed(2);
      push("Постпечать", `Подборка NCR (${autoCollate ? "авто" : "ручная"})`, collateQty, "лист", price);
    }

    // 6. Перфорация
    if (hasPerforation) {
      const meters = +(totalSets * Math.max(1, perfLines) * Math.max(1, perfLineLenMm) / 1000).toFixed(2);
      push("Постпечать", "Приладка перфорации", 1, "усл.", 1200);
      push("Постпечать", "Перфорация", meters, "пог.м", perfPricePerM);
    }

    // 7. Скрепление / склейка
    if (fastenKind === "glue_pva" || fastenKind === "spine" || fastenKind === "book") {
      const seamM = +((finishedH / 1000) * blocks).toFixed(2);
      push("Материалы", "Клей ПВА", seamM, "пог.м", gluePricePerM);
      push("Постпечать", "Приладка проклейки", 1, "усл.", 1200);
      push("Постпечать",
        fastenKind === "book" ? "Сборка NCR-книги" :
        fastenKind === "spine" ? "Проклейка корешка" : "Проклейка блоков ПВА",
        blocks, "блок", glueBlockPrice);
    }
    if (fastenKind === "staple") {
      const totalStaples = blocks * Math.max(1, staplesPerBlock);
      push("Материалы", "Скоба", totalStaples, "шт", staplePrice);
      push("Постпечать", "Установка скобы", totalStaples, "шт", stapleInstallPrice);
      push("Постпечать", "Приладка скобления", 1, "усл.", 800);
    }

    // 8. Резка готовой продукции
    push("Постпечать", "Резка готовой продукции", totalSheetsAllLayers, "лист", 0.6);

    // 9. Контроль комплектности
    push("Контроль", "Контроль комплектности", totalSets, "компл.",
      +(0.4 * (hasNumbering ? 1.3 : 1.0)).toFixed(2));

    // 10. Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(totalSets / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [
    hasDesign, designsCount, topPaper, midPaper, botPaper, layersTotal,
    sheetsPerLayer, setupSheets, totalSheetsAllLayers, totalSets,
    effectivePrintMode, colorsFront, colorsBack, twoSided, pantoneCount,
    platePrice, printPricePerSheet, ownTurn,
    hasNumbering, numbersPerSet, numberingPrice,
    hasQr, hasBarcode, hasPersonalization, variableElements,
    autoCollate, collatePricePerSheet,
    hasPerforation, perfLines, perfLineLenMm, perfPricePerM,
    fastenKind, blocks, finishedH, staplesPerBlock, staplePrice, stapleInstallPrice,
    gluePricePerM, glueBlockPrice,
    packKind, pack, hasDelivery, deliveryCost,
  ]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.total, 0);
    const sale = cost * (1 + margin / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perSet = totalSets > 0 ? withVat / totalSets : 0;
    return { cost, sale, withVat, perItem: perSet };
  }, [lines, margin, vatPercent, totalSets]);

  const route = useMemo(() => {
    const s: string[] = [];
    if (hasDesign) s.push("Дизайн");
    s.push("Проверка макета", "Раскладка", "Расчёт NCR-слоёв", "Резка бумаги");
    if (effectivePrintMode === "offset") s.push("Вывод форм", "Приладка", "Печать NCR (офсет)");
    else s.push("Печать NCR (цифра)");
    if (hasNumbering) s.push("Нумерация");
    if (hasQr) s.push("QR");
    if (hasBarcode) s.push("Штрихкод");
    if (hasPersonalization) s.push("Персонализация");
    if (layersTotal > 1) s.push(`Подборка комплектов (${autoCollate ? "авто" : "ручная"})`);
    if (hasPerforation) s.push("Перфорация");
    if (fastenKind === "glue_pva") s.push("Проклейка ПВА");
    if (fastenKind === "staple") s.push("Скрепление скобой");
    if (fastenKind === "spine") s.push("Склейка в корешок");
    if (fastenKind === "book") s.push("Сборка NCR-книги");
    s.push("Резка готовой продукции", "Формирование блоков", "Контроль комплектности");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, hasNumbering, hasQr, hasBarcode, hasPersonalization,
      layersTotal, autoCollate, hasPerforation, fastenKind, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Layers className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Самокопирующийся бланк / NCR</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Многослойная NCR-продукция: слои CB/CFB/CF, подборка комплектов, нумерация, перфорация, проклейка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 82</Badge>
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
                    <Label>Тип NCR-изделия</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as NcrKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Тираж комплектов</Label>
                    <Input type="number" min={1} value={setsCirculation} onChange={(e) => setSetsCirculation(+e.target.value || 0)} />
                  </div>
                  <div><Label>Экземпляров в комплекте</Label>
                    <Input type="number" min={1} value={copiesPerSet} onChange={(e) => setCopiesPerSet(+e.target.value || 1)} />
                  </div>
                  <div><Label>Макетов</Label>
                    <Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} />
                  </div>
                  <div><Label>Готовый Ш, мм</Label>
                    <Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} />
                  </div>
                  <div><Label>Готовый В, мм</Label>
                    <Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} />
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
                    <Checkbox id="own-turn" checked={ownTurn} onCheckedChange={(v) => setOwnTurn(!!v)} />
                    <Label htmlFor="own-turn" className="cursor-pointer">Свой оборот</Label>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label>
                    <Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} />
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    На лист: <b>{itemsPerSheet}</b> · слоёв: <b>{layersTotal}</b> · печ. листов всего: <b>{totalSheetsAllLayers}</b>
                    {" · "}приладка/слой: <b>{setupSheets}</b> · режим: <b>{effectivePrintMode}</b>
                    {fastenKind !== "none" && <> · блоков: <b>{blocks}</b></>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["ncr", "print", "num", "perf", "fasten", "pack"]} className="w-full">
                    <AccordionItem value="ncr">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. NCR-слои
                          <Badge variant="outline" className="text-[10px]">{layersTotal} сл.</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Количество слоёв</Label>
                            <Select value={String(layers)} onValueChange={(v) => setLayers(+v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 слоя (CB + CF)</SelectItem>
                                <SelectItem value="3">3 слоя (CB + CFB + CF)</SelectItem>
                                <SelectItem value="4">4 слоя</SelectItem>
                                <SelectItem value="5">5 слоёв</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Верхний слой (CB)</Label>
                            <Select value={topKey} onValueChange={setTopKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {NCR_TOP.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {layersTotal >= 3 && (
                            <div>
                              <Label>Средний слой (CFB)</Label>
                              <Select value={midKey} onValueChange={setMidKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {NCR_MID.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div>
                            <Label>Нижний слой (CF)</Label>
                            <Select value={botKey} onValueChange={setBotKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {NCR_BOT.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Row label="Автоматическая подборка" checked={autoCollate} onChange={setAutoCollate} />
                          <div><Label>Цена подборки за лист</Label>
                            <Input type="number" step="0.1" value={collatePricePerSheet}
                              onChange={(e) => setCollatePricePerSheet(+e.target.value || 0)} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="print">
                      <AccordionTrigger>3. Печать и формы</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div><Label>Цена формы</Label>
                            <Input type="number" value={platePrice} onChange={(e) => setPlatePrice(+e.target.value || 0)} />
                          </div>
                          <div><Label>Цена офсетной печати за лист</Label>
                            <Input type="number" step="0.1" value={printPricePerSheet}
                              onChange={(e) => setPrintPricePerSheet(+e.target.value || 0)} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="num">
                      <AccordionTrigger>4. Нумерация и переменные данные</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Нумерация" checked={hasNumbering} onChange={setHasNumbering} />
                          {hasNumbering && (<>
                            <div><Label>Номеров на комплект</Label>
                              <Input type="number" min={1} value={numbersPerSet}
                                onChange={(e) => setNumbersPerSet(+e.target.value || 1)} />
                            </div>
                            <div><Label>Цена номера</Label>
                              <Input type="number" step="0.1" value={numberingPrice}
                                onChange={(e) => setNumberingPrice(+e.target.value || 0)} />
                            </div>
                          </>)}
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
                          <Row label="Штрихкод" checked={hasBarcode} onChange={setHasBarcode} />
                          <Row label="Персонализация" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (
                            <div><Label>Переменных элементов</Label>
                              <Input type="number" min={1} value={variableElements}
                                onChange={(e) => setVariableElements(+e.target.value || 1)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="perf">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Перфорация
                          {hasPerforation && <Badge variant="outline" className="text-[10px]">перф ×{perfLines}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Перфорация" checked={hasPerforation} onChange={setHasPerforation} />
                          {hasPerforation && (<>
                            <div><Label>Линий на комплект</Label>
                              <Input type="number" min={1} value={perfLines}
                                onChange={(e) => setPerfLines(+e.target.value || 1)} />
                            </div>
                            <div><Label>Длина линии, мм</Label>
                              <Input type="number" min={1} value={perfLineLenMm}
                                onChange={(e) => setPerfLineLenMm(+e.target.value || 1)} />
                            </div>
                            <div><Label>Цена за пог.м</Label>
                              <Input type="number" step="0.1" value={perfPricePerM}
                                onChange={(e) => setPerfPricePerM(+e.target.value || 0)} />
                            </div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="fasten">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Скрепление
                          <Badge variant="outline" className="text-[10px]">
                            {fastenKind === "glue_pva" ? "ПВА" :
                             fastenKind === "staple" ? "Скоба" :
                             fastenKind === "spine" ? "Корешок" :
                             fastenKind === "book" ? "Книжка" : "Без скрепления"}
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
                                <SelectItem value="glue_pva">Проклейка ПВА</SelectItem>
                                <SelectItem value="staple">Скоба</SelectItem>
                                <SelectItem value="spine">Склейка в корешок</SelectItem>
                                <SelectItem value="book">NCR-книжка</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {fastenKind !== "none" && (
                            <div><Label>Комплектов в блоке</Label>
                              <Input type="number" min={1} value={setsPerBlock}
                                onChange={(e) => setSetsPerBlock(+e.target.value || 1)} />
                            </div>
                          )}
                          {(fastenKind === "glue_pva" || fastenKind === "spine" || fastenKind === "book") && (<>
                            <div><Label>Цена клея за пог.м</Label>
                              <Input type="number" step="0.1" value={gluePricePerM}
                                onChange={(e) => setGluePricePerM(+e.target.value || 0)} />
                            </div>
                            <div><Label>Цена проклейки блока</Label>
                              <Input type="number" step="0.1" value={glueBlockPrice}
                                onChange={(e) => setGlueBlockPrice(+e.target.value || 0)} />
                            </div>
                          </>)}
                          {fastenKind === "staple" && (<>
                            <div><Label>Скоб на блок</Label>
                              <Input type="number" min={1} value={staplesPerBlock}
                                onChange={(e) => setStaplesPerBlock(+e.target.value || 1)} />
                            </div>
                            <div><Label>Цена скобы</Label>
                              <Input type="number" step="0.1" value={staplePrice}
                                onChange={(e) => setStaplePrice(+e.target.value || 0)} />
                            </div>
                            <div><Label>Цена установки скобы</Label>
                              <Input type="number" step="0.1" value={stapleInstallPrice}
                                onChange={(e) => setStapleInstallPrice(+e.target.value || 0)} />
                            </div>
                          </>)}
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
                  <div className="flex justify-between text-accent font-semibold"><span>За комплект</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="ncr"
                defaultName={`${name} · ${KINDS.find((k) => k.value === kind)?.label || ""} · ${setsCirculation} компл.`}
                circulation={setsCirculation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-ncr" />
          
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