import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { HelpHint } from "@/components/HelpHint";

type AnyRow = Record<string, any>;

// Динамические опции (загружаются из БД) для select-полей со ссылками на другие таблицы
type DynamicOptions = {
  purchase_formats?: { value: string; label: string }[];
  press_machines?: { value: string; label: string }[];
};

const useDynamicOptions = (): DynamicOptions => {
  const [opts, setOpts] = useState<DynamicOptions>({});
  useEffect(() => {
    (async () => {
      const [{ data: pf }, { data: pm }] = await Promise.all([
        (supabase as any).from("purchase_formats").select("id,width,height").order("sort_order"),
        (supabase as any).from("press_machines").select("id,name").order("sort_order"),
      ]);
      setOpts({
        purchase_formats: ((pf as any[]) || []).map((r) => ({
          value: r.id,
          label: `${r.width} × ${r.height}`,
        })),
        press_machines: ((pm as any[]) || []).map((r) => ({ value: r.id, label: r.name })),
      });
    })();
  }, []);
  return opts;
};

const PRODUCT_TYPE_OPTS = [
  "leaflet","leaflet_diecut","booklet","sticker","sticker_diecut","bag","businesscard","envelope",
  "box","blank","selfcopy","folder","poster","notepad","book","magazine","brochure","label",
  "calendar_wall","calendar_desk","calendar_quarter","wobbler","shelftalker","kubus",
];

