import { describe, it, expect } from "vitest";
import { bestLayout, calculateForms, determineTurnaround, runCalculation } from "./engine";
import { CalcInput } from "./types";

const material = { id: "m1", name: "Test 130", format_width: 640, format_height: 920, cost_per_sheet: 80 };

describe("layout", () => {
  it("places A4 leaflet on max sheet", () => {
    const l = bestLayout(210, 297, false);
    expect(l).toBeTruthy();
    expect(l!.itemsPerSheet).toBeGreaterThanOrEqual(2);
  });
  it("uses sticker gap", () => {
    const l = bestLayout(50, 50, true);
    expect(l).toBeTruthy();
    expect(l!.gap).toBeGreaterThan(0);
  });
});

describe("turnaround", () => {
  it("none when back=0", () => {
    expect(determineTurnaround("leaflet", "A4", 210, 297, 4, 0, 4)).toBe("none");
  });
  it("foreign when colors differ", () => {
    expect(determineTurnaround("leaflet", "A4", 210, 297, 4, 1, 4)).toBe("foreign");
  });
  it("own for small leaflet 4+4", () => {
    expect(determineTurnaround("leaflet", "A4", 210, 297, 4, 4, 4)).toBe("own");
  });
});

describe("forms", () => {
  it("own = front colors", () => {
    expect(calculateForms(4, 4, "own")).toBe(4);
  });
  it("foreign = sum", () => {
    expect(calculateForms(4, 1, "foreign")).toBe(5);
  });
});

describe("runCalculation", () => {
  it("calculates leaflet 4+4 1000pcs", () => {
    const input: CalcInput = {
      productType: "leaflet",
      circulation: 1000,
      formatType: "A4",
      formatWidth: 210,
      formatHeight: 297,
      colorFront: 4,
      colorBack: 4,
      material,
      designQty: 2,
      photoOutputUnitCost: 0,
    };
    const r = runCalculation(input);
    expect(r.totalCost).toBeGreaterThan(0);
    expect(r.forms).toBe(4);
    expect(r.turnaround).toBe("own");
    expect(r.spec.length).toBeGreaterThan(3);
  });
});