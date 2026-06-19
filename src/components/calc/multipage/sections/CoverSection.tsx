import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BookOpen, AlertTriangle } from "lucide-react";
import { SectionHelp } from "../SectionHelp";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";
import { buildCoverReport, buildCoverRoute, buildCoverWarnings } from "@/lib/calc/cover/cost";

/**
 * Задача 5 — Обложка как самостоятельная ERP-сущность.
 * Поддерживает: основные параметры, тип обложки, наследование/override
 * глобальных параметров, отдельную печать, ламинацию, спецоперации,
 * автоматические тех. предупреждения и тех. отчёт.
 */

export type CoverKind =
  | "soft" | "thick" | "plastic" | "designer" | "kraft"
  | "laminated" | "cashed" | "hard" | "composite";

export const COVER_KIND_LABELS: Record<CoverKind, string> = {
  soft: "Мягкая",
  thick: "Плотная",
  plastic: "Пластиковая",
  designer: "Дизайнерская",
  kraft: "Крафт",
  laminated: "Ламинированная",
  cashed: "Кашированная",
  hard: "Твёрдая",
  composite: "Составная",
};

export type LamType = "none" | "matte" | "gloss" | "soft_touch" | "anti_scratch";
export const LAM_LABELS: Record<LamType, string> = {
  none: "Без ламинации",
  matte: "Матовая",
  gloss: "Глянцевая",
  soft_touch: "Soft-touch",
  anti_scratch: "Anti-scratch",
};

export type PrintTypeLocal = "auto" | "offset" | "digital" | "uv";

/** Ключи спецопераций обложки (без «фольги» — она является материалом). */
export type CoverSpecOpKey =
  | "spotVarnish"
  | "stamping"
  | "embossing"
  | "uv"
  | "roundCorners"
  | "dieCut"
  | "window"
  | "figuredCut";

/** Переопределения параметров одной спецоперации. */
export interface CoverSpecOpParams {
  /** Стоимость приладки/штампа/клише (₸). */
  setup?: number;
  /** Стоимость за один экземпляр базиса (лист/оттиск/угол/шт). */
  rate?: number;
  /** Ручная итоговая стоимость (если задано — перебивает формулу). */
  manual?: number;
  /** Площадь воздействия операции, см² (для тиснения = площадь клише, расход фольги). */
  areaCm2?: number;
  /** Цена материала (фольги) за м², ₸ — используется для тиснения. */
  materialPricePerM2?: number;
  // ============ ERP-структура (Материал / Работа / Приладка / Оснастка) ============
  /** Цена материала (лак/фольга/и т.п.) ₸/м². */
  materialPrice?: number;
  /** Тариф работы ₸/лист (по умолчанию = rate из catalog). */
  workPricePerSheet?: number;
  /** Стоимость оснастки/формы (₸). */
  tooling?: number;
  /** Считать оснастку (новая форма). По умолчанию true. */
  newTooling?: boolean;
  /** ID лака из справочника `varnish_types` (для spotVarnish). */
  varnishTypeId?: string;
  /** Доля покрытия лаком от площади листа, % (по умолчанию 100). */
  coverageAreaPct?: number;
  /** Коэффициент по тиражу (если перебит вручную). */
  circulationCoef?: number;
}

export interface CoverState {
  // 1. Основные
  kind: CoverKind;
  paper: string;
  density: number;
  thicknessMm: number;
  colorFront: number;
  colorBack: number;
  twoSided: boolean;
  sides: 1 | 2;
  grain: "long" | "short";

  /** Количество страниц обложки (4 — обычная брошюра; 2 — лист-обложка к подложке). */
  pages?: 2 | 4;

  // 3-4. Наследование / переопределение
  override?: boolean;
  localFormat?: string;
  localCirculation?: number;
  localPrintType?: PrintTypeLocal;

  // 5. Печать
  printType: PrintTypeLocal;
  pantone: string;
  formsCount: number;
  makeready: boolean;
  /**
   * Тип оборота (ERP):
   *  - "none"  — без оборота (печать только лицо)
   *  - "self"  — свой оборот (одни и те же формы, 4+4 = 4 формы)
   *  - "other" — чужой оборот (4+4 = 8 форм)
   * Определяется автоматически из цветности и сторон печати.
   */
  turnover: "none" | "self" | "other";
  contractor: string;

  // 6. Ламинация
  lamType: LamType;
  lamSides: 1 | 2;
  /** Тариф припресса плёнкой (₸/м²). Если не задано — берётся дефолт по типу плёнки. */
  laminationRatePerM2?: number;
  /** Стоимость приладки припресса плёнкой (₸). По умолчанию 5000. */
  laminationSetup?: number;

