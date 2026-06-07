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
  return (
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
          const has = !!(l.details && l.details.length);
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
                      {l.details!.map((d, k) => (
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
  );
}

export default SpecTable;
