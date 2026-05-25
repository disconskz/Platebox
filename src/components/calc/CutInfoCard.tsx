import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scissors, RotateCcw } from "lucide-react";
import { fmtMoney, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CutInfo {
  source: "manual" | "table" | "auto";
  printName: string | null;
  itemName: string | null;
  cols: number;
  rows: number;
  itemsPerSheet: number;
  cutsPerSheet: number;
  pricePerCut: number;
  printSheets: number;
  total: number;
  bleed: number;
  productW: number;
  productH: number;
  productWithBleedW: number;
  productWithBleedH: number;
  printW: number;
  printH: number;
  margins?: { left: number; right: number; top: number; bottom: number };
  usableW?: number;
  usableH?: number;
}

const SOURCE_LABEL: Record<CutInfo["source"], string> = {
  manual: "ручная корректировка",
  table: "справочник стандартных форматов",
  auto: "авто-расчёт по раскладке",
};

const SOURCE_BADGE: Record<CutInfo["source"], string> = {
  manual: "bg-amber-100 text-amber-800 border-amber-200",
  table: "bg-blue-100 text-blue-800 border-blue-200",
  auto: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export interface CutInfoCardProps {
  info: CutInfo;
  override: number | null;
  onOverride: (n: number | null) => void;
}

export function CutInfoCard({ info, override, onOverride }: CutInfoCardProps) {
  const [draft, setDraft] = useState<string>(override != null ? String(override) : "");
  useEffect(() => {
    setDraft(override != null ? String(override) : "");
  }, [override]);

  const apply = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0) {
      onOverride(null);
      return;
    }
    onOverride(Math.floor(n));
  };
  const reset = () => {
    setDraft("");
    onOverride(null);
  };

  return (
    <Card className="shadow-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="h-4 w-4" /> Резка печатного листа
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", SOURCE_BADGE[info.source])}>
          {SOURCE_LABEL[info.source]}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Row k="Печатный лист" v={`${info.printW}×${info.printH} мм${info.printName ? ` (${info.printName})` : ""}`} />
          {info.usableW != null && info.usableH != null && info.margins && (
            <Row
              k={`Полезная область (поля ${info.margins.top}/${info.margins.bottom}/${info.margins.left}/${info.margins.right})`}
              v={`${info.usableW}×${info.usableH} мм`}
            />
          )}
          <Row k="Готовое изделие" v={`${info.productW}×${info.productH} мм${info.itemName ? ` (${info.itemName})` : ""}`} />
          <Row k={`С bleed (+${info.bleed} мм)`} v={`${info.productWithBleedW}×${info.productWithBleedH} мм`} />
          <Row k="Раскладка" v={`${info.cols} × ${info.rows}`} />
          <Row k="Изделий на листе" v={fmtNum(info.itemsPerSheet)} />
          <Row k="Резов на лист" v={fmtNum(info.cutsPerSheet)} />
          <Row k="Печатных листов" v={fmtNum(info.printSheets)} />
          <Row k="Цена 1 реза" v={fmtMoney(info.pricePerCut)} />
        </div>

        <div className="flex items-center justify-between rounded-md border bg-gradient-subtle px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {fmtNum(info.printSheets)} × {fmtNum(info.cutsPerSheet)} × {fmtMoney(info.pricePerCut)}
          </span>
          <span className="font-semibold">{fmtMoney(info.total)}</span>
        </div>

        <div className="border-t pt-2 space-y-1.5">
          <div className="text-xs text-muted-foreground">Ручная корректировка (резов/лист)</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`авто: ${info.cutsPerSheet}`}
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={apply}>
              Применить
            </Button>
            {override != null && (
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={reset} title="Сбросить">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <>
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </>
  );
}

export default CutInfoCard;