# m4portal - Подробное описание модулей

## Содержание

1. [Введение](#введение)
2. [Backend модули](#backend-модули)
3. [Frontend модули](#frontend-модули)
4. [Общий код](#общий-код)
5. [NPM зависимости](#npm-зависимости)
6. [Диаграммы](#диаграммы)
7. [Примеры API](#примеры-api)

---

## Введение

### Обзор проекта

**m4portal** (ранее TeamSync) - полнофункциональное веб-приложение для управления проектами и командной работы. Проект построен по монолитной архитектуре Full-Stack с использованием современных технологий.

### Технологический стек

| Уровень | Технология |
|---------|------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Backend | Express.js 4, TypeScript, Socket.io |
| База данных | PostgreSQL, Drizzle ORM |
| Кэширование | Redis, NodeCache |
| Аутентификация | Passport.js, express-session |
| Безопасность | Helmet, CORS, Rate Limiting, CSRF |

---

## Backend модули

### server/index.ts - Точка входа сервера

**Назначение:** Основной файл сервера, который инициализирует Express приложение, настраивает middleware безопасности, кэширование и запускает HTTP сервер.

**Ключевые функции:**
- Инициализация Express приложения
- Настройка CORS с поддержкой настраиваемых origins
- Helmet для HTTP заголовков безопасности
- Gzip сжатие ответов
- User-aware кэширование API ответов
- Rate limiting (global + login)
- Логирование запросов
- Интеграция Vite для разработки

**Пример использования:**

```typescript
// server/index.ts - Основные части

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";

// Конфигурация Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 2000, // 2000 запросов в production
  message: { message: "Слишком много запросов" }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 попыток входа
  message: { message: "Too many login attempts" }
});

// Настройка CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3005', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};

// Helmet для безопасности
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
}));

// User-aware кэширование
const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    
    const userId = req.isAuthenticated() ? req.user?.id : 'anonymous';
    const key = `${req.originalUrl}:${userId}`;
    
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < duration) {
      return res.json(cached.data);
    }
    
    // Перехват ответа для кэширования
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      apiCache.set(key, { data, timestamp: Date.now(), userId });
      return originalJson(data);
    };
    
    next();
  };
};

// Запуск сервера
const port = parseInt(process.env.PORT || "3005", 10);
httpServer.listen({ port, host: "0.0.0.0" }, () => {
  log(`serving on port ${port}`);
  
  // Запуск синхронизации Яндекс Календаря (каждые 10 минут)
  setInterval(async () => {
    const integrations = await storage.getActiveYandexIntegrations();
    for (const integration of integrations) {
      await yandexCalendarService.syncUserCalendar(integration.id);
    }
  }, 10 * 60 * 1000);
  
  // Запуск сервиса уведомлений
  yandexNotificationService.startPeriodicTasks();
});
```

---

### server/auth.ts - Аутентификация и сессии

**Назначение:** Настройка Passport.js для аутентификации, управление сессиями (Redis в production, MemoryStore в dev), хеширование паролей с использованием scrypt.

**Ключевые функции:**
- Passport.js с локальной стратегией
- Хеширование паролей через scrypt
- Redis сессии для production
- MemoryStore для разработки
- Rate limiting для защиты от брутфорса
- Сериализация/десериализация пользователей

**Пример использования:**

```typescript
// server/auth.ts

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

// Конфигурация хранилища сессий
let sessionStore: session.Store;

if (process.env.REDIS_URL) {
  // Production: Redis
  const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  });
  
  sessionStore = redisStore;
} else {
  // Development: MemoryStore
  const MemoryStore = createMemoryStore(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // 24 часа
  });
}

// Хеширование пароля
async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

// Проверка пароля
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scrypt(supplied, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

// Настройка Passport
export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Локальная стратегия
  passport.use(new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      const user = await storage.getUserByEmail(email);
      if (!user) return done(null, false, { message: "Неверный email или пароль" });
      
      const isPasswordMatch = await comparePasswords(password, user.password);
      if (!isPasswordMatch) return done(null, false);
      
      return done(null, user);
    }
  ));

  // Сериализация/десериализация
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const.getUser(id);
    done(null, user = await storage user);
  });

  // Эндпоинты
  app.post("/api/register", async (req, res) => {
    const { email, password, username } = req.body;
    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      username: username || email.split("@")[0],
    });
    req.login(user, () => res.json(user));
  });

  app.post("/api/login", loginLimiter, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => res.sendStatus(200));
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    res.json(req.user);
  });
}
```

---

### server/routes.ts - API эндпоинты

**Назначение:** Все API маршруты приложения: проекты, задачи, доски, колонки, пользователи, чаты, подзадачи и другие.

**Ключевые функции:**
- CRUD операции для всех сущностей
- Аутентификация через passport
- Кэширование ответов
- Real-time обновления через Socket.io
- Система баллов (gamification)
- Отслеживание времени
- Загрузка файлов

**Пример использования:**

```typescript
// server/routes.ts - Примеры эндпоинтов

// Получение всех проектов
app.get("/api/projects", async (req, res) => {
  const cacheKey = "projects:stats:all";
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const projects = await storage.getAllProjects();
  await setCache(cacheKey, projects, 300);
  res.json(projects);
});

// Создание проекта
app.post("/api/projects", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
  
  const projectData = { 
    name: req.body.name,
    priority: req.body.priority?.toLowerCase() || "medium",
    color: req.body.color || "#3b82f6",
    ownerId: req.user.id,
    status: "active",
  };
  
  const project = await storage.createProject(projectData);
  await delCache("projects:stats:all");
  res.status(201).json(project);
});

// Обновление задачи с системой баллов
app.patch("/api/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  const updateData = { ...req.body };
  
  const currentTask = await storage.getTask(taskId);
  const task = await storage.updateTask(taskId, updateData);
  
  // Отслеживание времени при смене исполнителя
  if (currentTask && updateData.assigneeId !== currentTask.assigneeId) {
    if (currentTask.assigneeId) {
      await storage.closeUserTimeTracking(taskId, currentTask.assigneeId);
    }
    if (updateData.assigneeId) {
      await storage.startUserTimeTracking(taskId, updateData.assigneeId, task.status);
    }
  }
  
  // Начисление баллов при смене статуса
  if (updateData.status && updateData.status !== currentTask?.status) {
    const setting = await storage.getPointsSetting(updateData.status);
    const points = setting?.pointsAmount || 1;
    
    await storage.createTransaction({
      userId: task.assigneeId,
      taskId,
      statusName: updateData.status,
      type: 'earned',
      amount: points,
    });
    
    await storage.updateUserPoints(task.assigneeId, points);
  }
  
  res.json(task);
});

// Получение списка пользователей
app.get("/api/users", async (req, res) => {
  const users = await storage.getAllUsers();
  res.json(users);
});

// Чат - отправка сообщения
app.post("/api/chat/messages", async (req, res) => {
  const { conversationId, content } = req.body;
  const userId = req.user.id;
  
  const message = await storage.createMessage({
    conversationId,
    senderId: userId,
    content,
  });
  
  // Отправка через Socket.io
  const io = getIO();
  io.to(`chat:${conversationId}`).emit("new-message", message);
  
  res.status(201).json(message);
});
```

---

### server/postgres-storage.ts - Работа с базой данных

**Назначение:** Реализация PostgresStorage - все операции с PostgreSQL через Drizzle ORM: пользователи, проекты, задачи, доски, чаты и другие сущности.

**Ключевые функции:**
- Drizzle ORM для типизированных запросов
- Кэширование запросов
- PostgreSQL драйвер (современный, быстрый)
- 40+ таблиц в схеме

**Пример использования:**

```typescript
// server/postgres-storage.ts

import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, or, desc, sql, inArray, isNull } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@shared/schema";

export class PostgresStorage {
  public db: ReturnType<typeof drizzle>;
  
  constructor() {
    const client = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    this.db = drizzle(client, { schema });
  }

  // Примеры методов
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return result[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await this.db
      .insert(schema.users)
      .values(data)
      .returning();
    return result[0];
  }

  async getProjectsWithStats(): Promise<any[]> {
    const projects = await this.db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        status: schema.projects.status,
      })
      .from(schema.projects)
      .leftJoin(schema.boards, eq(schema.projects.id, schema.boards.projectId))
      .groupBy(schema.projects.id);
    
    return projects;
  }

  async getTasksByBoard(boardId: string): Promise<Task[]> {
    return this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.boardId, boardId));
  }

  async getMessages(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
    return this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, chatId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit)
      .offset(offset);
  }
}

export const storage = new PostgresStorage();
```

---

### server/socket.ts - Real-time коммуникации

**Назначение:** Настройка Socket.io для real-time функций: чат, уведомления, онлайн статус.

**Ключевые функции:**
- WebSocket соединение с CORS защитой
- Комнаты для пользователей и чатов
- События набора текста (typing)
- Уведомления

**Пример использования:**

```typescript
// server/socket.ts

import { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
}

export function setupWebSockets(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3005'],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 10000,
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;
    
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Чат комнаты
    socket.on("join-chat", (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on("leave-chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // События набора текста
    socket.on("typing", (data: { chatId: string, userId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user-typing", data);
    });

    socket.on("stop-typing", (data: { chatId: string, userId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user-stopped-typing", data);
    });

    // Звонки
    socket.on("call-user", (data: { targetUserId: string, callerId: string }) => {
      io.to(`user:${data.targetUserId}`).emit("incoming-call", {
        callerId: data.callerId,
      });
    });

    socket.on("disconnect", () => {
      log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Использование в routes.ts для отправки сообщений
const io = getIO();
io.to(`chat:${conversationId}`).emit("new-message", message);
io.to(`user:${userId}`).emit("notification", { title, body });
```

---

### server/redis.ts - Кэширование

**Назначение:** Redis клиент для кэширования с fallback на NodeCache при недоступности Redis.

**Ключевые функции:**
- Redis с автоматическим failover
- NodeCache как fallback
- Функции: get, set, del, invalidatePattern

**Пример использования:**

```typescript
// server/redis.ts

import Redis from "ioredis";
import NodeCache from "node-cache";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let isRedisAvailable = false;

const localCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      isRedisAvailable = false;
      console.warn("Redis unavailable, using local cache");
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on("connect", () => isRedisAvailable = true);
redis.on("error", () => isRedisAvailable = false);

// Получить из кэша
export async function getCache<T>(key: string): Promise<T | null> {
  if (isRedisAvailable) {
    const data = await redis.get(key);
    if (data) return JSON.parse(data) as T;
  }
  return localCache.get<T>(key) || null;
}

// Установить в кэш
export async function setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
  if (isRedisAvailable) {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  }
  localCache.set(key, value, ttl);
}

// Удалить из кэша
export async function delCache(key: string): Promise<void> {
  if (isRedisAvailable) await redis.del(key);
  localCache.del(key);
}

// Инвалидировать по паттерну
export async function invalidatePattern(pattern: string): Promise<void> {
  if (isRedisAvailable) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  }
  
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keys = localCache.keys().filter(k => regex.test(k));
    localCache.del(keys);
  } else {
    localCache.del(pattern);
  }
}
```

---

### server/vite.ts - Интеграция Vite в режиме разработки

**Назначение:** Настройка Vite для горячей перезагрузки в режиме разработки.

**Пример:**

```typescript
// server/vite.ts

import { createServer as createViteServer } from "vite";

export async function setupVite(server: Server, app: Express) {
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    if (url.startsWith("/api")) return next();
    
    try {
      const template = await fs.promises.readFile(
        path.resolve(import.meta.dirname, "..", "client", "index.html"),
        "utf-8"
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).end(page);
    } catch (e) {
      next(e);
    }
  });
}
```

---

### server/services/yandex-calendar.ts - Интеграция с Яндекс Календарём

**Назначение:** OAuth аутентификация с Яндексом, синхронизация событий календаря.

**Ключевые функции:**
- OAuth 2.0 авторизация
- Получение списка календарей
- Создание/обновление/удаление событий
- Синхронизация по расписанию
- Поддержка повторяющихся событий (rrule)

**Пример:**

```typescript
// server/services/yandex-calendar.ts

export class YandexCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.YANDEX_CLIENT_ID || "";
    this.clientSecret = process.env.YANDEX_CLIENT_SECRET || "";
    this.redirectUri = `${process.env.APP_URL}/api/integrations/yandex-calendar/callback`;
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      state: userId,
      scope: "calendar:read",
    });
    return `https://oauth.yandex.ru/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    // Обмен кода на токен
    const tokenResponse = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    // Сохранение токенов
    await storage.createYandexCalendarIntegration({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });
  }

  async syncUserCalendar(integrationId: string): Promise<SyncResult> {
    const integration = await storage.getYandexCalendarIntegration(integrationId);
    if (!integration) return { added: 0, updated: 0, deleted: 0 };
    
    // Получение событий от Яндекса
    const events = await this.fetchEvents(integration.accessToken);
    
    // Синхронизация с локальной БД
    // ...
    
    return { added, updated, deleted };
  }
}

export const yandexCalendarService = new YandexCalendarService();
```

---

### server/services/yandex-notifications.ts - Уведомления

**Назначение:** Сервис для отправки уведомлений о предстоящих событиях из Яндекс Календаря.

**Пример:**

```typescript
// server/services/yandex-notifications.ts

export class YandexNotificationService {
  startPeriodicTasks() {
    // Проверка каждую минуту
    setInterval(async () => {
      await this.checkAndSendReminders();
    }, 60000);
  }

  async checkAndSendReminders() {
    const integrations = await storage.getActiveYandexIntegrations();
    
    for (const integration of integrations) {
      const upcomingEvents = await this.getUpcomingEvents(integration.id, 15);
      
      for (const event of upcomingEvents) {
        await this.sendReminder(integration.userId, event);
      }
    }
  }

  async sendReminder(userId: string, event: YandexCalendarEvent) {
    const user = await storage.getUser(userId);
    if (!user) return;

    // Отправка через Socket.io
    const io = getIO();
    io.to(`user:${userId}`).emit("calendar-reminder", {
      eventId: event.id,
      title: event.title,
      start: event.startDate,
    });

    // Email (заглушка)
    console.log(`Email would be sent to ${user.email}: ${event.title}`);
  }
}

export const yandexNotificationService = new YandexNotificationService();
```

---

## Frontend модули

### client/src/main.tsx - Точка входа

**Назначение:** Инициализация React приложения, настройка ThemeProvider, регистрация Service Worker.

```typescript
// client/src/main.tsx

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

// Service Worker для кэширования в production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/service-worker.js');
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider 
    attribute="class" 
    defaultTheme="dark" 
    enableSystem
    themes={["light", "dark", "purple", "emerald"]}
  >
    <App />
  </ThemeProvider>
);
```

---

### client/src/App.tsx - Главный компонент

**Назначение:** Роутинг, защищённые маршруты, lazy loading страниц.

```typescript
// client/src/App.tsx

import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// Eager load критических страниц
import Dashboard from "@/pages/dashboard";

// Lazy load тяжёлых страниц
const Projects = lazy(() => import("@/pages/projects"));
const Tasks = lazy(() => import("@/pages/tasks"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const Chat = lazy(() => import("@/pages/chat"));
const Call = lazy(() => import("@/pages/call"));
const Auth = lazy(() => import("@/pages/auth"));
const Team = lazy(() => import("@/pages/team"));

// Защищённый маршрут
function ProtectedRoute({ component: Component, path }: any) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  if (isLoading) return <PageLoader />;
  if (!user) return <Redirect href="/auth" />;

  return (
    <Route path={path}>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </Route>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/auth" component={Auth} />
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/projects" component={Projects} />
          <ProtectedRoute path="/tasks" component={Tasks} />
          <ProtectedRoute path="/calendar" component={CalendarPage} />
          <ProtectedRoute path="/chat" component={Chat} />
          <ProtectedRoute path="/call" component={Call} />
          <ProtectedRoute path="/team" component={Team} />
          <Route>404</Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

---

### client/src/lib/queryClient.ts - React Query конфигурация

**Назначение:** Настройка React Query для управления серверным состоянием, кэширование, персистентность.

```typescript
// client/src/lib/queryClient.ts

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      staleTime: 1000 * 60 * 5, // 5 минут
      gcTime: 1000 * 60 * 30, // 30 минут
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
      networkMode: 'offlineFirst',
    },
  },
});

// Персистентность в localStorage
if (typeof window !== 'undefined') {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'teamsync-react-query-cache',
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 часа
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith('/api/projects') || 
               key?.startsWith('/api/user');
      },
    },
  });
}

// API запрос
export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res;
}
```

---

### client/src/lib/utils.ts - Утилиты

**Назначение:** Утилита для объединения CSS классов.

```typescript
// client/src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### client/src/components/layout/Layout.tsx - Основной макет

**Назначение:** Боковая панель, навигация, темы, баланс баллов.

```typescript
// client/src/components/layout/Layout.tsx

import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@@shared/schema";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, Kanban, CheckSquare, Calendar, 
  MessageSquare, Users, Settings, LogOut, Coins 
} from "lucide-react";

export function Layout({ children, className }: { 
  children: React.ReactNode, 
  className?: string 
}) {
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <ScrollArea>
          {/* Логотип */}
          <div className="p-4 font-bold text-xl">m4portal</div>
          
          {/* Навигация */}
          <nav className="space-y-1 p-2">
            <a href="/dashboard" className="flex items-center gap-2 p-2 rounded">
              <LayoutDashboard className="w-4 h-4" />
              Дашборд
            </a>
            <a href="/projects" className="flex items-center gap-2 p-2 rounded">
              <Kanban className="w-4 h-4" />
              Проекты
            </a>
            <a href="/tasks" className="flex items-center gap-2 p-2 rounded">
              <CheckSquare className="w-4 h-4" />
              Задачи
            </a>
            {/* ... другие пункты */}
          </nav>
        </ScrollArea>

        {/* Баланс баллов */}
        {user?.pointsBalance !== undefined && (
          <div className="p-4 border-t flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <span>{user.pointsBalance ?? 0}</span>
          </div>
        )}
      </aside>

      {/* Контент */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

---

### client/src/pages/ - Страницы

Проект содержит 15 страниц:

| Страница | Файл | Назначение |
|----------|------|------------|
| Dashboard | dashboard.tsx | Главная страница, обзор |
| Projects | projects.tsx | Управление проектами |
| Tasks | tasks.tsx | Список задач |
| Kanban | kanban.tsx | Канбан доска |
| Calendar | calendar.tsx | Календарь |
| Chat | chat.tsx | Чат |
| Call | call.tsx | Видеозвонки |
| Team | team.tsx | Команда |
| Reports | reports.tsx | Отчёты |
| Shop | shop.tsx | Магазин |
| Profile | profile.tsx | Профиль |
| Settings | settings.tsx | Настройки |
| Auth | auth.tsx | Вход/Регистрация |
| Management | management.tsx | Управление |
| Not Found | not-found.tsx | 404 |

---

### client/src/components/ui/ - UI компоненты (shadcn/ui)

Проект содержит **57 UI компонентов** на базе Radix UI:

| Категория | Компоненты |
|-----------|------------|
| **Примитивы** | button, input, label, textarea, select, checkbox, radio-group, switch, slider, toggle |
| **Навигация** | tabs, navigation-menu, menubar, pagination, breadcrumbs |
| **Обратная связь** | toast, sonner, alert, alert-dialog, progress, skeleton, spinner |
| **Оверлеи** | dialog, popover, tooltip, drawer, sheet |
| **Данные** | table, accordion, collapsible, card |
| **Формы** | form, field, select |
| **Мультимедиа** | avatar, carousel |
| **Утилиты** | separator, badge, kbd, aspect-ratio, scroll-area |
| **Прочее** | command, input-otp |

**Пример использования:**

```typescript
// Пример страницы с UI компонентами

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ProjectsPage() {
  const { toast } = useToast();

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Проекты</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Поиск проектов..." />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>Создать проект</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Новый проект</DialogTitle>
              {/* Форма */}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### client/src/hooks/ - React хуки

| Хук | Файл | Назначение |
|-----|------|------------|
| useSocket | use-socket.tsx | WebSocket подключение |
| useMobile | use-mobile.tsx | Определение мобильного устройства |

**Пример useSocket:**

```typescript
// client/src/hooks/use-socket.tsx

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(userId: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io({
      query: { userId },
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected");
    });

    socketRef.current.on("new-message", (message) => {
      // Обработка нового сообщения
    });

    socketRef.current.on("notification", (data) => {
      // Уведомление
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId]);

  return socketRef.current;
}
```

---

## Общий код

### shared/schema.ts - Схемы базы данных

**Назначение:** Определение всех таблиц PostgreSQL через Drizzle ORM.

**Таблицы (40+):**

```typescript
// shared/schema.ts - Основные таблицы

// Пользователи
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  department: text("department"),
  position: text("position"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  pointsBalance: integer("points_balance").default(0),
  level: integer("level").default(0),
  // ...
});

// Проекты
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id),
  status: text("status").default("active"),
  color: text("color").default("#3b82f6"),
  // ...
});

// Задачи
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  boardId: uuid("board_id").references(() => boards.id),
  columnId: uuid("column_id").references(() => boardColumns.id),
  assigneeId: uuid("assignee_id").references(() => users.id),
  reporterId: uuid("reporter_id").references(() => users.id),
  status: text("status"),
  priority: text("priority"),
  storyPoints: integer("story_points"),
  dueDate: timestamp("due_date"),
  // ...
});

// Доски
export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  // ...
});

