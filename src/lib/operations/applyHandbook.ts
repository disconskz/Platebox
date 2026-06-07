import type { HandbookLine } from "./HandbookProvider";
import type { TemplateOpKey } from "./templateOpsMap";

type PushFn = (stage: string, name: string, qty: number, unit: string, price: number) => void;
type PriceOpFn = (key: TemplateOpKey, vars: Record<string, number>) => HandbookLine[] | null;

/**
 * Возвращает helper `tryHB(opKey, vars, fallback)`:
 *  - если в справочнике есть рабочие work_items и все переменные посчитались — пушит строки из справочника;
 *  - иначе вызывает `fallback()` (старый захардкоженный расчёт).
 *
 * baseCtx обычно содержит `{ "ТИРАЖ": circulation }`.
 */
export function buildTryHandbook(
  priceOp: PriceOpFn,
  push: PushFn,
  baseCtx: Record<string, number>,
) {
  return (opKey: TemplateOpKey, vars: Record<string, number>, fallback: () => void): void => {
    const lines = priceOp(opKey, { ...baseCtx, ...vars });
    if (lines && lines.length) {
      for (const l of lines) push(l.stage, l.name, l.qty, l.unit, l.price);
    } else {
      fallback();
    }
  };
}