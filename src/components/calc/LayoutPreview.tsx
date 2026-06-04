import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Download, RotateCw, Info } from "lucide-react";
import { LayoutResult, ProductType } from "@/lib/calc/types";
import { ProductGlyph } from "./ProductGlyph";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/** Универсальная обёртка для подсказки — оборачивает любой элемент */
const Hint = ({ children, text, side = "top" }: { children: React.ReactNode; text: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
  </Tooltip>
);

/** Маленький "?" рядом с заголовками */
const HintIcon = ({ text }: { text: React.ReactNode }) => (
  <Hint text={text}>
    <HelpCircle className="h-3 w-3 cursor-help text-muted-foreground/60 transition hover:text-muted-foreground" />
  </Hint>
);

export interface AlternativeView {
  printW: number;
  printH: number;
  purchaseW: number;
  purchaseH: number;
  itemsPerSheet: number;
  itemsPerPurchase: number;
  layout: LayoutResult;
  paperCost: number;
  printCost: number;
  wasteCost: number;
  totalCost: number;
}

interface Props {
  layout: LayoutResult;
  productW: number;
  productH: number;
  productType?: ProductType;
  /** Стоимости основного варианта (для блока "почему этот вариант" и сравнения) */
  mainCosts?: { paperCost: number; printCost: number; totalCost: number };
  alternatives?: AlternativeView[];
}

type SortMode = "price" | "waste" | "items";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

/* ------------------------- SVG схема листа ------------------------- */

interface SheetSvgProps {
  layout: LayoutResult;
  productW: number;
  productH: number;
  productType: ProductType;
  printW: number;
  printH: number;
  /** Включить детальные элементы (линейки, выноски, нумерацию) */
  detailed?: boolean;
  /** Чередование оттенков по столбцам */
  zebra?: boolean;
  /** Подсветить отходы тонкой красной заливкой */
  highlightWaste?: boolean;
  /** Hover tooltip с координатой */
  withHover?: boolean;
}

const SheetSvg = ({
  layout,
  productW,
  productH,
  productType,
  printW,
  printH,
  detailed = false,
  zebra = false,
  highlightWaste = false,
  withHover = false,
}: SheetSvgProps) => {
  // Доп. поля под линейки/выноски
  const padX = detailed ? 32 : printW * 0.05;
  const padY = detailed ? 32 : printH * 0.05;
  const viewW = printW + padX * 2;
  const viewH = printH + padY * 2;
  const ox = padX;
  const oy = padY;

  const itemW = layout.rotated ? productH : productW;
  const itemH = layout.rotated ? productW : productH;
  const bleed = 3;
  const effW = layout.effectiveItemW;
  const effH = layout.effectiveItemH;

  const startX = layout.margins.left + layout.edgeMargin;
  const startY = layout.margins.top + layout.edgeMargin;

  const items: { x: number; y: number; col: number; row: number; n: number }[] = [];
  let n = 1;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const x = startX + c * effW + bleed + layout.gap / 2;
      const y = startY + r * effH + bleed + layout.gap / 2;
      items.push({ x, y, col: c, row: r, n });
      n++;
    }
  }

  // Линейки: тики каждые 50мм, подписи каждые 100мм
  const ruler = (length: number, vertical = false) => {
    const ticks: JSX.Element[] = [];
    for (let v = 0; v <= length; v += 10) {
      const isMajor = v % 50 === 0;
      const isLabel = v % 100 === 0 && v > 0 && v < length;
      const tickLen = isMajor ? 4 : 2;
      if (vertical) {
        ticks.push(
          <line
            key={v}
            x1={ox - tickLen}
            y1={oy + v}
            x2={ox}
            y2={oy + v}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.4}
          />
        );
        if (isLabel)
          ticks.push(
            <text
              key={`l${v}`}
              x={ox - 8}
              y={oy + v + 2}
              fontSize={6}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
            >
              {v}
            </text>
          );
      } else {
        ticks.push(
          <line
            key={v}
            x1={ox + v}
            y1={oy - tickLen}
            x2={ox + v}
            y2={oy}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.4}
          />
        );
        if (isLabel)
          ticks.push(
            <text
              key={`l${v}`}
              x={ox + v}
              y={oy - 6}
              fontSize={6}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              {v}
            </text>
          );
      }
    }
    return ticks;
  };

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto select-none">
      {detailed && (
        <>
          {ruler(printW, false)}
          {ruler(printH, true)}
          {/* Габаритные подписи */}
          <text
            x={ox + printW / 2}
            y={oy + printH + 22}
            fontSize={9}
            textAnchor="middle"
            fontWeight={600}
            fill="hsl(var(--foreground))"
          >
            {printW} мм
          </text>
          <text
            x={ox + printW + 22}
            y={oy + printH / 2}
            fontSize={9}
            textAnchor="middle"
            fontWeight={600}
            fill="hsl(var(--foreground))"
            transform={`rotate(90 ${ox + printW + 22} ${oy + printH / 2})`}
          >
            {printH} мм
          </text>
          {/* Бейдж формата в углу листа */}
          <text
            x={ox + 6}
            y={oy + 12}
            fontSize={9}
            fontWeight={700}
            fill="hsl(var(--muted-foreground))"
            opacity={0.5}
          >
            {printW}×{printH}
          </text>
          {layout.rotated && (
            <g transform={`translate(${ox + printW - 16} ${oy + 4})`}>
              <circle cx={6} cy={6} r={6} fill="hsl(var(--primary))" opacity={0.15} />
              <text x={6} y={9} fontSize={8} textAnchor="middle" fill="hsl(var(--primary))">↻</text>
            </g>
          )}
        </>
      )}

      {/* Лист */}
      <rect
        x={ox}
        y={oy}
        width={printW}
        height={printH}
        fill="hsl(var(--background))"
        stroke="hsl(var(--border))"
        strokeWidth={0.6}
      />

      {/* Подсветка отходов: красная заливка всего листа, изделия её перекрывают */}
      {highlightWaste && (
        <rect
          x={ox}
          y={oy}
          width={printW}
          height={printH}
          fill="hsl(var(--destructive))"
          fillOpacity={0.06}
        />
      )}

      {/* Тех. поля */}
      <rect
        x={ox + layout.margins.left}
        y={oy + layout.margins.top}
        width={printW - layout.margins.left - layout.margins.right}
        height={printH - layout.margins.top - layout.margins.bottom}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={0.3}
        strokeDasharray="2 2"
      />

      {/* Изделия */}
      {items.map(({ x, y, col, row, n: idx }, i) => {
        const fill = zebra
          ? col % 2 === 0
            ? "hsl(var(--warning))"
            : "hsl(var(--primary))"
          : "hsl(var(--warning))";
        return (
          <motion.g
            key={`${col}-${row}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: detailed ? i * 0.015 : 0 }}
          >
            {/* bleed зона — тонкая красная штриховка */}
            {detailed && (
              <rect
                x={ox + x - bleed}
                y={oy + y - bleed}
                width={itemW + bleed * 2}
                height={itemH + bleed * 2}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth={0.3}
                strokeDasharray="1 1"
                opacity={0.6}
              />
            )}
            <rect
              x={ox + x - bleed}
              y={oy + y - bleed}
              width={itemW + bleed * 2}
              height={itemH + bleed * 2}
              fill={fill}
              fillOpacity={0.22}
            >
              {withHover && (
                <title>
                  №{idx} · {Math.round(productW)}×{Math.round(productH)} мм · поз. {col + 1}×{row + 1}
                </title>
              )}
            </rect>
            <ProductGlyph
              type={productType}
              x={ox + x}
              y={oy + y}
              w={itemW}
              h={itemH}
              index={idx}
            />
          </motion.g>
        );
      })}
    </svg>
  );
};

/* ------------------------- Мини-превью для альтернатив ------------------------- */

const MiniSheet = ({ layout, printW, printH }: { layout: LayoutResult; printW: number; printH: number }) => {
  const max = Math.max(printW, printH);
  const w = (printW / max) * 40;
  const h = (printH / max) * 40;
  const cellW = w / layout.cols;
  const cellH = h / layout.rows;
  const cells: JSX.Element[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * cellW + 0.5}
          y={r * cellH + 0.5}
          width={cellW - 1}
          height={cellH - 1}
          fill="hsl(var(--warning))"
          fillOpacity={0.55}
        />
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={40} height={32} className="shrink-0">
      <rect x={0} y={0} width={w} height={h} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={0.5} />
      {cells}
    </svg>
  );
};

/* ------------------------- Главный компонент ------------------------- */

export const LayoutPreview = ({
  layout,
  productW,
  productH,
  productType = "leaflet",
  alternatives,
  mainCosts,
}: Props) => {
  const [selected, setSelected] = useState<number>(-1);
  const [sortMode, setSortMode] = useState<SortMode>("items");
  const [fullOpen, setFullOpen] = useState(false);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const active = selected === -1 ? layout : alternatives?.[selected]?.layout ?? layout;
  const activeAlt = selected >= 0 ? alternatives?.[selected] ?? null : null;
  const W = active.printFormat.width;
  const H = active.printFormat.height;

  const wastePct = ((active.wasteArea / (W * H)) * 100).toFixed(1);

  // Сортировка альтернатив
  const sortedAlts = useMemo(() => {
    if (!alternatives) return [];
    const indexed = alternatives.map((a, i) => ({ a, i }));
    if (sortMode === "price")
      indexed.sort((x, y) => x.a.totalCost - y.a.totalCost);
    else if (sortMode === "waste")
      indexed.sort(
        (x, y) =>
          x.a.layout.wasteArea / (x.a.printW * x.a.printH) -
          y.a.layout.wasteArea / (y.a.printW * y.a.printH)
      );
    else
      indexed.sort((x, y) => y.a.itemsPerPurchase - x.a.itemsPerPurchase);
    return indexed;
  }, [alternatives, sortMode]);

  // Максимум для bar-chart
  const maxTotal = useMemo(() => {
    const main = mainCosts?.totalCost ?? 0;
    const alts = alternatives?.map((a) => a.totalCost) ?? [];
    return Math.max(main, ...alts, 1);
  }, [alternatives, mainCosts]);

  const mainItems = layout.itemsPerSheet;
  const altItems = activeAlt?.itemsPerSheet;

  // Высокие отходы — помечаем вариант как «неэффективный» (>40% площади листа)
  const isInefficient = (waste: number, area: number) => area > 0 && waste / area > 0.4;
  const InefficientBadge = () => (
    <Hint text="Больше 40% площади листа уходит в отходы — раскладка неэффективна.">
      <span className="cursor-help rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
        неэффективно
      </span>
    </Hint>
  );

  // "Почему этот вариант" — формируем текст
  const explanation = useMemo(() => {
    if (!alternatives || alternatives.length === 0) return null;
    const bestAlt = [...alternatives].sort((a, b) => a.totalCost - b.totalCost)[0];
    const mainTotal = mainCosts?.totalCost ?? 0;
    const overpay = bestAlt && mainTotal ? bestAlt.totalCost - mainTotal : 0;
    return {
      mainItemsPerPurchase: layout.itemsPerSheet,
      altPrint: alternatives[0],
      overpay,
    };
  }, [alternatives, layout, mainCosts]);

  // Экспорт SVG → PNG
  const downloadPng = () => {
    const svg = svgWrapRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 3;
      canvas.height = img.height * 3;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `layout-${W}x${H}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* === Схема листа === */}
        <div className="relative rounded-lg border bg-card p-2 sm:p-3 shadow-card">
          {/* Мобильный заголовок — формат, шт/лист, действия */}
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:hidden">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums">
              {W}×{H} мм
            </span>
            <span className="rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
              {active.itemsPerSheet} шт/лист
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
              {active.cols}×{active.rows}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">отходы {wastePct}%</span>
          </div>
          <div className="absolute right-2 top-2 z-10 flex gap-1">
            <Hint text="Скачать схему листа в PNG (3× разрешение, для печатника)">
              <button
                type="button"
                onClick={downloadPng}
                className="rounded-md border bg-background/80 p-2 text-muted-foreground backdrop-blur transition hover:text-foreground sm:p-1.5"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </Hint>
            <Dialog open={fullOpen} onOpenChange={setFullOpen}>
              <DialogTrigger asChild>
                <Hint text="Открыть в большом размере — для презентации клиенту">
                  <button
                    type="button"
                    className="rounded-md border bg-background/80 p-2 text-muted-foreground backdrop-blur transition hover:text-foreground sm:p-1.5"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </Hint>
              </DialogTrigger>
              <DialogContent className="max-w-5xl w-[96vw] sm:w-auto p-3 sm:p-6">
                <div className="max-h-[80vh] overflow-auto">
                  <SheetSvg
                    layout={active}
                    productW={productW}
                    productH={productH}
                    productType={productType}
                    printW={W}
                    printH={H}
                    detailed
                    zebra
                    highlightWaste
                    withHover
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${W}x${H}-${selected}`}
              ref={svgWrapRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-[640px]"
            >
              <SheetSvg
                layout={active}
                productW={productW}
                productH={productH}
                productType={productType}
                printW={W}
                printH={H}
                detailed
                zebra
                highlightWaste
                withHover
              />
            </motion.div>
          </AnimatePresence>
          {/* Легенда схемы */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[10px] text-muted-foreground">
            <Hint text="Зона вылета (bleed) — 3 мм с каждой стороны изделия, обрезается после печати.">
              <span className="inline-flex cursor-help items-center gap-1">
                <span className="h-2 w-2 rounded-sm border border-dashed border-destructive" />
                bleed
              </span>
            </Hint>
            <Hint text="Технические поля печатной машины — зона, где невозможна печать (захват, отступы под марки).">
              <span className="inline-flex cursor-help items-center gap-1">
                <span className="h-2 w-2 rounded-sm border border-dashed border-muted-foreground" />
                техполя
              </span>
            </Hint>
            <Hint text="Изделия чередуются по цвету в столбцах для удобства подсчёта.">
              <span className="inline-flex cursor-help items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-warning/30" />
                <span className="h-2 w-2 rounded-sm bg-primary/30" />
                изделия
              </span>
            </Hint>
            <Hint text="Розовая подложка показывает площадь листа, уходящую в отходы.">
              <span className="inline-flex cursor-help items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-destructive/15" />
                отходы
              </span>
            </Hint>
            <span className="ml-auto text-muted-foreground/70">наведите на изделие — позиция</span>
          </div>
        </div>

        {/* === Баннер при просмотре альтернативы === */}
        {selected >= 0 && (
          <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              Просмотр альтернативного варианта. В расчёте используется основной (★).
            </span>
          </div>
        )}

        {/* === Главная цифра + 2 колонки === */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {/* Геометрия */}
          <div className="rounded-lg border bg-card p-3 sm:p-4 shadow-card">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              Геометрия
              <HintIcon text="Параметры раскладки изделий на печатном листе и связь с закупочным." />
            </div>
            <Hint text="Главный показатель эффективности раскладки — сколько готовых изделий помещается на ОДНОМ печатном листе. Чем больше, тем выгоднее.">
              <div className="mt-2 flex cursor-help items-baseline gap-2">
                <div className="text-3xl font-bold leading-none text-foreground">
                  {active.itemsPerSheet}
                </div>
                <div className="text-xs text-muted-foreground">шт/лист</div>
              </div>
            </Hint>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Row label="Печатный" value={`${W}×${H} мм`} hint="Размер листа, который идёт в печатную машину." />
              <Row
                label="Закупочный"
                value={activeAlt ? `${activeAlt.purchaseW}×${activeAlt.purchaseH}` : "—"}
                hint="Размер листа, который покупаем у поставщика. Из него нарезается несколько печатных."
              />
              <Row
                label="Раскладка"
                value={`${active.cols}×${active.rows}`}
                hint="Колонки × ряды изделий на печатном листе."
              />
              <Row
                label="Поворот"
                value={active.rotated ? "↻ да" : "нет"}
                hint="Развёрнуты ли изделия на 90° для лучшего размещения."
              />
              <Row
                label="Шт/лист"
                value={`${active.itemsPerSheet}`}
                hint="Сколько изделий помещается на ОДИН печатный лист."
              />
              <Row
                label="Отходы"
                value={`${wastePct}%`}
                hint="Доля площади листа, которая уходит в обрезки. Чем меньше — тем лучше."
              />
            </div>
          </div>

          {/* Экономика */}
          <div className="rounded-lg border bg-card p-3 sm:p-4 shadow-card">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              Экономика
              <HintIcon text="Упрощённая стоимость варианта: бумага + печать. Без постпечати и логистики — только для сравнения раскладок." />
            </div>
            <Hint text="Себестоимость варианта раскладки (бумага + печать). Полная себестоимость со всеми операциями — в основном расчёте справа.">
              <div className="mt-2 flex cursor-help items-baseline gap-2">
                <div className="text-3xl font-bold leading-none text-foreground">
                  {fmt(activeAlt?.totalCost ?? mainCosts?.totalCost ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">₸ итого</div>
              </div>
            </Hint>
            <div className="mt-3 space-y-1.5 text-xs">
              {activeAlt ? (
                <>
                  <CostBar label="Печать" value={activeAlt.printCost} max={maxTotal} color="hsl(var(--primary))" hint="Стоимость оттисков (тираж × цена за оттиск, с учётом приладки и оборота)." />
                  <CostBar label="Закуп" value={activeAlt.paperCost} max={maxTotal} color="hsl(var(--warning))" hint="Стоимость закупочной бумаги (нужное количество листов × цена за лист)." />
                  <CostBar
                    label="Отходы"
                    value={activeAlt.wasteCost}
                    max={maxTotal}
                    color="hsl(var(--destructive))"
                    hint="Какая часть стоимости бумаги уходит в обрезки на печатном листе."
                  />
                </>
              ) : mainCosts ? (
                <>
                  <CostBar label="Печать" value={mainCosts.printCost} max={maxTotal} color="hsl(var(--primary))" hint="Стоимость оттисков (тираж × цена за оттиск, с учётом приладки и оборота)." />
                  <CostBar label="Закуп" value={mainCosts.paperCost} max={maxTotal} color="hsl(var(--warning))" hint="Стоимость закупочной бумаги (нужное количество листов × цена за лист)." />
                </>
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
            </div>
          </div>
        </div>

        {/* === "Почему этот вариант" === */}
        {selected === -1 && explanation && alternatives && alternatives.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Info className="h-3 w-3" /> Почему этот вариант
            </div>
            Выбран печатный формат{" "}
            <span className="font-semibold">
              {layout.printFormat.width}×{layout.printFormat.height}
            </span>{" "}
            — даёт максимум изделий с одного закупочного листа. Альтернатива{" "}
            <span className="font-semibold">
              {alternatives[0].printW}×{alternatives[0].printH}
            </span>{" "}
            даёт {alternatives[0].itemsPerPurchase} шт с закупочного
            {mainCosts && alternatives[0].totalCost > mainCosts.totalCost && (
              <>
                , переплата{" "}
                <span className="font-semibold text-destructive">
                  +{fmt(alternatives[0].totalCost - mainCosts.totalCost)} ₸
                </span>
              </>
            )}
            .
          </div>
        )}

        {/* === Список альтернатив с мини-превью + сортировка === */}
        {false && alternatives && alternatives.length > 0 && (
          <div className="rounded-lg border bg-card p-3 shadow-card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                Варианты раскладки
                <HintIcon text="Все рассмотренные пары «закупочный → печатный формат». Нажмите на строку, чтобы увидеть схему этого варианта на превью выше." />
              </div>
              <div className="flex gap-0.5 rounded-md border bg-muted/40 p-0.5 text-[10px]">
                {(["items", "price", "waste"] as SortMode[]).map((m) => {
                  const tip =
                    m === "items"
                      ? "Сортировать по количеству изделий с одного закупочного листа (больше — лучше)."
                      : m === "price"
                      ? "Сортировать по итоговой стоимости варианта (дешевле — лучше)."
                      : "Сортировать по доле отходов на печатном листе (меньше — лучше).";
                  return (
                    <Hint key={m} text={tip}>
                      <button
                        type="button"
                        onClick={() => setSortMode(m)}
                        className={cn(
                          "rounded px-2 py-1 uppercase tracking-wide transition",
                          sortMode === m
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {m === "items" ? "шт" : m === "price" ? "цена" : "отходы"}
                      </button>
                    </Hint>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <AltRow
                active={selected === -1}
                onClick={() => setSelected(-1)}
                mini={
                  <Hint text="Схематичная раскладка изделий на этом печатном листе.">
                    <span className="inline-flex"><MiniSheet layout={layout} printW={layout.printFormat.width} printH={layout.printFormat.height} /></span>
                  </Hint>
                }
                title={
                  <>
                    <Hint text="Этот вариант выбран системой как оптимальный — даёт максимум готовых изделий с одного закупочного листа.">
                      <span className="cursor-help rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        ★ Оптимально
                      </span>
                    </Hint>{" "}
                    Печ. {layout.printFormat.width}×{layout.printFormat.height}
                    {isInefficient(layout.wasteArea, layout.printFormat.width * layout.printFormat.height) && (
                      <> <InefficientBadge /></>
                    )}
                  </>
                }
                right={
                  <>
                    <span className="font-semibold text-foreground">
                      {layout.itemsPerSheet} шт/лист
                    </span>
                    {mainCosts && (
                      <span className="text-muted-foreground">{fmt(mainCosts.totalCost)} ₸</span>
                    )}
                  </>
                }
              />
              {sortedAlts.map(({ a, i }) => {
                const itemDelta = a.itemsPerSheet - mainItems;
                const priceDelta = mainCosts ? a.totalCost - mainCosts.totalCost : 0;
                return (
                  <AltRow
                    key={i}
                    active={selected === i}
                    onClick={() => setSelected(i)}
                    mini={
                      <Hint text={`Раскладка ${a.layout.cols}×${a.layout.rows} на печатном листе ${a.printW}×${a.printH} мм.`}>
                        <span className="inline-flex"><MiniSheet layout={a.layout} printW={a.printW} printH={a.printH} /></span>
                      </Hint>
                    }
                    title={
                      <>
                        Печ. {a.printW}×{a.printH}
                        {isInefficient(a.layout.wasteArea, a.printW * a.printH) && (
                          <> <InefficientBadge /></>
                        )}
                        <span className="text-muted-foreground"> ← закупочный {a.purchaseW}×{a.purchaseH}</span>
                      </>
                    }
                    right={
                      <>
                        <span className="font-semibold text-foreground">
                          {a.itemsPerSheet} шт/лист
                        </span>
                        <span className="text-muted-foreground">{fmt(a.totalCost)} ₸</span>
                        {priceDelta > 0 && (
                          <Hint text="Насколько этот вариант дороже основного.">
                            <span className="cursor-help rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                              +{fmt(priceDelta)} ₸
                            </span>
                          </Hint>
                        )}
                        {itemDelta !== 0 && (
                          <Hint text={itemDelta > 0
                            ? "В этом варианте помещается больше изделий на ОДИН печатный лист (но с закупочного может быть меньше из-за раскроя)."
                            : "В этом варианте на печатный лист помещается меньше изделий, чем в основном."}>
                            <span
                              className={cn(
                                "cursor-help rounded px-1.5 py-0.5 text-[10px] font-medium",
                                itemDelta > 0
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {itemDelta > 0 ? "+" : ""}
                              {itemDelta} шт
                            </span>
                          </Hint>
                        )}
                      </>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* === Техкарточка для печатника === */}
        <Hint text="Сводка для печатника. Кликните, чтобы скопировать в буфер обмена и вставить в наряд-заказ.">
          <button
            type="button"
            onClick={() => {
              const text = `Печ. ${W}×${H} · Бумага ${activeAlt?.purchaseW ?? "—"}×${activeAlt?.purchaseH ?? "—"} · Раскладка ${active.cols}×${active.rows}${active.rotated ? " (rot)" : ""} · Bleed 3 · Отступы ${active.margins.left}/${active.margins.right}/${active.margins.top}/${active.margins.bottom} · ${active.itemsPerSheet} шт/лист`;
              navigator.clipboard.writeText(text);
              toast({ title: "Скопировано", description: "Техкарточка в буфере обмена" });
            }}
            className="w-full rounded-md border border-dashed bg-muted/30 px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
          >
            Печ. {W}×{H} · Бумага {activeAlt?.purchaseW ?? "—"}×{activeAlt?.purchaseH ?? "—"} · Раскладка{" "}
            {active.cols}×{active.rows}
            {active.rotated ? " (rot)" : ""} · Bleed 3 · Отступы{" "}
            {active.margins.left}/{active.margins.right}/{active.margins.top}/{active.margins.bottom} ·{" "}
            {active.itemsPerSheet} шт/лист
          </button>
        </Hint>
      </div>
    </TooltipProvider>
  );
};

/* ------------------------- Вспомогательные ------------------------- */

const Row = ({ label, value, hint }: { label: string; value: string; hint?: string }) => {
  const content = (
    <div className="flex items-center justify-between border-b border-border/50 py-0.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
  if (!hint) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{content}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>
    </Tooltip>
  );
};

const CostBar = ({
  label,
  value,
  max,
  color,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  hint?: string;
}) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const inner = (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{fmt(value)} ₸</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
  if (!hint) return inner;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{inner}</div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>
    </Tooltip>
  );
};

const AltRow = ({
  active,
  onClick,
  mini,
  title,
  right,
}: {
  active: boolean;
  onClick: () => void;
  mini: React.ReactNode;
  title: React.ReactNode;
  right: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition",
      active
        ? "border-primary bg-primary/10"
        : "border-border/40 hover:bg-muted/50"
    )}
  >
    <span className="shrink-0">{mini}</span>
    <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="truncate">{title}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] sm:ml-auto sm:justify-end">{right}</span>
    </span>
  </button>
);