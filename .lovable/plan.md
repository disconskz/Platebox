## Доработка 29 — операция «Перфорация»

Добавляем отдельный модуль перфорации по той же архитектуре, что уже использована для шитья/тиснения/термобиндера (справочник в БД + ряд в Calculator + расчёт в engine).

---

### 1. Миграция БД — таблица `perforation_prices`

Структура по аналогии с `block_trimming_prices` / `endpaper_prices`. Поля:

- `name text`, `is_active bool`, `sort_order int`
- `perforation_type text` — `tear | micro | fold | big | round | figured | manual | machine`
- `equipment_type text` — `tigel | numbering_machine | inline | manual`
- `calc_mode text` — `per_length | per_sheet | per_pass` (по умолч. `per_length`)
- `price_per_meter numeric`, `price_per_sheet numeric`, `price_per_pass numeric`
- Коэффициенты материала: `coef_paper_light` (≤130), `coef_paper_med` (130–250), `coef_paper_heavy` (250–400), `coef_cardboard`, `coef_plastic`
- Пороги плотности: `density_light_max int=130`, `density_med_max int=250`, `density_heavy_max int=400`
- Коэффициенты сложности: `coef_micro`, `coef_figured`, `coef_manual`, `coef_nonstandard_format`, `coef_many_lines`, `many_lines_threshold int=3`
- Ограничения оборудования: `min_format_short`, `max_format_long`, `max_paper_density`, `max_lines_per_pass`
- `setup_cost numeric`, `min_cost numeric`
- `updated_by uuid`, `created_at`, `updated_at` (+ триггер `set_updated_at`)
- GRANT authenticated/service_role + RLS (admin write, auth read) — как у остальных таблиц.

Засеять 2–3 дефолтных записи (микроперфорация на нумераторе, отрывная на тигеле).

### 2. Engine — формула

Чистая функция `calcPerforation(rule, input) → { totalLengthM, materialCoef, complexityCoef, baseCost, finalCost, breakdown }`. Логика:

- `lengthM = lineLengthMm / 1000`
- `totalLengthM = lengthM × linesPerItem × circulation`
- `materialCoef` — по плотности и типу материала (картон/пластик имеют приоритет над плотностью).
- `complexityCoef` = произведение применимых коэф. (тип перфорации, ручная, нестандартный формат, много линий).
- По `calc_mode`:
  - `per_length`: `printSheets`-независимо — `totalLengthM × price_per_meter × materialCoef × complexityCoef`
  - `per_sheet`: `printSheets × price_per_sheet × complexityCoef`
  - `per_pass`: `printSheets × passes × price_per_pass × complexityCoef`
- `+ setup_cost`, потом `max(min_cost)`.
- Предупреждения: формат вне диапазона, плотность выше `max_paper_density`, линий больше `max_lines_per_pass`.

### 3. UI в Calculator.tsx

Новый блок «Перфорация» (аналогично блокам высечки/тиснения), внутри раздела доп. операций. Управление:

- enable toggle
- выбор записи из `perforation_prices`
- поля: длина линии (мм), линий на изделие, число проходов (для per_pass), способ расчёта (override), коэф. (override).
- информативный вывод: общая длина в м, коэф. материала, коэф. сложности, расчётная и итоговая стоимость, приладка, мин. стоимость, предупреждения.
- результат добавляется в `extraSpecItems` как `{ stage: "postpress", name: "Перфорация (...)", quantity, unit, unitPrice, total }`.

### 4. Справочник в References

Добавить таблицу-редактор в `src/components/references/` (или расширить существующую страницу `References.tsx`) с CRUD по `perforation_prices` — те же поля, что в миграции.

### 5. Тесты

Юнит-тест на `calcPerforation`: пример из ТЗ (билет, 5000 шт, 2 линии × 120 мм, 15 тг/м, картон 300 → коэф. 1.5, приладка 3000) → ровно 30 000 тг.

---

### Технические заметки

- Перфорация в составе штампа высечки: добавить чек-бокс «Учтена в высечке» — если включён, операция в маршрут не добавляется (только пометка в спецификации). По умолчанию выключен.
- Совместимость: пользователи без записей в `perforation_prices` увидят пустой селект и предупреждение «Заполните справочник».
- Сначала отправляю миграцию (требуется одобрение пользователя), после её применения — код UI/engine.

Запускаю миграцию первой; после одобрения сразу делаю engine + UI + редактор справочника.