
# Полноценный чат с ИИ-ассистентом

Текущее состояние: страница `/ai-calc` со списком, отдельная `/ai-calc/:id` с чатом, `ChatWindow` ходит обычным `fetch`-POST в edge function (без стрима), action'ов на сообщениях нет, заголовок = первые 60 символов, удаление через `confirm()`, tool-calls невидимы.

Что делаем — большая переработка под чат-уровень ChatGPT.

## 1. Макет: единая страница с сайдбаром

- Делаем новый компонент `AiChatLayout` на базе shadcn `Sidebar` (`collapsible="icon"`).
- Маршруты остаются: `/ai-calc` (пустой стейт справа) и `/ai-calc/:threadId` (активный тред справа) — обе раскладки рисуются одним layout-компонентом, сайдбар не размонтируется при переключении треда.
- На мобильных (<768px): сайдбар прячется, открывается через `SidebarTrigger` в шапке.
- В шапке чата: название треда (inline-rename по клику), кнопки Pin / Archive / Delete, переключатель сайдбара.

## 2. Сайдбар тредов

Один новый компонент `AiThreadsSidebar`:

- Поиск по `title` + содержимому (фильтрация локально по уже загруженным; на бэке — `ilike` по `title`, плюс серверный поиск по `ai_messages.parts::text` через RPC при вводе ≥ 3 символов).
- Кнопка «Новый разговор» вверху.
- Группировка тредов: **Закреплённые** → **Сегодня** → **Вчера** → **Последние 7 дней** → **Раньше** (бакеты по `updated_at`).
- Каждая строка: иконка чата + название + относительное время. Hover показывает popover-меню (Pin / Rename / Archive / Delete).
- Активный тред подсвечивается `SidebarMenuButton isActive`.
- Архивные скрыты по умолчанию; внизу сайдбара кнопка «Архив (N)» открывает отдельный диалог со списком архивных.

## 3. Стриминг ответа по токенам

Edge function переписываем на SSE-стрим через AI SDK + Lovable AI Gateway (см. `ai-sdk-lovable-gateway`):

- `streamText({ model, messages, tools, stopWhen: stepCountIs(50), abortSignal: req.signal })` — текущая ручная tool-loop через `fetch`/JSON выбрасывается.
- Возврат: `result.toUIMessageStreamResponse({ originalMessages, onFinish })` — сервер сохраняет финальное assistant-сообщение сам.
- Клиент: переходим на AI SDK UI `useChat` + `DefaultChatTransport`, transport бьётся в `/functions/v1/ai-calc-chat` со своим `Authorization`.
- Сохраняем существующий контракт `proposed_order` + `draft` через AI SDK **data parts** (`writeData({ type: 'proposed_order', order })`, `writeData({ type: 'draft', draft })`). Клиент рендерит их через `message.parts`.
- Stop-кнопка по контракту `ai-sdk-abort-cancel`: `request.signal` → `streamText.abortSignal`; на клиенте — `useChat().stop` в `PromptInputSubmit`, на abort клиент дописывает «_Остановлено._» к последнему текстовому парту и сохраняет.

## 4. Видимые шаги агента (tool calls)

В UI каждое tool-обращение рендерим как блок внутри assistant-сообщения:

- Заголовок с иконкой по типу tool (`search_operations` → магнит, `calculate_order` → калькулятор, `list_materials` → лист и т.д.).
- Текущее состояние: «ИИ ищет материал…» / «Готово» / «Ошибка» (по `state` AI SDK tool part: `input-streaming` / `input-available` / `output-available` / `output-error`).
- `<details>`-блок (свернут по умолчанию) с JSON входа и выхода.
- Компонент `AiToolStep` (новый), мапит имя tool → label + icon из словаря.

## 5. Действия на сообщениях

В каждом сообщении — bottom-bar actions (видимы на hover, на тач — всегда):

- **User**: «Редактировать» — переключает сообщение в textarea, по сохранению удаляются все последующие сообщения и запускается заново (`setMessages` + `sendMessage` через `useChat`).
- **Assistant**: «Копировать» (text-only из parts), «Регенерировать» (удаляет последний assistant и повторяет последний user через `regenerate()` из `useChat`).
- Существующий блок `ProposedOrderCard` остаётся как кастомный part-renderer.

## 6. Композер

Оставляем AI Elements `PromptInput` + `PromptInputTextarea` + `PromptInputFooter` + `PromptInputSubmit`:

- Кнопка-сабмит уже превращается в Stop при `submitted`/`streaming` (поправим vendored `prompt-input.tsx` согласно `ai-sdk-abort-cancel` — убираем спиннер, всегда показываем квадрат с первого кадра).
- Счётчик символов (мягкий лимит 2000) в `PromptInputFooter` слева.
- Кнопка «Очистить» при наличии текста.
- Чипы-пресеты над композером показываем только при пустом треде (как сейчас).

