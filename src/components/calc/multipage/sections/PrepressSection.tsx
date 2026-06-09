import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileCheck2 } from "lucide-react";
import { SectionHelp } from "../SectionHelp";

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
  qr: false,
  variableData: false,
};

const ITEMS: { key: keyof PrepressState; label: string }[] = [
  { key: "filesPrep", label: "Подготовка к печати" },
  { key: "imposition", label: "Спуск полос" },
  { key: "plates", label: "Вывод форм" },
  { key: "stampPrep", label: "Подготовка штампа (DXF/SVG)" },
  { key: "variableData", label: "Подготовка базы переменных данных" },
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
          <SectionHelp
            title="Допечатка"
            what="Подготовительные операции до запуска печати: подготовка файлов, спуск полос, вывод форм, изготовление штампа, формирование базы переменных данных. Само нанесение (QR, штрихкод, нумерация, ПД) — в Спецоперациях."
            simple="Используются значения по умолчанию — ничего настраивать не нужно."
            advanced="Включайте/выключайте операции вручную, влияет на маршрут и итог."
            tech="Каждая операция отображается в спецификации и техотчёте с формулой расчёта."
            learnMore="prepress"
          />
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