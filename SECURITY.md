# Безопасность проекта m4portal

## Содержание

1. [Введение](#введение)
2. [Текущая защита](#текущая-защита)
3. [Выявленные угрозы](#выявленные-угрозы)
4. [Рекомендации](#рекомендации)
5. [Чеклист безопасности](#чеклист-безопасности)

---

## Введение

Документ описывает текущее состояние безопасности проекта m4portal, выявленные уязвимости и рекомендации по их устранению.

**Версия проекта:** 1.0  
**Дата анализа:** 2026

---

## Текущая защита

### Аутентификация

**Реализация:** Passport.js с локальной стратегией

```typescript
// server/auth.ts
passport.use(new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    const user = await storage.getUserByEmail(email);
    const isPasswordMatch = await comparePasswords(password, user.password);
    return done(null, user);
  }
));
```

**Защита:**
- Хеширование паролей через scrypt (современный алгоритм)
- Тайминг-безопасное сравнение хешей
- Rate limiting на /api/login (5 попыток за 15 минут)

---

### Управление сессиями

**Реализация:** express-session

```typescript
// server/auth.ts
const sessionSettings = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore, // Redis (production) / MemoryStore (development)
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};
```

**Защита:**
- HttpOnly cookies (недоступны через JavaScript)
- Secure flag в production
- SameSite атрибут
- Хранилище сессий: Redis (production) / MemoryStore (development)

---

### Rate Limiting

**Глобальный лимит:**

```typescript
// server/index.ts
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 2000, // production
  message: { message: "Слишком много запросов" }
});
```

**Лимит на вход:**

```typescript
// server/auth.ts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 попыток
  message: { message: "Too many login attempts" }
});
```

**Статистика:**
- Global: 2000 запросов за 15 минут (production)
- Login: 5 попыток за 15 минут
- Development: без ограничений

---

### CORS (Cross-Origin Resource Sharing)

```typescript
// server/index.ts
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3005', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
```

**Настройка:**
- Белый список origins через переменную ALLOWED_ORIGINS
- Поддержка credentials
- Ограниченный набор методов

---

### Helmet (HTTP заголовки безопасности)

```typescript
// server/index.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Защита:**
- Content Security Policy (CSP)
- Защита от XSS и инъекций
- WebSocket соединения разрешены

---

### Защита базы данных (SQL Injection)

**Реализация:** Drizzle ORM

```typescript
// server/postgres-storage.ts
async getUser(id: string): Promise<User | undefined> {
  const result = await this.db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id)) // Параметризованный запрос
    .limit(1);
  return result[0];
}
```

**Защита:**
- Все запросы через Drizzle ORM
- Параметризованные запросы
- Типизированные схемы

**Безопасные запросы:**

```typescript
// server/routes.ts
// Вместо:
const search = req.query.search;
db.query(`SELECT * FROM tasks WHERE title LIKE '%${search}%'`);

// Используется:
db.query().from(tasks).where(like(tasks.title, `%${search}%`));
```

---

### Загрузка файлов

```typescript
// server/routes.ts
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  // ...
];

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

**Защита:**
- Whitelist MIME-типов
- Ограничение размера (50MB)
- Хранение в памяти (не на диске)

---

### User-Aware кэширование

```typescript
// server/index.ts
const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.isAuthenticated() ? req.user?.id : 'anonymous';
    const key = `${req.originalUrl}:${userId}`;
    // Кэш изолирован по пользователю
  };
};
```

**Защита:**
- Кэш персонифицирован по userId
- Предотвращает утечку данных между пользователями

---

### Master Password для критических операций

```typescript
// server/routes.ts
app.delete("/api/projects/:id", async (req, res) => {
  const masterPasswordHash = await storage.getSiteSetting("master_password_hash");
  const isValid = await bcrypt.compare(masterPassword, masterPasswordHash.value);
  // Проверка перед удалением
});
```

**Защита:**
- Дополнительный уровень защиты для удаления проектов

---

## Выявленные угрозы

### 1. IDOR (Insecure Direct Object Reference)

**Описание:** Злоумышленник может получить доступ к чужим данным, изменив ID в URL.

**Статус:** Частично защищено

**Где реализовано:**

```typescript
// server/routes.ts
// Задачи - проверка ownership
if (task.assigneeId && task.assigneeId !== req.user.id) {
  // Создание истории только для своих задач
}

// События календаря
if (existingEvent.userId !== req.user!.id) {
  return res.status(403).json({ message: "Access denied" });
}

// Комнаты чата
if (room.createdBy !== req.user!.id) {
  return res.status(403).json({ message: "Only creator can..." });
}
```

**Где НЕ реализовано:**

| Endpoint | Проблема |
|----------|-----------|
| `GET /api/users/:id` | Можно получить любого пользователя |
| `GET /api/projects/:id` | Нет проверки доступа |
| `GET /api/boards/:id` | Нет проверки доступа |
| `GET /api/tasks/:id` | Любой может получить любую задачу |
| `PATCH /api/tasks/:id` | Можно изменить любую задачу |
| `GET /api/chat/messages/:id` | Нет проверки участника чата |

**Рекомендация:** Добавить middleware для проверки ownership на все endpoints с `:id`.

---

### 2. CSRF (Cross-Site Request Forgery)

**Описание:** Злоумышленник может выполнить действия от имени авторизованного пользователя.

**Статус:** Зависимость добавлена, но НЕ активирована

**В package.json:**

```json
{
  "csurf": "^1.11.0"
}
```

**Текущее состояние:** Не используется

**Рекомендация:** Активировать csurf:

```typescript
// server/index.ts
import csurf from 'csurf';

// После сессий
app.use(csurf());

app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});
```

**Примечание:** При использовании SameSite=strict cookies риск CSRF снижен, но не исключён полностью.

---

### 3. Отсутствие RBAC (Role-Based Access Control)

**Описание:** Нет проверки прав доступа на основе ролей.

**Статус:** Схема существует, но не используется

**Схема в БД:**

```typescript
// shared/schema.ts
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").notNull(),
  isSystem: boolean("is_system").default(false),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").references(() => users.id),
  roleId: uuid("role_id").references(() => roles.id),
});
```

**Проблемы:**

- Все эндпоинты проверяют только `req.isAuthenticated()`
- Нет проверки ролей (admin, manager, user)
- Нет middleware для проверки прав

**Пример проблемы:**

```typescript
// server/routes.ts
// Любой авторизованный пользователь может:
app.delete("/api/projects/:id", async (req, res) => {
  // Нет проверки, что user - owner проекта
  await storage.deleteProject(req.params.id);
});
```

**Рекомендация:** Добавить middleware:

```typescript
// server/middleware/roles.ts
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).send();
    const userRoles = getUserRoles(req.user.id);
    if (!roles.some(r => userRoles.includes(r))) {
      return res.status(403).send();
    }
    next();
  };
}

// Использование
app.delete("/api/projects/:id", requireRole('admin'), handler);
```

---

### 4. Валидация ввода

**Описание:** Не все данные валидируются перед сохранением в БД.

**Статус:** Частично реализовано

**Где используется Zod:**

```typescript
// server/routes.ts
const parsed = insertSiteSettingsSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json(parsed.error);
}

const parsed = insertLabelSchema.safeParse(req.body);
if (!parsed.success) return res.status(400).json(parsed.error);
```

**Где НЕ используется:**

| Endpoint | Проблема |
|----------|-----------|
| POST /api/register | Не валидируется email |
| POST /api/projects | Нет валидации полей |
| POST /api/tasks | Частично (только title) |
| PATCH /api/tasks/:id | Нет валидации полей |
| POST /api/chat/messages | Не валидируется content |

**Рекомендация:** Создать схемы Zod для всех эндпоинтов:

```typescript
// server/schemas/validations.ts
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

app.post("/api/projects", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }
});
```

---

### 5. XSS (Cross-Site Scripting)

**Описание:** Внедрение вредоносного JavaScript кода.

**Статус:** React защищает, сервер - нет

**Защита на стороне клиента:**

- React автоматически экранирует вывод
- Использование dangerouslySetInnerHTML требует явного указания

**Риски на стороне сервера:**

- Данные сохраняются без санитизации
- При изменении frontend могут возникнуть проблемы

**Рекомендация:** Добавить санитизацию:

```typescript
// server/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Использование
const cleanTitle = sanitizeInput(req.body.title);
```

---

### 6. Хранение OAuth токенов

**Описание:** Токены Яндекс Календаря хранятся в БД без шифрования.

**Статус:** Уязвимость

**Код:**

```typescript
// server/services/yandex-calendar.ts
await storage.createYandexCalendarIntegration({
  userId,
  accessToken: tokens.access_token, // plain text!
  refreshToken: tokens.refresh_token, // plain text!
  expiresAt: new Date(),
});
```

**Проблемы:**
- Токены доступны администраторам БД
- При утечке БД - компрометация интеграций
- Нет encryption at rest

**Рекомендация:** Шифровать токены:

```typescript
// server/utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [iv, encrypted] = text.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(iv, 'hex')
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

### 7. Sensitive Data в логах

**Описание:** Конфиденциальные данные могут попасть в логи.

**Статус:** Частично исправлено

**Было (удалено):**
- console.log с email пользователей
- console.log с данными запросов
- console.log с ответами БД

**Рекомендация:** Использовать структурированное логирование:

```typescript
// server/utils/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', '*.token'],
  },
});
```

---

### 8. Отсутствие HTTPS в development

**Описание:** Development сервер работает без HTTPS.

**Статус:** Ожидаемо для development

**Рекомендация:**
- Production всегда использовать HTTPS
- Использовать proxy (nginx, cloudflare)

---

## Рекомендации

### Приоритет 1 (Критично)

1. **Активировать CSRF защиту**
   - Установить csurf middleware
   - Добавить XSRF токен на клиент

2. **Добавить проверки IDOR**
   - Создать middleware для проверки ownership
   - Применить ко всем /:id endpoints

### Приоритет 2 (Высокий)

3. **Внедрить RBAC**
   - Создать middleware для проверки ролей
   - Добавить проверки прав для критических операций

4. **Шифровать OAuth токены**
   - Использовать AES-256 для токенов
   - Хранить ключ в переменных окружения

### Приоритет 3 (Средний)

5. **Унифицировать валидацию**
   - Создать Zod схемы для всех эндпоинтов
   - Добавить middleware для автоматической валидации

6. **Улучшить логирование**
   - Использовать структурированный логгер
   - redact sensitive data

---

## Чеклист безопасности

### Аутентификация

- [x] Хеширование паролей (scrypt/bcrypt)
- [x] HttpOnly cookies
- [x] Secure cookies в production
- [ ] CSRF токены
- [ ] 2FA/MFA

### Сессии

- [x] Redis хранилище (production)
- [x] MemoryStore (development)
- [x] Secure session config

### Rate Limiting

- [x] Global rate limiting
- [x] Login rate limiting

### API

- [ ] IDOR защита
- [x] SQL Injection защита (Drizzle)
- [ ] Валидация всех входных данных
- [ ] Ролевая проверка доступа

### Файлы

- [x] whitelist MIME-типов
- [x] Ограничение размера

### Headers

- [x] Helmet
- [x] CORS настройка

### Мониторинг

- [ ] Логирование аутентификации
- [ ] Логирование ошибок
- [ ] Алерты на подозрительную активность

---

## Заключение

Проект имеет базовый уровень безопасности:
- ✅ Аутентификация и сессии
- ✅ Защита от SQL Injection
- ✅ Rate Limiting
- ✅ Безопасные заголовки
- ⚠️ Требуется: CSRF, IDOR, RBAC, валидация

Рекомендуется реализовать рекомендации в порядке приоритета для повышения уровня безопасности.

---

**Дата создания:** 2026  
**Версия:** 1.0
