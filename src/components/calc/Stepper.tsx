import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Продукция",
  "Материал",
  "Допечатные",
  "Раскладка",
  "Послепечатные",
  "Расчёт",
  "Сохранение",
];

interface Props {
  current: number;
  onStepClick?: (i: number) => void;
  maxReached: number;
}

export const Stepper = ({ current, onStepClick, maxReached }: Props) => {
  const total = STEPS.length;
  const label = STEPS[current - 1];
  return (
    <>
    {/* Mobile compact indicator */}
    <div className="sm:hidden">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Шаг {current} из {total}</div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {STEPS.map((_, i) => {
          const idx = i + 1;
          const reachable = idx <= maxReached;
          return (
            <button
              key={i}
              type="button"
              disabled={!reachable}
              onClick={() => onStepClick?.(idx)}
              aria-label={`Шаг ${idx}`}
              className={cn(
                "h-1.5 rounded-full",
                idx < current && "bg-success",
                idx === current && "bg-primary",
                idx > current && "bg-muted",
                !reachable && "opacity-50"
              )}
            />
          );
        })}
      </div>
    </div>
    {/* Desktop full stepper */}
    <ol className="hidden sm:flex w-full items-center gap-2">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        const reachable = idx <= maxReached;
        return (
          <li key={label} className="flex flex-1 min-w-[110px] items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onStepClick?.(idx)}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors whitespace-nowrap",
                active && "border-primary bg-primary text-primary-foreground shadow-elevated",
                done && "border-success/40 bg-success/5 text-foreground",
                !active && !done && "border-border bg-card text-muted-foreground",
                !reachable && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-primary-foreground text-primary",
                  done && "bg-success text-success-foreground",
                  !active && !done && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx}
              </span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
    </>
  );
};