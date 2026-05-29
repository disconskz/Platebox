import type { ProductType } from "./types";

/**
 * Карта доступных постпечатных и переплётных операций по виду продукции.
 * Используется в «Новом расчёте», чтобы скрывать неактуальные блоки
 * и сбрасывать их флаги при смене типа изделия / применении шаблона.
 */
export interface ProductCapabilities {
  /** Высечка с штампом */
  diecut: boolean;
  /** Кол-во сгибов / биговка */
  fold: boolean;
  /** Припресс плёнкой */
  lamPrepress: boolean;
  /** Пакетная ламинация (поштучно) */
  pouchLam: boolean;
  /** Рулонная/классическая ламинация (флаг движка) */
  lamination: boolean;
  /** Нумерация (через движок) */
  numbering: boolean;
  /** Тиснение фольгой (Доработка 34) */
  stamping: boolean;
  /** Конгрев (Доработка 35) */
  congrev: boolean;
  /** Перфорация (Доработка 29) */
  perforation: boolean;
  /** Наклейка скотча (Доработка 30) */
  tape: boolean;
  /** Наклейка окна на коробку (Доработка 31) */
  windowCut: boolean;
  /** Удаление облоя (Доработка 32) */
  flashRemoval: boolean;
  /** Установка ригеля (Доработка 33) */
  rigel: boolean;
  /** Переменная печать (нумерация / QR / штрихкод / персонализация) */
  variablePrint: boolean;
  /** Фальцовка тетрадей (для многостраничных) */
  signature: boolean;
  /** Металлическая пружина Wire-O */
  spring: boolean;
  /** Термоклеевое скрепление (КБС) */
  thermal: boolean;
  /** Форзацы, марля, каптал, переплётный картон, кашировка крышки */
  endpaper: boolean;
  /** Скрепление на скобу */
  stapling: boolean;
  /** Отдельный блок «Обложка» (для брошюры/журнала) */
  cover: boolean;
}

export const ALL_CAPS_OFF: ProductCapabilities = {
  diecut: false,
  fold: false,
  lamPrepress: false,
  pouchLam: false,
  lamination: false,
  numbering: false,
  stamping: false,
  congrev: false,
  perforation: false,
  tape: false,
  windowCut: false,
  flashRemoval: false,
  rigel: false,
  variablePrint: false,
  signature: false,
  spring: false,
  thermal: false,
  endpaper: false,
  stapling: false,
  cover: false,
};

function caps(p: Partial<ProductCapabilities>): ProductCapabilities {
  return { ...ALL_CAPS_OFF, ...p };
}

/** Базовый набор для простой листовой продукции. */
const SHEET_BASIC = caps({
  diecut: true,
  fold: true,
  lamPrepress: true,
  pouchLam: true,
  lamination: true,
  perforation: true,
  numbering: true,
  variablePrint: true,
});

export const PRODUCT_CAPABILITIES: Record<ProductType, ProductCapabilities> = {
  // ── Листовая продукция ─────────────────────────────────────────────
  leaflet: SHEET_BASIC,
  leaflet_diecut: { ...SHEET_BASIC, diecut: true, flashRemoval: true },
  booklet: { ...SHEET_BASIC, fold: true, stapling: true },
  businesscard: caps({
    diecut: true, lamPrepress: true, pouchLam: true, lamination: true,
    stamping: true, congrev: true, numbering: false, variablePrint: true,
  }),
  blank: caps({ numbering: true, variablePrint: true, perforation: true }),
  selfcopy: caps({ numbering: true, variablePrint: true, perforation: true, fold: false }),
  poster: caps({ lamPrepress: true, lamination: true }),

  // Наклейки / этикетки
  sticker: caps({ diecut: true, pouchLam: false, lamination: true, flashRemoval: true, variablePrint: true }),
  sticker_diecut: caps({ diecut: true, flashRemoval: true, lamination: true, variablePrint: true }),
  label: caps({ diecut: true, flashRemoval: true, lamination: true, variablePrint: true, perforation: true }),

  // Упаковка / конструкционная
  bag: caps({ diecut: true, fold: true, lamPrepress: true, lamination: true, windowCut: true, tape: true }),
  envelope: caps({ diecut: true, fold: true, tape: true, windowCut: true }),
  box: caps({ diecut: true, fold: true, lamPrepress: true, lamination: true, windowCut: true, tape: true, stamping: true, congrev: true }),
  folder: caps({ diecut: true, fold: true, lamPrepress: true, lamination: true, stamping: true, congrev: true, tape: true }),

  // POS / сувенирка
  wobbler: caps({ diecut: true, lamPrepress: true, lamination: true, flashRemoval: true }),
  shelftalker: caps({ diecut: true, fold: true, lamPrepress: true, lamination: true }),
  kubus: caps({ numbering: false, variablePrint: false }),

  // ── Многостраничные / переплётные ──────────────────────────────────
  notepad: caps({
    diecut: true, fold: true, lamPrepress: true, lamination: true,
    perforation: true, numbering: true, variablePrint: true,
    signature: true, spring: true, thermal: true, stapling: true, endpaper: true,
  }),
  book: caps({
    fold: true, lamPrepress: true, lamination: true,
    stamping: true, congrev: true,
    signature: true, thermal: true, endpaper: true, stapling: false,
  }),
  magazine: caps({
    fold: true, lamPrepress: true, lamination: true,
    signature: true, stapling: true, thermal: true,
    cover: true,
  }),
  brochure: caps({
    fold: true, lamPrepress: true, lamination: true,
    signature: true, stapling: true, thermal: true,
    cover: true,
  }),

  // ── Календари ─────────────────────────────────────────────────────
  calendar_wall: caps({ fold: true, lamPrepress: true, lamination: true, spring: true, rigel: true, signature: true }),
  calendar_desk: caps({ spring: true, signature: true }),
  calendar_quarter: caps({ spring: true, rigel: true, signature: true }),
};

/** Безопасно достать caps по типу продукции. */
export function getCaps(pt: ProductType | string | undefined | null): ProductCapabilities {
  if (!pt) return ALL_CAPS_OFF;
  return PRODUCT_CAPABILITIES[pt as ProductType] ?? ALL_CAPS_OFF;
}