import { describe, it, expect } from "vitest";
import { calcEmbossing, type EmbossingRule } from "./embossing";

const baseRule: EmbossingRule = {
  name: "Тиснение фольгой",
  embossing_type: "standard",
  foil_type: "gold",
  uses_foil: true,
  cliche_price_per_cm2: 200,
  cliche_min_cost: 5000,
  setup_cost: 5000,
  price_per_impression: 15,
  foil_price_per_cm2: 0.05,
  complexity_coef: 1,
  min_cost: 0,
  coef_standard: 1,
  coef_congrev: 1.5,
  coef_double: 1.7,
  coef_leather: 1.4,
  coef_complex_position: 1.5,
};

describe("calcEmbossing — ТЗ §10", () => {
  it("полный пример: тираж 1000, клише 10×5, фольга → 32 500 ₸", () => {
    const r = calcEmbossing(baseRule, {
      circulation: 1000,
      clicheWidthCm: 10,
      clicheHeightCm: 5,
    });
    expect(r.clicheAreaCm2).toBe(50);
    expect(r.clicheCost).toBe(10000);
    expect(r.impressionCost).toBe(15000);
    expect(r.foilCost).toBe(2500);
    expect(r.complexityCoef).toBe(1);
    expect(r.finalCost).toBe(32500);
  });

  it("берёт мин. стоимость клише, если расчётная меньше", () => {
    const r = calcEmbossing({ ...baseRule, cliche_price_per_cm2: 50, cliche_min_cost: 8000 }, {
      circulation: 100, clicheWidthCm: 5, clicheHeightCm: 5,
    });
    expect(r.clicheCost).toBe(8000);
  });

  it("без фольги → стоимость фольги = 0", () => {
    const r = calcEmbossing({ ...baseRule, uses_foil: false }, {
      circulation: 1000, clicheWidthCm: 10, clicheHeightCm: 5,
    });
    expect(r.foilCost).toBe(0);
    // (15000 + 0)*1 + 10000 + 5000 = 30000
    expect(r.finalCost).toBe(30000);
  });

  it("конгрев применяет коэффициент 1.5", () => {
    const r = calcEmbossing({ ...baseRule, embossing_type: "congrev", uses_foil: false }, {
      circulation: 1000, clicheWidthCm: 10, clicheHeightCm: 5,
    });
    // (15000)*1.5 + 10000 + 5000 = 37500
    expect(r.complexityCoef).toBe(1.5);
    expect(r.finalCost).toBe(37500);
  });

  it("min_cost операции имеет приоритет", () => {
    const r = calcEmbossing({ ...baseRule, min_cost: 50000 }, {
      circulation: 1000, clicheWidthCm: 10, clicheHeightCm: 5,
    });
    expect(r.finalCost).toBe(50000);
  });

  it("override итоговой стоимости клише", () => {
    const r = calcEmbossing(baseRule, {
      circulation: 1000, clicheWidthCm: 10, clicheHeightCm: 5,
      clicheCostOverride: 1234,
    });
    expect(r.clicheCost).toBe(1234);
  });
});