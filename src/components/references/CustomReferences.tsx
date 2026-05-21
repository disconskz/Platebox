import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { HelpHint } from "@/components/HelpHint";
import { ListPagination } from "./ListPagination";

type FieldDef = { key: string; label: string; type: "text" | "number" | "select"; opts?: string[] };
type CustomRef = { id: string; slug: string; name: string; fields: FieldDef[]; sort_order: number };
type Row = { id: string; reference_id: string; data: Record<string, any>; sort_order: number };

export default function CustomReferences() {
  const [refs, setRefs] = useState<CustomRef[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadRefs = async () => {
    const { data } = await (supabase as any).from("custom_references").select("*").order("sort_order");
    setRefs((data as any) || []);
    if (!active && data && data.length) setActive(data[0].id);
  };
  const loadRows = async (refId: string) => {
    const { data } = await (supabase as any).from("custom_reference_rows").select("*").eq("reference_id", refId).order("sort_order");
    setRows((data as any) || []);
  };

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { if (active) loadRows(active); setPage(1); }, [active]);
  useEffect(() => { setPage(1); }, [pageSize]);

  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  const activeRef = refs.find((r) => r.id === active);

  const addRow = async () => {
    if (!active) return;
    const { error } = await (supabase as any).from("custom_reference_rows").insert({ reference_id: active, data: draft });
    if (error) return toast.error(error.message);
    setDraft({});
    loadRows(active);
  };
  const updateRow = async (row: Row, key: string, v: any) => {
    const next = { ...row.data, [key]: v };
    setRows(rows.map((r) => r.id === row.id ? { ...r, data: next } : r));
    await (supabase as any).from("custom_reference_rows").update({ data: next }).eq("id", row.id);
  };
  const removeRow = async (row: Row) => {
    await (supabase as any).from("custom_reference_rows").delete().eq("id", row.id);
    if (active) loadRows(active);
  };
  const duplicateRow = async (row: Row) => {
    if (!active) return;
    await (supabase as any).from("custom_reference_rows").insert({ reference_id: active, data: row.data, sort_order: row.sort_order + 1 });
    loadRows(active);
  };
  const removeRef = async () => {
    if (!active) return;
    if (!confirm("Удалить справочник со всеми строками?")) return;
    await (supabase as any).from("custom_references").delete().eq("id", active);
    setActive(null);
    loadRefs();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={active ?? ""} onValueChange={setActive}>
          <SelectTrigger className="w-64 h-8"><SelectValue placeholder="Выберите справочник" /></SelectTrigger>
          <SelectContent>
            {refs.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {activeRef && (
          <div className="text-xs text-muted-foreground tabular-nums">{rows.length} записей · {activeRef.fields.length} полей</div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <HelpHint title="Свои справочники" learnMore="custom-create">
            <p>Произвольные таблицы для ваших процессов. Поля: текст, число или список значений.</p>
            <p>Эти данные не участвуют в формулах калькулятора напрямую — это ваш «карман» внутри Platebox.</p>
          </HelpHint>
          <NewReferenceDialog onCreated={loadRefs} />
          {activeRef && (
            <Button variant="outline" size="sm" className="h-8" onClick={removeRef}><Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить</Button>
          )}
        </div>
      </div>

      {activeRef ? (
        <>
        <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {activeRef.fields.map((f) => <th key={f.key} className="text-left p-2">{f.label}</th>)}
                    <th className="w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t bg-primary/5">
                    {activeRef.fields.map((f) => (
                      <td key={f.key} className="p-1.5">
                        <FieldInput field={f} value={draft[f.key] ?? ""} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
                      </td>
                    ))}
                    <td className="p-1.5 text-right"><Button size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      {activeRef.fields.map((f) => (
                        <td key={f.key} className="p-1.5">
                          <FieldInput field={f} value={row.data[f.key] ?? ""} onChange={(v) => updateRow(row, f.key, v)} />
                        </td>
                      ))}
                      <td className="p-1.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => duplicateRow(row)} title="Дублировать">⎘</Button>
                          <Button size="sm" variant="outline" onClick={() => removeRow(row)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr className="border-t"><td colSpan={activeRef.fields.length + 1} className="p-4 text-center text-xs text-muted-foreground">Нет записей</td></tr>
                  )}
                </tbody>
              </table>
        </div>
        <ListPagination
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
        </>
      ) : (
        <div className="text-sm text-muted-foreground p-6 border rounded-md text-center">
          Создайте свой справочник кнопкой выше.
        </div>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  if (field.type === "select") {
    return (
      <Select value={String(value ?? "")} onValueChange={onChange}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{(field.opts || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  return (
    <Input
      className="h-8"
      type={field.type === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
    />
  );
}

function NewReferenceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([{ key: "name", label: "Название", type: "text" }]);

  const addField = () => setFields([...fields, { key: `field${fields.length + 1}`, label: "Поле", type: "text" }]);
  const updateField = (i: number, patch: Partial<FieldDef>) => setFields(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim() || !slug.trim()) return toast.error("Укажите имя и slug");
    const { error } = await (supabase as any).from("custom_references").insert({ name, slug, fields });
    if (error) return toast.error(error.message);
    toast.success("Справочник создан");
    setOpen(false); setName(""); setSlug(""); setFields([{ key: "name", label: "Название", type: "text" }]);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Создать справочник</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Новый справочник</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Название</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Поставщики" /></div>
            <div><Label className="text-xs">Slug (латиница)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9_]/g, ""))} placeholder="suppliers" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Поля</Label>
              <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3.5 w-3.5 mr-1" /> Поле</Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto">
              {fields.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_auto] gap-1 items-center">
                  <Input className="h-8" placeholder="key" value={f.key} onChange={(e) => updateField(i, { key: e.target.value.replace(/[^a-z0-9_]/g, "") })} />
                  <Input className="h-8" placeholder="Подпись" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} />
                  <Select value={f.type} onValueChange={(v) => updateField(i, { type: v as any })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Текст</SelectItem>
                      <SelectItem value="number">Число</SelectItem>
                      <SelectItem value="select">Список</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => removeField(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={submit}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}