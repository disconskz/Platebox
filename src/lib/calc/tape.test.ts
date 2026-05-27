import { describe, it, expect } from "vitest";
import { calcTape, type TapeRule } from "./tape";

const baseRule: TapeRule = {
  name: "test",
  tape_type: "transparent",
  tape_width_mm: 12,
  application_method: "semi_auto",
  calc_mode: "per_length",
  price_per_meter: 25,
  price_per_point: 0,
  price_per_item_apply: 3,
  setup_cost: 2000,
  min_cost: 0,
  coef_standard: 1,
  coef_foam: 1.2,
  coef_manual: 1.5,
  coef_nonstandard_format: 1.3,
  coef_complex_position: 1.4,
  coef_small_circulation: 1.2,
  coef_many_strips: 1.2,
  small_circulation_threshold: 100,
  many_strips_threshold: 3,
};

describe("calcTape (Доработка 30)", () => {
  it("пример ТЗ: коробка 5000шт, 2 полосы × 120мм, 25 ₸/м, 3 ₸/шт, приладка 2000 → 47 000 ₸", () => {
    const r = calcTape(baseRule, {
      circulation: 5000, stripLengthMm: 120, stripsPerItem: 2, pointsPerItem: 0,
    });
    expect(r.totalLengthM).toBeCloseTo(1200, 5);
    expect(r.materialCost).toBeCloseTo(30000, 5);
    expect(r.applyCost).toBeCloseTo(15000, 5);
    expect(r.complexityCoef).toBe(1);
    expect(r.finalCost).toBeCloseTo(47000, 5);
  });

  it("режим per_point", () => {
    const r = calcTape({ ...baseRule, calc_mode: "per_point", price_per_point: 2 }, {
      circulation: 1000, stripLengthMm: 0, stripsPerItem: 0, pointsPerItem: 4,
    });
    expect(r.materialCost).toBe(8000);
    expect(r.finalCost).toBe(8000 + 2000);
  });

  it("минимальная стоимость", () => {
    const r = calcTape({ ...baseRule, min_cost: 60000 }, {
      circulation: 5000, stripLengthMm: 120, stripsPerItem: 2, pointsPerItem: 0,
    });
    expect(r.finalCost).toBe(60000);
  });
});