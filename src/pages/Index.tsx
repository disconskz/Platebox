import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calculator as CalcIcon, FileText, Bookmark, Database, TrendingUp, Copy, Trash2, Search, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Calc = {
  id: string;
  name: string | null;
  product_type: string;
  circulation: number;
  total_cost: number | null;
  sale_price: number | null;
  is_template: boolean;
  created_at: string;
};

const PRODUCT_LABELS: Record<string, string> = {
  leaflet: "Листовка",
  leaflet_diecut: "Листовка с вырубкой",
  booklet: "Буклет",
  sticker: "Стикер",
  sticker_diecut: "Стикер с вырубкой",
  bag: "Пакет",
};

const Index = () => {
  const [calcs, setCalcs] = useState<Calc[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { user, signOut } = useAuth();

  const load = async () => {
    const { data } = await supabase.from("calculations").select("*").order("created_at", { ascending: false }).limit(200);
    setCalcs((data as Calc[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calcs;
    return calcs.filter((c) => (c.name || "").toLowerCase().includes(q) || (PRODUCT_LABELS[c.product_type] || "").toLowerCase().includes(q));
  }, [calcs, query]);

  const recent = filtered.filter((c) => !c.is_template);
  const templates = filtered.filter((c) => c.is_template);

  const remove = async (id: string) => {
    if (!confirm("Удалить расчёт?")) return;
    await supabase.from("calculation_items").delete().eq("calculation_id", id);
    await supabase.from("calculation_adjustments").delete().eq("calculation_id", id);
    const { error } = await supabase.from("calculations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Удалено"); load(); }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-elevated">
              <CalcIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight truncate">МАТ-Полиграф Калькулятор</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Просчёт полиграфической продукции</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link to="/analytics" className="flex-1 sm:flex-none"><Button variant="outline" className="w-full"><TrendingUp className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Аналитика</span><span className="sm:hidden">Аналитика</span></Button></Link>
            <Link to="/references" className="flex-1 sm:flex-none"><Button variant="outline" className="w-full"><Database className="mr-2 h-4 w-4" /> Справочники</Button></Link>
            <Link to="/calculator" className="flex-1 sm:flex-none"><Button className="w-full shadow-elevated"><Plus className="mr-2 h-4 w-4" /> Новый</Button></Link>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => signOut()} title={user?.email || ""}>
              <LogOut className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8 px-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Поиск по названию или виду продукции..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {templates.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Шаблоны</h2>
            </div>
            <CalcTable rows={templates} onRemove={remove} isTemplate />
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Последние расчёты</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : recent.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CalcIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Расчётов пока нет. Начните первый — это займёт 2-3 минуты.</p>
                <Link to="/calculator"><Button><Plus className="mr-2 h-4 w-4" /> Новый расчёт</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <CalcTable rows={recent} onRemove={remove} />
          )}
        </section>
      </main>
    </div>
  );
};

const CalcTable = ({ rows, onRemove, isTemplate }: { rows: Calc[]; onRemove: (id: string) => void; isTemplate?: boolean }) => (
  <>
  {/* Desktop table */}
  <div className="hidden md:block overflow-hidden rounded-lg border bg-card shadow-card">
    <div className="scroll-x overflow-x-auto"><table className="w-full text-sm">
      <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="text-left p-3">Название</th>
          <th className="text-left p-3">Продукция</th>
          <th className="text-right p-3">Тираж</th>
          <th className="text-right p-3">Себестоимость</th>
          <th className="text-right p-3">Цена продажи</th>
          <th className="text-right p-3">Дата</th>
          <th className="w-32"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id} className="border-t hover:bg-muted/30 group">
            <td className="p-3 font-medium"><Link to={`/calculation/${c.id}`} className="hover:text-primary">{c.name || "—"}</Link></td>
            <td className="p-3 text-muted-foreground">{PRODUCT_LABELS[c.product_type] || c.product_type}</td>
            <td className="p-3 text-right tabular-nums">{c.circulation}</td>
            <td className="p-3 text-right tabular-nums">{c.total_cost ? fmtMoney(Number(c.total_cost)) : "—"}</td>
            <td className="p-3 text-right tabular-nums font-semibold">{c.sale_price ? fmtMoney(Number(c.sale_price)) : "—"}</td>
            <td className="p-3 text-right text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ru-RU")}</td>
            <td className="p-2 text-right opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <div className="flex justify-end gap-1">
                <Link to={`/calculator?from=${c.id}`}>
                  <Button size="sm" variant="outline" className="h-8 px-2" title={isTemplate ? "Создать из шаблона" : "Дублировать"}>
                    {isTemplate ? <Sparkles className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="h-8 px-2 hover:text-destructive" onClick={() => onRemove(c.id)} title="Удалить">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  </div>
  {/* Mobile cards */}
  <div className="md:hidden grid gap-2">
    {rows.map((c) => (
      <div key={c.id} className="rounded-lg border bg-card p-3 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/calculation/${c.id}`} className="font-semibold text-sm flex-1 min-w-0 truncate hover:text-primary">{c.name || "—"}</Link>
          <span className="text-[10px] text-muted-foreground shrink-0">{new Date(c.created_at).toLocaleDateString("ru-RU")}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{PRODUCT_LABELS[c.product_type] || c.product_type} · тираж {c.circulation}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-xs">
            <span className="text-muted-foreground">с/с:</span> <span className="tabular-nums">{c.total_cost ? fmtMoney(Number(c.total_cost)) : "—"}</span>
            <span className="text-muted-foreground ml-2">прод:</span> <span className="font-semibold tabular-nums">{c.sale_price ? fmtMoney(Number(c.sale_price)) : "—"}</span>
          </div>
          <div className="flex gap-1 shrink-0">
            <Link to={`/calculator?from=${c.id}`}>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">{isTemplate ? <Sparkles className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Button>
            </Link>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 hover:text-destructive" onClick={() => onRemove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    ))}
  </div>
  </>
);

export default Index;
