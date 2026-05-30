import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Layers3 } from "lucide-react";

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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers3 className="h-4 w-4" />
          {title}
        </CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {value.enabled ? "Включена" : "Выключена"}
          <Switch checked={value.enabled} onCheckedChange={(v) => patch({ enabled: !!v })} />
        </label>
      </CardHeader>
      {value.enabled && (
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