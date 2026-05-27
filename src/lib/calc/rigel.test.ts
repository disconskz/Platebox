import { describe, it, expect } from "vitest";
import { calcRigel, type RigelRule } from "./rigel";

const baseRule: RigelRule = {
  name: "test",
  rigel_type: "metal",
  rigel_material: "metal",
  rigel_color: "white",
  calc_mode: "per_item",
  price_per_item: 18,
  price_per_meter: 60,
  length_allowance: 0,
  has_hanger: true,
  hanger_included: true,
  hanger_price: 0,
  install_price: 7,
  install_method: "semi_auto",
  setup_cost: 2000,
  min_cost: 0,
  coef_standard: 1,
  coef_nonstandard_length: 1.2,
  coef_manual: 1.5,
  coef_nonstandard_color: 1.1,
  coef_small_circulation: 1.2,
  coef_complex_position: 1.3,
  small_circulation_threshold: 100,
  min_width: 0,
  max_width: 1500,
};

describe("calcRigel", () => {
  it("ТЗ-33 пример 1: готовый ригель — 27 000 ₸", () => {
    const r = calcRigel(baseRule, { circulation: 1000, calendarWidthMm: 300 });
    // 1000*18 + 1000*7 = 25000, ×1 + 2000 = 27000
    expect(r.finalCost).toBe(27000);
  });

  it("ТЗ-33 пример 2: по метражу — 27 000 ₸", () => {
    const r = calcRigel(
      { ...baseRule, calc_mode: "per_length" },
      { circulation: 1000, calendarWidthMm: 300 },
    );
    // 1000 * 0.3 * 60 = 18000 + 1000*7 = 25000 + 2000 = 27000
    expect(r.finalCost).toBe(27000);
  });

  it("учитывает отдельный подвес", () => {
    const r = calcRigel(
      { ...baseRule, has_hanger: true, hanger_included: false, hanger_price: 2 },
      { circulation: 100, calendarWidthMm: 300 },
    );
    // 100*18 + 100*2 + 100*7 = 2700, *1 + 2000 = 4700
    expect(r.finalCost).toBe(4700);
  });

  it("применяет минимальную стоимость", () => {
    const r = calcRigel(
      { ...baseRule, min_cost: 50000 },
      { circulation: 100, calendarWidthMm: 300 },
    );
    expect(r.finalCost).toBe(50000);
  });
});