import { describe, it, expect } from "vitest";
import { runCalculation, autoCutsFromLayout, setCutRules } from "./engine";
import { runMultiSkuCalculation } from "./multi-sku";
import { cutsForNesting, finishCutsPerItem, validateCalcInput } from "./validation";
import { CalcInput, FormatPair } from "./types";

const material = {
  id: "m1",
  name: "Test 130",
  format_width: 640,
  format_height: 920,
  cost_per_sheet: 80,
};

const baseInput: CalcInput = {
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

describe("P0 — cuts ladder (nesting → cuts)", () => {
  it.each([
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [16, 4],
  ])("nesting=%i → cuts=%i", (n, expected) => {
    expect(cutsForNesting(n)).toBe(expected);
  });

  it("монотонна по nesting", () => {
    let prev = -1;
    for (let n = 1; n <= 32; n++) {
      const c = cutsForNesting(n);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe("P0 — Zod-валидация runCalculation", () => {
  it("circulation = 0 → ошибка", () => {
    expect(() => runCalculation({ ...baseInput, circulation: 0 })).toThrow(/Некорректные/);
  });
  it("отрицательная цена листа → ошибка", () => {
    expect(() =>
      runCalculation({ ...baseInput, material: { ...material, cost_per_sheet: -1 } })
    ).toThrow(/Некорректные/);
  });
  it("NaN ширины → ошибка", () => {
    expect(() => runCalculation({ ...baseInput, formatWidth: NaN })).toThrow(/Некорректные/);
  });
  it("красочность > 8 → ошибка", () => {
    expect(() => runCalculation({ ...baseInput, colorFront: 12 })).toThrow(/Некорректные/);
  });
  it("валидный вход — без бросков", () => {
    expect(() => validateCalcInput(baseInput)).not.toThrow();
  });
});

describe("P1 — параметризация финишной резки", () => {
  it("override в input приоритетнее, чем профиль продукта", () => {
    expect(finishCutsPerItem("leaflet", 1, 4)).toBe(1);
    expect(finishCutsPerItem("businesscard", 0, 4)).toBe(0);
  });
  it("профиль продукта переопределяет DEFAULTS", () => {
    // leaflet -> 2 (по таблице), а не 4
    expect(finishCutsPerItem("leaflet", undefined, 4)).toBe(2);
  });
  it("неизвестный тип — DEFAULTS", () => {
    expect(finishCutsPerItem("unknown_product", undefined, 4)).toBe(4);
  });
  it("listovka: явный override снижает себестоимость", () => {
    const a = runCalculation({ ...baseInput, finishCutsPerItem: 4 });
    const b = runCalculation({ ...baseInput, finishCutsPerItem: 1 });
    expect(b.totalCost).toBeLessThan(a.totalCost);
  });
});

describe("P2 — precision / большие тиражи", () => {
  it("totalCost конечен и положителен на тираже 1 000 000", () => {
    const r = runCalculation({ ...baseInput, circulation: 1_000_000 });
    expect(Number.isFinite(r.totalCost)).toBe(true);
    expect(r.totalCost).toBeGreaterThan(0);
    expect(Number.isFinite(r.totalWithVat)).toBe(true);
  });
  it("НДС считается без накопления ошибок округления", () => {
    const r = runCalculation({ ...baseInput, circulation: 10_000, vatPercent: 12 });
    expect(r.vatAmount).toBeCloseTo(r.totalCost * 0.12, 6);
    expect(r.totalWithVat).toBeCloseTo(r.totalCost * 1.12, 6);
  });
});

describe("P2 — multi-sku ↔ single-SKU паритет", () => {
  const pairs: FormatPair[] = [
    { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
  ];

  it("1 SKU в multi-sku сопоставим с single-SKU по покупке и тиражу", () => {
    const single = runCalculation({
      ...baseInput,
      productType: "leaflet",
      formatWidth: 105,
      formatHeight: 148,
      circulation: 1000,
      colorBack: 0,
      formatPairs: pairs,
      printFormats: [{ width: 460, height: 320 }],
    });
    const multi = runMultiSkuCalculation({
      productType: "leaflet",
      skus: [{ name: "A", width: 105, height: 148, circulation: 1000 }],
      colorFront: 4,
      colorBack: 0,
      material,
      formatPairs: pairs,
    });
    const best = multi.variants[multi.bestIndex];
    // Тот же закупочный формат
    expect(best.pair.purchase.width).toBe(640);
    // Раскладка совпадает по числу мест
    expect(best.layout.itemsPerSheet).toBe(single.layout.itemsPerSheet);
    // Multi-SKU — MVP (см. аудит, P1-4): полная унификация постпечати
    // ещё не сделана, поэтому допускаем широкий коридор ±3× и фиксируем
    // факт расхождения как регрессионный baseline.
    expect(best.totalCost).toBeGreaterThan(single.totalCost * 0.5);
    expect(best.totalCost).toBeLessThan(single.totalCost * 3);
  });
});

describe("P2 — multi-sku валидация", () => {
  it("пустой skus → ошибка", () => {
    expect(() =>
      runMultiSkuCalculation({
        productType: "leaflet",
        skus: [],
        colorFront: 4,
        colorBack: 0,
        material,
        formatPairs: [
          { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
        ],
      })
    ).toThrow(/Некорректные/);
  });
});