## Цель
В каждой карточке внутреннего блока (block #1, #2 …) внутри `InternalBlocksEditor` показывать формулы расчёта именно этого блока — с подставленными числами и значениями переменных. Применить ко всем шаблонным калькуляторам, где есть внутренние блоки (сейчас это Блокнот и Брошюра).

## Архитектура

### 1. Метка «к какому блоку относится строка спецификации»
- В `SpecLine` (`src/components/calc/multipage/CostByStageBlock.tsx`) добавить опциональное поле `blockId?: string`.
- Это же поле — в локальный тип `lines` внутри калькуляторов (Notepad/Brochure).

### 2. Помощник `pushFor(blockId)` в калькуляторах
В местах, где `push(...)` относится к конкретному блоку, использовать обёртку, которая всегда добавляет `blockId`:
```ts
const pushFor = (blockId: string) =>
  (stage, name, qty, unit, price, details?) =>
    out.push({ stage, name, qty, unit, price, total: qty * price, details, blockId });
```

### 3. Изменения в калькуляторах
**NotepadCalculator.tsx:**
- Первый блок (legacy-поля: «Бумага блока», «Формы блока», «Приладка блока», «Печать блока») оборачиваем как `pushFor(internalBlocks[0].id)`.
- Цикл `internalBlocks.slice(1).forEach(b => …)` — `pushFor(b.id)` для всех 4 строк (бумага, формы, приладка, печать).

**BrochureCalculator.tsx:**
- Аналогично: первый блок — `pushFor(internalBlocks[0].id)`. Доп. блоки из цикла на строке 607 — `pushFor(b.id)`.

Остальные `push(...)` (обложка, подложка, постпечатка, сборка и т.д.) не меняем — они не относятся к блоку.

### 4. Переиспользуемый компонент `OperationFormulaRow`
- Извлечь существующие `OperationRow` и `fmt/fmtMoney` из `CostByStageBlock.tsx` в отдельный файл `src/components/calc/multipage/OperationFormulaRow.tsx`. Экспортировать `OperationFormulaRow` и обёртку-список `<BlockFormulas lines={...} title?: string compact?: boolean />`.
- `CostByStageBlock.tsx` импортирует и использует тот же `OperationFormulaRow`, чтобы не было дубля кода.

### 5. Изменения в `InternalBlocksEditor.tsx`
- Добавить пропс `spec?: SpecLine[]` (опциональный, чтобы старые места не сломались).
- Внутри каждой карточки блока (после полей, перед «Дополнительными операциями») рендерить:
```tsx
{spec && (
  <BlockFormulas
    title="Формулы расчёта блока"
    lines={spec.filter((l) => l.blockId === b.id)}
  />
)}
```
- Если для блока нет ни одной строки — рендерим небольшую подсказку «Формулы появятся, когда блок начнёт считаться».
- Компонент `BlockFormulas` сворачивается/разворачивается (default = свёрнут, чтобы не загромождать форму ввода).

### 6. Передача `spec` в редактор
- `NotepadCalculator.tsx`, `BrochureCalculator.tsx`: `<InternalBlocksEditor blocks={internalBlocks} onChange={setInternalBlocks} spec={lines} />`.

## Что НЕ делаем
- Не добавляем формулы в другие секции (Обложка, Подложка, Постпечатка и т.д.). По итогам разговора решено ограничиться карточками внутренних блоков.
- Не показываем «альтернативные» формулы из справочника — только применённые сейчас.
- Не трогаем engine расчёта, схему БД, режимы (видимость формул определяется через `AdvancedOnly`/`TechOnly` внутри `OperationFormulaRow` — как и раньше).

## Файлы
1. `src/components/calc/multipage/CostByStageBlock.tsx` — `SpecLine.blockId?`, переход на общий `OperationFormulaRow`.
2. `src/components/calc/multipage/OperationFormulaRow.tsx` — новый файл с переиспользуемой строкой и компонентом-списком `BlockFormulas`.
3. `src/components/calc/multipage/InternalBlocksEditor.tsx` — пропс `spec`, рендер `BlockFormulas` в каждой карточке.
4. `src/pages/NotepadCalculator.tsx` — `pushFor(blockId)` для строк блоков, передача `spec` в редактор.
5. `src/pages/BrochureCalculator.tsx` — то же самое.

## UX
- По умолчанию список формул свёрнут (одна строка-аккордеон «Формулы расчёта блока · N строк · ₸ X»).
- В Расширенном режиме видны формулы кол-ва/цены, в режиме Технолог — переменные и ссылка «В справочник» (поведение уже реализовано в `OperationFormulaRow`).