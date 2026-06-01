import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";

/**
 * Обложка (раздел 13–14 ТЗ). Идёт сразу после «Основных параметров»,
 * так как задаёт внешний вид изделия, премиальность, технологию и маршрут.
 */

export interface CoverState {
  paper: string;
  density: number;
  colorFront: number;
  colorBack: number;
  lamination: boolean;
  uvLak: boolean;
  foil: boolean;
  embossing: boolean;
  bigging: boolean;
  /** Переопределить параметры блока вручную. По умолчанию false → блок наследует общие параметры. */
  override?: boolean;
}

export const DEFAULT_COVER: CoverState = {
  paper: "Мелованный картон",
  density: 300,
  colorFront: 4,
  colorBack: 0,
  lamination: true,
  uvLak: false,
  foil: false,
  embossing: false,
  bigging: true,
  override: false,
};

const FINISHES: { key: keyof CoverState; label: string }[] = [
  { key: "lamination", label: "Ламинация" },
  { key: "uvLak", label: "УФ-лак" },
  { key: "foil", label: "Тиснение фольгой" },
  { key: "embossing", label: "Конгрев" },
  { key: "bigging", label: "Биговка" },
];

export interface CoverSectionProps {
  value: CoverState;
  onChange: (next: CoverState) => void;
  title?: string;
}

export default function CoverSection({ value, onChange, title = "Обложка" }: CoverSectionProps) {
  const patch = (p: Partial<CoverState>) => onChange({ ...value, ...p });
  const ctx = useMultipageCalcOptional();
  const g = ctx?.global;
  const isOverride = !!value.override;
  const locked = !isOverride;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          {title}
          {isOverride && (
            <Badge variant="outline" className="ml-1 text-[10px]">Переопределено</Badge>
          )}
        </CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Переопределить параметры блока
          <Switch checked={isOverride} onCheckedChange={(v) => patch({ override: !!v })} />
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Бумага</Label>
            <Input value={value.paper} disabled={locked} onChange={(e) => patch({ paper: e.target.value })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Плотность, г/м²</Label>
            <Input
              type="number"
              value={value.density}
              disabled={locked}
              onChange={(e) => patch({ density: Number(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Цветность лицо</Label>
            <Input
              type="number"
              value={value.colorFront}
              disabled={locked}
              onChange={(e) => patch({ colorFront: Number(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Цветность оборот</Label>
            <Input
              type="number"
              value={value.colorBack}
              disabled={locked}
              onChange={(e) => patch({ colorBack: Number(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FINISHES.map((it) => (
            <label
              key={it.key}
              htmlFor={`cv-${it.key}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
            >
              <Checkbox
                id={`cv-${it.key}`}
                checked={!!value[it.key]}
                onCheckedChange={(v) => patch({ [it.key]: !!v } as Partial<CoverState>)}
              />
              <Label htmlFor={`cv-${it.key}`} className="cursor-pointer text-xs font-normal">
                {it.label}
              </Label>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}