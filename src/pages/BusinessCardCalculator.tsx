import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard } from "lucide-react";
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
 * Шаблон «Визитка» — отдельный маршрут листовой продукции с расширенной
 * постпечатной логикой: дизайнерская бумага, ламинация / soft-touch,
 * тиснение, конгрев, выборочный лак, скругление углов, высечка,
 * персонализация и сортировка по сотрудникам. Доработка 78.
 */

type CardKind =
  | "standard" | "twoSided" | "designer" | "premium" | "laminated" | "softTouch"
  | "stamping" | "embossing" | "spotUv" | "rounded" | "diecut" | "corporate";

const KINDS: { value: CardKind; label: string }[] = [
  { value: "standard", label: "Стандартная визитка" },
  { value: "twoSided", label: "Двусторонняя визитка" },
  { value: "designer", label: "Дизайнерская визитка" },
  { value: "premium", label: "Premium визитка" },
  { value: "laminated", label: "С ламинацией" },
  { value: "softTouch", label: "Soft-touch" },
  { value: "stamping", label: "С тиснением фольгой" },
  { value: "embossing", label: "С конгревом" },
  { value: "spotUv", label: "С выборочным лаком" },
  { value: "rounded", label: "Со скруглением углов" },
  { value: "diecut", label: "Фигурная (высечка)" },
  { value: "corporate", label: "Корпоративный набор (по сотрудникам)" },
];

type Material = {
  value: string; label: string;
  type: "coated" | "cardboard" | "designer" | "kraft" | "linen" | "metallic" | "touchcover" | "plastic";
  density: number; pricePerSheet: number; sheetW: number; sheetH: number;
};
const MATERIALS: Material[] = [
  { value: "coated-250", label: "Мелованная 250 г", type: "coated", density: 250, pricePerSheet: 130, sheetW: 450, sheetH: 320 },
  { value: "coated-300", label: "Мелованный картон 300 г", type: "cardboard", density: 300, pricePerSheet: 155, sheetW: 450, sheetH: 320 },
  { value: "coated-350", label: "Мелованный картон 350 г", type: "cardboard", density: 350, pricePerSheet: 175, sheetW: 450, sheetH: 320 },
  { value: "coated-400", label: "Мелованный картон 400 г", type: "cardboard", density: 400, pricePerSheet: 205, sheetW: 450, sheetH: 320 },
  { value: "designer-280", label: "Дизайнерская 280 г", type: "designer", density: 280, pricePerSheet: 310, sheetW: 450, sheetH: 320 },
  { value: "designer-350", label: "Дизайнерская 350 г", type: "designer", density: 350, pricePerSheet: 380, sheetW: 450, sheetH: 320 },
  { value: "touchcover", label: "Touch Cover", type: "touchcover", density: 320, pricePerSheet: 460, sheetW: 450, sheetH: 320 },
  { value: "kraft-300", label: "Крафт 300 г", type: "kraft", density: 300, pricePerSheet: 180, sheetW: 450, sheetH: 320 },
  { value: "linen-300", label: "Лён 300 г", type: "linen", density: 300, pricePerSheet: 340, sheetW: 450, sheetH: 320 },
  { value: "pearl-300", label: "Перламутровая 300 г", type: "designer", density: 300, pricePerSheet: 360, sheetW: 450, sheetH: 320 },
  { value: "metallic-300", label: "Metallic paper 300 г", type: "metallic", density: 300, pricePerSheet: 420, sheetW: 450, sheetH: 320 },
  { value: "pvc-050", label: "Пластик PVC 0.5 мм", type: "plastic", density: 0, pricePerSheet: 520, sheetW: 320, sheetH: 460 },
  { value: "pvc-clear", label: "Прозрачный пластик 0.5 мм", type: "plastic", density: 0, pricePerSheet: 640, sheetW: 320, sheetH: 460 },
];

