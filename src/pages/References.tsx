import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Save, ChevronLeft, ChevronRight, AlertTriangle,
  Copy, Download, Upload, MoreHorizontal, Search, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { HelpHint } from "@/components/HelpHint";
import { PRODUCT_LABELS } from "@/lib/calc/products";
import CalcRulesEditor from "@/components/references/CalcRulesEditor";
import CustomReferences from "@/components/references/CustomReferences";
import ProductGlossary from "@/components/references/ProductGlossary";
import CalcConstants from "@/components/references/CalcConstants";
import OperationCatalog from "@/components/references/OperationCatalog";
import { useAuth } from "@/hooks/useAuth";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { logDataIssue, noSessionIssue } from "@/lib/data-issue";
import { DataState } from "@/components/DataState";

type AnyRow = Record<string, any>;

// Русские подписи для значений select-полей. Ключи — реальные значения, хранящиеся в БД.
const OPT_LABELS: Record<string, string> = {
  // materials.type
  coated: "Меловка",
  offset: "Офсетная",
  self_adhesive: "Самоклейка",
  cardboard: "Картон",
  other: "Другое",
  // operations.category
  prepress: "Допечать",
  print: "Печать",
  postpress: "Послепечать",
  logistics: "Логистика",
  // equipment.type
  cut: "Резка",
  fold: "Фальцовка",
  laminate: "Ламинация",
  die_cut: "Вырубка",
  stamp: "Тиснение",
  // lamination.film_type
  gloss: "Глянцевая",
  matte: "Матовая",
  velvet: "Софт-тач (вельвет)",
  gold: "Золото",
  silver: "Серебро",
  color: "Цветная",
  // lamination.size_range
  up_to_a4_plus: "до A4+",
  a4_plus_to_a3_plus: "A4+ — A3+",
  a3_plus_to_a2_plus: "A3+ — A2+",
  a2_plus_to_a1: "A2+ — A1",
  // press_machines.machine_type
  digital: "Цифровая",
  // booleans
  "true": "Да",
  "false": "Нет",
  // продукты — берём из общего справочника
  ...Object.fromEntries(Object.entries(PRODUCT_LABELS)),
};

const optLabel = (v: string) => OPT_LABELS[v] ?? v;

// Динамические опции (загружаются из БД) для select-полей со ссылками на другие таблицы
type DynamicOptions = {
  purchase_formats?: { value: string; label: string }[];
  press_machines?: { value: string; label: string }[];
};

const useDynamicOptions = (enabled: boolean): DynamicOptions => {
  const [opts, setOpts] = useState<DynamicOptions>({});
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const fetchOpts = async () => {
      await ensureSupabaseSession();
      if (cancelled) return;
      const [pfRes, pmRes] = await Promise.all([
        (supabase as any).from("purchase_formats").select("id,width,height").order("sort_order"),
        (supabase as any).from("press_machines").select("id,name").order("sort_order"),
      ]);
      if (cancelled) return;
      if (pfRes.error) console.error("[useDynamicOptions] purchase_formats:", pfRes.error);
      if (pmRes.error) console.error("[useDynamicOptions] press_machines:", pmRes.error);
      setOpts({
        purchase_formats: ((pfRes.data as any[]) || []).map((r) => ({
          value: r.id,
          label: `${r.width} × ${r.height}`,
        })),
        press_machines: ((pmRes.data as any[]) || []).map((r) => ({ value: r.id, label: r.name })),
      });
    };
    fetchOpts();
    // Перезагрузить опции, если сессия обновилась (логин/рефреш токена).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.access_token && !cancelled) fetchOpts();
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [enabled]);
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
  const { loading, user } = useAuth();
  const authReady = !loading && !!user;
  const dynOpts = useDynamicOptions(authReady);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle has-tabbar flex items-center justify-center text-sm text-muted-foreground">
        Восстанавливаем сессию…
      </div>
    );
  }

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
        <ReferencesNav dynOpts={dynOpts} authReady={authReady} />
      </main>
      <MobileTabBar />
    </div>
  );
};

// Группированная навигация по справочникам: на десктопе — сайдбар,
// на мобильных — Select. Заменяет горизонтальную полоску табов,
// которую неудобно листать при большом числе разделов.
const NAV_GROUPS: { title: string; items: { key: string; title: string }[] }[] = [
  {
    title: "Материалы и форматы",
    items: [
      { key: "materials", title: "Бумага" },
      { key: "purchase_formats", title: "Закупочные форматы" },
      { key: "print_formats", title: "Печатные форматы" },
      { key: "envelope_formats", title: "Конверты" },
    ],
  },
  {
    title: "Производство",
    items: [
      { key: "operations", title: "Операции" },
      { key: "__op_catalog", title: "Виды работ (формулы)" },
      { key: "equipment", title: "Оборудование" },
      { key: "press_machines", title: "Печатные машины" },
      { key: "lamination_prices", title: "Ламинация" },
    ],
  },
  {
    title: "Правила и настройки",
    items: [
      { key: "product_circulation_rules", title: "Правила тиражей" },
      { key: "__rules", title: "Правила расчёта" },
      { key: "system_settings", title: "Константы" },
      { key: "__calc_constants", title: "Константы формул" },
    ],
  },
  {
    title: "Расширения",
    items: [
      { key: "__glossary", title: "Глоссарий продукции" },
      { key: "__custom", title: "Свои справочники" },
    ],
  },
];

