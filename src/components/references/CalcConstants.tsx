import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { listConstants, upsertConstant, deleteConstant } from "@/lib/calc/variants/api";
import { CalcConstant } from "@/lib/calc/variants/types";

export default function CalcConstants() {
  const [rows, setRows] = useState<CalcConstant[]>([]);
  const [draft, setDraft] = useState({ slug: "", name: "", value: 0, unit: "₸", description: "" });
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.slug.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const patchRow = (id: string, patch: Partial<CalcConstant>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по slug, названию или описанию…" className="h-8 pl-7" />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">{filtered.length} / {rows.length}</div>
        <Link to="/references/variants">
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Варианты просчёта
          </Button>
        </Link>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground sticky top-0">
            <tr>
              <th className="text-left p-2 w-40">Slug</th>
              <th className="text-left p-2">Название / описание</th>
              <th className="text-left p-2 w-28">Значение</th>
              <th className="text-left p-2 w-20">Ед.</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t bg-primary/5 align-top">
              <td className="p-1.5">
                <Input className="h-8 font-mono text-xs" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="form_cost" />
              </td>
              <td className="p-1.5 space-y-1">
                <Input className="h-8" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Стоимость формы" />
                <Input className="h-7 text-xs" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Описание (необязательно)" />
              </td>
              <td className="p-1.5">
                <Input className="h-8 tabular-nums" type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
              </td>
              <td className="p-1.5">
                <Input className="h-8" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              </td>
              <td className="p-1.5 text-right">
                <Button size="sm" onClick={add} className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> Добавить</Button>
              </td>
            </tr>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30 align-top">
                <td className="p-1.5 font-mono text-xs text-muted-foreground">{c.slug}</td>
                <td className="p-1.5 space-y-1">
                  <Input className="h-8" value={c.name} onChange={(e) => patchRow(c.id, { name: e.target.value })} onBlur={() => save(c)} />
                  <Input className="h-7 text-xs" value={c.description || ""} onChange={(e) => patchRow(c.id, { description: e.target.value })} onBlur={() => save(c)} placeholder="Описание" />
                </td>
                <td className="p-1.5">
                  <Input className="h-8 tabular-nums" type="number" value={c.value} onChange={(e) => patchRow(c.id, { value: Number(e.target.value) })} onBlur={() => save(c)} />
                </td>
                <td className="p-1.5">
                  <Input className="h-8" value={c.unit} onChange={(e) => patchRow(c.id, { unit: e.target.value })} onBlur={() => save(c)} />
                </td>
                <td className="p-1.5 text-right">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(c.id)} title="Удалить">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr className="border-t"><td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">Изменения сохраняются автоматически при потере фокуса.</p>
    </div>
  );
}
