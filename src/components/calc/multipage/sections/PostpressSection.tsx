import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";

/**
 * 7. Постпечатка (ТЗ задачи 3). Самостоятельный блок:
 * ламинация, биговка, кашировка, фальцовка, тиснение,
 * высечка, сверление, перфорация, резка.
 *
 * Это «общий слой» постпечатки уровня изделия —
 * специфические операции обложки/блока остаются в своих секциях.
 */

export interface PostpressState {
  lamination: boolean;
  bigovka: boolean;
  cashing: boolean;
  falsovka: boolean;
  stamping: boolean;
  dieCut: boolean;
  drilling: boolean;
  perforation: boolean;
  cutting: boolean;
}

export const DEFAULT_POSTPRESS: PostpressState = {
  lamination: false,
  bigovka: false,
  cashing: false,
  falsovka: false,
  stamping: false,
  dieCut: false,
  drilling: false,
  perforation: false,
  cutting: true,
};

const ITEMS: { key: keyof PostpressState; label: string }[] = [
  { key: "lamination", label: "Ламинация" },
  { key: "bigovka", label: "Биговка" },
  { key: "cashing", label: "Кашировка" },
  { key: "falsovka", label: "Фальцовка" },
  { key: "stamping", label: "Тиснение" },
  { key: "dieCut", label: "Высечка" },
  { key: "drilling", label: "Сверление" },
  { key: "perforation", label: "Перфорация" },
  { key: "cutting", label: "Резка" },
];

export interface PostpressSectionProps {
  value: PostpressState;
  onChange: (next: PostpressState) => void;
  title?: string;
}

export default function PostpressSection({ value, onChange, title = "Постпечатка" }: PostpressSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <label
            key={it.key}
            htmlFor={`post-${it.key}`}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-sm hover:bg-muted/40"
          >
            <Checkbox
              id={`post-${it.key}`}
              checked={value[it.key]}
              onCheckedChange={(v) => onChange({ ...value, [it.key]: !!v })}
            />
            <Label htmlFor={`post-${it.key}`} className="cursor-pointer text-xs font-normal">
              {it.label}
            </Label>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}