  // 8. Спецоперации
  lamination: boolean;
  uvLak: boolean;
  foil: boolean;
  embossing: boolean;
  bigging: boolean;
  spotVarnish: boolean;
  stamping: boolean;
  uv: boolean;
  roundCorners: boolean;
  dieCut: boolean;
  window: boolean;
  figuredCut: boolean;

  /** Параметры по каждой спецоперации (ERP §9). */
  specOps?: Partial<Record<CoverSpecOpKey, CoverSpecOpParams>>;

  /**
   * Глобальный тумблер «Показать детали расчёта»
   * (тарифы, формулы, поля редактирования по операциям).
   * По умолчанию выключен — менеджер видит только итоги.
   */
  showCalcDetails?: boolean;
}

export const DEFAULT_COVER: CoverState = {
  kind: "thick",
  paper: "Мелованный картон",
  density: 300,
  thicknessMm: 0.32,
  colorFront: 4,
  colorBack: 0,
  twoSided: false,
  sides: 1,
  grain: "long",
  pages: 4,
  override: false,
  printType: "auto",
  pantone: "",
  formsCount: 4,
  makeready: true,
  turnover: "none",
  contractor: "Свои",
  lamType: "none",
  lamSides: 1,
  lamination: false,
  uvLak: false,
  foil: false,
  embossing: false,
  bigging: false,
  spotVarnish: false,
  stamping: false,
  uv: false,
  roundCorners: false,
  dieCut: false,
  window: false,
  figuredCut: false,
  showCalcDetails: false,
};

/**
 * Каталог спецопераций обложки. Каждая операция имеет:
 *  - приладку/штамп/клише (фикс. стоимость),
 *  - тариф за единицу (лист/оттиск/угол/шт),
 *  - базис количества (печатные листы / тираж / тираж×4 угла),
 *  - возможность ручной итоговой стоимости.
 * «Фольга» исключена — это материал, а не операция.
 */
export const COVER_SPEC_OP_CATALOG: Record<CoverSpecOpKey, {
  label: string;
  basis: "printSheets" | "circulation" | "circulationX4";
  unit: string;
  defaultSetup: number;
  defaultRate: number;
  setupLabel: string;
  /** Дефолтная цена материала ₸/м² (0 — у операции нет материала). */
  defaultMaterial: number;
  /** Дефолтная стоимость оснастки/формы ₸ (0 — у операции нет оснастки). */
  defaultTooling: number;
  /** Поддерживает ли операция выбор материала из справочника varnish_types. */
  hasVarnishCatalog?: boolean;
}> = {
  spotVarnish:  { label: "Выборочный лак",   basis: "printSheets",   unit: "лист",   defaultSetup: 3000,  defaultRate: 8,    setupLabel: "Приладка",            defaultMaterial: 450,  defaultTooling: 5000, hasVarnishCatalog: true },
  stamping:     { label: "Тиснение",          basis: "circulation",   unit: "оттиск", defaultSetup: 6000,  defaultRate: 8,    setupLabel: "Приладка",            defaultMaterial: 1800, defaultTooling: 6000 },
  embossing:    { label: "Конгрев",           basis: "circulation",   unit: "оттиск", defaultSetup: 4000,  defaultRate: 12,   setupLabel: "Приладка",            defaultMaterial: 0,    defaultTooling: 4000 },
  uv:           { label: "УФ-лак",            basis: "printSheets",   unit: "лист",   defaultSetup: 2000,  defaultRate: 5,    setupLabel: "Приладка",            defaultMaterial: 380,  defaultTooling: 0 },
  roundCorners: { label: "Скругление углов",  basis: "circulationX4", unit: "угол",   defaultSetup: 1500,  defaultRate: 0.6,  setupLabel: "Приладка",            defaultMaterial: 0,    defaultTooling: 0 },
  dieCut:       { label: "Вырубка",           basis: "circulation",   unit: "шт",     defaultSetup: 3000,  defaultRate: 3,    setupLabel: "Приладка",            defaultMaterial: 0,    defaultTooling: 7800 },
  window:       { label: "Окно",              basis: "circulation",   unit: "шт",     defaultSetup: 1500,  defaultRate: 6,    setupLabel: "Приладка",            defaultMaterial: 0,    defaultTooling: 4000 },
  figuredCut:   { label: "Фигурная высечка",  basis: "circulation",   unit: "шт",     defaultSetup: 4000,  defaultRate: 5,    setupLabel: "Приладка",            defaultMaterial: 0,    defaultTooling: 18300 },
};

