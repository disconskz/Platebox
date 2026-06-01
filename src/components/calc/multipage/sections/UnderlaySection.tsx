import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Layers3 } from "lucide-react";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";

/**
 * Подложка (раздел 13 ТЗ). Опциональная — включается переключателем.
 * Применяется в блокнотах, планингах, ежедневниках, отрывных календарях.
 */

export interface UnderlayState {
  enabled: boolean;
  paper: string;
  density: number;
  colorFront: number;
  colorBack: number;
  cutting: boolean;
  drilling: boolean;
  caching: boolean;
  /** Переопределить параметры блока вручную. По умолчанию false → блок наследует общие параметры. */
  override?: boolean;
}

export const DEFAULT_UNDERLAY: UnderlayState = {
  enabled: false,
  paper: "Хром-эрзац",
  density: 250,
  colorFront: 4,
  colorBack: 0,
  cutting: true,
  drilling: false,
  caching: false,
  override: false,
};

const OPS: { key: keyof UnderlayState; label: string }[] = [
  { key: "cutting", label: "Резка" },
  { key: "drilling", label: "Сверление" },
  { key: "caching", label: "Кашировка" },
];

export interface UnderlaySectionProps {
  value: UnderlayState;
  onChange: (next: UnderlayState) => void;
  title?: string;
}

export default function UnderlaySection({ value, onChange, title = "Подложка" }: UnderlaySectionProps) {
  const patch = (p: Partial<UnderlayState>) => onChange({ ...value, ...p });
  const ctx = useMultipageCalcOptional();
  const g = ctx?.global;
  const isOverride = !!value.override;
  const locked = !isOverride;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers3 className="h-4 w-4" />
          {title}
          {value.enabled && isOverride && (
            <Badge variant="outline" className="ml-1 text-[10px]">Переопределено</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-4">
          {value.enabled && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Переопределить
              <Switch checked={isOverride} onCheckedChange={(v) => patch({ override: !!v })} />
            </label>
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {value.enabled ? "Включена" : "Выключена"}
            <Switch checked={value.enabled} onCheckedChange={(v) => patch({ enabled: !!v })} />
          </label>
        </div>
      </CardHeader>
      {value.enabled && (
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
            {OPS.map((it) => (
              <label
                key={it.key}
                htmlFor={`ul-${it.key}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  id={`ul-${it.key}`}
                  checked={!!value[it.key]}
                  onCheckedChange={(v) => patch({ [it.key]: !!v } as Partial<UnderlayState>)}
                />
                <Label htmlFor={`ul-${it.key}`} className="cursor-pointer text-xs font-normal">
                  {it.label}
                </Label>
              </label>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}