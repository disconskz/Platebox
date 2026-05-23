## Что меняем

Сейчас резка считается так:
1. Если в `cut_count_rules` есть связка «печатный→конечный» — берём оттуда.
2. Иначе — старая модель `printSheets × itemsPerSheet × finishCutsPerItem`.

ТЗ требует другую логику: брать **фактическую раскладку** (`cols`, `rows`), которую движок уже считает в `layoutVariants`, и применять формулу:
- если `itemsPerSheet === 1` → `4` реза;
- иначе → `2 × (cols + rows)`.

Справочник `cut_count_rules` остаётся как опциональный override для стандартных пар (A1→A2 и т.д.); если связки нет — авто по раскладке, а **не** старая «×4 на изделие» модель.

## 1. Движок (`src/lib/calc/engine.ts` + `validation.ts`)

- Новая функция `autoCutsFromLayout(layout)`:
  ```ts
  layout.itemsPerSheet <= 1 ? 4 : 2 * (layout.cols + layout.rows)
  ```
- В блоке «Резка печатного листа на конечный формат изделия» (engine.ts ~ст. 461–497) приоритет:
  1. `input.cutsPerSheetOverride` (ручная корректировка) → используем как есть.
  2. `lookupCutCount(printName, itemName)` из `cut_count_rules` → как сейчас.
  3. Иначе → `autoCutsFromLayout(layout)`. Это **заменяет** старый fallback `finishCutsPerItem × items`.
- В `SpecItem.name` пишем источник: `«Резка (авто 2×(cols+rows))»`, `«Резка A1→A4 (справочник)»`, `«Резка (ручная корректировка)»`.
- Цена реза остаётся: `CUT_RULES.pricePerCut` (константа `cut_price_per_print`) с дефолтом 1₸. Никаких миграций БД не требуется — константа уже подгружается из `calc_constants`.
- В `CalcResult` добавляем поле `cutInfo`:
  ```ts
  cutInfo?: {
    source: "manual" | "table" | "auto";
    printName: string | null;
    itemName: string | null;
    cols: number;
    rows: number;
    itemsPerSheet: number;
    cutsPerSheet: number;
    pricePerCut: number;
    printSheets: number;
    total: number;
  }
  ```

## 2. Вход (`src/lib/calc/types.ts`)

- Добавляем в `CalcInput`:
  ```ts
  /** Ручное переопределение количества резов на один печатный лист (по ТЗ). */
  cutsPerSheetOverride?: number;
  ```
- В `validation.ts` (`CalcInputSchema`) — `cutsPerSheetOverride: nonNegNum.max(1000).optional()`.

## 3. UI калькулятора (`src/pages/Calculator.tsx`)

- Прокидываем `cutsPerSheetOverride` в `CalcInput` (новое состояние `cutsOverride: number | null`).
- В правой панели (или в карточке «Постпечать») рендерим компактный блок «Резка», показывающий по ТЗ:
  - печатный формат и размер готового изделия;
  - размер изделия с bleed (`product + 2*bleed`);
  - `cols × rows`, `itemsPerSheet`;
  - `cutsPerSheet`, источник (авто / справочник / ручная);
  - цена реза и итог;
  - инпут «Изменить вручную» (только для администратора/технолога — пока без role-check, видно всем; кнопка «Сбросить на авто»).
- Новый компонент: `src/components/calc/CutInfoCard.tsx` (читает `result.cutInfo`, отдаёт `onOverride(n|null)`).

## 4. Тесты (`src/lib/calc/audit.test.ts` или новый)

- `autoCutsFromLayout`: 1×1→4, 2×4→12, 4×4→16, 8×8→32.
- Engine: при отсутствии связки в `cut_count_rules` и нестандартном изделии 100×70 на 520×360 → cuts соответствуют раскладке, total = `printSheets * cuts * price`.
- Engine: `cutsPerSheetOverride = 7` → используется именно 7, source = `manual`.

## 5. Что НЕ трогаем

- Справочник `cut_count_rules` (UI и схема) — без изменений.
- Резку **закупочного → печатного** (`cutsForNesting`) — без изменений.
- Цена реза — уже в `calc_constants` (`cut_price_per_print`), отдельный справочник работ создавать не будем (ТЗ-пункт 10 уже покрыт существующей таблицей; при желании можно отдельной задачей завести `operation_catalog` запись).

## Файлы

```text
src/lib/calc/engine.ts          — autoCutsFromLayout, новый приоритет, cutInfo
src/lib/calc/types.ts           — CalcInput.cutsPerSheetOverride, CalcResult.cutInfo
src/lib/calc/validation.ts      — схема для cutsPerSheetOverride
src/pages/Calculator.tsx        — состояние override, передача в input, рендер CutInfoCard
src/components/calc/CutInfoCard.tsx (new) — карточка с разбивкой и ручным вводом
src/lib/calc/audit.test.ts      — тесты авто-расчёта и override
```

Если ок — переключайте в build mode, реализую.
