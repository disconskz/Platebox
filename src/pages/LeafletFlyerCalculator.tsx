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
 * Доработка 79 — выделенный шаблон «Листовка / Флаер».
 * Расширенная архитектура: типы листовки, авто-маршрут (офсет/цифра),
 * ламинация, лак, перфорация, нумерация, QR/штрихкод, высечка,
 * скругление углов, склейка в блок, упаковка.
 */

type LeafletKind =
  | "simple" | "twoSided" | "flyer" | "laminated" | "perforated"
  | "numbered" | "qr" | "diecut" | "rounded" | "block" | "premium";
const KINDS: { value: LeafletKind; label: string }[] = [
  { value: "simple", label: "Простая листовка" },
  { value: "twoSided", label: "Двусторонняя листовка" },
  { value: "flyer", label: "Флаер" },
  { value: "laminated", label: "Листовка с ламинацией" },
  { value: "perforated", label: "Листовка с перфорацией" },
  { value: "numbered", label: "Листовка с нумерацией" },
  { value: "qr", label: "Листовка с QR" },
  { value: "diecut", label: "Листовка с высечкой" },
  { value: "rounded", label: "Со скруглением углов" },
  { value: "block", label: "Листовка в блоке (склейка)" },
  { value: "premium", label: "Premium листовка" },
];

type Material = {
  value: string; label: string; type: string; density: number;
  pricePerSheet: number; sheetW: number; sheetH: number;
};
const MATERIALS: Material[] = [
  { value: "coated-gloss-115", label: "Мелованная глянец 115 г", type: "coated-gloss", density: 115, pricePerSheet: 95, sheetW: 720, sheetH: 1020 },
  { value: "coated-gloss-130", label: "Мелованная глянец 130 г", type: "coated-gloss", density: 130, pricePerSheet: 105, sheetW: 720, sheetH: 1020 },
  { value: "coated-gloss-150", label: "Мелованная глянец 150 г", type: "coated-gloss", density: 150, pricePerSheet: 120, sheetW: 720, sheetH: 1020 },
  { value: "coated-gloss-170", label: "Мелованная глянец 170 г", type: "coated-gloss", density: 170, pricePerSheet: 135, sheetW: 720, sheetH: 1020 },
  { value: "coated-gloss-200", label: "Мелованная глянец 200 г", type: "coated-gloss", density: 200, pricePerSheet: 160, sheetW: 720, sheetH: 1020 },
  { value: "coated-gloss-250", label: "Мелованная глянец 250 г", type: "coated-gloss", density: 250, pricePerSheet: 195, sheetW: 720, sheetH: 1020 },
  { value: "coated-gloss-300", label: "Мелованная глянец 300 г", type: "coated-gloss", density: 300, pricePerSheet: 235, sheetW: 720, sheetH: 1020 },
  { value: "coated-matte-130", label: "Мелованная мат 130 г", type: "coated-matte", density: 130, pricePerSheet: 115, sheetW: 720, sheetH: 1020 },
  { value: "coated-matte-170", label: "Мелованная мат 170 г", type: "coated-matte", density: 170, pricePerSheet: 145, sheetW: 720, sheetH: 1020 },
  { value: "coated-matte-250", label: "Мелованная мат 250 г", type: "coated-matte", density: 250, pricePerSheet: 205, sheetW: 720, sheetH: 1020 },
  { value: "offset-80", label: "Офсетная 80 г", type: "offset", density: 80, pricePerSheet: 75, sheetW: 620, sheetH: 940 },
  { value: "offset-100", label: "Офсетная 100 г", type: "offset", density: 100, pricePerSheet: 85, sheetW: 620, sheetH: 940 },
  { value: "designer-150", label: "Дизайнерская 150 г", type: "designer", density: 150, pricePerSheet: 320, sheetW: 720, sheetH: 1020 },
  { value: "designer-250", label: "Дизайнерская 250 г", type: "designer", density: 250, pricePerSheet: 420, sheetW: 720, sheetH: 1020 },
  { value: "kraft-150", label: "Крафт 150 г", type: "kraft", density: 150, pricePerSheet: 130, sheetW: 720, sheetH: 1020 },
  { value: "color-160", label: "Цветная бумага 160 г", type: "color", density: 160, pricePerSheet: 165, sheetW: 720, sheetH: 1020 },
  { value: "synthetic-200", label: "Синтетическая 200 мкм", type: "synthetic", density: 200, pricePerSheet: 380, sheetW: 720, sheetH: 1020 },
];

