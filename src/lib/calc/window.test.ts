import { describe, it, expect } from "vitest";
import { calcWindow, type WindowRule } from "./window";

const baseRule: WindowRule = {
  name: "PET 200мкм",
  window_material: "pet",
  window_shape: "rect",
  application_method: "semi_auto",
  equipment_type: "semi_auto",
  calc_mode: "combined",
  material_thickness_mkm: 200,
  price_material_per_m2: 1200,
  price_apply_per_item: 5,
  price_apply_per_m2: 0,
  setup_cost: 3000,
  min_cost: 3000,
  coef_standard: 1,
  coef_figured: 1.3,
  coef_thick_pet: 1.2,
  coef_manual: 1.5,
  coef_nonstandard_format: 1.2,
  coef_many_windows: 1.2,
  coef_complex_position: 1.3,
  thick_pet_threshold_mkm: 250,
  many_windows_threshold: 2,
  min_window_mm: 10,
  max_window_mm: 600,
  max_material_thickness_mkm: 500,
  allowed_shapes: "rect,round,oval,figured,nonstandard",
};

describe("calcWindow", () => {
  it("пример из ТЗ: 100×80, 5000 шт, PET 1200₸/м², 5₸/окно, приладка 3000 → 76000", () => {
    const r = calcWindow(baseRule, {
      circulation: 5000, windowWidthMm: 100, windowHeightMm: 80, windowsPerItem: 1,
    });
    expect(r.windowAreaM2).toBeCloseTo(0.008, 6);
    expect(r.materialCost).toBeCloseTo(48000, 1);
    expect(r.applyCost).toBeCloseTo(25000, 1);
    expect(r.finalCost).toBeCloseTo(76000, 0);
  });

  it("применяет минимальную стоимость", () => {
    const r = calcWindow(baseRule, {
      circulation: 10, windowWidthMm: 50, windowHeightMm: 50, windowsPerItem: 1,
    });
    expect(r.finalCost).toBeGreaterThanOrEqual(3000);
  });

  it("предупреждение при превышении размеров окна", () => {
    const r = calcWindow(baseRule, {
      circulation: 100, windowWidthMm: 800, windowHeightMm: 50, windowsPerItem: 1,
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("коэффициент фигурного окна", () => {
    const r = calcWindow(baseRule, {
      circulation: 100, windowWidthMm: 100, windowHeightMm: 80, windowsPerItem: 1,
      shapeOverride: "figured",
    });
    expect(r.complexityCoef).toBeCloseTo(1.3, 5);
  });
});