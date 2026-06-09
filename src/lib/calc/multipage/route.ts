/**
 * Динамический маршрут производства (разделы 22–24 ТЗ).
 * ERP-движок строит упорядоченный список операций исходя из выбранной
 * технологии: скрывает ненужное, добавляет обязательное.
 */

import type { InternalBlock } from "./blocks";

export interface RouteInput {
  printType: "offset" | "digital" | "uv" | "auto";
  hasCover: boolean;
  hasUnderlay: boolean;
  hasLamination: boolean;
  hasCreasing: boolean;
  hasFolding: boolean;
  hasDieCut: boolean;
  hasStamping: boolean;
  hasEmbossing: boolean;
  hasDrilling: boolean;
  hasPerforation: boolean;
  hasNumbering: boolean;
  hasVariableData: boolean;
  hasQr?: boolean;
  hasBarcodes?: boolean;
  binding: "staple" | "eurostaple" | "kbs" | "thermo" | "spiral" | "pva" | "sewn" | "sewn_kbs" | "hardcover" | "none";
  blocks: Pick<InternalBlock, "kind" | "pages">[];
  packaging: { bundles: boolean; boxes: boolean; shrink: boolean; pallets: boolean };
}

export type RouteStage = "prepress" | "print" | "postpress" | "assembly" | "special" | "qc" | "packaging";

export interface RouteOperation {
  id: string;
  stage: RouteStage;
  label: string;
  /** Подсказка/причина включения в маршрут. */
  hint?: string;
}

/** Возвращает упорядоченный маршрут производства. */
export function buildRoute(input: RouteInput): RouteOperation[] {
  const ops: RouteOperation[] = [];

  // 1. Допечатка — только подготовительные операции (нанесение идёт в Спецоперациях)
  ops.push({ id: "pp-files", stage: "prepress", label: "Подготовка к печати" });
  ops.push({ id: "pp-imp", stage: "prepress", label: "Спуск полос" });
  if (input.printType !== "digital") {
    ops.push({ id: "pp-plates", stage: "prepress", label: "Вывод форм", hint: "офсетная печать" });
  }
  if (input.hasStamping || input.hasEmbossing || input.hasDieCut) {
    ops.push({ id: "pp-stamp", stage: "prepress", label: "Подготовка штампа" });
  }
  if (input.hasVariableData || input.hasNumbering || input.hasQr || input.hasBarcodes) {
    ops.push({ id: "pp-vd-db", stage: "prepress", label: "Подготовка базы переменных данных" });
  }

  // 2. Печать
  const printLabel = input.printType === "digital" ? "Цифровая печать" : input.printType === "uv" ? "UV-печать" : "Офсетная печать";
  if (input.blocks.length <= 1) {
    ops.push({ id: "print-main", stage: "print", label: printLabel });
  } else {
    input.blocks.forEach((b, i) => {
      const kindRu: Record<string, string> = {
        main: "Основной блок",
        insert: "Вставка",
        divider: "Разделитель",
        tracing: "Калька",
        ad: "Реклама",
        endpaper: "Форзац",
        special: "Спецсекция",
      };
      ops.push({
        id: `print-blk-${i}`,
        stage: "print",
        label: `${printLabel} — ${kindRu[b.kind] ?? "Блок"} #${i + 1}`,
        hint: `${b.pages} стр.`,
      });
    });
  }
  if (input.hasCover) ops.push({ id: "print-cover", stage: "print", label: "Печать обложки" });
  if (input.hasUnderlay) ops.push({ id: "print-under", stage: "print", label: "Печать подложки" });

  // 3. Постпечать
  if (input.hasLamination) ops.push({ id: "post-lam", stage: "postpress", label: "Ламинация" });
  // Биговка имеет смысл только если есть ламинация ИЛИ есть фальцовка плотной обложки
  if (input.hasCreasing && (input.hasLamination || input.hasFolding)) {
    ops.push({ id: "post-crease", stage: "postpress", label: "Биговка", hint: "защита от трещин при сгибе" });
  }
  if (input.hasFolding) ops.push({ id: "post-fold", stage: "postpress", label: "Фальцовка" });
  if (input.hasStamping) ops.push({ id: "post-stamp", stage: "postpress", label: "Тиснение фольгой" });
  if (input.hasEmbossing) ops.push({ id: "post-emboss", stage: "postpress", label: "Конгрев" });
  if (input.hasDieCut) ops.push({ id: "post-die", stage: "postpress", label: "Высечка" });
  if (input.hasPerforation) ops.push({ id: "post-perf", stage: "postpress", label: "Перфорация" });
  if (input.hasDrilling) ops.push({ id: "post-drill", stage: "postpress", label: "Сверление" });
  ops.push({ id: "post-cut", stage: "postpress", label: "Резка" });

  // 4. Сборка
  if (input.binding !== "none") {
    const bindLabel: Record<RouteInput["binding"], string> = {
      staple: "Скоба",
      eurostaple: "Евроскоба",
      kbs: "КБС",
      thermo: "Термобиндер",
      spiral: "Установка пружины",
      pva: "Проклейка ПВА",
      sewn: "Шитьё ниткой",
      sewn_kbs: "Шитьё + КБС",
      hardcover: "Сборка твёрдой крышки",
      none: "",
    };
    ops.push({ id: "asm-bind", stage: "assembly", label: bindLabel[input.binding] });
  }
  if (input.blocks.length > 1) {
    ops.push({ id: "asm-collate", stage: "assembly", label: "Подборка блоков", hint: `${input.blocks.length} блоков` });
  }
  ops.push({ id: "asm-final", stage: "assembly", label: "Финальная сборка" });

  // 5. Спецоперации
  if (input.hasNumbering) ops.push({ id: "spc-num", stage: "special", label: "Нумерация" });
  if (input.hasQr) ops.push({ id: "spc-qr", stage: "special", label: "Нанесение QR-кода" });
  if (input.hasBarcodes) ops.push({ id: "spc-bc", stage: "special", label: "Нанесение штрихкода" });
  if (input.hasVariableData) ops.push({ id: "spc-vd", stage: "special", label: "Переменные данные (нанесение)" });

  // 6. Контроль качества
  ops.push({ id: "qc-final", stage: "qc", label: "Контроль качества" });

  // 7. Упаковка
  if (input.packaging.bundles) ops.push({ id: "pk-bundle", stage: "packaging", label: "Пачки" });
  if (input.packaging.shrink) ops.push({ id: "pk-shrink", stage: "packaging", label: "Термоусадка" });
  if (input.packaging.boxes) ops.push({ id: "pk-box", stage: "packaging", label: "Коробки" });
  if (input.packaging.pallets) ops.push({ id: "pk-pallet", stage: "packaging", label: "Паллетирование" });

  return ops;
}

export const ROUTE_STAGE_LABELS: Record<RouteStage, string> = {
  prepress: "Допечатка",
  print: "Печать",
  postpress: "Постпечать",
  assembly: "Сборка",
  special: "Спецоперации",
  qc: "Контроль качества",
  packaging: "Упаковка",
};