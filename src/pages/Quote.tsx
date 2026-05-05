import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtNum } from "@/lib/format";

const STAGE_LABELS: Record<string, string> = {
  prepress: "Допечатные", material: "Материалы", print: "Печать", postpress: "Послепечатные", logistics: "Логистика",
};
const PRODUCT_LABELS: Record<string, string> = {
  leaflet: "Листовка", leaflet_diecut: "Листовка с вырубкой", booklet: "Буклет",
  sticker: "Стикер", sticker_diecut: "Стикер с вырубкой", bag: "Пакет",
};

const Quote = () => {
  const { id } = useParams();
  const [calc, setCalc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase.from("calculations").select("*").eq("id", id).single();
      const { data: it } = await supabase.from("calculation_items").select("*").eq("calculation_id", id).order("sort_order");
      setCalc(c);
      setItems(it || []);
    })();
  }, [id]);

  if (!calc) return <div className="p-8 text-center text-muted-foreground">Загрузка…</div>;

  const grouped = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.stage] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card no-print sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3 py-3">
          <Link to={`/calculation/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> К расчёту
          </Link>
          <div className="ml-auto">
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Печать / Сохранить PDF</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl py-8 print:py-2">
        <div className="bg-card rounded-lg border shadow-card p-8 print:p-0 print:border-0 print:shadow-none">
          <div className="flex items-start justify-between border-b pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Коммерческое предложение</h1>
              <p className="text-sm text-muted-foreground mt-1">Типография «Platebox»</p>
            </div>
            <div className="text-right text-sm">
              <div>№ {calc.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-muted-foreground">от {new Date(calc.created_at).toLocaleDateString("ru-RU")}</div>
            </div>
          </div>

          <h2 className="text-base font-semibold mb-2">{calc.name}</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-6">
            <Field k="Продукция" v={PRODUCT_LABELS[calc.product_type] || calc.product_type} />
            <Field k="Тираж" v={String(calc.circulation) + " шт"} />
            <Field k="Формат изделия" v={`${calc.format_type} (${calc.format_width}×${calc.format_height} мм)`} />
            <Field k="Цветность" v={`${calc.color_front}+${calc.color_back}`} />
            <Field k="Печатный формат" v={`${calc.print_format_width}×${calc.print_format_height} мм`} />
            <Field k="На листе" v={`${calc.items_per_sheet} шт`} />
          </div>

          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="text-left py-2">№</th>
                <th className="text-left py-2">Наименование</th>
                <th className="text-right py-2">Кол-во</th>
                <th className="text-left py-2 pl-2">Ед.</th>
                <th className="text-right py-2">Цена</th>
                <th className="text-right py-2">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let n = 0;
                return (Object.entries(grouped) as [string, any[]][]).map(([stage, list]) => (
                  <>
                    <tr key={stage}><td colSpan={6} className="pt-3 pb-1 text-xs uppercase font-semibold text-muted-foreground">{STAGE_LABELS[stage]}</td></tr>
                    {list.map((it) => {
                      n++;
                      return (
                        <tr key={it.id} className="border-b border-border/50">
                          <td className="py-1.5">{n}</td>
                          <td className="py-1.5">{it.name}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmtNum(Number(it.quantity))}</td>
                          <td className="py-1.5 pl-2 text-muted-foreground">{it.unit}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmtMoney(Number(it.unit_price))}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmtMoney(Number(it.total_price))}</td>
                        </tr>
                      );
                    })}
                  </>
                ));
              })()}
            </tbody>
          </table>

          <div className="ml-auto w-full max-w-sm space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Себестоимость:</span><span>{fmtMoney(Number(calc.total_cost))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Наценка:</span><span>{Number(calc.margin_percent)}%</span></div>
            <div className="flex justify-between border-t-2 border-foreground pt-2 text-lg font-bold">
              <span>Итого к оплате:</span><span>{fmtMoney(Number(calc.sale_price))}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Цена за единицу:</span><span>{fmtMoney(Number(calc.sale_price) / Math.max(1, calc.circulation))}</span>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t text-xs text-muted-foreground">
            <p>Срок изготовления уточняется отдельно. Цены действительны 14 дней с даты выставления КП.</p>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

const Field = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between border-b border-dashed border-border/60 py-1">
    <span className="text-muted-foreground">{k}:</span>
    <span className="font-medium">{v}</span>
  </div>
);

export default Quote;