import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { getVariant, updateVariant, replaceStages, listConstants, listStageLibrary } from "@/lib/calc/variants/api";
import { CalcConstant, CalcVariant, FormulaNode, VARIABLE_LIST, VARIABLE_KEYS, VariantStage } from "@/lib/calc/variants/types";
import FormulaBuilder from "@/components/calc/FormulaBuilder";
import { runVariant, collectStageRefs } from "@/lib/calc/variants/engine";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const TEST_DEFAULTS: Record<string, number> = {
  тираж: 5000, кол_форм: 4, кол_красок: 4, сторон: 2, печ_листов: 700,
  закуп_листов: 350, кол_резов: 3, кол_блоков: 50, площадь_печати: 75, приладка: 150, плотность: 130,
};

export default function CalcVariantEditor() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [variant, setVariant] = useState<CalcVariant | null>(null);
  const [stages, setStages] = useState<VariantStage[]>([]);
  const [constants, setConstants] = useState<CalcConstant[]>([]);
  const [library, setLibrary] = useState<Awaited<ReturnType<typeof listStageLibrary>>>([]);
  const [saving, setSaving] = useState(false);
  const [testVars, setTestVars] = useState<Record<string, number>>(TEST_DEFAULTS);

  useEffect(() => {
    (async () => {
      const [v, c, lib] = await Promise.all([getVariant(id), listConstants(), listStageLibrary()]);
      if (!v) { toast.error("Вариант не найден"); nav("/references/variants"); return; }
      setVariant(v); setStages(v.stages); setConstants(c); setLibrary(lib);
    })();
  }, [id, nav]);

  const constMap = useMemo(() => Object.fromEntries(constants.map((c) => [c.slug, c.value])), [constants]);
  const validation = useMemo(() => {
    const refs = collectStageRefs(stages);
    const knownConsts = new Set(constants.map((c) => c.slug));
    const unknownVars = [...refs.vars].filter((v) => !VARIABLE_KEYS.has(v));
    const unknownConsts = [...refs.consts].filter((s) => !knownConsts.has(s));
    return { usedVars: refs.vars, usedConsts: refs.consts, unknownVars, unknownConsts };
  }, [stages, constants]);
  const canSave = validation.unknownVars.length === 0 && validation.unknownConsts.length === 0;
  const result = useMemo(() => {
    if (!variant) return null;
    return runVariant({ ...variant, stages }, { vars: testVars, consts: constMap });
  }, [variant, stages, testVars, constMap]);

  const addStage = (preset?: { name: string; unit: string; formula: FormulaNode }) => {
    const nextOrder = (stages.at(-1)?.sort_order ?? 0) + 10;
    setStages([...stages, {
      name: preset?.name ?? "Новый этап",
      unit: preset?.unit ?? "шт",
      formula: preset?.formula ?? { num: 0 },
      sort_order: nextOrder,
    }]);
  };

  const updateStage = (i: number, patch: Partial<VariantStage>) => {
    setStages((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const removeStage = (i: number) => setStages((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    setStages((arr) => {
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, idx) => ({ ...s, sort_order: (idx + 1) * 10 }));
    });
  };

  const save = async () => {
    if (!variant) return;
    if (!canSave) {
      toast.error("Есть неизвестные переменные или константы — исправьте перед сохранением");
      return;
    }
    setSaving(true);
    try {
      await updateVariant(variant.id, {
        name: variant.name, description: variant.description,
        base_product_type: variant.base_product_type, category: variant.category,
      });
      await replaceStages(variant.id, stages);
      toast.success("Вариант сохранён");
    } catch (e: any) { toast.error(e.message || "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  if (!variant) return <div className="p-8 text-sm text-muted-foreground">Загрузка…</div>;

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar pb-32 md:pb-0">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/references/variants" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> К списку
          </Link>
          <h1 className="ml-2 text-lg font-semibold truncate">{variant.name}</h1>
          <div className="ml-auto">
            <Button onClick={save} disabled={saving || !canSave} size="sm"><Save className="h-4 w-4 mr-1" /> Сохранить</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 sm:py-6 px-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Общие</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Название</Label>
                <Input value={variant.name} onChange={(e) => setVariant({ ...variant, name: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Описание</Label>
                <Input value={variant.description} onChange={(e) => setVariant({ ...variant, description: e.target.value })} placeholder="Короткое описание" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Этапы работы</CardTitle>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline"><Library className="h-4 w-4 mr-1" /> Из библиотеки</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-2" align="end">
                    <div className="max-h-72 overflow-y-auto">
                      {library.map((l) => (
                        <button key={l.id} type="button"
                          onClick={() => addStage({ name: l.name, unit: l.unit, formula: l.formula as FormulaNode })}
                          className="w-full text-left rounded px-2 py-1.5 hover:bg-accent">
                          <div className="text-sm font-medium">{l.name}</div>
                          <div className="text-[11px] text-muted-foreground">{l.category} · {l.unit}</div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={() => addStage()}><Plus className="h-4 w-4 mr-1" /> Этап</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Нет ни одного этапа. Добавьте из библиотеки или с нуля.</div>}
              {stages.map((s, i) => (
                <div key={i} className="rounded-md border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input className="h-8 max-w-xs" value={s.name} onChange={(e) => updateStage(i, { name: e.target.value })} />
                    <Input className="h-8 w-20" value={s.unit} onChange={(e) => updateStage(i, { unit: e.target.value })} placeholder="ед." />
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                      <Button size="sm" variant="ghost" disabled={i === stages.length - 1} onClick={() => move(i, 1)}>↓</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeStage(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <FormulaBuilder
                    value={s.formula}
                    onChange={(f) => updateStage(i, { formula: f })}
                    constants={constants}
                    testVars={testVars}
                    testConsts={constMap}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2">
              {canSave ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
              Валидация
            </CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              {canSave ? (
                <div className="text-muted-foreground">Все переменные и константы известны.</div>
              ) : (
                <>
                  {validation.unknownVars.length > 0 && (
                    <div className="text-destructive">
                      Неизвестные переменные: <span className="font-mono">{validation.unknownVars.join(", ")}</span>
                    </div>
                  )}
                  {validation.unknownConsts.length > 0 && (
                    <div className="text-destructive">
                      Неизвестные константы: <span className="font-mono">{validation.unknownConsts.map((s) => "@" + s).join(", ")}</span>.
                      Добавьте их в справочнике «Константы формул».
                    </div>
                  )}
                </>
              )}
              <div className="pt-1 border-t text-muted-foreground">
                Используется переменных: <b>{validation.usedVars.size}</b> · констант: <b>{validation.usedConsts.size}</b>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Тестовый прогон</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {VARIABLE_LIST.map((v) => {
                const used = validation.usedVars.has(v.key);
                return (
                  <div key={v.key} className={cn("grid grid-cols-[1fr_100px] items-center gap-2", !used && "opacity-50")}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      {v.label}
                      {used && <span className="text-[9px] text-primary font-medium">●</span>}
                    </Label>
                    <Input className="h-8 text-right tabular-nums" type="number"
                      value={testVars[v.key] ?? 0}
                      onChange={(e) => setTestVars({ ...testVars, [v.key]: Number(e.target.value) || 0 })} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          {result && (
            <Card>
              <CardHeader><CardTitle className="text-base">Результат</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {result.stages.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{s.formulaText}</div>
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{s.value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2">
                      <td className="py-2 font-semibold">Итого</td>
                      <td className="py-2 text-right font-bold tabular-nums">{result.total.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₸</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}