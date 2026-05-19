import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Calculator as CalcIcon, FileText, Bookmark, Database, TrendingUp, Copy, Trash2, Search, Sparkles, LogOut, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataState } from "@/components/DataState";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import MobileTabBar from "@/components/MobileTabBar";
import { PRODUCT_LABELS } from "@/lib/calc/products";
import { createSupabaseTimeout, isAbortError } from "@/lib/supabase-timeout";
import { handleSupabaseError } from "@/lib/supabase-error";
import { ensureSupabaseSession } from "@/lib/auth-session";

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

const Index = () => {
  const [calcs, setCalcs] = useState<Calc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user, session, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const load = async () => {
    const restored = await ensureSupabaseSession();
    const token = restored?.access_token ?? session?.access_token;
    if (!token) {
      setLoadError("Сессия входа не восстановлена. Выйдите и войдите снова.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const timeout = createSupabaseTimeout();
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/calculations?select=*&order=created_at.desc&limit=200`;
      const res = await fetch(url, {
        signal: timeout.signal,
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCalcs((data as Calc[]) || []);
    } catch (e: unknown) {
      const message = isAbortError(e)
        ? "Сервер не ответил за 12 секунд. Попробуйте обновить список."
        : e instanceof Error ? e.message : "Неизвестная ошибка";
      console.error("[Index.load] calculations error:", e);
      setLoadError(message);
      toast.error("Не удалось загрузить расчёты: " + message);
    } finally {
      timeout.cancel();
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, session?.access_token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calcs;
    return calcs.filter((c) => (c.name || "").toLowerCase().includes(q) || (PRODUCT_LABELS[c.product_type] || "").toLowerCase().includes(q));
  }, [calcs, query]);

  const recent = filtered.filter((c) => !c.is_template);
  const templates = filtered.filter((c) => c.is_template);

  const remove = (id: string) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: itemsErr } = await supabase.from("calculation_items").delete().eq("calculation_id", deleteId);
    if (handleSupabaseError(itemsErr, "удаление позиций")) { setDeleting(false); return; }
    const { error: adjErr } = await supabase.from("calculation_adjustments").delete().eq("calculation_id", deleteId);
    if (handleSupabaseError(adjErr, "удаление истории")) { setDeleting(false); return; }
    const { error } = await supabase.from("calculations").delete().eq("id", deleteId);
    setDeleting(false);
    if (handleSupabaseError(error, "удаление расчёта")) return;
    toast.success("Удалено");
    setDeleteId(null);
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55 safe-top sticky top-0 z-30 shadow-[0_1px_0_hsl(var(--border)/0.6)]">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 py-3 px-4 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ring-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elevated transition-transform duration-300 hover:scale-105 hover:rotate-[-2deg]">
              <CalcIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight truncate text-shimmer">Platebox</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Просчёт полиграфической продукции</p>
            </div>
          </div>
          {/* Desktop nav only — mobile uses bottom tab-bar */}
          <div className="hidden md:flex gap-2">
            <Link to="/analytics"><Button variant="outline"><TrendingUp className="mr-2 h-4 w-4" /> Аналитика</Button></Link>
            <Link to="/references"><Button variant="outline"><Database className="mr-2 h-4 w-4" /> Справочники</Button></Link>
            <Link to="/calculator"><Button className="shadow-elevated"><Plus className="mr-2 h-4 w-4" /> Новый</Button></Link>
            <Button variant="outline" onClick={handleSignOut} title={user?.email || ""}>
              <LogOut className="mr-2 h-4 w-4" /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 sm:py-8 space-y-5 sm:space-y-8 px-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-11" placeholder="Поиск по названию или виду продукции…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {templates.length > 0 && (
          <section className="animate-fade-in">
            <div className="mb-3 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-accent animate-float-soft" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Шаблоны</h2>
            </div>
            <CalcTable rows={templates} onRemove={remove} isTemplate />
          </section>
        )}

        <section className="animate-fade-in">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Последние расчёты</h2>
          </div>
          <DataState
            loading={loading}
            error={loadError}
            empty={recent.length === 0}
            onRetry={load}
            variant="table"
            emptyTitle="Расчётов пока нет"
            emptyDescription="Начните первый — это займёт 2-3 минуты."
            emptyAction={
              <Link to="/calculator">
                <Button><Plus className="mr-2 h-4 w-4" /> Новый расчёт</Button>
              </Link>
            }
          >
            <CalcTable rows={recent} onRemove={remove} />
          </DataState>
        </section>
      </main>

      {/* Mobile FAB + Tab bar */}
      <Link to="/calculator" className="fab md:hidden" aria-label="Новый расчёт">
        <Plus className="h-5 w-5" /> Новый
      </Link>
      <MobileTabBar />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить расчёт?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Будут удалены позиции расчёта и история правок.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Удаление…" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CalcTable = ({ rows, onRemove, isTemplate }: { rows: Calc[]; onRemove: (id: string) => void; isTemplate?: boolean }) => (
  <>
  {/* Desktop table */}
  <div className="hidden md:block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-shadow duration-300 hover:shadow-elevated animate-fade-in">
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
          <tr key={c.id} className="border-t border-border/60 row-hover group transition-colors">
            <td className="p-3 font-medium"><Link to={`/calculation/${c.id}`} className="hover:text-primary">{c.name || "—"}</Link></td>
            <td className="p-3 text-muted-foreground">{PRODUCT_LABELS[c.product_type] || c.product_type}</td>
            <td className="p-3 text-right tabular-nums">{c.circulation}</td>
            <td className="p-3 text-right tabular-nums">{c.total_cost ? fmtMoney(Number(c.total_cost)) : "—"}</td>
            <td className="p-3 text-right tabular-nums font-semibold">{c.sale_price ? fmtMoney(Number(c.sale_price)) : "—"}</td>
            <td className="p-3 text-right text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ru-RU")}</td>
            <td className="p-2 text-right opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <div className="flex justify-end gap-1">
                <Link to={`/calculation/${c.id}`}>
                  <Button size="sm" variant="outline" className="h-8 px-2" title="Открыть">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </Link>
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
      <div key={c.id} className="rounded-xl border border-border/60 bg-card p-3 shadow-card lift-sm pressable animate-fade-in">
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
            <Link to={`/calculation/${c.id}`}>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0"><Eye className="h-3.5 w-3.5" /></Button>
            </Link>
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
