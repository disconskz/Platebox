/**
 * «Состав изделия» (раздел 27 ТЗ).
 * Сводит детали многостраничного изделия в табличный вид:
 * деталь → материал → количество → операции.
 */

import { BLOCK_KIND_LABELS, type InternalBlock } from "./blocks";

export interface CompositionRow {
  part: string;
  material: string;
  quantity: string;
  operations: string[];
}

export interface CompositionInput {
  blocks: InternalBlock[];
  /** Описание обложки (название бумаги). */
  cover?: { material: string; operations: string[] } | null;
  /** Описание подложки. */
  underlay?: { material: string; operations: string[] } | null;
  /** Скрепление: тип + кол-во элементов (1 пружина / N скоб). */
  binding?: { label: string; qty: number; operations: string[] } | null;
  /** Тираж (для «изделие — N шт.»). */
  circulation?: number;
}

export function buildComposition(i: CompositionInput): CompositionRow[] {
  const rows: CompositionRow[] = [];

  if (i.cover) {
    rows.push({
      part: "Обложка",
      material: i.cover.material,
      quantity: "1",
      operations: i.cover.operations,
    });
  }

  if (i.underlay) {
    rows.push({
      part: "Подложка",
      material: i.underlay.material,
      quantity: "1",
      operations: i.underlay.operations,
    });
  }

  i.blocks.forEach((b, idx) => {
    rows.push({
      part: `${BLOCK_KIND_LABELS[b.kind]}${i.blocks.length > 1 ? ` #${idx + 1}` : ""}`,
      material: `${b.paper} ${b.density} г/м²`,
      quantity: `${b.pages} стр.`,
      operations: [
        `Цветность ${b.colorFront}+${b.colorBack}`,
        ...b.operations,
      ],
    });
  });

  if (i.binding) {
    rows.push({
      part: "Скрепление",
      material: i.binding.label,
      quantity: String(i.binding.qty),
      operations: i.binding.operations,
    });
  }

  return rows;
}