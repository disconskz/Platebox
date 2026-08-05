import { describe, it, expect } from "vitest";
import { runMultiSkuCalculation, SkuItem } from "./multi-sku";
import { FormatPair } from "./types";

const material = { id: "m1", name: "Test 130", format_width: 640, format_height: 920, cost_per_sheet: 80 };

const pairs: FormatPair[] = [
  { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
  { print: { width: 520, height: 360 }, purchase: { width: 720, height: 1040 } },
];

function mkSkus(n: number, circulation = 100): SkuItem[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `SKU-${i + 1}`,
    width: 105,
    height: 148,
    circulation,
  }));
}

describe("multi-sku", () => {
  it("30 leaflets on A6 in A3+ across 4 colors should fit and compute min forms", () => {
    const r = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(30, 200),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
    });
    expect(r.slotsPerSheet).toBeGreaterThanOrEqual(8);
    const minVar = r.variants.find((v) => v.kind === "min_forms")!;
    expect(minVar.impositions).toBe(Math.ceil(30 / r.slotsPerSheet));
    expect(minVar.emptySlots).toBe(minVar.impositions * r.slotsPerSheet - 30);
  });

  it("for large circulation, all variants have at least one variant and best is minimal", () => {
    const r = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(30, 5000),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
    });
    expect(r.variants.length).toBeGreaterThanOrEqual(1);
    const best = r.variants[r.bestIndex];
    for (const v of r.variants) expect(v.totalCost).toBeGreaterThanOrEqual(best.totalCost);
  });

  it("1 SKU in list should generate one imposition minimum", () => {
    const r = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(1, 1000),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
    });
    const minVar = r.variants.find((v) => v.kind === "min_forms")!;
    expect(minVar.impositions).toBe(1);
  });

  it("multi-sku circulation rule uses max circulation as baseline", () => {
    const skus: SkuItem[] = [
      { name: "A", width: 105, height: 148, circulation: 5000 },
      { name: "B", width: 105, height: 148, circulation: 100 },
    ];
    const r = runMultiSkuCalculation({
      productType: "leaflet",
      skus,
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
    });
    const minVar = r.variants.find((v) => v.kind === "min_forms")!;
    expect(minVar.impositions).toBe(1);
    expect(minVar.printSheetsTotal).toBeGreaterThanOrEqual(5000);
  });

  it("paperCutsPerSheetOverride in multi-sku changes postpress cost", () => {
    const base = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(6, 100),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
    });

    const overridden = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(6, 100),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
      paperCutsPerSheetOverride: 10,
    });

    const basePostpress = base.variants[0].postpress.reduce((s, i) => s + i.total, 0);
    const overridePostpress = overridden.variants[0].postpress.reduce((s, i) => s + i.total, 0);

    expect(overridePostpress).not.toBe(basePostpress);
    expect(overridden.variants[0].totalCost).not.toBe(base.variants[0].totalCost);
  });

  it("cutsPerSheetOverride has priority over paperCutsPerSheetOverride in multi-sku", () => {
    const a = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(6, 100),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
      paperCutsPerSheetOverride: 20,
      cutsPerSheetOverride: 2,
    });
    const b = runMultiSkuCalculation({
      productType: "leaflet",
      skus: mkSkus(6, 100),
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
      paperCutsPerSheetOverride: 20,
      cutsPerSheetOverride: 30,
    });

    const aCost = a.variants[0].postpress.reduce((s, i) => s + i.total, 0);
    const bCost = b.variants[0].postpress.reduce((s, i) => s + i.total, 0);

    expect(a.totalCost).not.toBe(b.totalCost);
    expect(aCost).not.toBe(bCost);
    expect(aCost).toBeLessThan(bCost);
  });
});
