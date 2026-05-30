import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Wrench } from "lucide-react";

/**
 * Сборка (раздел 18 ТЗ). Идёт ПОСЛЕ постпечатки, не раньше.
 * Подборка, КБС, навивка, скоба, ригель, установка пружины/магнитов/ложемента
 * и финальная сборка изделия.
 */

export interface AssemblyState {
  collation: boolean;
  kbs: boolean;
  spiral: boolean;
  staple: boolean;
  rigel: boolean;
  spring: boolean;
  magnets: boolean;
  cradle: boolean;
  finalAssembly: boolean;
}

export const DEFAULT_ASSEMBLY: AssemblyState = {
  collation: true,
  kbs: false,
  spiral: false,
  staple: false,
  rigel: false,
  spring: false,
  magnets: false,
  cradle: false,
  finalAssembly: true,
};

const ITEMS: { key: keyof AssemblyState; label: string }[] = [
  { key: "collation", label: "Подборка" },
  { key: "kbs", label: "КБС" },
  { key: "spiral", label: "Навивка" },
  { key: "staple", label: "Скоба" },
  { key: "rigel", label: "Ригель" },
  { key: "spring", label: "Установка пружины" },
  { key: "magnets", label: "Установка магнитов" },
  { key: "cradle", label: "Установка ложемента" },
  { key: "finalAssembly", label: "Финальная сборка" },
];

export interface AssemblySectionProps {
  value: AssemblyState;
  onChange: (next: AssemblyState) => void;
  title?: string;
}

export default function AssemblySection({ value, onChange, title = "Сборка" }: AssemblySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <label
            key={it.key}
            htmlFor={`as-${it.key}`}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
          >
            <Checkbox
              id={`as-${it.key}`}
              checked={value[it.key]}
              onCheckedChange={(v) => onChange({ ...value, [it.key]: !!v })}
            />
            <Label htmlFor={`as-${it.key}`} className="cursor-pointer text-xs font-normal">
              {it.label}
            </Label>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}