import { useEffect, useMemo, useState } from "react";
import { SpecTable } from "@/components/calc/SpecTable";
import { Link } from "react-router-dom";
import { ArrowLeft, Award } from "lucide-react";
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
 * Шаблон «Грамота / Диплом» — листовая логика с расширенной поддержкой
 * персонализации, нумерации, тиснения/фольгирования, рамок и папок. Доработка 62.
 */

type FormatOpt = { value: string; label: string; w: number; h: number };
const FORMATS: FormatOpt[] = [
  { value: "a5v", label: "A5 вертикально 148×210", w: 148, h: 210 },
  { value: "a5h", label: "A5 горизонтально 210×148", w: 210, h: 148 },
  { value: "a4v", label: "A4 вертикально 210×297", w: 210, h: 297 },
  { value: "a4h", label: "A4 горизонтально 297×210", w: 297, h: 210 },
  { value: "a3v", label: "A3 вертикально 297×420", w: 297, h: 420 },
  { value: "a3h", label: "A3 горизонтально 420×297", w: 420, h: 297 },
  { value: "custom", label: "Свой размер", w: 210, h: 297 },
];

type Material = {
  value: string; label: string; type: string; density: number;
  sheetW: number; sheetH: number; pricePerSheet: number; designer?: boolean; premium?: boolean;
};
const MATERIALS: Material[] = [
  { value: "offset160", label: "Офсетная 160 г/м²", type: "offset", density: 160, sheetW: 620, sheetH: 940, pricePerSheet: 35 },
  { value: "offset200", label: "Офсетная 200 г/м²", type: "offset", density: 200, sheetW: 620, sheetH: 940, pricePerSheet: 45 },
  { value: "coated200", label: "Мелованная 200 г/м²", type: "coated", density: 200, sheetW: 620, sheetH: 940, pricePerSheet: 60 },
  { value: "coated250", label: "Мелованная 250 г/м²", type: "coated", density: 250, sheetW: 620, sheetH: 940, pricePerSheet: 75 },
  { value: "coated300", label: "Мелованная 300 г/м²", type: "coated", density: 300, sheetW: 620, sheetH: 940, pricePerSheet: 95 },
  { value: "designer250", label: "Дизайнерская 250 г/м² (фактурная)", type: "designer", density: 250, sheetW: 720, sheetH: 1020, pricePerSheet: 190, designer: true, premium: true },
  { value: "linen270", label: "Льняная 270 г/м²", type: "linen", density: 270, sheetW: 720, sheetH: 1020, pricePerSheet: 230, designer: true, premium: true },
  { value: "pearl290", label: "Перламутровая 290 г/м²", type: "pearl", density: 290, sheetW: 720, sheetH: 1020, pricePerSheet: 280, designer: true, premium: true },
  { value: "metallic290", label: "Metallic 290 г/м²", type: "metallic", density: 290, sheetW: 720, sheetH: 1020, pricePerSheet: 380, designer: true, premium: true },
  { value: "touch300", label: "Touch cover 300 г/м²", type: "touch", density: 300, sheetW: 720, sheetH: 1020, pricePerSheet: 320, designer: true, premium: true },
  { value: "kraft280", label: "Крафт 280 г/м²", type: "kraft", density: 280, sheetW: 700, sheetH: 1000, pricePerSheet: 90 },
  { value: "board300", label: "Плотный картон 300 г/м²", type: "board", density: 300, sheetW: 700, sheetH: 1000, pricePerSheet: 120 },
];

type Kind =
  | "simple" | "diploma" | "personal" | "thanks" | "numbered" | "qr"
  | "stamp" | "emboss" | "foil" | "infolder" | "inframe" | "premium";
const KINDS: { value: Kind; label: string }[] = [
  { value: "simple", label: "Простая грамота" },
  { value: "diploma", label: "Дипломная грамота" },
  { value: "personal", label: "Именной диплом" },
  { value: "thanks", label: "Благодарственное письмо" },
  { value: "numbered", label: "Диплом с нумерацией" },
  { value: "qr", label: "Диплом с QR-кодом" },
  { value: "stamp", label: "Диплом с тиснением" },
  { value: "emboss", label: "Диплом с конгревом" },
  { value: "foil", label: "Диплом с фольгированием" },
  { value: "infolder", label: "Диплом в папке" },
  { value: "inframe", label: "Диплом в рамке" },
  { value: "premium", label: "Premium диплом" },
];

