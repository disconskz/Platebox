import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileCheck2 } from "lucide-react";

/**
 * Допечатка (раздел 15 ТЗ): проверка макета, цветокоррекция, спуск полос,
 * вывод форм, подготовка штампа/DXF/SVG, QR, переменные данные.
 */

export interface PrepressState {
  proof: boolean;
  colorCorrection: boolean;
  imposition: boolean;
  plates: boolean;
  filesPrep: boolean;
  stampPrep: boolean;
  dxf: boolean;
  svg: boolean;
  qr: boolean;
  variableData: boolean;
}

export const DEFAULT_PREPRESS: PrepressState = {
  proof: true,
  colorCorrection: true,
  imposition: true,
  plates: true,
  filesPrep: true,
  stampPrep: false,
  dxf: false,
  svg: false,
  qr: false,
  variableData: false,
};

const ITEMS: { key: keyof PrepressState; label: string }[] = [
  { key: "proof", label: "Проверка макета" },
  { key: "colorCorrection", label: "Цветокоррекция" },
  { key: "imposition", label: "Спуск полос" },
  { key: "plates", label: "Вывод форм" },
  { key: "filesPrep", label: "Подготовка файлов" },
  { key: "stampPrep", label: "Подготовка штампа" },
  { key: "dxf", label: "DXF" },
  { key: "svg", label: "SVG" },
  { key: "qr", label: "Генерация QR" },
  { key: "variableData", label: "Переменные данные" },
];

export interface PrepressSectionProps {
  value: PrepressState;
  onChange: (next: PrepressState) => void;
  title?: string;
}

export default function PrepressSection({ value, onChange, title = "Допечатка" }: PrepressSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileCheck2 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <label
            key={it.key}
            htmlFor={`pp-${it.key}`}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
          >
            <Checkbox
              id={`pp-${it.key}`}
              checked={value[it.key]}
              onCheckedChange={(v) => onChange({ ...value, [it.key]: !!v })}
            />
            <Label htmlFor={`pp-${it.key}`} className="cursor-pointer text-xs font-normal">
              {it.label}
            </Label>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}