import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { ROUTE_STAGE_LABELS, type RouteOperation } from "@/lib/calc/multipage/route";

/**
 * Технологический отчёт (разделы 28–30 ТЗ).
 * Виден только в Технологическом режиме.
 */

export interface TechReportData {
  material: {
    name: string;
    purchaseFormat?: string;
    purchaseSheets?: number;
    costTotal?: number;
    wasteSheets?: number;
    wastePercent?: number;
  };
  imposition: {
    printFormat?: string;
    itemsPerSheet?: number;
    printSheets?: number;
    signatures?: number;
    variant?: string;
  };
  print: {
    type: string;
    colors?: string;
    forms?: number;
    formsCost?: number;
    setupSheets?: number;
    printCost?: number;
  };
  postpress: string[];
  route: RouteOperation[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return null;
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

export default function TechReport({ data }: { data: TechReportData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4" />
          Технологический отчёт
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Section title="Материал">
          <Row k="Бумага" v={data.material.name} />
          <Row k="Закупочный формат" v={data.material.purchaseFormat} />
          <Row k="Закупочных листов" v={data.material.purchaseSheets} />
          <Row k="Стоимость материала" v={data.material.costTotal != null ? data.material.costTotal.toLocaleString("ru-RU") : undefined} />
          <Row k="Отходы, листов" v={data.material.wasteSheets} />
          <Row k="Отходы, %" v={data.material.wastePercent != null ? `${data.material.wastePercent.toFixed(1)}%` : undefined} />
        </Section>

        <Section title="Спуск">
          <Row k="Печатный формат" v={data.imposition.printFormat} />
          <Row k="Изделий на листе" v={data.imposition.itemsPerSheet} />
          <Row k="Печатных листов" v={data.imposition.printSheets} />
          <Row k="Тетрадей" v={data.imposition.signatures} />
          <Row k="Вариант раскладки" v={data.imposition.variant} />
        </Section>

        <Section title="Печать">
          <Row k="Тип" v={data.print.type} />
          <Row k="Цветность" v={data.print.colors} />
          <Row k="Форм" v={data.print.forms} />
          <Row k="Стоимость форм" v={data.print.formsCost != null ? data.print.formsCost.toLocaleString("ru-RU") : undefined} />
          <Row k="Приладка, листов" v={data.print.setupSheets} />
          <Row k="Стоимость печати" v={data.print.printCost != null ? data.print.printCost.toLocaleString("ru-RU") : undefined} />
        </Section>

        <Section title="Постпечатка">
          {data.postpress.length === 0 ? (
            <div className="text-muted-foreground">—</div>
          ) : (
            <ul className="list-disc pl-4 space-y-0.5">
              {data.postpress.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </Section>

        <Section title="Маршрут">
          <ol className="list-decimal pl-4 space-y-0.5">
            {data.route.map((op) => (
              <li key={op.id}>
                <span className="text-muted-foreground">[{ROUTE_STAGE_LABELS[op.stage]}]</span> {op.label}
              </li>
            ))}
          </ol>
        </Section>
      </CardContent>
    </Card>
  );
}