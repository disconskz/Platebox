import { describe, it, expect } from "vitest";
import { calcPerforation, type PerforationRule } from "./perforation";

const baseRule: PerforationRule = {
  perforation_type: "tear",
  equipment_type: "tigel",
  calc_mode: "per_length",
  price_per_meter: 15,
  price_per_sheet: 0,
  price_per_pass: 0,
  coef_paper_light: 1,
  coef_paper_med: 1.2,
  coef_paper_heavy: 1.5,
  coef_cardboard: 2,
  coef_plastic: 2.5,
  density_light_max: 130,
  density_med_max: 250,
  density_heavy_max: 400,
  coef_micro: 1.2,
  coef_figured: 1.5,
  coef_manual: 1.5,
  coef_nonstandard_format: 1.3,
  coef_many_lines: 1.2,
  many_lines_threshold: 3,
  min_format_short: 0,
  max_format_long: 1200,
  max_paper_density: 400,
  max_lines_per_pass: 10,
  setup_cost: 3000,
  min_cost: 0,
};

describe("calcPerforation", () => {
  it("пример из ТЗ: билет 5000 шт, 2×120мм, бумага 300 г/м² → 30 000 ₸", () => {
    const r = calcPerforation(baseRule, {
      circulation: 5000,
      printSheets: 100,
      lineLengthMm: 120,
      linesPerItem: 2,
      paperDensity: 300,
      materialKind: "paper",
    });
    expect(r.totalLengthM).toBeCloseTo(1200, 5);
    expect(r.materialCoef).toBe(1.5);
    expect(r.complexityCoef).toBe(1);
    expect(r.baseCost).toBeCloseTo(27000, 5);
    expect(r.finalCost).toBeCloseTo(30000, 5);
  });

  it("применяет min_cost если расчёт меньше", () => {
    const r = calcPerforation({ ...baseRule, min_cost: 50000 }, {
      circulation: 100, printSheets: 10, lineLengthMm: 50, linesPerItem: 1, paperDensity: 100,
    });
    expect(r.finalCost).toBe(50000);
  });

  it("режим per_sheet", () => {
    const r = calcPerforation(
      { ...baseRule, calc_mode: "per_sheet", price_per_sheet: 2, setup_cost: 1000 },
      { circulation: 1000, printSheets: 500, lineLengthMm: 100, linesPerItem: 1 }
    );
    expect(r.baseCost).toBe(1000);
    expect(r.finalCost).toBe(2000);
  });

  it("includedInDieCut обнуляет стоимость", () => {
    const r = calcPerforation(baseRule, {
      circulation: 5000, printSheets: 100, lineLengthMm: 120, linesPerItem: 2,
      paperDensity: 300, includedInDieCut: true,
    });
    expect(r.finalCost).toBe(0);
  });
});