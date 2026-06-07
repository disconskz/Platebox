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
import { useHandbook } from "@/lib/operations/HandbookProvider";
import { buildTryHandbook } from "@/lib/operations/applyHandbook";
/**
 * Шаблон «Открытка» — листовая логика с поддержкой биговки, фальцовки,
 * фигурной высечки, премиальной отделки, персонализации и конвертов.
 */

type FormatOpt = { value: string; label: string; w: number; h: number };
const FORMATS: FormatOpt[] = [
  { value: "100x150", label: "100×150 (евро)", w: 100, h: 150 },
  { value: "105x148", label: "A6 105×148", w: 105, h: 148 },
  { value: "148x210", label: "A5 148×210", w: 148, h: 210 },
  { value: "150x150", label: "Квадрат 150×150", w: 150, h: 150 },
  { value: "200x100", label: "DL 200×100", w: 200, h: 100 },
  { value: "210x100", label: "Длинная 210×100", w: 210, h: 100 },
  { value: "custom", label: "Свой размер", w: 148, h: 210 },
];

type Paper = { value: string; label: string; pricePerSheet: number; sheetW: number; sheetH: number; density: number; premium?: boolean };
const PAPERS: Paper[] = [
  { value: "coated250", label: "Мелованная 250 г/м²", pricePerSheet: 70, sheetW: 620, sheetH: 940, density: 250 },
  { value: "coated300", label: "Мелованная 300 г/м²", pricePerSheet: 90, sheetW: 620, sheetH: 940, density: 300 },
  { value: "designer250", label: "Дизайнерская 250 г/м²", pricePerSheet: 180, sheetW: 720, sheetH: 1020, density: 250, premium: true },
  { value: "designer300", label: "Дизайнерская 300 г/м²", pricePerSheet: 220, sheetW: 720, sheetH: 1020, density: 300, premium: true },
  { value: "textured300", label: "Текстурная 300 г/м²", pricePerSheet: 260, sheetW: 720, sheetH: 1020, density: 300, premium: true },
  { value: "kraft280", label: "Крафт 280 г/м²", pricePerSheet: 95, sheetW: 700, sheetH: 1000, density: 280 },
  { value: "touch300", label: "Touch cover 300 г/м²", pricePerSheet: 320, sheetW: 720, sheetH: 1020, density: 300, premium: true },
  { value: "metallic290", label: "Metallic 290 г/м²", pricePerSheet: 380, sheetW: 720, sheetH: 1020, density: 290, premium: true },
  { value: "premium350", label: "Premium 350 г/м²", pricePerSheet: 450, sheetW: 720, sheetH: 1020, density: 350, premium: true },
];

type CardKind = "single" | "fold" | "double" | "euro" | "diecut" | "premium" | "invitation";
const KINDS: { value: CardKind; label: string; folds: number; bigs: number }[] = [
  { value: "single", label: "Односторонняя", folds: 0, bigs: 0 },
  { value: "fold", label: "Со сгибом", folds: 1, bigs: 1 },
  { value: "double", label: "Двойная (2 сгиба)", folds: 2, bigs: 2 },
  { value: "euro", label: "Евроформат (1 сгиб)", folds: 1, bigs: 1 },
  { value: "diecut", label: "Фигурная (с высечкой)", folds: 0, bigs: 0 },
  { value: "premium", label: "Premium (сгиб + отделка)", folds: 1, bigs: 1 },
  { value: "invitation", label: "Пригласительная", folds: 1, bigs: 1 },
];

type LamType = "none" | "mat" | "gloss" | "soft" | "antiscratch";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 220 },
  { value: "gloss", label: "Глянцевая", price: 200 },
  { value: "soft", label: "Soft-touch", price: 380 },
  { value: "antiscratch", label: "Anti-scratch", price: 420 },
];