type PresetFormat = { label: string; w: number; h: number };
const PRESETS: PresetFormat[] = [
  { label: "90×50 мм (стандарт)", w: 90, h: 50 },
  { label: "85×55 мм (евро)", w: 85, h: 55 },
  { label: "90×55 мм", w: 90, h: 55 },
  { label: "100×50 мм", w: 100, h: 50 },
  { label: "50×50 мм (квадрат)", w: 50, h: 50 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv";

type LamKind = "none" | "gloss" | "matte" | "soft" | "antiscratch";
const LAMS: { value: LamKind; label: string; perM2: number; setup: number }[] = [
  { value: "none", label: "Без ламинации", perM2: 0, setup: 0 },
  { value: "gloss", label: "Глянцевая", perM2: 95, setup: 800 },
  { value: "matte", label: "Матовая", perM2: 110, setup: 800 },
  { value: "soft", label: "Soft-touch", perM2: 220, setup: 1200 },
  { value: "antiscratch", label: "Anti-scratch", perM2: 180, setup: 1000 },
];

type PackKind = "none" | "p50" | "p100" | "individual" | "box" | "premium" | "perEmployee";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "p50", label: "Пачка по 50", price: 22, perPack: 50 },
  { value: "p100", label: "Пачка по 100", price: 30, perPack: 100 },
  { value: "individual", label: "Индивидуальный пакет", price: 12, perPack: 1 },
  { value: "box", label: "В коробку", price: 280, perPack: 200 },
  { value: "premium", label: "Premium упаковка", price: 95, perPack: 1 },
  { value: "perEmployee", label: "Комплект по сотруднику", price: 35, perPack: 1 },
];

