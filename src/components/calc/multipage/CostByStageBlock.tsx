import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvancedOnly } from "./ModeVisibility";

export interface SpecLine {
  stage: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

export interface CostByStageMetrics {
  /** Количество печатных листов (брутто с приладкой) */
  printSheets?: number;
  /** Закупочные листы (нетто, без приладки) */
  purchaseSheets?: number;
  /** Отходы, листов */
  wasteSheets?: number;
  /** Кол-во спусков (тетрадей) */
  impositions?: number;
  /** Кол-во форм */
  forms?: number;
  /** Кол-во приладок */
  makereadyCount?: number;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}
function fmtMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₸";
}

/**
 * Блок «Себестоимость по этапам» — расширенный режим.
 * Показывает: печ. листы, закуп. листы, отходы, спуски, формы, приладку,
 * количество операций и сумму себестоимости по каждому этапу с шкалой долей.
 */
export default function CostByStageBlock({
  spec,
  metrics,
  title = "Себестоимость по этапам",
}: {
  spec: SpecLine[];
  metrics?: CostByStageMetrics;
  title?: string;
}) {
  const { groups, total, opsCount } = React.useMemo(() => {
    const map = new Map<string, { total: number; ops: number }>();
    let total = 0;
    for (const l of spec) {
      const g = map.get(l.stage) ?? { total: 0, ops: 0 };
      g.total += l.total;
      g.ops += 1;
      map.set(l.stage, g);
      total += l.total;
    }
    const groups = Array.from(map.entries())
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => b.total - a.total);
    return { groups, total, opsCount: spec.length };
  }, [spec]);

  if (spec.length === 0) return null;

  return (
    <AdvancedOnly>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {title}
            <Badge variant="secondary" className="text-[10px]">{opsCount} операций</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {metrics.printSheets != null && (
                <Metric label="Печ. листы" value={fmt(metrics.printSheets)} />
              )}
              {metrics.purchaseSheets != null && (
                <Metric label="Закуп. листы" value={fmt(metrics.purchaseSheets)} />
              )}
              {metrics.wasteSheets != null && (
                <Metric label="Отходы" value={fmt(metrics.wasteSheets) + " л."} />
              )}
              {metrics.impositions != null && (
                <Metric label="Спуски" value={fmt(metrics.impositions)} />
              )}
              {metrics.forms != null && (
                <Metric label="Формы" value={fmt(metrics.forms)} />
              )}
              {metrics.makereadyCount != null && (
                <Metric label="Приладки" value={fmt(metrics.makereadyCount)} />
              )}
            </div>
          )}
          <div className="space-y-2">
            {groups.map((g) => {
              const pct = total > 0 ? (g.total / total) * 100 : 0;
              return (
                <div key={g.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{g.stage}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {g.ops} оп. · <span className="text-foreground font-medium">{fmtMoney(g.total)}</span> · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="font-medium">Итого по этапам</span>
            <span className="font-bold tabular-nums">{fmtMoney(total)}</span>
          </div>
        </CardContent>
      </Card>
    </AdvancedOnly>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}