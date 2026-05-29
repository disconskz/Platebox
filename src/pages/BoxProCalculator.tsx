import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Box as BoxIcon, Plus, Trash2, Check, Wand2, Wrench } from "lucide-react";
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
import { fmtMoney } from "@/lib/format";
import TemplateActions from "@/components/calc/TemplateActions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  pickBestFormat,
  pickBestForGroup,
  groupSignature,
  type ImposeResult,
  type GroupImposeResult,
} from "@/lib/calc/box-pro/impose";
import { calcDiecut, type DiecutResult } from "@/lib/calc/box-pro/diecut";
import { buildUnfoldSvg, buildUnfoldDxf, buildProductionRoute } from "@/lib/calc/box-pro/svg";

/**
 * Доработка 84 — ERP-модуль расчёта коробок (Этап 1: каркас + конструктор деталей).
 *
 * Менеджер шагает по 6 шагам:
 *   1. Тип коробки  →  2. Размеры  →  3. Материал  →  4. Печать  →  5. Опции  →  6. Итог
 *
 * Программа сама создаёт нужные детали (крышка/дно/ложемент/окно/шубер/перегородки)
 * под выбранный подтип. Этапы 2-4 ТЗ (авто-спуски, авто-штамп из развёртки, DXF/SVG)
 * подключаются следующими итерациями поверх этого каркаса.
 */

// ─── Подтипы коробок ─────────────────────────────────────────────────
type BoxSubType =
  | "self_assembly"
  | "lid_bottom"
  | "magnet"
  | "window"
  | "sleeve"
  | "kashir"
  | "tray"
  | "microcorrugated"
  | "gift"
  | "premium";

const SUBTYPES: { value: BoxSubType; label: string; hint: string }[] = [
  { value: "self_assembly", label: "Самосборная", hint: "Одно полотно, склейка дна-замка." },
  { value: "lid_bottom", label: "Крышка-дно", hint: "Две раздельные детали: крышка и дно." },
  { value: "magnet", label: "С магнитом", hint: "Каширка + крышка на магнитах." },
  { value: "window", label: "С окном", hint: "Вырезанное окно + ПЭТ-плёнка." },
  { value: "sleeve", label: "Пенал / шубер", hint: "Внутренний лоток + наружный шубер." },
  { value: "kashir", label: "Кашированная", hint: "Переплётный картон + кашировочный лайнер." },
  { value: "tray", label: "С ложементом", hint: "Коробка + EVA/поролон-ложемент." },
  { value: "microcorrugated", label: "Микрогофрокоробка", hint: "Микрогофра T/E, без каширования." },
  { value: "gift", label: "Подарочная", hint: "Кашированная + лента/магниты." },
  { value: "premium", label: "Premium", hint: "Кашированная + ложемент + фурнитура." },
];

// ─── Детали ──────────────────────────────────────────────────────────
type PartKind =
  | "lid" | "bottom" | "body" | "sleeve" | "tray"
  | "divider" | "insert" | "window" | "liner" | "reinforcement";

const PART_LABELS: Record<PartKind, string> = {
  lid: "Крышка",
  bottom: "Дно",
  body: "Корпус",
  sleeve: "Шубер",
  tray: "Ложемент",
  divider: "Перегородка",
  insert: "Вкладыш",
  window: "Окно (ПЭТ)",
  liner: "Лайнер",
  reinforcement: "Усиление",
};

type MaterialKind = "coated" | "chromers" | "microcorr" | "bookbind" | "designer" | "eva" | "plastic" | "pvc" | "pet";
const MATERIAL_LABELS: Record<MaterialKind, string> = {
  coated: "Мелованный картон",
  chromers: "Хром-эрзац",
  microcorr: "Микрогофра",
  bookbind: "Переплётный картон",
  designer: "Дизайнерский картон",
  eva: "EVA",
  plastic: "Пластик",
  pvc: "ПВХ",
  pet: "ПЭТ-плёнка",
};

type MaterialPreset = {
  id: string;
  kind: MaterialKind;
  label: string;
  density: number;        // г/м² или эквивалент
  thickness: number;      // мм
  sheetW: number;         // мм
  sheetH: number;         // мм
  pricePerSheet: number;  // тг
  wastePct: number;       // отходы, %
};

