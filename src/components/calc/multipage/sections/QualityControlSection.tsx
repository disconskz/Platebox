import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

/** Контроль качества (раздел 20 ТЗ). */

export interface QcState {
  color: boolean;
  assembly: boolean;
  quantity: boolean;
  personalization: boolean;
  defects: boolean;
  packaging: boolean;
}

export const DEFAULT_QC: QcState = {
  color: true,
  assembly: true,
  quantity: true,
  personalization: false,
  defects: true,
  packaging: true,
};

const ITEMS: { key: keyof QcState; label: string }[] = [
  { key: "color", label: "Проверка цвета" },
  { key: "assembly", label: "Проверка сборки" },
  { key: "quantity", label: "Проверка количества" },
  { key: "personalization", label: "Проверка персонализации" },
  { key: "defects", label: "Проверка брака" },
  { key: "packaging", label: "Проверка упаковки" },
];

export interface QualityControlSectionProps {
  value: QcState;
  onChange: (next: QcState) => void;
  title?: string;
}

export default function QualityControlSection({ value, onChange, title = "Контроль качества" }: QualityControlSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <label
            key={it.key}
            htmlFor={`qc-${it.key}`}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
          >
            <Checkbox
              id={`qc-${it.key}`}
              checked={value[it.key]}
              onCheckedChange={(v) => onChange({ ...value, [it.key]: !!v })}
            />
            <Label htmlFor={`qc-${it.key}`} className="cursor-pointer text-xs font-normal">
              {it.label}
            </Label>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}