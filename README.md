# m4portal

Полнофункциональное веб-приложение для управления проектами и командной работы. Ранее известное как TeamSync.

## 🚀 Быстрый старт

### Требования
- Node.js 20+
- PostgreSQL 14+
- Redis (опционально)

### Установка

```bash
# Клонировать репозиторий
git clone <repo>
cd m4portal

# Установить зависимости
npm install

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env (см. ниже)

# Применить миграции БД
npm run db:push

# Запуск в режиме разработки
npm run dev
```

### Переменные окружения

```env
# База данных
DATABASE_URL=postgresql://user:password@localhost:5432/m4portal

# Сессии (обязательно)
SESSION_SECRET=your-secret-key-here

# Redis (опционально, production)
REDIS_URL=redis://localhost:6379

# Яндекс Календарь (опционально)
YANDEX_CLIENT_ID=your-client-id
YANDEX_CLIENT_SECRET=your-client-secret
```

## 📂 Структура проекта

```
├── client/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/       # UI компоненты (shadcn/ui)
│   │   ├── pages/            # Страницы приложения
│   │   ├── hooks/            # React хуки
│   │   └── lib/              # Утилиты
│   └── ...
├── server/                    # Backend (Express.js)
│   ├── middleware/           # Middleware безопасности
│   ├── schemas/              # Zod схемы валидации
│   ├── utils/                # Утилиты
│   └── ...
├── shared/                    # Общий код
│   └── schema.ts             # Схемы Drizzle ORM
└── ...
```

## 🛠️ Команды

### Разработка
```bash
npm run dev              # Запуск сервера + клиента
npm run dev:client       # Только клиент (Vite)
npm run check            # Проверка TypeScript
```

### Сборка
```bash
npm run build            # Полная сборка (production)
npm run build:client     # Сборка клиента
npm run build:server     # Сборка сервера
npm start                # Запуск production версии
```

### База данных
```bash
npm run db:push          # Применить миграции
npm run db:init          # Инициализация БД
npm run db:test          # Тест подключения
npm run db:health        # Проверка здоровья БД
```

## 🔒 Безопасность

Проект включает современные меры безопасности:

### Аутентификация
- Passport.js с локальной стратегией
- Scrypt хеширование паролей (Node.js crypto)
- Сессии с Redis (production) / MemoryStore (dev)
- Rate limiting на login (5 попыток/15 мин)

### Защита от атак
- **CSRF**: `csrf-csrf` библиотека (double submit cookie)
- **IDOR**: Middleware проверки ownership
- **XSS**: Статическая санитизация через `xss` библиотеку
- **SQL Injection**: Drizzle ORM (параметризованные запросы)
- **Helmet**: Content Security Policy, Secure headers

### Валидация данных
- Zod-схемы для всех API эндпоинтов
- Интеграция с React Hook Form
- Автоматическая генерация типов

## 📚 Документация

| Файл | Описание |
|------|----------|
| `TECH_STACK.md` | Технологический стек и архитектура |
| `SECURITY.md` | Детальное описание мер безопасности |
| `MODULES.md` | Описание модулей и компонентов |
| `DESIGN.md` | Дизайн-система и UI компоненты |
| `DATABASE_SCHEMA.md` | Схема базы данных |
| `DEPLOYMENT.md` | Инструкции по деплою |

## 🔧 Дополнительные возможности

### Интеграции
- **Яндекс Календарь**: Синхронизация событий через OAuth 2.0
- **WebSocket**: Real-time чаты и уведомления через Socket.io
- **Video Calls**: WebRTC P2P звонки

### Gamification
- Система баллов за выполнение задач
- Магазин наград
- Уровни пользователей

### Файлы
- Загрузка файлов с проверкой MIME-типов (50MB лимит)
- Хранение в памяти (безопасно)

## 📋 API Endpoints

### Аутентификация
- `POST /api/register` - Регистрация
- `POST /api/login` - Вход (rate limited)
- `POST /api/logout` - Выход
- `GET /api/user` - Текущий пользователь

### CSRF
- `GET /api/csrf-token` - Получение CSRF токена

### Проекты
- `GET /api/projects` - Список проектов
- `POST /api/projects` - Создать проект
- `PATCH /api/projects/:id` - Обновить
- `DELETE /api/projects/:id` - Удалить

### Задачи
- `GET /api/tasks` - Список задач
- `POST /api/tasks` - Создать задачу
- `PATCH /api/tasks/:id` - Обновить
- `DELETE /api/tasks/:id` - Удалить

## 🎨 Технологии

### Frontend
- React 19 + TypeScript
- Vite 7 (сборка)
- Tailwind CSS 4 (стилизация)
- Shadcn/UI (компоненты)
- React Query (состояние)

### Backend
- Express.js 4
- TypeScript
- PostgreSQL + Drizzle ORM
- Redis (кэширование)
- Socket.io (WebSocket)

## 📄 Лицензия

MIT License

## 👥 Контрибьюторы

Создано в 2024-2026 году.
