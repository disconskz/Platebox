## Что меняем

Сейчас `ai-calc-chat` пихает в один system-prompt краткий снапшот справочников и просит модель «прикинуть на глаз». Постпечать оценивается без формул из `operation_work_items`, нет параметров операций, нет калькуляционных переменных, нет памяти между шагами диалога, нет реального просчёта.

Цель — ассистент, который:
- видит **все позиции справочника**, включая параметры и формулы операций;
- **сам спрашивает** недостающее свободной формой, помнит, что уже узнал;
- **считает по тем же формулам**, что и калькулятор (никаких «оценок ±»);
- возвращает **построчный разбор** материал / печать / постпечать / маржа / НДС.

---

## 1. Расширение датасета справочника

В `loadReferenceSnapshot` добавляем:

| Что | Откуда | Что отдаём модели |
| --- | --- | --- |
| Каталог операций | `operation_catalog` | `code`, `name`, `category`, `description` |
| Параметры операций | `operation_parameters` | `operation_code`, `name`, `default_value`, `formula`, `notes` |
| Виды работ операции | `operation_work_items` | `operation_code`, `name`, `price_source`, `quantity_source`, `notes` |
| Библиотека этапов | `calc_stage_library` | `name`, `category`, `formula`, `unit` |
| Варианты расчёта | `calc_variants` + `calc_variant_stages` | название, базовый продукт, состав этапов |
| Кастомные справочники | `custom_references` + `custom_reference_rows` | имена полей и строки (нужно для нестандартных позиций) |
| Полные `calc_constants` | как сейчас, но с `name`, `unit`, `description` | объяснимые константы |
| Оборудование | `equipment` | резервная техника, не только пресса |
| Подгруппы | у материалов/форматов/прессов/ламинации | для фильтров по «офсет/цифра», подкатегориям |

Снапшот по-прежнему кэшируем 5 минут, но переход с одного JSON-блока в system-prompt → на **выдачу через tool-calls**, чтобы не раздувать контекст.

---

## 2. Серверный движок формул

Портируем `src/lib/operations/formula.ts` (`evalFormula`, `parseDefault`, `extractVariables`) в `supabase/functions/_shared/formula.ts`. Используется и инструментом `calculate_operation`, и для предрасчёта дефолтов параметров.

Добавляем `_shared/calc-engine.ts` с тонкой функцией `estimateOrder(input, snapshot)`, которая повторяет логику калькулятора:

```text
items_per_sheet → sheets_useful → sheets_setup → sheets_total
paper_cost = sheets_total × material.price
prepress = forms × form_cost (из calc_constants)
print_cost = sheets_total × cost_per_impression × max(front,back) + setup_cost
postpress[i] = evalFormula(price_source) × evalFormula(quantity_source) с подставленными параметрами
total = sum; sale = total × (1 + margin/100); vat = sale × vat/100
```

---

## 3. Перевод edge-функции на AI SDK + tool-calling

Заменяем «один system-prompt + json_object» на `streamText` из `npm:ai` через AI Gateway по гайду `ai-sdk-lovable-gateway`. `stopWhen: stepCountIs(50)`.

Инструменты (узкие схемы через `zod`):

| Tool | Что делает |
| --- | --- |
| `list_product_types` | Список из `product_glossary` + `calc_variants` для подбора базы. |
| `list_materials` | Фильтр по `type` (`coated/uncoated/...`), `density`, `min_w/h`. Возвращает id, имя, плотность, формат, цену. |
| `list_print_formats` | Фильтр по подходящему `purchase_format_id`/материалу. |
| `list_press_machines` | Фильтр по `product_type`, тиражу, формату. |
| `search_operations` | Поиск операции по фразе («ламинация», «биговка», «нумерация»). Возвращает `code`, категорию, параметры (`name`, `default`, `formula`) и `work_items`. |
| `get_operation_detail` | Подробно по `code`: все параметры и формулы. |
| `evaluate_formula` | Принимает формулу + контекст переменных, возвращает число (использует движок). |
| `calculate_order` | Полный построчный расчёт: на входе материал, машина, формат, тираж, красочность, список выбранных операций с их параметрами. На выходе spec[] (stage, name, qty, unit_price, total) + cost / margin / vat / sale. |
| `propose_order_card` | Финализирует `proposed_order` строго в той же схеме, что фронт ждёт сейчас (`material_id`, `press_machine_id`, `print_format_id`, `postpress_breakdown`, `estimated_cost`, …). Перед возвратом валидируется санитайзером. |

