import { FormulaNode } from "./types";

/** Линейное представление формулы в редакторе. AST строится из токенов на сохранении. */
export type Token =
  | { kind: "num"; value: number }
  | { kind: "var"; value: string }
  | { kind: "const"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "fn"; value: "min" | "max" | "ceil" | "floor" | "round" | "abs" };

const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

/** Shunting-yard → RPN → AST. Бросает Error при синтаксической ошибке. */
export function tokensToAst(tokens: Token[]): FormulaNode {
  if (!tokens.length) return { num: 0 };
  const out: (FormulaNode | Token)[] = [];
  const ops: Token[] = [];
  const argCounts: number[] = [];

  const apply = (t: Token) => {
    if (t.kind === "op") {
      const b = out.pop(); const a = out.pop();
      if (a == null || b == null) throw new Error("Не хватает операндов для " + t.value);
      out.push({ op: t.value, args: [a as FormulaNode, b as FormulaNode] });
    } else if (t.kind === "fn") {
      const argc = argCounts.pop() ?? 1;
      const args: FormulaNode[] = [];
      for (let i = 0; i < argc; i++) {
        const a = out.pop();
        if (a == null) throw new Error("Не хватает аргументов функции " + t.value);
        args.unshift(a as FormulaNode);
      }
      out.push({ fn: t.value, args });
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "num") out.push({ num: t.value });
    else if (t.kind === "var") out.push({ var: t.value });
    else if (t.kind === "const") out.push({ const: t.value });
    else if (t.kind === "fn") { ops.push(t); argCounts.push(1); }
    else if (t.kind === "comma") {
      while (ops.length && ops[ops.length - 1].kind !== "lparen") apply(ops.pop()!);
      if (argCounts.length) argCounts[argCounts.length - 1]++;
    } else if (t.kind === "op") {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.kind === "op" && PREC[top.value] >= PREC[t.value]) apply(ops.pop()!);
        else if (top.kind === "fn") apply(ops.pop()!);
        else break;
      }
      ops.push(t);
    } else if (t.kind === "lparen") ops.push(t);
    else if (t.kind === "rparen") {
      while (ops.length && ops[ops.length - 1].kind !== "lparen") apply(ops.pop()!);
      if (!ops.length) throw new Error("Лишняя закрывающая скобка");
      ops.pop(); // lparen
      if (ops.length && ops[ops.length - 1].kind === "fn") apply(ops.pop()!);
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.kind === "lparen") throw new Error("Незакрытая скобка");
    apply(top);
  }
  if (out.length !== 1) throw new Error("Некорректная формула");
  return out[0] as FormulaNode;
}

/** Обратное: AST → плоский список токенов (для редактирования существующих формул). */
export function astToTokens(node: FormulaNode | null | undefined): Token[] {
  if (!node) return [];
  if ("num" in node) return [{ kind: "num", value: node.num }];
  if ("var" in node) return [{ kind: "var", value: node.var }];
  if ("const" in node) return [{ kind: "const", value: node.const }];
  if ("fn" in node) {
    const out: Token[] = [{ kind: "fn", value: node.fn }, { kind: "lparen" }];
    node.args.forEach((a, i) => {
      if (i) out.push({ kind: "comma" });
      out.push(...astToTokens(a));
    });
    out.push({ kind: "rparen" });
    return out;
  }
  if ("op" in node) {
    const out: Token[] = [];
    node.args.forEach((a, i) => {
      const sub = astToTokens(a);
      const needParens = "op" in (a as any) && precOf((a as any).op) < precOf(node.op);
      if (i) out.push({ kind: "op", value: node.op });
      if (needParens) {
        out.push({ kind: "lparen" });
        out.push(...sub);
        out.push({ kind: "rparen" });
      } else out.push(...sub);
    });
    return out;
  }
  return [];
}

const precOf = (op: string) => PREC[op] ?? 0;