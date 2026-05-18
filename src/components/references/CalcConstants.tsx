import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { listConstants, upsertConstant, deleteConstant } from "@/lib/calc/variants/api";
import { CalcConstant } from "@/lib/calc/variants/types";

export default function CalcConstants() {
  const [rows, setRows] = useState<CalcConstant[]>([]);
  const [draft, setDraft] = useState({ slug: "", name: "", value: 0, unit: "₸", description: "" });

  const reload = async () => setRows(await listConstants());
  useEffect(() => { reload(); }, []);

  const save = async (c: CalcConstant) => {
    try {
      await upsertConstant({ slug: c.slug, name: c.name, value: Number(c.value) || 0, unit: c.unit, description: c.description, sort_order: c.sort_order });
      toast.success("Сохранено");
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const add = async () => {
    if (!draft.slug.trim() || !draft.name.trim()) { toast.error("Slug и название обязательны"); return; }
    try {
      await upsertConstant({ ...draft, value: Number(draft.value) || 0 });
      setDraft({ slug: "", name: "", value: 0, unit: "₸", description: "" });
      reload();
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить константу?")) return;
    try { await deleteConstant(id); reload(); } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Глобальные ставки и нормативы для формул конструктора (например, стоимость формы, расход краски).
        </div>
        <Link to="/references/variants">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Варианты просчёта
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Добавить константу</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-5">
            <div><Label className="text-xs">Slug</Label><Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="form_cost" /></div>
            <div><Label className="text-xs">Название</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Стоимость формы" /></div>
            <div><Label className="text-xs">Значение</Label><Input type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Ед.</Label><Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
            <div className="flex items-end"><Button onClick={add} className="w-full gap-1"><Plus className="h-4 w-4" /> Добавить</Button></div>
          </div>
          <div className="mt-2"><Label className="text-xs">Описание</Label><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-4 grid gap-2 sm:grid-cols-[160px_1fr_120px_80px_auto]">
              <div><Label className="text-xs">Slug</Label><Input value={c.slug} disabled className="font-mono text-xs" /></div>
              <div><Label className="text-xs">Название</Label><Input value={c.name} onChange={(e) => setRows(rows.map((r) => r.id === c.id ? { ...r, name: e.target.value } : r))} /></div>
              <div><Label className="text-xs">Значение</Label><Input type="number" value={c.value} onChange={(e) => setRows(rows.map((r) => r.id === c.id ? { ...r, value: Number(e.target.value) } : r))} /></div>
              <div><Label className="text-xs">Ед.</Label><Input value={c.unit} onChange={(e) => setRows(rows.map((r) => r.id === c.id ? { ...r, unit: e.target.value } : r))} /></div>
              <div className="flex items-end gap-1">
                <Button size="sm" onClick={() => save(c)}>Сохранить</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              {c.description && <div className="sm:col-span-5 text-xs text-muted-foreground">{c.description}</div>}
            </CardContent>
          </Card>
        ))}
        {!rows.length && <div className="text-sm text-muted-foreground text-center py-8">Пока нет констант</div>}
      </div>
    </div>
  );
}
