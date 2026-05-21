// Token model + (de)serializer for the visual formula builder.
// Tokens serialize to the same string format that src/lib/operations/formula.ts
// already understands, so no migration of existing data is needed.

import { evalFormula } from "./formula";

export type Token =
  | { kind: "var"; name: string }
  | { kind: "const"; slug: string; value: number; label: string }
  | { kind: "num"; value: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "(" | ")" };

export interface BuilderVar {
  name: string;
  /** опциональное демо-значение для превью */
  preview?: number;
}

export interface BuilderConst {
  slug: string;
  name: string;
  value: number;
}

/** Сериализация токенов в строку формулы. */
export function tokensToString(tokens: Token[]): string {
  const parts: string[] = [];
  for (const t of tokens) {
    switch (t.kind) {
      case "var":
        parts.push(`[${t.name}]`);
        break;
      case "const":
        // Подставляем числовое значение константы — evaluator не знает про slug.
        parts.push(String(t.value));
        break;
      case "num":
        parts.push(String(t.value));
        break;
      case "op":
        parts.push(t.op);
        break;
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Парсинг строки формулы обратно в токены (для редактирования существующей).
 * Поддерживает: [Имя], числа, + - * / ( ).
 * Если встречается неподдерживаемая конструкция (CASE WHEN, cast(...)),
 * возвращает `null` — UI покажет «формула слишком сложная, редактировать как текст».
 */
export function stringToTokens(
  src: string,
  consts: BuilderConst[] = []
): Token[] | null {
  const raw = (src || "").trim();
  if (!raw) return [];
  if (/\bcase\s+when\b/i.test(raw)) return null;
  if (/\bcast\s*\(/i.test(raw)) return null;

  const tokens: Token[] = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      i++;
      continue;
    }
    if (ch === "[") {
      const end = raw.indexOf("]", i);
      if (end < 0) return null;
      const name = raw.slice(i + 1, end).trim();
      if (!name) return null;
      tokens.push({ kind: "var", name });
      i = end + 1;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push({ kind: "op", op: ch as any });
      i++;
      continue;
    }
    // число
    const m = raw.slice(i).match(/^-?\d+(?:[.,]\d+)?/);
    if (m) {
      const value = parseFloat(m[0].replace(",", "."));
      // если такое значение совпадает с константой — попробуем восстановить
      const c = consts.find((x) => x.value === value);
      if (c) tokens.push({ kind: "const", slug: c.slug, value: c.value, label: c.name });
      else tokens.push({ kind: "num", value });
      i += m[0].length;
      continue;
    }
    return null;
  }
  return tokens;
}

/** Человекочитаемая подпись токена для чипа. */
export function tokenLabel(t: Token): string {
  switch (t.kind) {
    case "var":
      return t.name;
    case "const":
      return `${t.label} (${t.value})`;
    case "num":
      return String(t.value);
    case "op":
      return t.op === "*" ? "×" : t.op === "/" ? "÷" : t.op;
  }
}

/** Базовая структурная валидация перед сохранением. */
export function validateTokens(tokens: Token[]): { ok: boolean; error?: string } {
  if (!tokens.length) return { ok: true };
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    if (t.kind === "op") {
      if (t.op === "(") depth++;
      else if (t.op === ")") {
        depth--;
        if (depth < 0) return { ok: false, error: "Лишняя закрывающая скобка" };
      } else {
        // бинарный оператор
        if (!prev || (prev.kind === "op" && prev.op !== ")")) {
          return { ok: false, error: "Оператор без левого операнда" };
        }
      }
    } else {
      // значение
      if (prev && (prev.kind !== "op" || prev.op === ")")) {
        return { ok: false, error: "Два значения подряд — нужен оператор" };
      }
    }
  }
  if (depth !== 0) return { ok: false, error: "Не закрыта скобка" };
  const last = tokens[tokens.length - 1];
  if (last.kind === "op" && last.op !== ")") return { ok: false, error: "Формула обрывается на операторе" };
  return { ok: true };
}

/** Вычислить превью при подстановке демо-значений. */
export function previewValue(tokens: Token[], vars: BuilderVar[]): { ok: boolean; value: number; missing: string[]; reason?: string } {
  const s = tokensToString(tokens);
  if (!s) return { ok: true, value: 0, missing: [] };
  const ctx: Record<string, number> = { "ТИРАЖ": 1000 };
  for (const v of vars) if (typeof v.preview === "number") ctx[v.name] = v.preview;
  return evalFormula(s, ctx);
}