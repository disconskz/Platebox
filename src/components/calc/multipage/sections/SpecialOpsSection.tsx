import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { SectionHelp } from "../SectionHelp";

/**
 * Спецоперации (раздел 19 ТЗ). Идут ПОСЛЕ сборки, не являются отдельным
 * этапом производства — это нестандартные ручные/допработы.
 */

export interface SpecialOpsState {
  personalization: boolean;
  qr: boolean;
  barcodes: boolean;
  numbering: boolean;
  handwork: boolean;
  handGluing: boolean;
  handSorting: boolean;
  completion: boolean;
  customMarking: boolean;
  handPackaging: boolean;
  stickering: boolean;
}

export const DEFAULT_SPECIAL_OPS: SpecialOpsState = {
  personalization: false,
  qr: false,
  barcodes: false,
  numbering: false,
  handwork: false,
  handGluing: false,
  handSorting: false,
  completion: false,
  customMarking: false,
  handPackaging: false,
  stickering: false,
};

const ITEMS: { key: keyof SpecialOpsState; label: string }[] = [
  { key: "personalization", label: "Персонализация" },
  { key: "qr", label: "QR-коды" },
  { key: "barcodes", label: "Штрихкоды" },
  { key: "numbering", label: "Нумерация" },
  { key: "handwork", label: "Ручная работа" },
  { key: "handGluing", label: "Ручная вклейка" },
  { key: "handSorting", label: "Ручная сортировка" },
  { key: "completion", label: "Комплектация" },
  { key: "customMarking", label: "Нестандартная маркировка" },
  { key: "handPackaging", label: "Ручная упаковка" },
  { key: "stickering", label: "Стикеровка" },
];

export interface SpecialOpsSectionProps {
  value: SpecialOpsState;
  onChange: (next: SpecialOpsState) => void;
  title?: string;
}

export default function SpecialOpsSection({ value, onChange, title = "Спецоперации" }: SpecialOpsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" />
          {title}
          <SectionHelp
            title="Спецоперации"
            what="Нанесение и нестандартные ручные работы ПОСЛЕ сборки: QR/штрихкод, нумерация, переменные данные, персонализация, ручная вклейка, стикеровка и т.п."
            simple="Все опции выключены по умолчанию. Включайте только то, что заказчик запросил."
            advanced="Активные операции добавляют отдельные строки в спецификацию и маршрут."
            tech="Видны формулы и тарифы каждой спецоперации; для нанесения переменных данных автоматически добавляется подготовка базы в Допечатке."
            learnMore="special-ops"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <label
            key={it.key}
            htmlFor={`so-${it.key}`}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
          >
            <Checkbox
              id={`so-${it.key}`}
              checked={value[it.key]}
              onCheckedChange={(v) => onChange({ ...value, [it.key]: !!v })}
            />
            <Label htmlFor={`so-${it.key}`} className="cursor-pointer text-xs font-normal">
              {it.label}
            </Label>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}