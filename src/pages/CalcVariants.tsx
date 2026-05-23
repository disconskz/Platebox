import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Copy, Trash2, Pencil, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import MobileTabBar from "@/components/MobileTabBar";
import { listVariants, createVariant, deleteVariant, duplicateVariant, setActiveVariant } from "@/lib/calc/variants/api";
import { PRODUCT_LABELS } from "@/lib/calc/products";
import { Badge } from "@/components/ui/badge";

type Row = Awaited<ReturnType<typeof listVariants>>[number];

export default function CalcVariants() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [base, setBase] = useState<string>("leaflet");
  const [delId, setDelId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try { setRows(await listVariants()); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const id = await createVariant({ name: name.trim(), base_product_type: base });
      setOpen(false); setName(""); setBase("leaflet");
      toast.success("Вариант создан");
      nav(`/references/variants/${id}`);
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const dup = async (id: string) => {
    try { const newId = await duplicateVariant(id); toast.success("Скопировано"); nav(`/references/variants/${newId}`); }
    catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const remove = async () => {
    if (!delId) return;
    try { await deleteVariant(delId); setDelId(null); toast.success("Удалено"); reload(); }
    catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const activate = async (id: string) => {
    try { await setActiveVariant(id); toast.success("Формула применяется в расчётах"); reload(); }
    catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar pb-32 md:pb-0">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex flex-wrap items-center gap-2 sm:gap-3 py-3 px-4">
          <Link to="/references" className="text-sm text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Справочники</span>
          </Link>
          <h1 className="text-base sm:text-lg font-semibold min-w-0 truncate">Варианты просчёта</h1>
          <div className="ml-auto">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Новый вариант</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
                <DialogHeader><DialogTitle>Новый вариант просчёта</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Название</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр.: Листовка А6 с перфорацией в блок" />
                  </div>
                  <div>
                    <Label>Базовый тип (для раскладки)</Label>
                    <Select value={base} onValueChange={setBase}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRODUCT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">От него зависит, какой алгоритм раскладки/оборота применяется для авто-переменных.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                  <Button onClick={create} disabled={!name.trim()}>Создать</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 sm:py-6 px-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Список вариантов</CardTitle></CardHeader>
          <CardContent className="px-3 sm:px-6">
            {loading ? (
              <div className="text-sm text-muted-foreground">Загрузка…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Пока нет ни одного варианта. Нажмите «Новый вариант», чтобы создать первый.
              </div>
            ) : (
              <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-2">Название</th>
                      <th className="py-2 pr-2">Базовый тип</th>
                      <th className="py-2 pr-2">Этапов</th>
                      <th className="py-2 pr-2">Создан</th>
                      <th className="py-2 pr-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/references/variants/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                            {(r as any).is_active && (
                              <Badge variant="default" className="bg-success/15 text-success hover:bg-success/20 border-success/30 gap-1">
                                <Zap className="h-3 w-3" /> Активная
                              </Badge>
                            )}
                          </div>
                          {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground">{PRODUCT_LABELS[r.base_product_type as keyof typeof PRODUCT_LABELS] || r.base_product_type}</td>
                        <td className="py-2 pr-2 tabular-nums">{r.stage_count}</td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">{(r as any).created_at ? new Date((r as any).created_at).toLocaleDateString("ru-RU") : ""}</td>
                        <td className="py-2 pr-2 text-right">
                          <div className="inline-flex gap-1">
                            {!(r as any).is_active && (
                              <Button size="sm" variant="ghost" aria-label="Применить" title="Применять эту формулу в расчётах" onClick={() => activate(r.id)}>
                                <Zap className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" aria-label="Редактировать" onClick={() => nav(`/references/variants/${r.id}`)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" aria-label="Дублировать" onClick={() => dup(r.id)}><Copy className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" aria-label="Удалить" onClick={() => setDelId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden grid gap-2">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Link to={`/references/variants/${r.id}`} className="font-medium text-sm hover:underline min-w-0 truncate">{r.name}</Link>
                        {(r as any).is_active && (
                          <Badge className="bg-success/15 text-success border-success/30 gap-1 h-5 px-1.5 text-[10px]">
                            <Zap className="h-2.5 w-2.5" /> Активная
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(r as any).created_at ? new Date((r as any).created_at).toLocaleDateString("ru-RU") : ""}
                      </span>
                    </div>
                    {r.description && <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {PRODUCT_LABELS[r.base_product_type as keyof typeof PRODUCT_LABELS] || r.base_product_type} · этапов {r.stage_count}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!(r as any).is_active && (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Применить" onClick={() => activate(r.id)}>
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Редактировать" onClick={() => nav(`/references/variants/${r.id}`)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Дублировать" onClick={() => dup(r.id)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 hover:text-destructive" aria-label="Удалить" onClick={() => setDelId(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить вариант?</AlertDialogTitle>
            <AlertDialogDescription>Все этапы варианта будут удалены без возможности восстановления.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileTabBar />
    </div>
  );
}