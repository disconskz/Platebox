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

  // 10. Технологические предупреждения
  const warnings: string[] = [];
  if ((v.lamType !== "none" || v.lamination) && !v.bigging && v.density >= 200) {
    warnings.push("Ламинация без биговки — риск трещин. Рекомендуется биговка.");
  }
  if (v.density < 170 && (v.kind === "hard" || v.kind === "thick")) {
    warnings.push("Плотность слишком маленькая для выбранного типа обложки.");
  }
  if (v.stamping && v.lamType === "soft_touch") {
    warnings.push("Soft-touch плохо подходит под тиснение — возможен брак.");
  }
  if (v.figuredCut && v.density < 200) {
    warnings.push("Для фигурной высечки рекомендуется плотность ≥ 200 г/м².");
  }

  // Тех. отчёт (примитивная оценка)
  const circulation = v.override && v.localCirculation ? v.localCirculation : (g?.circulation ?? 0);
  const formsAuto = (v.colorFront || 0) + (v.twoSided ? (v.colorBack || 0) : 0);
  const purchaseSheets = Math.ceil(circulation * 1.05);
  const printSheets = circulation + (v.makeready ? 150 : 0);
  const waste = Math.max(0, printSheets - circulation);

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
            <Input value={v.paper} onChange={(e) => patch({ paper: e.target.value })} className="h-8" />
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
              <p className="text-[10px] text-muted-foreground">Авто: {formsAuto}</p>
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
          <div className="rounded-md border bg-muted/20 p-2 text-[11px] text-muted-foreground">
            <div className="mb-1 text-xs font-semibold text-foreground">Тех. отчёт по обложке</div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              <div>Закупочных листов: <b>{purchaseSheets}</b></div>
              <div>Печатных листов: <b>{printSheets}</b></div>
              <div>Форм: <b>{v.formsCount || formsAuto}</b></div>
              <div>Отходы: <b>{waste}</b></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}