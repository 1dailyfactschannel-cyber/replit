import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./postgres-storage";
import { type User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { promisify } from "util";

const PostgresSessionStore = connectPg(session);
const scrypt = promisify(crypto.scrypt);

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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "teamsync-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: true,
      errorLog: console.error,
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use((req, res, next) => {
    console.log(`[session] Request session ID: ${req.sessionID}`);
    next();
  });
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          console.log(`Login attempt for email: ${email}`);
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log(`Login failed: User with email ${email} not found`);
            return done(null, false, { message: "Неверный email или пароль" });
          }

          const isPasswordMatch = await comparePasswords(password, user.password);
          if (!isPasswordMatch) {
            console.log(`Login failed: Password mismatch for ${email}`);
            // Temporarily allow login if password is plain text (for existing users)
            if (password === user.password) {
              console.log(`Login: Plain text password match for ${email}. Re-hashing...`);
              const hashedPassword = await hashPassword(password);
              await storage.updateUser(user.id, { password: hashedPassword });
              return done(null, user);
            }
            return done(null, false, { message: "Неверный email или пароль" });
          }

          console.log(`Login successful for ${email}`);
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
      done(null, user);
    } catch (err) {
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

  app.post("/api/login", (req, res, next) => {
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
