import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, IdCard } from "lucide-react";
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
 * Шаблон «Бейдж / Пропуск / Пластиковая карта» — отдельный маршрут для
 * бумажных бейджей, ламинированных пропусков и пластиковых карт с поддержкой
 * персонализации, QR / штрихкодов, отверстий, люверсов, ленты, клипсы и
 * индивидуальной упаковки. Доработка 77.
 */

type BadgeKind =
  | "paper" | "laminated" | "plastic" | "id" | "pass" | "employee"
  | "event" | "vip" | "qr" | "barcode" | "lanyard" | "clip" | "premium";

const KINDS: { value: BadgeKind; label: string }[] = [
  { value: "paper", label: "Бумажный бейдж" },
  { value: "laminated", label: "Ламинированный бейдж" },
  { value: "plastic", label: "Пластиковая карта" },
  { value: "id", label: "ID-карта" },
  { value: "pass", label: "Пропуск" },
  { value: "employee", label: "Карта сотрудника" },
  { value: "event", label: "Карта участника" },
  { value: "vip", label: "VIP-карта" },
  { value: "qr", label: "Бейдж с QR" },
  { value: "barcode", label: "Бейдж со штрихкодом" },
  { value: "lanyard", label: "Бейдж с лентой" },
  { value: "clip", label: "Бейдж с клипсой" },
  { value: "premium", label: "Premium бейдж" },
];

type Material = {
  value: string; label: string; type: "paper" | "plastic" | "synthetic" | "lampack";
  density?: number; thickness?: number; pricePerSheet: number; sheetW: number; sheetH: number;
  perPiece?: number;
};
const MATERIALS: Material[] = [
  { value: "coated-200", label: "Мелованная 200 г", type: "paper", density: 200, pricePerSheet: 110, sheetW: 450, sheetH: 320 },
  { value: "coated-250", label: "Мелованная 250 г", type: "paper", density: 250, pricePerSheet: 135, sheetW: 450, sheetH: 320 },
  { value: "designer-280", label: "Дизайнерская 280 г", type: "paper", density: 280, pricePerSheet: 320, sheetW: 450, sheetH: 320 },
  { value: "synthetic", label: "Синтетическая бумага", type: "synthetic", density: 180, pricePerSheet: 260, sheetW: 450, sheetH: 320 },
  { value: "pvc-030", label: "PVC 0.3 мм (белый)", type: "plastic", thickness: 0.3, pricePerSheet: 380, sheetW: 320, sheetH: 460 },
  { value: "pvc-050", label: "PVC 0.5 мм (белый)", type: "plastic", thickness: 0.5, pricePerSheet: 520, sheetW: 320, sheetH: 460 },
  { value: "pvc-076", label: "PVC 0.76 мм (белый, ISO)", type: "plastic", thickness: 0.76, pricePerSheet: 720, sheetW: 320, sheetH: 460 },
  { value: "pvc-100", label: "PVC 1.0 мм", type: "plastic", thickness: 1.0, pricePerSheet: 920, sheetW: 320, sheetH: 460 },
  { value: "pet-050", label: "PET прозрачный 0.5 мм", type: "plastic", thickness: 0.5, pricePerSheet: 640, sheetW: 320, sheetH: 460 },
  { value: "pvc-gold", label: "PVC золотой/серебряный", type: "plastic", thickness: 0.76, pricePerSheet: 980, sheetW: 320, sheetH: 460 },
  { value: "ready-card", label: "Готовая пластиковая карта", type: "plastic", thickness: 0.76, pricePerSheet: 0, sheetW: 86, sheetH: 54, perPiece: 95 },
  { value: "lampack-80", label: "Ламинационный пакет 80 мкм", type: "lampack", thickness: 0.16, pricePerSheet: 0, sheetW: 86, sheetH: 54, perPiece: 18 },
];

