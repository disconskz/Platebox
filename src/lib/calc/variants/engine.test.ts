import { describe, it, expect } from "vitest";
import { evalFormula, formulaToString, runVariant, collectRefs } from "./engine";
import type { FormulaNode, CalcVariant } from "./types";

const ctx = {
  vars: { кол_форм: 4, тираж: 5000, кол_резов: 3, печ_листов: 700, сторон: 2 },
  consts: { form_cost: 500, cut_cost: 1, design_cost: 500, impression_cost: 3 },
};

describe("evalFormula", () => {
  it("складывает числа", () => {
    expect(evalFormula({ op: "+", args: [{ num: 2 }, { num: 3 }] }, ctx)).toBe(5);
  });
  it("умножает переменную на константу", () => {
    const f: FormulaNode = { op: "*", args: [{ var: "кол_форм" }, { const: "form_cost" }] };
    expect(evalFormula(f, ctx)).toBe(2000);
  });
  it("вычитание сохраняет порядок аргументов", () => {
    expect(evalFormula({ op: "-", args: [{ num: 10 }, { num: 3 }, { num: 2 }] }, ctx)).toBe(5);
  });
  it("деление на ноль даёт 0", () => {
    expect(evalFormula({ op: "/", args: [{ num: 10 }, { num: 0 }] }, ctx)).toBe(0);
  });
  it("унарный минус возвращает -x", () => {
    expect(evalFormula({ op: "-", args: [{ num: 5 }] }, ctx)).toBe(-5);
  });
  it("унарный / возвращает 1/x", () => {
    expect(evalFormula({ op: "/", args: [{ num: 4 }] }, ctx)).toBe(0.25);
    expect(evalFormula({ op: "/", args: [{ num: 0 }] }, ctx)).toBe(0);
  });
  it("неизвестная переменная даёт 0", () => {
    expect(evalFormula({ var: "несуществует" }, ctx)).toBe(0);
  });
  it("ceil/floor/min/max работают", () => {
    expect(evalFormula({ fn: "ceil", args: [{ num: 1.2 }] }, ctx)).toBe(2);
    expect(evalFormula({ fn: "floor", args: [{ num: 1.8 }] }, ctx)).toBe(1);
    expect(evalFormula({ fn: "min", args: [{ num: 3 }, { num: 7 }, { num: 5 }] }, ctx)).toBe(3);
    expect(evalFormula({ fn: "max", args: [{ num: 3 }, { num: 7 }, { num: 5 }] }, ctx)).toBe(7);
  });
  it("комбинированная формула: печать офсетная", () => {
    // кол_красок × сторон × печ_листов × imp_cost + кол_форм × setup_per_form
    const ctx2 = { vars: { кол_красок: 4, сторон: 2, печ_листов: 700, кол_форм: 8 }, consts: { impression_cost: 3, setup_per_form: 500 } };
    const f: FormulaNode = { op: "+", args: [
      { op: "*", args: [{ var: "кол_красок" }, { var: "сторон" }, { var: "печ_листов" }, { const: "impression_cost" }] },
      { op: "*", args: [{ var: "кол_форм" }, { const: "setup_per_form" }] },
    ]};
    expect(evalFormula(f, ctx2)).toBe(4 * 2 * 700 * 3 + 8 * 500); // 16800 + 4000 = 20800
  });
});

describe("formulaToString", () => {
  it("выводит читаемую формулу", () => {
    const f: FormulaNode = { op: "*", args: [{ var: "кол_форм" }, { const: "form_cost" }] };
    expect(formulaToString(f)).toBe("кол_форм × @form_cost");
  });
  it("скобки вокруг + при умножении", () => {
    const f: FormulaNode = { op: "*", args: [{ op: "+", args: [{ var: "a" }, { var: "b" }] }, { num: 2 }] };
    expect(formulaToString(f)).toBe("(a + b) × 2");
  });
});

describe("runVariant", () => {
  it("итог = сумма этапов", () => {
    const v: CalcVariant = {
      id: "x", name: "test", description: "", base_product_type: "leaflet", category: "other",
      is_active: true, sort_order: 1,
      stages: [
        { name: "Дизайн", unit: "шт", sort_order: 10, formula: { op: "*", args: [{ var: "кол_форм" }, { const: "design_cost" }] } },
        { name: "Формы", unit: "шт", sort_order: 20, formula: { op: "*", args: [{ var: "кол_форм" }, { const: "form_cost" }] } },
      ],
    };
    const res = runVariant(v, ctx);
    expect(res.stages.length).toBe(2);
    expect(res.stages[0].value).toBe(2000);
    expect(res.stages[1].value).toBe(2000);
    expect(res.total).toBe(4000);
  });
  it("отрицательные значения зануляются", () => {
    const v: CalcVariant = {
      id: "x", name: "t", description: "", base_product_type: "leaflet", category: "other",
      is_active: true, sort_order: 1,
      stages: [{ name: "X", unit: "шт", sort_order: 10, formula: { op: "-", args: [{ num: 5 }, { num: 10 }] } }],
    };
    expect(runVariant(v, ctx).total).toBe(0);
  });
});

describe("collectRefs", () => {
  it("собирает переменные и константы рекурсивно", () => {
    const f: FormulaNode = { op: "+", args: [
      { op: "*", args: [{ var: "a" }, { const: "c1" }] },
      { fn: "min", args: [{ var: "b" }, { num: 10 }] },
    ]};
    const refs = collectRefs(f);
    expect([...refs.vars].sort()).toEqual(["a", "b"]);
    expect([...refs.consts]).toEqual(["c1"]);
  });
});

describe("runVariant sources", () => {
  const mk = (stages: any[]): CalcVariant => ({
    id: "v", name: "T", description: "", base_product_type: "leaflet",
    category: "other", is_active: true, sort_order: 1, stages,
  });

  it("source=system берёт значение из systemValues", () => {
    const v = mk([{ name: "Бумага", unit: "₸", sort_order: 1, source: "system", system_key: "paper_cost", formula: { num: 0 } }]);
    const r = runVariant(v, { vars: {}, consts: {}, systemValues: { paper_cost: 1234 } });
    expect(r.total).toBe(1234);
    expect(r.stages[0].source).toBe("system");
  });

  it("source=material умножает формулу количества на cost_per_sheet", () => {
    const v = mk([{
      name: "Бумага", unit: "лист", sort_order: 1, source: "material",
      material_id: "m1", material_formula: { num: 10 }, formula: { num: 0 },
    }]);
    const r = runVariant(v, { vars: {}, consts: {}, materials: { m1: { cost_per_sheet: 25, name: "Бум" } } });
    expect(r.total).toBe(250);
    expect(r.stages[0].qty).toBe(10);
    expect(r.stages[0].unitPrice).toBe(25);
  });

  it("source=material без материала помечается предупреждением", () => {
    const v = mk([{ name: "X", unit: "лист", sort_order: 1, source: "material", material_formula: { num: 5 }, formula: { num: 0 } }]);
    const r = runVariant(v, { vars: {}, consts: {} });
    expect(r.total).toBe(0);
    expect(r.stages[0].warning).toBeTruthy();
  });

  it("деление на ноль в этапе формулы порождает warning", () => {
    const v = mk([{
      name: "X", unit: "₸", sort_order: 1,
      formula: { op: "/", args: [{ num: 10 }, { var: "z" }] },
    }]);
    const r = runVariant(v, { vars: { z: 0 }, consts: {} });
    expect(r.stages[0].value).toBe(0);
    expect(r.stages[0].warning).toMatch(/деление на ноль/i);
  });
});