import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes } from "lucide-react";
import type { CompositionRow } from "@/lib/calc/multipage/composition";

/** Состав изделия (раздел 27 ТЗ). */
export default function CompositionTable({ rows }: { rows: CompositionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Boxes className="h-4 w-4" />
          Состав изделия
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Деталь</TableHead>
              <TableHead className="w-[32%]">Материал</TableHead>
              <TableHead className="w-[14%]">Количество</TableHead>
              <TableHead>Операции</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.part}</TableCell>
                <TableCell>{r.material}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.operations.length ? r.operations.join(" · ") : "—"}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-sm text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}