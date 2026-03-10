# TeamSync - Технический стек

## Общая информация

TeamSync - это полнофункциональное веб-приложение для управления проектами и командной работы. Приложение построено по архитектуре Full-Stack с использованием современных технологий.

---

## Архитектура

### Монолитная Full-Stack архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Клиент (Frontend)                     │
│  React 19 + TypeScript + Vite + Tailwind CSS v4             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────┴────────────────────────────────────────┐
│                        Сервер (Backend)                      │
│  Express.js + TypeScript + Socket.io                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌─────────────────┐
│  PostgreSQL   │        │     Redis       │
│  (Drizzle ORM)│        │   (Кэширование) │
└───────────────┘        └─────────────────┘
```

---

## Frontend (Клиент)

### Основной фреймворк
- **React 19.2.0** - Библиотека для построения пользовательских интерфейсов
- **React DOM 19.2.0** - Рендеринг React компонентов в DOM
- **TypeScript 5.6.3** - Типизация кода

### Сборка и разработка
- **Vite 7.1.9** - Современный инструмент сборки
  - Быстрый HMR (Hot Module Replacement)
  - Оптимизация для production (code splitting, gzip сжатие)
  - Поддержка TypeScript из коробки
- **@vitejs/plugin-react** - Официальный плагин React для Vite

### Стилизация
- **Tailwind CSS v4.1.14** - Утилитарный CSS фреймворк
  - Новая версия с улучшенной производительностью
  - `@tailwindcss/postcss` и `@tailwindcss/vite` интеграции
- **PostCSS 8.5.6** - Трансформация CSS
- **Autoprefixer 10.4.21** - Добавление вендорных префиксов
- **tailwind-merge 3.3.1** - Умное объединение Tailwind классов
- **tailwindcss-animate 1.0.7** - Анимации для Tailwind
- **clsx 2.1.1** - Утилита для условных классов

### UI Компоненты (shadcn/ui)
Библиотека доступных и настраиваемых компонентов на базе Radix UI:

- **@radix-ui/*** - Набор примитивов доступных UI компонентов:
  - Dialog, Dropdown Menu, Popover, Tooltip
  - Select, Tabs, Checkbox, Radio Group
  - Accordion, Alert Dialog, Context Menu
  - Avatar, Hover Card, Navigation Menu
  - Progress, Scroll Area, Slider, Switch
  - Toggle, Toggle Group, Separator
  - И многие другие...

- **class-variance-authority 0.7.1** - Управление вариантами компонентов
- **cmdk 1.1.1** - Командная палитра
- **vaul 1.1.2** - Drawer компонент
- **input-otp 1.4.2** - OTP ввод

### Управление состоянием и данными
- **@tanstack/react-query 5.60.5** - Управление серверным состоянием
  - Кэширование данных
  - Автоматическая синхронизация
  - Оптимистичные обновления
- **@tanstack/query-sync-storage-persister** - Персистентность кэша
- **@tanstack/react-query-persist-client** - Восстановление состояния

### Формы и валидация
- **React Hook Form 7.66.0** - Управление формами
- **@hookform/resolvers 3.10.0** - Интеграция валидаторов
- **Zod 3.25.76** - Валидация схем
- **drizzle-zod 0.7.0** - Интеграция Zod с Drizzle
- **zod-validation-error 3.4.0** - Улучшенные сообщения об ошибках

### Drag & Drop
- **@hello-pangea/dnd 18.0.1** - Библиотека drag-and-drop
  - Поддержка списков и колонок
  - Адаптирована для React 18/19

### Редактор текста
- **TipTap** - Расширяемый редактор текста:
  - `@tiptap/react` - React интеграция
  - `@tiptap/starter-kit` - Базовые функции
  - `@tiptap/extension-*` - Расширения (link, placeholder, color, highlight, underline, text-align, text-style)

### Иконки и графика
- **Lucide React 0.545.0** - Иконки
- **Recharts 2.15.4** - Графики и диаграммы
- **embla-carousel-react 8.6.0** - Карусели
- **ogl 1.0.11** - WebGL графика (3D эффекты)

### Анимации
- **Framer Motion 12.23.24** - Анимации компонентов
- **tw-animate-css 1.4.0** - CSS анимации

### Даты и время
- **date-fns 3.6.0** - Работа с датами
- **react-day-picker 9.11.1** - Календарь
- **react-clock 6.0.0** - Часы
- **react-time-picker 8.0.2** - Выбор времени

### Маршрутизация
- **Wouter 3.3.5** - Легковесный роутер

### Уведомления
- **Sonner 2.0.7** - Toast-уведомления

### Темы
- **next-themes 0.4.6** - Управление темами (светлая/темная)

### Виртуализация
- **@tanstack/react-virtual 3.13.18** - Виртуализация списков
- **react-virtuoso 4.18.1** - Виртуальные списки
- **react-window 2.2.6** - Виртуализация больших списков

### Прочие клиентские библиотеки
- **simple-peer 9.11.1** - WebRTC P2P соединения
- **socket.io-client 4.8.3** - Клиент WebSocket
- **react-resizable-panels 2.1.9** - Изменяемые панели

---

## Backend (Сервер)

### Основной фреймворк
- **Express.js 4.21.2** - Веб-фреймворк для Node.js
- **TypeScript 5.6.3** - Типизация

### База данных
- **PostgreSQL** - Реляционная база данных
- **Drizzle ORM 0.39.3** - TypeScript ORM
  - Типобезопасные запросы
  - Миграции через drizzle-kit
  - Схемы в `shared/schema.ts`
- **postgres 3.4.4** - PostgreSQL драйвер (современный, быстрый)

### Кэширование
- **ioredis 5.9.2** - Redis клиент
- **node-cache 5.1.2** - In-memory кэш

### Аутентификация и авторизация
- **Passport.js 0.7.0** - Middleware для аутентификации
  - `passport-local` - Локальная стратегия
- **bcrypt 6.0.0** - Хеширование паролей
- **express-session 1.18.1** - Управление сессиями
- **memorystore 1.6.7** - Хранение сессий в памяти

### Безопасность
- **express-rate-limit 8.2.1** - Ограничение запросов
- **compression 1.8.1** - Gzip сжатие ответов
- **dotenv 16.4.5** - Переменные окружения

### Real-time коммуникации
- **Socket.io 4.8.3** - WebSocket библиотека
  - Двунаправленная коммуникация
  - Комнаты и namespaces
  - Поддержка fallback
- **ws 8.18.0** - WebSocket библиотека

### Валидация и типизация
- **Zod 3.25.76** - Валидация данных
- **drizzle-zod 0.7.0** - Интеграция с Drizzle

### Файлы и медиа
- **Multer 2.0.2** - Загрузка файлов

### Утилиты
- **date-fns 3.6.0** - Работа с датами
- **lucide-react** - Иконки (также используются на сервере для генерации)

---

## DevOps и инфраструктура

### Контейнеризация
- **Docker** - Контейнеризация приложения
- **Docker Compose** - Оркестрация сервисов
- **Dockerfile** - Multi-stage сборка:
  1. Установка зависимостей
  2. Сборка приложения
  3. Production образ

### Деплой
- **Vercel** - Платформа для деплоя
  - `vercel.json` - Конфигурация
  - `@vercel/node` - Runtime

### Инструменты сборки
- **tsx 4.20.5** - Запуск TypeScript без компиляции
- **esbuild 0.25.0** - Быстрый бандлер (используется Vite)
- **cross-env 10.1.0** - Переменные окружения кросс-платформенно
- **rollup-plugin-gzip 4.1.1** - Gzip сжатие ассетов

### Управление базой данных
- **drizzle-kit 0.31.4** - CLI для миграций
- Скрипты в `package.json`:
  - `db:push` - Применение изменений схемы
  - `db:test` - Тестирование подключения
  - `db:init` - Инициализация БД
  - И другие...

### Replit интеграции
- **@replit/vite-plugin-cartographer** - Карта зависимостей
- **@replit/vite-plugin-dev-banner** - Баннер разработки
- **@replit/vite-plugin-runtime-error-modal** - Модальные окна ошибок

---

## Структура проекта

```
E:\replit-main/
├── client/                      # Frontend код
│   ├── src/
│   │   ├── components/          # React компоненты
│   │   │   ├── ui/             # UI компоненты (shadcn/ui)
│   │   │   ├── layout/         # Компоненты разметки
│   │   │   ├── kanban/         # Канбан компоненты
│   │   │   ├── chat/           # Компоненты чата
│   │   │   └── call/           # Компоненты звонков
│   │   ├── pages/              # Страницы приложения
│   │   │   ├── dashboard.tsx   # Дашборд
│   │   │   ├── projects.tsx    # Проекты (Канбан)
│   │   │   ├── tasks.tsx       # Мои задачи
│   │   │   ├── management.tsx  # Управление
│   │   │   ├── chat.tsx        # Чат
│   │   │   ├── calendar.tsx    # Календарь
│   │   │   ├── team.tsx        # Команда
│   │   │   ├── reports.tsx     # Отчеты
│   │   │   ├── shop.tsx        # Магазин
│   │   │   ├── profile.tsx     # Профиль
│   │   │   ├── settings.tsx    # Настройки
│   │   │   └── ...
│   │   ├── hooks/              # React хуки
│   │   ├── lib/                # Утилиты и helpers
│   │   ├── App.tsx             # Корневой компонент
│   │   ├── main.tsx            # Точка входа
│   │   └── index.css           # Глобальные стили
│   └── ...
├── server/                      # Backend код
│   ├── index.ts                # Точка входа сервера
│   ├── routes.ts               # API роуты
│   ├── auth.ts                 # Аутентификация
│   ├── postgres-storage.ts     # Работа с БД
│   ├── redis.ts                # Redis клиент
│   ├── socket.ts               # Socket.io
│   ├── storage.ts              # Интерфейсы хранилища
│   ├── vite.ts                 # Vite интеграция
│   └── ...
├── shared/                      # Общий код
│   ├── schema.ts               # Схемы Drizzle ORM
│   └── ...
├── migrations/                  # Миграции БД
├── script/                      # Скрипты
├── uploads/                     # Загруженные файлы
├── package.json                 # Зависимости
├── tsconfig.json               # TypeScript конфиг
├── vite.config.ts              # Vite конфиг
├── drizzle.config.ts           # Drizzle конфиг
├── docker-compose.yml          # Docker Compose
├── Dockerfile                  # Docker образ
└── vercel.json                 # Vercel конфиг
```

---

## Скрипты (package.json)

### Разработка
- `npm run dev` - Запуск в режиме разработки
- `npm run dev:client` - Запуск только клиента
- `npm run check` - Проверка TypeScript

### Сборка
- `npm run build` - Полная сборка
- `npm run build:client` - Сборка клиента
- `npm run build:server` - Сборка сервера
- `npm run vercel-build` - Сборка для Vercel

### Production
- `npm start` - Запуск production версии

### База данных
- `npm run db:push` - Применить миграции
- `npm run db:test` - Тест подключения
- `npm run db:init` - Инициализация
- `npm run db:health` - Проверка здоровья
- И другие...

---

## Основные функции приложения

### Управление проектами
- Создание и редактирование проектов
- Назначение команд и участников
- Отслеживание прогресса

### Kanban доска
- Drag & drop задач между колонками
- Настраиваемые колонки
- Фильтрация и поиск

### Задачи
- Создание задач с описанием
- Назначение исполнителей
- Приоритеты и сроки
- Теги и метки
- Комментарии
- Отслеживание времени

### Календарь
- Просмотр задач по датам
- День, неделя, месяц виды

### Чат
- Личные и групповые чаты
- Поиск сообщений
- Упоминания
- WebSocket real-time

### Видеозвонки
- WebRTC P2P звонки
- Групповые звонки

### Команда
- Управление участниками
- Роли и разрешения
- Департаменты

### Отчеты
- Графики и статистика
- Прогресс проектов

### Магазин (Gamification)
- Баллы за выполнение задач
- Магазин товаров
- Система уровней

---

## Безопасность

- **Аутентификация** через Passport.js с bcrypt хешированием
- **Сессии** с использованием express-session
- **Rate Limiting** для защиты от DDoS и брутфорса
- **CORS** настройки для безопасности
- **XSS защита** через экранирование вывода
- **CSRF защита** через сессии
- **SQL инъекции** - защита через Drizzle ORM (параметризованные запросы)

---

## Производительность

### Frontend
- **Code Splitting** - разделение кода на чанки
- **Lazy Loading** - ленивая загрузка компонентов
- **React Query кэширование** - минимизация запросов
- **Virtualization** - виртуализация больших списков
- **Gzip сжатие** - уменьшение размера ассетов
- **Tree Shaking** - удаление неиспользуемого кода
- **Image optimization** - оптимизация изображений

### Backend
- **Redis кэширование** - кэширование частых запросов
- **Compression** - gzip сжатие ответов
- **Connection pooling** - пул соединений с БД
- **Rate limiting** - защита от перегрузки

---

## API Endpoints

### Аутентификация
- `POST /api/register` - Регистрация
- `POST /api/login` - Вход
- `POST /api/logout` - Выход
- `GET /api/user` - Текущий пользователь

### Проекты
- `GET /api/projects` - Список проектов
- `POST /api/projects` - Создать проект
- `PATCH /api/projects/:id` - Обновить проект
- `DELETE /api/projects/:id` - Удалить проект

### Задачи
- `GET /api/tasks` - Список задач
- `GET /api/tasks/my-tasks` - Мои задачи
- `POST /api/tasks` - Создать задачу
- `PATCH /api/tasks/:id` - Обновить задачу
- `DELETE /api/tasks/:id` - Удалить задачу

### Доски (Kanban)
- `GET /api/boards` - Список досок
- `GET /api/boards/:id/full` - Полная доска с колонками
- `POST /api/boards` - Создать доску
- `POST /api/columns` - Создать колонку
- `POST /api/columns/reorder` - Изменить порядок колонок

### Чат
- `GET /api/chat/conversations` - Список чатов
- `GET /api/chat/messages/:conversationId` - Сообщения
- `POST /api/chat/messages` - Отправить сообщение
- `POST /api/chat/search` - Поиск в чате

### Пользователи
- `GET /api/users` - Список пользователей
- `GET /api/users/search` - Поиск пользователей
- `PATCH /api/users/:id` - Обновить пользователя

### И другие...

---

## Модели данных (основные)

### Users (Пользователи)
- id, username, email, password
- firstName, lastName, avatar
- department, position, phone
- isActive, isOnline, lastSeen
- pointsBalance, level
- timestamps

### Projects (Проекты)
- id, name, description
- ownerId, workspaceId, departmentId
- status, priorityId
- startDate, endDate
- budget, color, isPublic
- timestamps

### Tasks (Задачи)
- id, title, description
- boardId, columnId
- assigneeId, reporterId
- status, priorityId, taskTypeId
- dueDate, startDate
- timeSpent, storyPoints
- tags, attachments
- timestamps

### Boards (Доски)
- id, name, description
- projectId, isTemplate
- timestamps

### BoardColumns (Колонки)
- id, boardId, name
- order, color
- timestamps

### Workspaces (Рабочие пространства)
- id, name, description
- ownerId, color
- timestamps

### Chat & Messages
- conversations, messages
- conversation_members
- message_reactions, message_edits

---

## Разработка

### Требования
- **Node.js 20+**
- **PostgreSQL 14+**
- **Redis 7+** (опционально)

### Переменные окружения
```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secret-key
NODE_ENV=development
REDIS_URL=redis://localhost:6379
PORT=3000
```

### Быстрый старт
```bash
# Установка зависимостей
npm install

# Настройка БД
npm run db:push

# Запуск разработки
npm run dev
```

---

## Лицензия

MIT License

---

## Создано

2024-2026 TeamSync Project

---

**Примечание**: Этот документ описывает технический стек проекта TeamSync на момент создания. Стек может обновляться по мере развития проекта.