const ReferencesNav = ({ dynOpts, authReady }: { dynOpts: DynamicOptions; authReady: boolean }) => {
  const [active, setActive] = useState<string>("materials");
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const activeTitle = allItems.find((i) => i.key === active)?.title ?? "";

  const renderContent = () => {
    if (active === "__rules") return <CalcRulesEditor />;
    if (active === "__custom") return <CustomReferences />;
    if (active === "__glossary") return <ProductGlossary />;
    if (active === "__calc_constants") return <CalcConstants />;
    if (active === "__op_catalog") return <OperationCatalog />;
    const spec = TABLES.find((t) => t.key === active);
    if (!spec) return null;
    return <RefTable spec={spec as any} dynOpts={dynOpts} authReady={authReady} />;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* Mobile: Select */}
      <div className="lg:hidden">
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NAV_GROUPS.map((g, gi) => (
              <Fragment key={g.title}>
                <div className={`px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground ${gi === 0 ? "" : "mt-1 border-t"}`}>{g.title}</div>
                {g.items.map((it) => (
                  <SelectItem key={it.key} value={it.key}>{it.title}</SelectItem>
                ))}
              </Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: sidebar */}
      <nav className="hidden lg:block">
        <div className="sticky top-20 space-y-4 p-2 rounded-lg border bg-card">
          {NAV_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {g.items.map((it) => {
                  const isActive = active === it.key;
                  return (
                    <button
                      key={it.key}
                      onClick={() => setActive(it.key)}
                      className={`text-left text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {it.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0">
        <div className="lg:hidden mb-2 text-sm font-medium">{activeTitle}</div>
        {renderContent()}
      </div>
    </div>
  );
};

const RefTable = ({ spec, dynOpts, authReady }: { spec: any; dynOpts: DynamicOptions; authReady: boolean }) => {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [draft, setDraft] = useState<AnyRow>({ ...spec.defaults });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>("__all");
  const [sectionList, setSectionList] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ rows: AnyRow[]; mode: "one" | "many" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasSubgroup = useMemo(() => {
    const cols = spec.cols.map((c: any) => c.k);
    // У этих таблиц мы добавили колонку subgroup миграцией; system_settings — нет.
    return spec.key !== "system_settings";
  }, [spec]);
  const PAGE_SIZE = 15;
  const pk = spec.pk || "id";

  const load = async () => {
    if (!authReady) return;
    setLoading(true);
    setLoadError(null);
    try {
      const session = await ensureSupabaseSession();
      if (!session?.access_token) {
        const issue = noSessionIssue(`References.load:${spec.key}`);
        setLoadError(issue.userMessage);
        return;
      }
      const { data, error } = await (supabase as any).from(spec.key).select("*").order(spec.cols[0].k);
      if (error) {
        const issue = logDataIssue(`References.load:${spec.key}`, error);
        setLoadError(`«${spec.title || spec.key}»: ${issue.userMessage}`);
        if (issue.kind === "forbidden" || issue.kind === "unauthorized" || issue.kind === "no_session") {
          toast.error(issue.userMessage);
        }
        return;
      }
      const list = (data as any[]) || [];
      if (list.length === 0) {
        // запрос прошёл, но строк нет — может быть RLS-фильтр либо просто пусто.
        logDataIssue(`References.load:${spec.key}`, null, { emptyResult: true });
      }
      setRows(list);
      setSelected(new Set());
    } catch (e: any) {
      const issue = logDataIssue(`References.load:${spec.key}`, e);
      setLoadError(issue.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    if (!authReady) { setSectionList([]); return; }
    if (!hasSubgroup) { setSectionList([]); return; }
    const session = await ensureSupabaseSession();
    if (!session?.access_token) return;
    const { data: rs } = await (supabase as any)
      .from("reference_sections")
      .select("name")
      .eq("table_key", spec.key)
      .order("sort_order");
    const fromSections = ((rs as any[]) || []).map((r) => r.name as string);
    // плюс уникальные значения subgroup в данных
    const fromRows = Array.from(new Set(rows.map((r) => r.subgroup).filter(Boolean) as string[]));
    const all = Array.from(new Set([...fromSections, ...fromRows]));
    setSectionList(all);
  };

  useEffect(() => {
    if (!authReady) return;
    load(); setPage(1); setActiveSection("__all"); setSearch("");
    // Если сессия обновится (логин или рефреш токена) — перезагрузить.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.access_token) load();
    });
    return () => sub.subscription.unsubscribe();
    /* eslint-disable-next-line */
  }, [spec.key, authReady]);
  useEffect(() => { loadSections(); /* eslint-disable-next-line */ }, [spec.key, rows.length]);

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

  const removeMany = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await (supabase as any).from(spec.key).delete().in(pk, ids);
    if (error) toast.error(error.message);
    else { toast.success(`Удалено: ${ids.length}`); load(); }
  };

  const duplicate = async (row: AnyRow) => {
    const { [pk]: _id, created_at, ...rest } = row;
    if (typeof rest.name === "string") rest.name = `${rest.name} (копия)`;
    const { error } = await (supabase as any).from(spec.key).insert(rest);
    if (error) toast.error(error.message);
    else { toast.success("Скопировано"); load(); }
  };

  // ===== CSV =====
  const exportCsv = () => {
    const cols = spec.cols.map((c: any) => c.k);
    const labels = spec.cols.map((c: any) => c.label);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = Array.isArray(v) ? v.join("|") : String(v);
      if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [labels.join(";")];
    for (const r of filteredRows) {
      lines.push(cols.map((k: string) => escape(r[k])).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${spec.key}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): string[][] => {
    const out: string[][] = [];
    let cur: string[] = []; let cell = ""; let inQ = false;
    const t = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (inQ) {
        if (ch === '"') {
          if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
        } else cell += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ";") { cur.push(cell); cell = ""; }
        else if (ch === "\n") { cur.push(cell); out.push(cur); cur = []; cell = ""; }
        else if (ch === "\r") { /* skip */ }
        else cell += ch;
      }
    }
    if (cell.length || cur.length) { cur.push(cell); out.push(cur); }
    return out.filter((r) => r.length && r.some((c) => c.length));
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);
    if (grid.length < 2) { toast.error("CSV пустой"); return; }
    const header = grid[0];
    const labelToKey: Record<string, string> = {};
    for (const c of spec.cols) labelToKey[c.label] = c.k;
    const numKeys = new Set(spec.cols.filter((c: any) => c.t === "number").map((c: any) => c.k));
    const multiKeys = new Set(spec.cols.filter((c: any) => c.t === "multiselect").map((c: any) => c.k));
    const keys = header.map((h) => labelToKey[h] ?? h);
    const records = grid.slice(1).map((row) => {
      const obj: AnyRow = {};
      keys.forEach((k, i) => {
        let v: any = row[i];
        if (v === "" || v == null) { obj[k] = null; return; }
        if (numKeys.has(k)) v = Number(v);
        else if (multiKeys.has(k)) v = String(v).split("|").filter(Boolean);
        obj[k] = v;
      });
      return obj;
    });
    if (!confirm(`Импортировать ${records.length} строк? Существующие данные не удаляются.`)) return;
    const { error } = await (supabase as any).from(spec.key).insert(records);
    if (error) toast.error(error.message);
    else { toast.success(`Импортировано: ${records.length}`); load(); }
  };

  // ===== Sections =====
  const addSection = async () => {
    const name = prompt("Название раздела:")?.trim();
    if (!name) return;
    const { error } = await (supabase as any).from("reference_sections").insert({ table_key: spec.key, name });
    if (error) toast.error(error.message);
    else { setActiveSection(name); loadSections(); }
  };
  const removeSection = async (name: string) => {
    if (!confirm(`Удалить раздел «${name}»? Записи останутся, но потеряют принадлежность к разделу.`)) return;
    await (supabase as any).from("reference_sections").delete().eq("table_key", spec.key).eq("name", name);
    await (supabase as any).from(spec.key).update({ subgroup: null }).eq("subgroup", name);
    setActiveSection("__all");
    load(); loadSections();
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
              {optLabel(o)}
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
          <SelectContent>{col.opts.map((o: string) => <SelectItem key={o} value={o}>{optLabel(o)}</SelectItem>)}</SelectContent>
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

  // Фильтрация по разделу + поиску
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (hasSubgroup && activeSection !== "__all") {
        if ((r.subgroup || "") !== activeSection) return false;
      }
      if (!q) return true;
      for (const c of spec.cols) {
        const v = r[c.k];
        if (v == null) continue;
        const text = Array.isArray(v) ? v.map(optLabel).join(" ") : optLabel(String(v));
        if (text.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [rows, search, activeSection, hasSubgroup, spec.cols]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredRows, currentPage]
  );
  const fromIdx = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  // При смене раздела — сбросить страницу
  useEffect(() => { setPage(1); }, [search, activeSection]);

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
      <CardHeader className="pb-3 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center">
            {spec.title}
            <HelpHint title="Работа с таблицей" learnMore="refs-toolbar">
              <ul className="list-disc pl-4 space-y-1">
                <li><b>Поиск</b> — по всем колонкам.</li>
                <li><b>Разделы</b> группируют записи (поле subgroup).</li>
                <li><b>CSV</b>: экспорт текущей выборки, импорт добавляет строки.</li>
                <li><b>«⋯»</b> у строки — дублировать или удалить.</li>
                <li><b>Чекбоксы</b> — массовое удаление.</li>
              </ul>
            </HelpHint>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="h-8 pl-7 w-44"
              />
              {search && (
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                  aria-label="Очистить"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv} title="Экспорт CSV">
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} title="Импорт CSV">
              <Upload className="h-3.5 w-3.5 mr-1" /> Импорт
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }}
            />
          </div>
        </div>
        {hasSubgroup && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveSection("__all")}
              className={`text-xs px-2 py-1 rounded-md border ${activeSection === "__all" ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
            >Все</button>
            {sectionList.map((name) => (
              <span key={name} className="inline-flex items-center gap-0.5">
                <button
                  onClick={() => setActiveSection(name)}
                  className={`text-xs pl-2 pr-1 py-1 rounded-l-md border-y border-l ${activeSection === name ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                >{name}</button>
                <button
                  onClick={() => removeSection(name)}
                  className={`text-xs px-1 py-1 rounded-r-md border-y border-r ${activeSection === name ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:text-destructive"}`}
                  title="Удалить раздел"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={addSection}>
              <Plus className="h-3 w-3 mr-1" /> Раздел
            </Button>
          </div>
        )}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/40">
            <div className="text-sm">Выбрано: <span className="font-medium">{selected.size}</span></div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Снять выбор</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDelete({ rows: rows.filter((r) => selected.has(r[pk])), mode: "many" })}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить выбранные
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <DataState
          loading={loading}
          error={loadError}
          empty={!loading && !loadError && rows.length === 0 && !search && activeSection === "__all"}
          onRetry={load}
          variant="rows"
          rowCount={8}
          emptyTitle={`В справочнике «${spec.title || spec.key}» пока нет записей`}
          emptyDescription="Добавьте первую запись через форму выше или импортируйте CSV."
        >
        <div className="scroll-x overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8 p-2">
                  <Checkbox
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r[pk]))}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) pageRows.forEach((r) => next.add(r[pk]));
                      else pageRows.forEach((r) => next.delete(r[pk]));
                      setSelected(next);
                    }}
                  />
                </th>
                {spec.cols.map((c: any) => <th key={c.k} className="text-left p-2">{c.label}</th>)}
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-primary/5">
                <td className="p-1.5"></td>
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
                      <td className="p-1.5">
                        <Checkbox
                          checked={selected.has(row[pk])}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(row[pk]); else next.delete(row[pk]);
                            setSelected(next);
                          }}
                        />
                      </td>
                      {spec.cols.map((c: any) => (
                        <td key={c.k} className="p-1.5">{renderField(c, row[c.k], (v) => update(row, c.k, v))}</td>
                      ))}
                      <td className="p-1.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => guardedSave(row)} disabled={errs.length > 0}><Save className="h-3.5 w-3.5" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => duplicate(row)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Дублировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setConfirmDelete({ rows: [row], mode: "one" })}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                    {(errs.length > 0 || warns.length > 0) && (
                      <tr className={errs.length ? "bg-destructive/5" : "bg-warning/5"}>
                        <td colSpan={spec.cols.length + 2} className="px-3 py-1.5">
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
              {filteredRows.length === 0 && (
                <tr className="border-t">
                  <td colSpan={spec.cols.length + 2} className="p-4 text-center text-xs text-muted-foreground">
                    {rows.length === 0 ? "Нет записей" : "Ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>
            {filteredRows.length > 0 ? (
              <>Показаны <span className="font-medium text-foreground">{fromIdx}–{toIdx}</span> из <span className="font-medium text-foreground">{filteredRows.length}</span>{filteredRows.length !== rows.length && <> (всего {rows.length})</>}</>
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
        </DataState>
      </CardContent>
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.mode === "many"
                ? `Будут удалены ${confirmDelete.rows.length} записей. Действие необратимо.`
                : "Запись будет удалена. Действие необратимо."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.mode === "many") {
                  await removeMany(confirmDelete.rows.map((r) => r[pk]));
                } else {
                  await remove(confirmDelete.rows[0]);
                }
                setConfirmDelete(null);
              }}
            >Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default References;