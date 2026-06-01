
# Глобальные и локальные параметры изделия

## Цель

Один источник правды для общих параметров (формат, тираж, ориентация, тип изделия, тип печати, тип сборки, срок, наценка). Все внутренние блоки (обложка, подложка, внутренние страницы, сборка и т.д.) наследуют их автоматически. Локально менять можно только после явного включения переключателя «Переопределить параметры блока».

## Что уже есть (используем как фундамент)

- `GlobalProductParams` и `MultipageCalcContext` в `src/lib/calc/multipage/context.tsx` (format, circulation, orientation, printType, bindingType, leadTimeDays, marginPercent).
- Хуки `useInheritedParam`, `useSyncMultipageGlobal`.
- В `InternalBlock` уже есть `override: boolean` (но только для `printType`).
- `GlobalParamsBar` показывает глобальные значения.

## Что не так

- `CoverSection`, `UnderlaySection`, инлайн-карточки обложки/блока в `BrochureCalculator` не наследуют глобальные параметры и не имеют override-переключателя.
- Standalone-страницы (`/calculator/brochure` и т.п.) рендерятся без `MultipageCalcProvider` — контекст пуст.
- В `BrochureCalculator` параллельно живут инлайн-карточки (которые реально считают цену) и `CoverSection`/`InternalBlocksEditor` (декоративные). Источник истины не один.
- `leadTimeDays` почти нигде не пушится в контекст.

## План

### 1. Унифицировать модель параметров

В `src/lib/calc/multipage/context.tsx`:
- Расширить `GlobalProductParams`: добавить `productType?: string` (тип изделия).
- Добавить общий тип `LocalBlockOverrides` для блоков:
  ```ts
  interface LocalBlockOverrides {
    override: boolean;       // мастер-переключатель
    format?: string;
    formatWidth?: number;
    formatHeight?: number;
    circulation?: number;
    printType?: string;
    paper?: string;
    density?: number;
    colorFront?: number;
    colorBack?: number;
  }
  ```
- Расширить `useInheritedParam` → `useInheritedBlockParams(local)` — возвращает «эффективные» значения с учётом override.

### 2. Обеспечить, что Provider всегда есть

В standalone-страницах калькуляторов (`StandaloneModeShell` / `App.tsx`) обернуть содержимое в `MultipageCalcProvider`, чтобы контекст работал и на `/calculator/<name>`, не только во встроенном режиме.

### 3. Привести верхнюю панель глобальных параметров к единому виду

- В `GlobalParamsBar` сделать редактируемые поля (а не только чипы) для: формат, тираж, ориентация, тип печати, тип сборки, срок, наценка, тип изделия.
- Изменения сразу пишутся в `calcCtx.setGlobal(...)` — единый источник правды.
- В страницах (Brochure/Notepad/DeskCalendar/PocketCalendar и других через template) удалить дублирующие верхние контролы либо заменить их на чтение из контекста.

### 4. Переработать секции-блоки на наследование + override

Файлы: `CoverSection.tsx`, `UnderlaySection.tsx`, `AssemblySection.tsx`, `InternalBlocksEditor.tsx`, инлайн-карточки в `BrochureCalculator`.

В каждом блоке:
- Хранить только `LocalBlockOverrides` (а не полный набор полей).
- Сверху блока — переключатель **«Переопределить параметры блока»** (`override`).
- Когда `override = false`:
  - Поля формата/тиража/печати/бумаги/цветности рендерятся в режиме «только чтение» с пометкой «наследовано».
  - В расчёт идут глобальные значения.
- Когда `override = true`:
  - Поля становятся редактируемыми.
  - В расчёт идут локальные значения; если поле пустое — fallback на глобальное.

### 5. Каскад изменений сверху вниз

- Так как блоки читают `ctx.global` через `useInheritedBlockParams`, любое изменение в `GlobalParamsBar` автоматически обновляет все блоки без override.
- Блоки с `override=true` остаются на своих значениях (это и есть ожидаемое поведение).

### 6. Чистка дубликатов в `BrochureCalculator`

- Удалить параллельные инлайн-карточки «Обложка» и «Внутренние блоки» (строки ~1011–1056) — оставить только `CoverSection` и `InternalBlocksEditor` как единственные UI-источники.
- Переключить блок ценообразования на чтение из state `cover`/`internalBlocks` (уже существующих), а не из удаляемых `coverPaperKey`/`blockPaperKey`/`colorCover*`/`colorBlock*`.
- Удалить ставшие неиспользуемыми top-level `useState`.

### 7. Применить ту же модель ко всем шаблонным страницам

- `NotepadCalculator`, `DeskCalendarCalculator`, `PocketCalendarCalculator` — заменить локальные дубли формата/тиража/печати на чтение из контекста.
- Для legacy-страниц (Leaflet, BusinessCard, Sticker и т.д., где сейчас стоит только `LegacyCostByStageBlock`) — на этом этапе **не трогать**: они не имеют многоблочной структуры. По умолчанию параметры там и так глобальны.

### 8. Тексты UI

- Переключатель: «Переопределить параметры блока».
- Подпись над заблокированными полями: «Наследовано из общих параметров».
- В шапке блока, если `override=true`, бейдж «Переопределено».

## Технические детали

- `LocalBlockOverrides` живёт рядом с типом каждой секции (`CoverState`, `UnderlayState`, `InternalBlock`) — через композицию, а не наследование.
- Расчётные функции (`computeBrochureCostKZT`, `computeNotepadCostKZT` и т.д.) принимают «эффективные» значения, разрешённые хелпером, поэтому ядро калькуляций менять не нужно.
- Сохранения в localStorage (`useCalcPersist`) добавляют новое поле `override` — миграция простая: дефолт `false`, остальные локальные поля игнорируются, пока override не включён.

## Out of scope

- Не меняем формулы расчёта себестоимости.
- Не трогаем legacy одностраничные калькуляторы (Leaflet и т.п.) — у них один блок, проблема дублирования не возникает.
- Не меняем backend/ERP интеграцию.

## Результат

- Менеджер задаёт формат/тираж/печать один раз сверху.
- Все блоки сразу подхватывают значения; смена сверху мгновенно обновляет всё.
- Локально что-то поменять можно только через явный переключатель — случайных расхождений быть не может.