type PrintMode = "auto" | "digital" | "offset" | "uv" | "sublimation" | "thermal" | "oncard";
type PackKind = "none" | "p50" | "p100" | "individual" | "withLanyard" | "box" | "premium";
const PACKS: { value: PackKind; label: string; price: number; perPack: number }[] = [
  { value: "none", label: "Без упаковки", price: 0, perPack: 1 },
  { value: "p50", label: "Пачка по 50", price: 22, perPack: 50 },
  { value: "p100", label: "Пачка по 100", price: 30, perPack: 100 },
  { value: "individual", label: "Индивидуальный пакет", price: 12, perPack: 1 },
  { value: "withLanyard", label: "Комплект с лентой", price: 18, perPack: 1 },
  { value: "box", label: "В коробку", price: 280, perPack: 100 },
  { value: "premium", label: "Premium упаковка", price: 95, perPack: 1 },
];

type LamKind = "none" | "gloss" | "matte" | "pouch" | "soft" | "varnish" | "antiscratch";
const LAMS: { value: LamKind; label: string; perM2: number; setup: number; perPiece?: number }[] = [
  { value: "none", label: "Без ламинации", perM2: 0, setup: 0 },
  { value: "gloss", label: "Глянцевая", perM2: 95, setup: 800 },
  { value: "matte", label: "Матовая", perM2: 110, setup: 800 },
  { value: "pouch", label: "Пакетная (горячая)", perM2: 0, setup: 600, perPiece: 14 },
  { value: "soft", label: "Soft-touch", perM2: 220, setup: 1200 },
  { value: "varnish", label: "Защитный лак", perM2: 60, setup: 600 },
  { value: "antiscratch", label: "Anti-scratch", perM2: 180, setup: 1000 },
];

type FittingKind =
  | "none" | "lanyard" | "clip" | "pin" | "yoyo" | "holder" | "pocket" | "carabine" | "cord";
const FITTINGS: { value: FittingKind; label: string; price: number; install: number }[] = [
  { value: "none", label: "Нет фурнитуры", price: 0, install: 0 },
  { value: "lanyard", label: "Лента (по штуке)", price: 95, install: 4 },
  { value: "clip", label: "Клипса", price: 22, install: 3 },
  { value: "pin", label: "Булавка", price: 14, install: 3 },
  { value: "yoyo", label: "Ретрактор (йо-йо)", price: 180, install: 5 },
  { value: "holder", label: "Пластиковый держатель", price: 25, install: 2 },
  { value: "pocket", label: "Прозрачный карман", price: 35, install: 3 },
  { value: "carabine", label: "Карабин", price: 40, install: 3 },
  { value: "cord", label: "Шнурок", price: 28, install: 3 },
];

