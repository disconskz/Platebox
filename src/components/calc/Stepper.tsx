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
  return (
    <ol className="scroll-x flex w-full items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 sm:gap-2">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        const reachable = idx <= maxReached;
        return (
          <li key={label} className="flex shrink-0 sm:flex-1 sm:min-w-[110px] items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onStepClick?.(idx)}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs sm:text-sm sm:px-3 transition-colors whitespace-nowrap",
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
              <span className={cn("truncate", !active && "hidden sm:inline")}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};