import * as React from "react";
import CostByStageBlock, { type SpecLine, type CostByStageMetrics } from "./CostByStageBlock";

/**
 * Универсальная обёртка над `CostByStageBlock` для «легаси»-калькуляторов
 * (LeafletCalculator, BusinessCardCalculator, BagCalculator и т.д.),
 * которые формируют спецификацию либо в форме `{stage,name,qty,unit,price,total}`,
 * либо в форме `{stage,name,quantity,unit,unitPrice,total}`.
 * Автоматически нормализует входные строки к `SpecLine`.
 */
export interface LegacySpecLine {
  stage?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  unit?: string;
  price?: number;
  unitPrice?: number;
  total?: number;
}

export interface LegacyCostByStageBlockProps {
  /** Массив строк спецификации в любой из двух поддерживаемых форм. */
  lines: LegacySpecLine[];
  /** Ключ для localStorage с пользовательскими корректировками. */
  storageKey: string;
  /** Дополнительные технологические метрики (опционально). */
  metrics?: CostByStageMetrics;
}

function normalize(lines: LegacySpecLine[]): SpecLine[] {
  return (lines || []).map((l) => ({
    stage: String(l.stage ?? "—"),
    name: String(l.name ?? ""),
    qty: Number(l.qty ?? l.quantity ?? 0),
    unit: String(l.unit ?? ""),
    price: Number(l.price ?? l.unitPrice ?? 0),
    total: Number(l.total ?? 0),
  }));
}

export default function LegacyCostByStageBlock({ lines, storageKey, metrics }: LegacyCostByStageBlockProps) {
  const spec = React.useMemo(() => normalize(lines), [lines]);
  if (!spec.length) return null;
  return <CostByStageBlock spec={spec} metrics={metrics} storageKey={storageKey} />;
}