export default function BadgeCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [kind, setKind] = useState<BadgeKind>("paper");
  const [circulation, setCirculation] = useState(500);
  const [designsCount, setDesignsCount] = useState(1);
  const [finishedW, setFinishedW] = useState(90);
  const [finishedH, setFinishedH] = useState(55);
  const [orientation, setOrientation] = useState<"h" | "v">("h");
  const [twoSided, setTwoSided] = useState(false);
  const [colorsFront, setColorsFront] = useState(4);
  const [colorsBack, setColorsBack] = useState(0);
  const [pantone, setPantone] = useState(0);
  const [whiteInk, setWhiteInk] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>("auto");
  const [leadDays, setLeadDays] = useState(3);
  const [margin, setMargin] = useState(45);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Материал
  const [materialKey, setMaterialKey] = useState("coated-250");

  // Персонализация
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [variableElements, setVariableElements] = useState(2);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasDbCheck, setHasDbCheck] = useState(false);
  const [hasNumbering, setHasNumbering] = useState(false);
  const [hasQr, setHasQr] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [hasRfid, setHasRfid] = useState(false);

  // Ламинация
  const [lamKind, setLamKind] = useState<LamKind>("none");
  const [lamSides, setLamSides] = useState<1 | 2>(2);

  // Резка / высечка / углы / отверстия
  const [hasDieCut, setHasDieCut] = useState(false);
  const [hasRounded, setHasRounded] = useState(false);
  const [roundedCorners, setRoundedCorners] = useState(4);
  const [hasHole, setHasHole] = useState(false);
  const [holesCount, setHolesCount] = useState(1);
  const [hasEyelet, setHasEyelet] = useState(false);
  const [eyeletsCount, setEyeletsCount] = useState(1);

  // Фурнитура
  const [fittingKind, setFittingKind] = useState<FittingKind>("none");
  const [fittingQty, setFittingQty] = useState(1);
  const [lanyardLenM, setLanyardLenM] = useState(0.9);

  // Комплектовка / контроль / упаковка
  const [hasAssembly, setHasAssembly] = useState(false);
  const [packKind, setPackKind] = useState<PackKind>("p100");

  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamKind)!, [lamKind]);
  const fitting = useMemo(() => FITTINGS.find((f) => f.value === fittingKind)!, [fittingKind]);

  // Автологика по типу
  useEffect(() => {
    if (kind === "paper") {
      if (material.type !== "paper") setMaterialKey("coated-250");
    }
    if (kind === "laminated") {
      if (material.type !== "paper") setMaterialKey("coated-250");
      if (lamKind === "none") setLamKind("pouch");
    }
    if (kind === "plastic" || kind === "id" || kind === "employee" || kind === "vip") {
      if (material.type !== "plastic") setMaterialKey("pvc-076");
      setHasRounded(true);
    }
    if (kind === "qr") {
      setHasQr(true);
      setHasDbCheck(true);
    }
    if (kind === "barcode") {
      setHasBarcode(true);
      setHasDbCheck(true);
    }
    if (kind === "lanyard") {
      setHasHole(true);
      if (fittingKind === "none") setFittingKind("lanyard");
      setHasAssembly(true);
    }
    if (kind === "clip") {
      if (fittingKind === "none") setFittingKind("clip");
      setHasAssembly(true);
    }
    if (kind === "premium") {
      if (material.type !== "plastic") setMaterialKey("pvc-100");
      setLamKind("soft");
      setPackKind("premium");
    }
    if (kind === "pass" || kind === "id" || kind === "employee") {
      setHasNumbering(true);
      setHasPersonalization(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Раскладка
  const printableW = material.sheetW - 16;
  const printableH = material.sheetH - 16;
  const itemW = Math.max(1, finishedW + 4);
  const itemH = Math.max(1, finishedH + 4);
  const itemsPerSheet = useMemo(() => {
    if (material.perPiece) return 1;
    const a = Math.floor(printableW / itemW) * Math.floor(printableH / itemH);
    const b = Math.floor(printableW / itemH) * Math.floor(printableH / itemW);
    return Math.max(1, a, b);
  }, [printableW, printableH, itemW, itemH, material]);

  const netSheets = useMemo(() => Math.ceil(circulation / itemsPerSheet), [circulation, itemsPerSheet]);

  const effectivePrintMode: Exclude<PrintMode, "auto"> = useMemo(() => {
    if (printMode !== "auto") return printMode;
    if (material.value === "ready-card") return "oncard";
    if (material.type === "plastic") return circulation >= 500 ? "offset" : "uv";
    if (material.type === "synthetic") return "uv";
    if (circulation * (twoSided ? 2 : 1) >= 1000) return "offset";
    return "digital";
  }, [printMode, material, circulation, twoSided]);

  const setupSheets = effectivePrintMode === "offset" ? 120 + Math.ceil(netSheets * 0.01) : 6;
  const printSheets = netSheets + setupSheets;

  // Площадь изделия (м²)
  const itemAreaM2 = (finishedW * finishedH) / 1_000_000;

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": typeof circulation === "number" ? circulation : 0 });

    if (hasDesign) push("Препресс", "Дизайн макета", Math.max(1, designsCount), "макет", 3500);
    push("Препресс", "Проверка макета", Math.max(1, designsCount), "макет", 800);
    push("Препресс", "Раскладка", 1, "усл.", 600);

    // Материал
    if (material.perPiece) {
      push("Материалы", material.label, circulation, "шт", material.perPiece);
    } else {
      push("Материалы", material.label, printSheets, "лист", material.pricePerSheet);
      push("Препресс", "Резка закупочного листа", printSheets, "лист", 0.8);
    }

    // Печать
    const colorsTotal = colorsFront + (twoSided ? colorsBack : 0);
    if (effectivePrintMode === "offset") {
      const forms = (colorsTotal + pantone) * Math.max(1, designsCount);
      push("Печать", "Печатные формы", forms, "форма", 1000);
      push("Печать", "Вывод форм", forms, "форма", 500);
      push("Печать", "Приладка офсета", 1, "ед.", 1500 + Math.ceil(netSheets * 0.01));
      push("Печать", `Офсетная печать${twoSided ? " (2 ст.)" : ""}`,
        printSheets * (twoSided ? 2 : 1), "оттиск", 5);
    } else if (effectivePrintMode === "digital") {
      push("Печать", `Цифровая печать${twoSided ? " (2 ст.)" : ""}`,
        printSheets * (twoSided ? 2 : 1), "оттиск", +(18 + colorsTotal * 1.4).toFixed(2));
    } else if (effectivePrintMode === "uv") {
      const m2 = +(printSheets * material.sheetW * material.sheetH / 1_000_000).toFixed(3);
      push("Печать", "Приладка UV-печати", 1, "ед.", 2500);
      push("Печать", `UV-печать${twoSided ? " (2 ст.)" : ""}`, +(m2 * (twoSided ? 2 : 1)).toFixed(3), "м²", 1800);
      if (whiteInk) push("Печать", "Белила UV", +(m2 * (twoSided ? 2 : 1)).toFixed(3), "м²", 900);
    } else if (effectivePrintMode === "sublimation") {
      push("Печать", "Сублимационная печать", circulation, "шт", 32);
    } else if (effectivePrintMode === "thermal") {
      push("Печать", "Термотрансфер", circulation, "шт", 22);
    } else if (effectivePrintMode === "oncard") {
      push("Печать", `Печать на готовой карте${twoSided ? " (2 ст.)" : ""}`,
        circulation * (twoSided ? 2 : 1), "шт", 45);
    }

    // Персонализация / переменные данные
    if (hasPersonalization) {
      push("Постпечать", "Подготовка базы персонализации", 1, "усл.", 3000);
      push("Постпечать", "Переменные данные",
        circulation * Math.max(1, variableElements), "элем.", 1.5);
    }
    if (hasPhoto) {
      push("Постпечать", "Подготовка фото", 1, "усл.", 2000);
      push("Постпечать", "Фото-персонализация", circulation, "шт", 6);
    }
    if (hasDbCheck) {
      push("Постпечать", "Проверка базы", circulation, "запись", 0.5);
    }
    if (hasNumbering) {
      push("Постпечать", "Подготовка нумератора", 1, "усл.", 1500);
      push("Постпечать", "Нумерация", circulation, "номер", 0.7);
    }
    if (hasQr) {
      push("Постпечать", "Подготовка базы QR", 1, "усл.", 2000);
      push("Постпечать", "Печать QR-кодов", circulation, "шт", 1.4);
    }
    if (hasBarcode) {
      push("Постпечать", "Подготовка базы штрихкодов", 1, "усл.", 1500);
      push("Постпечать", "Печать штрихкодов", circulation, "шт", 1.0);
    }
    if (hasRfid) {
      push("Материалы", "RFID/NFC-метка", circulation, "шт", 140);
      push("Постпечать", "Кодирование RFID/NFC", circulation, "шт", 8);
    }

    // Ламинация
    if (lamKind !== "none") {
      if (lam.perPiece) {
        push("Материалы", `Ламинационный пакет (${lam.label})`, circulation, "шт", lam.perPiece);
        push("Постпечать", "Приладка пакетной ламинации", 1, "усл.", lam.setup);
        push("Постпечать", "Ламинирование", circulation, "шт", 5);
      } else {
        const m2 = +(circulation * itemAreaM2 * lamSides).toFixed(3);
        push("Постпечать", `Приладка: ${lam.label}`, 1, "усл.", lam.setup);
        push("Постпечать", `Ламинация: ${lam.label}${lamSides === 2 ? " (2 ст.)" : ""}`,
          m2, "м²", lam.perM2);
      }
    }

    // Резка / высечка
    if (hasDieCut) {
      push("Постпечать", "Штамп высечки", 1, "шт", 6000);
      push("Постпечать", "Приладка высечки", 1, "усл.", 2000);
      push("Постпечать", "Высечка", printSheets, "лист", 3);
    } else if (!material.perPiece) {
      push("Постпечать", "Резка готовой продукции", printSheets, "лист", 0.8);
    }
    if (hasRounded) {
      push("Постпечать", "Приладка скругления углов", 1, "усл.", 800);
      push("Постпечать", "Скругление углов", circulation * Math.max(1, roundedCorners), "угол", 0.4);
    }

    // Отверстия / люверсы
    if (hasHole) {
      push("Постпечать", "Приладка отверстий", 1, "усл.", 800);
      push("Постпечать", "Пробивка отверстий",
        circulation * Math.max(1, holesCount), "отв.", 0.6);
    }
    if (hasEyelet) {
      const total = circulation * Math.max(1, eyeletsCount);
      push("Материалы", "Люверс", total, "шт", 3.5);
      push("Постпечать", "Установка люверсов", total, "шт", 2);
      push("Постпечать", "Приладка люверсов", 1, "усл.", 1000);
    }

    // Фурнитура
    if (fittingKind !== "none") {
      const fq = Math.max(1, fittingQty);
      if (fittingKind === "lanyard" && lanyardLenM > 0) {
        // Лента по длине: считаем по погонным метрам
        const meters = +(circulation * fq * lanyardLenM).toFixed(2);
        push("Материалы", "Лента (пог.м)", meters, "пог.м", 110);
      } else {
        push("Материалы", fitting.label, circulation * fq, "шт", fitting.price);
      }
      push("Постпечать", `Установка: ${fitting.label}`,
        circulation * fq, "шт", fitting.install);
    }

    // Комплектовка
    if (hasAssembly) {
      push("Постпечать", "Комплектовка", circulation, "компл.", 4);
    }

    // Контроль качества
    const personalCoef = hasPersonalization || hasNumbering ? 1.3 : 1.0;
    const codeCoef = hasQr || hasBarcode ? 1.2 : 1.0;
    const qcCoef = +(personalCoef * codeCoef).toFixed(2);
    push("Логистика", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef.toFixed(2) + ")" : ""}`,
      circulation, "шт", +(0.6 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") {
      const units = Math.max(1, Math.ceil(circulation / Math.max(1, pack.perPack)));
      push("Упаковка", `Упаковка: ${pack.label}`, units, "ед.", pack.price);
    }
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);
    return out;
  }, [
    hasDesign, designsCount, material, printSheets, netSheets, circulation,
    colorsFront, colorsBack, twoSided, pantone, whiteInk, effectivePrintMode,
    hasPersonalization, variableElements, hasPhoto, hasDbCheck, hasNumbering,
    hasQr, hasBarcode, hasRfid,
    lamKind, lam, lamSides, itemAreaM2,
    hasDieCut, hasRounded, roundedCorners,
    hasHole, holesCount, hasEyelet, eyeletsCount,
    fittingKind, fitting, fittingQty, lanyardLenM,
    hasAssembly, packKind, pack, hasDelivery, deliveryCost,
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
    if (hasPersonalization || hasQr || hasBarcode) s.push("Подготовка базы персонализации");
    s.push("Раскладка", "Расчёт материала");
    if (effectivePrintMode === "offset") s.push("Вывод форм", "Приладка", "Офсетная печать");
    else if (effectivePrintMode === "uv") s.push("UV-печать");
    else if (effectivePrintMode === "sublimation") s.push("Сублимация");
    else if (effectivePrintMode === "thermal") s.push("Термотрансфер");
    else if (effectivePrintMode === "oncard") s.push("Печать на готовой карте");
    else s.push("Цифровая печать");
    if (hasPersonalization) s.push("Персонализация");
    if (hasNumbering) s.push("Нумерация");
    if (hasQr) s.push("Печать QR");
    if (hasBarcode) s.push("Печать штрихкодов");
    if (hasRfid) s.push("Кодирование RFID/NFC");
    if (lamKind !== "none") s.push(`Ламинация: ${lam.label}`);
    if (hasDieCut) s.push("Высечка"); else s.push("Резка");
    if (hasRounded) s.push("Скругление углов");
    if (hasHole) s.push("Пробивка отверстий");
    if (hasEyelet) s.push("Установка люверсов");
    if (fittingKind !== "none") s.push(`Фурнитура: ${fitting.label}`);
    if (hasAssembly) s.push("Комплектовка");
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Упаковка: ${pack.label}`);
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, hasPersonalization, hasQr, hasBarcode, effectivePrintMode, hasNumbering, hasRfid,
      lamKind, lam, hasDieCut, hasRounded, hasHole, hasEyelet, fittingKind, fitting,
      hasAssembly, packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <IdCard className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Бейдж / Пропуск / Пластиковая карта</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Бумага и пластик, персонализация, QR/штрихкод, отверстия, лента, клипса, держатель.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 77</Badge>
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
                    <Label>Тип изделия</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as BadgeKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ширина, мм</Label><Input type="number" value={finishedW} onChange={(e) => setFinishedW(+e.target.value || 0)} /></div>
                  <div><Label>Высота, мм</Label><Input type="number" value={finishedH} onChange={(e) => setFinishedH(+e.target.value || 0)} /></div>
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
                  <div><Label>Макетов</Label><Input type="number" min={1} value={designsCount} onChange={(e) => setDesignsCount(+e.target.value || 1)} /></div>
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                        <SelectItem value="uv">UV</SelectItem>
                        <SelectItem value="sublimation">Сублимация</SelectItem>
                        <SelectItem value="thermal">Термотрансфер</SelectItem>
                        <SelectItem value="oncard">На готовой карте</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="two-sided" checked={twoSided} onCheckedChange={(v) => setTwoSided(!!v)} />
                    <Label htmlFor="two-sided" className="cursor-pointer">Двусторонняя печать</Label>
                  </div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={8} value={colorsFront} onChange={(e) => setColorsFront(+e.target.value || 0)} /></div>
                  {twoSided && (<div><Label>Цветность оборот</Label><Input type="number" min={0} max={8} value={colorsBack} onChange={(e) => setColorsBack(+e.target.value || 0)} /></div>)}
                  <div><Label>Pantone красок</Label><Input type="number" min={0} value={pantone} onChange={(e) => setPantone(+e.target.value || 0)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="white-ink" checked={whiteInk} onCheckedChange={(v) => setWhiteInk(!!v)} />
                    <Label htmlFor="white-ink" className="cursor-pointer">Белила (UV)</Label>
                  </div>
                  <div><Label>Срок, дней</Label><Input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(+e.target.value || 1)} /></div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен макет</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                    На лист: <b>{itemsPerSheet}</b> · нетто листов: <b>{netSheets}</b> · приладка: <b>{setupSheets}</b>
                    {" · "}режим печати: <b>{effectivePrintMode}</b> · площадь изд.: <b>{fmtNum(itemAreaM2 * 10000)}</b> см²
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "person", "lam", "cut", "fit", "pack"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип материала</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label} · {m.perPiece ? `${fmtMoney(m.perPiece)}/шт` : `${fmtMoney(m.pricePerSheet)}/лист`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                            Тип: <b>{material.type}</b>
                            {material.density != null && <> · плотность: <b>{material.density}</b> г/м²</>}
                            {material.thickness != null && <> · толщина: <b>{material.thickness}</b> мм</>}
                            {!material.perPiece && <> · формат: <b>{material.sheetW}×{material.sheetH}</b></>}
                            {material.perPiece && <> · <Badge variant="outline" className="text-[10px]">готовая заготовка</Badge></>}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="person">
                      <AccordionTrigger>3. Персонализация / QR / штрихкод</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Персонализация (ФИО, должность, отдел)" checked={hasPersonalization} onChange={setHasPersonalization} />
                          {hasPersonalization && (
                            <div><Label>Переменных элементов</Label><Input type="number" min={1} value={variableElements} onChange={(e) => setVariableElements(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Фото на изделии" checked={hasPhoto} onChange={setHasPhoto} />
                          <Row label="Нумерация / номер пропуска" checked={hasNumbering} onChange={setHasNumbering} />
                          <Row label="QR-код" checked={hasQr} onChange={setHasQr} />
                          <Row label="Штрихкод" checked={hasBarcode} onChange={setHasBarcode} />
                          <Row label="RFID / NFC-метка" checked={hasRfid} onChange={setHasRfid} />
                          <Row label="Проверка базы данных" checked={hasDbCheck} onChange={setHasDbCheck} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="lam">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">4. Ламинация / защитное покрытие
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
                                {LAMS.map((l) => (
                                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {lamKind !== "none" && !lam.perPiece && (
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

                    <AccordionItem value="cut">
                      <AccordionTrigger>5. Резка, высечка, углы, отверстия</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <Row label="Высечка (фигурная)" checked={hasDieCut} onChange={setHasDieCut} />
                          <Row label="Скругление углов" checked={hasRounded} onChange={setHasRounded} />
                          {hasRounded && (
                            <div><Label>Кол-во углов</Label><Input type="number" min={1} max={4} value={roundedCorners} onChange={(e) => setRoundedCorners(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Пробивка отверстий" checked={hasHole} onChange={setHasHole} />
                          {hasHole && (
                            <div><Label>Отверстий на изделие</Label><Input type="number" min={1} value={holesCount} onChange={(e) => setHolesCount(+e.target.value || 1)} /></div>
                          )}
                          <Row label="Люверсы" checked={hasEyelet} onChange={setHasEyelet} />
                          {hasEyelet && (
                            <div><Label>Люверсов на изделие</Label><Input type="number" min={1} value={eyeletsCount} onChange={(e) => setEyeletsCount(+e.target.value || 1)} /></div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="fit">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">6. Фурнитура и комплектовка
                          <Badge variant="outline" className="text-[10px]">{fitting.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип фурнитуры</Label>
                            <Select value={fittingKind} onValueChange={(v) => setFittingKind(v as FittingKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FITTINGS.map((f) => (
                                  <SelectItem key={f.value} value={f.value}>
                                    {f.label}{f.price ? ` · ${fmtMoney(f.price)}/шт` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {fittingKind !== "none" && (
                            <div><Label>Кол-во на изделие</Label><Input type="number" min={1} value={fittingQty} onChange={(e) => setFittingQty(+e.target.value || 1)} /></div>
                          )}
                          {fittingKind === "lanyard" && (
                            <div><Label>Длина ленты, м</Label><Input type="number" min={0} step={0.1} value={lanyardLenM} onChange={(e) => setLanyardLenM(+e.target.value || 0)} /></div>
                          )}
                          <Row label="Комплектовка (сборка комплектов)" checked={hasAssembly} onChange={setHasAssembly} />
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
                defaultName={`Бейдж ${KINDS.find((k) => k.value === kind)?.label || ""} · ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-badge" />
          
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