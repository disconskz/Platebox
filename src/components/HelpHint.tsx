import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
  /** Якорь раздела в /knowledge, например "calc-layout" */
  learnMore?: string;
};

export function HelpHint({ title, children, side = "top", className, iconClassName, learnMore }: Props) {
  const isMobile = useIsMobile();

  const body = (
    <div className="space-y-2 max-w-xs text-sm">
      {title && <div className="font-semibold text-foreground">{title}</div>}
      <div className="text-muted-foreground leading-snug">{children}</div>
      {learnMore && (
        <Link
          to={`/knowledge#${learnMore}`}
          className="inline-block text-xs text-primary hover:underline"
        >
          Подробнее в базе знаний →
        </Link>
      )}
    </div>
  );

  const Icon = (
    <HelpCircle
      className={cn("h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors", iconClassName)}
      aria-label="Подсказка"
    />
  );

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={cn("inline-flex items-center align-middle ml-1", className)} aria-label="Подсказка">
            {Icon}
          </button>
        </PopoverTrigger>
        <PopoverContent side={side} className="w-72">{body}</PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={cn("inline-flex items-center align-middle ml-1", className)} aria-label="Подсказка">
            {Icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs p-3">{body}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default HelpHint;