## 7. Авто-заголовок

После первого assistant-ответа триггерим отдельный лёгкий вызов в gateway:

- `generateText({ model: "google/gemini-2.5-flash-lite", prompt: "Дай заголовок ≤ 40 символов для разговора: ..." })` на бэке — новая edge function `ai-thread-title` (или дополнительный action в текущей).
- Обновляем `ai_threads.title`, шлём в клиент по той же ответу или подписываемся realtime.

## 8. Pin / Archive в БД

Миграция к `ai_threads`:

- `is_pinned BOOLEAN NOT NULL DEFAULT false`
- `is_archived BOOLEAN NOT NULL DEFAULT false`
- индекс `idx_ai_threads_user_pinned_updated (user_id, is_pinned DESC, updated_at DESC) WHERE NOT is_archived`
- RLS уже корректные (по `user_id`) — не меняем.

## 9. Анимации (уровень 4 / 5)

Используем существующие `animate-fade-in`, `animate-scale-in` + добавим:

- Smooth slide для сайдбара (shadcn даёт из коробки).
- Stagger fade-in для каждого нового message-парта (через CSS-задержку или Motion).
- Pulse-dot у ассистента во время `submitted`.
- Shimmer-bar в композере во время стрима (уже есть `Shimmer`).
- Tool-step: scale-in при появлении, плавное раскрытие `<details>` через `accordion-down`.
- Список тредов: row-enter `fade-in`, исчезновение при удалении `fade-out`.

Motion library пока не добавляем — обходимся существующими keyframes из `tailwind.config.ts`.

## 10. Технические файлы

Новые:
- `src/components/ai-calc/AiChatLayout.tsx` — `SidebarProvider` + outlet.
- `src/components/ai-calc/AiThreadsSidebar.tsx` — сайдбар, поиск, группировка, контекст-меню.
- `src/components/ai-calc/MessageActions.tsx` — копировать/регенерировать/редактировать.
- `src/components/ai-calc/AiToolStep.tsx` — рендер tool-парта.
- `src/components/ai-calc/RenameThreadDialog.tsx`, `ArchiveDrawer.tsx`.
- `src/hooks/useAiThreads.ts` — загрузка/группировка/мутации тредов.
- `supabase/functions/ai-thread-title/index.ts` — генерация заголовка.

Изменяем:
- `src/App.tsx` — оборачиваем `/ai-calc/*` в `AiChatLayout`.
- `src/pages/AiCalc.tsx` → empty state справа (без своего header'а).
- `src/pages/AiCalcThread.tsx` → только загрузка сообщений + `ChatWindow`.
- `src/components/ai-calc/ChatWindow.tsx` → переписываем под `useChat` + `DefaultChatTransport`, добавляем actions, tool-step рендер, focus-mgmt.
- `src/components/ai-elements/prompt-input.tsx` → стоп-иконка с первого кадра (см. `ai-sdk-abort-cancel`).
- `supabase/functions/ai-calc-chat/index.ts` → `streamText` + `toUIMessageStreamResponse`, data parts для `proposed_order` и `draft`.

Зависимости: ставим `ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/react`.

## 11. Миграция БД

```sql
ALTER TABLE public.ai_threads
  ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX idx_ai_threads_user_pinned_updated
  ON public.ai_threads (user_id, is_pinned DESC, updated_at DESC)
  WHERE NOT is_archived;
```

## 12. Acceptance checks

- Сайдбар открыт по умолчанию, сворачивается в icon-режим, на мобильном — sheet.
- Поиск фильтрует список по тайтлу мгновенно; ввод ≥ 3 символов добивает серверным поиском по содержимому.
- Группы Сегодня/Вчера/7 дней/Раньше + Закреплённые сверху.
- Pin / Archive / Rename / Delete работают, состояние сохраняется в БД и видно после reload.
- Авто-заголовок появляется после 1-го ответа ассистента и обновляется в сайдбаре без перезагрузки.
- Ответ стримится по токенам, виден shimmer в шапке композера.
- Tool calls видны как блоки внутри ассистент-сообщения, JSON inside `<details>`.
- Стоп-кнопка с первого кадра submitted, прерывает стрим и сохраняет частичный ответ с маркером.
- На assistant-сообщении: копировать / регенерировать. На user-сообщении: редактировать с пересчётом.
- ProposedOrderCard и `draft` (память диалога) продолжают работать — рендерятся через AI SDK data parts.
- Анимации: появление сообщений, открытие сайдбара, hover на тредах, tool-step accordion — все плавные, без рывков.
- Никаких изменений в `Calculator` и других страницах.
