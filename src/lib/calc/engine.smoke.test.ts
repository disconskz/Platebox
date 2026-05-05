import { describe, it, expect } from "vitest";
import { runCalculation } from "./engine";
import { ProductType, FormatType, CalcInput } from "./types";
import { PRODUCT_LABELS } from "./products";

const baseMaterial = {
  id: "test", name: "тест-бумага", format_width: 640, format_height: 920, cost_per_sheet: 80,
};

const types = Object.keys(PRODUCT_LABELS) as ProductType[];

describe("engine smoke for all product types", () => {
  for (const pt of types) {
    it(`${pt} (${PRODUCT_LABELS[pt]}) — runs without throw and totalCost > 0`, () => {
      const input: CalcInput = {
        productType: pt,
        circulation: 1000,
        formatType: "A4" as FormatType,
        formatWidth: 210,
        formatHeight: 297,
        colorFront: 4,
        colorBack: 4,
        material: baseMaterial,
        designQty: 2,
        photoOutputUnitCost: 0,
        vatPercent: 16,
      };
      const r = runCalculation(input);
      expect(r.totalCost).toBeGreaterThan(0);
      expect(r.layout.itemsPerSheet).toBeGreaterThan(0);
      expect(r.vatAmount).toBeCloseTo(r.totalCost * 0.16, 2);
      expect(r.totalWithVat).toBeCloseTo(r.totalCost * 1.16, 2);
    });
  }
});
