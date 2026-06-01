import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";

/**
 * Полоска с глобальными параметрами изделия, которые наследуются
 * во все блоки/секции (Этап 1 ERP-переработки). Рендерится только если
 * провайдер активен и есть хотя бы одно значение.
 */
export default function GlobalParamsBar({ className }: { className?: string }) {
  const ctx = useMultipageCalcOptional();
  if (!ctx) return null;
  const g = ctx.global;
  const chips: { label: string; value: string }[] = [];
  if (g.format) chips.push({ label: "Формат", value: g.format });
  if (g.circulation) chips.push({ label: "Тираж", value: g.circulation.toLocaleString("ru-RU") });
  if (g.orientation) chips.push({ label: "Ориентация", value: g.orientation === "landscape" ? "альбом" : "книж." });
  if (g.printType) chips.push({ label: "Печать", value: String(g.printType) });
  if (g.bindingType) chips.push({ label: "Сборка", value: String(g.bindingType) });
  if (typeof g.marginPercent === "number") chips.push({ label: "Наценка", value: `${g.marginPercent}%` });
  if (typeof g.leadTimeDays === "number") chips.push({ label: "Срок", value: `${g.leadTimeDays} дн.` });
  if (chips.length === 0) return null;
  return (
    <div className={"flex flex-wrap items-center gap-1.5 text-[11px] " + (className ?? "") }>
      <span className="text-muted-foreground">Наследуется блоками:</span>
      {chips.map((c) => (
        <Badge key={c.label} variant="secondary" className="font-normal">
          <span className="text-muted-foreground mr-1">{c.label}:</span>
          <span className="text-foreground">{c.value}</span>
        </Badge>
      ))}
    </div>
  );
}