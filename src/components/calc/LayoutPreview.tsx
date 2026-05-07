import { useState } from "react";
import { LayoutResult } from "@/lib/calc/types";
import { ProductType } from "@/lib/calc/types";
import { ProductGlyph } from "./ProductGlyph";
import { cn } from "@/lib/utils";

interface Props {
  layout: LayoutResult;
  productW: number;
  productH: number;
  productType?: ProductType;
  alternatives?: Array<{
    printW: number;
    printH: number;
    purchaseW: number;
    purchaseH: number;
    itemsPerSheet: number;
    itemsPerPurchase: number;
    layout: LayoutResult;
  }>;
}

export const LayoutPreview = ({ layout, productW, productH, productType = "leaflet", alternatives }: Props) => {
  // -1 = выбран основной вариант (layout), иначе индекс альтернативы
  const [selected, setSelected] = useState<number>(-1);
  const active = selected === -1 ? layout : alternatives?.[selected]?.layout ?? layout;
  const activeAlt = selected >= 0 ? alternatives?.[selected] : null;

  const W = active.printFormat.width;
  const H = active.printFormat.height;
  const SCALE = 1.1;
  const viewW = W * SCALE;
  const viewH = H * SCALE;

  const itemW = active.rotated ? productH : productW;
  const itemH = active.rotated ? productW : productH;
  const bleed = 3;
  const effW = active.effectiveItemW;
  const effH = active.effectiveItemH;

  const startX = active.margins.left + active.edgeMargin;
  const startY = active.margins.top + active.edgeMargin;

  const rects = [];
  let n = 1;
  for (let r = 0; r < active.rows; r++) {
    for (let c = 0; c < active.cols; c++) {
      const x = startX + c * effW + bleed + active.gap / 2;
      const y = startY + r * effH + bleed + active.gap / 2;
      rects.push(
        <g key={`${r}-${c}`}>
          <rect x={x - bleed} y={y - bleed} width={itemW + bleed * 2} height={itemH + bleed * 2} fill="hsl(var(--warning))" fillOpacity={0.18} />
          <ProductGlyph type={productType} x={x} y={y} w={itemW} h={itemH} index={n} />
        </g>
      );
      n++;
    }
  }

  const wastePct = ((active.wasteArea / (W * H)) * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-3 shadow-card">
        <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto">
          {/* paper */}
          <rect x={0} y={0} width={W} height={H} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1} />
          {/* tech margins */}
          <rect
            x={active.margins.left}
            y={active.margins.top}
            width={W - active.margins.left - active.margins.right}
            height={H - active.margins.top - active.margins.bottom}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.4}
            strokeDasharray="2 2"
          />
          {rects}
        </svg>
      </div>
      {selected >= 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          Просмотр альтернативного варианта. Выбран в расчёте — основной (с максимумом изделий с закупочного).
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="На листе" value={`${active.itemsPerSheet} шт`} />
        <Stat label="Раскладка" value={`${active.cols}×${active.rows}`} />
        <Stat label="Поворот" value={active.rotated ? "да" : "нет"} />
        <Stat label="Отходы" value={`${wastePct}%`} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Печатный" value={`${W}×${H} мм`} />
        <Stat
          label="Закупочный"
          value={
            activeAlt
              ? `${activeAlt.purchaseW}×${activeAlt.purchaseH} мм`
              : "—"
          }
        />
      </div>
      {activeAlt && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Шт/лист" value={`${activeAlt.itemsPerSheet}`} />
          <Stat label="Шт с закупочного" value={`${activeAlt.itemsPerPurchase}`} />
        </div>
      )}
      {alternatives && alternatives.length > 0 && (
        <div className="rounded-lg border bg-card p-3 shadow-card">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Варианты раскладки (нажмите, чтобы просмотреть)
          </div>
          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => setSelected(-1)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition",
                selected === -1
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-transparent hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <span>
                ★ Печ. {layout.printFormat.width}×{layout.printFormat.height} (основной)
              </span>
              <span className="font-medium text-foreground">{layout.itemsPerSheet} шт/лист</span>
            </button>
            {alternatives.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition",
                  selected === i
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-transparent hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span>
                  Печ. {a.printW}×{a.printH} ← Закуп. {a.purchaseW}×{a.purchaseH}
                </span>
                <span className="font-medium text-foreground">
                  {a.itemsPerSheet} шт/лист · {a.itemsPerPurchase} с закуп.
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card px-3 py-2 shadow-card">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);