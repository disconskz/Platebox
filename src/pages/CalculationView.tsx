import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Check, X, FileText, Download, Copy, History, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtMoney, fmtNum } from "@/lib/format";
import { toast } from "sonner";
import { exportSpecToExcel } from "@/lib/export";
import { exportCalculationToPdf } from "@/lib/pdf-export";
import MobileTabBar from "@/components/MobileTabBar";
import { PRODUCT_LABELS } from "@/lib/calc/products";
import { HelpHint } from "@/components/HelpHint";

const STAGE_LABELS: Record<string, string> = {
  prepress: "Допечатные",
  material: "Материалы",
  print: "Печать",
  postpress: "Послепечатные",
  logistics: "Логистика",
};

const CalculationView = () => {
  const { id } = useParams();
  const [calc, setCalc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("calculations").select("*").eq("id", id).single();
    const { data: it } = await supabase.from("calculation_items").select("*").eq("calculation_id", id).order("sort_order");
    const { data: adj } = await supabase.from("calculation_adjustments").select("*").eq("calculation_id", id).order("created_at", { ascending: false });
    setCalc(c);
    setItems(it || []);
    setAdjustments(adj || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const totalCost = useMemo(() => items.reduce((s, i) => s + Number(i.total_price || 0), 0), [items]);
  const margin = Number(calc?.margin_percent || 30);
  const salePrice = totalCost * (1 + margin / 100);
  const profit = salePrice - totalCost;

  const startEdit = (item: any) => {
    setEditing(item.id);
    setEditValue(String(item.unit_price));
    setEditReason("");
  };

  const saveEdit = async (item: any) => {
    const newPrice = Number(editValue);
    const newTotal = newPrice * Number(item.quantity);
    const original = Number(item.unit_price);
    await supabase.from("calculation_items").update({ unit_price: newPrice, manual_price: newPrice, total_price: newTotal }).eq("id", item.id);
    if (newPrice !== original) {
      await supabase.from("calculation_adjustments").insert({
        calculation_id: id, item_name: item.name,
        original_price: original, adjusted_price: newPrice, reason: editReason || null,
      });
    }
    // recompute totals
    const newTotalCost = items.reduce((s, i) => s + (i.id === item.id ? newTotal : Number(i.total_price || 0)), 0);
    const newSale = newTotalCost * (1 + margin / 100);
    await supabase.from("calculations").update({
      total_cost: newTotalCost, sale_price: newSale, profit: newSale - newTotalCost,
    }).eq("id", id);
    setEditing(null);
    toast.success("Цена обновлена");
    load();
  };

  const updateMargin = async (m: number) => {
    const newSale = totalCost * (1 + m / 100);
    await supabase.from("calculations").update({ margin_percent: m, sale_price: newSale, profit: newSale - totalCost }).eq("id", id);
    setCalc({ ...calc, margin_percent: m, sale_price: newSale, profit: newSale - totalCost });
  };

  if (!calc) return <div className="p-8 text-center text-muted-foreground">Загрузка…</div>;

  const grouped = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.stage] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-2 py-3 px-4 flex-wrap">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">Все расчёты</span>
          </Link>
          <div className="ml-auto flex flex-wrap justify-end gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => exportSpecToExcel(calc?.name || "calc", items, { cost: totalCost, sale: salePrice, margin })}>
              <Download className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                await exportCalculationToPdf(calc, items, { cost: totalCost, sale: salePrice, margin, profit });
              } catch (e: any) {
                toast.error("Не удалось создать PDF: " + (e?.message || ""));
              }
            }}>
              <FileDown className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Link to={`/calculator?from=${id}`}>
              <Button variant="outline" size="sm"><Copy className="sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Дублировать</span></Button>
            </Link>
            <Link to={`/calculation/${id}/quote`}>
              <Button variant="outline" size="sm"><FileText className="sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">КП</span></Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-4 sm:py-6 px-4 grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <Card>
            <CardHeader className="pb-2"><CardTitle>{calc.name}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Продукция" value={PRODUCT_LABELS[calc.product_type] || calc.product_type} />
              <Stat label="Тираж" value={String(calc.circulation)} />
              <Stat label="Формат" value={`${calc.format_type} ${calc.format_width}×${calc.format_height}`} />
              <Stat label="Цветность" value={`${calc.color_front}+${calc.color_back}`} />
              <Stat label="Печ. формат" value={`${calc.print_format_width}×${calc.print_format_height}`} />
              {calc.purchase_format_width && calc.purchase_format_height && (
                <Stat label="Закуп. формат" value={`${calc.purchase_format_width}×${calc.purchase_format_height}`} />
              )}
              <Stat label="На листе" value={`${calc.items_per_sheet} шт`} />
              <Stat label="Оборот" value={calc.turnaround_type === "none" ? "Без" : calc.turnaround_type === "own" ? "Свой" : "Чужой"} />
              <Stat label="Форм" value={String(calc.forms_count)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                Спецификация
                <HelpHint title="Спецификация" learnMore="list-edit">
                  Постатейный расклад себестоимости. Любую цену можно поправить вручную — изменение попадёт в историю правок.
                </HelpHint>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="scroll-x overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Статья</th>
                      <th className="text-right p-2 w-24">Кол-во</th>
                      <th className="text-left p-2 w-16">Ед.</th>
                      <th className="text-right p-2 w-32">Цена</th>
                      <th className="text-right p-2 w-32">Сумма</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(grouped) as [string, any[]][]).map(([stage, list]) => (
                      <>
                        <tr key={stage} className="bg-secondary/40">
                          <td colSpan={6} className="p-2 text-xs font-semibold uppercase">{STAGE_LABELS[stage]}</td>
                        </tr>
                        {list.map((it) => (
                          <tr key={it.id} className="border-t group hover:bg-muted/30">
                            <td className="p-2">
                              {it.name}
                              {it.manual_price !== null && it.manual_price !== undefined && <span className="ml-2 text-[10px] uppercase text-warning">правка</span>}
                            </td>
                            <td className="p-2 text-right tabular-nums">{fmtNum(Number(it.quantity))}</td>
                            <td className="p-2 text-muted-foreground">{it.unit}</td>
                            <td className="p-2 text-right tabular-nums">
                              {editing === it.id ? (
                                <div className="flex flex-col gap-1">
                                  <Input className="h-7 text-right" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                                  <Input className="h-7 text-xs" placeholder="Причина" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
                                </div>
                              ) : fmtMoney(Number(it.unit_price))}
                            </td>
                            <td className="p-2 text-right tabular-nums font-medium">{fmtMoney(Number(it.total_price))}</td>
                            <td className="p-2 text-right">
                              {editing === it.id ? (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => saveEdit(it)}><Check className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEditing(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => startEdit(it)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                    <tr className="border-t-2 bg-primary/5">
                      <td colSpan={4} className="p-2 text-right font-semibold">Итого себестоимость</td>
                      <td className="p-2 text-right font-bold tabular-nums">{fmtMoney(totalCost)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> История правок ({adjustments.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>{showHistory ? "Скрыть" : "Показать"}</Button>
            </CardHeader>
            {showHistory && (
              <CardContent>
                {adjustments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Правок пока нет.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="text-left p-2">Дата</th>
                          <th className="text-left p-2">Статья</th>
                          <th className="text-right p-2">Было</th>
                          <th className="text-right p-2">Стало</th>
                          <th className="text-left p-2">Причина</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.map((a) => (
                          <tr key={a.id} className="border-t">
                            <td className="p-2 text-muted-foreground">{new Date(a.created_at).toLocaleString("ru-RU")}</td>
                            <td className="p-2">{a.item_name}</td>
                            <td className="p-2 text-right tabular-nums">{fmtMoney(Number(a.original_price || 0))}</td>
                            <td className="p-2 text-right tabular-nums font-medium">{fmtMoney(Number(a.adjusted_price || 0))}</td>
                            <td className="p-2 text-muted-foreground">{a.reason || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20 shadow-elevated order-1 lg:order-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              Итоги
              <HelpHint title="Итоги" learnMore="calc-margin">
                Цена продажи = себестоимость × (1 + наценка/100). Меняйте процент — пересчёт мгновенный.
              </HelpHint>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Себестоимость" value={fmtMoney(totalCost)} />
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Наценка, %</span></div>
              <Input type="number" value={margin} onChange={(e) => updateMargin(Number(e.target.value))} />
            </div>
            <Row label="Цена продажи" value={fmtMoney(salePrice)} bold />
            <Row label="Прибыль" value={fmtMoney(profit)} className="text-success" />
            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
              <div>За шт (с/с): <span className="text-foreground font-medium">{fmtMoney(totalCost / Math.max(1, calc.circulation))}</span></div>
              <div>За шт (продажа): <span className="text-foreground font-medium">{fmtMoney(salePrice / Math.max(1, calc.circulation))}</span></div>
            </div>
          </CardContent>
        </Card>
      </main>
      <MobileTabBar />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card px-3 py-2 shadow-card">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);

const Row = ({ label, value, className = "", bold }: { label: string; value: string; className?: string; bold?: boolean }) => (
  <div className={`flex items-center justify-between text-sm ${className}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className={bold ? "text-base font-bold text-foreground" : "font-medium text-foreground"}>{value}</span>
  </div>
);

export default CalculationView;