const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "coated250", kind: "coated", label: "Мелованный 250 г/м²", density: 250, thickness: 0.30, sheetW: 620, sheetH: 940, pricePerSheet: 75, wastePct: 5 },
  { id: "coated300", kind: "coated", label: "Мелованный картон 300 г/м²", density: 300, thickness: 0.36, sheetW: 620, sheetH: 940, pricePerSheet: 95, wastePct: 5 },
  { id: "coated350", kind: "coated", label: "Мелованный картон 350 г/м²", density: 350, thickness: 0.42, sheetW: 620, sheetH: 940, pricePerSheet: 120, wastePct: 5 },
  { id: "chromers300", kind: "chromers", label: "Хром-эрзац 300 г/м²", density: 300, thickness: 0.40, sheetW: 700, sheetH: 1000, pricePerSheet: 110, wastePct: 5 },
  { id: "micro_t", kind: "microcorr", label: "Микрогофра T (1.2 мм)", density: 480, thickness: 1.2, sheetW: 700, sheetH: 1000, pricePerSheet: 220, wastePct: 7 },
  { id: "micro_e", kind: "microcorr", label: "Микрогофра E (1.6 мм)", density: 520, thickness: 1.6, sheetW: 700, sheetH: 1000, pricePerSheet: 260, wastePct: 7 },
  { id: "bookbind15", kind: "bookbind", label: "Переплётный картон 1.5 мм", density: 900, thickness: 1.5, sheetW: 700, sheetH: 1000, pricePerSheet: 380, wastePct: 8 },
  { id: "bookbind20", kind: "bookbind", label: "Переплётный картон 2.0 мм", density: 1200, thickness: 2.0, sheetW: 700, sheetH: 1000, pricePerSheet: 480, wastePct: 8 },
  { id: "designer300", kind: "designer", label: "Дизайнерский картон 300 г/м²", density: 300, thickness: 0.40, sheetW: 720, sheetH: 1020, pricePerSheet: 260, wastePct: 6 },
  { id: "eva5", kind: "eva", label: "EVA 5 мм", density: 100, thickness: 5, sheetW: 1000, sheetH: 2000, pricePerSheet: 1800, wastePct: 15 },
  { id: "eva10", kind: "eva", label: "EVA 10 мм", density: 120, thickness: 10, sheetW: 1000, sheetH: 2000, pricePerSheet: 3000, wastePct: 15 },
  { id: "pet300", kind: "pet", label: "ПЭТ-плёнка 0.3 мм", density: 380, thickness: 0.3, sheetW: 700, sheetH: 1000, pricePerSheet: 280, wastePct: 10 },
];

type Part = {
  id: string;
  kind: PartKind;
  name: string;
  qtyPerBox: number;
  materialId: string;
  /** Габариты ОДНОЙ детали в развёртке, мм */
  developW: number;
  developH: number;
  colorFront: number;
  colorBack: number;
  hasLam: boolean;
  lamSides: 1 | 2;
  hasFoil: boolean;
  hasEmboss: boolean;
  removable: boolean; // false для базовых деталей подтипа
};

// ─── Авто-набор деталей по подтипу ────────────────────────────────────
function autoPartsFor(sub: BoxSubType, w: number, l: number, h: number, lidH: number): Part[] {
  const baseDevelop = (W: number, L: number, H: number) => ({
    w: W + 2 * H + 30,
    h: L + 2 * H + 30,
  });
  const dev = baseDevelop(w, l, h);
  const lidDev = baseDevelop(w + 4, l + 4, lidH);

  const p = (kind: PartKind, dW: number, dH: number, materialId: string, qty = 1): Part => ({
    id: crypto.randomUUID(),
    kind,
    name: PART_LABELS[kind],
    qtyPerBox: qty,
    materialId,
    developW: Math.round(dW),
    developH: Math.round(dH),
    colorFront: 4,
    colorBack: 0,
    hasLam: false,
    lamSides: 1,
    hasFoil: false,
    hasEmboss: false,
    removable: false,
  });

  switch (sub) {
    case "self_assembly":
      return [p("body", dev.w, dev.h, "chromers300")];
    case "lid_bottom":
      return [p("lid", lidDev.w, lidDev.h, "coated350"), p("bottom", dev.w, dev.h, "coated350")];
    case "magnet":
      return [
        p("lid", w + 30, l + 30, "bookbind20"),
        p("bottom", w + 30, l + 30, "bookbind20"),
        p("liner", lidDev.w, lidDev.h, "coated250"),
      ];
    case "window":
      return [
        p("lid", lidDev.w, lidDev.h, "coated350"),
        p("bottom", dev.w, dev.h, "coated350"),
        p("window", Math.max(50, w - 20), Math.max(50, l - 20), "pet300"),
      ];
    case "sleeve":
      return [
        p("body", dev.w, dev.h, "coated350"),
        p("sleeve", w + 2 * h + 20, l + 30, "coated300"),
      ];
    case "kashir":
      return [
        p("bottom", w + 30, l + 30, "bookbind20"),
        p("liner", dev.w, dev.h, "coated250"),
      ];
    case "tray":
      return [
        p("lid", lidDev.w, lidDev.h, "coated350"),
        p("bottom", dev.w, dev.h, "coated350"),
        p("tray", w - 5, l - 5, "eva10"),
      ];
    case "microcorrugated":
      return [p("body", dev.w, dev.h, "micro_e")];
    case "gift":
      return [
        p("lid", w + 30, l + 30, "bookbind15"),
        p("bottom", w + 30, l + 30, "bookbind15"),
        p("liner", lidDev.w, lidDev.h, "designer300"),
      ];
    case "premium":
      return [
        p("lid", w + 30, l + 30, "bookbind20"),
        p("bottom", w + 30, l + 30, "bookbind20"),
        p("liner", lidDev.w, lidDev.h, "designer300"),
        p("tray", w - 5, l - 5, "eva10"),
      ];
  }
}