type FormatPreset = { value: string; label: string; w: number; h: number };
const FORMATS: FormatPreset[] = [
  { value: "A7", label: "A7 (74×105)", w: 74, h: 105 },
  { value: "A6", label: "A6 (105×148)", w: 105, h: 148 },
  { value: "A5", label: "A5 (148×210)", w: 148, h: 210 },
  { value: "A4", label: "A4 (210×297)", w: 210, h: 297 },
  { value: "A3", label: "A3 (297×420)", w: 297, h: 420 },
  { value: "DL", label: "DL (99×210)", w: 99, h: 210 },
  { value: "EURO", label: "Евро (100×210)", w: 100, h: 210 },
  { value: "148x210", label: "148×210", w: 148, h: 210 },
  { value: "custom", label: "Произвольный", w: 0, h: 0 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv";
type TurnKind = "auto" | "own" | "foreign" | "none";
type LamFilm = "gloss" | "matte" | "soft" | "anti";
const LAM_PRICES: Record<LamFilm, number> = { gloss: 22, matte: 26, soft: 48, anti: 38 };
const LAM_LABELS: Record<LamFilm, string> = {
  gloss: "Глянцевая", matte: "Матовая", soft: "Soft-touch", anti: "Anti-scratch",
};

type PackKind = "none" | "p50" | "p100" | "p250" | "p500" | "shrink" | "individual" | "box";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "p50", label: "Пачка по 50", price: 14, perPack: 50 },
  { value: "p100", label: "Пачка по 100", price: 22, perPack: 100 },
  { value: "p250", label: "Пачка по 250", price: 38, perPack: 250 },
  { value: "p500", label: "Пачка по 500", price: 58, perPack: 500 },
  { value: "shrink", label: "Термоусадка", price: 35, perPack: 100 },
  { value: "individual", label: "Индивидуальный пакет", price: 8, perPack: 1 },
  { value: "box", label: "В коробку", price: 250, perPack: 1000 },
];

