## Задача

В справочнике «Константы» добавлена настройка `приладка форм при печати = 500` (формула «цена приладки × кол форм»), но в просчёте этой строки нет. Нужно добавить её отдельной строкой в раздел «Печать».

## Что сделать

1. **`src/pages/Calculator.tsx`** — при загрузке справочников дополнительно прочитать значение системной настройки с ключом `приладка форм при печати` из таблицы `system_settings` (рядом с уже загружаемым `vat_percent`). Сохранить в state `formSetupCostPerForm`.

2. Добавить новый `useMemo` `formSetupItems`, который возвращает `SpecItem[]` с единственной строкой:
   - `stage: "print"`
   - `name: "Приладка форм при печати"`
   - `quantity: forms` (из `baseResult.forms`)
   - `unit: "форма"`
   - `unitPrice: formSetupCostPerForm`
   - `total: forms × formSetupCostPerForm`

   Возвращать пустой массив, если `formSetupCostPerForm ≤ 0` или `forms ≤ 0`.

3. В `result` (useMemo на строке ~870) добавить `formSetupItems` в `allExtras`: `[...extraSpecItems, ...catalogOpsItems, ...formSetupItems]`. Зависимости `useMemo` обновить.

## Технические детали

- Использовать существующий паттерн `supabase.from("system_settings").select("value").eq("key", "приладка форм при печати").maybeSingle()`.
- Строка попадёт в раздел «Печать» в `SpecTable`, рядом с «Печать офсетная — приладка/тираж».
- Никаких миграций не требуется — константа уже в БД.