type LamType = "none" | "mat" | "gloss" | "soft" | "antiscratch";
const LAMS: { value: LamType; label: string; price: number }[] = [
  { value: "none", label: "Без ламинации", price: 0 },
  { value: "mat", label: "Матовая", price: 220 },
  { value: "gloss", label: "Глянцевая", price: 200 },
  { value: "soft", label: "Soft-touch", price: 380 },
  { value: "antiscratch", label: "Anti-scratch", price: 420 },
];

type PersonalKind = "name" | "surname" | "position" | "org" | "number" | "qr" | "barcode" | "date" | "text" | "signature" | "stamp";
const PERSONALS: { value: PersonalKind; label: string; price: number; prep: number }[] = [
  { value: "name", label: "Имя", price: 6, prep: 1500 },
  { value: "surname", label: "Фамилия", price: 6, prep: 1500 },
  { value: "position", label: "Должность", price: 7, prep: 1800 },
  { value: "org", label: "Название организации", price: 7, prep: 1800 },
  { value: "number", label: "Номер диплома", price: 1.5, prep: 1200 },
  { value: "qr", label: "QR-код", price: 8, prep: 2500 },
  { value: "barcode", label: "Штрихкод", price: 5, prep: 2000 },
  { value: "date", label: "Дата", price: 3, prep: 1000 },
  { value: "text", label: "Индивидуальный текст", price: 10, prep: 2500 },
  { value: "signature", label: "Подпись", price: 8, prep: 1800 },
  { value: "stamp", label: "Печать организации", price: 9, prep: 2000 },
];

type FolderOpt = "none" | "simple" | "designer" | "premium";
const FOLDERS: { value: FolderOpt; label: string; price: number; kitting: number }[] = [
  { value: "none", label: "Без папки", price: 0, kitting: 0 },
  { value: "simple", label: "Папка простая", price: 120, kitting: 3 },
  { value: "designer", label: "Папка дизайнерская", price: 320, kitting: 4 },
  { value: "premium", label: "Папка premium (кожзам/ткань)", price: 850, kitting: 6 },
];

type FrameOpt = "none" | "plastic" | "wood" | "metal" | "premium";
const FRAMES: { value: FrameOpt; label: string; price: number; kitting: number }[] = [
  { value: "none", label: "Без рамки", price: 0, kitting: 0 },
  { value: "plastic", label: "Рамка пластиковая", price: 450, kitting: 5 },
  { value: "wood", label: "Рамка деревянная", price: 1200, kitting: 6 },
  { value: "metal", label: "Рамка металлическая", price: 1600, kitting: 6 },
  { value: "premium", label: "Рамка premium", price: 2800, kitting: 8 },
];

type PackKind = "none" | "bag" | "envelope" | "box" | "premium";
const PACKS: { value: PackKind; label: string; price: number }[] = [
  { value: "none", label: "Без индивидуальной упаковки", price: 0 },
  { value: "bag", label: "Индивидуальный пакет", price: 6 },
  { value: "envelope", label: "Конверт-папка", price: 12 },
  { value: "box", label: "Коробка", price: 45 },
  { value: "premium", label: "Premium упаковка", price: 150 },
];

