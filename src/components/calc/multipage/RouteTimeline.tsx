import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route as RouteIcon } from "lucide-react";
import { ROUTE_STAGE_LABELS, type RouteOperation, type RouteStage } from "@/lib/calc/multipage/route";

/** Визуализация динамического маршрута (раздел 22 ТЗ). */
export default function RouteTimeline({ operations }: { operations: RouteOperation[] }) {
  const grouped = React.useMemo(() => {
    const map = new Map<RouteStage, RouteOperation[]>();
    for (const op of operations) {
      const arr = map.get(op.stage) ?? [];
      arr.push(op);
      map.set(op.stage, arr);
    }
    return Array.from(map.entries());
  }, [operations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <RouteIcon className="h-4 w-4" />
          12. Маршрут производства
          <Badge variant="secondary" className="ml-1">{operations.length} операций</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {grouped.map(([stage, ops]) => (
          <div key={stage} className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {ROUTE_STAGE_LABELS[stage]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ops.map((op, i) => (
                <div
                  key={op.id}
                  className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                  title={op.hint}
                >
                  <span className="font-mono text-muted-foreground">{i + 1}.</span>
                  <span>{op.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}