import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listConstants, upsertConstant, deleteConstant } from "@/lib/calc/variants/api";
import { CalcConstant } from "@/lib/calc/variants/types";
import { ListPagination } from "./ListPagination";

const UNIT_GROUPS: Array<{ key: string; label: string; match: (u: string) => boolean }> = [
  { key: "money", label: "Деньги (₸)", match: (u) => /₸|тг|kzt/i.test(u) },
  { key: "percent", label: "Проценты (%)", match: (u) => u.includes("%") },
  { key: "area", label: "Площадь / расход (см², г, мл)", match: (u) => /см|мм|м²|г|мл|kg|кг|л\b/i.test(u) },
  { key: "qty", label: "Количество (шт, лист)", match: (u) => /шт|лист|оттиск|форм/i.test(u) },
];
const OTHER_GROUP = { key: "other", label: "Прочее" };

function groupOf(unit: string): string {
  const u = (unit || "").trim();
  for (const g of UNIT_GROUPS) if (g.match(u)) return g.key;
  return OTHER_GROUP.key;
}

const UNIT_PRESETS = ["₸", "%", "₸/см²", "₸/оттиск", "₸/лист", "г", "г/0.7м²", "см²", "шт"];

export default function CalcConstants() {
  const [rows, setRows] = useState<CalcConstant[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ slug: "", name: "", value: 0, unit: "₸", description: "" });

  const reload = async () => setRows(await listConstants());
  useEffect(() => { reload(); }, []);

  const save = async (c: CalcConstant) => {
    try {
      await upsertConstant({ slug: c.slug, name: c.name, value: Number(c.value) || 0, unit: c.unit, description: c.description, sort_order: c.sort_order });
      setSavedId(c.id);
      setTimeout(() => setSavedId((id) => (id === c.id ? null : id)), 1200);
    } catch (e: any) { toast.error(e.message || "Ошибка"); }
  };

  const add = async () => {
    if (!draft.slug.trim() || !draft.name.trim()) { toast.error("Slug и название обязательны"); return; }
    if (rows.some((r) => r.slug === draft.slug.trim())) { toast.error("Slug уже используется"); return; }
    try {
      await upsertConstant({ ...draft, slug: draft.slug.trim(), value: Number(draft.value) || 0 });
      setDraft({ slug: "", name: "", value: 0, unit: "₸", description: "" });
      setAddOpen(false);
      await reload();
      toast.success("Константа добавлена");
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

  useEffect(() => { setPage(1); }, [search, pageSize]);
  const pagedFiltered = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, CalcConstant[]>();
    for (const r of pagedFiltered) {
      const k = groupOf(r.unit || "");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    const order = [...UNIT_GROUPS.map((g) => g.key), OTHER_GROUP.key];
    return order
      .map((k) => ({
        key: k,
        label: UNIT_GROUPS.find((g) => g.key === k)?.label ?? OTHER_GROUP.label,
        items: map.get(k) || [],
      }))
      .filter((g) => g.items.length > 0);
  }, [pagedFiltered]);

  const patchRow = (id: string, patch: Partial<CalcConstant>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по slug, названию или описанию…"
            className="h-9 pl-8 pr-8"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
              aria-label="Очистить"
            ><X className="h-3.5 w-3.5" /></button>
          )}
        </div>
        <Badge variant="secondary" className="font-mono text-[11px] h-6">
          {filtered.length}{search ? ` / ${rows.length}` : ""}
        </Badge>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5"><Plus className="h-4 w-4" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Новая константа</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Slug (идентификатор)</Label>
                <Input
                  autoFocus
                  className="h-9 font-mono text-sm mt-1"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
                  placeholder="form_cost"
                />
                <p className="text-[11px] text-muted-foreground mt-1">только латиница, цифры и _; используется в формулах</p>
              </div>
              <div>
                <Label className="text-xs">Название</Label>
                <Input className="h-9 mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Стоимость формы" />
              </div>
              <div className="grid grid-cols-[1fr_140px] gap-2">
                <div>
                  <Label className="text-xs">Значение</Label>
                  <Input className="h-9 mt-1 tabular-nums" type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Единица</Label>
                  <Input className="h-9 mt-1" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} list="unit-presets" />
                  <datalist id="unit-presets">
                    {UNIT_PRESETS.map((u) => <option key={u} value={u} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <Label className="text-xs">Описание (необязательно)</Label>
                <Textarea className="mt-1 min-h-[60px] text-sm" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Где и как используется" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Отмена</Button>
              <Button onClick={add}>Добавить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {!filtered.length && (
        <div className="rounded-lg border border-dashed bg-muted/20 py-10 text-center text-sm text-muted-foreground">
          {search ? "Ничего не найдено" : "Пока нет констант. Нажмите «Добавить»."}
        </div>
      )}

      {/* Grouped cards */}
      {grouped.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h3>
            <span className="text-[11px] text-muted-foreground/70 tabular-nums">{g.items.length}</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          <div className="rounded-lg border bg-card divide-y">
            {g.items.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto_auto] gap-2 md:gap-3 p-2.5 items-start hover:bg-muted/20 transition-colors"
              >
                {/* Slug pill */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/80 truncate" title={c.slug}>
                    {c.slug}
                  </code>
                  {savedId === c.id && (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>

                {/* Name + description */}
                <div className="space-y-1 min-w-0">
                  <Input
                    className="h-8 font-medium"
                    value={c.name}
                    onChange={(e) => patchRow(c.id, { name: e.target.value })}
                    onBlur={() => save(c)}
                  />
                  <Input
                    className="h-7 text-xs text-muted-foreground"
                    value={c.description || ""}
                    onChange={(e) => patchRow(c.id, { description: e.target.value })}
                    onBlur={() => save(c)}
                    placeholder="Описание / где используется"
                  />
                </div>

                {/* Value + unit */}
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 w-24 tabular-nums text-right font-semibold"
                    type="number"
                    value={c.value}
                    onChange={(e) => patchRow(c.id, { value: Number(e.target.value) })}
                    onBlur={() => save(c)}
                  />
                  <Input
                    className="h-8 w-20 text-xs text-muted-foreground"
                    value={c.unit}
                    onChange={(e) => patchRow(c.id, { unit: e.target.value })}
                    onBlur={() => save(c)}
                    list="unit-presets-row"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(c.id)}
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <datalist id="unit-presets-row">
        {UNIT_PRESETS.map((u) => <option key={u} value={u} />)}
      </datalist>

      <ListPagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <p className="text-[11px] text-muted-foreground px-1">
        Изменения сохраняются автоматически при потере фокуса. <Check className="inline h-3 w-3 text-emerald-500" /> — успешно сохранено.
      </p>
    </div>
  );
}