export function coverSpecOpQty(
  key: CoverSpecOpKey,
  ctx: { circulation: number; printSheets: number },
): number {
  const basis = COVER_SPEC_OP_CATALOG[key].basis;
  if (basis === "printSheets") return Math.max(0, ctx.printSheets);
  if (basis === "circulationX4") return Math.max(0, ctx.circulation) * 4;
  return Math.max(0, ctx.circulation);
}

export function coverSpecOpTotal(
  key: CoverSpecOpKey,
  params: CoverSpecOpParams | undefined,
  ctx: { circulation: number; printSheets: number; premiumCoef?: number },
): { setup: number; rate: number; qty: number; total: number; manual: boolean } {
  const cat = COVER_SPEC_OP_CATALOG[key];
  const setup = params?.setup ?? cat.defaultSetup;
  const rate = params?.rate ?? cat.defaultRate;
  const qty = coverSpecOpQty(key, ctx);
  const k = ctx.premiumCoef ?? 1;
  const formulaTotal = +(setup + qty * rate * k).toFixed(2);
  if (params?.manual != null && Number.isFinite(params.manual)) {
    return { setup, rate, qty, total: +params.manual.toFixed(2), manual: true };
  }
  return { setup, rate, qty, total: formulaTotal, manual: false };
}

/**
 * Коэффициент по тиражу: до 500 → 1.3, 501–2000 → 1.0, 2001+ → 0.85.
 * Может быть переопределён вручную в `params.circulationCoef`.
 */
export function coverCirculationCoef(circulation: number, override?: number): number {
  if (override != null && Number.isFinite(override) && override > 0) return override;
  if (circulation <= 500) return 1.3;
  if (circulation <= 2000) return 1.0;
  return 0.85;
}

/**
 * ERP-структура себестоимости спецоперации обложки:
 * Итого = Материал + Работа + Приладка + Оснастка.
 * Материал = площадь_покрытия (м²) × цена_материала ₸/м² × k_тираж.
 * Работа   = (печатные_листы + приладочные_листы) × тариф_работы ₸/лист × k_тираж × premium.
 * Приладка = setup_price (фикс).
 * Оснастка = tooling_price (включается, если newTooling=true).
 */
export function coverSpecOpBreakdown(
  key: CoverSpecOpKey,
  params: CoverSpecOpParams | undefined,
  ctx: {
    circulation: number;
    printSheets: number;
    premiumCoef?: number;
    /** Площадь печатного листа, м² (для расчёта расхода материала). */
    sheetAreaM2?: number;
  },
): {
  material: number;
  work: number;
  setup: number;
  tooling: number;
  total: number;
  manual: boolean;
  /** Расход материала, м². */
  materialQtyM2: number;
  /** Кол-во листов работы (печатные + приладочные). */
  workQty: number;
  /** Применённый коэф. тиража. */
  k: number;
  /** Использованный материальный тариф ₸/м². */
  materialPrice: number;
  /** Использованный тариф работы ₸/лист. */
  workPrice: number;
} {
  const cat = COVER_SPEC_OP_CATALOG[key];
  const k = coverCirculationCoef(ctx.circulation, params?.circulationCoef);
  const premium = ctx.premiumCoef ?? 1;

  const materialPrice = params?.materialPrice ?? cat.defaultMaterial;
  const workPrice = params?.workPricePerSheet ?? params?.rate ?? cat.defaultRate;
  const setup = params?.setup ?? cat.defaultSetup;
  const toolingPrice = params?.tooling ?? cat.defaultTooling;
  const useTooling = params?.newTooling !== false; // по умолчанию true

  const sheetAreaM2 = ctx.sheetAreaM2 ?? (720 * 1020) / 1_000_000;
  const coveragePct = params?.coverageAreaPct ?? 100;
  const materialQtyM2 = +((sheetAreaM2 * Math.max(0, ctx.printSheets) * coveragePct) / 100).toFixed(3);

  const workQty = coverSpecOpQty(key, ctx); // = printSheets для лак/УФ, = circulation иначе

  const material = +(materialQtyM2 * materialPrice * k).toFixed(2);
  const work = +(workQty * workPrice * k * premium).toFixed(2);
  const tooling = useTooling ? +toolingPrice.toFixed(2) : 0;

  if (params?.manual != null && Number.isFinite(params.manual)) {
    return {
      material, work, setup, tooling,
      total: +params.manual.toFixed(2),
      manual: true,
      materialQtyM2, workQty, k, materialPrice, workPrice,
    };
  }

  const total = +(material + work + setup + tooling).toFixed(2);
  return {
    material, work, setup, tooling, total,
    manual: false,
    materialQtyM2, workQty, k, materialPrice, workPrice,
  };
}