// ─── Цены доп. операций (печать/материал считает движок imposition) ──
const LAM_PRICE_PER_SHEET = 18;       // тг/лист с одной стороны
const FOIL_PRICE_PER_PART = 8;        // тг/деталь
const EMBOSS_PRICE_PER_PART = 6;      // тг/деталь
const ASSEMBLY_PER_BOX = 25;          // тг/коробка ручная сборка

function calcPart(part: Part, circulation: number, mat: MaterialPreset | undefined) {
  if (!mat) {
    return {
      sheets: 0, perSheet: 0, materialCost: 0, printCost: 0,
      lamCost: 0, foilCost: 0, embossCost: 0, dieCost: 0, postCost: 0,
      partTotal: 0,
      impose: null as ImposeResult | null,
      diecut: null as DiecutResult | null,
    };
  }
  const totalParts = circulation * part.qtyPerBox;
  const impose = pickBestFormat({
    developW: part.developW,
    developH: part.developH,
    totalParts,
    sheetW: mat.sheetW,
    sheetH: mat.sheetH,
    colorSum: part.colorFront + part.colorBack,
    pricePerPurchaseSheet: mat.pricePerSheet,
    wastePct: mat.wastePct,
  });
  const sheetsInt = impose.best?.sheets ?? 0;
  const perSheet = impose.best?.itemsPerSheet ?? 0;
  const materialCost = impose.best?.materialCost ?? 0;
  const printCost = impose.best?.printCost ?? 0;
  const lamCost = part.hasLam ? sheetsInt * LAM_PRICE_PER_SHEET * part.lamSides : 0;
  const foilCost = part.hasFoil ? totalParts * FOIL_PRICE_PER_PART : 0;
  const embossCost = part.hasEmboss ? totalParts * EMBOSS_PRICE_PER_PART : 0;
  // ─── Этап 4: авто-расчёт штампа по развёртке ──────────────────────
  const diecut = calcDiecut({
    kind: part.kind,
    developW: part.developW,
    developH: part.developH,
    perSheet,
    sheets: sheetsInt,
    windowW: part.kind === "window" ? Math.max(0, part.developW - 20) : 0,
    windowH: part.kind === "window" ? Math.max(0, part.developH - 20) : 0,
  });
  const dieCost = diecut.total;
  const postCost = lamCost + foilCost + embossCost + dieCost;
  return {
    sheets: sheetsInt,
    perSheet,
    materialCost,
    printCost,
    lamCost,
    foilCost,
    embossCost,
    dieCost,
    postCost,
    partTotal: materialCost + printCost + postCost,
    impose,
    diecut,
  };
}

