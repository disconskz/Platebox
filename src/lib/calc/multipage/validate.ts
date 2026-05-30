/**
 * Технологические предупреждения (раздел 25 ТЗ).
 * ERP автоматически предупреждает менеджера о потенциальных проблемах.
 */

export type WarnLevel = "info" | "warn" | "error";

export interface TechWarning {
  id: string;
  level: WarnLevel;
  message: string;
}

export interface ValidateInput {
  hasLamination: boolean;
  hasCreasing: boolean;
  hasFolding: boolean;
  binding: string;
  /** Толщина внутреннего блока, мм (если известно). */
  blockThicknessMm?: number;
  /** Подобранный диаметр пружины, мм. */
  springDiameterMm?: number;
  /** Печатный формат, мм. */
  printW?: number;
  printH?: number;
  /** Максимальный печатный формат оборудования. */
  maxPrintW?: number;
  maxPrintH?: number;
  /** Кол-во полезных изделий на печатном листе. */
  itemsPerSheet?: number;
  /** Общее число страниц блока. */
  pages?: number;
}

export function validateTech(i: ValidateInput): TechWarning[] {
  const out: TechWarning[] = [];

  if (i.hasLamination && i.hasFolding && !i.hasCreasing) {
    out.push({
      id: "lam-no-crease",
      level: "warn",
      message: "Ламинация без биговки — высокий риск трещин по фальцу.",
    });
  }

  if (i.binding === "spiral" && i.blockThicknessMm && i.springDiameterMm) {
    if (i.blockThicknessMm > i.springDiameterMm - 2) {
      out.push({
        id: "spring-too-thin",
        level: "warn",
        message: `Толщина блока (${i.blockThicknessMm.toFixed(1)} мм) близка к диаметру пружины (${i.springDiameterMm} мм).`,
      });
    }
  }

  if (i.printW && i.printH && i.maxPrintW && i.maxPrintH) {
    if (i.printW > i.maxPrintW || i.printH > i.maxPrintH) {
      out.push({
        id: "format-too-big",
        level: "error",
        message: `Формат ${i.printW}×${i.printH} мм не помещается на печатный лист ${i.maxPrintW}×${i.maxPrintH} мм.`,
      });
    }
  }

  if (i.itemsPerSheet != null && i.itemsPerSheet > 0 && i.itemsPerSheet < 2) {
    out.push({
      id: "bad-imposition",
      level: "warn",
      message: "Невыгодный спуск: 1 изделие на печатный лист, высокая стоимость материала.",
    });
  }

  if (i.binding === "staple" && i.pages != null && i.pages > 80) {
    out.push({
      id: "staple-too-many",
      level: "warn",
      message: `Скоба плохо держит ${i.pages} стр. — рекомендуется КБС или шитьё.`,
    });
  }

  return out;
}