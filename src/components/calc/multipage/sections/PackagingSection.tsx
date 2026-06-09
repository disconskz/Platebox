import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { SectionHelp } from "../SectionHelp";

/** Упаковка (раздел 21 ТЗ). */

export interface PackagingState {
  bundles: boolean;
  boxes: boolean;
  shrink: boolean;
  pallets: boolean;
  marking: boolean;
  stickers: boolean;
  unitsPerBundle: number;
  bundlesPerBox: number;
}

export const DEFAULT_PACKAGING: PackagingState = {
  bundles: true,
  boxes: true,
  shrink: false,
  pallets: false,
  marking: true,
  stickers: false,
  unitsPerBundle: 50,
  bundlesPerBox: 10,
};

const OPTIONS: { key: keyof PackagingState; label: string }[] = [
  { key: "bundles", label: "Пачки" },
  { key: "boxes", label: "Коробки" },
  { key: "shrink", label: "Термоусадка" },
  { key: "pallets", label: "Паллетирование" },
  { key: "marking", label: "Маркировка" },
  { key: "stickers", label: "Стикеры" },
];

export interface PackagingSectionProps {
  value: PackagingState;
  onChange: (next: PackagingState) => void;
  title?: string;
}

export default function PackagingSection({ value, onChange, title = "Упаковка" }: PackagingSectionProps) {
  const patch = (p: Partial<PackagingState>) => onChange({ ...value, ...p });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4" />
          {title}
          <SectionHelp
            title="Упаковка"
            what="Финальная упаковка тиража: пачки, коробки, термоусадка, паллеты, маркировка и стикеры. Влияет на количество пачек/коробок и стоимость материалов упаковки."
            simple="По умолчанию выбраны пачки + коробки. Меняйте только при особых требованиях."
            advanced="Можно настроить вместимость пачек и коробок, добавить паллетирование/маркировку."
            tech="Каждый тип упаковки даёт строку с расчётом штук/пачек/коробок."
            learnMore="packaging"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {OPTIONS.map((it) => (
            <label
              key={it.key}
              htmlFor={`pk-${it.key}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
            >
              <Checkbox
                id={`pk-${it.key}`}
                checked={Boolean(value[it.key])}
                onCheckedChange={(v) => patch({ [it.key]: !!v } as Partial<PackagingState>)}
              />
              <Label htmlFor={`pk-${it.key}`} className="cursor-pointer text-xs font-normal">
                {it.label}
              </Label>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Изделий в пачке</Label>
            <Input
              type="number"
              min={1}
              value={value.unitsPerBundle}
              onChange={(e) => patch({ unitsPerBundle: Math.max(1, Number(e.target.value) || 1) })}
              disabled={!value.bundles}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Пачек в коробке</Label>
            <Input
              type="number"
              min={1}
              value={value.bundlesPerBox}
              onChange={(e) => patch({ bundlesPerBox: Math.max(1, Number(e.target.value) || 1) })}
              disabled={!value.boxes}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}