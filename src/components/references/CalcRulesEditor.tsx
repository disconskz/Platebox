import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULTS } from "@/lib/calc/types";
import { RULE_KEY_MAP } from "@/lib/calc/rules";

type Section = { title: string; description?: string; fields: { key: string; label: string; unit?: string; hint?: string }[] };

const SECTIONS: Section[] = [
  {
    title: "Поля и припуски",
    description: "Размеры захвата и боковых полей на печатном листе. Влияют на максимальное число изделий на лист.",
    fields: [
      { key: "rule.layout.marginLR", label: "Боковые поля", unit: "мм" },
      { key: "rule.layout.marginTop", label: "Верхнее поле (захват)", unit: "мм" },
      { key: "rule.layout.marginBottom", label: "Нижнее поле", unit: "мм" },
      { key: "rule.layout.bleed", label: "Вылеты под обрез", unit: "мм" },
      { key: "rule.layout.stickerGap", label: "Просечка между наклейками", unit: "мм" },
      { key: "rule.layout.stickerEdge", label: "Краевой отступ для наклеек", unit: "мм" },
    ],
  },
  {
    title: "Приладка / отходы",
    description: "Сколько листов уходит в приладку при разных типах оборота, и доля доп. отходов от тиража.",
    fields: [
      { key: "rule.setup.setupOwn", label: "Приладка «свой оборот»", unit: "листов" },
      { key: "rule.setup.setupForeign", label: "Приладка «чужой оборот»", unit: "листов" },
      { key: "rule.setup.setupPercent", label: "Доп. приладка от тиража", unit: "доля (0.01 = 1%)" },
      { key: "rule.setup.bagMinSetup", label: "Мин. приладка для пакетов", unit: "листов" },
    ],
  },
  {
    title: "Цены: формы, краска, резка",
    description: "Стоимости пластин, подготовки, резки и нумерации.",
    fields: [
      { key: "rule.price.formCost", label: "Пластина (форма)", unit: "₸" },
      { key: "rule.price.formPrepCost", label: "Подготовка к печати", unit: "₸/форма" },
      { key: "rule.price.cutCostPerSheet", label: "Резка закупочного формата", unit: "₸/рез" },
      { key: "rule.price.finishCutCost", label: "Резка готовых", unit: "₸/рез" },
      { key: "rule.price.numberingCost", label: "Нумерация", unit: "₸/номер" },
      { key: "rule.price.designCost", label: "Дизайн / подготовка", unit: "₸/шт" },
    ],
  },
  {
    title: "Тиснение",
    fields: [
      { key: "rule.price.stampingSetup", label: "Приладка тиснения", unit: "₸" },
      { key: "rule.price.stampingClicheMin", label: "Мин. цена клише", unit: "₸" },
      { key: "rule.price.stampingClichePerCm2", label: "Клише", unit: "₸/см²" },
      { key: "rule.price.stampingImpr", label: "Оттиск", unit: "₸/оттиск" },
      { key: "rule.price.stampingImprNotebook", label: "Оттиск (блокноты)", unit: "₸/оттиск" },
    ],
  },
  {
    title: "Лимиты печатного формата",
    description: "Используются как fallback, если в справочнике «Печатные форматы» нет своих записей.",
    fields: [
      { key: "rule.formats.maxPrintW", label: "Макс. печатный — ширина", unit: "мм" },
      { key: "rule.formats.maxPrintH", label: "Макс. печатный — высота", unit: "мм" },
      { key: "rule.formats.altPrintW", label: "Альт. печатный — ширина", unit: "мм" },
      { key: "rule.formats.altPrintH", label: "Альт. печатный — высота", unit: "мм" },
    ],
  },
];

export default function CalcRulesEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("system_settings")
      .select("key,value")
      .like("key", "rule.%");
    const map: Record<string, string> = {};
    for (const r of (data as any[]) || []) map[r.key] = String(r.value);
    setValues(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveOne = async (key: string) => {
    const value = values[key] ?? "";
    const { error } = await (supabase as any)
      .from("system_settings")
      .upsert({ key, value, description: null }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Сохранено");
  };

  const saveAll = async () => {
    const rows = Object.entries(values).map(([key, value]) => ({ key, value, description: null }));
    const { error } = await (supabase as any).from("system_settings").upsert(rows, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Все правила сохранены — изменения применятся в новых расчётах");
  };

  const resetToDefaults = async () => {
    const next: Record<string, string> = { ...values };
    for (const [k, field] of Object.entries(RULE_KEY_MAP)) {
      next[k] = String((DEFAULTS as any)[field]);
    }
    setValues(next);
    toast.message("Заводские значения подставлены — нажмите «Сохранить все», чтобы применить");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Загрузка правил…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border bg-muted/30">
        <div className="text-sm">
          Правила расчёта применяются ко всем новым расчётам. Изменения не затрагивают уже сохранённые сметы.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>Сбросить к заводским</Button>
          <Button size="sm" onClick={saveAll}>Сохранить все</Button>
        </div>
      </div>

      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{s.title}</CardTitle>
            {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {s.fields.map((f) => (
                <div key={f.key} className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{f.label} {f.unit && <span className="text-muted-foreground/70">({f.unit})</span>}</Label>
                    <Input
                      type="number"
                      step="any"
                      className="h-8"
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      onBlur={() => saveOne(f.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}