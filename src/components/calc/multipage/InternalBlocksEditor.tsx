import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Layers, Plus, Trash2 } from "lucide-react";
import {
  BLOCK_KIND_LABELS,
  type BlockKind,
  type InternalBlock,
  type PrintKindLocal,
  makeDefaultBlock,
} from "@/lib/calc/multipage/blocks";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";

export interface InternalBlocksEditorProps {
  blocks: InternalBlock[];
  onChange: (next: InternalBlock[]) => void;
}

/**
 * Редактор внутренних блоков многостраничного изделия.
 * Этап 2 переработки ERP-архитектуры.
 */
export default function InternalBlocksEditor({ blocks, onChange }: InternalBlocksEditorProps) {
  const ctx = useMultipageCalcOptional();
  const globalPrint = ctx?.global.printType;

  const patch = (id: string, p: Partial<InternalBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= blocks.length) return;
    const next = blocks.slice();
    [next[idx], next[ni]] = [next[ni], next[idx]];
    onChange(next);
  };

  const add = () =>
    onChange([
      ...blocks,
      makeDefaultBlock({
        kind: blocks.length === 0 ? "main" : "insert",
        pages: 4,
      }),
    ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          Внутренние блоки
          <Badge variant="secondary" className="ml-1">{blocks.length}</Badge>
        </CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить блок
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocks.length === 0 && (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Нет блоков. Нажмите «Добавить блок», чтобы создать первый.
          </div>
        )}

        {blocks.map((b, i) => {
          const effectivePrint: PrintKindLocal =
            !b.override && globalPrint ? (globalPrint as PrintKindLocal) : b.printType;
          return (
            <div key={b.id} className="rounded-lg border bg-card/50 p-3 space-y-3">
              {/* Шапка блока */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">#{i + 1}</Badge>
                  <Select value={b.kind} onValueChange={(v) => patch(b.id, { kind: v as BlockKind })}>
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BLOCK_KIND_LABELS) as BlockKind[]).map((k) => (
                        <SelectItem key={k} value={k}>{BLOCK_KIND_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(b.id, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === blocks.length - 1} onClick={() => move(b.id, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Поля блока */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Бумага</Label>
                  <Input value={b.paper} onChange={(e) => patch(b.id, { paper: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Плотность, г/м²</Label>
                  <Input
                    type="number"
                    min={40}
                    max={400}
                    value={b.density}
                    onChange={(e) => patch(b.id, { density: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Страниц в блоке</Label>
                  <Input
                    type="number"
                    min={1}
                    value={b.pages}
                    onChange={(e) => patch(b.id, { pages: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Цветность лицо/оборот</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={6}
                      value={b.colorFront}
                      onChange={(e) => patch(b.id, { colorFront: Number(e.target.value) || 0 })}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      min={0}
                      max={6}
                      value={b.colorBack}
                      onChange={(e) => patch(b.id, { colorBack: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Переопределение глобальных параметров */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`override-${b.id}`}
                    checked={b.override}
                    onCheckedChange={(v) => patch(b.id, { override: !!v })}
                  />
                  <Label htmlFor={`override-${b.id}`} className="cursor-pointer text-xs">
                    Переопределить параметры блока
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Печать</Label>
                  <Select
                    value={effectivePrint}
                    disabled={!b.override}
                    onValueChange={(v) => patch(b.id, { printType: v as PrintKindLocal })}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Авто</SelectItem>
                      <SelectItem value="offset">Офсет</SelectItem>
                      <SelectItem value="digital">Цифровая</SelectItem>
                      <SelectItem value="uv">UV</SelectItem>
                    </SelectContent>
                  </Select>
                  {!b.override && globalPrint && (
                    <span className="text-[11px] text-muted-foreground">← из глобальных</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}