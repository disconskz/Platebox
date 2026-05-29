import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BoxPriceResult {
  materials: number;
  printCost: number;
  postCost: number;
  fittings: number;
  assembly: number;
  totalCost: number;
  totalGroupSavings: number;
  salePrice: number;
  totalWithVat: number;
  perUnit: number;
}

interface Props {
  result: BoxPriceResult;
  margin: number;
  vatPercent: number;
}

/**
 * Единый блок «Как формируется цена» для шаблона коробок.
 * Используется и внутри BoxProCalculator, и в боковой панели Calculator,
 * чтобы данные были идентичны.
 */
export function BoxPriceBreakdown({ result, margin, vatPercent }: Props) {
  const total = Math.max(1, result.totalCost);
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: "Материал (картон/бумага)", value: result.materials, color: "bg-sky-500" },
    { label: "Печать", value: result.printCost, color: "bg-emerald-500" },
    { label: "Постпечать / штамп", value: result.postCost, color: "bg-amber-500" },
    { label: "Фурнитура", value: result.fittings, color: "bg-fuchsia-500" },
    { label: "Сборка", value: result.assembly, color: "bg-indigo-500" },
  ].filter((r) => r.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Как формируется цена</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map((r) => {
          const pct = Math.round((r.value / total) * 100);
          return (
            <div key={r.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", r.color)} />
                  {r.label}
                </span>
                <span className="tabular-nums">
                  <span className="text-muted-foreground mr-2">{pct}%</span>
                  <span className="font-medium">{fmtMoney(r.value)}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full", r.color)} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
          );
        })}
        {result.totalGroupSavings > 0 && (
          <div className="flex justify-between text-xs text-primary pt-1">
            <span>Экономия от группировки</span>
            <span className="tabular-nums">−{fmtMoney(result.totalGroupSavings)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Себестоимость</span>
          <span className="font-semibold tabular-nums">{fmtMoney(result.totalCost)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">+ Наценка {margin}%</span>
          <span className="tabular-nums">{fmtMoney(result.salePrice - result.totalCost)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">+ НДС {vatPercent}%</span>
          <span className="tabular-nums">{fmtMoney(result.totalWithVat - result.salePrice)}</span>
        </div>
        <div className="flex justify-between text-base pt-1">
          <span className="font-medium">Цена продажи</span>
          <span className="font-bold text-primary tabular-nums">{fmtMoney(result.totalWithVat)}</span>
        </div>
      </CardContent>
    </Card>
  );
}