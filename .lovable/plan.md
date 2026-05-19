# ИИ-расчёты: чат-ассистент на /ai-calc

Пользователь пишет естественным языком («посчитай 1000 листовок А5 4+4 на мелованной 130»), ИИ распознаёт параметры, показывает карточку «Распознанный заказ» и кнопку «Открыть в калькуляторе» — никаких автосохранений в `calculations`.

## База данных (новая миграция)

Две таблицы со строгим RLS «только владелец»:

- `ai_threads` — id, user_id, title, created_at, updated_at
- `ai_messages` — id, thread_id, user_id, role (`user|assistant`), parts (jsonb — массив UIMessage parts), created_at

RLS: SELECT/INSERT/UPDATE/DELETE только при `auth.uid() = user_id`. На `ai_messages` дополнительно проверяем, что `thread_id` принадлежит этому же пользователю. Триггер `set_updated_at` на `ai_threads` для актуализации списка тредов.

## Бэкенд: edge function `ai-calc-chat`

Новая функция (не трогаем `ai-assist`, она используется в калькуляторе и FormulaBuilder). Стек: AI SDK через Lovable AI Gateway, модель `google/gemini-3-flash-preview`, стриминг через `toUIMessageStreamResponse`.

- Авторизация: тот же паттерн что в `ai-assist` (Bearer JWT, проверка через `auth.getClaims`)
- Rate-limit 10/мин на user_id
- Системный промт: «Ты — помощник типографии. Уточняй параметры (тип, тираж, формат, красочность, материал, постпечать). Когда данных хватает — вызови инструмент `propose_calculation` с заполненной схемой»
- Один tool `propose_calculation` с Zod-схемой ровно как у `parse-order` (product_type, circulation, format, color_front/back, material_category/density, постпечать, margin_percent, notes). `execute` просто возвращает аргументы — UI рендерит их как «карточку заказа».
- Сохранение: `toUIMessageStreamResponse({ originalMessages, onFinish })` пишет финальный assistant UIMessage в `ai_messages` (UUID PK генерит БД).

## Фронтенд

Маршруты:

- `/ai-calc` — главная страница: список тредов слева/сверху, пустое состояние с подсказкой и быстрыми примерами; кнопка «Новый разговор» создаёт тред и сразу делает `navigate('/ai-calc/:id')`.
- `/ai-calc/:threadId` — активный чат. Чат-компонент монтируется с `key={threadId}`, `useChat({ id: threadId, messages: initialMessages, transport: DefaultChatTransport('/functions/v1/ai-calc-chat') })`.

UI собираем из AI Elements (`bun x ai-elements@latest add conversation message prompt-input tool shimmer`):

- `Conversation` + `ConversationContent` + `ConversationScrollButton` — транскрипт
- `Message` / `MessageContent` / `MessageResponse` — сообщения с markdown
- `PromptInput` + `PromptInputTextarea` + `PromptInputFooter` + `PromptInputSubmit` (внутри футера, `justify-end`) — композер; автофокус на маунте, после отправки и после смены треда
- `Tool` / `ToolHeader` / `ToolContent` для `propose_calculation` — кастомный output: красивая карточка «Распознанный заказ» с двумя кнопками: «Открыть в калькуляторе» (передаёт параметры через `sessionStorage` + `navigate('/calculator')`) и «Уточнить» (просто продолжает диалог)
- `Shimmer` «Обрабатываю…» во время `status === 'submitted'`

В `Calculator.tsx` добавляем чтение `sessionStorage.getItem('ai-calc-prefill')` на маунте — если есть, применяем поля так же, как сейчас делает `AiOrderAssistant.onApply`, и чистим ключ.

Логотип/идентичность: маленькая собственная иконка (генерим через imagegen, не `Sparkles`) — для пустого состояния и хедера треда.

## Навигация

В сайдбаре/`MobileTabBar` добавляем пункт «ИИ-расчёт» (icon `MessageSquare` или сгенерённая иконка), ведёт на `/ai-calc`.

## Технические детали

- AI SDK + `@ai-sdk/openai-compatible` импортируются в edge function через `npm:` спецификаторы
- Транспорт: `DefaultChatTransport` указывает на `${VITE_SUPABASE_URL}/functions/v1/ai-calc-chat` с заголовком `Authorization: Bearer <access_token>` из текущей сессии (через кастомный `fetch`)
- Все ошибки гейтвея (429, 402, validation) проходят через уже существующий `logDataIssue` и показываются toast’ом
- Тесты: добавляем 2–3 интеграционных vitest-теста — anon не может читать `ai_threads`/`ai_messages`; авторизованный видит только свои; вызов `ai-calc-chat` без токена возвращает 401
- Никаких изменений в `ai-assist`, `calculations`, существующих RLS или ролях

## Что НЕ делаем в этой итерации

- Не сохраняем расчёт автоматически (по выбору пользователя)
- Не строим визарды/wizard-режим — только чат + карточка результата
- Не трогаем существующий `AiOrderAssistant` Sheet внутри калькулятора (он остаётся)
