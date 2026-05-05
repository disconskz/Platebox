import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MobileTabBar from "@/components/MobileTabBar";
import { PRODUCT_LABELS } from "@/lib/calc/products";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--primary-glow))", "hsl(var(--destructive))"];

const Analytics = () => {
  const [calcs, setCalcs] = useState<any[]>([]);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const { data } = await supabase
        .from("calculations")
        .select("*")
        .eq("is_template", false)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      setCalcs(data || []);
    })();
  }, [period]);

  const stats = useMemo(() => {
    const totalSale = calcs.reduce((s, c) => s + Number(c.sale_price || 0), 0);
    const totalCost = calcs.reduce((s, c) => s + Number(c.total_cost || 0), 0);
    const totalProfit = totalSale - totalCost;
    const avgMargin = calcs.length ? calcs.reduce((s, c) => s + Number(c.margin_percent || 0), 0) / calcs.length : 0;
    return { count: calcs.length, totalSale, totalCost, totalProfit, avgMargin };
  }, [calcs]);

  const byProduct = useMemo(() => {
    const m: Record<string, { name: string; profit: number; count: number }> = {};
    calcs.forEach((c) => {
      const k = PRODUCT_LABELS[c.product_type] || c.product_type;
      m[k] ||= { name: k, profit: 0, count: 0 };
      m[k].profit += Number(c.profit || 0);
      m[k].count += 1;
    });
    return Object.values(m);
  }, [calcs]);

  const byDay = useMemo(() => {
    const m: Record<string, { date: string; sale: number; cost: number }> = {};
    calcs.forEach((c) => {
      const d = new Date(c.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
      m[d] ||= { date: d, sale: 0, cost: 0 };
      m[d].sale += Number(c.sale_price || 0);
      m[d].cost += Number(c.total_cost || 0);
    });
    return Object.values(m);
  }, [calcs]);

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-2 py-3 px-4 flex-wrap">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">На главную</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium hidden sm:inline">Аналитика</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
                <SelectItem value="90">90 дней</SelectItem>
                <SelectItem value="365">1 год</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-4 sm:py-6 px-4 space-y-4 sm:space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KPI label="Расчётов" value={String(stats.count)} />
          <KPI label="Выручка" value={fmtMoney(stats.totalSale)} />
          <KPI label="Себестоимость" value={fmtMoney(stats.totalCost)} />
          <KPI label="Прибыль" value={fmtMoney(stats.totalProfit)} accent="success" />
          <KPI label="Средняя наценка" value={`${stats.avgMargin.toFixed(1)}%`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Динамика выручка / себестоимость</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" name="Себестоимость" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="sale" name="Продажа" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Прибыль по видам продукции</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byProduct} dataKey="profit" nameKey="name" outerRadius={100} label>
                    {byProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2"><CardTitle className="text-base">По видам продукции</CardTitle></CardHeader>
          <CardContent className="scroll-x overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Продукция</th>
                  <th className="text-right p-2">Заказов</th>
                  <th className="text-right p-2">Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((r) => (
                  <tr key={r.name} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-right tabular-nums">{r.count}</td>
                    <td className="p-2 text-right tabular-nums font-medium">{fmtMoney(r.profit)}</td>
                  </tr>
                ))}
                {!byProduct.length && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Нет данных за период</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
      <MobileTabBar />
    </div>
  );
};

const KPI = ({ label, value, accent }: { label: string; value: string; accent?: "success" }) => (
  <Card>
    <CardContent className="py-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold ${accent === "success" ? "text-success" : "text-foreground"}`}>{value}</div>
    </CardContent>
  </Card>
);

export default Analytics;