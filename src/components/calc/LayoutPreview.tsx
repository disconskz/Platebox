import { LayoutResult } from "@/lib/calc/types";
import { ProductType } from "@/lib/calc/types";
import { ProductGlyph } from "./ProductGlyph";

interface Props {
  layout: LayoutResult;
  productW: number;
  productH: number;
  productType?: ProductType;
}

export const LayoutPreview = ({ layout, productW, productH, productType = "leaflet" }: Props) => {
  const W = layout.printFormat.width;
  const H = layout.printFormat.height;
  const SCALE = 1.1;
  const viewW = W * SCALE;
  const viewH = H * SCALE;

  const itemW = layout.rotated ? productH : productW;
  const itemH = layout.rotated ? productW : productH;
  const bleed = 3;
  const effW = layout.effectiveItemW;
  const effH = layout.effectiveItemH;

  const startX = layout.margins.left + layout.edgeMargin;
  const startY = layout.margins.top + layout.edgeMargin;

  const rects = [];
  let n = 1;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const x = startX + c * effW + bleed + layout.gap / 2;
      const y = startY + r * effH + bleed + layout.gap / 2;
      rects.push(
        <g key={`${r}-${c}`}>
          <rect x={x - bleed} y={y - bleed} width={itemW + bleed * 2} height={itemH + bleed * 2} fill="hsl(var(--warning))" fillOpacity={0.18} />
          <ProductGlyph type={productType} x={x} y={y} w={itemW} h={itemH} index={n} />
        </g>
      );
      n++;
    }
  }

  const wastePct = ((layout.wasteArea / (W * H)) * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-3 shadow-card">
        <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto">
          {/* paper */}
          <rect x={0} y={0} width={W} height={H} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1} />
          {/* tech margins */}
          <rect
            x={layout.margins.left}
            y={layout.margins.top}
            width={W - layout.margins.left - layout.margins.right}
            height={H - layout.margins.top - layout.margins.bottom}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.4}
            strokeDasharray="2 2"
          />
          {rects}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="На листе" value={`${layout.itemsPerSheet} шт`} />
        <Stat label="Раскладка" value={`${layout.cols}×${layout.rows}`} />
        <Stat label="Поворот" value={layout.rotated ? "да" : "нет"} />
        <Stat label="Отходы" value={`${wastePct}%`} />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card px-3 py-2 shadow-card">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);