const TABLES = [
  {
    key: "materials",
    title: "Бумага",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "type", t: "select", label: "Тип", opts: ["coated", "offset", "self_adhesive", "cardboard", "other"] },
      { k: "density", t: "number", label: "Плотность" },
      { k: "purchase_format_id", t: "ref", label: "Закуп. формат", refKey: "purchase_formats" },
      { k: "format_width", t: "number", label: "Шир., мм" },
      { k: "format_height", t: "number", label: "Выс., мм" },
      { k: "cost_per_sheet", t: "number", label: "Цена/лист" },
    ],
    defaults: { name: "", type: "coated", density: 130, purchase_format_id: null, format_width: 640, format_height: 920, cost_per_sheet: 0 },
  },
  {
    key: "operations",
    title: "Операции",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "category", t: "select", label: "Категория", opts: ["prepress", "print", "postpress", "logistics"] },
      { k: "subgroup", t: "text", label: "Подгруппа" },
      { k: "fixed_cost", t: "number", label: "Фикс. ₸" },
      { k: "variable_cost", t: "number", label: "Перем. ₸" },
      { k: "unit", t: "text", label: "Ед." },
    ],
    defaults: { name: "", category: "postpress", subgroup: "", fixed_cost: 0, variable_cost: 0, unit: "шт" },
  },
  {
    key: "equipment",
    title: "Оборудование",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "type", t: "select", label: "Тип", opts: ["print", "cut", "fold", "laminate", "die_cut", "stamp", "other"] },
      { k: "max_format_width", t: "number", label: "Макс. шир." },
      { k: "max_format_height", t: "number", label: "Макс. выс." },
      { k: "cost_per_impression", t: "number", label: "₸/оттиск" },
      { k: "notes", t: "text", label: "Примечание" },
    ],
    defaults: { name: "", type: "print", max_format_width: 520, max_format_height: 360, cost_per_impression: 3, notes: "" },
  },
  {
    key: "lamination_prices",
    title: "Ламинация",
    cols: [
      { k: "film_type", t: "select", label: "Плёнка", opts: ["gloss", "matte", "velvet", "gold", "silver", "color"] },
      { k: "size_range", t: "select", label: "Размер", opts: ["up_to_a4_plus", "a4_plus_to_a3_plus", "a3_plus_to_a2_plus", "a2_plus_to_a1"] },
      { k: "cost_per_side", t: "number", label: "₸/сторону" },
    ],
    defaults: { film_type: "gloss", size_range: "up_to_a4_plus", cost_per_side: 17 },
  },
  {
    key: "system_settings",
    title: "Константы",
    cols: [
      { k: "key", t: "text", label: "Ключ" },
      { k: "value", t: "text", label: "Значение" },
      { k: "description", t: "text", label: "Описание" },
    ],
    defaults: { key: "", value: "", description: "" },
    pk: "key",
  },
  {
    key: "print_formats",
    title: "Печатные форматы",
    cols: [
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "purchase_format_id", t: "ref", label: "Закуп. формат", refKey: "purchase_formats" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { width: 520, height: 360, purchase_format_id: null, sort_order: 100 },
  },
  {
    key: "purchase_formats",
    title: "Закупочные форматы",
    cols: [
      { k: "material_category", t: "select", label: "Категория", opts: ["cardboard", "coated", "offset", "self_adhesive", "other"] },
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { material_category: "coated", width: 640, height: 920, sort_order: 100 },
  },
  {
    key: "press_machines",
    title: "Печатные машины",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "machine_type", t: "select", label: "Тип", opts: ["digital", "offset"] },
      { k: "max_format_width", t: "number", label: "Макс. шир." },
      { k: "max_format_height", t: "number", label: "Макс. выс." },
      { k: "cost_per_impression", t: "number", label: "₸/оттиск" },
      { k: "min_circulation", t: "number", label: "Тираж от" },
      { k: "max_circulation", t: "number", label: "Тираж до" },
      { k: "setup_sheets", t: "number", label: "Приладка, л." },
      { k: "setup_cost", t: "number", label: "Приладка, ₸" },
      { k: "product_types", t: "multiselect", label: "Типы продукции", opts: PRODUCT_TYPE_OPTS },
      { k: "priority", t: "number", label: "Приоритет" },
      { k: "is_active", t: "select", label: "Активна", opts: ["true", "false"] },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "", machine_type: "offset", max_format_width: 520, max_format_height: 360, cost_per_impression: 3, min_circulation: 0, max_circulation: null, setup_sheets: 0, setup_cost: 0, product_types: null, priority: 100, is_active: true, sort_order: 100 },
  },
  {
    key: "product_circulation_rules",
    title: "Правила тиражей",
    cols: [
      { k: "product_type", t: "select", label: "Тип продукта", opts: PRODUCT_TYPE_OPTS },
      { k: "min_circulation", t: "number", label: "Тираж от" },
      { k: "max_circulation", t: "number", label: "Тираж до" },
      { k: "preferred_machine_id", t: "ref", label: "Машина", refKey: "press_machines" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { product_type: "leaflet", min_circulation: 0, max_circulation: null, preferred_machine_id: null, sort_order: 100 },
  },
  {
    key: "envelope_formats",
    title: "Конверты",
    cols: [
      { k: "name", t: "text", label: "Название" },
      { k: "width", t: "number", label: "Шир., мм" },
      { k: "height", t: "number", label: "Выс., мм" },
      { k: "sort_order", t: "number", label: "Порядок" },
    ],
    defaults: { name: "", width: 110, height: 220, sort_order: 100 },
  },
] as const;

const References = () => {
  const dynOpts = useDynamicOptions();
  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">На главную</span>
          </Link>
          <div className="ml-auto text-sm font-medium truncate">Справочники (НСИ)</div>
        </div>
      </header>
      <main className="container mx-auto py-4 sm:py-6 px-4">
        <div className="mb-3 text-sm text-muted-foreground inline-flex items-center">
          Справочники питают калькулятор: меняете цены и нормативы здесь — они подтягиваются во все новые расчёты.
          <HelpHint title="Справочники" learnMore="refs-materials">
            Бумага, операции, оборудование, ламинация и системные константы. Изменения видны во всех новых расчётах.
          </HelpHint>
        </div>
        <Tabs defaultValue="materials">
          <TabsList className="scroll-x flex w-full overflow-x-auto h-auto justify-start">
            {TABLES.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.title}</TabsTrigger>)}
          </TabsList>
          {TABLES.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              <RefTable spec={t as any} dynOpts={dynOpts} />
            </TabsContent>
          ))}
        </Tabs>
      </main>
      <MobileTabBar />
    </div>
  );
};

