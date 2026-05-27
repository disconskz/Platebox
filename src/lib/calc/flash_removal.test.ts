import { describe, it, expect } from "vitest";
import { calcFlashRemoval, type FlashRemovalRule } from "./flash_removal";

const baseRule: FlashRemovalRule = {
  name: "Коробка, авто, за изделие",
  product_type: "box",
  removal_method: "auto",
  calc_mode: "per_item",
  price_per_item: 0.8,
  price_per_sheet: 0,
  price_per_hour: 0,
  default_seconds_per_sheet: 0,
  setup_cost: 3000,
  min_cost: 0,
  coef_contour_simple: 1,
  coef_contour_std_box: 1.2,
  coef_contour_complex_box: 1.3,
  coef_contour_small_parts: 1.5,
  coef_contour_label: 2,
  coef_contour_microflute: 1.4,
  coef_mat_paper: 1,
  coef_mat_cardboard: 1.2,
  coef_mat_thick_cardboard: 1.4,
  coef_mat_microflute: 1.5,
  coef_mat_plastic: 1.8,
  coef_bridges_low: 1,
  coef_bridges_med: 1.2,
  coef_bridges_high: 1.4,
  coef_bridges_extra: 1.6,
  bridges_low_max: 2,
  bridges_med_max: 5,
  bridges_high_max: 10,
  coef_manual: 1.5,
};

describe("calcFlashRemoval", () => {
  it("пример из ТЗ: 500 лист × 12 шт × 0.8 ₸ × 1.3 + 3000 = 9240", () => {
    const r = calcFlashRemoval(baseRule, {
      printSheets: 500, itemsPerSheet: 12,
      contourCoefOverride: 1.3,
      material: "paper",
      bridgesPerItem: 0,
    });
    expect(r.baseCost).toBeCloseTo(6240, 1);
    expect(r.finalCost).toBeCloseTo(9240, 0);
  });

  it("режим за лист", () => {
    const r = calcFlashRemoval({ ...baseRule, price_per_sheet: 15 }, {
      printSheets: 500, itemsPerSheet: 12,
      calcModeOverride: "per_sheet",
      contour: "simple",
    });
    expect(r.baseCost).toBeCloseTo(7500, 1);
  });

  it("по времени", () => {
    const r = calcFlashRemoval({ ...baseRule, price_per_hour: 5000 }, {
      printSheets: 0, itemsPerSheet: 0,
      calcModeOverride: "per_time",
      totalTimeHours: 2,
    });
    expect(r.baseCost).toBeCloseTo(10000, 1);
  });

  it("min_cost применяется", () => {
    const r = calcFlashRemoval({ ...baseRule, min_cost: 5000, setup_cost: 0 }, {
      printSheets: 10, itemsPerSheet: 1,
    });
    expect(r.finalCost).toBe(5000);
  });

  it("коэффициент перемычек по диапазону", () => {
    const r = calcFlashRemoval(baseRule, {
      printSheets: 100, itemsPerSheet: 1,
      bridgesPerItem: 7,
    });
    expect(r.bridgesCoef).toBeCloseTo(1.4, 5);
  });
});