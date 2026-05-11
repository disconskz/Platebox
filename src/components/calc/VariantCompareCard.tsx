import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtNum } from "@/lib/format";
import type { MultiSkuVariant } from "@/lib/calc/multi-sku";
import { cn } from "@/lib/utils";

type Props = {
  variant: MultiSkuVariant;
  isBest: boolean;
  selected: boolean;
  diffVsBest?: number;
  onApply: () => void;
};

export function VariantCompareCard({ variant, isBest, selected, diffVsBest, onApply }: Props) {
  const v = variant;
  return (
    <Card className={cn("relative transition-all", selected && "ring-2 ring-primary shadow-lg", isBest && !selected && "border-primary/40")}>
      {isBest && (
        <div className="absolute -top-2.5 left-4">
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Выгоднее
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{v.kind === "min_forms" ? "Вариант A · Минимум форм" : "Вариант B · Без пустот"}</span>
          <span className="text-xs font-normal text-muted-foreground">{v.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Row label="Спусков (форм-сетов)" value={v.impositions} />
          <Row label="Форм всего" value={v.formsTotal} />
          <Row label="Приладочных листов" value={v.setupSheetsTotal} />
          <Row label="Печатных листов" value={v.printSheetsTotal} />
          <Row label="Закупочных листов" value={v.purchaseSheetsTotal} />
          <Row
            label="Пустых позиций"
            value={v.emptySlots}
            highlight={v.emptySlots > 0 ? "warn" : undefined}
          />
        </div>

        <div className="border-t pt-3 flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Себестоимость</div>
            <div className="text-xl font-bold">{fmtMoney(v.totalCost)}</div>
            {!isBest && typeof diffVsBest === "number" && diffVsBest > 0 && (
              <div className="text-xs text-muted-foreground">+{fmtMoney(diffVsBest)} к лучшему</div>
            )}
          </div>
          <Button onClick={onApply} variant={selected ? "secondary" : isBest ? "default" : "outline"}>
            {selected ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Выбран
              </>
            ) : (
              "Применить"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: "warn" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", highlight === "warn" && "text-amber-600 dark:text-amber-400")}>
        {fmtNum(value)}
      </span>
    </div>
  );
}

export default VariantCompareCard;