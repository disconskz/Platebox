
# ИИ-ассистент со знанием справочника

Сейчас `ai-calc-chat` работает «вслепую»: возвращает `proposed_order` с категориями вроде `coated 130`, но не знает реальных материалов, цен, форматов и машин из БД. Сделаем так, чтобы он видел весь справочник и мог опираться на конкретные строки при ответе и при предварительной оценке стоимости.

## 1. Сервер: датасет знаний в edge function

В `supabase/functions/ai-calc-chat/index.ts` добавляем загрузку справочника при каждом запросе (с кешем в памяти на 5 минут на инстанс):

Таблицы, которые тянем (все READ-доступны для authenticated):
- `materials` — id, name, type, density, format_width, format_height, cost_per_sheet
- `purchase_formats`, `print_formats` — id, width, height, material_category, purchase_format_id
- `format_presets`, `envelope_formats` — name, width, height
- `press_machines` — id, name, machine_type, max_format_width/height, min/max_circulation, setup_sheets, setup_cost, cost_per_impression, product_types, priority
- `equipment` — id, name, type, max_format_width/height, cost_per_impression
- `lamination_prices` — film_type, size_range, cost_per_side
- `operations` — name, category, fixed_cost, variable_cost, unit, setup_sheets
- `calc_constants` — slug, value, unit (formCost, setupOwn, finishCutCost и т.д.)
- `product_circulation_rules` — product_type, min/max_circulation, preferred_machine_id
- `product_glossary` — slug, name, base_product_type, category, is_calculable
- `system_settings` (только `vat_percent` и подобные)

Загрузка идёт через `service_role` ключ (справочник публично-читаемый для auth, но из функции проще service_role + минимальный SELECT). Никаких пользовательских данных не читаем.

### Формат подачи модели

Собираем компактный JSON-«снимок» (только нужные поля, числа округляем, отбрасываем `created_at` и пр.) и оборачиваем в системный промт:

```
ДОСТУПНЫЕ ДАННЫЕ СПРАВОЧНИКА (используй ТОЛЬКО эти id и значения):
{
  "materials": [ {"id":"...","name":"Меловка 130 SRA3","type":"coated","density":130,"w":450,"h":320,"price":140}, ... ],
  "print_formats": [...],
  "press_machines": [...],
  "lamination": [...],
  "constants": { "form_cost": 1000, "setup_own": 150, ... },
  "vat_percent": 12
}
```

Если снимок > ~30 КБ — режем по релевантности: материалы только подходящей плотности/типа из распознанного запроса (двухпроходный вызов: первый — определить категорию материала и формат, второй — с отфильтрованным датасетом). Для старта делаем один проход с полным снимком (на типичной БД это 5-15 КБ).

## 2. Расширяем `proposed_order`

Добавляем поля, привязанные к реальным записям:
- `material_id` (uuid из `materials`) — основной выбор
- `material_alternatives` — массив из 2-3 альтернативных id (например, та же плотность другого поставщика)
- `print_format_id`, `press_machine_id` — если ИИ смог однозначно подобрать
- `estimated_cost` — `{ paper, print, postpress, total, sale_price, currency: "KZT" }`
- `cost_breakdown` — короткие строки для UI (не для подмены инженерного расчёта)

Промт обновляем: «Используй реальные id из снимка. Если нужного материала нет — честно скажи и предложи ближайший. Считай ориентировочную стоимость по формуле: листов = ceil(тираж / шт.на.листе) + приладка; бумага = листов × cost_per_sheet; печать = листов × cost_per_impression × красочность; добавь формы и финишные операции. Округляй до 100 ₸».

## 3. Карточка в чате

`ChatWindow.tsx` / `ProposedOrderCard`:
- Показываем выбранный материал по имени (резолвим id → name из загруженного при маунте справочника, чтобы не дублировать)
- Блок «Ориентировочная стоимость»: бумага / печать / постпечать / итого с НДС и «продажная при наценке N%»
- Альтернативы материала — выпадашка «Заменить» (просто меняет id в `sessionStorage` перед открытием калькулятора)
- Кнопка «Открыть в калькуляторе» — пишет `material_id` в prefill, чтобы калькулятор сразу подставил его (в `Calculator.tsx` дополняем prefill-логику: если есть `material_id` — выбираем материал по id, иначе fallback на текущий поиск по категории+плотности)

## 4. Безопасность и лимиты

- Edge function продолжает требовать JWT (как сейчас)
- Снимок справочника одинаков для всех — никаких пользовательских данных, утечки нет
- Кеш в памяти 5 мин по ключу `"reference-snapshot-v1"` чтобы не дёргать БД на каждое сообщение
- Если LLM-ответ ссылается на несуществующий `material_id` — сервер валидирует и заменяет на `null` + добавляет в `notes`

## 5. Что НЕ делаем сейчас

- Не запускаем настоящий `calc/engine.ts` на сервере (Deno vs vite-only код, нужна отдельная итерация — оценка ИИ остаётся «ориентировочной», точная — в калькуляторе)
- Не даём ИИ доступ к чужим расчётам или клиентам
- Не делаем функцию-tool с вызовом БД (RAG-датасет в промте проще и предсказуемее, чем function calling для текущего объёма данных)
- Не трогаем существующий `ai-assist` (используется в калькуляторе)

## Технические детали

- Файлы: `supabase/functions/ai-calc-chat/index.ts` (расширяем), `src/components/ai-calc/ChatWindow.tsx` (карточка + резолв материала), `src/pages/Calculator.tsx` (prefill по `material_id`)
- JSON-схема ответа модели (`response_format: json_object`) расширяется новыми опциональными полями — миграции БД не нужны
- Тесты: добавляем unit для функции выбора материала по категории/плотности (на стороне сервера) и smoke-тест, что снимок справочника парсится без ошибок
