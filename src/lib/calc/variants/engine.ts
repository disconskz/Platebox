import { FormulaNode, isConst, isFn, isNum, isOp, isVar, CalcVariant, VariantStage, StageSource } from "./types";

export type EvalContext = {
  vars: Record<string, number>;
  consts: Record<string, number>;
  /** Системные значения из baseResult (paper_cost, print_cost, …). */
  systemValues?: Record<string, number>;
  /** Карта material_id → cost_per_sheet. */
  materials?: Record<string, { cost_per_sheet: number; name?: string }>;
};

/** Безопасный вычислитель AST. Никаких eval/Function. */
export function evalFormula(node: FormulaNode | null | undefined, ctx: EvalContext): number {
  if (!node) return 0;
  if (isNum(node)) return Number(node.num) || 0;
  if (isVar(node)) {
    const v = ctx.vars[node.var];
    return Number.isFinite(v) ? v : 0;
  }
  if (isConst(node)) {
    const v = ctx.consts[node.const];
    return Number.isFinite(v) ? v : 0;
  }
  if (isOp(node)) {
    const args = (node.args || []).map((a) => evalFormula(a, ctx));
    if (!args.length) return 0;
    switch (node.op) {
      case "+": return args.reduce((a, b) => a + b, 0);
      case "-":
        // Унарный минус: {op:"-", args:[x]} → -x
        if (args.length === 1) return -args[0];
        return args.slice(1).reduce((a, b) => a - b, args[0]);
      case "*": return args.reduce((a, b) => a * b, 1);
      case "/":
        // Унарный «/» интерпретируем как 1/x
        if (args.length === 1) return args[0] === 0 ? 0 : 1 / args[0];
        return args.slice(1).reduce((a, b) => (b === 0 ? 0 : a / b), args[0]);
    }
  }
  if (isFn(node)) {
    const args = (node.args || []).map((a) => evalFormula(a, ctx));
    switch (node.fn) {
      case "min":   return Math.min(...(args.length ? args : [0]));
      case "max":   return Math.max(...(args.length ? args : [0]));
      case "ceil":  return Math.ceil(args[0] ?? 0);
      case "floor": return Math.floor(args[0] ?? 0);
      case "round": return Math.round(args[0] ?? 0);
      case "abs":   return Math.abs(args[0] ?? 0);
    }
  }
  return 0;
}

/** Человекочитаемое представление формулы. */
export function formulaToString(node: FormulaNode | null | undefined): string {
  if (!node) return "0";
  if (isNum(node)) return String(node.num);
  if (isVar(node)) return node.var;
  if (isConst(node)) return `@${node.const}`;
  if (isFn(node)) return `${node.fn}(${(node.args || []).map(formulaToString).join(", ")})`;
  if (isOp(node)) {
    const parts = (node.args || []).map((a) => {
      const s = formulaToString(a);
      // оборачиваем низкий приоритет в скобки
      if (isOp(a) && (node.op === "*" || node.op === "/") && (a.op === "+" || a.op === "-")) return `(${s})`;
      return s;
    });
    const op = node.op === "*" ? "×" : node.op === "/" ? "÷" : node.op;
    return parts.join(` ${op} `);
  }
  return "0";
}

export interface VariantStageResult {
  name: string;
  unit: string;
  formulaText: string;
  value: number;
  source: StageSource;
  /** Для source="material": число листов/единиц материала. */
  qty?: number;
  /** Для source="material": цена за единицу. */
  unitPrice?: number;
  /** Для source="system": какой ключ использован. */
  systemKey?: string | null;
  /** Для source="material": имя материала, если найдено. */
  materialName?: string | null;
  /** Признак ошибки конфигурации этапа. */
  warning?: string;
}

export interface VariantRunResult {
  stages: VariantStageResult[];
  total: number;
}

export function runVariant(variant: CalcVariant, ctx: EvalContext): VariantRunResult {
  const stages: VariantStageResult[] = variant.stages
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => computeStage(s, ctx));
  const total = stages.reduce((s, x) => s + x.value, 0);
  return { stages, total };
}

function computeStage(s: VariantStage, ctx: EvalContext): VariantStageResult {
  const source: StageSource = (s.source as StageSource) || "formula";
  if (source === "system") {
    const key = s.system_key || "";
    const v = ctx.systemValues?.[key];
    const raw = Number.isFinite(v) ? Number(v) : 0;
    return {
      name: s.name,
      unit: s.unit || "₸",
      formulaText: key ? `@system.${key}` : "",
      // Системные значения могут быть отрицательными (например, скидка), не клампим.
      value: raw,
      source,
      systemKey: key || null,
      warning: !key
        ? "Не выбран системный ключ"
        : v === undefined
          ? `Системный ключ "${key}" не передан движком`
          : undefined,
    };
  }
  if (source === "material") {
    const mid = s.material_id || "";
    const m = mid ? ctx.materials?.[mid] : undefined;
    const hasMaterial = !!m;
    const qty = hasMaterial ? Math.max(0, evalFormula(s.material_formula ?? null, ctx)) : 0;
    const unitPrice = m?.cost_per_sheet ?? 0;
    return {
      name: s.name,
      unit: s.unit || "шт",
      formulaText: hasMaterial
        ? `${formulaToString(s.material_formula ?? null)} × ${unitPrice}`
        : "— материал не задан",
      value: Math.max(0, qty * unitPrice),
      source,
      qty,
      unitPrice,
      materialName: m?.name ?? null,
      warning: !mid
        ? "Не выбран материал"
        : !m
          ? "Материал не найден в справочнике"
          : undefined,
    };
  }
  // formula
  return {
    name: s.name,
    unit: s.unit,
    formulaText: formulaToString(s.formula),
    value: Math.max(0, evalFormula(s.formula, ctx)),
    source: "formula",
  };
}

/** Извлекает имена переменных и slug констант, на которые ссылается формула. */
export function collectRefs(node: FormulaNode | null | undefined, out = { vars: new Set<string>(), consts: new Set<string>() }) {
  if (!node) return out;
  if (isVar(node)) out.vars.add(node.var);
  else if (isConst(node)) out.consts.add(node.const);
  else if (isOp(node) || isFn(node)) (node.args || []).forEach((a) => collectRefs(a, out));
  return out;
}

export function collectStageRefs(stages: VariantStage[]) {
  const out = { vars: new Set<string>(), consts: new Set<string>() };
  stages.forEach((s) => {
    const src = (s.source as StageSource) || "formula";
    if (src === "formula") collectRefs(s.formula, out);
    else if (src === "material") collectRefs(s.material_formula ?? null, out);
    // system источников переменных нет
  });
  return out;
}