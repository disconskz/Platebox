import { describe, expect, it } from "vitest";
import { calcCongrev, type CongrevRule } from "./congrev";

const baseRule: CongrevRule = {
  name: "Конгрев тест",
  congrev_type: "standard",
  cliche_price_per_cm2: 350,
  cliche_min_cost: 8000,
  setup_cost: 7000,
  price_per_impression: 20,
  complexity_coef: 1,
  min_cost: 0,
  coef_standard: 1,
  coef_deep: 1.3,
  coef_3d: 1.5,
  coef_with_foil: 1.7,
  coef_reverse: 1.3,
  coef_multilevel: 1.5,
  coef_micro: 1.3,
  coef_leather: 1.4,
  coef_complex_position: 1.5,
  coef_small_elements: 1.3,
};

describe("calcCongrev — пример из ТЗ §11", () => {
  it("1000 шт, 10×5 см, коэф. 1.3 → 50 500 ₸", () => {
    const r = calcCongrev(baseRule, {
      circulation: 1000,
      clicheWidthCm: 10,
      clicheHeightCm: 5,
      complexityCoefOverride: 1.3,
    });
    expect(r.clicheAreaCm2).toBe(50);
    expect(r.clicheCost).toBe(17500);
    expect(r.impressionCost).toBe(20000);
    expect(r.complexityCoef).toBe(1.3);
    expect(r.finalCost).toBe(50500);
  });

  it("учитывает минимальную стоимость операции", () => {
    const r = calcCongrev({ ...baseRule, min_cost: 100000 }, {
      circulation: 100,
      clicheWidthCm: 5,
      clicheHeightCm: 5,
    });
    expect(r.finalCost).toBe(100000);
  });

  it("использует мин. стоимость клише, если площадь × цена меньше", () => {
    const r = calcCongrev(baseRule, {
      circulation: 10,
      clicheWidthCm: 1,
      clicheHeightCm: 1,
    });
    expect(r.clicheCost).toBe(8000);
  });
});