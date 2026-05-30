import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { TechWarning } from "@/lib/calc/multipage/validate";

/** Баннер технологических предупреждений (раздел 25 ТЗ). */
export default function TechWarnings({ warnings }: { warnings: TechWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div className="space-y-2">
      {warnings.map((w) => {
        const Icon = w.level === "error" ? OctagonAlert : w.level === "warn" ? AlertTriangle : Info;
        const variant = w.level === "error" ? ("destructive" as const) : ("default" as const);
        const title =
          w.level === "error" ? "Ошибка технологии" : w.level === "warn" ? "Предупреждение" : "Подсказка";
        return (
          <Alert key={w.id} variant={variant}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{w.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}