export default function LeafletFlyerCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [name, setName] = useState("");
  const [circulation, setCirculation] = useState(1000);
  const [designsCount, setDesignsCount] = useState(1);
  const [kind, setKind] = useState<LeafletKind>("simple");
  const [formatKey, setFormatKey] = useState("A5");
  const [finishedW, setFinishedW] = useState(148);
  const [finishedH, setFinishedH] = useState(210);
  const [bleed, setBleed] = useState(2);
  const [twoSided, setTwoSided] = useState(false);
  const [colorsFront, setColorsFront] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [pantoneCount, setPantoneCount] = useState(0);
  const [hasWhiteInk, setHasWhiteInk] = useState(false);
  const [turn, setTurn] = useState<TurnKind>("auto");
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [leadDays, setLeadDays] = useState(3);
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Бумага
  const [materialKey, setMaterialKey] = useState("coated-gloss-150");

  // Постпечать
  const [hasLamination, setHasLamination] = useState(false);
  const [lamFilm, setLamFilm] = useState<LamFilm>("gloss");
  const [lamSides, setLamSides] = useState<1 | 2>(1);
  const [hasUvFull, setHasUvFull] = useState(false);
  const [hasUvSpot, setHasUvSpot] = useState(false);
  const [uvSpotAreaCm2, setUvSpotAreaCm2] = useState(50);

  const [hasNumbering, setHasNumbering] = useState(false);
  const [numbersPerItem, setNumbersPerItem] = useState(1);
  const [hasQr, setHasQr] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(1);

  const [hasPerforation, setHasPerforation] = useState(false);
  const [perfLines, setPerfLines] = useState(1);
  const [perfLineLenMm, setPerfLineLenMm] = useState(210);

  const [hasDieCut, setHasDieCut] = useState(false);
  const [dieKnifeM, setDieKnifeM] = useState(0.8);
  const [hasFlashRemoval, setHasFlashRemoval] = useState(false);

  const [hasFold, setHasFold] = useState(false);
  const [foldCount, setFoldCount] = useState(1);
  const [hasBiegovka, setHasBiegovka] = useState(false);
  const [biegovkaCount, setBiegovkaCount] = useState(1);

  const [hasRoundCorners, setHasRoundCorners] = useState(false);
  const [cornersCount, setCornersCount] = useState(4);

  const [hasBlockGlue, setHasBlockGlue] = useState(false);
  const [blockSize, setBlockSize] = useState(50);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("p100");

  // ===== Автологика по типу
  useEffect(() => {
    if (kind === "twoSided") setTwoSided(true);
    if (kind === "laminated") setHasLamination(true);
    if (kind === "perforated") setHasPerforation(true);
    if (kind === "numbered") setHasNumbering(true);
    if (kind === "qr") setHasQr(true);
    if (kind === "diecut") { setHasDieCut(true); setHasFlashRemoval(true); }
    if (kind === "rounded") setHasRoundCorners(true);
    if (kind === "block") setHasBlockGlue(true);
    if (kind === "premium") {
      setHasLamination(true); setLamFilm("soft");
      setHasUvSpot(true);
      setHasRoundCorners(true);
      if (!materialKey.startsWith("designer")) setMaterialKey("designer-250");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Биговка обязательна при плотности > 170 и наличии фальцовки
  useEffect(() => {
    const m = MATERIALS.find((x) => x.value === materialKey);
    if (hasFold && m && m.density > 170 && !hasBiegovka) setHasBiegovka(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFold, materialKey]);

  // ===== Формат
  useEffect(() => {
    const f = FORMATS.find((x) => x.value === formatKey);
    if (f && f.value !== "custom") { setFinishedW(f.w); setFinishedH(f.h); }
  }, [formatKey]);

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.type === "synthetic") return "uv";
    if (circulation >= 1000) return "offset";
    return "digital";
  }, [printMode, material, circulation]);

  const effectiveTurn: Exclude<TurnKind, "auto"> = useMemo(() => {
    if (turn !== "auto") return turn;
    if (!twoSided) return "none";
    return circulation >= 1500 ? "own" : "foreign";
  }, [turn, twoSided, circulation]);

  // ===== Раскладка
  // Технологические отступы: лево/право 2, верх 5, низ 10
  const printableW = Math.max(1, material.sheetW - 2 - 2);
  const printableH = Math.max(1, material.sheetH - 5 - 10);
  const itemW = Math.max(1, finishedW + 2 * bleed);
  const itemH = Math.max(1, finishedH + 2 * bleed);
  const layout = useMemo(() => {
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return { perSheet: Math.max(1, a, b), rotated: b > a };
  }, [printableW, printableH, itemW, itemH]);

  const totalItems = circulation * Math.max(1, designsCount);
  const netSheets = useMemo(() => Math.max(1, Math.ceil(totalItems / layout.perSheet)),
    [totalItems, layout.perSheet]);

  const setupSheets = useMemo(() => {
    if (effectivePrintMode !== "offset") return 10;
    const base = effectiveTurn === "foreign" ? 300 : 150;
    return base + Math.ceil(netSheets * 0.01);
  }, [effectivePrintMode, effectiveTurn, netSheets]);

  const printSheets = netSheets + setupSheets;

  // ===== Спецификация
  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, n: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name: n, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн листовки", Math.max(1, designsCount), "макет", 2500);
    push("Препресс", "Проверка и подготовка макета", Math.max(1, designsCount), "макет", 600);
    push("Препресс", "Подбор печатного формата · раскладка", 1, "усл.", 500);

    // Материалы
    push("Материалы", material.label, printSheets, "лист", material.pricePerSheet);
    push("Препресс", "Резка закупочного листа", printSheets, "лист", 0.8);

    // Формы / приладка / печать
    const cFront = colorsFront;
    const cBack = twoSided ? colorsBack : 0;
    const pantone = Math.max(0, pantoneCount);

    if (effectivePrintMode === "offset") {
      let forms: number;
      if (!twoSided) forms = cFront + pantone;
      else if (effectiveTurn === "own") forms = Math.max(cFront, cBack) + pantone;
      else forms = cFront + cBack + pantone; // чужой
      forms *= Math.max(1, designsCount);
      push("Печать", "Печатные формы", forms, "форма", 1000);
      push("Печать", "Вывод форм", forms, "форма", 500);
      const setupCost = (effectiveTurn === "foreign" ? 300 : 150) + Math.ceil(netSheets * 0.01);
      push("Печать", `Приладка офсета (${effectiveTurn === "foreign" ? "чужой" : effectiveTurn === "own" ? "свой" : "1 стор."})`,
        1, "усл.", setupCost);
      const impressions = printSheets * (twoSided && effectiveTurn === "foreign" ? 2 : 1);
      push("Печать", `Офсетная печать${twoSided ? " (2 стороны)" : ""}`, impressions, "оттиск", 4.5);
    } else if (effectivePrintMode === "digital") {
      const price = +(15 + (cFront + cBack) * 1.5).toFixed(2);
      push("Печать", `Цифровая печать${twoSided ? " (2 стороны)" : ""}`,
        printSheets * (twoSided ? 2 : 1), "оттиск", price);
    } else {
      // UV
      const areaM2 = +((material.sheetW / 1000) * (material.sheetH / 1000) * printSheets * (twoSided ? 2 : 1)).toFixed(2);
      push("Печать", `UV-печать${hasWhiteInk ? " + белила" : ""}`, areaM2, "м²", hasWhiteInk ? 320 : 240);
    }

    // Ламинация
    if (hasLamination) {
      const sheetM2 = (material.sheetW / 1000) * (material.sheetH / 1000);
      const totalM2 = +(sheetM2 * netSheets * lamSides).toFixed(2);
      push("Постпечать", "Приладка ламинации", 1, "усл.", 1500);
      push("Постпечать", `Ламинация ${LAM_LABELS[lamFilm]} (${lamSides} стор.)`,
        totalM2, "м²", LAM_PRICES[lamFilm]);
    }

    // УФ-лак
    if (hasUvFull) {
      const sheetM2 = (material.sheetW / 1000) * (material.sheetH / 1000);
      push("Постпечать", "Приладка УФ-лака", 1, "усл.", 1200);
      push("Постпечать", "УФ-лак сплошной", +(sheetM2 * netSheets).toFixed(2), "м²", 35);
    }
    if (hasUvSpot) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 2500);
      push("Постпечать", "Приладка выборочного лака", 1, "усл.", 1500);
      const areaM2 = +(uvSpotAreaCm2 / 10000 * totalItems).toFixed(2);
      push("Постпечать", "Выборочный УФ-лак", Math.max(0.01, areaM2), "м²", 90);
    }

    // Нумерация / QR / штрихкод / персонализация
    if (hasNumbering) {
      const totalN = circulation * Math.max(1, numbersPerItem);
      push("Постпечать", "Подготовка нумератора", 1, "усл.", 1500);
      push("Постпечать", "Нумерация", totalN, "номер", 0.6);
    }
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

    // Перфорация
    if (hasPerforation) {
      const meters = +(circulation * perfLines * perfLineLenMm / 1000).toFixed(2);
      push("Постпечать", "Приладка перфорации", 1, "усл.", 1200);
      push("Постпечать", "Перфорация", meters, "пог.м", 8);
    }

    // Высечка + удаление облоя
    if (hasDieCut) {
      const dieCost = +(Math.max(0.05, dieKnifeM) * 4500 + 1500).toFixed(0);
      push("Материалы", "Штамп высечки", 1, "шт", dieCost);
      push("Постпечать", "Приладка высечки", 1, "усл.", 2000);
      push("Постпечать", "Высечка", printSheets, "лист", 1.8);
      if (hasFlashRemoval) {
        push("Постпечать", "Удаление облоя",
          printSheets * layout.perSheet, "шт", 0.25);
      }
    }

    // Биговка / фальцовка
    if (hasBiegovka) {
      push("Постпечать", "Приладка биговки", 1, "усл.", 1000);
      push("Постпечать", "Биговка", circulation * Math.max(1, biegovkaCount), "биг", 1.0);
    }
    if (hasFold) {
      push("Постпечать", "Приладка фальцовки", 1, "усл.", 1000);
      push("Постпечать", "Фальцовка", circulation * Math.max(1, foldCount), "фальц", 0.8);
    }

    // Склейка в блок
    if (hasBlockGlue) {
      const blocks = Math.max(1, Math.ceil(circulation / Math.max(1, blockSize)));
      const seamM = +(finishedH / 1000 * blocks).toFixed(2);
      push("Материалы", "Клей ПВА", seamM, "пог.м", 12);
      push("Постпечать", "Приладка проклейки", 1, "усл.", 1200);
      push("Постпечать", "Проклейка в блок", blocks, "блок", 35);
    }

    // Скругление углов
    if (hasRoundCorners) {
      push("Постпечать", "Приладка скругления", 1, "усл.", 800);
      push("Постпечать", "Скругление углов",
        circulation * Math.max(1, cornersCount), "угол", 0.4);
    }

    // Резка готовой продукции
    const cutsPerItem = 4;
    push("Постпечать", "Резка готовой продукции",
      printSheets * layout.perSheet * cutsPerItem, "рез", 0.2);

    // Контроль качества
    const qcCoef = hasNumbering || hasQr || hasBarcode || hasPersonalization ? 1.3 : 1.0;
    push("Логистика", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef.toFixed(2) + ")" : ""}`,
      circulation, "шт", +(0.3 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);
    return out;
  }, [
    hasDesign, designsCount, material, printSheets, netSheets, layout,
    effectivePrintMode, effectiveTurn, colorsFront, colorsBack, twoSided,
    pantoneCount, hasWhiteInk,
    hasLamination, lamFilm, lamSides,
    hasUvFull, hasUvSpot, uvSpotAreaCm2, totalItems,
    hasNumbering, numbersPerItem, hasQr, hasBarcode, hasPersonalization, variableElements,
    hasPerforation, perfLines, perfLineLenMm,
    hasDieCut, dieKnifeM, hasFlashRemoval,
    hasBiegovka, biegovkaCount, hasFold, foldCount,
    hasBlockGlue, blockSize, finishedH,
    hasRoundCorners, cornersCount,
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
    s.push("Проверка макета", "Подбор печатного формата", "Раскладка", "Расчёт бумаги", "Резка закупочного листа");
    if (effectivePrintMode === "offset") s.push("Вывод форм", "Приладка офсета", "Офсетная печать");
    else if (effectivePrintMode === "digital") s.push("Цифровая печать");
    else s.push("UV-печать");
    if (hasLamination) s.push(`Ламинация ${LAM_LABELS[lamFilm]}`);
    if (hasUvFull) s.push("УФ-лак сплошной");
    if (hasUvSpot) s.push("Выборочный УФ-лак");
    if (hasNumbering) s.push("Нумерация");
    if (hasQr) s.push("Печать QR");
    if (hasBarcode) s.push("Печать штрихкодов");
    if (hasPersonalization) s.push("Персонализация");
    if (hasPerforation) s.push("Перфорация");
    if (hasDieCut) { s.push("Высечка"); if (hasFlashRemoval) s.push("Удаление облоя"); }
    if (hasBiegovka) s.push("Биговка");
    if (hasFold) s.push("Фальцовка");
    if (hasBlockGlue) s.push("Склейка в блок");
    if (hasRoundCorners) s.push("Скругление углов");
    s.push("Резка готовой продукции", "Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, effectivePrintMode, hasLamination, lamFilm, hasUvFull, hasUvSpot,
      hasNumbering, hasQr, hasBarcode, hasPersonalization, hasPerforation,
      hasDieCut, hasFlashRemoval, hasBiegovka, hasFold, hasBlockGlue, hasRoundCorners,
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
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Листовка / Флаер</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Формат · бумага · печать · ламинация · перфорация · нумерация · QR · высечка · упаковка.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 79</Badge>
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
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Листовка А5 промо" /></div>
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  <div>
                    <Label>Тип листовки</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as LeafletKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Формат</Label>
                    <Select value={formatKey} onValueChange={setFormatKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div><Label>Готовый Ш, мм</Label><Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} disabled={formatKey !== "custom"} /></div>
                  <div><Label>Готовый В, мм</Label><Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} disabled={formatKey !== "custom"} /></div>
                  <div><Label>Вылеты, мм</Label><Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value || 0)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="two" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} /></div>
                  {twoSided && (<div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>)}
                  <div><Label>Pantone красок</Label><Input type="number" min={0} value={pantoneCount} onChange={(e) => setPantoneCount(+e.target.value || 0)} /></div>
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
                  {twoSided && (
                    <div>
                      <Label>Тип оборота</Label>
                      <Select value={turn} onValueChange={(v) => setTurn(v as TurnKind)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Авто</SelectItem>
                          <SelectItem value="own">Свой оборот</SelectItem>
                          <SelectItem value="foreign">Чужой оборот</SelectItem>
                          <SelectItem value="none">Без оборота</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {effectivePrintMode === "uv" && (
                    <div className="flex items-end gap-2">
                      <Checkbox id="white" checked={hasWhiteInk} onCheckedChange={(v) => setHasWhiteInk(!!v)} />
                      <Label htmlFor="white" className="cursor-pointer">Белила UV</Label>
                    </div>
                  )}
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    На лист: <b>{layout.perSheet}</b>{layout.rotated && " (поворот)"} · печ. листов: <b>{printSheets}</b>{" · "}
                    приладка: <b>{setupSheets}</b> · режим: <b>{effectivePrintMode}</b>
                    {twoSided && <> · оборот: <b>{effectiveTurn}</b></>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["paper", "post", "var", "die", "fold", "pack"]} className="w-full">
                    <AccordionItem value="paper">
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
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="post">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Ламинация и лак
                          {hasLamination && <Badge variant="outline" className="text-[10px]">{LAM_LABELS[lamFilm]}</Badge>}
                          {hasUvSpot && <Badge variant="outline" className="text-[10px]">выб. лак</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Ламинация" checked={hasLamination} onChange={setHasLamination} />
                          {hasLamination && (<>
                            <div>
                              <Label>Тип плёнки</Label>
                              <Select value={lamFilm} onValueChange={(v) => setLamFilm(v as LamFilm)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(["gloss", "matte", "soft", "anti"] as LamFilm[]).map((f) => (
                                    <SelectItem key={f} value={f}>{LAM_LABELS[f]} · {fmtMoney(LAM_PRICES[f])}/м²</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Сторон</Label>
                              <Select value={String(lamSides)} onValueChange={(v) => setLamSides(+v as 1 | 2)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 сторона</SelectItem>
                                  <SelectItem value="2">2 стороны</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>)}
                          <Row label="УФ-лак сплошной" checked={hasUvFull} onChange={setHasUvFull} />
                          <Row label="Выборочный УФ-лак" checked={hasUvSpot} onChange={setHasUvSpot} />
                          {hasUvSpot && (
                            <div><Label>Площадь лака, см² / изд.</Label>
                              <Input type="number" min={1} value={uvSpotAreaCm2} onChange={(e) => setUvSpotAreaCm2(+e.target.value || 1)} /></div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="var">
                      <AccordionTrigger>4. Нумерация / QR / переменные данные</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Нумерация" checked={hasNumbering} onChange={setHasNumbering} />
                          {hasNumbering && (<div><Label>Номеров на изделие</Label>
                            <Input type="number" min={1} value={numbersPerItem} onChange={(e) => setNumbersPerItem(+e.target.value || 1)} /></div>)}
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
                          <Row label="Штрихкод" checked={hasBarcode} onChange={setHasBarcode} />
                          <Row label="Персонализация" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (<div><Label>Переменных элементов</Label>
                            <Input type="number" min={1} value={variableElements} onChange={(e) => setVariableElements(+e.target.value || 1)} /></div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="die">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Перфорация · высечка · скругление
                          {hasPerforation && <Badge variant="outline" className="text-[10px]">перф ×{perfLines}</Badge>}
                          {hasDieCut && <Badge variant="outline" className="text-[10px]">высечка</Badge>}
                          {hasRoundCorners && <Badge variant="outline" className="text-[10px]">углы</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Перфорация" checked={hasPerforation} onChange={setHasPerforation} />
                          {hasPerforation && (<>
                            <div><Label>Линий на изделие</Label>
                              <Input type="number" min={1} value={perfLines} onChange={(e) => setPerfLines(+e.target.value || 1)} /></div>
                            <div><Label>Длина линии, мм</Label>
                              <Input type="number" min={1} value={perfLineLenMm} onChange={(e) => setPerfLineLenMm(+e.target.value || 1)} /></div>
                          </>)}
                          <Row label="Высечка" checked={hasDieCut} onChange={setHasDieCut} />
                          {hasDieCut && (<>
                            <div><Label>Длина ножа, м</Label>
                              <Input type="number" step="0.1" min={0.05} value={dieKnifeM} onChange={(e) => setDieKnifeM(+e.target.value || 0)} /></div>
                            <Row label="Удаление облоя" checked={hasFlashRemoval} onChange={setHasFlashRemoval} />
                          </>)}
                          <Row label="Скругление углов" checked={hasRoundCorners} onChange={setHasRoundCorners} />
                          {hasRoundCorners && (<div><Label>Углов на изделие</Label>
                            <Input type="number" min={1} max={4} value={cornersCount} onChange={(e) => setCornersCount(+e.target.value || 4)} /></div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="fold">
                      <AccordionTrigger>6. Биговка · фальцовка · склейка в блок</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Биговка" checked={hasBiegovka} onChange={setHasBiegovka} />
                          {hasBiegovka && (<div><Label>Кол-во бигов</Label>
                            <Input type="number" min={1} value={biegovkaCount} onChange={(e) => setBiegovkaCount(+e.target.value || 1)} /></div>)}
                          <Row label="Фальцовка" checked={hasFold} onChange={setHasFold} />
                          {hasFold && (<div><Label>Кол-во фальцев</Label>
                            <Input type="number" min={1} value={foldCount} onChange={(e) => setFoldCount(+e.target.value || 1)} /></div>)}
                          <Row label="Склейка в блок (ПВА)" checked={hasBlockGlue} onChange={setHasBlockGlue} />
                          {hasBlockGlue && (<div><Label>Листов в блоке</Label>
                            <Input type="number" min={1} value={blockSize} onChange={(e) => setBlockSize(+e.target.value || 1)} /></div>)}
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
                          {hasDelivery && (<div><Label>Стоимость доставки</Label>
                            <Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(+e.target.value || 0)} /></div>)}
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
                productType="leaflet"
                defaultName={name || `Листовка ${KINDS.find((k) => k.value === kind)?.label || ""} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-leaflet-flyer" />
          
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