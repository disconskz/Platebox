/** AST для формул конструктора вариантов просчёта. */
export type FormulaNode =
  | { num: number }
  | { var: string }
  | { const: string } // slug константы из calc_constants
  | { op: "+" | "-" | "*" | "/"; args: FormulaNode[] }
  | { fn: "min" | "max" | "ceil" | "floor" | "round" | "abs"; args: FormulaNode[] };

export const isNum = (n: FormulaNode): n is { num: number } => "num" in n;
export const isVar = (n: FormulaNode): n is { var: string } => "var" in n;
export const isConst = (n: FormulaNode): n is { const: string } => "const" in n;
export const isOp = (n: FormulaNode): n is { op: "+" | "-" | "*" | "/"; args: FormulaNode[] } => "op" in n;
export const isFn = (n: FormulaNode): n is { fn: "min" | "max" | "ceil" | "floor" | "round" | "abs"; args: FormulaNode[] } => "fn" in n;

export interface VariantStage {
  id?: string;
  name: string;
  unit: string;
  formula: FormulaNode;
  material_id?: string | null;
  material_formula?: FormulaNode | null;
  sort_order: number;
  /** Источник стоимости этапа. По умолчанию — формула. */
  source?: StageSource;
  /** Ключ системного значения, используется когда source = "system". */
  system_key?: string | null;
}

export type StageSource = "formula" | "system" | "material";

/** Доступные системные значения — берутся из baseResult. */
export const SYSTEM_KEYS: { key: string; label: string }[] = [
  { key: "paper_cost", label: "Бумага" },
  { key: "paper_cut_cost", label: "Резка закупочного" },
  { key: "print_cost", label: "Печать" },
  { key: "forms_cost", label: "Формы" },
  { key: "forms_prep_cost", label: "Приладка форм" },
  { key: "ink_cost", label: "Краска" },
  { key: "postpress_total", label: "Постпечать (итог)" },
  { key: "cuts_total", label: "Резка изделий" },
  { key: "prepress_total", label: "Допечатные (итог)" },
];
export const SYSTEM_KEY_SET = new Set(SYSTEM_KEYS.map((k) => k.key));

export interface CalcVariant {
  id: string;
  name: string;
  description: string;
  base_product_type: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  stages: VariantStage[];
}

export interface CalcConstant {
  id?: string;
  slug: string;
  name: string;
  value: number;
  unit: string;
  description: string;
  sort_order: number;
}

/** Доступные переменные конструктора. Ключи — то, что вводит пользователь в чипах. */
export const VARIABLE_LIST: { key: string; label: string; hint: string }[] = [
  { key: "тираж", label: "Тираж", hint: "Общий тираж изделий" },
  { key: "кол_форм", label: "Количество форм", hint: "Печатных пластин" },
  { key: "кол_красок", label: "Количество красок", hint: "Сумма красочности (лицо)" },
  { key: "сторон", label: "Количество сторон", hint: "1 или 2" },
  { key: "печ_листов", label: "Печатных листов", hint: "С учётом приладки" },
  { key: "закуп_листов", label: "Закупочных листов", hint: "Бумага для закупки" },
  { key: "кол_резов", label: "Количество резов", hint: "Резов закупочного формата" },
  { key: "кол_блоков", label: "Количество блоков", hint: "Для блочной продукции" },
  { key: "площадь_печати", label: "Площадь печати", hint: "м² за весь тираж" },
  { key: "приладка", label: "Приладка", hint: "Листы приладки" },
  { key: "плотность", label: "Плотность бумаги", hint: "г/м²" },
];

export const VARIABLE_KEYS = new Set(VARIABLE_LIST.map((v) => v.key));