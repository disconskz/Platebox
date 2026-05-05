
## Что делаем

Добавляем публичный лендинг, страницы входа и регистрации, и защищаем существующее приложение (калькулятор, аналитика, справочники) аутентификацией.

## 1. Бэкенд (Lovable Cloud)

- Включаем email/password аутентификацию, **auto-confirm = ON** (чтобы тестировать без почты).
- Миграция:
  - Таблица `profiles` (id = auth.users.id, full_name, company, created_at) + триггер `handle_new_user` для авто-создания профиля при регистрации.
  - Таблица `user_roles` + enum `app_role` ('admin','manager','user') + функция `has_role()` (SECURITY DEFINER) — по гайдлайну Lovable.
  - RLS на `profiles` и `user_roles`: пользователь видит/редактирует только своё.
  - Привязка существующих таблиц (`calculations`, `equipment` и т.д.) к `user_id` — добавляем колонку `user_id uuid` (nullable для старых записей), RLS: пользователь видит только свои калькуляции; справочники — read для всех authenticated, write для admin.

## 2. Новые страницы

```
/             → Landing (публичная, маркетинговая)
/auth         → Вход + Регистрация (табы)
/app          → текущий Index (дашборд/история, защищённый)
/calculator   → защищён
/analytics    → защищён
/references   → защищён
/calculation/:id, /quote → защищены
```

### Landing (`/`)
В стиле iOS 26 Liquid Glass, светлая:
- Hero: заголовок «Калькулятор полиграфии нового поколения», подзаголовок, CTA «Начать бесплатно» / «Войти», превью-картинка калькулятора (скриншот/мокап карточки).
- Секция «Как это работает» — 4 шага с иконками (Lucide):
  1. Заполните параметры заказа (формат, тираж, бумага)
  2. Получите расчёт спуска и себестоимости
  3. Сформируйте КП клиенту в один клик
  4. Анализируйте продажи и маржинальность
- Секция «Возможности» — сетка 6 glass-карточек: спуск полос, A1–A5, шаблоны, экспорт в Excel, аналитика, история правок.
- Секция «Для кого»: типографии, дизайн-студии, менеджеры по печати.
- FAQ (Accordion): «Нужна ли установка?», «Какие машины поддерживаются?», «Можно ли использовать на телефоне?» и т.д.
- Footer с CTA и ссылкой на /auth.

### Auth (`/auth`)
- Tabs: «Вход» / «Регистрация» (shadcn Tabs).
- Вход: email + password → `signInWithPassword`.
- Регистрация: full_name + company + email + password (+ подтверждение) → `signUp` с `emailRedirectTo: ${window.location.origin}/app` и `data: { full_name, company }`.
- Toast на успех/ошибку, loading state, базовая валидация (zod + react-hook-form, как в проекте).
- Glass-карточка по центру, фон с градиентом из `--gradient-subtle`.
- Если уже залогинен → redirect на `/app`.

## 3. Защита маршрутов

- Хук `useAuth()` в `src/hooks/useAuth.tsx`:
  - Подписка `supabase.auth.onAuthStateChange` **первой**, затем `getSession()` (по гайду Supabase, чтобы избежать race).
  - Возвращает `{ user, session, loading, signOut }`.
- Компонент `<ProtectedRoute>` в `src/components/ProtectedRoute.tsx` — если `!user && !loading` → `<Navigate to="/auth" replace />`.
- Оборачиваем приватные роуты в `App.tsx`.
- В шапке приватных страниц (Index/Calculator/…): кнопка «Выйти» + email пользователя.

## 4. Привязка данных к пользователю

- В `Calculator.tsx` при сохранении калькуляции пишем `user_id: session.user.id`.
- Запросы списка калькуляций фильтруются RLS автоматически.
- Index.tsx переименуем в `Dashboard.tsx` и переедет на `/app`; новый `Landing.tsx` встанет на `/`.

## Технические детали

- Файлы: `src/pages/Landing.tsx`, `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx`, `src/hooks/useAuth.tsx`. Index.tsx → переименовать содержимое логически (роут `/app`).
- Миграция SQL: `profiles`, `user_roles`, `app_role`, `has_role()`, `handle_new_user()` trigger, RLS-политики, `ALTER TABLE calculations ADD COLUMN user_id`.
- Auto-confirm включаем через `cloud--configure_auth`.
- НЕ добавляем Google OAuth (по умолчанию пропускаем — можно добавить позже, если нужно).
- Дизайн: используем существующие токены (`glass`, `glass-strong`, `--gradient-subtle`, rounded-2xl, кнопки pill).

## Что НЕ делаем

- Восстановление пароля, смена email, 2FA — за рамками.
- Google/Apple OAuth — по запросу позже.
- Роли admin/manager UI — таблица создаётся, но интерфейс назначения ролей не делаем (можно вручную через бэкенд).
