# Технический стек m4portal

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Клиент (Frontend)                     │
│  React 19 + TypeScript + Vite 7 + Tailwind CSS 4            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────┴────────────────────────────────────────┐
│                        Сервер (Backend)                      │
│  Express.js 4 + TypeScript + Socket.io 4                     │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  ┌──────────────┐        ┌──────────────┐
  │ PostgreSQL   │        │    Redis     │
  │ Drizzle ORM  │        │  (Кэширование)│
  └──────────────┘        └──────────────┘
```

---

## Frontend

### Основной фреймворк
- **React 19.2.0** - UI библиотека
- **TypeScript 5.6.3** - Типизация
- **Vite 7.1.9** - Сборка и разработка

### Стилизация
- **Tailwind CSS 4.1.14** - Утилитарный CSS
- **PostCSS 8.5.6** - Трансформация CSS
- **Shadcn/UI** - 57+ UI компонентов (Radix UI)

### Управление состоянием
- **React Query 5.60.5** - Серверное состояние
- **Persist client** - Кэш в localStorage

### Формы
- **React Hook Form 7.66.0** - Управление формами
- **Zod 3.25.76** - Валидация схем

### Drag & Drop
- **@hello-pangea/dnd 18.0.1** - Kanban доски

### Редактор
- **TipTap 3.14.0** - Текстовый редактор

### Иконки
- **Lucide React 0.545.0** - Иконки

### Маршрутизация
- **Wouter 3.3.5** - Роутер

### Уведомления
- **Sonner 2.0.7** - Toast уведомления

### Анимации
- **Framer Motion 12.23.24** - Анимации

---

## Backend

### Основной фреймворк
- **Express.js 4.21.2** - Веб-фреймворк
- **TypeScript 5.6.3** - Типизация
- **tsx 4.20.5** - Запуск TypeScript

### База данных
- **PostgreSQL** - Реляционная БД
- **Drizzle ORM 0.39.3** - TypeScript ORM
- **postgres 3.4.4** - Драйвер PostgreSQL

### Кэширование
- **ioredis 5.10.0** - Redis клиент
- **node-cache 5.1.2** - In-memory кэш

### Аутентификация
- **Passport.js 0.7.0** - Middleware
- **Express-session 1.18.1** - Сессии
- **bcryptjs 3.0.3** - Хеширование паролей
- **memorystore 1.6.7** - Хранение сессий в памяти

### Безопасность (новые пакеты)
- **csrf-csrf 4.0.3** - CSRF защита (double-submit cookie)
- **cookie-parser 1.4.7** - Парсинг cookies для CSRF
- **xss 1.0.15** - XSS санитизация
- **express-rate-limit 8.2.1** - Ограничение запросов
- **helmet 8.1.0** - HTTP заголовки безопасности
- **compression 1.8.1** - Gzip сжатие

### Валидация
- **Zod 3.25.76** - Схемы валидации
- **drizzle-zod 0.7.0** - Интеграция с Drizzle
- **zod-validation-error 3.4.0** - Сообщения об ошибках

### Real-time
- **Socket.io 4.8.3** - WebSocket
- **ws 8.18.0** - WebSocket fallback

### Файлы
- **Multer 2.0.2** - Загрузка файлов

### Интеграции
- **ioredis 5.10.0** - Redis
- **rrule 2.8.1** - Повторяющиеся события

---

## DevOps

### Инструменты сборки
- **esbuild 0.25.0** - Бандлер
- **cross-env 10.1.0** - Переменные окружения
- **vite-plugin-compression2** - Сжатие ассетов

### База данных
- **drizzle-kit 0.31.4** - Миграции

### Деплой
- **@vercel/node 3.0.0** - Vercel runtime

### Replit
- **@replit/vite-plugin-cartographer**
- **@replit/vite-plugin-dev-banner**

---

## Команды

### Разработка
```bash
npm run dev              # Сервер + клиент
npm run dev:client       # Только клиент
npm run check            # TypeScript проверка
```

### Сборка
```bash
npm run build            # Production сборка
npm run build:client     # Клиент
npm run build:server     # Сервер
npm start                # Запуск production
```

### База данных
```bash
npm run db:push          # Миграции
npm run db:health        # Проверка БД
npm run db:init          # Инициализация
```

---

## Зависимости

| Категория | Пакеты |
|-----------|--------|
| Frontend | React 19, Vite 7, Tailwind 4, Shadcn/UI, React Query |
| Backend | Express 4, TypeScript, Socket.io, Drizzle ORM |
| Безопасность | csrf-csrf, helmet, xss, rate-limit, cookie-parser |
| Валидация | Zod, drizzle-zod |
| Аутентификация | Passport, bcryptjs, express-session |
| Кэширование | Redis (ioredis), NodeCache |

---

**Версия документа:** 1.1
**Последнее обновление:** 2026
