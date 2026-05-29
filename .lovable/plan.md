## Цель

В вкладке «Новый расчёт» (`/calculator`) при выборе многостраничного типа изделия должны появляться те же поля и считаться тот же итог, что и на странице-шаблоне (`/calculator/brochure`, `/calculator/notepad`, …). И сам шаблон-страница, и универсальный экран должны использовать **одну и ту же реализацию** — чтобы расчёт нельзя было «развести» по двум кодовым путям.

## Скоуп этого захода

Только многостраничные шаблоны:

1. Брошюра (`brochure`) — `BrochureCalculator` mode="brochure"
2. Журнал (`magazine`) — `BrochureCalculator` mode="magazine"
3. Каталог (`catalog`) — `BrochureCalculator` mode="catalog"
4. Книга в мягком переплёте (`softcover_book` → `book`) — `BrochureCalculator` mode="softcover"
5. Книга в твёрдом переплёте (`hardcover_book` → `book`) — `BrochureCalculator` mode="hardcover" (через `HardcoverBookCalculator`)
6. Блокнот (`notepad`) — `NotepadCalculator`
7. Ежедневник (`planner`) — `PlannerCalculator` → `NotepadCalculator` mode="planner"
8. Календарь квартальный (`calendar_quarter`) — `QuarterCalendarCalculator`
9. Календарь настольный/перекидной (`calendar_desk`, `calendar_wall`) — `DeskCalendarCalculator`
10. Календарь карманный (`calendar_pocket`) — `PocketCalendarCalculator`

Листовка/визитка/упаковка/POS — **в этом заходе не трогаем** (по выбору пользователя).

## Архитектура: гибрид (общий каркас + блоки-плагины)

### Шаг 1. Каркас для встраивания (`MultipageTemplateHost`)

Создаю `src/components/calc/MultipageTemplateHost.tsx`:

* Тонкий контейнер, который по `productType` рендерит соответствующее тело шаблона.
* Принимает пропсы каркаса: `embedded?: boolean`, `circulation`, `onResult(SpecItem[], totals)`, `name`, `clientId` и т.п.
* Возвращает дочерний компонент шаблона + проксирует наверх итоги.

### Шаг 2. Рефакторинг шаблон-страниц в «тело + страница»

Каждый из 5 ключевых шаблонов (`BrochureCalculator`, `NotepadCalculator`, `DeskCalendarCalculator`, `PocketCalendarCalculator`, `QuarterCalendarCalculator`) сейчас — монолитная страница: рисует свой `PageShell`, заголовок, сайдбар с итогами, кнопки сохранить/PDF и т.д.

Разделяю каждый файл на два слоя без изменения логики расчёта:

```
src/pages/BrochureCalculator.tsx          ← остаётся как страница-обёртка
src/components/calc/templates/
  BrochureTemplate.tsx                     ← «тело»: форма + расчёт + спецификация
  NotepadTemplate.tsx
  DeskCalendarTemplate.tsx
  PocketCalendarTemplate.tsx
  QuarterCalendarTemplate.tsx
```

* В `*Template.tsx` переезжает **всё** состояние, `useMemo` расчёта, JSX полей и таблицы спецификации.
* Тело принимает `embedded?: boolean`. Когда `embedded=true`:
  * не рендерит `PageShell`, заголовок страницы, breadcrumbs;
  * не рендерит свою кнопку «Сохранить»/«Шаблон»/«PDF» (это делает хост);
  * через `onResult` отдаёт наружу итоговые `SpecItem[]`, `totalCost`, `salePrice`, `margin`, имя расчёта, параметры для сохранения.
* В страницах `BrochureCalculator.tsx`, `NotepadCalculator.tsx` и т.д. остаётся только `<PageShell>…<XxxTemplate embedded={false} mode={…} /></PageShell>`. Маршруты `/calculator/brochure`, `/calculator/notepad`, `/calculator/magazine` и т.д. продолжают работать как раньше.

### Шаг 3. Подключение в Calculator.tsx

В `src/pages/Calculator.tsx`:

* Определяю множество multipage-типов:

  ```ts
  const TEMPLATE_DRIVEN: ProductType[] = [
    "brochure", "magazine", "catalog",
    "book",              // softcover
    "book_hardcover",    // если есть отдельный тип, иначе caps-флаг
    "notepad", "planner",
    "calendar_quarter", "calendar_desk", "calendar_wall", "calendar_pocket",
  ];
  ```