export default function DiplomaCalculator() {
  const { priceOp } = useHandbook();
  // Основные
  const [presetKey, setPresetKey] = useState("a4v");
  const [customW, setCustomW] = useState(210);
  const [customH, setCustomH] = useState(297);
  const [circulation, setCirculation] = useState(100);
  const [kind, setKind] = useState<Kind>("diploma");
  const [margin, setMargin] = useState(40);
  const [vatPercent] = useState(16);
  const [leadDays, setLeadDays] = useState(5);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [ownTurn, setOwnTurn] = useState(true);

  // Материал / печать
  const [materialKey, setMaterialKey] = useState("designer250");
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(0);
  const [pantoneCount, setPantoneCount] = useState(0);

  // Персонализация
  const [optPersonal, setOptPersonal] = useState(false);
  const [personalKind, setPersonalKind] = useState<PersonalKind>("name");
  const [personalCount, setPersonalCount] = useState(2);
  const [hasDatabase, setHasDatabase] = useState(false);
  const [dbCheck, setDbCheck] = useState(true);

  // Нумерация
  const [optNumber, setOptNumber] = useState(false);
  const [numbersPerItem, setNumbersPerItem] = useState(1);

  // QR / штрихкод
  const [optQR, setOptQR] = useState(false);
  const [optBarcode, setOptBarcode] = useState(false);

  // Постпечать
  const [lamType, setLamType] = useState<LamType>("none");
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [spotVarnishAreaCm2, setSpotVarnishAreaCm2] = useState(80);
  const [optStamp, setOptStamp] = useState(false);
  const [stampAreaCm2, setStampAreaCm2] = useState(30);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optFoil, setOptFoil] = useState(false);
  const [foilAreaCm2, setFoilAreaCm2] = useState(40);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(true);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);

  // Комплектовка
  const [folderKind, setFolderKind] = useState<FolderOpt>("none");
  const [frameKind, setFrameKind] = useState<FrameOpt>("none");
  const [optPassepartout, setOptPassepartout] = useState(false);

  // Упаковка
  const [packKind, setPackKind] = useState<PackKind>("none");

  const format = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[2], [presetKey]);
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;
  const material = useMemo(() => MATERIALS.find((m) => m.value === materialKey)!, [materialKey]);
  const lam = useMemo(() => LAMS.find((l) => l.value === lamType)!, [lamType]);
  const personal = useMemo(() => PERSONALS.find((p) => p.value === personalKind)!, [personalKind]);
  const folder = useMemo(() => FOLDERS.find((f) => f.value === folderKind)!, [folderKind]);
  const frame = useMemo(() => FRAMES.find((f) => f.value === frameKind)!, [frameKind]);
  const pack = useMemo(() => PACKS.find((p) => p.value === packKind)!, [packKind]);

  // Автологика по типу изделия
  useEffect(() => {
    if (kind === "personal") { setOptPersonal(true); setHasDatabase(true); }
    if (kind === "numbered") { setOptNumber(true); }
    if (kind === "qr") { setOptQR(true); setOptPersonal(true); setPersonalKind("qr"); setHasDatabase(true); }
    if (kind === "stamp") { setOptStamp(true); }
    if (kind === "emboss") { setOptEmboss(true); }
    if (kind === "foil") { setOptFoil(true); }
    if (kind === "infolder") { if (folderKind === "none") setFolderKind("simple"); }
    if (kind === "inframe") { if (frameKind === "none") setFrameKind("plastic"); }
    if (kind === "premium") {
      if (material.density < 250 || !material.premium) setMaterialKey("designer250");
      setOptStamp(true); setOptEmboss(true); setOptSpotVarnish(true);
      if (packKind === "none") setPackKind("premium");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => { if (optDieCut && !optDeflash) setOptDeflash(true); }, [optDieCut, optDeflash]);

  // Если есть персонализация / номер / QR — лучше цифра
  const variable = optPersonal || optNumber || optQR || optBarcode;
  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500 && !variable);

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

  // Раскладка
  const layout = useMemo(() => {
    const sw = material.sheetW, sh = material.sheetH;
    const a = Math.floor(sw / itemW) * Math.floor(sh / itemH);
    const b = Math.floor(sw / itemH) * Math.floor(sh / itemW);
    const up = Math.max(1, a, b);
    const net = Math.ceil(circulation / up);
    const setup = offset ? (ownTurn ? 150 : 300) + Math.ceil(net * 0.01) : 15;
    return { up, net, printSheets: net + setup, areaM2: (itemW * itemH) / 1_000_000 };
  }, [material, itemW, itemH, circulation, offset, ownTurn]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number; details?: { label: string; value: string }[] }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number, details?: { label: string; value: string }[]) =>
      out.push({ stage, name, qty, unit, price, total: qty * price, details });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    if (hasDesign) push("Препресс", "Дизайн грамоты/диплома", 1, "усл.", 7000);
    push("Препресс", "Проверка и подготовка макета", 1, "усл.", 1200);

    // Материал
    push("Материалы", `Бумага: ${material.label}`, layout.printSheets, "лист", material.pricePerSheet);

    // Резка закупочного на печатный
    if (material.sheetW > 720 || material.sheetH > 1020) {
      push("Препресс", "Резка закупочного листа", layout.printSheets, "лист", 0.4);
    }

    // Печать
    if (offset) {
      let forms = Math.max(colorFront, 0) + Math.max(colorBack, 0);
      if (!ownTurn && colorFront > 0 && colorBack > 0) forms = colorFront + colorBack;
      forms += pantoneCount;
      push("Печать", "Печатные формы", forms, "форма", 1500);
      const setupCost = (ownTurn ? 150 : 300) + Math.ceil(layout.printSheets * 0.01);
      push("Печать", "Приладка", 1, "усл.", setupCost);
    }
    push("Печать", offset ? "Печать (офсет)" : "Печать (цифра)",
      layout.printSheets, "лист", offset ? 6 : 36);

    // Ламинация
    if (lamType !== "none") {
      push("Постпечать", `Ламинация: ${lam.label}`,
        +(layout.areaM2 * layout.printSheets).toFixed(3), "м²", lam.price);
    }
    if (optVarnish) push("Постпечать", "УФ/ВД-лак", layout.printSheets, "лист", 5);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выборочного лака", 1, "усл.", 3000);
      push("Постпечать", "Приладка выб. лака", 1, "усл.", 1500);
      const areaM2 = (spotVarnishAreaCm2 / 10000) * circulation;
      push("Постпечать", "Выборочный лак", +areaM2.toFixed(3), "м²", 1200);
    }

    // Тиснение
    if (optStamp) {
      push("Постпечать", "Клише тиснения", 1, "усл.", Math.max(2500, stampAreaCm2 * 80));
      push("Постпечать", "Приладка тиснения", 1, "усл.", 1500);
      push("Постпечать", "Фольга (площадь)",
        +((stampAreaCm2 / 10000) * circulation).toFixed(3), "м²", 1800);
      push("Постпечать", "Тиснение фольгой (нанесение)",
        circulation, "оттиск", +(Math.max(8, stampAreaCm2 * 0.6) * premiumCoef).toFixed(2));
    }
    // Конгрев
    if (optEmboss) {
      push("Постпечать", "Клише конгрева", 1, "усл.", 3500);
      push("Постпечать", "Приладка конгрева", 1, "усл.", 1500);
      push("Постпечать", "Конгрев (нанесение)", circulation, "оттиск", +(12 * premiumCoef).toFixed(2));
    }
    // Фольгирование (без клише, площадное)
    if (optFoil) {
      push("Постпечать", "Фольгирование (фольга)",
        +((foilAreaCm2 / 10000) * circulation).toFixed(3), "м²", 2000);
      push("Постпечать", "Фольгирование (нанесение)", circulation, "оттиск", +(10 * premiumCoef).toFixed(2));
      push("Постпечать", "Приладка фольгирования", 1, "усл.", 1500);
    }

    // Нумерация
    if (optNumber) {
      push("Персонализация", "Подготовка нумерации", 1, "усл.", 1500);
      push("Персонализация", "Нумерация",
        circulation * Math.max(1, numbersPerItem), "номер", 1.5);
      push("Персонализация", "Контроль последовательности номеров", 1, "усл.", 800);
    }

    // Персонализация
    if (optPersonal) {
      push("Персонализация", `Подготовка: ${personal.label}`, 1, "усл.", personal.prep);
      if (hasDatabase) {
        push("Персонализация", "Подготовка базы данных", 1, "усл.", 2500);
        if (dbCheck) push("Персонализация", "Проверка базы", 1, "усл.", 1500);
      }
      push("Персонализация", `Нанесение: ${personal.label}`,
        circulation * Math.max(1, personalCount), "элемент", personal.price);
    }

    // QR / штрихкод как отдельные (если включены отдельно от персонализации)
    if (optQR && personalKind !== "qr") {
      push("Персонализация", "QR-код (подготовка)", 1, "усл.", 2000);
      push("Персонализация", "QR-код (нанесение)", circulation, "элемент", 8);
    }
    if (optBarcode) {
      push("Персонализация", "Штрихкод (подготовка)", 1, "усл.", 1500);
      push("Персонализация", "Штрихкод (нанесение)", circulation, "элемент", 5);
    }

    // Высечка
    if (optDieCut) {
      push("Постпечать", "Штамп высечки", 1, "усл.", 6500);
      push("Постпечать", "Приладка высечки", 1, "усл.", 1800);
      push("Постпечать", "Высечка", layout.printSheets, "лист", 4);
      if (optDeflash)
        push("Постпечать", "Удаление облоя",
          layout.printSheets * layout.up, "изд.", +(1.2 * premiumCoef).toFixed(2));
    }

    // Резка готовой продукции
    push("Постпечать", "Резка готовой продукции", layout.printSheets, "лист", 1.2);
    if (optRound) push("Постпечать", "Скругление углов", circulation * roundCorners, "угол", 0.7);

    // Комплектовка с папкой
    if (folderKind !== "none") {
      push("Комплектация", `Папка: ${folder.label}`, circulation, "шт.", folder.price);
      push("Комплектация", "Комплектовка с папкой", circulation, "компл.", folder.kitting);
    }
    // Комплектовка с рамкой / паспарту
    if (frameKind !== "none") {
      push("Комплектация", `Рамка: ${frame.label}`, circulation, "шт.", frame.price);
      if (optPassepartout) push("Комплектация", "Паспарту", circulation, "шт.", 180);
      push("Комплектация", "Комплектовка с рамкой", circulation, "компл.", frame.kitting);
    }

    // Контроль качества (с коэф. для персонализации)
    const qcCoef = optPersonal || optNumber || optQR ? 1.5 : 1.0;
    push("Логистика", `Контроль качества${qcCoef > 1 ? " (×" + qcCoef + " персон.)" : ""}`,
      circulation, "изд.", +(1.5 * qcCoef).toFixed(2));

    // Упаковка
    if (packKind !== "none") push("Упаковка", `Индивидуальная: ${pack.label}`, circulation, "шт.", pack.price);
    push("Логистика", "Упаковка тиража в пачки", circulation, "шт.", 1.5);
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [hasDesign, material, layout, offset, ownTurn, colorFront, colorBack, pantoneCount,
      lamType, lam, optVarnish, optSpotVarnish, spotVarnishAreaCm2,
      optStamp, stampAreaCm2, optEmboss, optFoil, foilAreaCm2,
      optNumber, numbersPerItem, optPersonal, personal, personalKind, personalCount, hasDatabase, dbCheck,
      optQR, optBarcode, optDieCut, optDeflash, optRound, roundCorners,
      folderKind, folder, frameKind, frame, optPassepartout, packKind, pack,
      circulation, premiumCoef, hasDelivery, deliveryCost]);

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
    if (optFoil) s.push("Фольгирование");
    if (optNumber) s.push("Нумерация");
    if (optPersonal) s.push(`Персонализация: ${personal.label}`);
    if (optQR && personalKind !== "qr") s.push("QR-код");
    if (optBarcode) s.push("Штрихкод");
    if (optDieCut) { s.push("Высечка"); if (optDeflash) s.push("Удаление облоя"); }
    s.push("Резка готовой продукции");
    if (optRound) s.push("Скругление углов");
    if (folderKind !== "none") s.push(`Комплектовка: ${folder.label}`);
    if (frameKind !== "none") s.push(`Комплектовка: ${frame.label}${optPassepartout ? " + паспарту" : ""}`);
    s.push("Контроль качества");
    if (packKind !== "none") s.push(`Индивидуальная упаковка: ${pack.label}`);
    s.push("Упаковка тиража");
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, material, offset, lamType, lam, optVarnish, optSpotVarnish, optStamp, optEmboss,
      optFoil, optNumber, optPersonal, personal, personalKind, optQR, optBarcode,
      optDieCut, optDeflash, optRound, folderKind, folder, frameKind, frame, optPassepartout,
      packKind, pack, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Award className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Грамота / Диплом</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Дизайнерские бумаги, персонализация, нумерация, тиснение/фольга, рамки и папки.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 62</Badge>
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
                    <Label>Готовый формат</Label>
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
                  <div className="sm:col-span-2">
                    <Label>Тип изделия</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground self-end">
                    Размер: <b>{itemW}×{itemH}</b> мм · {variable ? "переменные данные → рекомендуется цифра" : "стандартный режим"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["material", "personal", "postpress", "kit"]} className="w-full">
                    <AccordionItem value="material">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">2. Материал и печать
                          <Badge variant="secondary" className="text-[10px]">{material.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Бумага</Label>
                            <Select value={materialKey} onValueChange={setMaterialKey}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label} ({fmtMoney(m.pricePerSheet)}/лист){m.designer ? " · дизайнерская" : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Плотность, г/м²</Label><Input value={material.density} readOnly /></div>
                          <div><Label>Дизайнерская</Label><Input value={material.designer ? "да" : "нет"} readOnly /></div>
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

                    <AccordionItem value="personal">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">3. Персонализация и нумерация
                          <Badge variant={variable ? "default" : "outline"} className="text-[10px]">
                            {[optPersonal && personal.label, optNumber && "нумерация", optQR && personalKind !== "qr" && "QR", optBarcode && "штрихкод"].filter(Boolean).join(", ") || "нет"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
                          <div className="sm:col-span-2 space-y-2">
                            <Row label="Персонализация" checked={optPersonal} onChange={setOptPersonal} />
                            {optPersonal && (
                              <div className="grid gap-3 sm:grid-cols-2 pl-7">
                                <div>
                                  <Label>Тип</Label>
                                  <Select value={personalKind} onValueChange={(v) => setPersonalKind(v as PersonalKind)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {PERSONALS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div><Label>Элементов на изделие</Label>
                                  <Input type="number" min={1} value={personalCount} onChange={(e) => setPersonalCount(+e.target.value || 1)} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox id="db" checked={hasDatabase} onCheckedChange={(v) => setHasDatabase(!!v)} />
                                  <Label htmlFor="db" className="cursor-pointer">База данных</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox id="dbcheck" checked={dbCheck} onCheckedChange={(v) => setDbCheck(!!v)} disabled={!hasDatabase} />
                                  <Label htmlFor="dbcheck" className="cursor-pointer">Проверка базы</Label>
                                </div>
                              </div>
                            )}
                            <Row label="Нумерация" checked={optNumber} onChange={setOptNumber}>
                              <Input className="h-8 w-20" type="number" min={1} value={numbersPerItem} onChange={(e) => setNumbersPerItem(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">номеров/изд.</span>
                            </Row>
                            <Row label="QR-код (как отдельная операция)" checked={optQR} onChange={setOptQR} />
                            <Row label="Штрихкод" checked={optBarcode} onChange={setOptBarcode} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

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
                            <Row label="Фольгирование (площадное)" checked={optFoil} onChange={setOptFoil}>
                              <Input className="h-8 w-24" type="number" min={1} value={foilAreaCm2} onChange={(e) => setFoilAreaCm2(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">см²/изд.</span>
                            </Row>
                            <Row label="Высечка (штамп)" checked={optDieCut} onChange={setOptDieCut} />
                            <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                            <Row label="Скругление углов" checked={optRound} onChange={setOptRound}>
                              <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(+e.target.value || 1)} />
                              <span className="text-xs text-muted-foreground">угла</span>
                            </Row>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="kit">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">5. Комплектовка
                          <Badge variant="outline" className="text-[10px]">
                            {[folderKind !== "none" && folder.label, frameKind !== "none" && frame.label, optPassepartout && "паспарту"].filter(Boolean).join(", ") || "—"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div>
                            <Label>Папка</Label>
                            <Select value={folderKind} onValueChange={(v) => setFolderKind(v as FolderOpt)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FOLDERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}{f.price ? ` · ${fmtMoney(f.price)}/шт` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Рамка</Label>
                            <Select value={frameKind} onValueChange={(v) => setFrameKind(v as FrameOpt)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FRAMES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}{f.price ? ` · ${fmtMoney(f.price)}/шт` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="passe" checked={optPassepartout} onCheckedChange={(v) => setOptPassepartout(!!v)} disabled={frameKind === "none"} />
                            <Label htmlFor="passe" className="cursor-pointer">Паспарту</Label>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ship">
                      <AccordionTrigger>6. Упаковка и доставка</AccordionTrigger>
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
                productType="leaflet"
                defaultName={`Грамота/Диплом ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-diploma" />
          
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm">Спецификация</CardTitle></CardHeader>
            <CardContent>
              <SpecTable lines={lines} />
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