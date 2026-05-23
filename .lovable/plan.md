## Цель

Сделать так, чтобы вариант просчёта из справочника полностью описывал расчёт: каждый этап сам решает, откуда брать стоимость — из формулы, из системного движка, или из материала. Этапы формулы становятся обычными строками спецификации.

## 1. Источник стоимости на уровне этапа

Расширяем `VariantStage`:

```ts
source: "formula" | "system" | "material"  // default "formula"
system_key?: string | null                  // для source = "system"
```

`system_key` — один из:
`paper_cost | paper_cut_cost | print_cost | forms_cost | forms_prep_cost | ink_cost | postpress_total | cuts_total | setup_cost`

Миграция: в `calc_variant_stages` добавить `source text not null default 'formula'` и `system_key text`.

В UI редактора этапа (`References` → редактор варианта) — селектор «Источник»:
- «Формула» — текущее поведение, поле формулы активно.
- «Системный расчёт» — выпадающий список `system_key`, формула скрывается.
- «Материал» — селект `material_id` + формула количества (используем уже существующее `material_formula`).

## 2. Движок: расчёт этапа

В `src/lib/calc/variants/engine.ts` расширяем `EvalContext`:

```ts
type EvalContext = {
  vars: Record<string, number>;
  consts: Record<string, number>;
  systemValues?: Record<string, number>;   // ключи = system_key
  materials?: Record<string, number>;      // material_id → cost_per_sheet
};
```

`runVariant` для каждого этапа:

```text
switch (stage.source) {
  case "system":   value = systemValues[stage.system_key] ?? 0
  case "material": qty = evalFormula(stage.material_formula); 
                   value = qty * (materials[stage.material_id] ?? 0)
  default:         value = evalFormula(stage.formula)
}
```

Сохраняем источник и детали (qty, unit_price) в `VariantStageResult` для отображения.

## 3. Calculator: подача данных и встраивание этапов в спецификацию

`src/pages/Calculator.tsx`:

- Собираем `systemValues` из `baseResult`:
  ```
  paper_cost, paper_cut_cost, print_cost, forms_cost, forms_prep_cost,
  ink_cost, postpress_total = sum(postpress), cuts_total = cutInfo.total,
  setup_cost = baseResult.setupCost ?? 0
  ```
- Грузим словарь `materials: Record<id, cost_per_sheet>` (один запрос, кэшируем по id используемых в активном варианте).
- Расширяем `autoVars`:
  ```
  кол_резов     ← cutInfo.cutsPerSheet × printSheets (или cutInfo.total/pricePerCut)
  кол_блоков    ← circulation (для блочных типов — позже уточнить)
  бумага_цена   ← effectiveMaterial.cost_per_sheet
  приладка_тираж ← circulation + setupSheets×itemsPerSheet
  лист_площадь  ← printFormat area, м²
  изделий_на_листе ← layout.itemsPerSheet
  ```
- Передаём `systemValues` и `materials` в `runVariantFormula`.

**Встраивание в спецификацию** (вместо `variantApplied` рядом):

```text
if (variantApplied) {
  spec = run.stages.map(toSpecRow)   // имя этапа, единица, qty, unit_price, total
  totalCost = run.total + extrasTotal
}
```

Системный `baseResult.spec` скрываем, когда вариант активен (как и сейчас при override), но строки выглядят единообразно: «Бумага (формула)», «Печать (системно)», «Тиснение (материал × 4,5)». Поле `source` рендерим как маленький тэг.

`PriceBreakdownTree` и таблица спецификации получают новый необязательный `source` для подписи.

## 4. Дополнительно

- В `FormulaWizard` показываем рядом с каждой переменной её фактическое значение из `autoVars` + источник (system_key/материал) для прозрачности.
- Тесты: добавить в `src/lib/calc/variants/engine.test.ts` кейсы для `source: system` и `source: material`.
- Миграция `calc_variant_stages`: новые колонки + дефолты, существующие строки получают `source='formula'` — поведение не меняется.

## Файлы

- Миграция: добавить `source`, `system_key` в `calc_variant_stages`.
- `src/lib/calc/variants/types.ts` — расширить `VariantStage`, добавить enum.
- `src/lib/calc/variants/engine.ts` — обновить `runVariant`, `VariantStageResult` (поля `source`, `qty`, `unitPrice`).
- `src/lib/calc/variants/api.ts` — читать/писать новые поля.
- `src/pages/Calculator.tsx` — `systemValues`, `materials`, расширенный `autoVars`, замена `spec` строками формулы.
- Редактор варианта в `References` (компонент с этапами) — UI селектора источника + список system_key + селект материала.
- `src/components/calc/FormulaWizard.tsx` — показ значения и источника.
- `src/components/calc/PriceBreakdownTree.tsx` (если нужно) — тэг источника.
- Тесты: `src/lib/calc/variants/engine.test.ts`.

## Что НЕ трогаем

- Текущую логику резки (`cutInfo`) и multi-SKU.
- Структуру `calc_constants`, `calc_stage_library`.
- Базовый системный движок `engine.ts` (только читаем результаты).

## Открытый вопрос (буду подбирать сам)

Переменные сверх текущих: добавлю `бумага_цена`, `изделий_на_листе`, `лист_площадь`, `приладка_тираж` — этого достаточно для большинства этапов; при необходимости легко расширить.
