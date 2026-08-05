import { describe, it, expect } from "vitest";
import { runCalculation } from "./engine";

const material = {
  id: "m1",
  name: "Test 130",
  format_width: 640,
  format_height: 920,
  cost_per_sheet: 80,
};

const baseInput = {
  productType: "leaflet",
  circulation: 1000,
  formatType: "custom",
  formatWidth: 100,
  formatHeight: 70,
  colorFront: 4,
  colorBack: 4,
  material,
  designQty: 2,
  photoOutputUnitCost: 0,
  formatPairs: [{ print: { width: 520, height: 360 }, purchase: { width: 640, height: 920 } }],
};

describe("cut override guardrails", () => {
  it("zero sheet cuts override must not collapse cut count to 0", () => {
    const r = runCalculation({
      ...baseInput,
      cutsPerSheetOverride: 0,
      paperCutsPerSheetOverride: 0,
      manualForms: 1,
    });
    expect(r.cutInfo).toBeTruthy();
    expect(r.cutInfo?.cutsPerSheet).toBeGreaterThan(0);
    expect(r.cutInfo?.source).toBe("auto");
  });
});
