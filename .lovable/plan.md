## Цель

Единый порядок секций во всех шаблонных калькуляторах, во всех режимах (Простой / Расширенный / Технолог):

1. Основные параметры
2. Обложка
3. Подложка
4. Внутренние блоки
5. Допечатка
6. Печать
7. Постпечатка
8. Сборка
9. Спецоперации
10. Контроль
11. Упаковка
12. Маршрут
13. Итог
14. Техотчёт

## Текущее состояние

Большинство калькуляторов уже частично соответствуют порядку, но есть отклонения:

**`BrochureCalculator.tsx`** (он же Catalog / Magazine / Softcover / Hardcover / Planner / QuarterCal):
- `CoverSection` импортирован и есть state `cover`, но компонент не рендерится — есть только inline-карточка «2. Обложка», и она не привязана к данным `cover`/ERP.
- Порядок в подвале: `RouteTimeline` → `CompositionTable` → `TechReport` → `ExpandedTotals`. Нужно: `RouteTimeline` → `ExpandedTotals` (Итог) → `TechReport` (`CompositionTable` оставить как часть техотчёта или перед ним).
- В Простом режиме (без Advanced) пользователь видит «1. Основные → 2. Обложка → 4. Внутренние блоки» — пропуск «3. Подложка», т.к. она скрыта за `AdvancedOnly`.

**`NotepadCalculator.tsx`**:
- В Расширенном порядок верный: `CoverSection` (2) → `UnderlaySection` (3) → `InternalBlocksEditor` (4) → ...
- В Простом — большой `Accordion` с собственным порядком (Обложка → Подложка → Скрепление → ...), это нормально, оставляем как «расширенный inline-редактор» внутри Основных.
- Подвал: `RouteTimeline` → `TechReport`. `ExpandedTotals` отсутствует — добавлять не будем (вне scope).

**`PocketCalendarCalculator.tsx`, `DeskCalendarCalculator.tsx`**:
- Порядок секций уже соответствует ТЗ. Менять не нужно.

## Изменения

### 1. `src/pages/BrochureCalculator.tsx`

- Заменить inline-карточку «2. Обложка» (строки ~1223–1244) на `<CoverSection value={cover} onChange={setCover} title="2. Обложка" />`. Существующие поля (бумага, цветность, корешок) перенесены, расчёт обложки уже использует `cover` через `buildCoverLines` — UI станет единым.
- Снять `AdvancedOnly` с `UnderlaySection` (Подложка должна быть видна в Простом режиме, как пункт 3 единой нумерации).
- Снять `AdvancedOnly` с `InternalBlocksEditor` и удалить устаревшую inline-карточку «4. Внутренние блоки» (строки ~1251–1273), чтобы внутренние блоки шли строго после Подложки и были единственным редактором блоков во всех режимах.
- Переставить блок «Итог» (`ExpandedTotals`) с позиции после `TechReport` на позицию между `RouteTimeline`/`CompositionTable` и `TechReport`. Финальный порядок подвала:
  `RouteTimeline` → `CompositionTable` → `ExpandedTotals` (Итог) → `TechReport`.

### 2. `src/pages/NotepadCalculator.tsx`

- Менять порядок не нужно (CoverSection / UnderlaySection / InternalBlocksEditor уже идут 2-3-4 в Расширенном). В Простом режиме оставить текущий Accordion (внутренний UI), потому что он не нарушает иерархию «Обложка раньше Внутренних блоков».
- Никаких функциональных правок, только убедиться, что нумерация секций (`title="2. Обложка"`, `title="3. Подложка"` и т.д.) сохраняется.

### 3. `src/pages/PocketCalendarCalculator.tsx`, `src/pages/DeskCalendarCalculator.tsx`

- Проверить и оставить как есть (порядок уже совпадает). Никаких изменений в коде.

## Технические детали

- Сохраняем существующие двусторонние синхронизации `internalBlocks[0] ↔ legacy pages/blockPaperKey/...` — удаление только UI-карточки, state и расчёт не трогаем.
- `cover` state в Brochure уже инициализирован `DEFAULT_COVER` и используется `buildCoverLines`; добавление `<CoverSection>` не сломает расчёт.
- Все секции сохраняют свои префиксы нумерации в `title`, чтобы порядок был визуально очевиден.

## Файлы

- `src/pages/BrochureCalculator.tsx` — заменить inline-обложку, снять `AdvancedOnly` с Подложки/InternalBlocksEditor, удалить дубль «4. Внутренние блоки», переставить `ExpandedTotals`.
- (Опц.) проверка `NotepadCalculator.tsx`, `PocketCalendarCalculator.tsx`, `DeskCalendarCalculator.tsx` без изменений кода.
