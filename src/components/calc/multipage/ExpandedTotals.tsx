import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { fmtMoney, fmtNum } from "@/lib/format";

export interface ExpandedTotalsData {
  totals: { cost: number; sale: number; withVat: number; perItem: number };
  vatPercent: number;
  margin: number;
  circulation: number;
  pages: number;
  signatures: number;
  signaturePages: number;
  formatLabel: string;
  itemW: number;
  itemH: number;
  // блок
  blockPrintSheets: number;
  blockNetSheets: number;
  blockSetup: number;
  blockUpPerSide: number;
  // обложка
  coverPrintSheets: number;
  coverNetSheets: number;
  coverSetup: number;
  coverUpPerSheet: number;
  spineMm: number;
  // печать
  offset: boolean;
  formsCount: number;
  // срок (ETA в днях, прикидочно)
  etaDays: number;
  // отходы
  wastePercent: number;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[260px] text-xs">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Line({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground flex items-center gap-1">
        {label}
        {hint ? <Hint>{hint}</Hint> : null}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function ExpandedTotals({ data }: { data: ExpandedTotalsData }) {
  const {
    totals, vatPercent, margin, circulation, pages, signatures, signaturePages,
    formatLabel, itemW, itemH,
    blockPrintSheets, blockNetSheets, blockSetup, blockUpPerSide,
    coverPrintSheets, coverNetSheets, coverSetup, coverUpPerSheet, spineMm,
    offset, formsCount, etaDays, wastePercent,
  } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>13. Итог</span>
          <span className="text-accent text-base font-semibold tabular-nums">{fmtMoney(totals.perItem)}/шт</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Line label="Себестоимость" value={fmtMoney(totals.cost)}
            hint={`Сумма всех строк спецификации: материалы + допечать + печать + постпечать + логистика = ${fmtMoney(totals.cost)}.`} />
          <Line label={`Наценка ${margin}%`} value={fmtMoney(totals.sale - totals.cost)}
            hint={`Прибыль = ${fmtMoney(totals.cost)} × ${margin}% = ${fmtMoney(totals.sale - totals.cost)}.`} />
          <Line label="Цена продажи" value={fmtMoney(totals.sale)}
            hint={`${fmtMoney(totals.cost)} × (1 + ${margin}/100) = ${fmtMoney(totals.sale)}.`} />
          <Separator />
          <Line label={`С НДС ${vatPercent}%`} value={<span className="font-semibold">{fmtMoney(totals.withVat)}</span>}
            hint={`${fmtMoney(totals.sale)} × (1 + ${vatPercent}/100) = ${fmtMoney(totals.withVat)}. На 1 шт: ${fmtMoney(totals.perItem)}.`} />
          <Line label="Срок производства" value={`~ ${etaDays} дн.`}
            hint="Оценка по тиражу и количеству постпечатных операций." />
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Тираж и формат</div>
          <Line label="Тираж" value={`${fmtNum(circulation)} шт`}
            hint="Из секции «1. Основные параметры». Используется во всех расчётах ниже." />
          <Line label="Формат" value={`${formatLabel} (${itemW}×${itemH} мм)`}
            hint="Из секции «1. Основные параметры». Определяет раскладку и закупочный лист." />
          <Line label="Страниц / тетрадей" value={`${pages} / ${signatures}`}
            hint={`Тетрадь = ${signaturePages} стр. Тетрадей = ⌈${pages}/${signaturePages}⌉ = ${signatures}.`} />
          <Line label="Корешок" value={`${spineMm.toFixed(1)} мм`}
            hint="Толщина блока ≈ (страниц × плотность бумаги) / 1000." />
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Печатные / закупочные листы</div>
          <Line label="Блок: чистых листов" value={fmtNum(blockNetSheets)}
            hint={`Тираж × тетрадей. Полос на сторону: ${blockUpPerSide}.`} />
          <Line label="Блок: с приладкой" value={fmtNum(blockPrintSheets)}
            hint={`Чистые листы + приладка ${blockSetup} × тетрадей.`} />
          <Line label="Обложка: чистых" value={fmtNum(coverNetSheets)}
            hint={`⌈Тираж / ${coverUpPerSheet} на лист⌉.`} />
          <Line label="Обложка: с приладкой" value={fmtNum(coverPrintSheets)}
            hint={`Чистые листы + приладка ${coverSetup}.`} />
          <Line label="Отходы" value={`~ ${wastePercent.toFixed(1)}%`}
            hint="Отношение приладки к чистому тиражу по блоку и обложке." />
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Печать</div>
          <Line label="Способ печати" value={offset ? "Офсет" : "Цифра"}
            hint="Авто-выбор по тиражу: от 300 шт — офсет, иначе цифра." />
          <Line label="Печатных форм" value={fmtNum(formsCount)}
            hint="Только для офсета: (краски блока × тетрадей) + краски обложки." />
        </div>
      </CardContent>
    </Card>
  );
}