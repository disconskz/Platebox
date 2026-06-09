import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Wrench, ChevronDown, ChevronRight, Pencil, FunctionSquare } from "lucide-react";
import { AdvancedOnly, TechOnly } from "./ModeVisibility";

export interface SpecLine {
  stage: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  /** Детали расчёта из справочника (формулы и переменные). */
  details?: Array<{ label: string; value: string }>;
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

/** Технологические корректировки коэффициентов/норм по этапам. */
export interface StageOverrides {
  /** Множитель стоимости по этапам, ключ — название этапа. */
  stageMultipliers?: Record<string, number>;
  /** Переопределённые значения метрик (если заданы — заменяют расчётные). */
  metrics?: Partial<CostByStageMetrics>;
}

const EMPTY_OVERRIDES: StageOverrides = { stageMultipliers: {}, metrics: {} };

function readOverrides(key: string): StageOverrides {
  if (typeof window === "undefined") return EMPTY_OVERRIDES;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as StageOverrides;
    return {
      stageMultipliers: parsed.stageMultipliers ?? {},
      metrics: parsed.metrics ?? {},
    };
  } catch {
    return EMPTY_OVERRIDES;
  }
}
function writeOverrides(key: string, v: StageOverrides) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {}
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
  storageKey,
}: {
  spec: SpecLine[];
  metrics?: CostByStageMetrics;
  title?: string;
  /** Ключ хранилища для тех. корректировок (LocalStorage). Без него корректировки скрыты. */
  storageKey?: string;
}) {
  const [overrides, setOverrides] = React.useState<StageOverrides>(() =>
    storageKey ? readOverrides(`lovable.calc.tech-overrides.${storageKey}`) : EMPTY_OVERRIDES,
  );
  React.useEffect(() => {
    if (storageKey) writeOverrides(`lovable.calc.tech-overrides.${storageKey}`, overrides);
  }, [overrides, storageKey]);

  const stageMul = (stage: string) => overrides.stageMultipliers?.[stage] ?? 1;

  const effectiveMetrics: CostByStageMetrics | undefined = React.useMemo(() => {
    if (!metrics && !overrides.metrics) return undefined;
    const base = metrics ?? {};
    const ov = overrides.metrics ?? {};
    const pick = <K extends keyof CostByStageMetrics>(k: K): number | undefined => {
      const v = ov[k];
      return v != null && Number.isFinite(v) ? (v as number) : base[k];
    };
    return {
      printSheets: pick("printSheets"),
      purchaseSheets: pick("purchaseSheets"),
      wasteSheets: pick("wasteSheets"),
      impositions: pick("impositions"),
      forms: pick("forms"),
      makereadyCount: pick("makereadyCount"),
    };
  }, [metrics, overrides.metrics]);

  const { groups, total, opsCount } = React.useMemo(() => {
    const map = new Map<string, { total: number; ops: number; lines: SpecLine[] }>();
    let total = 0;
    for (const l of spec) {
      const mul = stageMul(l.stage);
      const lineTotal = l.total * mul;
      const g = map.get(l.stage) ?? { total: 0, ops: 0, lines: [] };
      g.total += lineTotal;
      g.ops += 1;
      g.lines.push({ ...l, total: lineTotal });
      map.set(l.stage, g);
      total += lineTotal;
    }
    const groups = Array.from(map.entries())
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => b.total - a.total);
    return { groups, total, opsCount: spec.length };
  }, [spec, overrides.stageMultipliers]);

  if (spec.length === 0) return null;

  const hasAnyOverride =
    Object.values(overrides.stageMultipliers ?? {}).some((v) => v !== 1) ||
    Object.values(overrides.metrics ?? {}).some((v) => v != null);

  return (
    <AdvancedOnly>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {title}
            <Badge variant="secondary" className="text-[10px]">{opsCount} операций</Badge>
            {hasAnyOverride && (
              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                с корректировками
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {effectiveMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {effectiveMetrics.printSheets != null && (
                <Metric label="Печ. листы" value={fmt(effectiveMetrics.printSheets)} />
              )}
              {effectiveMetrics.purchaseSheets != null && (
                <Metric label="Закуп. листы" value={fmt(effectiveMetrics.purchaseSheets)} />
              )}
              {effectiveMetrics.wasteSheets != null && (
                <Metric label="Отходы" value={fmt(effectiveMetrics.wasteSheets) + " л."} />
              )}
              {effectiveMetrics.impositions != null && (
                <Metric label="Спуски" value={fmt(effectiveMetrics.impositions)} />
              )}
              {effectiveMetrics.forms != null && (
                <Metric label="Формы" value={fmt(effectiveMetrics.forms)} />
              )}
              {effectiveMetrics.makereadyCount != null && (
                <Metric label="Приладки" value={fmt(effectiveMetrics.makereadyCount)} />
              )}
            </div>
          )}
          <div className="space-y-2">
            {groups.map((g) => {
              const pct = total > 0 ? (g.total / total) * 100 : 0;
              return (
                <StageRow
                  key={g.stage}
                  stage={g.stage}
                  total={g.total}
                  pct={pct}
                  ops={g.ops}
                  mul={stageMul(g.stage)}
                  lines={g.lines}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="font-medium">Итого по этапам</span>
            <span className="font-bold tabular-nums">{fmtMoney(total)}</span>
          </div>

          {storageKey && (
            <TechOnly>
              <TechOverridesEditor
                stages={groups.map((g) => g.stage)}
                baseMetrics={metrics}
                overrides={overrides}
                onChange={setOverrides}
                hasAnyOverride={hasAnyOverride}
              />
            </TechOnly>
          )}
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

/** Редактор тех. корректировок: множители по этапам + переопределение метрик. */
function TechOverridesEditor({
  stages,
  baseMetrics,
  overrides,
  onChange,
  hasAnyOverride,
}: {
  stages: string[];
  baseMetrics?: CostByStageMetrics;
  overrides: StageOverrides;
  onChange: (v: StageOverrides) => void;
  hasAnyOverride: boolean;
}) {
  const setStage = (stage: string, mul: number) => {
    const next = { ...(overrides.stageMultipliers ?? {}) };
    if (!Number.isFinite(mul) || mul === 1) delete next[stage];
    else next[stage] = mul;
    onChange({ ...overrides, stageMultipliers: next });
  };
  const setMetric = (key: keyof CostByStageMetrics, val: string) => {
    const next = { ...(overrides.metrics ?? {}) };
    if (val === "") delete next[key];
    else {
      const n = Number(val);
      if (Number.isFinite(n)) next[key] = n;
    }
    onChange({ ...overrides, metrics: next });
  };
  const reset = () => onChange(EMPTY_OVERRIDES);

  const metricFields: { key: keyof CostByStageMetrics; label: string }[] = [
    { key: "printSheets", label: "Печ. листы" },
    { key: "purchaseSheets", label: "Закуп. листы" },
    { key: "wasteSheets", label: "Отходы, л." },
    { key: "impositions", label: "Спуски" },
    { key: "forms", label: "Формы" },
    { key: "makereadyCount", label: "Приладки" },
  ];

  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Wrench className="h-3.5 w-3.5" />
          Тех. корректировки (коэффициенты и нормы)
        </div>
        {hasAnyOverride && (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Сбросить
          </Button>
        )}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
          Множитель стоимости по этапам
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {stages.map((stage) => (
            <div key={stage} className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{stage}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="h-8 text-xs"
                value={overrides.stageMultipliers?.[stage] ?? ""}
                placeholder="1.00"
                onChange={(e) => setStage(stage, e.target.value === "" ? 1 : Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
          Переопределение норм
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {metricFields.map(({ key, label }) => {
            const base = baseMetrics?.[key];
            return (
              <div key={key} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {label}
                  {base != null && (
                    <span className="ml-1 text-muted-foreground/70">({fmt(base)})</span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  className="h-8 text-xs"
                  value={overrides.metrics?.[key] ?? ""}
                  placeholder={base != null ? fmt(base) : "—"}
                  onChange={(e) => setMetric(key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}