import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Search, CheckCircle2, AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { FormulaBuilder } from "./FormulaBuilder";
import { BuilderConst } from "@/lib/operations/formula-builder";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Operation {
  id: string;
  code: number;
  category: string;
  sort_order: number;
  name: string;
}

interface OpParam {
  id: string;
  operation_code: number;
  code: number;
  sort_order: number;
  name: string;
  default_value: string;
  formula: string;
  notes: string;
}

interface OpWorkItem {
  id: string;
  operation_code: number;
  code: number;
  sort_order: number;
  name: string;
  price_source: string;
  quantity_source: string;
}

export default function OperationCatalog() {
  const [ops, setOps] = useState<Operation[]>([]);
  const [params, setParams] = useState<Record<number, OpParam[]>>({});
  const [workItems, setWorkItems] = useState<Record<number, OpWorkItem[]>>({});
  const [activeCode, setActiveCode] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  /** Сколько work_items и параметров у каждой операции — для бейджей и «готово/нет». */
  const [counts, setCounts] = useState<Record<number, { p: number; w: number }>>({});
  const [consts, setConsts] = useState<BuilderConst[]>([]);
  const { isAdmin } = useAuth();
  // Контекст редактора формулы
  const [editor, setEditor] = useState<null | {
    title: string;
    initial: string;
    onSave: (v: string) => Promise<void> | void;
  }>(null);

  useEffect(() => {
    (async () => {
      await ensureSupabaseSession();
      const [cRes, pRes, wRes, kRes] = await Promise.all([
        (supabase as any).from("operation_catalog").select("*").order("sort_order").order("name"),
        (supabase as any).from("operation_parameters").select("operation_code"),
        (supabase as any).from("operation_work_items").select("operation_code"),
        (supabase as any).from("calc_constants").select("slug,name,value"),
      ]);
      setOps((cRes.data as Operation[]) || []);
      const map: Record<number, { p: number; w: number }> = {};
      for (const r of ((pRes.data as any[]) || [])) {
        const k = r.operation_code as number;
        (map[k] ||= { p: 0, w: 0 }).p++;
      }
      for (const r of ((wRes.data as any[]) || [])) {
        const k = r.operation_code as number;
        (map[k] ||= { p: 0, w: 0 }).w++;
      }
      setCounts(map);
      setConsts(((kRes.data as any[]) || []) as BuilderConst[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeCode == null) return;
    if (params[activeCode] && workItems[activeCode]) return;
    (async () => {
      const [{ data: p }, { data: w }] = await Promise.all([
        (supabase as any).from("operation_parameters").select("*").eq("operation_code", activeCode).order("sort_order"),
        (supabase as any).from("operation_work_items").select("*").eq("operation_code", activeCode).order("sort_order"),
      ]);
      setParams((s) => ({ ...s, [activeCode]: (p as OpParam[]) || [] }));
      setWorkItems((s) => ({ ...s, [activeCode]: (w as OpWorkItem[]) || [] }));
    })();
  }, [activeCode, params, workItems]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? ops.filter((o) => o.name.toLowerCase().includes(q) || o.category.toLowerCase().includes(q) || String(o.code).includes(q))
      : ops;
    const map = new Map<string, Operation[]>();
    for (const o of filtered) {
      const arr = map.get(o.category) || [];
      arr.push(o);
      map.set(o.category, arr);
    }
    return Array.from(map.entries());
  }, [ops, search]);

  const active = ops.find((o) => o.code === activeCode) || null;
  const activeParams = activeCode != null ? params[activeCode] || [] : [];
  const activeWork = activeCode != null ? workItems[activeCode] || [] : [];
  const readyCount = useMemo(() => Object.values(counts).filter((c) => c.w > 0).length, [counts]);

  // Переменные, доступные внутри текущей операции — все её параметры.
  const variables = useMemo(
    () => activeParams.map((p) => ({ name: p.name })),
    [activeParams]
  );

  const nextCode = (rows: { code: number }[]) => (rows.reduce((m, r) => Math.max(m, r.code), 0) || 0) + 1;
  const nextOrder = (rows: { sort_order: number }[]) => (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 1;

  async function refreshActive(code: number) {
    const [{ data: p }, { data: w }] = await Promise.all([
      (supabase as any).from("operation_parameters").select("*").eq("operation_code", code).order("sort_order"),
      (supabase as any).from("operation_work_items").select("*").eq("operation_code", code).order("sort_order"),
    ]);
    const np = (p as OpParam[]) || [];
    const nw = (w as OpWorkItem[]) || [];
    setParams((s) => ({ ...s, [code]: np }));
    setWorkItems((s) => ({ ...s, [code]: nw }));
    setCounts((s) => ({ ...s, [code]: { p: np.length, w: nw.length } }));
  }

  async function updateParam(id: string, patch: Partial<OpParam>) {
    const { error } = await (supabase as any).from("operation_parameters").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (activeCode != null) await refreshActive(activeCode);
  }
  async function updateWork(id: string, patch: Partial<OpWorkItem>) {
    const { error } = await (supabase as any).from("operation_work_items").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (activeCode != null) await refreshActive(activeCode);
  }
  async function addParam() {
    if (activeCode == null) return;
    const rows = activeParams;
    const { error } = await (supabase as any).from("operation_parameters").insert({
      operation_code: activeCode,
      code: nextCode(rows),
      sort_order: nextOrder(rows),
      name: "Новый параметр",
      default_value: "0",
      formula: "",
      notes: "",
    });
    if (error) { toast.error(error.message); return; }
    await refreshActive(activeCode);
  }
  async function addWork() {
    if (activeCode == null) return;
    const rows = activeWork;
    const { error } = await (supabase as any).from("operation_work_items").insert({
      operation_code: activeCode,
      code: nextCode(rows),
      sort_order: nextOrder(rows),
      name: "Новая статья",
      price_source: "0",
      quantity_source: "0",
      notes: "",
    });
    if (error) { toast.error(error.message); return; }
    await refreshActive(activeCode);
  }
  async function deleteParam(id: string) {
    const { error } = await (supabase as any).from("operation_parameters").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (activeCode != null) await refreshActive(activeCode);
  }
  async function deleteWork(id: string) {
    const { error } = await (supabase as any).from("operation_work_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (activeCode != null) await refreshActive(activeCode);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Всего: <b className="text-foreground tabular-nums">{ops.length}</b></span>
        <span>•</span>
        <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> с формулами: <b className="text-foreground tabular-nums">{readyCount}</b></span>
        <span>•</span>
        <span className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-600" /> требуют заполнения: <b className="text-foreground tabular-nums">{ops.length - readyCount}</b></span>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию, категории или коду…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-md border bg-card max-h-[70vh] overflow-auto">
          <div className="p-1.5">
            {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка…</div>}
            {!loading && !groups.length && <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>}
            {groups.map(([cat, items]) => (
              <div key={cat} className="mb-1.5">
                <div className="sticky top-0 bg-card/95 backdrop-blur px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  {cat} <span className="text-muted-foreground/60 tabular-nums">({items.length})</span>
                </div>
                {items.map((o) => {
                  const isActive = o.code === activeCode;
                  const c = counts[o.code];
                  const ready = (c?.w || 0) > 0;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setActiveCode(o.code)}
                      className={`w-full text-left px-2 py-1 rounded-md text-[13px] flex items-center gap-2 transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {ready
                        ? <CheckCircle2 className={`h-3 w-3 shrink-0 ${isActive ? "opacity-90" : "text-emerald-600"}`} />
                        : <AlertCircle className={`h-3 w-3 shrink-0 ${isActive ? "opacity-90" : "text-amber-600"}`} />}
                      <span className="font-mono text-[10px] opacity-60 w-8 shrink-0 tabular-nums">{o.code}</span>
                      <span className="truncate flex-1">{o.name}</span>
                      {c && (
                        <span className={`text-[10px] font-mono tabular-nums px-1 rounded ${
                          isActive ? "bg-primary-foreground/15" : "text-muted-foreground bg-muted"
                        }`} title="параметры / статьи работ">
                          {c.p}·{c.w}
                        </span>
                      )}
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-card max-h-[70vh] overflow-auto">
          <div className="p-3">
            {!active && <div className="text-sm text-muted-foreground">Выберите операцию слева, чтобы увидеть её параметры и формулы</div>}
            {active && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">#{active.code}</Badge>
                    <Badge variant="secondary">{active.category}</Badge>
                    <Badge variant="outline">порядок {active.sort_order}</Badge>
                    {(counts[active.code]?.w || 0) > 0
                      ? <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> готова к расчёту</Badge>
                      : <Badge variant="outline" className="text-amber-700 border-amber-300 gap-1"><AlertCircle className="h-3 w-3" /> формулы не загружены</Badge>}
                  </div>
                  <div className="mt-2 text-base font-semibold">{active.name}</div>
                </div>

                {!activeParams.length && (
                  <div className="text-sm text-muted-foreground">Параметры для этой операции ещё не загружены.</div>
                )}
                {activeParams.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left p-2 w-12">#</th>
                          <th className="text-left p-2">Параметр</th>
                          <th className="text-left p-2">По умолчанию</th>
                          <th className="text-left p-2">Формула</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeParams.map((p) => (
                          <tr key={p.id} className="border-t align-top">
                            <td className="p-2 font-mono text-xs text-muted-foreground">{p.sort_order}</td>
                            <td className="p-2">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">код {p.code}</div>
                            </td>
                            <td className="p-2 text-xs font-mono whitespace-pre-wrap break-words">{p.default_value || "—"}</td>
                            <td className="p-2 text-xs font-mono whitespace-pre-wrap break-words">{p.formula || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeWork.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Стоимость работ</div>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left p-2 w-12">#</th>
                            <th className="text-left p-2">Статья</th>
                            <th className="text-left p-2">Цена</th>
                            <th className="text-left p-2">Количество</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeWork.map((w) => (
                            <tr key={w.id} className="border-t align-top">
                              <td className="p-2 font-mono text-xs text-muted-foreground">{w.sort_order}</td>
                              <td className="p-2">
                                <div className="font-medium">{w.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">код {w.code}</div>
                              </td>
                              <td className="p-2 text-xs font-mono whitespace-pre-wrap break-words">{w.price_source || "—"}</td>
                              <td className="p-2 text-xs font-mono whitespace-pre-wrap break-words">{w.quantity_source || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}