// Колонки
export const boardColumns = pgTable("board_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id").references(() => boards.id),
  name: text("name").notNull(),
  order: integer("order"),
  color: text("color"),
  // ...
});

// Чат
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type"), // 'direct' | 'group'
  name: text("name"),
  // ...
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  senderId: uuid("sender_id").references(() => users.id),
  content: text("content"),
  // ...
});

// Интеграции
export const yandexCalendarIntegrations = pgTable("yandex_calendar_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  // ...
});

// Баллы
export const pointSettings = pgTable("point_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  statusName: text("status_name").notNull(),
  pointsAmount: integer("points_amount").default(1),
  maxTimeInStatus: integer("max_time_in_status").default(0),
});

export const userPointsTransactions = pgTable("user_points_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  taskId: uuid("task_id").references(() => tasks.id),
  statusName: text("status_name"),
  type: text("type"), // 'earned' | 'reverted'
  amount: integer("amount").notNull(),
  description: text("description"),
});

// TypeScript типы
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Project = typeof projects.$inferSelect;
```

---

## NPM зависимости

### Frontend зависимости

| Зависимость | Версия | Назначение |
|------------|--------|------------|
| **React Core** | | |
| react | ^19.2.0 | UI библиотека |
| react-dom | ^19.2.0 | DOM рендеринг |
| **Сборка** | | |
| vite | ^7.1.9 | Инструмент сборки |
| @vitejs/plugin-react | ^5.0.4 | React плагин для Vite |
| typescript | 5.6.3 | Типизация |
| **Стили** | | |
| tailwindcss | ^4.1.14 | CSS фреймворк |
| @tailwindcss/vite | ^4.1.14 | Vite плагин |
| postcss | ^8.5.6 | CSS трансформация |
| **UI Components** | | |
| @radix-ui/* | ^1.x | Примитивы UI (30+) |
| class-variance-authority | ^0.7.1 | Варианты компонентов |
| clsx | ^2.1.1 | Условные классы |
| tailwind-merge | ^3.3.1 | Объединение классов |
| **Состояние** | | |
| @tanstack/react-query | ^5.60.5 | Управление данными |
| **Формы** | | |
| react-hook-form | ^7.66.0 | Управление формами |
| @hookform/resolvers | ^3.10.0 | Валидаторы |
| zod | ^3.25.76 | Валидация схем |
| **Редактор** | | |
| @tiptap/react | ^3.14.0 | Текстовый редактор |
| @tiptap/starter-kit | ^3.14.0 | Базовые функции |
| **Анимации** | | |
| framer-motion | ^12.23.24 | Анимации |
| **Даты** | | |
| date-fns | ^3.6.0 | Работа с датами |
| react-day-picker | ^9.11.1 | Выбор даты |
| rrule | ^2.8.1 | Правила повторения |
| **Иконки** | | |
| lucide-react | ^0.545.0 | Иконки |
| **Графики** | | |
| recharts | ^2.15.4 | Диаграммы |
| **Роутинг** | | |
| wouter | ^3.3.5 | Роутер |
| **Drag & Drop** | | |
| @hello-pangea/dnd | ^18.0.1 | Drag & Drop |

### Backend зависимости

| Зависимость | Версия | Назначение |
|------------|--------|------------|
| **Express** | | |
| express | ^4.21.2 | Веб фреймворк |
| cors | ^2.8.6 | CORS |
| helmet | ^8.1.0 | Безопасность |
| compression | ^1.8.1 | Сжатие |
| dotenv | ^16.4.5 | Переменные окружения |
| **База данных** | | |
| drizzle-orm | ^0.39.3 | ORM |
| postgres | ^3.4.4 | PostgreSQL драйвер |
| drizzle-kit | ^0.31.4 | Миграции |
| **Кэширование** | | |
| ioredis | ^5.10.0 | Redis клиент |
| node-cache | ^5.1.2 | In-memory кэш |
| **Аутентификация** | | |
| passport | ^0.7.0 | Аутентификация |
| passport-local | ^1.0.0 | Локальная стратегия |
| express-session | ^1.18.1 | Сессии |
| bcrypt | ^6.0.0 | Хеширование |
| csurf | ^1.11.0 | CSRF защита |
| connect-redis | ^9.0.0 | Redis сессии |
| cookie-parser | ^1.4.7 | Cookies |
| **Real-time** | | |
| socket.io | ^4.8.3 | WebSocket |
| ws | ^8.18.0 | WebSocket |
| **Безопасность** | | |
| express-rate-limit | ^8.2.1 | Rate limiting |
| **Файлы** | | |
| multer | ^2.0.2 | Загрузка файлов |
| **Валидация** | | |
| zod | ^3.25.76 | Валидация |

---

## Диаграммы

### Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   React     │  │  React Query │  │     Socket.io          │ │
│  │   App       │◄─┤   Cache      │  │     Client             │ │
│  └──────┬──────┘  └──────────────┘  └───────────┬─────────────┘ │
│         │                                        │               │
└─────────┼────────────────────────────────────────┼───────────────┘
          │ HTTP / WebSocket                        │
          ▼                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (Express.js)                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Middleware Stack                          │ │
│  │  Helmet → CORS → Rate Limit → Compression → Session → Auth  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   routes.ts  │  │  auth.ts     │  │    socket.ts         │  │
│  │  API Routes  │  │  Passport.js │  │   Socket.io          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │               │
│  ┌──────┴────────────────┴──────────────────────┴────────────┐ │
│  │                    postgres-storage.ts                      │ │
│  │                   Drizzle ORM                              │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────────┼───────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │      Redis       │  │    File System   │
│   (Пользователи, │  │  (Кэш, Сессии)  │  │   (uploads/)    │
│   Задачи, Чат)   │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Data Flow (Задачи)

```
User Action (Frontend)
        │
        ▼