type EnvelopeKind = "none" | "e65" | "c6" | "c5" | "square" | "designer";
const ENVELOPES: { value: EnvelopeKind; label: string; price: number }[] = [
  { value: "none", label: "Без конверта", price: 0 },
  { value: "e65", label: "E65 (евро)", price: 12 },
  { value: "c6", label: "C6 (114×162)", price: 14 },
  { value: "c5", label: "C5 (162×229)", price: 18 },
  { value: "square", label: "Квадратный 160×160", price: 22 },
  { value: "designer", label: "Дизайнерский / премиум", price: 65 },
];

type PackKind = "none" | "bag" | "box" | "shrink" | "premium";
const PACKS: { value: PackKind; label: string; price: number }[] = [
  { value: "none", label: "Без индивидуальной упаковки", price: 0 },
  { value: "bag", label: "Пакет", price: 6 },
  { value: "shrink", label: "Термоусадка", price: 3 },
  { value: "box", label: "Коробка", price: 28 },
  { value: "premium", label: "Premium упаковка", price: 80 },
];

export default function CardCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [presetKey, setPresetKey] = useState("105x148");
  const [customW, setCustomW] = useState(105);
  const [customH, setCustomH] = useState(148);
  const [circulation, setCirculation] = useState(500);
  const [kind, setKind] = useState<CardKind>("fold");
  const [bigs, setBigs] = useState(1);
  const [folds, setFolds] = useState(1);
  const [margin, setMargin] = useState(35);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [ownTurn, setOwnTurn] = useState(true);
  const [leadDays, setLeadDays] = useState(5);

  // Бумага / печать
  const [paperKey, setPaperKey] = useState("coated300");
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(4);

  // Постпечать
  const [lamType, setLamType] = useState<LamType>("mat");
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [spotVarnishAreaCm2, setSpotVarnishAreaCm2] = useState(50);
  const [optStamp, setOptStamp] = useState(false);
  const [stampAreaCm2, setStampAreaCm2] = useState(15);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(true);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);
  const [optEyelets, setOptEyelets] = useState(false);
  const [eyeletsCount, setEyeletsCount] = useState(1);
  const [optMagnet, setOptMagnet] = useState(false);

  // Персонализация / вклейка
  const [optPersonal, setOptPersonal] = useState(false);
  const [personalKind, setPersonalKind] = useState<"name" | "qr" | "number" | "text" | "variable">("name");
  const [personalCount, setPersonalCount] = useState(1);
  const [optInsert, setOptInsert] = useState(false);
  const [insertCount, setInsertCount] = useState(1);

  // Конверт / упаковка
  const [envelopeKind, setEnvelopeKind] = useState<EnvelopeKind>("none");
  const [packKind, setPackKind] = useState<PackKind>("none");

  const format = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[1], [presetKey]);
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;
  const paper = useMemo(() => PAPERS.find((p) => p.value === paperKey)!, [paperKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const envelope = useMemo(() => ENVELOPES.find((e) => e.value === envelopeKind)!, [envelopeKind]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Размер в развороте
  const spreadW = useMemo(() => {
    const f = folds;
    if (f <= 0) return itemW;
    if (kind === "double" || f >= 2) return itemW * (f + 1);
    return itemW * 2;
  }, [itemW, folds, kind]);

  // Авто-логика
  useEffect(() => {
    const k = KINDS.find((x) => x.value === kind)!;
    setFolds(k.folds);
    setBigs(k.bigs);
    if (kind === "diecut") setOptDieCut(true);
    if (kind === "premium") {
      if (lamType === "none") setLamType("soft");
      setOptEmboss(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    if (optDieCut && !optDeflash) setOptDeflash(true);
  }, [optDieCut, optDeflash]);

  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);

  // Премиальный коэффициент
  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (paper.premium) k += 0.1;
    if (lamType === "soft" || lamType === "antiscratch") k += 0.1;
    if (optStamp) k += 0.05;
    if (optEmboss) k += 0.05;
    if (kind === "premium") k += 0.1;
    return +k.toFixed(2);
  }, [paper, lamType, optStamp, optEmboss, kind]);

  // Раскладка: считаем по развороту (с учётом сгибов)
  const layout = useMemo(() => {
    const sheetW = paper.sheetW;
    const sheetH = paper.sheetH;
    const w = spreadW;
    const h = itemH;
    const colsA = Math.floor(sheetW / w) * Math.floor(sheetH / h);
    const colsB = Math.floor(sheetW / h) * Math.floor(sheetH / w);
    const up = Math.max(1, colsA, colsB);
    const net = Math.ceil(circulation / up);
    const setup = offset ? 150 : 25;
    return { up, net, printSheets: net + setup, areaM2: (w * h) / 1_000_000 };
  }, [paper, spreadW, itemH, circulation, offset]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    if (hasDesign) push("Препресс", "Дизайн открытки", 1, "усл.", 8000);
    push("Препресс", "Проверка макета и спуск полос", 1, "усл.", 1000);

    // Бумага
    push("Материалы", `Бумага: ${paper.label}`, layout.printSheets, "лист", paper.pricePerSheet);

    // Печать
    if (offset) {
      const forms = Math.max(colorFront, 0) + Math.max(colorBack, 0);
      push("Печать", "Печатные формы", forms, "форма", 1500);
      const setupCost = (ownTurn ? 150 : 300) + 0.01 * layout.printSheets * 100;
      push("Печать", "Приладка", 1, "усл.", +setupCost.toFixed(2));
    }
    push("Печать", offset ? "Печать (офсет)" : "Печать (цифра)",
      layout.printSheets, "лист", offset ? 6 : 32);

    // Ламинация
    if (lamType !== "none") {
      const sides = 1;
      push("Постпечать", `Ламинация: ${lam.label}`,
        +(layout.areaM2 * layout.printSheets * sides).toFixed(3), "м²", lam.price);
    }
    if (optVarnish) push("Постпечать", "УФ/ВД-лак", layout.printSheets, "лист", 5);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 3000);
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
        circulation, "оттиск", Math.max(8, stampAreaCm2 * 0.6) * premiumCoef);
    }
    if (optEmboss) {
      push("Постпечать", "Клише конгрева", 1, "усл.", 3500);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1500);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", 12 * premiumCoef);
    }
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", 6500);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1800);
      push("Постпечать", "Высечка", layout.printSheets, "лист", 4);
      if (optDeflash) push("Постпечать", "Удаление облоя", layout.printSheets, "лист", 1.5);
    }

    // Биговка
    if (bigs > 0) {
      push("Сборка", "Биговка", circulation * bigs, "биг", 1.5);
      push("Сборка", "Приладка биговки", 1, "усл.", 800);
    }
    // Фальцовка
    if (folds > 0) {
      push("Сборка", "Фальцовка / сложение", circulation * folds, "сложение", 1.2);
      push("Сборка", "Приладка фальцовки", 1, "усл.", 800);
    }
    // Скругление углов
    if (optRound) push("Постпечать", "Скругление углов", circulation * roundCorners, "угол", 0.6);
    // Люверсы
    if (optEyelets) {
      push("Постпечать", "Люверсы (материал)", circulation * eyeletsCount, "шт.", 1.2);
      push("Постпечать", "Установка люверсов", circulation * eyeletsCount, "шт.", 2.5);
    }
    // Магниты
    if (optMagnet) {
      push("Постпечать", "Магнит (материал)", circulation, "шт.", 8);
      push("Постпечать", "Установка магнита", circulation, "шт.", 5);
    }

    // Персонализация
    if (optPersonal && personalCount > 0) {
      const map: Record<typeof personalKind, { name: string; price: number }> = {
        name: { name: "Имя", price: 6 },
        qr: { name: "QR-код", price: 8 },
        number: { name: "Нумерация", price: 1.2 },
        text: { name: "Индивидуальный текст", price: 9 },
        variable: { name: "Переменные данные", price: 12 },
      };
      const cfg = map[personalKind];
      push("Персонализация", "Подготовка данных", 1, "усл.", 2500);
      push("Персонализация", `Персонализация: ${cfg.name}`,
        circulation * personalCount, "элемент", cfg.price);
    }

    // Вклейка
    if (optInsert && insertCount > 0) {
      push("Сборка", "Вклейка элементов", circulation * insertCount, "вклейка", 3.5);
    }

    // Конверт + комплектовка
    if (envelopeKind !== "none") {
      push("Комплектация", `Конверт: ${envelope.label}`, circulation, "шт.", envelope.price);
      push("Комплектация", "Комплектовка с конвертом", circulation, "компл.", 2);
    }

    // Индивидуальная упаковка
    if (packKind !== "none") {
      push("Упаковка", `Индивидуальная: ${pack.label}`, circulation, "шт.", pack.price);
    }

    // Финальные
    push("Финиш", "Обрезка готового изделия", circulation, "шт.", 1.2);
    push("Логистика", "Контроль качества", 1, "усл.", 1200);
    push("Логистика", "Упаковка тиража", circulation, "шт.", 2);
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [hasDesign, paper, layout, offset, colorFront, colorBack, ownTurn, lamType, lam, optVarnish, optSpotVarnish, spotVarnishAreaCm2, optStamp, stampAreaCm2, optEmboss, optDieCut, optDeflash, bigs, folds, optRound, roundCorners, optEyelets, eyeletsCount, optMagnet, optPersonal, personalKind, personalCount, optInsert, insertCount, envelopeKind, envelope, packKind, pack, premiumCoef, circulation, hasDelivery, deliveryCost]);

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
    s.push("Проверка макета", "Подбор печатного формата и раскладка", "Бумага");
    if (offset) s.push("Вывод печатных форм", "Приладка");
    s.push(offset ? "Печать (офсет)" : "Печать (цифра)");
    if (lamType !== "none") s.push(`Ламинация: ${lam.label}`);
    if (optVarnish) s.push("УФ/ВД-лак");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optStamp) s.push("Тиснение фольгой");
    if (optEmboss) s.push("Конгрев");
    if (optDieCut) {
      s.push("Высечка");
      if (optDeflash) s.push("Удаление облоя");
    }
    if (bigs > 0) s.push("Биговка");
    if (folds > 0) s.push("Фальцовка / сложение");
    if (optPersonal) s.push("Персонализация");
    if (optInsert) s.push("Вклейка");
    if (envelopeKind !== "none") s.push("Комплектовка с конвертом");
    if (optRound) s.push("Скругление углов");
    if (optEyelets) s.push("Люверсы");
    if (optMagnet) s.push("Магниты");
    if (packKind !== "none") s.push(`Индивидуальная упаковка: ${pack.label}`);
    s.push("Контроль качества", "Упаковка");
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, offset, lamType, lam, optVarnish, optSpotVarnish, optStamp, optEmboss, optDieCut, optDeflash, bigs, folds, optPersonal, optInsert, envelopeKind, optRound, optEyelets, optMagnet, packKind, pack, hasDelivery]);

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
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Открытка</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Greeting / invitation / premium — биговка, фальцовка, высечка, премиальная отделка, персонализация, конверты.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 60</Badge>
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
                    <Label>Готовый размер</Label>
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
                    <Label>Тип конструкции</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as CardKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground self-end">
                    В развороте: <b>{spreadW}×{itemH}</b> мм
                  </div>
                  <div><Label>Количество бигов</Label><Input type="number" min={0} value={bigs} onChange={(e) => setBigs(+e.target.value || 0)} /></div>
                  <div><Label>Количество сложений</Label><Input type="number" min={0} value={folds} onChange={(e) => setFolds(+e.target.value || 0)} /></div>
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
                  <Accordion type="multiple" defaultValue={["paper", "postpress"]} className="w-full">
                    {/* Бумага и печать */}
                    <AccordionItem value="paper">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Бумага и печать
                          <Badge variant="secondary" className="text-[10px]">{paper.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Бумага</Label>
                            <Select value={paperKey} onValueChange={setPaperKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PAPERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} ({fmtMoney(p.pricePerSheet)}/лист){p.premium ? " · premium" : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Плотность, г/м²</Label><Input value={paper.density} readOnly /></div>
                          <div><Label>Премиум-материал</Label><Input value={paper.premium ? "да" : "нет"} readOnly /></div>
                          <div><Label>Цветность (лицо)</Label><Input type="number" min={0} max={6} value={colorFront} onChange={(e) => setColorFront(+e.target.value || 0)} /></div>
                          <div><Label>Цветность (оборот)</Label><Input type="number" min={0} max={6} value={colorBack} onChange={(e) => setColorBack(+e.target.value || 0)} /></div>
                          <div className="sm:col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            На лист: <b>{layout.up}</b> шт. · Полезных листов: <b>{layout.net}</b> · С учётом приладки: <b>{layout.printSheets}</b>.
                            Коэф. сложности: <b>×{premiumCoef.toFixed(2)}</b>.
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Конструкция / сгибы */}
                    <AccordionItem value="construction">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Конструкция и сгибы
                          <Badge variant="outline" className="text-[10px]">биги: {bigs} · сложения: {folds}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground pt-2 space-y-1">
                          <div>Тип конструкции и количество бигов/сложений задаются в блоке «Основные параметры».</div>
                          <div>Биговка и фальцовка добавляются в маршрут автоматически при наличии сгиба.</div>
                          <div>Готовый размер: <b>{itemW}×{itemH}</b> мм, разворот: <b>{spreadW}×{itemH}</b> мм.</div>
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
                            <Row label="Фигурная высечка" checked={optDieCut} onChange={setOptDieCut} />
                            <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                            <Row label="Скругление углов" checked={optRound} onChange={setOptRound}>
                              <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">угла</span>
                            </Row>
                            <Row label="Люверсы" checked={optEyelets} onChange={setOptEyelets}>
                              <Input className="h-8 w-20" type="number" min={1} value={eyeletsCount} onChange={(e) => setEyeletsCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">шт./изд.</span>
                            </Row>
                            <Row label="Магнит" checked={optMagnet} onChange={setOptMagnet} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Персонализация */}
                    <AccordionItem value="personal">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Персонализация
                          <Badge variant={optPersonal ? "default" : "outline"} className="text-[10px]">{optPersonal ? "вкл" : "выкл"}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="personal" checked={optPersonal} onCheckedChange={(v) => setOptPersonal(!!v)} />
                            <Label htmlFor="personal" className="cursor-pointer">Включить персонализацию</Label>
                          </div>
                          {optPersonal && (<>
                            <div>
                              <Label>Тип</Label>
                              <Select value={personalKind} onValueChange={(v) => setPersonalKind(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="name">Имя</SelectItem>
                                  <SelectItem value="qr">QR-код</SelectItem>
                                  <SelectItem value="number">Нумерация</SelectItem>
                                  <SelectItem value="text">Индивидуальный текст</SelectItem>
                                  <SelectItem value="variable">Переменные данные</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Количество элементов на изделие</Label>
                              <Input type="number" min={1} value={personalCount} onChange={(e) => setPersonalCount(+e.target.value || 1)} />
                            </div>
                          </>)}
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="insert" checked={optInsert} onCheckedChange={(v) => setOptInsert(!!v)} />
                            <Label htmlFor="insert" className="cursor-pointer">Вклейка дополнительных элементов</Label>
                            {optInsert && (<>
                              <Input className="h-8 w-20 ml-2" type="number" min={1} value={insertCount} onChange={(e) => setInsertCount(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">вклеек/изд.</span>
                            </>)}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Конверты / комплектовка */}
                    <AccordionItem value="envelope">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Конверты и комплектовка
                          <Badge variant={envelopeKind !== "none" ? "default" : "outline"} className="text-[10px]">{envelope.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Конверт</Label>
                            <Select value={envelopeKind} onValueChange={(v) => setEnvelopeKind(v as EnvelopeKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ENVELOPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}{e.price ? ` · ${fmtMoney(e.price)}/шт` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {envelopeKind !== "none" && (
                            <div className="sm:col-span-2 text-xs text-muted-foreground">
                              Комплектовка с конвертом добавляется автоматически — каждая открытка вкладывается в свой конверт.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Упаковка и доставка */}
                    <AccordionItem value="ship">
                      <AccordionTrigger>7. Упаковка и доставка</AccordionTrigger>
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
                defaultName={`Открытка ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-card" />
          
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
