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

/** Парсер строкового выражения → токены. Поддерживает имена переменных (буквы/цифры/_),
 *  константы вида @slug, числа, операторы + - * /, скобки, запятую и функции min/max/ceil/floor/round/abs.
 *  Бросает Error на нераспознаваемый символ. */
export function parseExpression(input: string): Token[] {
  const src = input.trim();
  const out: Token[] = [];
  const FNS = new Set(["min", "max", "ceil", "floor", "round", "abs"]);
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { out.push({ kind: "lparen" }); i++; continue; }
    if (c === ")") { out.push({ kind: "rparen" }); i++; continue; }
    if (c === ",") { out.push({ kind: "comma" }); i++; continue; }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      out.push({ kind: "op", value: c as any }); i++; continue;
    }
    if (c === "@") {
      let j = i + 1;
      while (j < src.length && /[\w-]/.test(src[j])) j++;
      const slug = src.slice(i + 1, j);
      if (!slug) throw new Error("Пустой slug константы");
      out.push({ kind: "const", value: slug });
      i = j;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = Number(src.slice(i, j));
      if (!Number.isFinite(n)) throw new Error("Некорректное число: " + src.slice(i, j));
      out.push({ kind: "num", value: n });
      i = j;
      continue;
    }
    // identifier: letter (latin/cyrillic) followed by word chars
    if (/[A-Za-zА-Яа-яЁё_]/.test(c)) {
      let j = i;
      while (j < src.length && /[\wА-Яа-яЁё]/.test(src[j])) j++;
      const name = src.slice(i, j);
      if (FNS.has(name)) out.push({ kind: "fn", value: name as any });
      else out.push({ kind: "var", value: name });
      i = j;
      continue;
    }
    throw new Error("Неизвестный символ: '" + c + "'");
  }
  return out;
}