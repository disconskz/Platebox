import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fmtMoney, fmtNum } from "@/lib/format";

export interface SpecLineDetail {
  label: string;
  value: string;
}
export interface SpecLine {
  stage: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  details?: SpecLineDetail[];
}

export function SpecTable({ lines }: { lines: SpecLine[] }) {
  const [open, setOpen] = React.useState<Record<number, boolean>>({});
  const toggle = (i: number) => setOpen((s) => ({ ...s, [i]: !s[i] }));
  const [allOpen, setAllOpen] = React.useState(false);
  const expandAll = () => {
    const next: Record<number, boolean> = {};
    lines.forEach((_, i) => (next[i] = !allOpen));
    setOpen(next);
    setAllOpen((v) => !v);
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={expandAll}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {allOpen ? "Свернуть все" : "Раскрыть все"}
        </button>
      </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Этап</TableHead>
          <TableHead>Операция</TableHead>
          <TableHead className="text-right">Кол-во</TableHead>
          <TableHead>Ед.</TableHead>
          <TableHead className="text-right">Цена</TableHead>
          <TableHead className="text-right">Итого</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((l, i) => {
          // Если у строки нет деталей — авто-детализация по умолчанию,
          // чтобы пользователь всегда мог раскрыть и увидеть расчёт.
          const details: SpecLineDetail[] = l.details && l.details.length
            ? l.details
            : [
                { label: "Этап", value: l.stage },
                { label: "Расчёт", value: `${fmtNum(l.qty)} ${l.unit} × ${fmtMoney(l.price)} = ${fmtMoney(l.total)}` },
                { label: "Источник", value: "Базовый расчёт калькулятора" },
              ];
          const has = details.length > 0;
          const isOpen = !!open[i];
          return (
            <React.Fragment key={i}>
              <TableRow
                className={has ? "cursor-pointer hover:bg-muted/40" : ""}
                onClick={has ? () => toggle(i) : undefined}
              >
                <TableCell className="p-1 align-middle">
                  {has ? (
                    isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )
                  ) : null}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.stage}</TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell className="text-right">{fmtNum(l.qty)}</TableCell>
                <TableCell>{l.unit}</TableCell>
                <TableCell className="text-right">{fmtMoney(l.price)}</TableCell>
                <TableCell className="text-right font-medium">{fmtMoney(l.total)}</TableCell>
              </TableRow>
              {has && isOpen && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell />
                  <TableCell colSpan={6} className="py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                      {details.map((d, k) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">{d.label}:</span>
                          <span className="font-mono break-all">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}

export default SpecTable;
