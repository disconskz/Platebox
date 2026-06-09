## Цель
В режимах **Расширенный** и **Технолог** показывать в UI калькуляторов формулы расчёта из справочника (то, как именно получены цифры), а также давать возможность редактировать формулы — но не «здесь», а централизованно через справочник, с переходом на нужную операцию.

## Что показываем и где
Формулы и переменные приходят из `HandbookProvider.priceOp(...)` в виде поля `HandbookLine.details` (формула, вычисленное значение, значения всех переменных) и метки `source: "handbook"`. Сейчас эти данные уже передаются в строки расчёта, но нигде не отображаются.

### 1. Блок «Себестоимость по этапам» (CostByStageBlock)
Файл: `src/components/calc/multipage/CostByStageBlock.tsx` (рендерится в обёртке `<AdvancedOnly>`).

- Расширить тип `SpecLine` опциональными полями: `source?: "handbook" | "fallback"`, `opCode?: string`, `opName?: string`, `details?: HandbookLineDetail[]`.
- Внутри каждого этапа добавить раскрывающийся список строк операций (сейчас показан только агрегат). У каждой строки:
  - **AdvancedOnly:** одна строка-чип `Формула: [ТИРАЖ] × 0.5 = 250` (компактно, моноширинно).
  - **TechOnly:** под чипом — таблица переменных из `details[]` (имя → значение → формула), плюс кнопка «Редактировать в справочнике» → deep-link на `/references?tab=__op_catalog&op=<opCode>`.

### 2. Дерево цены (PriceBreakdownTree)
Файл: `src/components/calc/PriceBreakdownTree.tsx` (используется в Calculator.tsx).

- В раскрытой строке этапа (`StageNode`, рядом с `qty × price = total`) добавить:
  - **AdvancedOnly:** `formulaText` (если известен) одной строкой под `qty × price`.
  - **TechOnly:** детали переменных + кнопка «Открыть в справочнике».
- Использовать тот же контекст mode, что и в multipage (`useCalcMode` из `@/lib/calc/multipage/context`).

### 3. Прокидывание данных в строки
В легаси-калькуляторах (`BrochureCalculator`, `NotepadCalculator`, `DeskCalendarCalculator`, `PocketCalendarCalculator`, `BoxProCalculator`, `BadgeCalculator` и др.) строки уже формируются через `buildTryHandbook(priceOp, push, ...)`. Нужно убедиться, что `push()` сохраняет в SpecLine поля `source`, `opCode`, `opName`, `details` из `HandbookLine`. Если в каком-то калькуляторе данные теряются — поправить только функцию `push` (без изменения бизнес-логики расчёта).

## Редактирование формул через справочник
Редактируется **только в справочнике** (`/references` → вкладка «Каталог операций»). В калькуляторе только кнопка-ссылка.

### Изменения в страницах справочника
Файл: `src/pages/References.tsx` и `src/components/references/OperationCatalog.tsx`.

- `References.tsx`: читать `searchParams.get("tab")` и `searchParams.get("op")`. Если `tab === "__op_catalog"` — переключаться на вкладку каталога операций; если задан `op` — пробрасывать его в `<OperationCatalog initialOpCode=... />`.
- `OperationCatalog.tsx`: при наличии `initialOpCode` после загрузки списка автоматически выделять нужную операцию (scroll + раскрытие) и открывать редактор `FormulaBuilder` для её первой строки `operation_work_items`, либо просто фокусировать карточку — кнопка «Редактировать» уже есть рядом с формулами.

### Кнопка «Редактировать в справочнике»
- В `CostByStageBlock` (TechOnly) и `PriceBreakdownTree` (TechOnly) рядом с каждой формулой:
  ```
  <Link to={`/references?tab=__op_catalog&op=${opCode}`}>
    <Pencil className="h-3 w-3" /> В справочник
  </Link>
  ```
- В `AdvancedOnly` редактирования нет — только просмотр формулы.

## Поведение режимов (резюме)
| Режим | Видит | Может |
|---|---|---|
| Simple | Только итоговые цифры | — |
| Расширенный | + формулы операций рядом с цифрами | Только смотреть |
| Технолог | + значения переменных, ссылка на справочник | Перейти в справочник и менять формулу там |

## Что НЕ делаем
- Не добавляем редактор формул внутрь калькулятора (по требованию: «менять только по справочнику»).
- Не меняем движок расчёта, типы `HandbookLine`, схему БД и таблицы `operation_*`.
- Не трогаем простой режим — там UI остаётся прежним.

## Файлы, которые изменим
1. `src/components/calc/multipage/CostByStageBlock.tsx` — расширить SpecLine, добавить рендер формул (AdvancedOnly) и деталей+ссылки (TechOnly).
2. `src/components/calc/PriceBreakdownTree.tsx` — добавить отображение формул/деталей в раскрытых строках с учётом mode.
3. `src/pages/References.tsx` — читать query-параметры `tab` и `op`, активировать нужную вкладку/операцию.
4. `src/components/references/OperationCatalog.tsx` — поддержать `initialOpCode` (выделение/прокрутка).
5. (При необходимости) `src/pages/BrochureCalculator.tsx`, `NotepadCalculator.tsx` и т.п. — только корректировка функции `push`, чтобы не терять `source`/`details`/`opCode` при формировании SpecLine.

После сборки проверим визуально: в режиме «Расширенный» под каждой операцией виден текст формулы, в режиме «Технолог» — таблица переменных и кнопка «В справочник», переход открывает нужную операцию.