import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Search } from "lucide-react";

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

export default function OperationCatalog() {
  const [ops, setOps] = useState<Operation[]>([]);
  const [params, setParams] = useState<Record<number, OpParam[]>>({});
  const [activeCode, setActiveCode] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await ensureSupabaseSession();
      const { data } = await (supabase as any)
        .from("operation_catalog")
        .select("*")
        .order("sort_order")
        .order("name");
      setOps((data as Operation[]) || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeCode == null || params[activeCode]) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("operation_parameters")
        .select("*")
        .eq("operation_code", activeCode)
        .order("sort_order");
      setParams((p) => ({ ...p, [activeCode]: (data as OpParam[]) || [] }));
    })();
  }, [activeCode, params]);

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

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Виды работ ({ops.length}) с параметрами и формулами расчёта. Данные постепенно пополняются.
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию, категории или коду…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="max-h-[70vh] overflow-auto">
          <CardContent className="p-2">
            {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка…</div>}
            {!loading && !groups.length && <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>}
            {groups.map(([cat, items]) => (
              <div key={cat} className="mb-2">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{cat}</div>
                {items.map((o) => {
                  const isActive = o.code === activeCode;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setActiveCode(o.code)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-mono text-[11px] opacity-70 w-10 shrink-0">{o.code}</span>
                      <span className="truncate flex-1">{o.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="max-h-[70vh] overflow-auto">
          <CardContent className="p-4">
            {!active && <div className="text-sm text-muted-foreground">Выберите операцию слева, чтобы увидеть её параметры и формулы</div>}
            {active && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">#{active.code}</Badge>
                    <Badge variant="secondary">{active.category}</Badge>
                    <Badge variant="outline">порядок {active.sort_order}</Badge>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}