/** Пресеты материалов обложки — для выпадающего списка «Материал». */
type CoverMaterial = { value: string; density: number; thicknessMm: number };

/**
 * Материалы, сгруппированные по типу обложки.
 * Зависимый справочник: при выборе типа обложки список материалов фильтруется.
 */
const COVER_MATERIALS_BY_KIND: Record<CoverKind, CoverMaterial[]> = {
  soft: [
    { value: "Мелованная бумага 170 г/м²", density: 170, thicknessMm: 0.18 },
    { value: "Мелованная бумага 200 г/м²", density: 200, thicknessMm: 0.22 },
    { value: "Мелованная бумага 250 г/м²", density: 250, thicknessMm: 0.27 },
    { value: "Офсетная бумага 160 г/м²", density: 160, thicknessMm: 0.20 },
  ],
  thick: [
    { value: "Мелованная бумага 300 г/м²", density: 300, thicknessMm: 0.32 },
    { value: "Мелованный картон 300 г/м²", density: 300, thicknessMm: 0.32 },
    { value: "Мелованный картон 350 г/м²", density: 350, thicknessMm: 0.38 },
    { value: "Картон хром-эрзац 280 г/м²", density: 280, thicknessMm: 0.40 },
  ],
  plastic: [
    { value: "Пластик ПВХ 0.3 мм", density: 420, thicknessMm: 0.3 },
    { value: "Пластик ПВХ 0.5 мм", density: 700, thicknessMm: 0.5 },
    { value: "Пластик ПВХ 0.7 мм", density: 980, thicknessMm: 0.7 },
    { value: "Полипропилен 0.5 мм", density: 460, thicknessMm: 0.5 },
  ],
  designer: [
    { value: "Дизайнерская бумага 250 г/м²", density: 250, thicknessMm: 0.30 },
    { value: "Дизайнерская бумага 300 г/м²", density: 300, thicknessMm: 0.34 },
    { value: "Дизайнерская бумага 350 г/м²", density: 350, thicknessMm: 0.40 },
    { value: "Touche Cover 320 г/м²", density: 320, thicknessMm: 0.42 },
  ],
  kraft: [
    { value: "Крафт 170 г/м²", density: 170, thicknessMm: 0.22 },
    { value: "Крафт 250 г/м²", density: 250, thicknessMm: 0.30 },
    { value: "Крафт 300 г/м²", density: 300, thicknessMm: 0.36 },
    { value: "Крафт-картон 400 г/м²", density: 400, thicknessMm: 0.50 },
  ],
  laminated: [
    { value: "Мелованная бумага 250 г/м² + ламинация", density: 250, thicknessMm: 0.29 },
    { value: "Мелованная бумага 300 г/м² + ламинация", density: 300, thicknessMm: 0.34 },
    { value: "Мелованный картон 300 г/м² + ламинация", density: 300, thicknessMm: 0.34 },
  ],
  cashed: [
    { value: "Переплётный картон 1.5 мм + мелованная 130 г/м²", density: 1080, thicknessMm: 1.65 },
    { value: "Переплётный картон 2.0 мм + мелованная 130 г/м²", density: 1380, thicknessMm: 2.15 },
    { value: "Переплётный картон 2.0 мм + дизайнерская 150 г/м²", density: 1400, thicknessMm: 2.18 },
  ],
  hard: [
    { value: "Переплётный картон 1.5 мм", density: 950, thicknessMm: 1.5 },
    { value: "Переплётный картон 2.0 мм", density: 1250, thicknessMm: 2.0 },
    { value: "Переплётный картон 2.5 мм", density: 1550, thicknessMm: 2.5 },
    { value: "Переплётный картон 3.0 мм", density: 1850, thicknessMm: 3.0 },
  ],
  composite: [
    { value: "Переплётный картон 2.0 мм + крафт корешок", density: 1280, thicknessMm: 2.1 },
    { value: "Переплётный картон 2.0 мм + балакрон корешок", density: 1320, thicknessMm: 2.15 },
    { value: "Переплётный картон 1.5 мм + ткань корешок", density: 1020, thicknessMm: 1.6 },
  ],
};

export interface CoverSectionProps {
  value: CoverState;
  onChange: (next: CoverState) => void;
  title?: string;
}

