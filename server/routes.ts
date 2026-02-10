import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema } from "@shared/schema";

const storage = getStorage();

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

  // User password change
  app.post("/api/user/change-password", async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Необходимы текущий и новый пароли" });
    }

    // В реальном приложении здесь была бы проверка текущего пароля и хеширование нового
    // Сейчас просто имитируем успех
    res.json({ message: "Пароль успешно изменен" });
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
