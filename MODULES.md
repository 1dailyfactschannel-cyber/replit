# Модули проекта m4portal

## Структура проекта

```
├── client/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/       # UI компоненты
│   │   ├── pages/            # Страницы
│   │   ├── hooks/            # React хуки
│   │   ├── lib/              # Утилиты
│   │   └── App.tsx           # Корневой компонент
├── server/                    # Backend (Express.js)
│   ├── middleware/           # Middleware безопасности
│   │   ├── csrf.ts           # CSRF protection
│   │   ├── ownership.ts      # IDOR protection
│   │   ├── permissions.ts    # RBAC middleware
│   ├── schemas/              # Zod схемы
│   │   ├── auth.schema.ts    # Аутентификация
│   │   ├── role.schema.ts    # Роли
│   │   ├── permission.schema.ts # Разрешения
│   ├── utils/                # Утилиты
│   │   ├── tokenEncryption.ts # Шифрование токенов
│   │   ├── sanitization.ts   # XSS санитизация
│   ├── index.ts              # Точка входа сервера
│   ├── auth.ts               # Аутентификация
│   ├── routes.ts             # API роуты
│   ├── postgres-storage.ts   # Работа с БД
│   ├── socket.ts             # WebSocket
│   └── vite.ts               # Vite интеграция
├── shared/                    # Общий код
│   └── schema.ts             # Схемы Drizzle ORM
└── ...
```

## Middleware безопасности (server/middleware/)

### csrf.ts - CSRF защита

**Назначение:** Защита от Cross-Site Request Forgery через double-submit cookie pattern.

**Библиотека:** `csrf-csrf@4.0.3`

**Функции:**
- `doubleCsrfProtection` - Middleware для защиты endpoints
- `getCsrfToken` - Генерация токена для клиента
- `invalidCsrfTokenError` - Обработка ошибок

**Защищенные endpoints:**
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- POST/PUT/DELETE /api/roles
- POST/DELETE /api/permissions

### ownership.ts - Проверка доступа

**Назначение:** Защита от Insecure Direct Object Reference (IDOR).

**Функции:**
- `requireOwnership` - Базовая проверка
- `requireProjectOwnership` - Проверка владельца проекта
- `requireTaskOwnership` - Проверка доступа к задаче
- `requireWorkspaceOwnership` - Проверка рабочего пространства
- `requireBoardOwnership` - Проверка доски

**Пример:**
```typescript
app.patch(
  "/api/projects/:id",
  requireProjectOwnership,
  async (req, res) => { /* ... */ }
);
```

### permissions.ts - RBAC

**Назначение:** Проверка ролей и разрешений.

**Функции:**
- `requireRole` - Проверка роли пользователя
- `requirePermission` - Проверка разрешения

## Schemas (server/schemas/)

### auth.schema.ts

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Неверный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50),
});
```

### role.schema.ts

```typescript
export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.string()),
  description: z.string().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  permissions: z.array(z.string()).optional(),
});
```

### permission.schema.ts

```typescript
export const createPermissionSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});
```

## Utils (server/utils/)

### tokenEncryption.ts

**Назначение:** Шифрование OAuth токенов через bcryptjs.

```typescript
import bcrypt from 'bcryptjs';

export async function encryptToken(token: string): Promise<string> {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(token, salt);
}

export async function compareToken(token: string, encrypted: string): Promise<boolean> {
  return bcrypt.compareSync(token, encrypted);
}
```

### sanitization.ts

**Назначение:** Статическая санитизация от XSS через `xss` библиотеку.

```typescript
import { FilterXSS } from 'xss';

const xss = new FilterXSS({
  whiteList: { b: [], i: [], u: [], br: [], p: [] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
});

export function sanitizeInput(input: string): string {
  return xss.process(input);
}

export function sanitizeTaskDescription(input: string): string {
  return sanitizeInput(input);
}
```

## Серверные модули

### server/index.ts

**Назначение:** Точка входа сервера, инициализация Express приложения.

**Ключевые функции:**
- Настройка CORS с белым списком origins
- Helmet для HTTP заголовков безопасности
- Cookie parser для CSRF
- Rate limiting (global + login)
- User-aware кэширование
- Интеграция Vite для разработки

### server/auth.ts

**Назначение:** Аутентификация через Passport.js.

**Хеш паролей:** Scrypt (Node.js crypto)

**Сессии:** 
- Redis (production) / MemoryStore (dev)
- 30 дней таймаут

### server/postgres-storage.ts

**Назначение:** Работа с PostgreSQL через Drizzle ORM.

**Библиотеки:**
- `drizzle-orm@0.39.3`
- `postgres@3.4.4`

**Методы:**
- CRUD для всех сущностей
- Кэширование запросов
- Параметризованные запросы

### server/socket.ts

**Назначение:** Real-time коммуникации через Socket.io.

**Функции:**
- Чат (комнаты по conversationId)
- Уведомления (комнаты по userId)
- Typing indicators
- Video calls (WebRTC)

## Frontend модули

### client/src/lib/queryClient.ts

**Назначение:** Конфигурация React Query.

**Особенности:**
- Кэширование 5 минут
- Peristence в localStorage (24 часа)
- Offline-first режим

### client/src/components/ui/

**Компоненты shadcn/ui:**
- Button, Input, Card, Dialog, Select, и др.
- 57+ UI компонентов на базе Radix UI

## Технологии

| Категория | Технологии |
|-----------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Shadcn/UI |
| Backend | Express.js 4, TypeScript, Socket.io |
| База данных | PostgreSQL, Drizzle ORM 0.39.3 |
| Кэширование | Redis, NodeCache |
| Безопасность | csrf-csrf, helmet, rate-limit |
| Валидация | Zod, drizzle-zod |
| Аутентификация | Passport.js, bcryptjs |

## Команды npm

```bash
# Разработка
npm run dev           # Сервер + клиент
npm run dev:client    # Только клиент

# Сборка
npm run build         # Production сборка
npm start             # Запуск production

# База данных
npm run db:push       # Миграции
npm run db:health     # Проверка БД
```

**Версия документа:** 1.1
**Последнее обновление:** 2026