┌───────────────────┐
│  React Component  │
│  (Kanban Board)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ React Query       │─── Mutation
│ (Optimistic Update)│
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ apiRequest()      │
│ POST /api/tasks   │
└─────────┬─────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER                                   │
│  1. routes.ts: app.patch("/api/tasks/:id")                 │
│  2. Auth check: req.isAuthenticated()                       │
│  3. postgres-storage.ts: storage.updateTask()               │
│     - Drizzle ORM query                                     │
│     - PostgreSQL                                             │
│  4. Points calculation                                       │
│  5. Redis cache invalidation                                │
│  6. Socket.io: io.to("chat:...").emit("task-updated")       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE                                 │
│  { id, title, status, assigneeId, ... }                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌───────────────────┐
│ React Query       │
│ Update Cache      │
│ (Invalidate/Set)  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  UI Update        │
│  (Kanban Board)   │
└───────────────────┘
```

### Аутентификация

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │     │   Express    │     │  PostgreSQL  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  1. POST /login   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │  2. SELECT *      │
       │                    │  FROM users        │
       │                    │  WHERE email = ?  │
       │                    │───────────────────>│
       │                    │<───────────────────│
       │                    │                    │
       │                    │  3. bcrypt.compare │
       │                    │     (scrypt)       │
       │                    │                    │
       │                    │  4. req.login()    │
       │                    │     (express-      │
       │                    │      session)      │
       │                    │                    │
       │                    │  5. Set-Cookie    │
       │                    │    (httpOnly)     │
       │<──────────────────│                    │
       │                    │                    │
       │  6. GET /api/user │
       │  (with Cookie)    │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │  7. Session Store  │
       │                    │  (Redis/Memory)    │
       │                    │                    │
       │                    │  8. SELECT *       │
       │                    │  FROM users       │
       │                    │  WHERE id = ?     │
       │                    │───────────────────>│
       │                    │<───────────────────│
       │<──────────────────│                    │
       │                    │                    │
```

