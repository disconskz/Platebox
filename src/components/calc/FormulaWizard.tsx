import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, RotateCcw } from "lucide-react";
import { collectStageRefs, runVariant } from "@/lib/calc/variants/engine";
import { VARIABLE_LIST } from "@/lib/calc/variants/types";
import { fmtMoney, fmtNum } from "@/lib/format";

const LABELS: Record<string, { label: string; hint: string }> = Object.fromEntries(
  VARIABLE_LIST.map((v) => [v.key, { label: v.label, hint: v.hint }])
);

export interface FormulaWizardProps {
  variant: any | null;
  constants: Record<string, number>;
  autoVars: Record<string, number>;
  overrides: Record<string, number>;
  onChangeOverrides: (next: Record<string, number>) => void;
}

export function FormulaWizard({ variant, constants, autoVars, overrides, onChangeOverrides }: FormulaWizardProps) {
  const refs = useMemo(() => {
    if (!variant?.stages?.length) return { vars: new Set<string>(), consts: new Set<string>() };
    return collectStageRefs(variant.stages);
  }, [variant]);

  const effectiveVars: Record<string, number> = useMemo(() => {
    const merged: Record<string, number> = { ...autoVars };
    for (const [k, v] of Object.entries(overrides)) {
      if (Number.isFinite(v)) merged[k] = v;
    }
    return merged;
  }, [autoVars, overrides]);

  const run = useMemo(() => {
    if (!variant?.stages?.length) return null;
    try {
      return runVariant(variant, { vars: effectiveVars, consts: constants });
    } catch {
      return null;
    }
  }, [variant, effectiveVars, constants]);

  const setOverride = (key: string, raw: string) => {
    const next = { ...overrides };
    if (raw === "" || raw == null) delete next[key];
    else {
      const n = Number(raw);
      if (Number.isFinite(n)) next[key] = n;
    }
    onChangeOverrides(next);
  };

  const resetAll = () => onChangeOverrides({});

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!variant}>
          <Wand2 className="h-3.5 w-3.5" /> Мастер
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Мастер формулы
          </SheetTitle>
        </SheetHeader>

        {!variant ? (
          <p className="mt-6 text-sm text-muted-foreground">Активная формула не выбрана.</p>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Формула</div>
              <div className="font-medium">{variant.name}</div>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Переменные</h3>
                {Object.keys(overrides).length > 0 && (
                  <button type="button" onClick={resetAll} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Сбросить все
                  </button>
                )}
              </div>
              {refs.vars.size === 0 ? (
                <p className="text-xs text-muted-foreground">Формула не использует переменных.</p>
              ) : (
                <div className="space-y-2">
                  {[...refs.vars].map((key) => {
                    const meta = LABELS[key];
                    const auto = autoVars[key] ?? 0;
                    const hasOverride = key in overrides;
                    const value = hasOverride ? overrides[key] : auto;
                    return (
                      <div key={key} className="rounded-md border p-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">{meta?.label || key}</div>
                            <div className="text-xs text-muted-foreground">{meta?.hint || `Переменная «${key}»`}</div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">
                            авто: <span className="font-mono">{fmtNum(auto)}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            value={hasOverride ? String(overrides[key]) : ""}
                            placeholder={String(auto)}
                            onChange={(e) => setOverride(key, e.target.value)}
                            className="h-8 text-sm"
                          />
                          {hasOverride && (
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setOverride(key, "")}>
                              авто
                            </Button>
                          )}
                        </div>
                        {hasOverride && (
                          <div className="mt-1 text-[11px] text-amber-600">
                            используется ручное значение: <span className="font-mono">{fmtNum(value)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {refs.consts.size > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Константы (из справочника)</h3>
                <div className="rounded-md border divide-y">
                  {[...refs.consts].map((slug) => (
                    <div key={slug} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="font-mono text-xs">@{slug}</span>
                      <span className={slug in constants ? "" : "text-destructive"}>
                        {slug in constants ? fmtNum(constants[slug]) : "не задана"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {run && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Разбивка по этапам</h3>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-2 py-1.5">Этап</th>
                        <th className="text-left px-2 py-1.5">Формула</th>
                        <th className="text-right px-2 py-1.5">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.stages.map((s, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5">{s.name}</td>
                          <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{s.formulaText}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{fmtMoney(s.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td className="px-2 py-1.5 font-semibold" colSpan={2}>Итого</td>
                        <td className="px-2 py-1.5 text-right font-semibold">{fmtMoney(run.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default FormulaWizard;