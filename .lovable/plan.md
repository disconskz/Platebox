
## Цель

Сейчас машина подбирается только по размеру печатного листа (наименьшая, куда влезает формат). Нужно, чтобы выбор учитывал **тираж** и **тип продукции**: маленькие тиражи → цифра/малая машина, большие → офсет/большая машина. Все правила — в справочнике, без хардкода.

## Что добавим в справочник

### 1. Расширяем таблицу `press_machines`

Новые поля:
- `machine_type` (text): `digital` | `offset` — тип машины
- `min_circulation` (int, default 0) — минимальный тираж изделий
- `max_circulation` (int, nullable) — максимальный тираж изделий (NULL = без ограничения)
- `min_sheets` (int, default 0) — минимум печатных листов в работе
- `max_sheets` (int, nullable) — максимум печатных листов
- `setup_sheets` (int, default 0) — приладка (листов) для этой машины
- `setup_cost` (numeric, default 0) — стоимость приладки/формы за прогон (₸)
- `product_types` (text[], nullable) — список типов продукции, для которых машина подходит (пусто = для всех)
- `priority` (int, default 100) — приоритет при равных условиях (меньше = выше)
- `is_active` (boolean, default true)

### 2. Новая таблица `product_circulation_rules` (опционально, для тонкой настройки)

Привязка диапазонов тиража к рекомендуемой машине по типу продукта:
- `id`, `product_type` (text), `min_circulation` (int), `max_circulation` (int nullable), `preferred_machine_id` (uuid → press_machines), `sort_order`

Если для продукта/тиража есть запись — используется она; иначе — общий подбор по `press_machines`.

## Логика автовыбора машины

В `Calculator.tsx` (`autoPickMachine`) меняем сигнатуру на `autoPickMachine(printW, printH, productType, circulation, printSheets)` и алгоритм:

```text
1. Если есть product_circulation_rules для (productType, circulation) → берём preferred_machine_id (если активна и формат влезает).
2. Иначе фильтруем press_machines:
   - is_active = true
   - формат печ. листа влезает (с учётом поворота)
   - circulation в диапазоне [min_circulation, max_circulation]
   - print_sheets в диапазоне [min_sheets, max_sheets]
   - product_types пуст ИЛИ содержит productType
3. Сортируем: priority ASC, затем площадь max_format ASC (минимальная подходящая).
4. Берём первую. Если ничего не подошло — fallback на старую логику (по формату) + warning «нет правила для тиража N».
```

Приладка/setup из машины переопределяет дефолты в движке для этой работы.

## Изменения в коде

**Миграция БД:**
- `ALTER TABLE press_machines ADD COLUMN ...` (все новые поля)
- `CREATE TABLE product_circulation_rules ...` + RLS (читать всем authenticated, писать admin)
- Заполнить дефолты для существующих 3 машин (A3+/A2+/A1) разумными диапазонами тиражей

**`src/pages/References.tsx`:**
- Расширить spec `press_machines` новыми колонками (включая multi-select для `product_types` и select для `machine_type`)
- Добавить новую вкладку «Правила тиражей» (`product_circulation_rules`) с ref-полями на product_type и press_machine

**`src/pages/Calculator.tsx`:**
- `PressMachineRow` тип расширить
- `autoPickMachine` — новый алгоритм (см. выше)
- Загрузить `product_circulation_rules`
- В блоке «Авто-машина» показывать причину выбора («тираж 5000 → офсет A2+»)
- Если машина не найдена — явное предупреждение

**`src/lib/calc/engine.ts` / `types.ts`:**
- В `CalcInput` добавить опциональные `setupSheetsOverride`, `setupCostOverride` от выбранной машины
- Использовать их вместо `DEFAULTS.setupOwn` когда заданы

## UX в калькуляторе

- Под «Авто-машина: …» добавить badge: `digital`/`offset` и текст «подходит для тиража 1–500»
- Если пользователь меняет тираж и машина переключается — короткий toast «Машина изменена: → KBA Rapida (офсет, тираж >1000)»
- В режиме «Расширенно» при ручном выборе оборудования показывать warning, если оно не соответствует правилам тиража

## Что НЕ меняем

- Подбор печатного формата и закупочного листа — без изменений
- Расчёт бумаги/постпресса — без изменений
- Старые расчёты остаются валидными (новые поля nullable / с дефолтами)

## Поэтапная реализация

1. Миграция БД + сидинг диапазонов для текущих 3 машин
2. UI справочника (press_machines + новая вкладка правил)
3. Новая логика `autoPickMachine` + индикация в калькуляторе
4. Передача setup-параметров машины в движок расчёта
