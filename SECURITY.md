# Безопасность проекта m4portal

## Содержание

1. [Меры безопасности](#меры-безопасности)
2. [CSRF защита](#csrf-защита)
3. [IDOR защита](#idor-защита)
4. [Валидация данных](#валидация-данных)
5. [Санитизация](#санитизация)
6. [Аутентификация](#аутентификация)
7. [Чеклист](#чеклист)

---

## Меры безопасности

### HTTPS (Production)
- Использовать через Nginx или прокси
- Настройка в `server/index.ts`:
  ```typescript
  secure: process.env.NODE_ENV === "production"
  ```

### Secure Headers
- Helmet.js с Content Security Policy
- CORS с белым списком origins
- SameSite cookies

### Rate Limiting
- Глобальный: 2000 запросов/15 минут (production)
- Login: 5 попыток/15 минут

---

## CSRF защита

### Реализация

Используется библиотека `csrf-csrf` с double-submit cookie pattern.

**Файл:** `server/middleware/csrf.ts`

```typescript
import { doubleCsrf } from "csrf-csrf";

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => req.sessionID || "anonymous",
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    path: "/",
  },
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});
```

### Защищенные endpoints

CSRF применяется к следующим эндпоинтам:

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/logout` | Выход |
| POST | `/api/roles` | Создание роли |
| PUT | `/api/roles/:id` | Обновление роли |
| DELETE | `/api/roles/:id` | Удаление роли |
| POST | `/api/permissions` | Создание разрешения |
| DELETE | `/api/permissions/:id` | Удаление разрешения |

### Использование на клиенте

```typescript
// Получение токена
const response = await fetch('/api/csrf-token');
const { csrfToken } = await response.json();

// Отправка запроса
await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

---

## IDOR защита

### Middleware ownership

**Файл:** `server/middleware/ownership.ts`

Предоставляет middleware для проверки прав доступа:

- `requireOwnership` - Базовая проверка доступа
- `requireProjectOwnership` - Проверка владельца проекта
- `requireTaskOwnership` - Проверка доступа к задаче
- `requireWorkspaceOwnership` - Проверка владельца рабочего пространства
- `requireBoardOwnership` - Проверка владельца доски

### Использование

```typescript
import { requireProjectOwnership } from './middleware/ownership';

app.patch(
  "/api/projects/:id",
  requireProjectOwnership,
  async (req, res) => {
    // Только владелец может редактировать
    const project = await storage.updateProject(req.params.id, req.body);
    res.json(project);
  }
);
```

### Защищенные сущности

| Сущность | Middleware | Проверка |
|----------|------------|----------|
| Проекты | `requireProjectOwnership` | `ownerId` === `req.user.id` |
| Задачи | `requireTaskOwnership` | Проверка доступа к проекту |
| Доски | `requireBoardOwnership` | Проверка доступа к проекту |
| Рабочие пространства | `requireWorkspaceOwnership` | Проверка владельца |

---

## Валидация данных

### Zod схемы

**Файл:** `server/schemas/`

```typescript
// server/schemas/auth.schema.ts
export const loginSchema = z.object({
  email: z.string().email("Неверный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

// server/schemas/role.schema.ts
export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.string()),
});
```

### Использование

```typescript
import { loginSchema } from './schemas/auth.schema';

app.post("/api/auth/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: result.error.issues[0].message
    });
  }
  
  // result.data содержит валидированные данные
  const { email, password } = result.data;
});
```

---

## Санитизация (XSS)

### Реализация

**Файл:** `server/utils/sanitization.ts`

Используется библиотека `xss` для статической санитизации.

```typescript
import { FilterXSS } from 'xss';

const xss = new FilterXSS({
  whiteList: {
    b: [],
    i: [],
    u: [],
    br: [],
    p: [],
  },
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

### Применение

Санитизация применяется к:

- `task.description` - Описания задач
- `task.attachments` - Вложения (названия)
- `message.content` - Сообщения чата

```typescript
const cleanDescription = sanitizeTaskDescription(req.body.description);
```

---

## Шифрование токенов

### Реализация

**Файл:** `server/utils/tokenEncryption.ts`

OAuth токены хранятся с использованием bcryptjs:

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

---

## Аутентификация

### Scrypt хеширование паролей

**Файл:** `server/auth.ts`

```typescript
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scrypt(supplied, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}
```

### Сессии

- HttpOnly cookies
- Secure flag в production
- SameSite: lax
- Redis хранилище (production) / MemoryStore (dev)

---

## Чеклист безопасности

### Аутентификация
- [x] Scrypt хеширование паролей
- [x] HttpOnly cookies
- [x] Secure cookies в production
- [x] CSRF защита
- [ ] 2FA/MFA

### API
- [x] CSRF защита (csrf-csrf)
- [x] IDOR защита (ownership middleware)
- [x] Валидация данных (Zod)
- [x] Sanitization (XSS)
- [x] Rate limiting
- [x] CORS

### Безопасность заголовков
- [x] Helmet.js
- [x] CSP (Content Security Policy)
- [x] worker-src для WebSocket

### База данных
- [x] Параметризованные запросы (Drizzle)
- [x] Шифрование OAuth токенов
- [ ] Резервное копирование

---

## Дополнительные рекомендации

### Производство
1. Всегда использовать HTTPS
2. Настроить CSP через Nginx
3. Внедрить логирование безопасности
4. Регулярное обновление зависимостей
5. Внедрить мониторинг

### Разработка
1. Не храните secrets в репозитории
2. Используйте `.env` файлы
3. Регулярно проверяйте зависимости на уязвимости

---

**Версия документа:** 1.1
**Последнее обновление:** 2026
