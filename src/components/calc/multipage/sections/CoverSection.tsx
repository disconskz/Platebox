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
  printSide: "front" | "back" | "both";
  contractor: string;

  // 6. Ламинация
  lamType: LamType;
  lamSides: 1 | 2;

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
  printSide: "front",
  contractor: "Свои",
  lamType: "matte",
  lamSides: 1,
  lamination: true,
  uvLak: false,
  foil: false,
  embossing: false,
  bigging: true,
  spotVarnish: false,
  stamping: false,
  uv: false,
  roundCorners: false,
  dieCut: false,
  window: false,
  figuredCut: false,
};

const SPEC_OPS: { key: keyof CoverState; label: string }[] = [
  { key: "spotVarnish", label: "Выборочный лак" },
  { key: "stamping", label: "Тиснение" },
  { key: "embossing", label: "Конгрев" },
  { key: "foil", label: "Фольга" },
  { key: "uv", label: "УФ-лак" },
  { key: "roundCorners", label: "Скругление углов" },
  { key: "dieCut", label: "Вырубка" },
  { key: "window", label: "Окно" },
  { key: "figuredCut", label: "Фигурная высечка" },
];

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
            <Select value={String(v.sides)} onValueChange={(val) => patch({ sides: (+val as 1 | 2), twoSided: +val === 2 })}>
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
              <Input type="number" value={v.formsCount} onChange={(e) => patch({ formsCount: Number(e.target.value) || 0 })} className="h-8" />
              <p className="text-[10px] text-muted-foreground">Авто: {(v.colorFront || 0) + (v.twoSided ? (v.colorBack || 0) : 0)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Сторона печати</Label>
              <Select value={v.printSide} onValueChange={(val) => patch({ printSide: val as "front" | "back" | "both" })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Только лицо</SelectItem>
                  <SelectItem value="back">Только оборот</SelectItem>
                  <SelectItem value="both">Лицо + оборот</SelectItem>
                </SelectContent>
              </Select>
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

        {/* 6. Ламинация */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">Ламинация обложки</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Тип ламинации</Label>
              <Select value={v.lamType} onValueChange={(val) => patch({ lamType: val as LamType, lamination: val !== "none" })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LAM_LABELS) as LamType[]).map((k) => (
                    <SelectItem key={k} value={k}>{LAM_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Сторона ламинации</Label>
              <Select value={String(v.lamSides)} onValueChange={(val) => patch({ lamSides: +val as 1 | 2 })}>
                <SelectTrigger className="h-8" disabled={v.lamType === "none"}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 сторона</SelectItem>
                  <SelectItem value="2">2 стороны</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-xs">
              <Checkbox checked={v.bigging} onCheckedChange={(c) => patch({ bigging: !!c })} />
              Биговка
            </label>
          </div>
        </div>

        <Separator />

        {/* 8. Спецоперации */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">Спецоперации обложки</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPEC_OPS.map((it) => (
              <label
                key={it.key}
                htmlFor={`cv-${it.key}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  id={`cv-${it.key}`}
                  checked={!!(v as any)[it.key]}
                  onCheckedChange={(c) => patch({ [it.key]: !!c } as Partial<CoverState>)}
                />
                <Label htmlFor={`cv-${it.key}`} className="cursor-pointer text-xs font-normal">
                  {it.label}
                </Label>
              </label>
            ))}
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