import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./postgres-storage";
import { type User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { RedisStore } from "connect-redis";
import { sendEmail, getWelcomeEmailTemplate } from "./services/email";
import { getIO } from "./socket";

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
    // Support bcrypt hashes (used by API-created users and password resets)
    if (stored.startsWith("$2")) {
      return await bcrypt.compare(supplied, stored);
    }
    // Legacy scrypt format: hash.salt
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
  
  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === "production";
  const isSecure = isProduction && !process.env.ALLOW_HTTP;
  
  console.log(`[AUTH] Environment: NODE_ENV=${process.env.NODE_ENV}, isSecure=${isSecure}`);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: isSecure, // Only secure in production (unless ALLOW_HTTP is set)
      sameSite: isProduction ? "lax" : false, // No sameSite restriction in dev
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

  // Session debugging middleware (AFTER session and passport)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[SESSION DEBUG] ${req.method} ${req.path}`);
      console.log(`[SESSION DEBUG] SessionID: ${req.sessionID}`);
      console.log(`[SESSION DEBUG] Authenticated: ${req.isAuthenticated()}`);
      if (req.user) {
        console.log(`[SESSION DEBUG] User ID: ${(req.user as any).id}`);
      }
    }
    next();
  });

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
      // Load user roles and permissions
      try {
        const roles = await storage.getUserRoles(id);
        const permissions = await storage.getUserPermissions(id);
        (user as any).roles = roles;
        (user as any).permissions = permissions;
        // Set role field for quick admin check
        const hasAdminRole = roles.some((r: any) => r.name === "Администратор");
        (user as any).role = hasAdminRole ? 'admin' : 'user';
      } catch (e) {
        // If roles/permissions fail, continue without them
        (user as any).roles = [];
        (user as any).permissions = [];
        (user as any).role = 'user';
      }
      done(null, user);
    } catch (err) {
      console.error(`[auth] Error deserializing user ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, username, inviteToken } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }

      let invitation = null;
      if (inviteToken) {
        invitation = await storage.getUserInvitationByToken(inviteToken);
        if (!invitation) {
          return res.status(400).json({ message: "Приглашение не найдено" });
        }
        if (invitation.status !== "pending" || new Date(invitation.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Приглашение недействительно или истекло" });
        }
        if (invitation.email.toLowerCase() !== email.toLowerCase()) {
          return res.status(400).json({ message: "Email не совпадает с приглашением" });
        }
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        username: username || email.split("@")[0],
        firstName: "",
        lastName: "",
      });

      // If registered via invitation, mark it as accepted and notify inviter
      if (invitation) {
        try {
          await storage.acceptUserInvitation(invitation.token);

          // Notify inviter
          if (invitation.invitedBy) {
            const notification = await storage.createNotification({
              userId: invitation.invitedBy,
              senderId: user.id,
              type: "system",
              title: "Приглашение принято",
              message: JSON.stringify({
                action: "invitation_accepted",
                invitedEmail: invitation.email,
                userId: user.id,
                username: user.username,
              }),
              link: "/management?section=team",
            });

            // Emit real-time notification
            try {
              const io = getIO();
              io.to(`user:${invitation.invitedBy}`).emit("new-notification", notification);
            } catch (socketErr) {
              // Socket not initialized, ignore
            }
          }
        } catch (inviteErr) {
          console.error("Error processing invitation acceptance:", inviteErr);
        }
      }

      // Send welcome email (non-blocking)
      try {
        const name = user.firstName || user.username || user.email.split("@")[0];
        const template = getWelcomeEmailTemplate(name, process.env.APP_URL);
        await sendEmail({
          to: user.email,
          subject: "Добро пожаловать в TeamSync!",
          html: template.html,
          text: template.text,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

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
    console.log("=== /api/user called ===");
    console.log("SessionID:", req.sessionID);
    console.log("Cookies:", req.headers.cookie);
    console.log("Session:", req.session);
    console.log("User:", req.user);
    console.log("isAuthenticated():", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log(">>> NOT AUTHENTICATED - returning 401");
      return res.status(401).json({ message: "Не авторизован" });
    }
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // Get current user's roles
  app.get("/api/user/roles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    try {
      const roles = await storage.getUserRoles((req.user as any).id);
      res.json(roles.map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color || "#6366f1",
        isSystem: r.isSystem,
        description: r.description,
      })));
    } catch (error: any) {
      console.error("GET /api/user/roles error:", error);
      res.status(500).json({ message: "Failed to fetch roles", error: error.message });
    }
  });
}
