/**
 * Доработка 84, Этап 4 — авто-расчёт штампа из развёртки.
 *
 * Менеджер не считает ножи и биговки руками: по типу детали и габаритам
 * развёртки система сама вычисляет длину режущих ножей (knife) и биговок (big),
 * затем рассчитывает стоимость изготовления штампа + приладки + прогона тиража.
 *
 * Все длины — в миллиметрах, на ОДНУ деталь. Дальше умножаем на количество
 * деталей на листе (perSheet), чтобы получить длину ножей на штампе.
 */

export type DiecutPartKind =
  | "lid" | "bottom" | "body" | "sleeve" | "tray"
  | "divider" | "insert" | "window" | "liner" | "reinforcement";

export type DiecutInput = {
  kind: DiecutPartKind;
  developW: number;   // мм
  developH: number;   // мм
  perSheet: number;   // деталей на лист
  sheets: number;     // тиражных листов
  /** окно/прорезь в детали (мм). 0 = нет окна */
  windowW?: number;
  windowH?: number;
};

export type DiecutResult = {
  /** Длина режущих ножей на ОДНУ деталь, мм */
  knifePerPartMm: number;
  /** Длина биговок на ОДНУ деталь, мм */
  bigPerPartMm: number;
  /** Итоговая длина ножей на штампе (все детали одного листа), мм */
  knifeOnDieMm: number;
  bigOnDieMm: number;
  /** Стоимости */
  knifeCost: number;
  bigCost: number;
  setupCost: number;
  runCost: number;
  total: number;
  hint: string;
};

// Тарифы (можно вынести в справочник позже)
const KNIFE_PRICE_PER_M = 600; // ₸/м — изготовление режущего ножа
const BIG_PRICE_PER_M = 350;   // ₸/м — биговочный нож
const SETUP_COST = 5000;       // ₸ — приладка штампа
const RUN_PER_SHEET = 12;      // ₸/лист — прогон по тигелю

/**
 * Возвращает количество биговочных линий для типа детали.
 * Самосборные/каробка-полотно имеют 4 фальцовки по периметру (по 2 на сторону).
 * Шубер — 4 биговки по длине. Лайнер/окно/ложемент/перегородка — без биговок.
 */
function bigsForKind(kind: DiecutPartKind, w: number, h: number): number {
  switch (kind) {
    case "body":
    case "lid":
    case "bottom":
      // 4 биговки: 2 поперёк (длина = h) + 2 вдоль (длина = w)
      return 2 * w + 2 * h;
    case "sleeve":
      // Шубер сворачивается в трубу — обычно 3-4 биговки по длине h
      return 4 * h;
    case "divider":
      // Перегородка с одной фальцовкой по центру
      return Math.min(w, h);
    case "liner":
    case "insert":
    case "tray":
    case "window":
    case "reinforcement":
    default:
      return 0;
  }
}

export function calcDiecut(input: DiecutInput): DiecutResult {
  const { kind, developW, developH, perSheet, sheets } = input;

  // Периметр детали — основной нож
  const outerPerim = 2 * (developW + developH);
  // Внутреннее окно/прорезь (если есть)
  const winPerim =
    input.windowW && input.windowH && input.windowW > 0 && input.windowH > 0
      ? 2 * (input.windowW + input.windowH)
      : 0;

  const knifePerPartMm = outerPerim + winPerim;
  const bigPerPartMm = bigsForKind(kind, developW, developH);

  const knifeOnDieMm = knifePerPartMm * Math.max(1, perSheet);
  const bigOnDieMm = bigPerPartMm * Math.max(1, perSheet);

  const knifeCost = (knifeOnDieMm / 1000) * KNIFE_PRICE_PER_M;
  const bigCost = (bigOnDieMm / 1000) * BIG_PRICE_PER_M;
  const setupCost = SETUP_COST;
  const runCost = sheets * RUN_PER_SHEET;
  const total = knifeCost + bigCost + setupCost + runCost;

  const hint =
    `Нож: ${(knifeOnDieMm / 1000).toFixed(2)} м, ` +
    `биг: ${(bigOnDieMm / 1000).toFixed(2)} м, ` +
    `приладка ${SETUP_COST} ₸, прогон ${sheets}×${RUN_PER_SHEET} ₸`;

  return {
    knifePerPartMm,
    bigPerPartMm,
    knifeOnDieMm,
    bigOnDieMm,
    knifeCost,
    bigCost,
    setupCost,
    runCost,
    total,
    hint,
  };
}