* Сразу после выбора типа изделия, если `TEMPLATE_DRIVEN.includes(productType)`:
  * Скрываются текущие секции «Обложка / Бумага / Красочность / Постпечать» универсального экрана.
  * Вместо них рендерится `<MultipageTemplateHost embedded productType={…} circulation={…} onResult={…} />`.
  * Остаются общие верх (название, клиент, тираж) и правый сайдбар с итогами + кнопками «Сохранить» / «PDF» / «Сохранить как шаблон» — они работают по данным из `onResult`.
* Текущая огромная логика секций (state, useMemo, формы для брошюры/книги/блокнота, которая сейчас живёт в `Calculator.tsx`) для этих 10 типов **отключается**, чтобы не было двух расчётных путей. Для остальных типов (листовая, упаковка, POS, наклейки, визитки и т.д.) — всё остаётся без изменений.

### Шаг 4. Синхронизация типов продукции

* В `src/lib/calc/products.ts` и `src/lib/calc/capabilities.ts` сверяю набор типов с шаблонами:
  * `softcover_book` / `hardcover_book` — если их нет в `ProductType`, добавляю как алиасы и маппю в `book` для движка.
  * `planner`, `calendar_pocket` — добавить, если отсутствуют.
* В словаре `product_glossary` обновляю `base_product_type` для соответствующих slug, чтобы при выборе из глоссария «Журнал»/«Каталог»/«Ежедневник» подставлялся правильный тип.

### Шаг 5. Гарантия идентичности расчёта

* Один расчётный код (тот, что в `*Template.tsx`) используется и на `/calculator`, и на `/calculator/brochure`. Расхождений по определению быть не может.
* Добавляю unit-тест-снэпшот: для каждого из 10 типов прогон с фиксированным набором входов → `SpecItem[] + totals` сравниваются в одном тесте, мы убеждаемся, что хост и страница возвращают одинаковый объект.

## Что НЕ меняется

* `LeafletCalculator`, `FlyerCalculator`, `BusinessCardCalculator`, `BagCalculator`, `BoxCalculator`, `StickerCalculator` и пр. — не переносим в этот заход.
* База данных не трогается (только при необходимости миграция `product_glossary.base_product_type`).
* Существующие сохранённые расчёты и шаблоны продолжают открываться через те же страницы.

## Технические детали (для разработчика)

* Контракт `onResult`:

  ```ts
  type TemplateResult = {
    specItems: SpecItem[];
    totalCost: number;
    salePrice: number;
    marginPercent: number;
    productType: ProductType;
    suggestedName: string;
    payloadForSave: Record<string, unknown>; // state шаблона для is_template
  };
  ```
* Сохранение/PDF в `Calculator.tsx` использует `payloadForSave` как `parameters` колонки `calculations`. При повторном открытии расчёта мы передаём `initialState` в `*Template.tsx`, чтобы восстановить ровно те поля.
* Чтобы не сломать существующие routes, тестируем после правок:
  1. `/calculator/brochure` (страница) — должна выглядеть и считать как раньше.
  2. `/calculator`, выбран «Брошюра» — должны появиться те же поля и тот же итог при тех же входах.
  3. То же для `notepad`, `calendar_desk`, `calendar_quarter`, `calendar_pocket`, `softcover`, `hardcover`, `magazine`, `catalog`, `planner`.

## Этапы выполнения

1. Каркас `MultipageTemplateHost` + контракт `TemplateResult`.
2. Рефакторинг `BrochureCalculator` → `BrochureTemplate` (brochure/magazine/catalog/softcover/hardcover).
3. Рефакторинг `NotepadCalculator` → `NotepadTemplate` (notepad/planner).
4. Рефакторинг `DeskCalendarCalculator`, `QuarterCalendarCalculator`, `PocketCalendarCalculator` → их Template-версии.
5. Подключение хоста в `Calculator.tsx` для 10 типов; отключение старых секций для этих типов.
6. Восстановление сохранения/PDF/шаблонов поверх `TemplateResult`.
7. Снэпшот-тест эквивалентности страница↔хост для каждого из 10 типов.
8. Прогон по preview, ручная проверка одинаковости итогов.

## Риски

* Размер изменений значительный (рефакторинг ~5 файлов по 600–1100 строк + правки в Calculator.tsx).
* Существующая огромная логика для брошюры/книги/блокнота внутри `Calculator.tsx` будет вырезана для перечисленных типов — нужно убедиться, что её удаление не ломает другие типы (листовая, упаковка). Делаем это аккуратно: не удаляем код, а гейтим его условием «не TEMPLATE_DRIVEN».
* Сохранённые ранее расчёты этих типов через `/calculator` могут иметь старый формат `parameters` — добавлю мягкий маппинг при загрузке.
