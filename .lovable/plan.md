## Цель

На странице `Новый расчёт` (`src/pages/Calculator.tsx`) при смене типа продукции (вручную, через шаблон или через «Применить шаблон») форма должна показывать только те блоки полей и чек-боксов, которые реально применимы к выбранному изделию. Лишние разделы (ламинация, тиснение, конгрев, переплётные операции и т.п.) — скрывать полностью, а их флаги — сбрасывать в `false`, чтобы они не попадали в расчёт и в сохранённый шаблон.

## Как сейчас

- В `Calculator.tsx` уже есть точечная фильтрация для многостраничных операций через множества `SIGNATURE_PRODUCT_TYPES`, `SPRING_PRODUCT_TYPES`, `THERMAL_PRODUCT_TYPES`, `ENDPAPER_PRODUCT_TYPES`, `STAPLING_PRODUCT_TYPES` (строки 275–434, использование на 5062, 6718, 6855, 6983, 7134, 7289, 7479…).
- Все остальные блоки (Высечка, Ламинация, Припрессовка плёнки, Нумерация, Тиснение, Конгрев, Переменная печать, Перфорация, Скотч, Окошко, Удаление облоя, Ригель, Скругление углов) рендерятся **всегда**, независимо от `productType`.
- `PRODUCT_PRESETS` (`src/lib/calc/presets.ts`) включает только подсказки и небольшой набор авто-флагов — нет полной модели «что доступно».

## Что делаю

### 1. Новый модуль `src/lib/calc/capabilities.ts`

Захардкоженная карта возможностей по `ProductType`:

```ts
export interface ProductCapabilities {
  // постпечать на листовой продукции
  diecut: boolean;
  lamination: boolean;
  lamPrepress: boolean;
  numbering: boolean;
  stamping: boolean;     // тиснение
  congrev: boolean;
  perforation: boolean;
  tape: boolean;
  windowCut: boolean;
  flashRemoval: boolean;
  rigel: boolean;
  fold: boolean;
  variablePrint: boolean; // нумерация/QR/штрихкод/персонализация
  // многостраничные/переплётные блоки (включают существующие множества)
  signature: boolean;
  spring: boolean;
  thermal: boolean;
  endpaper: boolean;
  stapling: boolean;
}

export const PRODUCT_CAPABILITIES: Record<ProductType, ProductCapabilities> = { … };
export const ALL_CAPS_OFF: ProductCapabilities = { … все false … };
```

Примеры профилей:
- `leaflet`, `flyer`, `blank`, `poster`: печать + резка + ламинация + перфорация + переменная печать. Без тиснения/конгрева/переплётных операций.
- `businesscard`: + ламинация, скругление углов (через extraOps), тиснение, конгрев. Без переплётных.
- `booklet`, `brochure`, `magazine`: + фальцовка, скрепка/КБС (`signature`, `stapling`, `thermal` по типу).
- `book`: signature + endpaper + thermal + stapling.
- `notepad`, `calendar_*`: spring + базовые.
- `sticker`, `label`: + diecut, flashRemoval, без тиснения/конгрева.
- `envelope`, `box`, `bag`, `folder`: diecut + biг, без переплётных.
- `selfcopy`: numbering + variablePrint, без ламинации/тиснения.
- Существующие `*_PRODUCT_TYPES` Set'ы переписываются как `Object.entries(PRODUCT_CAPABILITIES).filter(([,c]) => c.signature).map(([k]) => k)` — единый источник правды.

### 2. Правки в `src/pages/Calculator.tsx`

- Импорт `PRODUCT_CAPABILITIES, ALL_CAPS_OFF`.
- `const caps = PRODUCT_CAPABILITIES[productType] ?? ALL_CAPS_OFF;` (через `useMemo`).
- Заменить хардкод-множества `SIGNATURE_PRODUCT_TYPES.has(productType)` → `caps.signature` (и аналогично для spring/thermal/endpaper/stapling) — поведение не меняется, источник один.
- Обернуть в `caps.*` JSX-блоки, которые сейчас всегда рендерятся:
  - Высечка (около стр. 5660)
  - Тиснение (стр. 6277)
  - Конгрев (стр. 6386)
  - Ламинация и Припрессовка (стр. 6485 и блок выше)
  - Нумерация / Переменная печать
  - Перфорация / Скотч / Окошко / Удаление облоя / Ригель / Фальцовка
- Добавить `useEffect` на смену `productType`: для каждого выключенного `caps.*` принудительно сбросить соответствующие `setHas*` в `false` (и связанные override-поля), чтобы старые значения из шаблона не оставались в расчёте.
- В `computeResult` (зависимости и в самом вызове `runCalculation`) подменить `hasFold/hasLamination/...` на `caps.fold && hasFold`, `caps.lamination && hasLamination` и т.д., чтобы движок гарантированно не получал недоступные операции (страховка).
- Расширить футер блока «Что недоступно для этого вида продукции» (стр. 9898–9902) под полный список из `caps`.
- В предложениях операций (`extraOps`/`PRODUCT_PRESETS.suggestedOps`) пропускать те, что не разрешены `caps`.

### 3. Применение шаблона

Логика `searchParams.get("from")` уже вызывает `setProductType(...)` (стр. 1990) и затем подставляет значения. После шага 2 это автоматически:
- покажет только релевантные блоки для нового типа;
- сбросит `has*`-флаги по операциям, которые тип не поддерживает.

Дополнительно в обработчике загрузки шаблона перед `setHasLamination(...)` и т.п. (стр. 4849, 4855, 4858, 4859) проверять `caps.*` и не включать недоступные.

### 4. База знаний

`src/pages/Knowledge.tsx`, секция про калькулятор: одно предложение — «Форма автоматически скрывает поля и операции, которые не применяются к выбранному виду продукции».

## Что НЕ делаю

- Не трогаю специализированные калькуляторы (`BusinessCardCalculator`, `MagnetCalculator`, `NcrCalculator` …).
- Не меняю схему БД, RLS, маршруты, движок расчёта.
- Не трогаю `MultiSkuCalculator` и AI-чат.
- Не переношу правила в справочник (по выбору пользователя — хардкод в коде).

## Файлы

- созданный: `src/lib/calc/capabilities.ts`
- правка: `src/pages/Calculator.tsx` (импорт, замена множеств, обёртки `caps.*`, reset-useEffect, страховка в `runCalculation`, фильтр в applyTemplate-блоке)
- правка: `src/pages/Knowledge.tsx` (одно предложение)
