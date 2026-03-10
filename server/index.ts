import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');

// Security: Rate limiting configuration
const isDev = process.env.NODE_ENV === 'development';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: isDev ? 10000 : 2000, // 10000 requests in dev (practically unlimited), 2000 in prod per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов. Пожалуйста, попробуйте позже." },
  skip: (req) => isDev, // Skip rate limiting completely in development
  // Skip successful requests for static assets
  skipSuccessfulRequests: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" }
});

export { globalLimiter, loginLimiter };

import "./globals.ts";
import { setupVite } from "./vite";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import { createServer } from "http";
import { yandexCalendarService } from "./services/yandex-calendar";
import { yandexNotificationService } from "./services/yandex-notifications";
import { getStorage } from "./postgres-storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Enable compression for all responses
import compression from 'compression';
app.use(compression());

// Cache storage (shared across all requests)
const apiCache = new Map<string, { data: any; timestamp: number }>();

// Cache middleware for API responses
const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const cached = apiCache.get(key);

    if (cached && Date.now() - cached.timestamp < duration) {
      res.json(cached.data);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      apiCache.set(key, { data, timestamp: Date.now() });
      return originalJson(data);
    };

    next();
  };
};

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Cache static assets for 1 year (only in production)
if (process.env.NODE_ENV === "production") {
  app.use('/assets', express.static(path.join(__dirname, '..', 'dist/public/assets'), {
    maxAge: '1y',
    immutable: true
  }));
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Don't log the full JSON response as it can be huge and cause performance issues
      // if (capturedJsonResponse) {
      //   const jsonStr = JSON.stringify(capturedJsonResponse);
      //   logLine += ` :: ${jsonStr.length > 200 ? jsonStr.slice(0, 200) + '...' : jsonStr}`;
      // }

      log(logLine);
    }
  });

  next();
});

(async () => {
  setupAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Express error handler caught:", err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  if (process.env.NODE_ENV === "development") {
    await setupVite(httpServer, app);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 3005
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || "3005", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start Yandex Calendar sync cron job (every 10 minutes)
      setInterval(async () => {
        try {
          const storage = getStorage();
          const integrations = await storage.getActiveYandexIntegrations();
          for (const integration of integrations) {
            try {
              await yandexCalendarService.syncUserCalendar(integration.id);
            } catch (err) {
              console.error(`Sync failed for ${integration.id}:`, err);
            }
          }
        } catch (error) {
          console.error("Error in Yandex calendar sync cron:", error);
        }
      }, 10 * 60 * 1000);
      
      // Start Yandex Calendar notification service
      yandexNotificationService.startPeriodicTasks();
      
      log("Yandex Calendar services started");
    },
  );
})();
