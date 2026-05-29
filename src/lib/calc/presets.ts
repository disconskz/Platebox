import { ProductType } from "./types";

/**
 * Технологические пресеты постпечати по типу изделия.
 * Используются для авто-включения чекбоксов и подсказок в калькуляторе.
 * Источник: исторические маршруты из Fortress (ZAKPROC) + справочник работ (RABOTY).
 */
export interface ProductPreset {
  hasFold?: boolean;
  foldCount?: number;
  hasDieCut?: boolean;
  hasLamPrepress?: boolean;
  lamPrepressSides?: 1 | 2;
  hasLamination?: boolean;
  laminationSides?: 1 | 2;
  /** Имена операций из таблицы operations, которые типично применяются */
  suggestedOps?: string[];
  /** Подсказка пользователю */
  hint?: string;
}

export const PRODUCT_PRESETS: Record<ProductType, ProductPreset> = {
  leaflet: { hint: "Резка → печать → упаковка." },
  leaflet_diecut: { hasDieCut: true, hint: "Добавьте плёнку, если нужна вырубка по контуру." },
  booklet: { hasFold: true, foldCount: 1, hint: "Фальцовка обязательна. Для глянцевой — припрессовка плёнки." },
  sticker: { hint: "Самоклейка, без оборота." },
  sticker_diecut: { hasDieCut: true, hint: "Высечка контура — обязательна." },
  bag: { hasLamPrepress: true, lamPrepressSides: 1, hasDieCut: true, suggestedOps: ["Пакет А4 (сборка/ручки)"], hint: "Припрессовка + вырубка + сборка ручек." },
  businesscard: { suggestedOps: ["Скругление углов"], hint: "Часто: скругление углов, ламинация." },
  envelope: { hasDieCut: true, suggestedOps: ["Наклеить 3 полосы скотча + сборка конверта"], hint: "Высечка + сборка." },
  box: { hasDieCut: true, suggestedOps: ["Сборка коробки", "Наклеить скотч 3 полосы + склейка коробки"], hint: "Высечка + биговка + сборка." },
  blank: { hint: "Бланк — обычно 1+0, без постпечати." },
  selfcopy: { hint: "Самокопирующая бумага, нумерация по требованию." },
  folder: { hasDieCut: true, suggestedOps: ["Формирование папки", "Вклейка кармана в папку"], hint: "Высечка + биговка + сборка кармана." },
  poster: { hint: "Большой формат, без постпечати." },
  notepad: { suggestedOps: ["Спираль 9.5мм А5 24 витка", "Спираль 9.5мм А4 35 витков"], hint: "Подложка + проклейка/спираль." },
  book: { suggestedOps: ["Твёрдый переплёт книги А5", "Твёрдый переплёт книги А4"], hint: "Многостраничное издание: фальцовка тетрадей + переплёт." },
  magazine: { hasFold: true, foldCount: 1, suggestedOps: ["Скрепка на стрекозе", "Упаковка журналов с резкой"], hint: "Скрепка/КБС + упаковка." },
  brochure: { hasFold: true, foldCount: 1, suggestedOps: ["Скрепка на стрекозе"], hint: "Фальцовка + скрепка." },
  label: { hint: "Самоклейка с высечкой по контуру." },
  calendar_wall: { hasFold: true, foldCount: 1, suggestedOps: ["Бегунок", "Одевание бегунка на календарь", "Ригель 30см"], hint: "Перекидной: пружина/бегунок + ригель." },
  calendar_desk: { suggestedOps: ["Спираль 9.5мм А6 17 витков"], hint: "Перекидной настольный — спираль + подставка." },
  calendar_quarter: { suggestedOps: ["Бегунок", "Одевание бегунка на календарь"], hint: "3 блока + бегунок + шапка." },
  calendar_pocket: { hint: "Карманный календарь — печать + резка." },
  catalog: { hasFold: true, foldCount: 1, suggestedOps: ["Скрепка на стрекозе"], hint: "Каталог — фальцовка + скрепка/КБС." },
  book_hardcover: { suggestedOps: ["Твёрдый переплёт книги А5", "Твёрдый переплёт книги А4"], hint: "Твёрдый переплёт: тетради + крышка." },
  planner: { suggestedOps: ["Твёрдый переплёт книги А5"], hint: "Ежедневник — тетради + переплёт." },
  wobbler: { hasDieCut: true, suggestedOps: ["Наклеить воблер"], hint: "Высечка контура + ножка." },
  shelftalker: { hasDieCut: true, hint: "Высечка по контуру + биговка." },
  kubus: { suggestedOps: ["Раздербанивание"], hint: "Блок проклеенный с отрывом." },
};