---

## Примеры API

### Аутентификация

**Регистрация**
```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "username"
}

# Ответ (201)
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "firstName": "",
  "lastName": "",
  "pointsBalance": 0,
  "level": 0
}
```

**Вход**
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

# Ответ (200)
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "firstName": "Иван",
  "lastName": "Петров",
  "pointsBalance": 150,
  "level": 3
}
```

**Текущий пользователь**
```http
GET /api/user
Cookie: connect.sid=sess:xxx

# Ответ (200)
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "firstName": "Иван",
  "lastName": "Петров",
  "pointsBalance": 150,
  "level": 3
}

# Или (401)
{
  "message": "Не авторизован"
}
```

---

### Проекты

**Список проектов**
```http
GET /api/projects
Cookie: connect.sid=sess:xxx

# Ответ (200)
[
  {
    "id": "uuid",
    "name": "Веб-разработка",
    "description": "Основной проект",
    "status": "active",
    "color": "#3b82f6",
    "ownerId": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Создание проекта**
```http
POST /api/projects
Cookie: connect.sid=sess:xxx
Content-Type: application/json

{
  "name": "Новый проект",
  "color": "#ef4444",
  "priority": "high"
}

# Ответ (201)
{
  "id": "uuid",
  "name": "Новый проект",
  "color": "#ef4444",
  "priority": "high",
  "status": "active",
  "ownerId": "uuid"
}
```

---

### Задачи

**Получить задачи доски**
```http
GET /api/boards/board-uuid/full
Cookie: connect.sid=sess:xxx

# Ответ (200)
{
  "id": "board-uuid",
  "name": "Kanban",
  "projectId": "project-uuid",
  "columns": [
    {
      "id": "col-uuid",
      "name": "В планах",
      "order": 0,
      "color": "#6b7280",
      "tasks": [
        {
          "id": "task-uuid",
          "title": "Создать макет",
          "description": "Сделатьwireframe",
          "status": "В планах",
          "priority": "high",
          "assigneeId": "user-uuid",
          "storyPoints": 5,
          "tags": ["design"]
        }
      ]
    }
  ]
}
```

**Создать задачу**
```http
POST /api/tasks
Cookie: connect.sid=sess:xxx
Content-Type: application/json

{
  "title": "Новая задача",
  "description": "Описание задачи",
  "boardId": "board-uuid",
  "columnId": "col-uuid",
  "assigneeId": "user-uuid",
  "storyPoints": 3
}

# Ответ (201)
{
  "id": "uuid",
  "title": "Новая задача",
  "status": "В планах",
  "boardId": "board-uuid",
  "assigneeId": "user-uuid",
  "storyPoints": 3,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Обновить задачу**
```http
PATCH /api/tasks/task-uuid
Cookie: connect.sid=sess:xxx
Content-Type: application/json

{
  "status": "В работе",
  "assigneeId": "user-uuid"
}

# Ответ (200)
{
  "id": "task-uuid",
  "title": "Новая задача",
  "status": "В работе",
  "assigneeId": "user-uuid"
}
```

---

### Чат

**Список чатов**
```http
GET /api/chat/conversations
Cookie: connect.sid=sess:xxx

# Ответ (200)
[
  {
    "id": "conv-uuid",
    "type": "direct",
    "name": null,
    "participants": [
      { "id": "user-1", "username": "user1", "firstName": "Иван" },
      { "id": "user-2", "username": "user2", "firstName": "Петр" }
    ],
    "lastMessage": {
      "content": "Привет!",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }
]
```

**Сообщения**
```http
GET /api/chat/messages/conv-uuid?limit=50&offset=0
Cookie: connect.sid=sess:xxx

# Ответ (200)
[
  {
    "id": "msg-uuid",
    "conversationId": "conv-uuid",
    "senderId": "user-uuid",
    "content": "Привет!",
    "createdAt": "2024-01-01T12:00:00Z"
  }
]
```

**Отправить сообщение**
```http
POST /api/chat/messages
Cookie: connect.sid=sess:xxx
Content-Type: application/json

{
  "conversationId": "conv-uuid",
  "content": "Привет! Как дела?"
}

# Ответ (201)
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "user-uuid",
  "content": "Привет! Как дела?",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

---

### Пользователи

**Список пользователей**
```http
GET /api/users
Cookie: connect.sid=sess:xxx

# Ответ (200)
[
  {
    "id": "uuid",
    "username": "ivan",
    "email": "ivan@example.com",
    "firstName": "Иван",
    "lastName": "Петров",
    "avatar": null,
    "department": "Разработка",
    "position": "Frontend Developer",
    "isOnline": true,
    "pointsBalance": 150,
    "level": 3
  }
]
```

**Поиск пользователей**
```http
GET /api/users/search?q=иван
Cookie: connect.sid=sess:xxx

# Ответ (200)
[
  {
    "id": "uuid",
    "username": "ivan",
    "firstName": "Иван",
    "lastName": "Петров",
    "avatar": null
  }
]
```

---

### Socket.io события

**Подключение**
```javascript
const socket = io({
  query: { userId: "user-uuid" }
});

socket.on("connect", () => {
  console.log("Connected");
});
```

**Новое сообщение**
```javascript
socket.on("new-message", (message) => {
  console.log("New message:", message);
});
```

**Уведомление**
```javascript
socket.on("notification", (data) => {
  toast(data.title, { description: data.body });
});
```

**Напоминание календаря**
```javascript
socket.on("calendar-reminder", (event) => {
  toast(`Скоро: ${event.title}`, {
    description: new Date(event.start).toLocaleString()
  });
});
```

---

## Заключение

Документ содержит полное описание всех модулей проекта m4portal с примерами кода, диаграммами архитектуры и примерами API запросов.

Для получения дополнительной информации см.:
- [TECH_STACK.md](./TECH_STACK.md) - Технический стек
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Схема базы данных
- [.docs/YANDEX_CALENDAR_INTEGRATION.md](./.docs/YANDEX_CALENDAR_INTEGRATION.md) - Яндекс интеграция

---

**Дата создания:** 2026
**Версия:** 1.0
