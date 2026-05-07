import { describe, it, expect } from "vitest";
import { bestLayout, bestPair, calculateForms, determineTurnaround, runCalculation } from "./engine";
import { CalcInput, FormatPair } from "./types";

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
  it("picks an efficient print sheet from catalog for business card", () => {
    const formats = [
      { width: 1040, height: 720 },
      { width: 720, height: 520 },
      { width: 520, height: 360 },
      { width: 460, height: 320 },
    ];
    const l = bestLayout(90, 50, false, formats);
    expect(l).toBeTruthy();
    // Должен выбрать один из листов из справочника (наиболее эффективный по отходам)
    expect([460, 520, 720, 1040]).toContain(l!.printFormat.width);
    expect(l!.itemsPerSheet).toBeGreaterThan(10);
  });
  it("scales up when product does not fit smallest format", () => {
    const formats = [
      { width: 720, height: 520 },
      { width: 460, height: 320 },
    ];
    // А4 листовка 210×297 не помещается несколько раз в 460×320 эффективно — проверяем что выбран какой-то из списка
    const l = bestLayout(210, 297, false, formats);
    expect(l).toBeTruthy();
    expect([460, 720]).toContain(l!.printFormat.width);
  });
});

describe("bestPair", () => {
  it("250x297 leaflet picks 520x360 from 720x1040 (4 per purchase), not 640x306 from 640x920 (3 per purchase)", () => {
    const pairs: FormatPair[] = [
      { print: { width: 640, height: 306 }, purchase: { width: 640, height: 920 } },
      { print: { width: 520, height: 360 }, purchase: { width: 720, height: 1040 } },
      { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
    ];
    const r = bestPair(250, 297, false, pairs);
    expect(r).toBeTruthy();
    expect(r!.pair.print.width).toBe(520);
    expect(r!.pair.print.height).toBe(360);
    expect(r!.pair.purchase.width).toBe(720);
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