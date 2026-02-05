import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema } from "@shared/schema";
import { uploadFile } from "./upload";
import multer from "multer";
import express from "express";

const storage = getStorage();

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check route
  app.get("/api/health", async (_req, res) => {
    const dbHealthy = await storage.healthCheck();
    res.json({ 
      status: "ok", 
      database: dbHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email и пароль обязательны" });
    }

    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }

      // Временная проверка - принимаем любой пароль для зарегистрированных пользователей
      // В реальном приложении здесь должна быть проверка хэша пароля
      
      // Сохраняем ID пользователя в сессии
      req.session.userId = user.id;
      
      res.status(200).json({
        message: "Успешный вход",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Ошибка аутентификации" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // Уничтожаем сессию
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Ошибка выхода" });
      }
      res.clearCookie('teamsync.sid');
      res.status(200).json({ message: "Выход выполнен успешно" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          return res.status(200).json({ 
            authenticated: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              phone: user.phone,
              position: user.position,
              department: user.department
            }
          });
        }
      } catch (error) {
        // Если пользователь не найден, уничтожаем сессию
        req.session.destroy(() => {});
      }
    }
    
    res.status(200).json({ 
      authenticated: false,
      message: "Пользователь не авторизован" 
    });
  });

  // User routes
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid user data", errors: parsed.error.errors });
      }
      
      const user = await storage.createUser(parsed.data);
      res.status(201).json(user);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        res.status(409).json({ message: "User already exists" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Site Settings Routes
  app.get("/api/settings/:key", async (req, res) => {
    const setting = await storage.getSiteSetting(req.params.key);
    res.json(setting || { key: req.params.key, value: "" });
  });

  app.post("/api/settings", async (req, res) => {
    const parsed = insertSiteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid settings data" });
    }
    const setting = await storage.setSiteSetting(parsed.data.key, parsed.data.value);
    res.json(setting);
  });

  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // User avatar upload route
  app.post("/api/users/:id/avatar", upload.single('avatar'), async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Проверяем, что файл был загружен
      if (!req.file) {
        return res.status(400).json({ message: "Файл не предоставлен" });
      }
      
      // Получаем текущего пользователя для проверки прав
      if (!req.session.userId || req.session.userId !== userId) {
        return res.status(403).json({ message: "Нет прав для изменения аватара" });
      }
      
      // Загружаем файл и получаем base64 строку
      const uploadResult = await uploadFile(
        req.file.buffer, 
        req.file.originalname, 
        req.file.mimetype
      );
      
      // Обновляем аватар в базе данных как base64 строку
      const updatedUser = await storage.updateUser(userId, { 
        avatar: uploadResult.url 
      });
      
      res.status(200).json({
        message: "Аватар успешно загружен",
        avatar: updatedUser.avatar
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ 
        message: "Ошибка загрузки аватара",
        error: error.message 
      });
    }
  });

  // Project routes
  app.get("/api/projects", async (_req, res) => {
    try {
      // This would typically require authentication
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      // This would typically require authentication and validation
      res.status(201).json({ message: "Project created" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  return httpServer;
}
