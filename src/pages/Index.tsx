import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calculator as CalcIcon, FileText, Bookmark, Database, TrendingUp, Copy, Trash2, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

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
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-elevated">
              <CalcIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">МАТ-Полиграф Калькулятор</h1>
              <p className="text-xs text-muted-foreground">Просчёт полиграфической продукции</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/analytics"><Button variant="outline" size="lg"><TrendingUp className="mr-2 h-4 w-4" /> Аналитика</Button></Link>
            <Link to="/references"><Button variant="outline" size="lg"><Database className="mr-2 h-4 w-4" /> Справочники</Button></Link>
            <Link to="/calculator"><Button size="lg" className="shadow-elevated"><Plus className="mr-2 h-4 w-4" /> Новый расчёт</Button></Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 space-y-8">
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
  <div className="overflow-hidden rounded-lg border bg-card shadow-card">
    <table className="w-full text-sm">
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
            <td className="p-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
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
    </table>
  </div>
);

export default Index;