// ─── Компонент ────────────────────────────────────────────────────────
export interface BoxProCalculatorProps { embedded?: boolean }
export default function BoxProCalculator({ embedded = false }: BoxProCalculatorProps = {}) {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  // ─── Доработка 84 — два уровня UI ────────────────────────────────
  // "simple" — для менеджеров: только тип, размеры, тираж, базовые опции и цена.
  // "tech"   — для технологов: полный пошаговый мастер с развёртками, штампом,
  //            спусками, сравнением форматов и маршрутом производства.
  const [mode, setMode] = useState<"simple" | "tech">(() => {
    if (typeof window === "undefined") return "simple";
    return (localStorage.getItem("boxPro.mode") as "simple" | "tech") || "simple";
  });
  useEffect(() => {
    try { localStorage.setItem("boxPro.mode", mode); } catch { /* ignore */ }
  }, [mode]);

  // Базовые поля
  const [subType, setSubType] = useState<BoxSubType>("lid_bottom");
  const [innerW, setInnerW] = useState(150);
  const [innerL, setInnerL] = useState(200);
  const [innerH, setInnerH] = useState(80);
  const [lidH, setLidH] = useState(35);
  const [circulation, setCirculation] = useState(500);
  const [margin, setMargin] = useState(40);
  const vatPercent = 16;

  // Фурнитура / опции на уровне коробки
  const [hasMagnet, setHasMagnet] = useState(false);
  const [hasRibbon, setHasRibbon] = useState(false);
  const [hasHandle, setHasHandle] = useState(false);
  const [hasEyelet, setHasEyelet] = useState(false);

  // Детали
  const [parts, setParts] = useState<Part[]>(() => autoPartsFor("lid_bottom", 150, 200, 80, 35));

  // Авто-пересборка деталей при смене подтипа
  useEffect(() => {
    setParts(autoPartsFor(subType, innerW, innerL, innerH, lidH));
    if (subType === "magnet") setHasMagnet(true);
    if (subType === "gift" || subType === "premium") setHasRibbon(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subType]);

  // Подкачка значений из шаблона (when embedded и есть ?from=)
  useEffect(() => {
    if (!embedded) return;
    const tpl = searchParams.get("from");
    if (!tpl) return;
    (async () => {
      const { data, error } = await supabase
        .from("calculations")
        .select("circulation")
        .eq("id", tpl)
        .maybeSingle();
      if (error || !data) return;
      if (data.circulation) setCirculation(Number(data.circulation));
    })();
  }, [embedded, searchParams]);

  // ── Расчёт ────────────────────────────────────────────────────────
  const result = useMemo(() => {
    // Сначала индивидуальные расчёты — для базовой стоимости и подсказок.
    const lines = parts.map((part) => {
      const mat = MATERIAL_PRESETS.find((m) => m.id === part.materialId);
      const r = calcPart(part, circulation, mat);
      return { part, mat, ...r };
    });

    // ── Этап 3: групповая раскладка ─────────────────────────────────
    // Группируем по материалу + печати + ламинации и считаем общий спуск.
    type GroupMeta = {
      key: string;
      partIds: string[];
      result: GroupImposeResult | null;
    };
    const groupsMap = new Map<string, { partIds: string[]; sample: typeof parts[number]; mat?: MaterialPreset }>();
    for (const part of parts) {
      const mat = MATERIAL_PRESETS.find((m) => m.id === part.materialId);
      const sig = groupSignature(part);
      const cur = groupsMap.get(sig);
      if (cur) cur.partIds.push(part.id);
      else groupsMap.set(sig, { partIds: [part.id], sample: part, mat });
    }
    const groups: GroupMeta[] = [];
    // Атрибутированные стоимости от группового спуска (id детали → {mat, print})
    const groupAttribution = new Map<string, { mat: number; print: number }>();
    for (const [key, g] of groupsMap.entries()) {
      if (!g.mat || g.partIds.length === 0) {
        groups.push({ key, partIds: g.partIds, result: null });
        continue;
      }
      const r = pickBestForGroup({
        sheetW: g.mat.sheetW,
        sheetH: g.mat.sheetH,
        pricePerPurchaseSheet: g.mat.pricePerSheet,
        wastePct: g.mat.wastePct,
        colorSum: g.sample.colorFront + g.sample.colorBack,
        parts: g.partIds.map((pid) => {
          const p = parts.find((x) => x.id === pid)!;
          return {
            id: pid,
            developW: p.developW,
            developH: p.developH,
            totalParts: circulation * p.qtyPerBox,
          };
        }),
      });
      groups.push({ key, partIds: g.partIds, result: r });
      if (r.best && r.savings > 0) {
        // Применяем экономию только если групповой расчёт реально дешевле
        for (const pid of g.partIds) {
          const ap = r.best.perPart[pid];
          if (ap) groupAttribution.set(pid, { mat: ap.attributedMaterial, print: ap.attributedPrint });
        }
      }
    }

    // Применяем результат группировки к строкам (там, где есть экономия)
    const finalLines = lines.map((l) => {
      const attr = groupAttribution.get(l.part.id);
      if (!attr) return l;
      const newMat = attr.mat;
      const newPrint = attr.print;
      return {
        ...l,
        materialCost: newMat,
        printCost: newPrint,
        partTotal: newMat + newPrint + l.postCost,
      };
    });

    const materials = finalLines.reduce((s, l) => s + l.materialCost, 0);
    const printCost = finalLines.reduce((s, l) => s + l.printCost, 0);
    const postCost = lines.reduce((s, l) => s + l.postCost, 0);
    const fittings =
      (hasMagnet ? 4 * circulation * 35 : 0) +
      (hasRibbon ? circulation * 25 : 0) +
      (hasHandle ? 2 * circulation * 40 : 0) +
      (hasEyelet ? 4 * circulation * 8 : 0);
    const assembly = circulation * ASSEMBLY_PER_BOX;
    const totalCost = materials + printCost + postCost + fittings + assembly;
    const salePrice = totalCost * (1 + margin / 100);
    const totalWithVat = salePrice * (1 + vatPercent / 100);
    const totalGroupSavings = groups.reduce((s, g) => s + (g.result?.savings ?? 0), 0);
    return {
      lines: finalLines,
      groups,
      totalGroupSavings,
      materials,
      printCost,
      postCost,
      fittings,
      assembly,
      totalCost,
      salePrice,
      totalWithVat,
      perUnit: circulation > 0 ? totalWithVat / circulation : 0,
    };
  }, [parts, circulation, margin, vatPercent, hasMagnet, hasRibbon, hasHandle, hasEyelet]);

  // ── UI: оболочка для embedded ─────────────────────────────────────
  const Shell: any = embedded ? Fragment : PageShell;
  const Main: any = embedded ? Fragment : PageMain;

  const updatePart = (id: string, patch: Partial<Part>) =>
    setParts((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePart = (id: string) => setParts((cur) => cur.filter((p) => p.id !== id));
  const addCustomPart = (kind: PartKind) =>
    setParts((cur) => [
      ...cur,
      {
        id: crypto.randomUUID(),
        kind,
        name: PART_LABELS[kind],
        qtyPerBox: 1,
        materialId: "coated300",
        developW: 200,
        developH: 200,
        colorFront: 4,
        colorBack: 0,
        hasLam: false,
        lamSides: 1,
        hasFoil: false,
        hasEmboss: false,
        removable: true,
      },
    ]);

  // ─── Этап 5: скачать развёртку (SVG / DXF) ──────────────────────
  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const unfoldInputFor = (part: Part) => ({
    kind: part.kind,
    developW: part.developW,
    developH: part.developH,
    flapH: innerH,
    windowW: part.kind === "window" ? Math.max(0, part.developW - 20) : 0,
    windowH: part.kind === "window" ? Math.max(0, part.developH - 20) : 0,
  });

  const stepBtn = (n: number, label: string) => (
    <button
      type="button"
      onClick={() => setStep(n)}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
        step === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-xs">
        {step > n ? <Check className="h-3 w-3" /> : n}
      </span>
      {label}
    </button>
  );

  return (
    <Shell>
      {!embedded && (
        <PageHeader>
          <PageHeaderRow>
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Link>
            <div className="flex items-center gap-2">
              <BoxIcon className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Калькулятор коробок (PRO)</h1>
              <Badge variant="secondary">Доработка 84 · этап 1</Badge>
            </div>
          </PageHeaderRow>
        </PageHeader>
      )}
      <Main>
        <PageContainer>
          {/* Переключатель уровней (Доработка 84): простой для менеджера / полный для технолога */}
          <div className="mb-3 inline-flex rounded-lg border bg-card p-1">
            <button
              type="button"
              onClick={() => setMode("simple")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
                mode === "simple" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Wand2 className="h-4 w-4" /> Менеджер
            </button>
            <button
              type="button"
              onClick={() => setMode("tech")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
                mode === "tech" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Wrench className="h-4 w-4" /> Технолог
            </button>
          </div>
          <div className="mb-3 text-xs text-muted-foreground">
            {mode === "simple"
              ? "Простой режим: программа сама строит развёртки, считает штампы, ножи и спуски, выбирает формат и маршрут."
              : "Технологический режим: полный мастер с развёртками, сравнением форматов, групповыми спусками и маршрутом производства."}
          </div>

          {mode === "tech" && (
          <div className="mb-4 flex flex-wrap gap-2">
            {stepBtn(1, "1. Тип")}
            {stepBtn(2, "2. Размеры")}
            {stepBtn(3, "3. Материал")}
            {stepBtn(4, "4. Печать")}
            {stepBtn(5, "5. Опции")}
            {stepBtn(6, "6. Итог")}
          </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {mode === "simple" && (
                <Card>
                  <CardHeader><CardTitle>Параметры коробки</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-xs text-muted-foreground">Тип коробки</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SUBTYPES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setSubType(s.value)}
                            className={cn(
                              "rounded-lg border p-2 text-left text-sm transition",
                              subType === s.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                            )}
                          >
                            <div className="font-medium">{s.label}</div>
                            <div className="text-[11px] text-muted-foreground">{s.hint}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Ширина, мм</Label>
                        <Input type="number" value={innerW} onChange={(e) => setInnerW(Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Длина, мм</Label>
                        <Input type="number" value={innerL} onChange={(e) => setInnerL(Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Высота, мм</Label>
                        <Input type="number" value={innerH} onChange={(e) => setInnerH(Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Тираж, шт</Label>
                        <Input type="number" value={circulation} onChange={(e) => setCirculation(Math.max(1, Number(e.target.value) || 1))} />
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="mb-2 block text-xs text-muted-foreground">Доп. опции</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={hasMagnet} onCheckedChange={(v) => setHasMagnet(!!v)} /> Магниты
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={hasRibbon} onCheckedChange={(v) => setHasRibbon(!!v)} /> Лента / резинка
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={hasHandle} onCheckedChange={(v) => setHasHandle(!!v)} /> Ручки
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={hasEyelet} onCheckedChange={(v) => setHasEyelet(!!v)} /> Люверсы
                        </label>
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                      Программа автоматически: построит {parts.length} деталь(-ей) развёртки,
                      подберёт печатный формат (A3+/A2+), сгруппирует одинаковые материалы в общий спуск,
                      посчитает штампы (ножи и биги) и построит маршрут производства.
                      Чтобы проверить технологию — переключитесь в «Технолог».
                    </div>
                  </CardContent>
                </Card>
              )}

              {mode === "tech" && step === 1 && (
                <Card>
                  <CardHeader><CardTitle>Тип коробки</CardTitle></CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    {SUBTYPES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSubType(s.value)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition",
                          subType === s.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                        )}
                      >
                        <div className="font-medium">{s.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {mode === "tech" && step === 2 && (
                <Card>
                  <CardHeader><CardTitle>Размеры коробки (внутренние, мм)</CardTitle></CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Ширина</Label>
                      <Input type="number" value={innerW} onChange={(e) => setInnerW(Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Длина</Label>
                      <Input type="number" value={innerL} onChange={(e) => setInnerL(Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Высота</Label>
                      <Input type="number" value={innerH} onChange={(e) => setInnerH(Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Высота крышки</Label>
                      <Input type="number" value={lidH} onChange={(e) => setLidH(Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Тираж, шт</Label>
                      <Input type="number" value={circulation} onChange={(e) => setCirculation(Math.max(1, Number(e.target.value) || 1))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        variant="outline"
                        onClick={() => setParts(autoPartsFor(subType, innerW, innerL, innerH, lidH))}
                      >
                        Пересобрать развёртки по этим размерам
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {mode === "tech" && (step === 3 || step === 4 || step === 5) && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>
                      {step === 3 && "Материалы по деталям"}
                      {step === 4 && "Печать по деталям"}
                      {step === 5 && "Доп. опции"}
                    </CardTitle>
                    {step === 5 && (
                      <Select onValueChange={(v) => addCustomPart(v as PartKind)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="+ добавить деталь" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PART_LABELS) as PartKind[]).map((k) => (
                            <SelectItem key={k} value={k}>{PART_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {parts.map((part) => {
                      const mat = MATERIAL_PRESETS.find((m) => m.id === part.materialId);
                      return (
                        <div key={part.id} className="rounded-lg border bg-card p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{PART_LABELS[part.kind]}</Badge>
                              <Input
                                className="h-7 w-44 text-xs"
                                value={part.name}
                                onChange={(e) => updatePart(part.id, { name: e.target.value })}
                              />
                              <span className="text-xs text-muted-foreground">×{part.qtyPerBox} на коробку</span>
                            </div>
                            {part.removable && (
                              <Button variant="ghost" size="icon" onClick={() => removePart(part.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {step === 3 && (
                            <div className="grid gap-3 sm:grid-cols-[1fr_100px_100px_80px]">
                              <div>
                                <Label className="text-xs">Материал</Label>
                                <Select value={part.materialId} onValueChange={(v) => updatePart(part.id, { materialId: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {MATERIAL_PRESETS.map((m) => (
                                      <SelectItem key={m.id} value={m.id}>
                                        {MATERIAL_LABELS[m.kind]}: {m.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Развёртка W, мм</Label>
                                <Input type="number" value={part.developW}
                                  onChange={(e) => updatePart(part.id, { developW: Number(e.target.value) || 0 })} />
                              </div>
                              <div>
                                <Label className="text-xs">Развёртка H, мм</Label>
                                <Input type="number" value={part.developH}
                                  onChange={(e) => updatePart(part.id, { developH: Number(e.target.value) || 0 })} />
                              </div>
                              <div>
                                <Label className="text-xs">×шт</Label>
                                <Input type="number" min={1} value={part.qtyPerBox}
                                  onChange={(e) => updatePart(part.id, { qtyPerBox: Math.max(1, Number(e.target.value) || 1) })} />
                              </div>
                              {mat && (
                                <div className="sm:col-span-4 text-xs text-muted-foreground">
                                  Лист {mat.sheetW}×{mat.sheetH} мм · {mat.pricePerSheet} ₸/л · толщ. {mat.thickness} мм
                                </div>
                              )}
                            </div>
                          )}

                          {step === 4 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">Цветность лицо</Label>
                                <Select value={String(part.colorFront)}
                                  onValueChange={(v) => updatePart(part.id, { colorFront: Number(v) })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {[0, 1, 2, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Цветность оборот</Label>
                                <Select value={String(part.colorBack)}
                                  onValueChange={(v) => updatePart(part.id, { colorBack: Number(v) })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {[0, 1, 2, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>+{n}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {step === 5 && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={part.hasLam} onCheckedChange={(v) => updatePart(part.id, { hasLam: !!v })} />
                                Ламинация
                              </label>
                              {part.hasLam && (
                                <Select value={String(part.lamSides)} onValueChange={(v) => updatePart(part.id, { lamSides: Number(v) as 1 | 2 })}>
                                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 сторона</SelectItem>
                                    <SelectItem value="2">2 стороны</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={part.hasFoil} onCheckedChange={(v) => updatePart(part.id, { hasFoil: !!v })} />
                                Тиснение фольгой
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={part.hasEmboss} onCheckedChange={(v) => updatePart(part.id, { hasEmboss: !!v })} />
                                Конгрев
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {step === 5 && (
                      <>
                        <Separator />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={hasMagnet} onCheckedChange={(v) => setHasMagnet(!!v)} /> Магниты (×4)
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={hasRibbon} onCheckedChange={(v) => setHasRibbon(!!v)} /> Лента / резинка
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={hasHandle} onCheckedChange={(v) => setHasHandle(!!v)} /> Ручки (×2)
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={hasEyelet} onCheckedChange={(v) => setHasEyelet(!!v)} /> Люверсы (×4)
                          </label>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {mode === "tech" && step === 6 && (
                <Card>
                  <CardHeader><CardTitle>Спецификация</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Деталь</TableHead>
                          <TableHead>Материал</TableHead>
                          <TableHead>Формат</TableHead>
                          <TableHead className="text-right">На листе</TableHead>
                          <TableHead className="text-right">Листов</TableHead>
                          <TableHead className="text-right">Материал</TableHead>
                          <TableHead className="text-right">Печать</TableHead>
                          <TableHead className="text-right">Постпечать</TableHead>
                          <TableHead className="text-right">Итого</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.lines.map((l) => (
                          <TableRow key={l.part.id}>
                            <TableCell>{l.part.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{l.mat?.label ?? "—"}</TableCell>
                            <TableCell className="text-xs">
                              {l.impose?.best ? (
                                <div className="space-y-0.5">
                                  <Badge variant={l.impose.splitFromA1 ? "destructive" : "secondary"}>
                                    {l.impose.best.format.id}
                                  </Badge>
                                  <div className="text-[10px] text-muted-foreground">{l.impose.hint}</div>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">{l.perSheet ?? 0}</TableCell>
                            <TableCell className="text-right">{l.sheets}</TableCell>
                            <TableCell className="text-right">{fmtMoney(l.materialCost)}</TableCell>
                            <TableCell className="text-right">{fmtMoney(l.printCost)}</TableCell>
                            <TableCell className="text-right">{fmtMoney(l.postCost)}</TableCell>
                            <TableCell className="text-right font-medium">{fmtMoney(l.partTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {/* Сравнение вариантов: показываем сколько стоил бы каждый формат */}
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Сравнение форматов по деталям</div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Деталь</TableHead>
                              <TableHead>Вариант</TableHead>
                              <TableHead className="text-right">Листов</TableHead>
                              <TableHead className="text-right">Материал</TableHead>
                              <TableHead className="text-right">Печать</TableHead>
                              <TableHead className="text-right">Сумма</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.lines.flatMap((l) =>
                              (l.impose?.variants ?? []).map((v, i) => {
                                const isBest = l.impose?.best?.format.id === v.format.id;
                                return (
                                  <TableRow key={l.part.id + "-" + v.format.id} className={isBest ? "bg-primary/5" : ""}>
                                    <TableCell className="text-xs">{i === 0 ? l.part.name : ""}</TableCell>
                                    <TableCell className="text-xs">
                                      {v.format.label} {isBest && <Badge variant="outline" className="ml-1">выбран</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">{v.sheets}</TableCell>
                                    <TableCell className="text-right text-xs">{fmtMoney(v.materialCost)}</TableCell>
                                    <TableCell className="text-right text-xs">{fmtMoney(v.printCost)}</TableCell>
                                    <TableCell className="text-right text-xs font-medium">{fmtMoney(v.total)}</TableCell>
                                  </TableRow>
                                );
                              }),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Формат A1 в производстве не используется — система перебирает только A3+ и A2+
                        и выбирает самый выгодный по сумме материал+печать.
                      </div>
                    </div>

                    {/* Этап 3: групповая раскладка */}
                    <div className="mt-6 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Авто-группировка деталей в общий спуск
                      </div>
                      <div className="space-y-2">
                        {result.groups.map((g) => {
                          const groupParts = g.partIds
                            .map((id) => parts.find((p) => p.id === id)?.name ?? "")
                            .filter(Boolean)
                            .join(", ");
                          const applied = (g.result?.savings ?? 0) > 0;
                          return (
                            <div
                              key={g.key}
                              className={cn(
                                "rounded-md border p-2 text-xs",
                                applied ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium">
                                  {g.partIds.length > 1 ? `Группа (${g.partIds.length})` : "Одна деталь"}: {groupParts}
                                </div>
                                {g.result?.best && (
                                  <Badge variant={applied ? "default" : "outline"}>
                                    {g.result.best.format.id}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 text-[11px] text-muted-foreground">{g.result?.hint ?? "—"}</div>
                              {g.result?.best && g.partIds.length > 1 && (
                                <div className="mt-1 text-[11px]">
                                  Раздельно: <span className="font-medium">{fmtMoney(g.result.independentTotal)}</span>
                                  {" → "}
                                  Группой: <span className="font-medium">{fmtMoney(g.result.best.total)}</span>
                                  {applied && (
                                    <span className="ml-1 text-primary">(экономия {fmtMoney(g.result.savings)})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Этап 4: авто-расчёт штампа из развёртки */}
                    <div className="mt-6 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Авто-расчёт штампа из развёртки (ножи и биговки)
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Деталь</TableHead>
                            <TableHead className="text-right">Нож, м</TableHead>
                            <TableHead className="text-right">Биг, м</TableHead>
                            <TableHead className="text-right">Нож, ₸</TableHead>
                            <TableHead className="text-right">Биг, ₸</TableHead>
                            <TableHead className="text-right">Приладка</TableHead>
                            <TableHead className="text-right">Прогон</TableHead>
                            <TableHead className="text-right">Штамп итого</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.lines.map((l) => (
                            <TableRow key={l.part.id + "-die"}>
                              <TableCell className="text-xs">{l.part.name}</TableCell>
                              <TableCell className="text-right text-xs">{l.diecut ? (l.diecut.knifeOnDieMm / 1000).toFixed(2) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.diecut ? (l.diecut.bigOnDieMm / 1000).toFixed(2) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.diecut ? fmtMoney(l.diecut.knifeCost) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.diecut ? fmtMoney(l.diecut.bigCost) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.diecut ? fmtMoney(l.diecut.setupCost) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.diecut ? fmtMoney(l.diecut.runCost) : "—"}</TableCell>
                              <TableCell className="text-right text-xs font-medium">{l.diecut ? fmtMoney(l.diecut.total) : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="text-[11px] text-muted-foreground">
                        Длина ножей считается из периметра развёртки (× деталей на листе),
                        биговки — по типу детали. Менеджеру не нужно знать технологию штампа.
                      </div>
                    </div>

                    {/* Этап 5: развёртки SVG/DXF */}
                    <div className="mt-6 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Развёртки деталей (нож красный, биг синий пунктир)
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {parts.map((part) => {
                          const svg = buildUnfoldSvg(unfoldInputFor(part));
                          return (
                            <div key={part.id + "-svg"} className="rounded-md border bg-card p-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{part.name}</span>
                                <span className="text-muted-foreground">{part.developW}×{part.developH} мм</span>
                              </div>
                              <div
                                className="my-2 flex max-h-48 items-center justify-center overflow-hidden rounded bg-background p-2"
                                dangerouslySetInnerHTML={{ __html: svg }}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => downloadFile(`${part.name}.svg`, svg, "image/svg+xml")}>
                                  SVG
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => downloadFile(`${part.name}.dxf`, buildUnfoldDxf(unfoldInputFor(part)), "application/dxf")}>
                                  DXF
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Этап 5: маршрут производства */}
                    <div className="mt-6 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Маршрут производства (auto)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {buildProductionRoute({
                          subType,
                          hasPrint: parts.some((p) => p.colorFront + p.colorBack > 0),
                          hasLam: parts.some((p) => p.hasLam),
                          hasFoil: parts.some((p) => p.hasFoil),
                          hasEmboss: parts.some((p) => p.hasEmboss),
                          hasWindow: parts.some((p) => p.kind === "window"),
                          hasMagnet,
                          hasRibbon,
                          hasHandle,
                          isKashir: subType === "kashir" || subType === "magnet" || subType === "gift" || subType === "premium",
                        }).map((s, i, arr) => (
                          <Fragment key={s.code}>
                            <div className="rounded-md border border-border bg-card px-2 py-1 text-xs">
                              <span className="font-mono text-[10px] text-muted-foreground">{s.code}</span>{" "}
                              <span className="font-medium">{s.label}</span>
                              {s.note && <div className="text-[10px] text-muted-foreground">{s.note}</div>}
                            </div>
                            {i < arr.length - 1 && <span className="self-center text-muted-foreground">→</span>}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {mode === "tech" && (
              <div className="flex justify-between">
                <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                  Назад
                </Button>
                <Button disabled={step === 6} onClick={() => setStep((s) => Math.min(6, s + 1))}>
                  Далее
                </Button>
              </div>
              )}
            </div>

            {/* Сайдбар с итогами */}
            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-base">Итого</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Материалы" value={result.materials} />
                  <Row label="Печать" value={result.printCost} />
                  <Row label="Постпечать / штамп" value={result.postCost} />
                  <Row label="Фурнитура" value={result.fittings} />
                  <Row label="Сборка" value={result.assembly} />
                  {result.totalGroupSavings > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Экономия от группировки</span>
                      <span>−{fmtMoney(result.totalGroupSavings)}</span>
                    </div>
                  )}
                  <Separator />
                  <Row label="Себестоимость" value={result.totalCost} bold />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Наценка, %</Label>
                    <Input className="h-7 w-20" type="number" value={margin}
                      onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <Row label="Цена продажи" value={result.salePrice} />
                  <Row label={`С НДС ${vatPercent}%`} value={result.totalWithVat} bold />
                  <Row label="За 1 коробку" value={result.perUnit} bold />
                </CardContent>
              </Card>

              <TemplateActions
                productType="box"
                defaultName={`Коробка ${SUBTYPES.find((s) => s.value === subType)?.label ?? ""} ${innerW}×${innerL}×${innerH}, ${circulation} шт`}
                circulation={circulation}
                margin={margin}
                vatPercent={vatPercent}
                totals={{
                  cost: result.totalCost,
                  sale: result.salePrice,
                  withVat: result.totalWithVat,
                  perItem: result.perUnit,
                }}
                spec={result.lines.flatMap((l) => [
                  { stage: "material", name: `${l.part.name} — ${l.mat?.label ?? "материал"}`, quantity: l.sheets, unit: "лист", unitPrice: l.mat?.pricePerSheet ?? 0, total: l.materialCost },
                  ...(l.printCost > 0 ? [{ stage: "print", name: `${l.part.name} — печать`, quantity: l.sheets, unit: "лист", unitPrice: l.sheets > 0 ? l.printCost / l.sheets : 0, total: l.printCost }] : []),
                  ...(l.postCost > 0 ? [{ stage: "postpress", name: `${l.part.name} — постпечать/штамп`, quantity: 1, unit: "услуга", unitPrice: l.postCost, total: l.postCost }] : []),
                ])}
                extra={{
                  box_pro: { subType, innerW, innerL, innerH, lidH, hasMagnet, hasRibbon, hasHandle, hasEyelet, parts },
                }}
              />
            </div>
          </div>
        </PageContainer>
      </Main>
    </Shell>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "font-semibold")}>
      <span className="text-muted-foreground">{label}</span>
      <span>{fmtMoney(value)}</span>
    </div>
  );
}