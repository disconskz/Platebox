import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HelpHint } from "@/components/HelpHint";

type SpecItem = {
  stage: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

const STAGE_META: Record<string, { label: string; color: string; hint: string }> = {
  material: {
    label: "Материал (бумага)",
    color: "bg-primary",
    hint: "Закупочные листы × цена за лист. Зависит от выбранной бумаги, плотности, тиража и закупочного формата.",
  },
  prepress: {
    label: "Допечатные",
    color: "bg-info",
    hint: "Изготовление форм/пластин и приладка. Зависит от количества форм (красочности и числа сторон).",
  },
  print: {
    label: "Печать",
    color: "bg-success/80",
    hint: "Печатных листов × стоимость оттиска машины. Учитывает приладочные листы и число сторон.",
  },
  postpress: {
    label: "Послепечатные",
    color: "bg-warning/80",
    hint: "Все выбранные операции (ламинация, биговка, фальцовка, вырубка, нумерация, тиснение и т.д.).",
  },
  logistics: {
    label: "Логистика",
    color: "bg-muted-foreground/60",
    hint: "Доставка и сопутствующие расходы.",
  },
};

const STAGE_ORDER = ["material", "prepress", "print", "postpress", "logistics"];

interface Props {
  spec: SpecItem[];
  totalCost: number;
  marginPercent: number;
  vatPercent: number;
  circulation: number;
}

export function PriceBreakdownTree({
  spec,
  totalCost,
  marginPercent,
  vatPercent,
  circulation,
}: Props) {
  const grouped = useMemo(() => {
    const g: Record<string, SpecItem[]> = {};
    for (const it of spec) (g[it.stage] ||= []).push(it);
    return g;
  }, [spec]);

  const stages = STAGE_ORDER.filter((s) => grouped[s]?.length);

  const priceBeforeVat = totalCost * (1 + marginPercent / 100);
  const marginAmount = priceBeforeVat - totalCost;
  const vatAmount = priceBeforeVat * (vatPercent / 100);
  const salePrice = priceBeforeVat + vatAmount;

  return (
    <div className="rounded-lg border bg-card/50">
      <div className="border-b px-3 py-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          Как формируется цена
          <HelpHint title="Разбор цены">
            Дерево показывает, из чего складывается себестоимость по этапам, а затем — наценка и НДС до итоговой цены продажи.
          </HelpHint>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          1 шт ≈ {fmtMoney(salePrice / Math.max(1, circulation))}
        </div>
      </div>

      <div className="p-2 space-y-1">
        {stages.map((stage) => {
          const meta = STAGE_META[stage];
          const items = grouped[stage];
          const sum = items.reduce((s, i) => s + i.total, 0);
          const share = totalCost > 0 ? (sum / totalCost) * 100 : 0;
          return (
            <StageNode key={stage} meta={meta} items={items} sum={sum} share={share} />
          );
        })}
      </div>

      <div className="border-t bg-muted/20 p-3 space-y-1.5 text-sm">
        <Row label="Себестоимость" value={fmtMoney(totalCost)} bold />
        <Row
          label={`+ Наценка ${marginPercent}%`}
          value={fmtMoney(marginAmount)}
          className="text-success"
          hint="Цена без НДС = себестоимость × (1 + наценка/100)"
        />
        <Row label="Цена без НДС" value={fmtMoney(priceBeforeVat)} />
        <Row label={`+ НДС ${vatPercent}%`} value={fmtMoney(vatAmount)} hint="Берётся из системных настроек" />
        <div className="pt-2 mt-1 border-t flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Цена продажи</span>
          <span className="text-lg font-bold text-primary tabular-nums">{fmtMoney(salePrice)}</span>
        </div>
      </div>
    </div>
  );
}

function StageNode({
  meta,
  items,
  sum,
  share,
}: {
  meta: { label: string; color: string; hint: string };
  items: SpecItem[];
  sum: number;
  share: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn("h-2 w-2 rounded-full shrink-0", meta.color)} />
        <span className="text-sm font-medium flex-1 truncate">{meta.label}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
          {share.toFixed(0)}%
        </span>
        <span className="text-sm font-semibold tabular-nums w-24 text-right">
          {fmtMoney(sum)}
        </span>
      </button>
      {/* мини-полоса доли */}
      <div className="h-1 bg-muted rounded-b-md overflow-hidden">
        <div className={cn("h-full", meta.color)} style={{ width: `${Math.min(100, share)}%` }} />
      </div>
      {open && (
        <div className="px-2.5 pb-2 pt-1 space-y-1 text-xs">
          <div className="text-[11px] text-muted-foreground italic flex items-start gap-1.5 py-1">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{meta.hint}</span>
          </div>
          <table className="w-full">
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-1 pr-2">{it.name}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {it.quantity} {it.unit} × {fmtMoney(it.unitPrice)}
                  </td>
                  <td className="py-1 text-right tabular-nums font-medium whitespace-nowrap">
                    {fmtMoney(it.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
  bold,
  hint,
}: {
  label: string;
  value: string;
  className?: string;
  bold?: boolean;
  hint?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between text-sm", className)}>
      <span className="text-muted-foreground inline-flex items-center gap-1">
        {label}
        {hint && <HelpHint title={label}>{hint}</HelpHint>}
      </span>
      <span className={bold ? "font-bold text-foreground tabular-nums" : "font-medium text-foreground tabular-nums"}>
        {value}
      </span>
    </div>
  );
}