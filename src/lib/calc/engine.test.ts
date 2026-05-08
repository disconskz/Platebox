import { describe, it, expect } from "vitest";
import { bestLayout, bestPair, calculateForms, determineTurnaround, rankPairs, runCalculation } from "./engine";
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
  it("A5 (148×210) на 460×320 раскладывается 2×2 = 4 шт/лист (учёт обеих ориентаций листа)", () => {
    const l = bestLayout(148, 210, false, [{ width: 460, height: 320 }]);
    expect(l).toBeTruthy();
    expect(l!.itemsPerSheet).toBe(4);
    expect(l!.cols * l!.rows).toBe(4);
  });
  it("A6 (105×148) на 460×320 даёт >= 9 шт/лист", () => {
    const l = bestLayout(105, 148, false, [{ width: 460, height: 320 }]);
    expect(l).toBeTruthy();
    expect(l!.itemsPerSheet).toBeGreaterThanOrEqual(9);
  });
  it("стикер 90×50 на 320×460 не теряет шт/лист после правки ориентации листа", () => {
    const l = bestLayout(90, 50, true, [{ width: 320, height: 460 }]);
    expect(l).toBeTruthy();
    expect(l!.itemsPerSheet).toBeGreaterThanOrEqual(16);
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

  it("filters out pairs larger than 520×360 when product fits within the limit", () => {
    const pairs: FormatPair[] = [
      // в лимите — должен учитываться
      { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
      // вне лимита (640×460 > 520×360) — должен быть отфильтрован
      { print: { width: 640, height: 460 }, purchase: { width: 640, height: 920 } },
      // вне лимита (720×520) — должен быть отфильтрован
      { print: { width: 720, height: 520 }, purchase: { width: 720, height: 1040 } },
    ];
    // Визитка 90×50 спокойно влезает в 520×360, фильтр должен сработать
    const r = bestPair(90, 50, false, pairs);
    expect(r).toBeTruthy();
    expect(r!.pair.print.width).toBe(460);
    expect(r!.pair.print.height).toBe(320);
  });

  it("lifts the 520×360 limit when product does not fit in it (e.g. A2 poster)", () => {
    const pairs: FormatPair[] = [
      // в лимите — но изделие не влезает
      { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
      // вне лимита — единственный, куда влезает плакат
      { print: { width: 640, height: 460 }, purchase: { width: 640, height: 920 } },
    ];
    // Плакат 420×594 (А2) — в 520×360 не помещается, лимит должен сняться
    const r = bestPair(420, 594, false, pairs);
    expect(r).toBeTruthy();
    expect(r!.pair.print.width).toBe(640);
    expect(r!.pair.print.height).toBe(460);
  });
});

describe("rankPairs — рабочие форматы (460×320, 520×360) имеют жёсткий приоритет", () => {
  // Полный реальный набор пар из справочника (coated)
  const coatedPairs: FormatPair[] = [
    { print: { width: 520, height: 360 }, purchase: { width: 720, height: 1040 } },
    { print: { width: 520, height: 240 }, purchase: { width: 720, height: 1040 } },
    { print: { width: 360, height: 260 }, purchase: { width: 720, height: 1040 } },
    { print: { width: 360, height: 345 }, purchase: { width: 720, height: 1040 } },
    { print: { width: 500, height: 350 }, purchase: { width: 700, height: 1000 } },
    { print: { width: 500, height: 233 }, purchase: { width: 700, height: 1000 } },
    { print: { width: 350, height: 250 }, purchase: { width: 700, height: 1000 } },
    { print: { width: 350, height: 333 }, purchase: { width: 700, height: 1000 } },
    { print: { width: 460, height: 320 }, purchase: { width: 640, height: 920 } },
    { print: { width: 320, height: 305 }, purchase: { width: 640, height: 920 } },
    { print: { width: 320, height: 230 }, purchase: { width: 640, height: 920 } },
    { print: { width: 460, height: 213 }, purchase: { width: 640, height: 920 } },
    { print: { width: 250, height: 700 }, purchase: { width: 500, height: 700 } },
    { print: { width: 500, height: 350 }, purchase: { width: 500, height: 700 } },
    { print: { width: 500, height: 233 }, purchase: { width: 500, height: 700 } },
    { print: { width: 350, height: 333 }, purchase: { width: 500, height: 700 } },
  ];
  const priority = [
    { width: 520, height: 360 },
    { width: 460, height: 320 },
  ];

  it("А5 (148×210) 4+4 → выбирает 460×320, а НЕ 500×350", () => {
    const ranked = rankPairs(148, 210, false, coatedPairs, {
      requireEvenItems: true,
      priorityPrintFormats: priority,
    });
    expect(ranked.length).toBeGreaterThan(0);
    const top = ranked[0];
    expect([460, 520]).toContain(top.pair.print.width);
    expect(top.layout.itemsPerSheet % 2).toBe(0);
    // 500×350 (раскройный) НЕ должен быть оптимальным
    expect(top.pair.print.width).not.toBe(500);
    // А5 умещается 4 шт и на 460×320, и на 520×360. Меньший рабочий
    // печатный формат предпочтительнее (минимум остатков на закупочном).
    expect(top.pair.print.width).toBe(460);
    expect(top.layout.itemsPerSheet).toBe(4);
  });

  it("А6 (105×148) 4+4 → выбирает рабочий формат с чётным числом, а НЕ 250×700", () => {
    const ranked = rankPairs(105, 148, false, coatedPairs, {
      requireEvenItems: true,
      priorityPrintFormats: priority,
    });
    expect(ranked.length).toBeGreaterThan(0);
    const top = ranked[0];
    // Должен быть один из рабочих форматов
    const isWorking =
      (top.pair.print.width === 460 && top.pair.print.height === 320) ||
      (top.pair.print.width === 520 && top.pair.print.height === 360);
    expect(isWorking).toBe(true);
    expect(top.layout.itemsPerSheet % 2).toBe(0);
    // 250×700 ни в коем случае не должен быть оптимальным
    expect(top.pair.print.width).not.toBe(250);
  });

  it("А6 (105×148) без чётного требования → рабочий формат тоже выигрывает (9 шт)", () => {
    const ranked = rankPairs(105, 148, false, coatedPairs, {
      priorityPrintFormats: priority,
    });
    const top = ranked[0];
    const isWorking =
      (top.pair.print.width === 460 && top.pair.print.height === 320) ||
      (top.pair.print.width === 520 && top.pair.print.height === 360);
    expect(isWorking).toBe(true);
    expect(top.layout.itemsPerSheet).toBeGreaterThanOrEqual(8);
  });

  it("Список альтернатив содержит и рабочие, и раскройные форматы", () => {
    const ranked = rankPairs(148, 210, false, coatedPairs, {
      requireEvenItems: true,
      priorityPrintFormats: priority,
    });
    const widths = ranked.map((r) => r.pair.print.width);
    expect(widths).toContain(460);
    expect(widths.some((w) => w === 500 || w === 250 || w === 520)).toBe(true);
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