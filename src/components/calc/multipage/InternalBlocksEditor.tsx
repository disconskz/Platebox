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
import { BlockFormulas } from "./OperationFormulaRow";
import type { SpecLine } from "./CostByStageBlock";

export interface InternalBlocksEditorProps {
  blocks: InternalBlock[];
  onChange: (next: InternalBlock[]) => void;
  /** Полная спецификация расчёта — для показа формул в каждой карточке блока. */
  spec?: SpecLine[];
}

/**
 * Редактор внутренних блоков многостраничного изделия.
 * Этап 2 переработки ERP-архитектуры.
 */
export default function InternalBlocksEditor({ blocks, onChange, spec }: InternalBlocksEditorProps) {
  const ctx = useMultipageCalcOptional();
  const globalPrint = ctx?.global.printType;
  const g = ctx?.global;
  const globalFormat = g?.format ?? "";
  const globalCirculation = g?.circulation ?? 0;
  const inheritedSummary = g
    ? [
        g.format ? `Формат: ${g.format}` : null,
        g.circulation ? `Тираж: ${g.circulation.toLocaleString("ru-RU")}` : null,
        g.printType ? `Печать: ${g.printType}` : null,
        g.bindingType ? `Сборка: ${g.bindingType}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

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
        {inheritedSummary && (
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Наследуется из основных параметров:</span>{" "}
            {inheritedSummary}
          </div>
        )}
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
                  <Label className="text-xs">Количество листов</Label>
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
              <div className="space-y-2 rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  {!b.override && (
                    <span className="text-[11px] text-muted-foreground">
                      Наследуется из глобальных
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Формат блока</Label>
                    <Input
                      className="h-8"
                      value={b.override ? (b.localFormat ?? globalFormat) : globalFormat}
                      disabled={!b.override}
                      onChange={(e) => patch(b.id, { localFormat: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Тираж блока</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8"
                      value={b.override ? (b.localCirculation ?? globalCirculation) : globalCirculation}
                      disabled={!b.override}
                      onChange={(e) => patch(b.id, { localCirculation: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Печать блока</Label>
                    <Select
                      value={effectivePrint}
                      disabled={!b.override}
                      onValueChange={(v) => patch(b.id, { printType: v as PrintKindLocal })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                        <SelectItem value="digital">Цифровая</SelectItem>
                        <SelectItem value="uv">UV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Дополнительные операции */}
              <div className="space-y-1">
                <Label className="text-xs">Дополнительные операции</Label>
                <Input
                  placeholder="Например: перфорация, нумерация, штамп (через запятую)"
                  value={b.operations.join(", ")}
                  onChange={(e) =>
                    patch(b.id, {
                      operations: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              {spec && (
                <BlockFormulas
                  title={`Формулы расчёта блока #${i + 1}`}
                  lines={spec.filter((l) => l.blockId === b.id)}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}