const RefTable = ({ spec, dynOpts }: { spec: any; dynOpts: DynamicOptions }) => {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [draft, setDraft] = useState<AnyRow>({ ...spec.defaults });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const pk = spec.pk || "id";

  const load = async () => {
    const { data } = await (supabase as any).from(spec.key).select("*").order(spec.cols[0].k);
    setRows((data as any) || []);
  };

  useEffect(() => { load(); setPage(1); /* eslint-disable-next-line */ }, [spec.key]);

  const update = async (row: AnyRow, k: string, v: any) => {
    const next = { ...row, [k]: v };
    setRows(rows.map((r) => (r[pk] === row[pk] ? next : r)));
  };

  const save = async (row: AnyRow) => {
    const { [pk]: id, created_at, ...rest } = row;
    const { error } = await (supabase as any).from(spec.key).update(rest).eq(pk, id);
    if (error) toast.error(error.message); else toast.success("Сохранено");
  };

  const remove = async (row: AnyRow) => {
    const { error } = await (supabase as any).from(spec.key).delete().eq(pk, row[pk]);
    if (error) toast.error(error.message); else { toast.success("Удалено"); load(); }
  };

  const add = async () => {
    const { error } = await (supabase as any).from(spec.key).insert(draft);
    if (error) toast.error(error.message);
    else { toast.success("Добавлено"); setDraft({ ...spec.defaults }); setPage(1); load(); }
  };

  const renderField = (col: any, value: any, onChange: (v: any) => void) => {
    if (col.t === "ref") {
      const options = (dynOpts[col.refKey as keyof DynamicOptions] as { value: string; label: string }[]) || [];
      return (
        <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (col.t === "multiselect") {
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (opt: string) => {
        const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
        onChange(next.length ? next : null);
      };
      return (
        <div className="flex flex-wrap gap-1 max-w-[260px]">
          {col.opts.map((o: string) => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${arr.includes(o) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
            >
              {o}
            </button>
          ))}
        </div>
      );
    }
    if (col.t === "select") {
      const isBool = col.opts.length === 2 && col.opts[0] === "true" && col.opts[1] === "false";
      return (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(isBool ? v === "true" : v)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{col.opts.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type={col.t}
        className="h-8"
        value={value ?? ""}
        onChange={(e) => onChange(col.t === "number" ? Number(e.target.value) : e.target.value)}
      />
    );
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage]
  );
  const fromIdx = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(currentPage * PAGE_SIZE, rows.length);

  // Валидация диапазонов тиражей (для press_machines и product_circulation_rules)
  const rangeValidation = useMemo(() => {
    const errors = new Map<string, string[]>();          // блокирующие (min > max)
    const warnings = new Map<string, string[]>();        // пересечения
    const push = (map: Map<string, string[]>, id: string, msg: string) => {
      const cur = map.get(id) || [];
      if (!cur.includes(msg)) cur.push(msg);
      map.set(id, cur);
    };
    const isRange = spec.key === "press_machines" || spec.key === "product_circulation_rules";
    if (!isRange) return { errors, warnings };

    const all = rows.filter((r) => spec.key === "press_machines" ? r.is_active !== false : true);
    for (const r of all) {
      const min = Number(r.min_circulation ?? 0);
      const max = r.max_circulation == null ? null : Number(r.max_circulation);
      if (max != null && min > max) push(errors, r[pk], `«Тираж от» (${min}) больше «до» (${max})`);
    }
    // Пересечения попарно
    const overlap = (aMin: number, aMax: number | null, bMin: number, bMax: number | null) => {
      const aHi = aMax ?? Infinity;
      const bHi = bMax ?? Infinity;
      return aMin <= bHi && bMin <= aHi;
    };
    const groupKey = (r: AnyRow) =>
      spec.key === "product_circulation_rules" ? String(r.product_type || "") : "all";
    const groups = new Map<string, AnyRow[]>();
    for (const r of all) {
      const k = groupKey(r);
      const list = groups.get(k) || [];
      list.push(r);
      groups.set(k, list);
    }
    for (const [, list] of groups) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const aMin = Number(a.min_circulation ?? 0);
          const aMax = a.max_circulation == null ? null : Number(a.max_circulation);
          const bMin = Number(b.min_circulation ?? 0);
          const bMax = b.max_circulation == null ? null : Number(b.max_circulation);
          if (overlap(aMin, aMax, bMin, bMax)) {
            const label = (r: AnyRow) =>
              spec.key === "press_machines" ? (r.name || "—") : `тираж ${r.min_circulation ?? 0}–${r.max_circulation ?? "∞"}`;
            push(warnings, a[pk], `Пересечение с «${label(b)}»`);
            push(warnings, b[pk], `Пересечение с «${label(a)}»`);
          }
        }
      }
    }
    return { errors, warnings };
  }, [rows, spec.key, pk]);

  const guardedSave = async (row: AnyRow) => {
    const errs = rangeValidation.errors.get(row[pk]);
    if (errs && errs.length) { toast.error(errs.join("; ")); return; }
    return save(row);
  };
  const guardedAdd = async () => {
    const min = Number(draft.min_circulation ?? 0);
    const max = draft.max_circulation == null || draft.max_circulation === "" ? null : Number(draft.max_circulation);
    if (max != null && min > max) { toast.error(`«Тираж от» (${min}) больше «до» (${max})`); return; }
    return add();
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{spec.title}</CardTitle></CardHeader>
      <CardContent>
        <div className="scroll-x overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {spec.cols.map((c: any) => <th key={c.k} className="text-left p-2">{c.label}</th>)}
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-primary/5">
                {spec.cols.map((c: any) => (
                  <td key={c.k} className="p-1.5">{renderField(c, draft[c.k], (v) => setDraft({ ...draft, [c.k]: v }))}</td>
                ))}
                <td className="p-1.5 text-right"><Button size="sm" onClick={guardedAdd}><Plus className="h-3.5 w-3.5" /></Button></td>
              </tr>
              {pageRows.map((row) => {
                const errs = rangeValidation.errors.get(row[pk]) || [];
                const warns = rangeValidation.warnings.get(row[pk]) || [];
                const rowCls = errs.length
                  ? "border-t bg-destructive/5"
                  : warns.length
                    ? "border-t bg-warning/5"
                    : "border-t";
                return (
                  <Fragment key={row[pk]}>
                    <tr className={rowCls}>
                      {spec.cols.map((c: any) => (
                        <td key={c.k} className="p-1.5">{renderField(c, row[c.k], (v) => update(row, c.k, v))}</td>
                      ))}
                      <td className="p-1.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => guardedSave(row)} disabled={errs.length > 0}><Save className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                    {(errs.length > 0 || warns.length > 0) && (
                      <tr className={errs.length ? "bg-destructive/5" : "bg-warning/5"}>
                        <td colSpan={spec.cols.length + 1} className="px-3 py-1.5">
                          <div className={`flex items-start gap-1.5 text-[11px] ${errs.length ? "text-destructive" : "text-warning"}`}>
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <div>{[...errs, ...warns].join(" · ")}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr className="border-t">
                  <td colSpan={spec.cols.length + 1} className="p-4 text-center text-xs text-muted-foreground">
                    Нет записей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>
            {rows.length > 0 ? (
              <>Показаны <span className="font-medium text-foreground">{fromIdx}–{toIdx}</span> из <span className="font-medium text-foreground">{rows.length}</span></>
            ) : (
              <>0 записей</>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default References;