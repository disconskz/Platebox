import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Бумага</Label>
            <Input value={value.paper} onChange={(e) => patch({ paper: e.target.value })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Плотность, г/м²</Label>
            <Input
              type="number"
              value={value.density}
              onChange={(e) => patch({ density: Number(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Цветность лицо</Label>
            <Input
              type="number"
              value={value.colorFront}
              onChange={(e) => patch({ colorFront: Number(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Цветность оборот</Label>
            <Input
              type="number"
              value={value.colorBack}
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