export default function CoverSection({ value, onChange, title = "Обложка" }: CoverSectionProps) {
  // Защита от старых сохранённых состояний без новых полей.
  const v: CoverState = { ...DEFAULT_COVER, ...value };
  const patch = (p: Partial<CoverState>) => onChange({ ...v, ...p });
  // §13 — автоматическое определение типа оборота и количества форм по ERP.
  // Правило: если печать односторонняя → "без оборота".
  // Если двусторонняя и цветность лица == цветности оборота → "свой оборот"
  // (одни и те же формы используются для обеих сторон, кол-во форм = colorFront).
  // Если двусторонняя и цветности разные → "чужой оборот"
  // (отдельные формы для лица и оборота, кол-во форм = colorFront + colorBack).
  const autoTurnover: "none" | "self" | "other" = !v.twoSided
    ? "none"
    : (v.colorFront || 0) === (v.colorBack || 0)
      ? "self"
      : "other";
  const autoForms =
    autoTurnover === "none"
      ? (v.colorFront || 0)
      : autoTurnover === "self"
        ? (v.colorFront || 0)
        : (v.colorFront || 0) + (v.colorBack || 0);
  React.useEffect(() => {
    const next: Partial<CoverState> = {};
    if (autoForms !== v.formsCount) next.formsCount = autoForms;
    if (autoTurnover !== v.turnover) next.turnover = autoTurnover;
    if (Object.keys(next).length) patch(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoForms, autoTurnover]);
  const ctx = useMultipageCalcOptional();
  const g = ctx?.global;
  const isOverride = !!v.override;
  const locked = !isOverride;

  // §10-§11: предупреждения и тех. отчёт через единый ERP-движок обложки.
  const itemW = g?.formatWidth ?? 0;
  const itemH = g?.formatHeight ?? 0;
  const ctxCalc = {
    itemW: itemW || 210,
    itemH: itemH || 297,
    circulation: g?.circulation ?? 0,
    printType: g?.printType,
  };
  const warnings = buildCoverWarnings(v, ctxCalc);
  const report = buildCoverReport(v, ctxCalc);
  const route = buildCoverRoute(v, ctxCalc);
  const circulation = report.circulation;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="ml-1 text-[10px]">{COVER_KIND_LABELS[v.kind]}</Badge>
          {isOverride && (
            <Badge variant="outline" className="ml-1 text-[10px]">Переопределено</Badge>
          )}
          <SectionHelp
            title="Обложка"
            what="Параметры обложки: тип (мягкая/твёрдая/пластик/...), материал, плотность, цветность, толщина и постпечатные операции (ламинация, тиснение, фольга, конгрев и пр.)."
            simple="Достаточно выбрать тип и материал — остальное считается автоматически."
            advanced="Можно переопределить формат/тираж/печать отдельно от основных параметров и добавить отделку."
            tech="Виден ERP-отчёт обложки: спуск, формы, приладка, отходы, предупреждения по технологии."
            learnMore="cover"
          />
        </CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Переопределить параметры обложки
          <Switch checked={isOverride} onCheckedChange={(v) => patch({ override: !!v })} />
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3. Наследование */}
        {locked && g && (g.format || g.circulation || g.printType) && (
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Наследовано из основных параметров:</span>{" "}
            {[
              g.format ? `формат ${g.format}` : null,
              g.circulation ? `тираж ${g.circulation.toLocaleString("ru-RU")}` : null,
              g.printType ? `печать ${g.printType}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}

        {/* 1-2. Тип и основные параметры */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Тип обложки</Label>
            <Select value={v.kind} onValueChange={(val) => patch({ kind: val as CoverKind })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(COVER_KIND_LABELS) as CoverKind[]).map((k) => (
                  <SelectItem key={k} value={k}>{COVER_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Материал</Label>
            {(() => {
              const list = COVER_MATERIALS_BY_KIND[v.kind] ?? [];
              const inList = list.some((m) => m.value === v.paper);
              return (
                <Select
                  value={inList ? v.paper : "__custom__"}
                  onValueChange={(val) => {
                    if (val === "__custom__") return;
                    const m = list.find((x) => x.value === val);
                    if (m) patch({ paper: m.value, density: m.density, thicknessMm: m.thicknessMm });
                  }}
                >
                  <SelectTrigger className="h-8"><SelectValue placeholder="Выберите материал" /></SelectTrigger>
                  <SelectContent>
                    {list.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.value}</SelectItem>
                    ))}
                    {!inList && v.paper && (
                      <SelectItem value="__custom__">{v.paper} (свой)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              );
            })()}
            <p className="text-[10px] text-muted-foreground">
              Список материалов зависит от типа обложки.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Плотность, г/м²</Label>
            <Input type="number" value={v.density} onChange={(e) => patch({ density: Number(e.target.value) || 0 })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Толщина, мм</Label>
            <Input type="number" step={0.01} value={v.thicknessMm} onChange={(e) => patch({ thicknessMm: Number(e.target.value) || 0 })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Цветность лицо</Label>
            <Input type="number" value={v.colorFront} onChange={(e) => patch({ colorFront: Number(e.target.value) || 0 })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Цветность оборот</Label>
            <Input type="number" value={v.colorBack} disabled={!v.twoSided} onChange={(e) => patch({ colorBack: Number(e.target.value) || 0 })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Сторон печати</Label>
            <Select value={String(v.sides)} onValueChange={(val) => {
              const n = +val as 1 | 2;
              patch({
                sides: n,
                twoSided: n === 2,
                colorBack: n === 2 ? (v.colorBack && v.colorBack > 0 ? v.colorBack : 4) : 0,
              });
            }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (только лицо)</SelectItem>
                <SelectItem value="2">2 (лицо + оборот)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ориентация волокна</Label>
            <Select value={v.grain} onValueChange={(val) => patch({ grain: val as "long" | "short" })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Долевое</SelectItem>
                <SelectItem value="short">Поперечное</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Кол-во страниц обложки</Label>
            <Select value={String(v.pages ?? 4)} onValueChange={(val) => patch({ pages: (+val as 2 | 4) })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 (стандарт)</SelectItem>
                <SelectItem value="2">2 (лист-обложка к подложке)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 4. Локальные параметры при override */}
        {isOverride && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 rounded-md border bg-muted/20 p-2">
            <div className="space-y-1">
              <Label className="text-xs">Формат обложки</Label>
              <Input value={v.localFormat ?? ""} placeholder={g?.format ?? "A4"} onChange={(e) => patch({ localFormat: e.target.value })} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Тираж обложки</Label>
              <Input type="number" value={v.localCirculation ?? 0} placeholder={String(g?.circulation ?? 0)} onChange={(e) => patch({ localCirculation: Number(e.target.value) || 0 })} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Тип печати</Label>
              <Select value={v.localPrintType ?? v.printType} onValueChange={(val) => patch({ localPrintType: val as PrintTypeLocal, printType: val as PrintTypeLocal })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто</SelectItem>
                  <SelectItem value="offset">Офсет</SelectItem>
                  <SelectItem value="digital">Цифровая</SelectItem>
                  <SelectItem value="uv">UV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Separator />

        {/* 5. Печать обложки */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">Печать обложки</div>
          {(() => {
            const machineLabel =
              report.printType === "offset"
                ? `Офсетная машина (Heidelberg SM-74, ${report.sheetW}×${report.sheetH} мм)`
                : report.printType === "uv"
                  ? `UV-машина (Komori, ${report.sheetW}×${report.sheetH} мм)`
                  : `Цифровая машина (Ricoh Pro, ${report.sheetW}×${report.sheetH} мм)`;
            return (
              <div className="grid gap-2 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Формат печатного листа: </span>
                  <b className="text-foreground">{report.sheetW} × {report.sheetH} мм</b>
                </div>
                <div>
                  <span className="text-muted-foreground">Выбрана печатная машина: </span>
                  <b className="text-foreground">{machineLabel}</b>
                </div>
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Тип печати</Label>
              <Select value={v.printType} onValueChange={(val) => patch({ printType: val as PrintTypeLocal })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто</SelectItem>
                  <SelectItem value="offset">Офсет</SelectItem>
                  <SelectItem value="digital">Цифровая</SelectItem>
                  <SelectItem value="uv">UV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pantone</Label>
              <Input value={v.pantone} placeholder="напр. 485 C" onChange={(e) => patch({ pantone: e.target.value })} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Кол-во форм</Label>
              <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                {autoForms}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Авто по ERP: {autoTurnover === "none"
                  ? `${v.colorFront}+0 (без оборота)`
                  : autoTurnover === "self"
                    ? `${v.colorFront}+${v.colorBack} (свой оборот)`
                    : `${v.colorFront}+${v.colorBack} (чужой оборот)`}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Оборот</Label>
              <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                {v.turnover === "none"
                  ? "Без оборота"
                  : v.turnover === "self"
                    ? "Свой оборот"
                    : "Чужой оборот"}
              </div>
              <p className="text-[10px] text-muted-foreground">Определяется автоматически</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Подрядчик</Label>
              <Input value={v.contractor} onChange={(e) => patch({ contractor: e.target.value })} className="h-8" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-xs sm:col-span-2">
              <Checkbox checked={v.makeready} onCheckedChange={(c) => patch({ makeready: !!c })} />
              Приладка (включить в маршрут)
            </label>
          </div>
        </div>

        <Separator />

        {/* 8. Спецоперации */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">Спецоперации обложки</div>
          <p className="text-[11px] text-muted-foreground">
            Каждая операция = собственные параметры (приладка, тариф, кол-во) и формула. «Фольга» исключена — это материал, формируется в материалах обложки.
          </p>
          <div className="space-y-2">
            {/* Припресс плёнкой — спецоперация (вкл/выкл + параметры) */}
            {(() => {
              const defaultRate =
                v.lamType === "soft_touch" ? 380 :
                v.lamType === "anti_scratch" ? 320 :
                v.lamType === "gloss" ? 220 : 220;
              const rate = v.laminationRatePerM2 ?? defaultRate;
              const setup = v.laminationSetup ?? 5000;
              const sheetW = report.sheetW ?? 720;
              const sheetH = report.sheetH ?? 1020;
              const areaM2 = +((sheetW * sheetH) / 1_000_000 * report.printSheets * v.lamSides).toFixed(3);
              const total = +(setup + areaM2 * rate).toFixed(2);
              const enabled = v.lamination && v.lamType !== "none";
              return (
                <div className="rounded-md border bg-card/40">
                  <label className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(c) => patch({
                          lamination: !!c,
                          lamType: c ? (v.lamType === "none" ? "matte" : v.lamType) : "none",
                        })}
                      />
                      <span className="text-xs">Припресс плёнкой</span>
                    </span>
                    {enabled && (
                      <span className="text-[11px] text-muted-foreground">
                        Итого: <b className="text-foreground">{total.toLocaleString("ru-RU")} ₸</b>
                      </span>
                    )}
                  </label>
                  {enabled && (
                    <div className="border-t bg-muted/20 p-2">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Тип плёнки</Label>
                          <Select value={v.lamType} onValueChange={(val) => patch({ lamType: val as LamType, lamination: val !== "none" })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(LAM_LABELS) as LamType[]).filter(k => k !== "none").map((k) => (
                                <SelectItem key={k} value={k}>{LAM_LABELS[k]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Сторон ламинации</Label>
                          <Select value={String(v.lamSides)} onValueChange={(val) => patch({ lamSides: +val as 1 | 2 })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 сторона</SelectItem>
                              <SelectItem value="2">2 стороны</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Приладка, ₸</Label>
                          <Input
                            type="number" min={0}
                            value={setup}
                            onChange={(e) => patch({ laminationSetup: Number(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Цена плёнки, ₸/м²</Label>
                          <Input
                            type="number" min={0} step="0.1"
                            value={rate}
                            onChange={(e) => patch({ laminationRatePerM2: Number(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">Дефолт по типу: {defaultRate}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Печатный лист, мм</Label>
                          <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                            {sheetW} × {sheetH}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Печатных листов</Label>
                          <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                            {report.printSheets.toLocaleString("ru-RU")}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Расход плёнки, м²</Label>
                          <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                            {areaM2.toLocaleString("ru-RU")}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Итого, ₸</Label>
                          <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs font-semibold">
                            {total.toLocaleString("ru-RU")}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Формула: <code>приладка + (ширина × высота печатного листа / 1 000 000) × кол-во печатных листов × сторон × тариф</code>
                        {" = "}
                        <b className="text-foreground">
                          {setup.toLocaleString("ru-RU")} + ({sheetW}×{sheetH}/1000000) × {report.printSheets} × {v.lamSides} × {rate} = {total.toLocaleString("ru-RU")} ₸
                        </b>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Биговка — спецоперация (вкл/выкл) */}
            <div className="rounded-md border bg-card/40">
              <label className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-sm">
                <span className="flex items-center gap-2">
                  <Checkbox checked={v.bigging} onCheckedChange={(c) => patch({ bigging: !!c })} />
                  <span className="text-xs">Биговка</span>
                </span>
              </label>
              {v.bigging && (
                <div className="border-t bg-muted/20 p-2 text-[11px] text-muted-foreground">
                  Формула: <code>тираж × 2 биг × тариф (по умолчанию 1.5 ₸/биг)</code>
                </div>
              )}
            </div>

            {(Object.keys(COVER_SPEC_OP_CATALOG) as CoverSpecOpKey[]).map((key) => {
              const cat = COVER_SPEC_OP_CATALOG[key];
              const enabled = !!(v as any)[key];
              const params = v.specOps?.[key] ?? {};
              const calc = coverSpecOpTotal(key, params, {
                circulation: report.circulation,
                printSheets: report.printSheets,
                premiumCoef: report.premiumCoef,
              });
              const patchOp = (p: Partial<CoverSpecOpParams>) => {
                const next: CoverState["specOps"] = { ...(v.specOps ?? {}) };
                next[key] = { ...(next[key] ?? {}), ...p };
                patch({ specOps: next });
              };
              return (
                <div key={key} className="rounded-md border bg-card/40">
                  <label className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(c) => patch({ [key]: !!c } as Partial<CoverState>)}
                      />
                      <span className="text-xs">{cat.label}</span>
                    </span>
                    {enabled && (
                      <span className="text-[11px] text-muted-foreground">
                        Итого: <b className="text-foreground">{calc.total.toLocaleString("ru-RU")} ₸</b>
                      </span>
                    )}
                  </label>
                  {enabled && (
                    <div className="border-t bg-muted/20 p-2">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[10px]">{cat.setupLabel}, ₸</Label>
                          <Input
                            type="number"
                            value={params.setup ?? cat.defaultSetup}
                            onChange={(e) => patchOp({ setup: Number(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Тариф, ₸/{cat.unit}</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={params.rate ?? cat.defaultRate}
                            onChange={(e) => patchOp({ rate: Number(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Кол-во ({cat.unit})</Label>
                          <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                            {calc.qty.toLocaleString("ru-RU")}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.basis === "printSheets" ? "= печатные листы" :
                             cat.basis === "circulationX4" ? "= тираж × 4" : "= тираж"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Ручная стоимость, ₸</Label>
                          <Input
                            type="number"
                            placeholder="—"
                            value={params.manual ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : Number(e.target.value);
                              patchOp({ manual: val });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Формула: <code>приладка + кол-во × тариф{report.premiumCoef !== 1 ? " × премиум-коэф." : ""}</code>
                        {" = "}
                        <b className="text-foreground">
                          {calc.setup.toLocaleString("ru-RU")} + {calc.qty.toLocaleString("ru-RU")} × {calc.rate}
                          {report.premiumCoef !== 1 ? ` × ${report.premiumCoef.toFixed(2)}` : ""} = {(+(calc.setup + calc.qty * calc.rate * (report.premiumCoef ?? 1)).toFixed(2)).toLocaleString("ru-RU")} ₸
                        </b>
                        {calc.manual && (
                          <span className="ml-1 text-amber-600">(переопределено вручную: {calc.total.toLocaleString("ru-RU")} ₸)</span>
                        )}
                      </div>
                      {key === "stamping" && (() => {
                        const areaCm2 = params.areaCm2 ?? 20;
                        const foilRate = params.materialPricePerM2 ?? 1800;
                        const foilM2 = +((areaCm2 / 10000) * report.circulation).toFixed(3);
                        const foilTotal = +(foilM2 * foilRate).toFixed(2);
                        return (
                          <div className="mt-2 rounded-md border border-dashed bg-card/40 p-2">
                            <div className="mb-1 text-[11px] font-semibold text-foreground">
                              Материал: фольга (авто по площади тиснения)
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Площадь тиснения, см²</Label>
                                <Input
                                  type="number" min={0} step="0.1"
                                  value={areaCm2}
                                  onChange={(e) => patchOp({ areaCm2: Number(e.target.value) || 0 })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Цена фольги, ₸/м²</Label>
                                <Input
                                  type="number" min={0}
                                  value={foilRate}
                                  onChange={(e) => patchOp({ materialPricePerM2: Number(e.target.value) || 0 })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Расход, м²</Label>
                                <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
                                  {foilM2}
                                </div>
                                <p className="text-[10px] text-muted-foreground">= площадь/10000 × тираж</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Стоимость фольги, ₸</Label>
                                <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs font-semibold">
                                  {foilTotal.toLocaleString("ru-RU")}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 10. Технологические предупреждения */}
        {warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* 11. Тех. отчёт */}
        {circulation > 0 && (
          <div className="space-y-2 rounded-md border bg-muted/20 p-2 text-[11px] text-muted-foreground">
            <div className="text-xs font-semibold text-foreground">Тех. отчёт по обложке</div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              <div>Формат печати: <b>{report.spreadW}×{report.spreadH} мм</b></div>
              <div>Изделий на листе: <b>{report.upPerSheet}</b></div>
              <div>Закупочных листов: <b>{report.purchaseSheets}</b></div>
              <div>Печатных листов: <b>{report.printSheets}</b></div>
              <div>Форм: <b>{report.formsCount}</b></div>
              <div>Отходы: <b>{report.wasteSheets}</b></div>
              <div>Премиум-коэф.: <b>×{report.premiumCoef.toFixed(2)}</b></div>
              <div>+ к сроку: <b>{report.extraLeadDays} дн.</b></div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-foreground">Маршрут обложки</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                {route.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}