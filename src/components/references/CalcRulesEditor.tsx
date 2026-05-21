import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULTS } from "@/lib/calc/types";
import { RULE_KEY_MAP } from "@/lib/calc/rules";
import { HelpHint } from "@/components/HelpHint";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { Search } from "lucide-react";

type Section = { title: string; description?: string; learnMore?: string; help?: string; fields: { key: string; label: string; unit?: string; hint?: string }[] };

const SECTIONS: Section[] = [
  {
    title: "Поля и припуски",
    description: "Размеры захвата и боковых полей на печатном листе. Влияют на максимальное число изделий на лист.",
    learnMore: "rules-margins",
    help: "Уменьшите поля — больше изделий на лист и ниже себестоимость. Но не ниже технологического минимума машины (8–12 мм).",
    fields: [
      { key: "rule.layout.marginTop", label: "Верх", unit: "мм" },
      { key: "rule.layout.marginBottom", label: "Низ", unit: "мм" },
      { key: "rule.layout.marginLeft", label: "Внутреннее (захват)", unit: "мм" },
      { key: "rule.layout.marginRight", label: "Внешнее", unit: "мм" },
      { key: "rule.layout.bleed", label: "Вылеты под обрез (bleed)", unit: "мм" },
      { key: "rule.layout.stickerGap", label: "Просечка между наклейками", unit: "мм" },
      { key: "rule.layout.stickerEdge", label: "Краевой отступ для наклеек", unit: "мм" },
    ],
  },
  {
    title: "Приладка / отходы",
    description: "Сколько листов уходит в приладку при разных типах оборота, и доля доп. отходов от тиража.",
    learnMore: "rules-setup",
    help: "setupOwn — приладка для своего оборота, setupForeign — для чужого, setupPercent — доля от тиража (0.01 = 1%).",
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
    learnMore: "rules-prices",
    help: "Используется в формулах: формы = (краски × стороны × дизайны), резка — отдельной статьёй.",
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
    learnMore: "rules-stamping",
    help: "Стоимость = приладка + клише + оттиски × тираж. Клише: max(минимум, площадь_см² × ставка).",
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
    learnMore: "rules-formats",
    help: "Эти значения используются ТОЛЬКО когда таблица «Печатные форматы» пуста. Заполните её — и эти лимиты не понадобятся.",
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
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const session = await ensureSupabaseSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("key,value")
        .like("key", "rule.%");
      if (error) {
        console.error("[CalcRulesEditor.load]", error);
        toast.error(`Не удалось загрузить правила: ${error.message}`);
      }
      const map: Record<string, string> = {};
      for (const r of (data as any[]) || []) map[r.key] = String(r.value);
      setValues(map);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.access_token) load();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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

  const q = search.trim().toLowerCase();
  const visibleSections = q
    ? SECTIONS
        .map((s) => ({
          ...s,
          fields: s.fields.filter((f) =>
            f.label.toLowerCase().includes(q) ||
            f.key.toLowerCase().includes(q) ||
            (f.unit || "").toLowerCase().includes(q),
          ),
        }))
        .filter((s) => s.fields.length > 0)
    : SECTIONS;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Найти параметр…" className="h-8 pl-7" />
        </div>
        <HelpHint title="Как работают правила" learnMore="rules-where">
          <p>Меняете значения здесь — все НОВЫЕ расчёты считаются по новым правилам. Уже сохранённые сметы не пересчитываются (защита истории).</p>
          <p>Чтобы пересчитать старый заказ — продублируйте его в списке расчётов.</p>
        </HelpHint>
        <Button variant="outline" size="sm" className="h-8" onClick={resetToDefaults}>Сбросить</Button>
        <Button size="sm" className="h-8" onClick={saveAll}>Сохранить все</Button>
      </div>

      {!visibleSections.length && (
        <div className="text-xs text-muted-foreground p-6 text-center border rounded-md">Ничего не найдено</div>
      )}

      {visibleSections.map((s) => (
        <div key={s.title} className="rounded-md border overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/40 border-b">
            <div className="min-w-0">
              <div className="text-xs font-semibold flex items-center">
                {s.title}
                {s.help && <HelpHint title={s.title} learnMore={s.learnMore}>{s.help}</HelpHint>}
              </div>
              {s.description && <div className="text-[11px] text-muted-foreground truncate">{s.description}</div>}
            </div>
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground bg-background px-1.5 py-0.5 rounded border">{s.fields.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1.5 p-2">
            {s.fields.map((f) => (
              <div key={f.key} className="grid grid-cols-[1fr_110px] items-center gap-2">
                <Label className="text-xs text-muted-foreground truncate" title={f.label}>
                  {f.label} {f.unit && <span className="text-muted-foreground/60">({f.unit})</span>}
                </Label>
                <Input
                  type="number"
                  step="any"
                  className="h-7 tabular-nums text-right"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  onBlur={() => saveOne(f.key)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}