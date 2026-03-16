import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./postgres-storage";
import { type User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { RedisStore } from "connect-redis";

const MemoryStore = createMemoryStore(session);
const scrypt = promisify(crypto.scrypt);

// Session store configuration
let sessionStore: session.Store;

// Configure session store based on environment
const isDev = process.env.NODE_ENV === 'development';

if (process.env.REDIS_URL) {
  // Production: Use Redis for session storage
  console.log('🔐 Using Redis for session storage');
  const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  
  redisClient.on('error', (err: Error) => {
    console.error('❌ Redis session store error:', err.message);
  });
  
  redisClient.on('connect', () => {
    console.log('✅ Redis session store connected');
  });
  
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  });
  
  sessionStore = redisStore;
} else {
  // Development: Use MemoryStore
  if (!isDev) {
    console.warn('⚠️  WARNING: Using MemoryStore for sessions in production is not recommended!');
    console.warn('⚠️  Please configure REDIS_URL for production environments.');
  }
  console.log('🔐 Using MemoryStore for session storage');
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // Clear expired sessions every 24h
  });
}

// Security: Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" }
});

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scrypt(supplied, salt, 64)) as Buffer;
    return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    return false;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  // Security: Require SESSION_SECRET environment variable
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required for security");
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true, // Security: Prevent client-side JavaScript access
      path: "/", // Security: Restrict cookie to application path
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          // Security: Don't log full email, just prefix for debugging
          const emailPrefix = email.substring(0, 3);
          console.log(`Login attempt for email starting with: ${emailPrefix}***`);
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log(`Login failed: User not found`);
            return done(null, false, { message: "Неверный email или пароль" });
          }

          const isPasswordMatch = await comparePasswords(password, user.password);
          if (!isPasswordMatch) {
            console.log(`Login failed: Password mismatch`);
            // Security: Remove plain text password fallback after migration
            return done(null, false, { message: "Неверный email или пароль" });
          }

          console.log(`Login successful for user: ${user.id}`);
          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`[auth] User with id ${id} not found during deserialization`);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error(`[auth] Error deserializing user ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, username } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        username: username || email.split("@")[0],
        firstName: "",
        lastName: "",
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", loginLimiter, (req, res, next) => {
    console.log("POST /api/login: Authentication started");
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
      if (err) {
        console.error("POST /api/login: Passport authenticate error:", err);
        return next(err);
      }
      if (!user) {
        console.log("POST /api/login: Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Ошибка входа" });
      }
      console.log("POST /api/login: Authentication successful, logging in user:", user.id);
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("POST /api/login: req.login error:", loginErr);
          return next(loginErr);
        }
        console.log("POST /api/login: User logged in successfully, sending response");
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
}