export default function BusinessCardCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [kind, setKind] = useState<CardKind>("standard");
  const [circulation, setCirculation] = useState(1000);
  const [designsCount, setDesignsCount] = useState(1);
  const [employees, setEmployees] = useState(0);
  const [perEmployee, setPerEmployee] = useState(100);
  const [presetIdx, setPresetIdx] = useState(0);
  const [finishedW, setFinishedW] = useState(90);
  const [finishedH, setFinishedH] = useState(50);
  const [orientation, setOrientation] = useState<"h" | "v">("h");
  const [twoSided, setTwoSided] = useState(false);
  const [colorsFront, setColorsFront] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [pantone, setPantone] = useState(0);
  const [whiteInk, setWhiteInk] = useState(false);
  const [foreignTurn, setForeignTurn] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [leadDays, setLeadDays] = useState(3);
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("coated-300");
  const [bleed, setBleed] = useState(2);
  const [gap, setGap] = useState(2);

  // Ламинация
  const [lamKind, setLamKind] = useState<LamKind>("none");
  const [lamSides, setLamSides] = useState<1 | 2>(2);

  // Лак / тиснение / конгрев
  const [hasUvFull, setHasUvFull] = useState(false);
  const [hasUvSpot, setHasUvSpot] = useState(false);
  const [uvSpotAreaCm2, setUvSpotAreaCm2] = useState(8);
  const [hasStamping, setHasStamping] = useState(false);
  const [stampW, setStampW] = useState(3);
  const [stampH, setStampH] = useState(2);
  const [hasEmbossing, setHasEmbossing] = useState(false);
  const [embW, setEmbW] = useState(3);
  const [embH, setEmbH] = useState(2);

  // Высечка / скругление
  const [hasDieCut, setHasDieCut] = useState(false);
  const [hasRounded, setHasRounded] = useState(false);
  const [roundedCorners, setRoundedCorners] = useState(4);

  // Персонализация
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(2);
  const [hasQr, setHasQr] = useState(false);
  const [hasNumbering, setHasNumbering] = useState(false);

  // Сортировка / упаковка
  const [hasSorting, setHasSorting] = useState(false);
  const [packKind, setPackKind] = useState<PackKind>("p100");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamKind)!, [lamKind]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Авто-формат из пресета
  useEffect(() => {
    const p = PRESETS[presetIdx];
    if (p) { setFinishedW(p.w); setFinishedH(p.h); }
  }, [presetIdx]);

  // Корпоративный набор → авто-тираж
  useEffect(() => {
    if (kind === "corporate" && employees > 0 && perEmployee > 0) {
      setCirculation(employees * perEmployee);
      setHasPersonalization(true);
      setHasSorting(true);
      setPackKind("perEmployee");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, employees, perEmployee]);

  // Авто-логика по типу визитки
  useEffect(() => {
    if (kind === "twoSided") setTwoSided(true);
    if (kind === "designer" && material.type !== "designer") setMaterialKey("designer-300");
    if (kind === "premium") {
      if (material.type !== "designer" && material.type !== "touchcover") setMaterialKey("touchcover");
      setLamKind("soft");
      setHasStamping(true);
      setHasEmbossing(true);
      setHasUvSpot(true);
      setHasRounded(true);
      setPackKind("premium");
    }
    if (kind === "laminated" && lamKind === "none") setLamKind("matte");
    if (kind === "softTouch") setLamKind("soft");
    if (kind === "stamping") setHasStamping(true);
    if (kind === "embossing") setHasEmbossing(true);
    if (kind === "spotUv") setHasUvSpot(true);
    if (kind === "rounded") setHasRounded(true);
    if (kind === "diecut") setHasDieCut(true);
    if (material.type === "plastic") {
      setHasRounded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, materialKey]);

  // Раскладка с поворотом
  const printableW = material.sheetW - 16;
  const printableH = material.sheetH - 16;
  const itemW = Math.max(1, finishedW + 2 * bleed + gap);
  const itemH = Math.max(1, finishedH + 2 * bleed + gap);
  const layout = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH]);
  const itemsPerSheet = layout;

  const netSheets = useMemo(() => Math.ceil(circulation / itemsPerSheet), [circulation, itemsPerSheet]);

  // Выбор печати
  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.type === "plastic") return "uv";
    return circulation >= 800 ? "offset" : "digital";
  }, [printMode, material, circulation]);

  // Формы (по правилам §13)
  const formsCount = useMemo(() => {
    const front = colorsFront + pantone;
    const back = twoSided ? colorsBack : 0;
    if (!twoSided) return front;
    if (foreignTurn) return front + back;
    // свой оборот: max сторон
    return Math.max(front + back, front);
  }, [colorsFront, colorsBack, pantone, twoSided, foreignTurn]);

  // Приладка
  const setupSheets = useMemo(() => {
    if (effectivePrintMode !== "offset") return 6;
    const base = foreignTurn ? 300 : 150;
    return base + Math.ceil(netSheets * 0.01);
  }, [effectivePrintMode, foreignTurn, netSheets]);

  const printSheets = netSheets + setupSheets;
  const itemAreaM2 = (finishedW * finishedH) / 1_000_000;
  const sheetAreaM2 = (material.sheetW * material.sheetH) / 1_000_000;

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    if (hasDesign) push("Препресс", "Дизайн макета", Math.max(1, designsCount), "макет", 3500);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 800);
    push("Препресс", "Раскладка", 1, "усл.", 600);

    // Материал
    push("Материалы", material.label, printSheets, "лист", material.pricePerSheet);
    push("Препресс", "Резка закупочного листа", printSheets, "лист", 0.8);

    // Печать
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    if (effectivePrintMode === "offset") {
      push("Печать", "Печатные формы", formsCount, "форма", 1000);
      push("Печать", "Вывод форм", formsCount, "форма", 500);
      push("Печать", "Приладка офсета", 1, "ед.", foreignTurn ? 3500 : 2000);
      push("Печать", `Офсетная печать${twoSided ? (foreignTurn ? " (чужой оборот)" : " (свой оборот)") : ""}`,
        printSheets * (twoSided && foreignTurn ? 2 : 1), "оттиск", 5);
    } else if (effectivePrintMode === "digital") {
      push("Печать", `Цифровая печать${twoSided ? " (2 ст.)" : ""}`,
        printSheets * (twoSided ? 2 : 1), "оттиск", +(18 + colorsTotal * 1.4).toFixed(2));
    } else if (effectivePrintMode === "uv") {
      const m2 = +(printSheets * sheetAreaM2).toFixed(3);
      push("Печать", "Приладка UV-печати", 1, "ед.", 2500);
      push("Печать", `UV-печать${twoSided ? " (2 ст.)" : ""}`,
        +(m2 * (twoSided ? 2 : 1)).toFixed(3), "м²", 1800);
      if (whiteInk) push("Печать", "Белила UV", +(m2 * (twoSided ? 2 : 1)).toFixed(3), "м²", 900);
    }

    // Ламинация
    if (lamKind !== "none") {
      const m2 = +(printSheets * sheetAreaM2 * lamSides).toFixed(3);
      push("Постпечать", `Приладка ламинации: ${lam.label}`, 1, "усл.", lam.setup);
      push("Постпечать", `Ламинация: ${lam.label}${lamSides === 2 ? " (2 ст.)" : ""}`,
        m2, "м²", lam.perM2);
    }

    // УФ-лак / выборочный лак
    if (hasUvFull) {
      const m2 = +(printSheets * sheetAreaM2).toFixed(3);
      push("Постпечать", "Приладка УФ-лака", 1, "усл.", 1500);
      push("Постпечать", "УФ-лак (сплошной)", m2, "м²", 95);
    }
    if (hasUvSpot) {
      const m2 = +((circulation * Math.max(0, uvSpotAreaCm2)) / 10000).toFixed(3);
      push("Препресс", "Форма выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Приладка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Выборочный УФ-лак", m2, "м²", 280);
    }

    // Тиснение фольгой
    if (hasStamping) {
      const area = Math.max(0.01, stampW * stampH);
      const cliche = Math.max(5000, area * 250);
      const foil = +(area * circulation / 10000).toFixed(3);
      push("Постпечать", "Клише тиснения", 1, "шт", cliche);
      push("Постпечать", "Приладка тиснения", 1, "усл.", 2000);
      push("Постпечать", "Тиснение фольгой", circulation, "оттиск", 1.6);
      push("Материалы", "Фольга для тиснения", foil, "м²", 4500);
    }

    // Конгрев
    if (hasEmbossing) {
      const area = Math.max(0.01, embW * embH);
      const cliche = Math.max(8000, area * 350);
      push("Постпечать", "Клише конгрева", 1, "шт", cliche);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 2000);
      push("Постпечать", "Конгрев", circulation, "оттиск", 1.8);
    }

    // Высечка + удаление облоя
    if (hasDieCut) {
      push("Постпечать", "Штамп высечки", 1, "шт", 6000);
      push("Постпечать", "Приладка высечки", 1, "усл.", 2000);
      push("Постпечать", "Высечка", printSheets, "лист", 3);
      push("Постпечать", "Удаление облоя", circulation, "шт", 0.35);
    }

    // Резка готовой продукции
    push("Постпечать", "Резка готовой продукции",
      printSheets * Math.max(1, itemsPerSheet), "рез", 0);
    push("Постпечать", "Резка готовой продукции (стоимость)", printSheets, "лист", 6);

    // Скругление углов
    if (hasRounded) {
      push("Постпечать", "Приладка скругления углов", 1, "усл.", 800);
      push("Постпечать", "Скругление углов", circulation * Math.max(1, roundedCorners), "угол", 0.4);
    }

    // Персонализация / QR / нумерация
    if (hasPersonalization) {
      push("Постпечать", "Подготовка базы персонализации", 1, "усл.", 3000);
      push("Постпечать", "Переменные данные",
        circulation * Math.max(1, variableElements), "элем.", 1.5);
    }
    if (hasQr) {
      push("Постпечать", "Подготовка базы QR", 1, "усл.", 2000);
      push("Постпечать", "Печать QR", circulation, "шт", 1.4);
    }
    if (hasNumbering) {
      push("Постпечать", "Подготовка нумератора", 1, "усл.", 1500);
      push("Постпечать", "Нумерация", circulation, "номер", 0.7);
    }

    // Сортировка
    if (hasSorting || designsCount > 1 || (kind === "corporate" && employees > 1)) {
      if (kind === "corporate" && employees > 0) {
        push("Постпечать", "Сортировка по сотрудникам", employees, "компл.", 35);
      } else {
        push("Постпечать", "Сортировка по макетам", Math.max(1, designsCount), "макет", 250);
      }
    }

    // Контроль качества
    const qcCoef =
      (hasPersonalization || hasNumbering ? 1.3 : 1) *
      (hasStamping || hasEmbossing || hasUvSpot ? 1.2 : 1);
    push("Логистика", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef.toFixed(2) + ")" : ""}`,
      circulation, "шт", +(0.5 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      let units: number;
      if (packKind === "perEmployee" && employees > 0) units = employees;
      else units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);
    return out;
  }, [
    hasDesign, designsCount, material, printSheets, sheetAreaM2,
    colorsFront, colorsBack, twoSided, pantone, whiteInk, effectivePrintMode,
    formsCount, foreignTurn,
    lamKind, lam, lamSides,
    hasUvFull, hasUvSpot, uvSpotAreaCm2, circulation,
    hasStamping, stampW, stampH, hasEmbossing, embW, embH,
    hasDieCut, hasRounded, roundedCorners, itemsPerSheet,
    hasPersonalization, variableElements, hasQr, hasNumbering,
    hasSorting, kind, employees,
    packKind, pack, hasDelivery, deliveryCost,
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
    s.push("Проверка макета", "Раскладка", "Расчёт материала", "Резка закупочного листа");
    if (effectivePrintMode === "offset") s.push("Вывод форм", "Приладка", "Офсетная печать");
    else if (effectivePrintMode === "uv") s.push("UV-печать");
    else s.push("Цифровая печать");
    if (lamKind !== "none") s.push(`Ламинация: ${lam.label}`);
    if (hasUvFull) s.push("УФ-лак сплошной");
    if (hasUvSpot) s.push("Выборочный УФ-лак");
    if (hasStamping) s.push("Тиснение фольгой");
    if (hasEmbossing) s.push("Конгрев");
    if (hasDieCut) s.push("Высечка", "Удаление облоя");
    s.push("Резка готовой продукции");
    if (hasRounded) s.push("Скругление углов");
    if (hasPersonalization) s.push("Персонализация");
    if (hasQr) s.push("Печать QR");
    if (hasNumbering) s.push("Нумерация");
    if (hasSorting || designsCount > 1 || kind === "corporate") s.push("Сортировка");
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, lamKind, lam, hasUvFull, hasUvSpot,
      hasStamping, hasEmbossing, hasDieCut, hasRounded,
      hasPersonalization, hasQr, hasNumbering,
      hasSorting, designsCount, kind, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <CreditCard className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Визитка</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Формат, дизайнерская бумага, ламинация, soft-touch, тиснение, конгрев, выборочный лак, скругление, высечка, персонализация.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 78</Badge>
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
                    <Label>Тип визитки</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as CardKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  <div><Label>Количество макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  {kind === "corporate" && (
                    <>
                      <div><Label>Сотрудников</Label><Input type="number" min={1} value={employees} onChange={(e) => setEmployees(+e.target.value || 0)} /></div>
                      <div><Label>Визиток на сотрудника</Label><Input type="number" min={1} value={perEmployee} onChange={(e) => setPerEmployee(+e.target.value || 0)} /></div>
                    </>
                  )}
                  <div>
                    <Label>Формат</Label>
                    <Select value={String(presetIdx)} onValueChange={(v) => setPresetIdx(+v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRESETS.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ориентация</Label>
                    <Select value={orientation} onValueChange={(v) => setOrientation(v as "h" | "v")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h">Горизонтальная</SelectItem>
                        <SelectItem value="v">Вертикальная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина, мм</Label><Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} /></div>
                  <div><Label>Высота, мм</Label><Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} /></div>
                  <div><Label>Вылеты, мм</Label><Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value || 0)} /></div>
                  <div><Label>Технологический зазор, мм</Label><Input type="number" min={0} value={gap} onChange={(e) => setGap(+e.target.value || 0)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="two-sided" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two-sided" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="foreign-turn" checked={foreignTurn} onCheckedChange={(v) => setForeignTurn(!!v)} disabled={!twoSided} />
                    <Label htmlFor="foreign-turn" className="cursor-pointer">Чужой оборот</Label>
                  </div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} /></div>
                  {twoSided && (<div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>)}
                  <div><Label>Pantone красок</Label><Input type="number" min={0} value={pantone} onChange={(e) => setPantone(+e.target.value || 0)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="white-ink" checked={whiteInk} onCheckedChange={(v) => setWhiteInk(!!v)} />
                    <Label htmlFor="white-ink" className="cursor-pointer">Белила (UV)</Label>
                  </div>
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
                    На лист: <b>{itemsPerSheet}</b> · нетто листов: <b>{netSheets}</b> · приладка: <b>{setupSheets}</b>
                    {" · "}режим печати: <b>{effectivePrintMode}</b> · форм: <b>{formsCount}</b>
                    {" · "}площадь изд.: <b>{fmtNum(itemAreaM2 * 10000)}</b> см²
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "lam", "premium", "cut", "person", "pack"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Бумага / картон</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label} · {fmtMoney(m.pricePerSheet)}/лист
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Тип: <b>{material.type}</b>
                            {material.density > 0 && <> · плотность: <b>{material.density}</b> г/м²</>}
                            {" · "}формат: <b>{material.sheetW}×{material.sheetH}</b>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="lam">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Ламинация
                          <Badge variant="outline" className="text-[10px]">{lam.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип ламинации</Label>
                            <Select value={lamKind} onValueChange={(v) => setLamKind(v as LamKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LAMS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {lamKind !== "none" && (
                            <div>
                              <Label>Стороны</Label>
                              <Select value={String(lamSides)} onValueChange={(v) => setLamSides(+v as 1 | 2)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 сторона</SelectItem>
                                  <SelectItem value="2">2 стороны</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="premium">
                      <AccordionTrigger>4. Лак / тиснение / конгрев</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="УФ-лак сплошной" checked={hasUvFull} onChange={setHasUvFull} />
                          <Row label="Выборочный УФ-лак" checked={hasUvSpot} onChange={setHasUvSpot} />
                          {hasUvSpot && (
                            <div><Label>Площадь лака на изд., см²</Label><Input type="number" min={0} value={uvSpotAreaCm2} onChange={(e) => setUvSpotAreaCm2(+e.target.value || 0)} /></div>
                          )}
                          <Row label="Тиснение фольгой" checked={hasStamping} onChange={setHasStamping} />
                          {hasStamping && (
                            <>
                              <div><Label>Клише — ширина, см</Label><Input type="number" min={0} step={0.1} value={stampW} onChange={(e) => setStampW(+e.target.value || 0)} /></div>
                              <div><Label>Клише — высота, см</Label><Input type="number" min={0} step={0.1} value={stampH} onChange={(e) => setStampH(+e.target.value || 0)} /></div>
                            </>
                          )}
                          <Row label="Конгрев" checked={hasEmbossing} onChange={setHasEmbossing} />
                          {hasEmbossing && (
                            <>
                              <div><Label>Клише конгрева — ширина, см</Label><Input type="number" min={0} step={0.1} value={embW} onChange={(e) => setEmbW(+e.target.value || 0)} /></div>
                              <div><Label>Клише конгрева — высота, см</Label><Input type="number" min={0} step={0.1} value={embH} onChange={(e) => setEmbH(+e.target.value || 0)} /></div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="cut">
                      <AccordionTrigger>5. Высечка и скругление углов</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Высечка (фигурная форма)" checked={hasDieCut} onChange={setHasDieCut} />
                          <Row label="Скругление углов" checked={hasRounded} onChange={setHasRounded} />
                          {hasRounded && (
                            <div><Label>Кол-во углов</Label><Input type="number" min={1} max={4} value={roundedCorners} onChange={(e) => setRoundedCorners(+e.target.value || 1)} /></div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="person">
                      <AccordionTrigger>6. Персонализация и макеты</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Персонализация (ФИО, должность)" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (
                            <div><Label>Переменных элементов</Label><Input type="number" min={1} value={variableElements} onChange={(e) => setVariableElements(+e.target.value || 1)} /></div>
                          )}
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
                          <Row label="Нумерация" checked={hasNumbering} onChange={setHasNumbering} />
                          <Row label="Сортировка по макетам / сотрудникам" checked={hasSorting} onChange={setHasSorting} />
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
                productType="businesscard"
                defaultName={`Визитка ${KINDS.find((k) => k.value === kind)?.label || ""} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-businesscard" />
          
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