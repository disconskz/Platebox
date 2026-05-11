import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABELS, GlossaryCategory, GlossaryItem, useProductGlossary } from "@/lib/glossary";
import { PRODUCT_LABELS } from "@/lib/calc/products";
import { useAuth } from "@/hooks/useAuth";

const CATEGORY_OPTS: GlossaryCategory[] = [
  "print_small","multipage","calendar","large_format","sticker","pos",
  "document","packaging_bag","packaging_box","souvenir","other",
];

const BASE_TYPE_OPTS = Object.keys(PRODUCT_LABELS);

export default function ProductGlossary() {
  const { items, reload } = useProductGlossary();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    (supabase as any).from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }: any) => setIsAdmin(!!data));
  }, [user]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Partial<GlossaryItem>>({
    slug: "", name: "", description: "", category: "other",
    base_product_type: null, is_calculable: false, sort_order: 100,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.slug.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
    );
  }, [items, search]);

  const addRow = async () => {
    if (!draft.slug || !draft.name) return toast.error("Укажите slug и название");
    const { error } = await (supabase as any).from("product_glossary").insert({
      ...draft,
      is_calculable: !!draft.base_product_type,
    });
    if (error) return toast.error(error.message);
    toast.success("Добавлено");
    setDraft({ slug: "", name: "", description: "", category: "other", base_product_type: null, is_calculable: false, sort_order: 100 });
    reload();
  };

  const update = async (row: GlossaryItem, patch: Partial<GlossaryItem>) => {
    const next = { ...row, ...patch, is_calculable: !!(patch.base_product_type ?? row.base_product_type) };
    const { error } = await (supabase as any).from("product_glossary").update(next).eq("id", row.id);
    if (error) return toast.error(error.message);
    reload();
  };

  const remove = async (row: GlossaryItem) => {
    if (!confirm(`Удалить «${row.name}»?`)) return;
    await (supabase as any).from("product_glossary").delete().eq("id", row.id);
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Поиск по названию или описанию…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} / {items.length}</div>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left p-2 w-32">Slug</th>
              <th className="text-left p-2 w-44">Название</th>
              <th className="text-left p-2">Описание</th>
              <th className="text-left p-2 w-44">Категория</th>
              <th className="text-left p-2 w-40">Базовый тип</th>
              <th className="text-left p-2 w-20">Расчёт</th>
              <th className="text-left p-2 w-20">Сорт.</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isAdmin && (
              <tr className="border-t bg-primary/5 align-top">
                <td className="p-1.5"><Input className="h-8" value={draft.slug ?? ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></td>
                <td className="p-1.5"><Input className="h-8" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
                <td className="p-1.5"><Textarea className="min-h-[36px] text-sm" rows={1} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></td>
                <td className="p-1.5">
                  <Select value={draft.category ?? "other"} onValueChange={(v) => setDraft({ ...draft, category: v as GlossaryCategory })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORY_OPTS.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-1.5">
                  <Select value={draft.base_product_type ?? "__none"} onValueChange={(v) => setDraft({ ...draft, base_product_type: v === "__none" ? null : (v as any) })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— по запросу —</SelectItem>
                      {BASE_TYPE_OPTS.map((t) => <SelectItem key={t} value={t}>{(PRODUCT_LABELS as any)[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1.5 text-xs text-muted-foreground">{draft.base_product_type ? "Авто" : "—"}</td>
                <td className="p-1.5"><Input className="h-8" type="number" value={draft.sort_order ?? 100} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></td>
                <td className="p-1.5 text-right"><Button size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5" /></Button></td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-t align-top">
                <td className="p-1.5 font-mono text-xs">{row.slug}</td>
                <td className="p-1.5">
                  <Input className="h-8" value={row.name} disabled={!isAdmin} onBlur={(e) => e.target.value !== row.name && update(row, { name: e.target.value })} onChange={() => {}} defaultValue={row.name} key={row.id + "n"} />
                </td>
                <td className="p-1.5">
                  <Textarea className="min-h-[36px] text-sm" rows={2} disabled={!isAdmin} defaultValue={row.description} onBlur={(e) => e.target.value !== row.description && update(row, { description: e.target.value })} key={row.id + "d"} />
                </td>
                <td className="p-1.5">
                  <Select value={row.category} onValueChange={(v) => update(row, { category: v as GlossaryCategory })} disabled={!isAdmin}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORY_OPTS.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-1.5">
                  <Select value={row.base_product_type ?? "__none"} onValueChange={(v) => update(row, { base_product_type: (v === "__none" ? null : v) as any })} disabled={!isAdmin}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— по запросу —</SelectItem>
                      {BASE_TYPE_OPTS.map((t) => <SelectItem key={t} value={t}>{(PRODUCT_LABELS as any)[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1.5"><Checkbox checked={row.is_calculable} disabled /></td>
                <td className="p-1.5"><Input className="h-8" type="number" defaultValue={row.sort_order} disabled={!isAdmin} onBlur={(e) => Number(e.target.value) !== row.sort_order && update(row, { sort_order: Number(e.target.value) })} key={row.id + "s"} /></td>
                <td className="p-1.5 text-right">{isAdmin && <Button size="sm" variant="outline" onClick={() => remove(row)}><Trash2 className="h-3.5 w-3.5" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isAdmin && <div className="text-xs text-muted-foreground">Только просмотр. Редактирование доступно администраторам.</div>}
    </div>
  );
}