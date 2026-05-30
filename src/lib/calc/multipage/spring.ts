/**
 * Автоматический подбор пружины по толщине блока (раздел 26 ТЗ).
 */

export interface SpringSpec {
  diameterMm: number;
  /** Рекомендуемое максимальное число листов 80 г/м² (для подсказок). */
  maxSheets80gsm: number;
  /** Доступные цвета (демо-набор; в проде — из справочника). */
  colors: string[];
}

/** Стандартная таблица пружин (металл / пластик). */
const TABLE: SpringSpec[] = [
  { diameterMm: 6,  maxSheets80gsm: 25,  colors: ["белый", "чёрный"] },
  { diameterMm: 8,  maxSheets80gsm: 40,  colors: ["белый", "чёрный", "серебро"] },
  { diameterMm: 10, maxSheets80gsm: 60,  colors: ["белый", "чёрный", "серебро", "золото"] },
  { diameterMm: 12, maxSheets80gsm: 80,  colors: ["белый", "чёрный", "серебро"] },
  { diameterMm: 14, maxSheets80gsm: 110, colors: ["чёрный", "серебро"] },
  { diameterMm: 16, maxSheets80gsm: 130, colors: ["чёрный", "серебро"] },
  { diameterMm: 19, maxSheets80gsm: 160, colors: ["чёрный"] },
  { diameterMm: 22, maxSheets80gsm: 190, colors: ["чёрный"] },
  { diameterMm: 25, maxSheets80gsm: 220, colors: ["чёрный"] },
  { diameterMm: 28, maxSheets80gsm: 250, colors: ["чёрный"] },
  { diameterMm: 32, maxSheets80gsm: 290, colors: ["чёрный"] },
  { diameterMm: 38, maxSheets80gsm: 340, colors: ["чёрный"] },
];

/** Возвращает минимальную подходящую пружину по толщине блока, мм. */
export function pickSpring(blockThicknessMm: number): SpringSpec {
  const target = Math.max(0, blockThicknessMm) + 2; // запас 2 мм на разворот
  const found = TABLE.find((s) => s.diameterMm >= target);
  return found ?? TABLE[TABLE.length - 1];
}

/** Оценка толщины блока по числу страниц и плотности. */
export function estimateBlockThickness(pages: number, densityGsm: number): number {
  const sheets = Math.ceil(pages / 2);
  // приближение: толщина листа (мм) ≈ density / 800 для офсета/мелованной
  const sheetMm = densityGsm / 800;
  return +(sheets * sheetMm).toFixed(2);
}