Так как тулов >8, применяем паттерн дефералки из `ai-sdk-tool-deferral` только при необходимости — здесь набор фиксирован и небольшой, поэтому регистрируем напрямую.

---

## 4. Память по диалогу

Контракт памяти держим в JSON-объекте `draft`, который ассистент возвращает каждым ходом и видит в следующем. Хранение — на клиенте в `ai_messages.parts` (через uiMessage parts вида `data-draft`), сервер просто прокидывает последний `draft` обратно в system-prompt. Поля:

```text
draft = {
  product_type, name, circulation, format, custom_w/h,
  color_front, color_back,
  material_id, material_category, material_density,
  press_machine_id, print_format_id, items_per_sheet,
  postpress: [ { operation_code, params: {...}, notes } ],
  margin_percent, vat_percent,
  asked: ["density","lamination_film",...],   // уже спрошенное
  unresolved: ["fold_count",...]              // что нужно ещё
}
```

Это даёт «пересчитай с другой бумагой» / «добавь биговку» без перебора истории.

---

## 5. Системный промпт (контракт ассистента)

Короткий, без снапшота. Ключевые правила:
- Сначала смотри `draft`. Если хватает данных — вызови `calculate_order` и затем `propose_order_card`. Не считай сам в голове.
- Если не хватает обязательного — задай вопросы свободно, по 1–3 за раз, опираясь на `product_glossary` и характер изделия (для визиток — про скругление и ламинацию; для буклетов — про фальцовку и скрепление; и т. д.).
- Для поиска операций ВСЕГДА `search_operations` → `get_operation_detail` → `evaluate_formula`. Не выдумывай цены.
- Возвращай ответ в виде AI SDK message parts: текст + (опционально) data-part `proposed_order` для UI карточки.

---

## 6. Клиент

Минимальные изменения в `ChatWindow.tsx` и `AiOrderAssistant.tsx`:
- Парсим `parts`, ищем `data-proposed_order` (или оставляем текущую обёртку `{reply, proposed_order}` поверх стрима, если решим не мигрировать сразу на `useChat` — обе совместимы).
- Карточка заказа уже знает поля `postpress_breakdown`, `estimated_cost`, `material_id` — менять не нужно.

---

## 7. Тех. файлы

```text
supabase/functions/_shared/
  formula.ts             # порт src/lib/operations/formula.ts
  calc-engine.ts         # estimateOrder + postpress по operation_work_items
  references.ts          # loadReferenceSnapshot (расширенный) + кэш
  tools.ts               # все AI SDK tool({...}) с zod-схемами
  prompt.ts              # системный промпт + рендер draft
supabase/functions/ai-calc-chat/index.ts   # переписать на streamText + tools
```

`ai-assist` (старый) пока не трогаем.

---

## 8. Проверки

- `supabase--test_edge_functions` + локальный unit-тест `formula.ts` (повторяет существующий тестовый набор).
- `supabase--curl_edge_functions`: сценарии
  1. «Листовка А5 1000 шт, мелованная 130, 4+4, матовая ламинация 1+0» → должен сразу прислать `proposed_order` с реальными id и постатейным `postpress_breakdown`.
  2. «Визитки 500 шт» → ассистент должен спросить про красочность/ламинацию.
  3. «Пересчитай с офсетной 80 г» → должен использовать предыдущий `draft`.
- Замер размера запроса: контекст модели на ход ≤ 8k токенов (за счёт перехода со снапшота-в-промпте на tools).
