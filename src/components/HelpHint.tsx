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
    <div className="space-y-1.5 text-sm">
      {title && <div className="font-semibold text-foreground leading-tight">{title}</div>}
      <div className="text-muted-foreground leading-snug [&_p]:m-0 [&_p+p]:mt-1.5 [&_ul]:m-0 [&_ol]:m-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]">
        {children}
      </div>
      {learnMore && (
        <Link
          to={`/knowledge#${learnMore}`}
          className="inline-block pt-0.5 text-xs font-medium text-primary hover:underline"
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
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center justify-center align-middle ml-1 h-6 w-6 -my-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted transition-colors",
              className,
            )}
            aria-label="Подсказка"
          >
            {Icon}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={side}
          align="start"
          collisionPadding={12}
          className="w-[min(20rem,calc(100vw-1.5rem))] p-3 rounded-xl shadow-lg border bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/85"
        >
          {body}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center align-middle ml-1 h-5 w-5 -my-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
              className,
            )}
            aria-label="Подсказка"
          >
            {Icon}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align="start"
          collisionPadding={12}
          className="max-w-[min(22rem,calc(100vw-1.5rem))] p-3 rounded-xl shadow-lg border bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/85 text-popover-foreground"
        >
          {body}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default HelpHint;