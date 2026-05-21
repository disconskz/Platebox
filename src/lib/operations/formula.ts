// Tolerant formula evaluator for operation_work_items / operation_parameters.
//
// Поддерживает:
//  - подстановку [Имя переменной] из values map
//  - спецтокены [ТИРАЖ], [ПРЕДЫДУЩЕЕ ЗНАЧЕНИЕ]
//  - арифметику + - * / ( ) и числа (включая дробные через "." или ",")
//  - обёртку cast('X' as tnumericN) → раскрывается в (X)
//
// Не поддерживает SQL CASE WHEN — такие формулы возвращают { ok: false }
// с пометкой, чтобы UI показал поле ручного ввода.

export type FormulaContext = Record<string, number>;

export interface FormulaResult {
  ok: boolean;
  value: number;
  /** Имена переменных, не найденных в контексте */
  missing: string[];
  /** Причина, если ok=false */
  reason?: string;
}

const NUM_RE = /^-?\d+(?:[.,]\d+)?$/;

/** Достаёт имена всех [Имя] плейсхолдеров из формулы. */
export function extractVariables(formula: string): string[] {
  if (!formula) return [];
  const out = new Set<string>();
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula))) {
    const name = m[1].trim();
    if (!name) continue;
    out.add(name);
  }
  return [...out];
}

function stripCasts(src: string): string {
  // cast('...' as tnumeric2) → (...)
  // cast(... as tnumeric2)  → (...)
  let s = src;
  // повторяем — на случай вложенных
  for (let i = 0; i < 4; i++) {
    const next = s.replace(
      /cast\(\s*'?([^()']*?)'?\s+as\s+t?numeric\d*\s*\)/gi,
      "($1)"
    );
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Можно ли формулу преобразовать в число с текущим контекстом. */
export function evalFormula(formula: string, ctx: FormulaContext): FormulaResult {
  const raw = (formula ?? "").trim();
  if (!raw) return { ok: true, value: 0, missing: [] };

  // Если это просто число — быстрый путь.
  if (NUM_RE.test(raw)) {
    return { ok: true, value: parseFloat(raw.replace(",", ".")), missing: [] };
  }

  // CASE WHEN и прочий SQL — пропускаем (ручной ввод).
  if (/\bcase\s+when\b/i.test(raw)) {
    return { ok: false, value: 0, missing: [], reason: "case-when" };
  }

  let s = stripCasts(raw);

  // Подстановка переменных
  const missing: string[] = [];
  s = s.replace(/\[([^\]]+)\]/g, (_, name) => {
    const key = String(name).trim();
    const v = ctx[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      return `(${v})`;
    }
    missing.push(key);
    return "(0)";
  });

  // Разрешаем только безопасные символы
  if (!/^[\d+\-*/().,\s]*$/.test(s)) {
    return { ok: false, value: 0, missing, reason: "unsupported-syntax" };
  }

  s = s.replace(/,/g, ".");
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict"; return (${s || 0});`)();
    const num = Number(v);
    if (!Number.isFinite(num)) {
      return { ok: false, value: 0, missing, reason: "non-finite" };
    }
    return { ok: missing.length === 0, value: num, missing };
  } catch (e: any) {
    return { ok: false, value: 0, missing, reason: e?.message || "eval-error" };
  }
}

/** Парсит default_value параметра — может быть число, маркер или формула. */
export function parseDefault(value: string | null | undefined, ctx: FormulaContext): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (raw === "[ТИРАЖ]") return ctx["ТИРАЖ"] ?? null;
  if (raw === "[ПРЕДЫДУЩЕЕ ЗНАЧЕНИЕ]") return null;
  if (NUM_RE.test(raw)) return parseFloat(raw.replace(",", "."));
  const r = evalFormula(raw, ctx);
  return r.ok ? r.value : null;
}