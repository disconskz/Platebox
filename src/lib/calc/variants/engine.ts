import { FormulaNode, isConst, isFn, isNum, isOp, isVar, CalcVariant, VariantStage } from "./types";

export type EvalContext = {
  vars: Record<string, number>;
  consts: Record<string, number>;
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
      case "-": return args.slice(1).reduce((a, b) => a - b, args[0]);
      case "*": return args.reduce((a, b) => a * b, 1);
      case "/": return args.slice(1).reduce((a, b) => (b === 0 ? 0 : a / b), args[0]);
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
}

export interface VariantRunResult {
  stages: VariantStageResult[];
  total: number;
}

export function runVariant(variant: CalcVariant, ctx: EvalContext): VariantRunResult {
  const stages: VariantStageResult[] = variant.stages
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      name: s.name,
      unit: s.unit,
      formulaText: formulaToString(s.formula),
      value: Math.max(0, evalFormula(s.formula, ctx)),
    }));
  const total = stages.reduce((s, x) => s + x.value, 0);
  return { stages, total };
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
  stages.forEach((s) => collectRefs(s.formula, out));
  return out;
}