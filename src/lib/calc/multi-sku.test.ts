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
  it("30 видов A6 на A3+ ⇒ 4 спуска (вариант A)", () => {
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

  it("Возвращает >=1 вариант, выбирает лучший по стоимости", () => {
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

  it("Один SKU = один спуск, без пустот", () => {
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

  it("Разные тиражи: спуск считается по max", () => {
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
    // Печатных листов >= 5000 (по max тиражу) + приладка
    expect(minVar.printSheetsTotal).toBeGreaterThanOrEqual(5000);
  });
});