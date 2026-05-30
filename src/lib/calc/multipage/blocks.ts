/**
 * Модель «Внутренних блоков» многостраничного изделия.
 * Этап 2 переработки ERP-архитектуры (см. .lovable/plan.md).
 *
 * Менеджер может создать любое количество блоков (➕ Добавить блок),
 * у каждого свой тип (основной / вставка / разделитель / калька / …)
 * и собственные параметры (бумага, плотность, листы, цветность, печать).
 * Глобальные параметры (формат, тираж, тип печати) — наследуются
 * из MultipageCalcContext, локальные переопределения управляются флагом `override`.
 */

export type BlockKind =
  | "main"
  | "insert"
  | "divider"
  | "tracing"
  | "ad"
  | "endpaper"
  | "special";

export const BLOCK_KIND_LABELS: Record<BlockKind, string> = {
  main: "Основной блок",
  insert: "Вставка",
  divider: "Разделитель",
  tracing: "Калька",
  ad: "Рекламный блок",
  endpaper: "Форзац",
  special: "Спецсекция",
};

export type PrintKindLocal = "auto" | "offset" | "digital" | "uv";

export interface InternalBlock {
  id: string;
  kind: BlockKind;
  /** Название бумаги (произвольная строка либо ключ из справочника бумаг). */
  paper: string;
  /** Плотность бумаги, г/м². */
  density: number;
  /** Количество страниц блока (как в текущем интерфейсе). */
  pages: number;
  /** Цветность лица/оборота. */
  colorFront: number;
  colorBack: number;
  /** Локальный тип печати. Если override=false — берётся глобальный. */
  printType: PrintKindLocal;
  /** Дополнительные операции (свободные строковые метки). */
  operations: string[];
  /** Включить локальные параметры (Переопределить параметры блока). */
  override: boolean;
  /** Комментарий менеджера. */
  note?: string;
}

let counter = 0;
export function newBlockId(): string {
  counter += 1;
  return `blk_${Date.now().toString(36)}_${counter}`;
}

export function makeDefaultBlock(partial?: Partial<InternalBlock>): InternalBlock {
  return {
    id: newBlockId(),
    kind: "main",
    paper: "Офсет",
    density: 80,
    pages: 16,
    colorFront: 4,
    colorBack: 4,
    printType: "auto",
    operations: [],
    override: false,
    ...partial,
  };
}