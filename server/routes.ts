import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage, getReportOverview, getReportWorkspaces, getReportProjects, getReportBoards, getReportUsers } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema, insertNotificationSchema, insertLabelSchema, insertCustomStatusSchema, insertDepartmentSchema, priorities, taskTypes } from "@shared/schema";
import * as schema from "@shared/schema";
import { getStatusByColumnName } from "../shared/column-status-mapping";
import { setupWebSockets, getIO } from "./socket";
import { mediasoupServer } from "./mediasoup";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq, and, ne, or, isNull, inArray, desc, sql } from "drizzle-orm";
import { getCache, setCache, invalidatePattern, delCache } from "./redis";
import { format } from "date-fns";
import { formatUserName, formatUserBasic } from "./utils";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import yandexCalendarRoutes from "./routes/yandex-calendar";
import { sendTelegramMessage, handleTelegramUpdate, escapeHtml, setTelegramWebhook } from "./services/telegram";
import { sendEmail, testEmailConnection, getEmailConfig, getWelcomeEmailTemplate, getPasswordChangedTemplate } from "./services/email";

// Permission middleware
function requirePermission(...permissions: string[]) {
  return async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    try {
      const storage = getStorage();
      for (const perm of permissions) {
        const has = await storage.hasPermission(req.user!.id, perm);
        if (!has) {
          return res.status(403).json({ message: "Недостаточно прав. Требуется: " + perm });
        }
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Ошибка проверки прав" });
    }
  };
}

function requireAnyPermission(...permissions: string[]) {
  return async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    try {
      const storage = getStorage();
      const userPerms = await storage.getUserPermissions(req.user!.id);
      const hasAny = permissions.some(p => userPerms.includes(p));
      if (!hasAny) {
        return res.status(403).json({ message: "Недостаточно прав" });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Ошибка проверки прав" });
    }
  };
}

const storage = getStorage();
let io: SocketIOServer;

/**
 * Обеспечивает соответствие статуса задачи названию колонки
 * Если статус не соответствует - обновляет его и логирует изменение
 */
async function ensureTaskStatusMatchesColumn(task: any): Promise<any> {
  if (!task.columnId || !task.status) return task;
  
  try {
    const column = await storage.getColumn(task.columnId);
    if (column && column.name) {
      const expectedStatus = getStatusByColumnName(column.name);
      if (task.status !== expectedStatus) {
        console.warn(
          `[STATUS FIX] Task ${task.id}: status "${task.status}" doesn't match column "${column.name}". Expected: "${expectedStatus}". Updating...`
        );
        // Обновляем статус задачи в базе данных
        await storage.updateTask(task.id, { status: expectedStatus });
        return { ...task, status: expectedStatus };
      }
    }
  } catch (error) {
    console.error('[STATUS FIX] Error checking task status:', error);
  }
  
  return task;
}

/**
 * Обеспечивает соответствие статусов для списка задач
 */
async function ensureAllTasksStatusMatch(tasks: any[]): Promise<any[]> {
  const updatedTasks = await Promise.all(
    tasks.map(task => ensureTaskStatusMatchesColumn(task))
  );
  return updatedTasks;
}


// Rate limiters
const isDev = process.env.NODE_ENV === 'development';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов. Пожалуйста, попробуйте позже." },
  skip: () => isDev // Skip rate limiting completely in development
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" }
});

// Notification data interface
interface NotificationData {
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  taskTitle?: string;
  boardName?: string;
  chatName?: string;
  eventName?: string;
  commentPreview?: string;
  userName: string;
}

// Helper function to format notification message
function formatNotificationMessage(data: NotificationData): string {
  return JSON.stringify(data);
}

// Helper function to send notification
async function sendNotification(
  userId: string, 
  senderId: string | null, 
  type: string, 
  title: string, 
  data: NotificationData,
  link?: string
) {
  try {
    const message = formatNotificationMessage(data);
    await storage.createNotification({
      userId,
      senderId,
      type: type as "chat" | "task" | "calendar" | "call" | "system",
      title,
      message,
      link: link || null,
    });

    // Send Telegram notification for important types
    const importantTypes = ['chat', 'task', 'calendar', 'call'];
    const isImportant = importantTypes.includes(type) && (
      data.action === 'mentioned' ||
      data.action === 'status_changed' ||
      data.action === 'task_assigned' ||
      type === 'call'
    );

    if (isImportant) {
      try {
        const recipient = await storage.getUser(userId);
        if (recipient?.telegramId && recipient.telegramConnected) {
          const tgText = buildTelegramNotificationText(title, data, link);
          await sendTelegramMessage(recipient.telegramId, tgText);
        }
      } catch (tgError) {
        console.error("[Notification] Failed to send Telegram:", tgError);
      }
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

function buildTelegramNotificationText(title: string, data: NotificationData, link?: string): string {
  const parts: string[] = [];
  parts.push(`<b>${escapeHtml(title)}</b>`);

  if (data.userName) {
    const actionText = data.action === 'mentioned' ? 'упомянул(а) вас' :
                       data.action === 'status_changed' ? 'изменил(а) статус' :
                       data.action === 'task_assigned' ? 'назначил(а) вам задачу' :
                       'действие';
    parts.push(`${escapeHtml(data.userName)} ${actionText}`);
  }

  if (data.taskTitle) {
    parts.push(`📋 <b>${escapeHtml(data.taskTitle)}</b>`);
  }

  if (data.fieldName && data.newValue) {
    parts.push(`${escapeHtml(data.fieldName)}: ${escapeHtml(data.newValue)}`);
  }

  if (data.commentPreview) {
    parts.push(`💬 «${escapeHtml(data.commentPreview)}»`);
  }

  if (link) {
    parts.push(`<a href="${link}">Открыть в приложении</a>`);
  }

  return parts.join("\n\n");
}

// Security: Allowed file types for upload
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Security: Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

// Configure multer for memory storage (files stored in database)
const multerStorage = multer.memoryStorage();

// Security: File filter to validate types
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, PDF, documents, spreadsheets, text files'));
  }
};

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize mediasoup
  await mediasoupServer.init();
  
  io = setupWebSockets(httpServer);
  console.log("Registering API routes...");

  // TEST ROUTES - проверка доступности API (без авторизации для отладки)
  app.get("/api/test", (req, res) => {
    console.log("[TEST] API TEST ROUTE HIT!");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.put("/api/test/update/:id", async (req, res) => {
    console.log("[TEST] UPDATE TEST ROUTE HIT!");
    console.log("[TEST] ID:", req.params.id);
    console.log("[TEST] Body:", JSON.stringify(req.body));
    
    try {
      const { isRemote, ...updateData } = req.body;
      console.log("[TEST] isRemote:", isRemote);
      console.log("[TEST] updateData:", JSON.stringify(updateData));
      
      // Only test the database update part
      if (isRemote !== undefined) {
        console.log("[TEST] Updating is_remote column...");
        await storage.db.execute(sql`
          UPDATE users SET is_remote = ${Boolean(isRemote)} WHERE id = ${req.params.id}
        `);
        console.log("[TEST] Update successful!");
      }
      
      res.json({ status: "ok", message: "Test update completed" });
    } catch (error) {
      console.error("[TEST] Error:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Apply global rate limiter to all /api routes
  app.use("/api", globalLimiter);
  
  // Health check route
  app.get("/api/health", async (_req, res) => {
    const dbHealthy = await storage.healthCheck();
    res.json({ 
      status: "ok", 
      database: dbHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  });

  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    console.log("PATCH /api/user hit!");
    try {
      const user = req.user;
      
      // Whitelist allowed fields for security
      const allowedFields = ['firstName', 'lastName', 'avatar', 'department', 'position', 'phone', 'timezone', 'language', 'telegram', 'telegramId', 'telegramConnected', 'notes'];
      const updateData: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      if (updateData.telegram !== undefined) {
        console.log("Updating telegram field to:", updateData.telegram);
      }
      
      const updatedUser = await storage.updateUser(user.id, updateData);
      console.log("PATCH /api/user: User updated successfully", updatedUser.id);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("PATCH /api/user error:", error);
      res.status(500).json({ message: "Failed to update profile", error: error.message });
    }
  });

  // User settings endpoints
  app.get("/api/user/settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const settings = await storage.getAllUserSettings(req.user.id);
      res.json(settings);
    } catch (error) {
      console.error("GET /api/user/settings error:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.put("/api/user/settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ message: "Key is required" });
      }
      console.log(`[User Settings] Saving setting for user ${req.user.id}: key=${key}, value=`, value);
      const setting = await storage.setUserSetting(req.user.id, key, value);
      console.log(`[User Settings] Saved setting:`, setting);
      res.json(setting);
    } catch (error) {
      console.error("PUT /api/user/settings error:", error);
      res.status(500).json({ message: "Failed to update user setting" });
    }
  });

  app.get("/api/users", async (_req, res) => {
    console.log("=== USERS ROUTE HIT ===");
    try {
      const cacheKey = "users:all";
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const users = await storage.getAllUsers();
      await setCache(cacheKey, users, 300);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    try {
      const { firstName, lastName, email, phone, position, department, telegram, password, roleIds } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      if (!firstName) {
        return res.status(400).json({ message: "First name is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }

      // Determine role name for the role column (legacy)
      let roleName = "user"; // default
      if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        const role = await storage.getRoleById(roleIds[0]);
        if (role) {
          roleName = role.name;
        }
      }

      // Use provided password or generate random one
      const passwordToUse = password || Math.random().toString(36).slice(-10);
      const hashedPassword = await hashPassword(passwordToUse);

      // Create user
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        username: email.split("@")[0],
        firstName: firstName || "",
        lastName: lastName || "",
        phone: phone || "",
        position: position || "",
        department: department || "",
        telegram: telegram || "",
        isActive: true,
        role: roleName,
      });

      // Assign roles if provided (many-to-many)
      if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        await storage.setUserRoles(newUser.id, roleIds, req.user.id);
      }

      // Invalidate cache
      await delCache("users:all");

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        ...userWithoutPassword,
        generatedPassword: password ? null : passwordToUse
      });
    } catch (error: any) {
      console.error("POST /api/users error:", error);
      res.status(500).json({ message: "Failed to create user", error: error.message });
    }
  });

  // Get all roles (public endpoint)
  app.get("/api/roles", async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error: any) {
      console.error("GET /api/roles error:", error);
      res.status(500).json({ message: "Failed to fetch roles", error: error.message });
    }
  });

  // Get all permissions
  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error: any) {
      console.error("GET /api/permissions error:", error);
      res.status(500).json({ message: "Failed to fetch permissions", error: error.message });
    }
  });

  // Get user's permissions
  app.get("/api/users/me/permissions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user!.id;
      const permissions = await storage.getUserPermissions(userId);
      const roles = await storage.getUserRoles(userId);

      res.json({
        permissions,
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          color: (r as any).color || "#6366f1",
          isSystem: r.isSystem,
        })),
      });
    } catch (error: any) {
      console.error("GET /api/users/me/permissions error:", error);
      res.status(500).json({ message: "Failed to fetch permissions", error: error.message });
    }
  });

  // Create role
  app.post("/api/roles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { name, description, permissions, color } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Role name is required" });
      }

      const role = await storage.createRole({
        name,
        description: description || null,
        permissions: permissions || [],
        color: color || "#6366f1",
        isSystem: false,
      } as any);

      res.status(201).json(role);
    } catch (error: any) {
      console.error("POST /api/roles error:", error);
      if (error.code === "23505") {
        return res.status(409).json({ message: "Role with this name already exists" });
      }
      res.status(500).json({ message: "Failed to create role", error: error.message });
    }
  });

  // Update role
  app.put("/api/roles/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { name, description, permissions, color } = req.body;
      const existing = await storage.getRole(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Role not found" });
      }
      if (existing.isSystem && name && name !== existing.name) {
        return res.status(403).json({ message: "Cannot rename system role" });
      }

      const role = await storage.updateRole(req.params.id, {
        name,
        description,
        permissions,
        color,
      } as any);

      res.json(role);
    } catch (error: any) {
      console.error("PUT /api/roles/:id error:", error);
      res.status(500).json({ message: "Failed to update role", error: error.message });
    }
  });

  // Delete role
  app.delete("/api/roles/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const existing = await storage.getRole(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Role not found" });
      }
      if (existing.isSystem) {
        return res.status(403).json({ message: "Cannot delete system role" });
      }

      await storage.deleteRole(req.params.id);
      res.json({ message: "Role deleted successfully" });
    } catch (error: any) {
      console.error("DELETE /api/roles/:id error:", error);
      res.status(500).json({ message: "Failed to delete role", error: error.message });
    }
  });

  // Get user roles
  app.get("/api/users/:id/roles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const roles = await storage.getUserRoles(req.params.id);
      res.json(roles.map(r => ({
        id: r.id,
        name: r.name,
        color: (r as any).color || "#6366f1",
        isSystem: r.isSystem,
        description: r.description,
      })));
    } catch (error: any) {
      console.error("GET /api/users/:id/roles error:", error);
      res.status(500).json({ message: "Failed to fetch user roles", error: error.message });
    }
  });

  // Set user roles
  app.put("/api/users/:id/roles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { roleIds } = req.body;
      if (!Array.isArray(roleIds)) {
        return res.status(400).json({ message: "roleIds must be an array" });
      }

      await storage.setUserRoles(req.params.id, roleIds, req.user!.id);
      const roles = await storage.getUserRoles(req.params.id);
      res.json(roles.map(r => ({
        id: r.id,
        name: r.name,
        color: (r as any).color || "#6366f1",
        isSystem: r.isSystem,
        description: r.description,
      })));
    } catch (error: any) {
      console.error("PUT /api/users/:id/roles error:", error);
      res.status(500).json({ message: "Failed to update user roles", error: error.message });
    }
  });

  // Search users endpoint
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const allUsers = await storage.getAllUsers();
      const searchLower = query.toLowerCase();
      
      const filteredUsers = allUsers.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const username = user.username?.toLowerCase() || '';
        return fullName.includes(searchLower) || username.includes(searchLower);
      }).slice(0, 10); // Limit to 10 results

      res.json(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const cacheKey = `user:${userId}`;
      
      // Try cache first
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Cache for 5 minutes
      await setCache(cacheKey, user, 300);
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // REMOVE THIS ROUTE - Using /api/register from auth.ts instead
  // app.post("/api/users", async (req, res) => {
  //   try {
  //     const parsed = insertUserSchema.safeParse(req.body);
  //     if (!parsed.success) {
  //       return res.status(400).json({ message: "Invalid user data", errors: parsed.error.errors });
  //     }
  //     
  //     const user = await storage.createUser(parsed.data);
  //     res.status(201).json(user);
  //   } catch (error: any) {
  //     if (error.code === '23505') { // Unique violation
  //       return res.status(400).json({ message: "User already exists" });
  //     }
  //     res.status(500).json({ message: "Failed to create user" });
  //   }
  // });

  // File upload route (stores files in database)
  app.post("/api/upload", async (req, res) => {
    // Security: Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    // Use multer middleware manually
    upload.single("file")(req, res, async (err: any) => {
      try {
        if (err) {
          return res.status(400).json({ message: err.message || "Upload error" });
        }
        
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Convert file buffer to base64
        const base64Data = req.file.buffer.toString('base64');
        
        // Save file to database
        const attachment = await storage.createFileAttachment({
          filename: req.file.filename || `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          data: base64Data,
          uploadedBy: req.user?.id || null,
        });

        const fileUrl = `/api/files/${attachment.id}`;
        res.json({
          url: fileUrl,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          id: attachment.id
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Failed to upload file" });
      }
    });
  });

  // File retrieval route (serves files from database)
  app.get("/api/files/:id", async (req, res) => {
    // Security: Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    try {
      const attachment = await storage.getFileAttachment(req.params.id);
      
      if (!attachment) {
        return res.status(404).json({ message: "File not found" });
      }

      // Convert base64 back to buffer
      const fileBuffer = Buffer.from(attachment.data, 'base64');
      
      // Set appropriate headers
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
      
      res.send(fileBuffer);
    } catch (error) {
      console.error("File retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve file" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      console.log("[UPDATE USER] Request received:", req.params.id);
      console.log("[UPDATE USER] Body:", JSON.stringify(req.body));
      
      // Get current user to check if status is being changed
      const currentUser = await storage.getUser(req.params.id);
      
      const newStatus = req.body.status;
      const newStatusComment = req.body.statusComment;
      const { isRemote, isActive, ...updateData } = req.body;
      
      console.log("[UPDATE USER] isActive:", isActive);
      console.log("[UPDATE USER] updateData:", JSON.stringify(updateData));
      
      // Handle isRemote separately using raw SQL to avoid ORM issues
      if (isRemote !== undefined) {
        const isRemoteValue = Boolean(isRemote);
        await storage.db.execute(sql`
          UPDATE users SET is_remote = ${isRemoteValue} WHERE id = ${req.params.id}
        `);
      }
      
      // Handle isActive separately
      if (isActive !== undefined) {
        console.log("[UPDATE USER] Updating isActive via raw SQL:", isActive);
        await storage.db.execute(sql`
          UPDATE users SET is_active = ${isActive} WHERE id = ${req.params.id}
        `);
      }
      
      // Update user
      let user;
      if (Object.keys(updateData).length > 0) {
        user = await storage.updateUser(req.params.id, updateData);
      } else {
        user = await storage.getUser(req.params.id);
      }
      
      // If status is being changed, save to history
      if (currentUser && newStatus && newStatus !== currentUser.status) {
        await storage.createUserStatusHistory({
          userId: req.params.id,
          oldStatus: currentUser.status || null,
          newStatus: newStatus,
          comment: newStatusComment || null,
          changedBy: req.user!.id
        });

        // Evaluate accrual rules when status changes to online
        const onlineStatuses = ["online", "в сети", "active", "активен", "available", "доступен"];
        const normalizedStatus = newStatus.toLowerCase().trim();
        if (onlineStatuses.includes(normalizedStatus)) {
          try {
            const activeRules = await storage.getActiveAccrualRules();
            const arrivalRule = activeRules.find((r) => r.type === "arrival_on_time");
            if (arrivalRule && currentUser.workStartTime) {
              const now = new Date();
              const [startHour, startMinute] = currentUser.workStartTime.split(":").map(Number);
              const workStart = new Date(now);
              workStart.setHours(startHour, startMinute, 0, 0);

              const rulePoints = arrivalRule.pointsAmount ?? 0;
              const isOnTime = now <= workStart;
              const pointsToAward = isOnTime ? rulePoints : -rulePoints;

              if (pointsToAward !== 0) {
                await storage.createTransaction({
                  userId: req.params.id,
                  statusName: arrivalRule.name,
                  type: pointsToAward >= 0 ? "earned" : "spent",
                  amount: Math.abs(pointsToAward),
                  description: isOnTime
                    ? `Приход вовремя (${currentUser.workStartTime})`
                    : `Опоздание (${currentUser.workStartTime})`,
                  changedBy: req.user!.id,
                });

                // Update user balance
                await storage.db.execute(sql`
                  UPDATE users
                  SET points_balance = COALESCE(points_balance, 0) + ${pointsToAward},
                      total_points_earned = CASE WHEN ${pointsToAward} > 0 THEN COALESCE(total_points_earned, 0) + ${pointsToAward} ELSE total_points_earned END,
                      total_points_spent = CASE WHEN ${pointsToAward} < 0 THEN COALESCE(total_points_spent, 0) + ${Math.abs(pointsToAward)} ELSE total_points_spent END
                  WHERE id = ${req.params.id}
                `);
              }
            }
          } catch (ruleError) {
            console.error("[ACCRUAL RULES] Error evaluating arrival rule:", ruleError);
          }
        }
      }

      // Invalidate cache
      await delCache("users:all");
      res.json(user);
    } catch (error) {
      console.error("[UPDATE USER] Error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      // Check if user exists
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow self-deletion
      if (req.user.id === req.params.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      // Delete user - this will cascade to related records
      await storage.deleteUser(req.params.id);
      
      // Invalidate cache
      await delCache("users:all");
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Custom Statuses Routes
  app.get("/api/custom-statuses", async (_req, res) => {
    try {
      const statuses = await storage.getAllCustomStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching custom statuses:", error);
      res.status(500).json({ message: "Failed to fetch custom statuses" });
    }
  });

  app.get("/api/custom-statuses/:id", async (req, res) => {
    try {
      const status = await storage.getCustomStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ message: "Custom status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error fetching custom status:", error);
      res.status(500).json({ message: "Failed to fetch custom status" });
    }
  });

  app.post("/api/custom-statuses", requirePermission("statuses:create"), async (req, res) => {
    try {
      const parsed = insertCustomStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const status = await storage.createCustomStatus(parsed.data);
      res.json(status);
    } catch (error) {
      console.error("Error creating custom status:", error);
      res.status(500).json({ message: "Failed to create custom status" });
    }
  });

  app.put("/api/custom-statuses/:id", requirePermission("statuses:edit"), async (req, res) => {
    try {
      const status = await storage.updateCustomStatus(req.params.id, req.body);
      if (!status) {
        return res.status(404).json({ message: "Custom status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error updating custom status:", error);
      res.status(500).json({ message: "Failed to update custom status" });
    }
  });

  app.delete("/api/custom-statuses/:id", requirePermission("statuses:delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteCustomStatus(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Custom status not found" });
      }
      res.json({ message: "Custom status deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom status:", error);
      res.status(500).json({ message: "Failed to delete custom status" });
    }
  });

  app.post("/api/custom-statuses/:id/set-default", requirePermission("statuses:edit"), async (req, res) => {
    try {
      const set = await storage.setDefaultCustomStatus(req.params.id);
      if (!set) {
        return res.status(404).json({ message: "Custom status not found" });
      }
      res.json({ message: "Default status set successfully" });
    } catch (error) {
      console.error("Error setting default custom status:", error);
      res.status(500).json({ message: "Failed to set default custom status" });
    }
  });

  // Department Routes
  app.get("/api/departments", async (_req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error fetching department:", error);
      res.status(500).json({ message: "Failed to fetch department" });
    }
  });

  app.post("/api/departments", requirePermission("departments:create"), async (req, res) => {
    try {
      const parsed = insertDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const department = await storage.createDepartment(parsed.data);
      res.json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.put("/api/departments/:id", requirePermission("departments:edit"), async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", requirePermission("departments:delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteDepartment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
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

  // Email settings routes
  app.get("/api/email-config", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const config = await getEmailConfig();
      if (!config) {
        return res.json({
          host: "",
          port: 587,
          secure: false,
          user: "",
          password: "",
          from: "",
          fromName: "TeamSync",
        });
      }
      // Never return actual password to client
      res.json({ ...config, password: config.password ? "••••••••" : "" });
    } catch (error) {
      console.error("Error fetching email config:", error);
      res.status(500).json({ message: "Failed to fetch email config" });
    }
  });

  app.post("/api/email-config", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { host, port, secure, user, password, from, fromName } = req.body;
      if (!host || !user) {
        return res.status(400).json({ message: "Host и User обязательны" });
      }

      // If password is masked, keep existing password
      let finalPassword = password;
      if (password === "••••••••" || !password) {
        const existing = await getEmailConfig();
        finalPassword = existing?.password || "";
      }

      const config: any = {
        host,
        port: Number(port) || 587,
        secure: secure === true || secure === "true",
        user,
        password: finalPassword,
        from: from || user,
      };
      if (fromName) config.fromName = fromName;

      await storage.setSiteSetting("email_config", JSON.stringify(config));
      res.json({ success: true, message: "Настройки email сохранены" });
    } catch (error) {
      console.error("Error saving email config:", error);
      res.status(500).json({ message: "Failed to save email config" });
    }
  });

  app.post("/api/email-config/test", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Укажите email для теста" });
      }
      const verifyResult = await testEmailConnection();
      if (!verifyResult.success) {
        return res.status(400).json(verifyResult);
      }
      const template = getWelcomeEmailTemplate(req.user.firstName || req.user.username || "Пользователь");
      const sendResult = await sendEmail({
        to: email,
        subject: "Тестовое письмо от TeamSync",
        html: template.html,
        text: template.text,
      });
      res.json(sendResult);
    } catch (error: any) {
      console.error("Error testing email:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Telegram bot webhook
  app.post("/api/webhook/telegram", async (req, res) => {
    try {
      const replyText = await handleTelegramUpdate(req.body);
      if (replyText) {
        const update = req.body;
        const chatId = update.message?.chat?.id;
        if (chatId) {
          await sendTelegramMessage(chatId.toString(), replyText);
        }
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      res.status(200).json({ ok: true }); // Always return 200 to Telegram
    }
  });

  // Set Telegram webhook (admin only)
  app.post("/api/admin/telegram-webhook", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const setting = await storage.getSiteSetting("tg_bot_token");
      if (!setting?.value) {
        return res.status(400).json({ message: "Bot token not configured" });
      }
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/telegram`;
      const success = await setTelegramWebhook(setting.value, webhookUrl);
      if (success) {
        res.json({ message: "Webhook установлен", url: webhookUrl });
      } else {
        res.status(500).json({ message: "Не удалось установить webhook" });
      }
    } catch (error) {
      console.error("Error setting Telegram webhook:", error);
      res.status(500).json({ message: "Failed to set webhook" });
    }
  });

  // Master password check
  app.get("/api/settings/master_password_set", async (_req, res) => {
    try {
      const setting = await storage.getSiteSetting("master_password_hash");
      res.json({ key: "master_password_set", value: setting ? "true" : "false" });
    } catch (error) {
      res.status(500).json({ message: "Failed to check master password" });
    }
  });

  // Master password set/change
  app.post("/api/settings/change-master-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Пароль должен быть не менее 6 символов" });
    }

    try {
      const existingHash = await storage.getSiteSetting("master_password_hash");
      
      if (existingHash) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Введите текущий пароль" });
        }
        // Security: Verify current password using bcrypt
        const isValid = await bcrypt.compare(currentPassword, existingHash.value);
        if (!isValid) {
          return res.status(400).json({ message: "Неверный текущий пароль" });
        }
      }

      // Security: Hash new password before storing
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await storage.setSiteSetting("master_password_hash", hashedPassword);
      res.json({ message: "Пароль сохранен" });
    } catch (error) {
      console.error("Error setting master password:", error);
      res.status(500).json({ message: "Failed to set master password" });
    }
  });

  // User password change
  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Необходимы текущий и новый пароли" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Новый пароль должен быть не менее 6 символов" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Security: Verify current password
      const isValid = user.password.startsWith('$2') || user.password.startsWith('$')
        ? await bcrypt.compare(currentPassword, user.password)
        : user.password === currentPassword; // Fallback for old plain text passwords

      if (!isValid) {
        return res.status(400).json({ message: "Неверный текущий пароль" });
      }

      // Security: Hash new password before storing
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await storage.updateUser(user.id, { password: hashedPassword });

      // Send password change notification (non-blocking)
      try {
        const name = user.firstName || user.username || user.email.split("@")[0];
        const template = getPasswordChangedTemplate(name);
        await sendEmail({
          to: user.email,
          subject: "Пароль изменен",
          html: template.html,
          text: template.text,
        });
      } catch (emailError) {
        console.error("Failed to send password change email:", emailError);
      }

      res.json({ message: "Пароль успешно изменен" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Workspace routes
  app.get("/api/workspaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const workspaces = await storage.db.select().from(schema.workspaces).orderBy(schema.workspaces.name);
      res.json(workspaces);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      res.status(500).json({ message: "Failed to fetch workspaces" });
    }
  });

  app.post("/api/workspaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { name, description, color } = req.body;
      const user = req.user;
      const [workspace] = await storage.db.insert(schema.workspaces).values({
        name,
        description,
        color: color || "#3b82f6",
        ownerId: user.id
      }).returning();
      res.status(201).json(workspace);
    } catch (error) {
      console.error("Error creating workspace:", error);
      res.status(500).json({ message: "Failed to create workspace" });
    }
  });

  app.patch("/api/workspaces/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { name, description, color } = req.body;
      const [workspace] = await storage.db.update(schema.workspaces).set({
        name,
        description,
        color,
        updatedAt: new Date()
      }).where(eq(schema.workspaces.id, req.params.id)).returning();
      res.json(workspace);
    } catch (error) {
      console.error("Error updating workspace:", error);
      res.status(500).json({ message: "Failed to update workspace" });
    }
  });

  app.delete("/api/workspaces/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      await storage.db.delete(schema.workspaces).where(eq(schema.workspaces.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workspace:", error);
      res.status(500).json({ message: "Failed to delete workspace" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string | undefined;
      const status = req.query.status as string | undefined;
      const projectsWithStats = await storage.getProjectsWithStats(workspaceId, status);
      res.json(projectsWithStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  
  // Get all boards (for task filters)
  app.get("/api/boards", async (req, res) => {
    try {
      const cacheKey = "boards:all";
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const boards = await storage.getAllBoards();
      await setCache(cacheKey, boards, 300); // Cache for 5 minutes
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.post("/api/projects", requirePermission("projects:create"), async (req, res) => {
    // console.log("POST /api/projects hit with body:", req.body);
    try {
      const user = req.user;
      
      const projectData = { 
        name: req.body.name,
        priority: req.body.priority?.toLowerCase() || "medium",
        color: req.body.color || "#3b82f6",
        ownerId: user.id,
        status: "active",
        workspaceId: req.body.workspaceId || null
      };
      
      console.log("POST /api/projects: Creating project with data:", projectData);
      const project = await storage.createProject(projectData);
      console.log("POST /api/projects: Project created successfully:", project.id);
      
      // Очищаем кэш проектов, чтобы новый проект сразу отображался
      await delCache("projects:stats:all");
      console.log("POST /api/projects: Cache cleared");

      // Get all users to notify about new project
      try {
        const users = await storage.getAllUsers();
        const creatorName = formatUserName(user);

        // Notify all users about new project (limit to avoid too many notifications)
        const usersToNotify = users.filter((u: any) => u.id !== user.id).slice(0, 20);
        for (const notifyUser of usersToNotify) {
          await sendNotification(
            notifyUser.id,
            user.id,
            'project_created',
            'Новый проект',
            {
              action: 'created',
              userName: creatorName,
              fieldName: 'Проект',
              newValue: project.name,
            },
            `/projects/${project.id}`
          );
        }
      } catch (error) {
        console.error("Error sending project creation notifications:", error);
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error("POST /api/projects error:", error);
      res.status(500).json({ message: "Failed to create project", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      // Whitelist allowed fields for security
      const allowedFields = ['name', 'description', 'status', 'priorityId', 'workspaceId', 'startDate', 'endDate', 'budget', 'currency', 'color', 'isPublic'];
      const updateData: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      const project = await storage.updateProject(req.params.id, updateData);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requirePermission("projects:delete"), async (req, res) => {
    
    console.log("[API] Delete project request body:", req.body);
    
    const masterPassword = req.body?.masterPassword;
    
    if (!masterPassword) {
      return res.status(400).json({ message: "Требуется мастер-пароль" });
    }
    
    try {
      const masterPasswordHash = await storage.getSiteSetting("master_password_hash");
      
      // If master password is not set, allow deletion without verification
      if (!masterPasswordHash) {
        console.log("[API] No master password set, allowing deletion");
        await storage.deleteProject(req.params.id);
        await delCache("projects:stats:all");
        return res.status(204).send();
      }
      
      // Security: Verify password using bcrypt
      const isValid = await bcrypt.compare(masterPassword, masterPasswordHash.value);
      if (!isValid) {
        return res.status(400).json({ message: "Неверный мастер-пароль" });
      }
      
      await storage.deleteProject(req.params.id);
      await delCache("projects:stats:all");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Board routes
  app.get("/api/boards/:id/full", async (req, res) => {
    try {
      const boardId = req.params.id;
      const cacheKey = `board:full:${boardId}`;
      
      // Попытка получить данные из кэша
      const cachedData = await getCache<any>(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Оптимизированная загрузка: колонки и задачи с пользователями за 2 запроса (вместо 2*N)
      const [columns, tasks] = await Promise.all([
        storage.getColumnsByBoard(boardId),
        storage.getTasksByBoardWithUsers(boardId)
      ]);
      
      // Convert "todo" status to "В планах" for backward compatibility
      const enrichedTasks = tasks.map((task: any) => ({
        ...task,
        status: task.status === "todo" ? "В планах" : task.status
      }));
      
      const boardData = { columns, tasks: enrichedTasks };
      
      // Сохраняем в кэш на 5 минут
      await setCache(cacheKey, boardData, 300);
      
      res.json(boardData);
    } catch (error) {
      console.error("Error fetching full board data:", error);
      res.status(500).json({ message: "Failed to fetch board data" });
    }
  });

  app.get("/api/projects/:projectId/boards", async (req, res) => {
    try {
      const boards = await storage.getBoardsByProject(req.params.projectId);
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.post("/api/projects/:projectId/boards", async (req, res) => {
    try {
      const board = await storage.createBoard({ ...req.body, projectId: req.params.projectId });
      
      // Создаем стандартные колонки для новой доски (bulk insert для скорости)
      const defaultColumnNames = ["В планах", "В работе", "На проверке", "Готово"];
      const columnsToCreate = defaultColumnNames.map((name, index) => ({
        boardId: board.id,
        name,
        order: index,
        color: "#3b82f6"
      }));
      
      await storage.createColumns(columnsToCreate);
      
      // Инвалидируем кэш статистики проектов, так как количество досок изменилось
      await invalidatePattern("projects:stats:*");
      
      res.status(201).json(board);
    } catch (error) {
      console.error("Error creating board:", error);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      const board = await storage.updateBoard(req.params.id, req.body);
      res.json(board);
    } catch (error) {
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", requirePermission("boards:delete"), async (req, res) => {
    try {
      await storage.deleteBoard(req.params.id);
      // Инвалидируем кэш статистики проектов при удалении доски
      await invalidatePattern("projects:stats:*");
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // Task routes
  
  // Get tasks assigned to current user - must be before :id routes
  app.get("/api/tasks/my-tasks", async (req, res) => {
    console.log(">>> MY TASKS ROUTE CALLED <<<");
    console.log("Path:", req.path);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user.id;
      console.log("[my-tasks] Fetching tasks for user:", userId);
      
      // Parse filter parameters from query string
      const search = req.query.search as string || '';
      const status = req.query.status as string || '';
      const projectId = req.query.project as string || '';
      const priority = req.query.priority as string || '';
      
      // Build dynamic where conditions
      const baseConditions = [
        eq(schema.tasks.assigneeId, userId),
        or(eq(schema.tasks.archived, false), isNull(schema.tasks.archived))
      ];
      
      // Add search filter
      if (search) {
        baseConditions.push(
          or(
            sql`${schema.tasks.title} ILIKE ${'%' + search + '%'}`,
            sql`${schema.tasks.description} ILIKE ${'%' + search + '%'}`,
            sql`${schema.tasks.number} ILIKE ${'%' + search + '%'}`
          )
        );
      }
      
      // Add status filter
      if (status) {
        const statusArray = status.split(',');
        if (statusArray.length === 1) {
          baseConditions.push(eq(schema.tasks.status, status));
        } else {
          baseConditions.push(inArray(schema.tasks.status, statusArray));
        }
      }
      
      // Add priority filter
      if (priority) {
        baseConditions.push(eq(schema.tasks.priorityId, priority));
      }
      
      // Add project filter (via board join)
      let projectFilter = undefined;
      if (projectId) {
        projectFilter = eq(schema.projects.id, projectId);
      }
      
      // Get tasks assigned to the user with filters
      let query = storage.db
        .select({ 
          task: schema.tasks,
          board: schema.boards,
          project: schema.projects
        })
        .from(schema.tasks)
        .innerJoin(schema.boards, eq(schema.tasks.boardId, schema.boards.id))
        .innerJoin(schema.projects, eq(schema.boards.projectId, schema.projects.id))
        .where(and(...baseConditions, projectFilter));
      
      const tasks = await query;
      
      console.log("[my-tasks] Found tasks:", tasks.length);
      
      // Collect all unique user IDs to avoid N+1 queries
      const userIds = new Set<string>();
      tasks.forEach(t => {
        if (t.task.assigneeId) userIds.add(t.task.assigneeId);
        if (t.task.reporterId) userIds.add(t.task.reporterId);
      });
      
      // Batch fetch all users in a single query
      const usersMap = new Map<string, any>();
      if (userIds.size > 0) {
        const users = await storage.db
          .select({
            id: schema.users.id,
            username: schema.users.username,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
            avatar: schema.users.avatar
          })
          .from(schema.users)
          .where(inArray(schema.users.id, Array.from(userIds)));
        
        users.forEach(user => usersMap.set(user.id, user));
      }
      
      // Fetch all priorities and task types for mapping
      const prioritiesList = await storage.db.select().from(schema.priorities);
      const taskTypesList = await storage.db.select().from(schema.taskTypes);
      
      const prioritiesMap = new Map(prioritiesList.map((p: any) => [p.id, { name: p.name.toLowerCase(), color: p.color }]));
      const taskTypesMap = new Map(taskTypesList.map((t: any) => [t.id, { name: t.name, color: t.color }]));
      
      // Enrich tasks with board, project, column, priority, and task type info
      const enrichedTasks = await Promise.all(tasks.map(async (t) => {
        const assignee = t.task.assigneeId ? usersMap.get(t.task.assigneeId) : null;
        const reporter = t.task.reporterId ? usersMap.get(t.task.reporterId) : null;
        
        // Fetch column info
        let column = null;
        if (t.task.columnId) {
          column = await storage.getColumn(t.task.columnId);
        }
        
        // Get priority info from mapping
        const priorityInfo = t.task.priorityId ? prioritiesMap.get(t.task.priorityId) : null;
        
        // Get task type info from mapping
        const taskTypeInfo = t.task.taskTypeId ? taskTypesMap.get(t.task.taskTypeId) : null;
        
        return {
          ...t.task,
          board: t.board,
          project: t.project,
          column: column,
          priority: priorityInfo?.name || null,
          priorityColor: priorityInfo?.color || null,
          taskType: taskTypeInfo?.name || null,
          taskTypeColor: taskTypeInfo?.color || null,
          assignee: formatUserBasic(assignee),
          creator: reporter ? { ...formatUserBasic(reporter), date: t.task.createdAt } : null
        };
      }));
      
      res.json(enrichedTasks);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get archived tasks
  app.get("/api/tasks/archived", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const tasks = await storage.db
        .select({ 
          task: schema.tasks,
          board: schema.boards,
          project: schema.projects
        })
        .from(schema.tasks)
        .innerJoin(schema.boards, eq(schema.tasks.boardId, schema.boards.id))
        .innerJoin(schema.projects, eq(schema.boards.projectId, schema.projects.id))
        .where(eq(schema.tasks.archived, true));
      
      // Collect all unique user IDs to avoid N+1 queries
      const userIds = new Set<string>();
      tasks.forEach(t => {
        if (t.task.assigneeId) userIds.add(t.task.assigneeId);
        if (t.task.reporterId) userIds.add(t.task.reporterId);
      });
      
      // Batch fetch all users in a single query
      const usersMap = new Map<string, any>();
      if (userIds.size > 0) {
        const users = await storage.db
          .select({
            id: schema.users.id,
            username: schema.users.username,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
            avatar: schema.users.avatar
          })
          .from(schema.users)
          .where(inArray(schema.users.id, Array.from(userIds)));
        
        users.forEach(user => usersMap.set(user.id, user));
      }
      
      // Enrich tasks with user info
      const enrichedTasks = tasks.map((t) => {
        const assignee = t.task.assigneeId ? usersMap.get(t.task.assigneeId) : null;
        const reporter = t.task.reporterId ? usersMap.get(t.task.reporterId) : null;
        
        return {
          ...t.task,
          board: t.board,
          project: t.project,
          assignee: formatUserBasic(assignee),
          creator: reporter ? { ...formatUserBasic(reporter), date: t.task.createdAt } : null,
        };
      });
      
      res.json(enrichedTasks);
    } catch (error) {
      console.error("Error fetching archived tasks:", error);
      res.status(500).json({ message: "Failed to fetch archived tasks" });
    }
  });

  app.get("/api/boards/:boardId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByBoard(req.params.boardId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = req.params.id;
      
      // Проверка на временный ID (temp-...), который может прийти из-за оптимистичных обновлений
      if (taskId.startsWith("temp-")) {
        return res.status(400).json({ message: "Cannot update task with temporary ID" });
      }

      console.log(`[PATCH Task] Updating task ${taskId}`, req.body);
      const updateData = { ...req.body };
      
      // Удаляем поля, которых нет в таблице tasks (обогащенные данные)
      const allowedFields = [
        'title', 'description', 'status', 'priority', 'priorityId', 'taskTypeId', 'type', 
        'storyPoints', 'startDate', 'dueDate', 'acceptedAt', 'completedAt', 'timeSpent',
        'order', 'columnId', 'boardId', 'assigneeId', 'reporterId',
        'parentId', 'tags', 'attachments', 'number', 'archived'
      ];
      
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });
      
      // Конвертируем строковые даты в объекты Date для PostgreSQL
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      if (updateData.startDate && typeof updateData.startDate === 'string') {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.acceptedAt && typeof updateData.acceptedAt === 'string') {
        updateData.acceptedAt = new Date(updateData.acceptedAt);
      }
      if (updateData.completedAt && typeof updateData.completedAt === 'string') {
        updateData.completedAt = new Date(updateData.completedAt);
      }
      
      // Если задача перемещается в колонку, обновляем её статус на название колонки
      if (updateData.columnId) {
        const column = await storage.getColumn(updateData.columnId);
        if (column && column.name) {
          updateData.status = column.name;
          console.log('[PATCH] Column:', column.name, '-> status:', updateData.status);
        }
      }
      
      // Если обновляется статус (из модального окна), нужно также обновить columnId
      if (updateData.status && !updateData.columnId) {
        // Находим колонку с подходящим названием
        const currentTask = await storage.getTask(taskId);
        if (currentTask) {
          const columns = await storage.getColumnsByBoard(currentTask.boardId);
          // Сначала ищем точное совпадение
          let matchingColumn = columns.find(col => col.name === updateData.status);
          
          // Если не нашли, ищем по маппингу (для обратной совместимости)
          if (!matchingColumn) {
            const normalizedStatus = getStatusByColumnName(updateData.status);
            matchingColumn = columns.find(col => {
              const columnStatus = getStatusByColumnName(col.name);
              return columnStatus === normalizedStatus;
            });
          }
          
          if (matchingColumn) {
            updateData.columnId = matchingColumn.id;
            updateData.status = matchingColumn.name; // Используем точное название колонки
            console.log('[PATCH] Found matching column:', matchingColumn.name, '-> columnId:', matchingColumn.id);
          }
        }
      }

      // Get current task before update to check what changed
      const currentTask = await storage.getTask(taskId);
      
      const task = await storage.updateTask(taskId, updateData);
      
      // Handle user time tracking when assignee or status changes
      console.log("[TIME TRACKING] Checking task update:", { taskId, updateData, currentTask: currentTask ? { id: currentTask.id, assigneeId: currentTask.assigneeId, status: currentTask.status } : null });
      if (currentTask) {
        const oldAssigneeId = currentTask.assigneeId;
        const newAssigneeId = updateData.assigneeId;
        const oldStatus = currentTask.status;
        const newStatus = updateData.status;
        
        console.log("[TIME TRACKING] Comparing:", { oldAssigneeId, newAssigneeId, oldStatus, newStatus });
        
        // If assignee changed
        if (newAssigneeId !== undefined && newAssigneeId !== oldAssigneeId) {
          console.log("[TIME TRACKING] Assignee changed, updating tracking");
          // Close tracking for old assignee
          if (oldAssigneeId) {
            await storage.closeUserTimeTracking(taskId, oldAssigneeId);
            console.log("[TIME TRACKING] Closed tracking for old assignee:", oldAssigneeId);
          }
          // Start tracking for new assignee with current status
          if (newAssigneeId) {
            const statusToTrack = newStatus || currentTask.status;
            await storage.startUserTimeTracking(taskId, newAssigneeId, statusToTrack);
            console.log("[TIME TRACKING] Started tracking for new assignee:", newAssigneeId, "status:", statusToTrack);
          }
        }
        // If only status changed (and there's an assignee)
        else if (newStatus && newStatus !== oldStatus && currentTask.assigneeId) {
          console.log("[TIME TRACKING] Status changed, updating tracking");
          // Close current tracking
          await storage.closeUserTimeTracking(taskId, currentTask.assigneeId);
          console.log("[TIME TRACKING] Closed tracking for current assignee:", currentTask.assigneeId);
          // Start new tracking with new status
          await storage.startUserTimeTracking(taskId, currentTask.assigneeId, newStatus);
          console.log("[TIME TRACKING] Started tracking with new status:", newStatus);
        } else {
          console.log("[TIME TRACKING] No tracking changes needed");
        }
      }
      
      // Handle points awarding when status changes
      if (currentTask && updateData.status && updateData.status !== currentTask.status) {
        console.log("[POINTS] Status changed, checking for points award");
        const assigneeId = currentTask.assigneeId;
        
        if (assigneeId) {
          // Check if points were already awarded for this status in this task
          const existingTransaction = await storage.getTransaction(taskId, updateData.status, 'earned');
          
          if (!existingTransaction) {
            // Get points setting for the new status
            const setting = await storage.getPointsSetting(updateData.status);
            const points = setting?.pointsAmount || 1;
            const maxTimeInStatus = setting?.maxTimeInStatus || 0;
            
            // Check if maximum time limit is exceeded
            let timeCheckPassed = true;
            if (maxTimeInStatus > 0) {
              // Get time spent in current status
              const timeSummary = await storage.getTaskUserTimeSummary(taskId);
              const currentStatusTime = timeSummary.find(t => t.status === currentTask.status && t.userId === assigneeId);
              const timeSpentMinutes = currentStatusTime ? Math.floor(currentStatusTime.totalSeconds / 60) : 0;
              
              if (timeSpentMinutes > maxTimeInStatus) {
                timeCheckPassed = false;
                console.log(`[POINTS] Time limit exceeded. Spent: ${timeSpentMinutes}min, Maximum allowed: ${maxTimeInStatus}min`);
              }
            }
            
            if (timeCheckPassed) {
              // Create transaction
              await storage.createTransaction({
                userId: assigneeId,
                taskId,
                statusName: updateData.status,
                type: 'earned',
                amount: points,
                description: `Начисление за переход в статус "${updateData.status}"`
              });
              
              // Update user points
              await storage.updateUserPoints(assigneeId, points);
              
              console.log("[POINTS] Awarded", points, "points to user", assigneeId, "for status", updateData.status);
            } else {
              console.log("[POINTS] Points not awarded - minimum time requirement not met");
            }
          } else {
            console.log("[POINTS] Points already awarded for this status in this task");
          }
        }
      }
      
      // Handle points revert when task is uncompleted (moved from "Готово" to another status)
      if (currentTask && currentTask.status === 'Готово' && updateData.status && updateData.status !== 'Готово') {
        console.log("[POINTS] Task uncompleted, checking for points revert");
        const assigneeId = currentTask.assigneeId;
        
        if (assigneeId) {
          // Find the earned transaction for "Готово" status
          const earnedTransaction = await storage.getTransaction(taskId, 'Готово', 'earned');
          
          if (earnedTransaction) {
            // Check user balance
            const userPoints = await storage.getUserPoints(assigneeId);
            
            if (userPoints.balance >= earnedTransaction.amount) {
              // Create revert transaction
              await storage.createTransaction({
                userId: assigneeId,
                taskId,
                statusName: 'Готово',
                type: 'reverted',
                amount: -earnedTransaction.amount,
                description: `Возврат баллов при отмене завершения задачи`
              });
              
              // Update user points
              await storage.updateUserPoints(assigneeId, -earnedTransaction.amount);
              
              console.log("[POINTS] Reverted", earnedTransaction.amount, "points from user", assigneeId);
            } else {
              console.log("[POINTS] Cannot revert - insufficient balance");
            }
          }
        }
      }
      
      // Get the current user for history
      const currentUser = req.user;
      const userId = currentUser?.id;
      
      // Prepare history entries for batch insert
      const historyEntries: {
        taskId: string;
        userId?: string;
        action: string;
        fieldName?: string;
        oldValue?: string;
        newValue?: string;
      }[] = [];
      
      // Collect all user IDs that need to be fetched for history entries
      const userIdsToFetch = new Set<string>();
      if (updateData.assigneeId) {
        userIdsToFetch.add(String(updateData.assigneeId));
      }
      if (currentTask?.assigneeId) {
        userIdsToFetch.add(String(currentTask.assigneeId));
      }
      
      // Batch fetch all needed users
      const usersMap = new Map<string, any>();
      if (userIdsToFetch.size > 0) {
        const users = await storage.getUsersByIds(Array.from(userIdsToFetch));
        users.forEach(u => usersMap.set(u.id, u));
      }
      
      // Field name translations
      const fieldTranslations: Record<string, string> = {
        assigneeId: 'Исполнитель',
        status: 'Статус',
        priorityId: 'Приоритет',
        title: 'Название',
        description: 'Описание',
        dueDate: 'Срок',
        tags: 'Метки',
        columnId: 'Колонка',
        boardId: 'Доска',
        type: 'Тип',
        storyPoints: 'Story Points',
        startDate: 'Дата начала',
        completedAt: 'Дата завершения',
        timeSpent: 'Затраченное время',
        archived: 'Архив',
      };
      
      // Record history for each changed field
      for (const [key, newValue] of Object.entries(updateData)) {
        // Skip internal fields
        if (['id', 'createdAt', 'updatedAt', 'reporterId'].includes(key)) continue;
        
        let action = 'updated';
        let fieldName = fieldTranslations[key] || key;
        let oldValueStr = '';
        let newValueStr = String(newValue || '');
        
        // Get old value from current task
        const oldValue = currentTask?.[key as keyof typeof currentTask];
        
        // Special handling for different fields
        if (key === 'assigneeId') {
          action = 'assignee_changed';
          if (oldValue) {
            const oldUser = usersMap.get(String(oldValue));
            oldValueStr = oldUser ? `${oldUser.firstName || ''} ${oldUser.lastName || ''}`.trim() || oldUser.username : String(oldValue);
          } else {
            oldValueStr = 'не назначен';
          }
          if (newValue) {
            const newUser = usersMap.get(String(newValue));
            newValueStr = newUser ? `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim() || newUser.username : String(newValue);
          } else {
            newValueStr = 'не назначен';
          }
        } else if (key === 'status') {
          action = 'status_changed';
          oldValueStr = oldValue ? String(oldValue) : '';
        } else if (key === 'priorityId') {
          action = 'priority_changed';
          oldValueStr = oldValue ? String(oldValue) : '';
        } else if (key === 'title') {
          action = 'title_changed';
          oldValueStr = oldValue ? String(oldValue) : '';
        } else if (key === 'description') {
          action = 'description_changed';
          oldValueStr = oldValue ? String(oldValue) : '';
        } else if (key === 'dueDate') {
          action = 'due_date_changed';
          oldValueStr = oldValue ? String(oldValue) : '';
          newValueStr = newValue ? String(newValue) : '';
        } else if (key === 'tags') {
          action = 'labels_changed';
          oldValueStr = oldValue ? String(oldValue) : '';
          newValueStr = newValue ? String(newValue) : '';
        } else if (key === 'columnId') {
          action = 'column_changed';
          // Get column names
          if (oldValue) {
            const oldColumn = await storage.getColumn(String(oldValue));
            oldValueStr = oldColumn?.name || String(oldValue);
          } else {
            oldValueStr = '';
          }
          if (newValue) {
            const newColumn = await storage.getColumn(String(newValue));
            newValueStr = newColumn?.name || String(newValue);
          } else {
            newValueStr = '';
          }
        } else if (key === 'order') {
          action = 'order_changed';
          fieldName = 'Порядок';
          oldValueStr = oldValue !== undefined ? String(oldValue) : '';
          newValueStr = newValue !== undefined ? String(newValue) : '';
        } else {
          // Generic field update
          oldValueStr = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        }
        
        historyEntries.push({
          taskId,
          userId,
          action,
          fieldName,
          oldValue: oldValueStr,
          newValue: newValueStr,
        });
      }
      
      // Batch insert history entries
      if (historyEntries.length > 0) {
        try {
          await storage.addTaskHistoryBatch(historyEntries);
        } catch (error) {
          console.error("Error recording history:", error);
        }
      }
      
      // Record status change for time tracking
      if (updateData.status) {
        try {
          await storage.recordTaskStatusEntry(taskId, updateData.status);
        } catch (error) {
          console.error("Error recording status change:", error);
        }
      }

      // Send notifications for assignee changes
      if (updateData.assigneeId) {
        const newAssigneeId = updateData.assigneeId;
        if (newAssigneeId && newAssigneeId !== userId) {
          const board = await storage.getBoard(task.boardId);
          await sendNotification(
            newAssigneeId,
            userId!,
            'task_assigned',
            'Вам назначена задача',
            {
              action: 'assigned',
              userName: formatUserName(currentUser!),
              fieldName: 'Исполнитель',
              newValue: 'Вы',
              taskTitle: task.title,
              boardName: board?.name,
            },
            `/boards/${task.boardId}`
          );
        }
      }

      // Send notification to assignee about status change (if not made by assignee)
      if (updateData.status && currentTask?.status !== updateData.status && task.assigneeId && task.assigneeId !== userId) {
        const board = await storage.getBoard(task.boardId);
        await sendNotification(
          task.assigneeId,
          userId!,
          'task',
          'Статус задачи изменен',
          {
            action: 'status_changed',
            userName: formatUserName(currentUser!),
            fieldName: 'Статус',
            oldValue: currentTask?.status || undefined,
            newValue: updateData.status,
            taskTitle: task.title,
            boardName: board?.name,
          },
          `/boards/${task.boardId}`
        );
      }

      // Send notification to reporter about task updates (except for assignee changes and status changes already notified)
      if (task.reporterId && task.reporterId !== userId && !updateData.assigneeId && !(updateData.status && currentTask?.status !== updateData.status)) {
        const changedFields = Object.keys(updateData);
        if (changedFields.length > 0) {
          const board = await storage.getBoard(task.boardId);
          const fieldNames: Record<string, string> = {
            'status': 'Статус',
            'priority': 'Приоритет',
            'title': 'Название',
            'description': 'Описание',
            'dueDate': 'Срок',
            'columnId': 'Колонка'
          };
          const changedFieldNames = changedFields.map(f => fieldNames[f] || f).join(', ');
          await sendNotification(
            task.reporterId,
            userId!,
            'task_updated',
            'Задача обновлена',
            {
              action: 'updated',
              userName: formatUserName(currentUser!),
              fieldName: changedFieldNames,
              taskTitle: task.title,
              boardName: board?.name,
            },
            `/boards/${task.boardId}`
          );
        }
      }
      
      // Обогащаем задачу данными об исполнителе и репортере перед отправкой
      const [assignee, reporter] = await Promise.all([
        task.assigneeId ? storage.getUser(task.assigneeId) : null,
        task.reporterId ? storage.getUser(task.reporterId) : null
      ]);

      const enrichedTask = {
        ...task,
        status: task.status === "todo" ? "В планах" : task.status,
        assignee: formatUserBasic(assignee),
        creator: { 
          name: reporter ? formatUserName(reporter) : "Система", 
          avatar: reporter?.avatar || null,
          date: task.createdAt ? new Date(task.createdAt).toISOString() : ""
        }
      };

      // Инвалидируем кэш статистики проектов и данные доски
      await invalidatePattern("projects:stats:*");
      await invalidatePattern(`board:full:${task.boardId}`);
      await delCache(`task:${taskId}`);
      
      // Инвалидируем кэш "Мои задачи" для всех пользователей, так как задача могла быть переназначена
      await invalidatePattern("my-tasks:*");
      
      // Если передан новый порядок (order), нужно обновить порядок остальных задач в той же колонке
      if (updateData.order !== undefined) {
        const allTasks = await storage.getTasksByBoard(task.boardId);
        
        // 1. Берем все задачи в этой колонке, КРОМЕ той, которую мы уже обновили
        const otherColumnTasks = allTasks
          .filter(t => t.columnId === task.columnId && t.id !== taskId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // 2. Вставляем обновленную задачу на её новую позицию в массив
        const newColumnTasks = [...otherColumnTasks];
        newColumnTasks.splice(updateData.order, 0, task);
        
        // 3. Собираем только те задачи, у которых реально изменился порядок
        const tasksToUpdate = newColumnTasks
          .map((t, idx) => ({ id: t.id, order: idx }))
          .filter((t, idx) => newColumnTasks[idx].order !== idx);
        
        if (tasksToUpdate.length > 0) {
          await storage.updateTaskOrders(tasksToUpdate);
        }
        
        // Возвращаем задачу с актуальным порядком
        enrichedTask.order = updateData.order;
      }
      
      res.json(enrichedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("Request body:", req.body);
      console.error("Task ID:", req.params.id);
      res.status(500).json({ message: "Failed to update task", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Task status history endpoints
  app.get("/api/tasks/:id/status-history", async (req, res) => {
    try {
      const history = await storage.getTaskStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error getting task status history:", error);
      res.status(500).json({ message: "Failed to get status history" });
    }
  });

  app.get("/api/tasks/:id/status-summary", async (req, res) => {
    try {
      const summary = await storage.getTaskStatusSummary(req.params.id);
      res.json(summary);
    } catch (error) {
      console.error("Error getting task status summary:", error);
      res.status(500).json({ message: "Failed to get status summary" });
    }
  });

  app.get("/api/tasks/:id/user-time-summary", async (req, res) => {
    try {
      const summary = await storage.getTaskUserTimeSummary(req.params.id);
      res.json(summary);
    } catch (error) {
      console.error("Error getting task user time summary:", error);
      res.status(500).json({ message: "Failed to get user time summary" });
    }
  });

  app.get("/api/tasks/:id/history", async (req, res) => {
    try {
      const history = await storage.getTaskHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error getting task history:", error);
      res.status(500).json({ message: "Failed to get task history" });
    }
  });

  app.get("/api/tasks/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;
      
      // Get total count for pagination info
      const totalCount = await storage.db
        .select({ count: schema.tasks.id })
        .from(schema.tasks)
        .innerJoin(schema.boards, eq(schema.tasks.boardId, schema.boards.id))
        .innerJoin(schema.projects, eq(schema.boards.projectId, schema.projects.id))
        .where(eq(schema.projects.status, "active"));
      
      // Get paginated tasks
      const allTasks = await storage.db
        .select({ 
          task: schema.tasks 
        })
        .from(schema.tasks)
        .innerJoin(schema.boards, eq(schema.tasks.boardId, schema.boards.id))
        .innerJoin(schema.projects, eq(schema.boards.projectId, schema.projects.id))
        .where(eq(schema.projects.status, "active"))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.tasks.createdAt));
      
      res.json({
        tasks: allTasks.map(t => t.task),
        pagination: {
          page,
          limit,
          total: totalCount.length,
          totalPages: Math.ceil(totalCount.length / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = req.params.id;
      const cacheKey = `task:${taskId}`;
      
      // Try cache first
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const [assignee, reporter] = await Promise.all([
        task.assigneeId ? storage.getUser(task.assigneeId) : null,
        task.reporterId ? storage.getUser(task.reporterId) : null
      ]);

      const enrichedTask = {
        ...task,
        assignee: formatUserBasic(assignee),
        creator: { 
          name: reporter ? formatUserName(reporter) : "Система", 
          avatar: reporter?.avatar || null,
          date: task.createdAt ? new Date(task.createdAt).toISOString() : ""
        }
      };
      
      // Cache for 2 minutes
      await setCache(cacheKey, enrichedTask, 120);
      
      res.json(enrichedTask);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/boards/:boardId/tasks", requirePermission("tasks:create"), async (req, res) => {
    try {
      const user = req.user;
      console.log("[API] Creating task with data:", req.body);

      // Validate required fields
      if (!req.body.title || typeof req.body.title !== 'string' || req.body.title.trim() === '') {
        return res.status(400).json({ message: "Название задачи обязательно" });
      }

      const columns = await storage.getColumnsByBoard(req.params.boardId);
      if (columns.length === 0) return res.status(400).json({ message: "Board has no columns" });

      // Whitelist allowed fields for security (including validated title)
      const allowedFields = ['title', 'description', 'status', 'priorityId', 'taskTypeId', 'type', 'storyPoints', 'startDate', 'dueDate', 'columnId', 'assigneeId', 'tags', 'parentId'];
      const sanitizedBody: Record<string, any> = { title: req.body.title.trim() };
      
      for (const field of allowedFields.slice(1)) {
        if (req.body[field] !== undefined) {
          sanitizedBody[field] = req.body[field];
        }
      }

      // Determine status based on column
      const targetColumnId = req.body.columnId || columns[0].id;
      const targetColumn = await storage.getColumn(targetColumnId);
      const determinedStatus = targetColumn && targetColumn.name 
        ? getStatusByColumnName(targetColumn.name)
        : 'todo';
      
      const taskData = {
        ...sanitizedBody,
        boardId: req.params.boardId,
        columnId: targetColumnId,
        reporterId: user.id,
        status: req.body.status || determinedStatus
      } as any;
      console.log("[API] Task data prepared:", taskData);

      const task = await storage.createTask(taskData);
      console.log("[API] Task created:", task);
      
      // Start timer for initial status
      try {
        const initialStatus = task.status || "В планах";
        await storage.recordTaskStatusEntry(task.id, initialStatus);
        console.log("[API] Started timer for status:", initialStatus);
      } catch (error) {
        console.error("Error starting task timer:", error);
      }
      
      // Start user time tracking if assignee is set
      if (task.assigneeId) {
        try {
          await storage.startUserTimeTracking(task.id, task.assigneeId, task.status || "В планах");
          console.log("[API] Started user time tracking for assignee:", task.assigneeId);
        } catch (error) {
          console.error("Error starting user time tracking:", error);
        }
      }
      
      // Award points for initial status if assignee is set
      if (task.assigneeId && task.status) {
        try {
          // Check if points were already awarded
          const existingTransaction = await storage.getTransaction(task.id, task.status, 'earned');
          
          if (!existingTransaction) {
            // Get points setting for the status
            const setting = await storage.getPointsSetting(task.status);
            const points = setting?.pointsAmount || 1;
            
            // Create transaction
            await storage.createTransaction({
              userId: task.assigneeId,
              taskId: task.id,
              statusName: task.status,
              type: 'earned',
              amount: points,
              description: `Начисление за создание задачи в статусе "${task.status}"`
            });
            
            // Update user points
            await storage.updateUserPoints(task.assigneeId, points);
            
            console.log("[API] Awarded", points, "points to user", task.assigneeId, "for initial status", task.status);
          }
        } catch (error) {
          console.error("Error awarding initial points:", error);
        }
      }
      
      // Record task creation in history
      try {
        await storage.addTaskHistory({
          taskId: task.id,
          userId: user.id,
          action: 'created',
          fieldName: 'Задача',
          newValue: task.title,
        });
      } catch (error) {
        console.error("Error recording task creation history:", error);
      }

      // Send notifications in parallel for better performance
      const notificationPromises: Promise<void>[] = [];
      
      // Send notification to assignee if assigned
      if (task.assigneeId && task.assigneeId !== user.id) {
        const board = await storage.getBoard(task.boardId);
        notificationPromises.push(sendNotification(
          task.assigneeId,
          user.id,
          'task_assigned',
          'Новая задача',
          {
            action: 'assigned',
            userName: formatUserName(user),
            fieldName: 'Исполнитель',
            newValue: 'Вы',
            taskTitle: task.title,
            boardName: board?.name,
          },
          `/boards/${task.boardId}`
        ));
      }

      // Send notification to project owner (parallel)
      try {
        const board = await storage.getBoard(task.boardId);
        if (board) {
          const project = await storage.getProject(board.projectId);
          if (project && project.ownerId && project.ownerId !== user.id) {
            notificationPromises.push(sendNotification(
              project.ownerId,
              user.id,
              'task_created',
              'Новая задача',
              {
                action: 'created',
                userName: formatUserName(user),
                fieldName: 'Задача',
                newValue: task.title,
                boardName: board?.name,
              },
              `/boards/${task.boardId}`
            ));
          }
        }
      } catch (error) {
        console.error("Error sending project notification:", error);
      }
      
      // Execute all notifications in parallel
      await Promise.all(notificationPromises);
      
      // Обогащаем задачу данными об исполнителе и репортере перед отправкой
      const [assignee, reporter] = await Promise.all([
        task.assigneeId ? storage.getUser(task.assigneeId) : null,
        task.reporterId ? storage.getUser(task.reporterId) : null
      ]);

      const enrichedTask = {
        ...task,
        assignee: formatUserBasic(assignee),
        creator: { 
          name: reporter ? formatUserName(reporter) : "Система", 
          avatar: reporter?.avatar || null,
          date: task.createdAt ? new Date(task.createdAt).toISOString() : ""
        }
      };

      // Инвалидируем кэш статистики проектов и данные доски
      await invalidatePattern("projects:stats:*");
      await invalidatePattern(`board:full:${req.params.boardId}`);
      
      res.status(201).json(enrichedTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/boards/:boardId/columns", async (req, res) => {
    try {
      const columns = await storage.getColumnsByBoard(req.params.boardId);
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.get("/api/board-columns/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const allColumns = await storage.db.select().from(schema.boardColumns).orderBy(schema.boardColumns.order);
      res.json(allColumns);
    } catch (error) {
      console.error("Error fetching all columns:", error);
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.post("/api/boards/:boardId/columns", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { name, color, description } = req.body;
      const boardId = req.params.boardId;
      
      // Get current columns to determine order
      const existingColumns = await storage.getColumnsByBoard(boardId);
      const maxOrder = existingColumns.length > 0 
        ? Math.max(...existingColumns.map(c => c.order))
        : -1;
      
      const newColumn = await storage.createColumn({
        boardId,
        name,
        order: maxOrder + 1,
        color: color || null,
        description: description || null
      });
      
      // Invalidate board cache
      await delCache(`board:full:${boardId}`);
      
      res.status(201).json(newColumn);
    } catch (error) {
      console.error("[API] Error creating column:", error);
      res.status(500).json({ message: "Failed to create column" });
    }
  });

  app.patch("/api/board-columns/:columnId", async (req, res) => {
    console.log("[API] PATCH /api/board-columns/:columnId - Received request");
    console.log("[API] Column ID:", req.params.columnId);
    console.log("[API] Body:", req.body);
    
    if (!req.isAuthenticated()) {
      console.log("[API] Unauthorized request");
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    try {
      const { name, color, description } = req.body;
      console.log("[API] Attempting to update column with name:", name, "color:", color, "description:", description);
      
      // Get board ID before updating
      const column = await storage.db.select().from(schema.boardColumns).where(eq(schema.boardColumns.id, req.params.columnId));
      const boardId = column[0]?.boardId;
      
      const updated = await storage.updateBoardColumn(req.params.columnId, { name, color, description: description || null });
      console.log("[API] Column updated successfully:", updated);
      
      // Invalidate board cache
      if (boardId) {
        await delCache(`board:full:${boardId}`);
      }
      
      res.json(updated);
    } catch (error) {
      console.error("[API] Error updating column:", error);
      res.status(500).json({ message: "Failed to update column" });
    }
  });

  app.delete("/api/board-columns/:columnId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { targetColumnId } = req.query;
      
      // If targetColumnId is provided, move all tasks to that column first
      if (targetColumnId) {
        const tasksToMove = await storage.db.select().from(schema.tasks).where(eq(schema.tasks.columnId, req.params.columnId));
        for (const task of tasksToMove) {
          await storage.updateTaskColumnId(task.id, targetColumnId as string);
        }
      }
      
      // Get board ID before deleting
      const column = await storage.db.select().from(schema.boardColumns).where(eq(schema.boardColumns.id, req.params.columnId));
      const boardId = column[0]?.boardId;
      
      await storage.deleteBoardColumn(req.params.columnId);
      
      // Invalidate board cache
      if (boardId) {
        await delCache(`board:full:${boardId}`);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting column:", error);
      res.status(500).json({ message: "Failed to delete column" });
    }
  });

  // Priorities API
  app.get("/api/priorities", async (req, res) => {
    const prioritiesList = await storage.db.select().from(priorities);
    res.json(prioritiesList);
  });

  app.post("/api/priorities", async (req, res) => {
    const { name, color, level } = req.body;
    const newPriority = await storage.db.insert(priorities).values({ name, color, level }).returning();
    res.status(201).json(newPriority[0]);
  });

  app.put("/api/priorities/:id", async (req, res) => {
    const { id } = req.params;
    const { name, color, level } = req.body;
    const updatedPriority = await storage.db.update(priorities).set({ name, color, level }).where(eq(priorities.id, id)).returning();
    res.json(updatedPriority[0]);
  });

  app.delete("/api/priorities/:id", async (req, res) => {
    const { id } = req.params;
    await storage.db.delete(priorities).where(eq(priorities.id, id));
    res.status(204).send();
  });

  // Task Types API
  app.get("/api/task-types", async (req, res) => {
    const taskTypesList = await storage.db.select().from(taskTypes);
    res.json(taskTypesList);
  });

  app.post("/api/task-types", async (req, res) => {
    const { name, color } = req.body;
    try {
      const newTaskType = await storage.db.insert(taskTypes).values({ name, color }).returning();
      res.status(201).json(newTaskType[0]);
    } catch (error: any) {
      if (error.code === '23505' || error.constraint_name === 'task_types_name_unique') {
        return res.status(409).json({ 
          message: "Task type with this name already exists",
          error: "DUPLICATE_TASK_TYPE_NAME"
        });
      }
      res.status(500).json({ message: "Failed to create task type" });
    }
  });

  app.put("/api/task-types/:id", async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    const updatedTaskType = await storage.db.update(taskTypes).set({ name, color }).where(eq(taskTypes.id, id)).returning();
    res.json(updatedTaskType[0]);
  });

  app.delete("/api/task-types/:id", async (req, res) => {
    const { id } = req.params;
    await storage.db.delete(taskTypes).where(eq(taskTypes.id, id));
    res.status(204).send();
  });

  // Label routes
  app.get("/api/labels", async (_req, res) => {
    try {
      const labels = await storage.getLabels();
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  app.post("/api/labels", async (req, res) => {
    try {
      const parsed = insertLabelSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);
      
      const label = await storage.createLabel(parsed.data);
      res.status(201).json(label);
    } catch (error: any) {
      console.error("Error creating label:", error);
      
      // Handle duplicate label name (unique constraint violation)
      if (error.code === '23505' || error.constraint_name === 'labels_name_unique') {
        return res.status(409).json({ 
          message: "Label with this name already exists",
          error: "DUPLICATE_LABEL_NAME"
        });
      }
      
      res.status(500).json({ 
        message: "Failed to create label", 
        error: error.message || "Unknown error"
      });
    }
  });

  app.patch("/api/labels/:id", async (req, res) => {
    try {
      const label = await storage.updateLabel(req.params.id, req.body);
      res.json(label);
    } catch (error) {
      res.status(500).json({ message: "Failed to update label" });
    }
  });

  app.delete("/api/labels/:id", async (req, res) => {
    try {
      await storage.deleteLabel(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete label" });
    }
  });

  // Chat routes
  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      const cacheKey = `user:${user.id}:chats`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const chats = await storage.getChatsForUser(user.id);
      await setCache(cacheKey, chats, 180); // Cache for 3 minutes
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.get("/api/chats/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const chats = await storage.searchChats(req.user.id, q);
      res.json(chats);
    } catch (error) {
      console.error("Error searching chats:", error);
      res.status(500).json({ message: "Failed to search chats" });
    }
  });

  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const chatId = req.params.chatId;
      
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;
      
      // Try cache only for first page (most common case)
      const cacheKey = `chat:${chatId}:messages:page${page}:limit${limit}`;
      
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // If page > 1, don't cache (edge case for older messages)
      const messages = await storage.getMessages(chatId, limit, offset);
      
      // Get total count using a more efficient single query with COUNT
      const countResult = await storage.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.messages)
        .where(eq(schema.messages.chatId, chatId));
      
      const total = countResult[0]?.count || 0;
      
      const result = {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
      // Cache only first page for 30 seconds
      if (page === 1) {
        await setCache(cacheKey, result, 30);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      
      const { name, type, participantIds, description, avatar } = req.body;
      
      // Ensure name is provided for group chats
      if (type === "group" && !name) {
        return res.status(400).json({ message: "Group name is required" });
      }

      // Ensure participants are provided (at least the owner)
      const allParticipants = Array.from(new Set([...(participantIds || []), user.id]));
      
      const chat = await storage.createChat({
        name: type === "group" ? name : null,
        type: type || "direct",
        description,
        avatar,
        ownerId: user.id
      }, allParticipants);
      
      // Invalidate cache for all participants
      for (const participantId of allParticipants) {
        await delCache(`user:${participantId}:chats`);
      }
      
      // Return chat with participants for immediate UI update
      const participants = (await Promise.all(
        allParticipants.map(id => storage.getUser(id))
      )).filter(Boolean);

      const chatWithDetails = {
        ...chat,
        participants,
        lastMessage: null
      };

      res.status(201).json(chatWithDetails);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.patch("/api/chats/:chatId", async (req, res) => {
    try {
      const { participantIds, ...update } = req.body;
      const chat = await storage.updateChat(req.params.chatId, update);
      
      if (participantIds && Array.isArray(participantIds)) {
        await storage.updateChatParticipants(req.params.chatId, participantIds);
      }
      
      // Notify participants about chat update
      const updatedChat = await storage.getChat(req.params.chatId);
      const participants = await storage.getChatParticipants(req.params.chatId);
      participants.forEach(p => {
        io.to(`user:${p.userId}`).emit("chat-update", updatedChat);
      });
      
      res.json(updatedChat);
    } catch (error) {
      console.error("Error updating chat:", error);
      res.status(500).json({ message: "Failed to update chat" });
    }
  });

  // Delete chat
  app.delete("/api/chats/:chatId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const chatId = req.params.chatId;
      
      // Delete chat - storage should handle cascade deletion of messages and participants
      await storage.deleteChat(chatId);
      
      // Invalidate cache
      await delCache(`chat:${chatId}:messages`);
      await delCache(`user:${req.user.id}:chats`);
      
      // Notify participants about chat deletion
      io.to(`chat:${chatId}`).emit("chat-deleted", { chatId });
      
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat:", error);
      res.status(500).json({ message: "Failed to delete chat" });
    }
  });

  // Leave chat (for groups)
  app.post("/api/chats/:chatId/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const chatId = req.params.chatId;
      const userId = req.user.id;
      
      // Get current participants
      const participants = await storage.getChatParticipants(chatId);
      const participantIds = participants.filter(p => p.userId !== userId).map(p => p.userId);
      
      if (participantIds.length === 0) {
        // If no one left, delete the chat
        await storage.deleteChat(chatId);
        res.json({ message: "Chat deleted" });
        return;
      }
      
      // Update chat participants (remove current user)
      await storage.updateChatParticipants(chatId, participantIds);
      
      // Notify
      io.to(`chat:${chatId}`).emit("chat-update", { chatId, participants: participantIds });
      
      res.json({ message: "Left chat successfully" });
    } catch (error) {
      console.error("Error leaving chat:", error);
      res.status(500).json({ message: "Failed to leave chat" });
    }
  });

  app.post("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      
      const message = await storage.createMessage({
        chatId: req.params.chatId,
        senderId: user.id,
        content: req.body.content,
        attachments: req.body.attachments || [],
        replyToId: req.body.replyToId || null
      });
      
      // Emit to all users in the chat room
      io.to(`chat:${req.params.chatId}`).emit("new-message", message);
      
      // Invalidate cache for this chat
      await delCache(`chat:${req.params.chatId}:messages`);
      
      // Also notify each participant individually (for chat list updates)
      const participants = await storage.getChatParticipants(req.params.chatId);
      const participantUserIds = participants.map(p => p.userId);
      
      // Check for @mentions in message content
      const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
      const mentions = message.content.match(mentionRegex);
      if (mentions && mentions.length > 0) {
        const allUsers = await storage.getAllUsers();
        for (const mention of mentions) {
          const username = mention.substring(1); // Remove @
          const mentionedUser = allUsers.find(u => u.username === username || u.email === username);
          if (mentionedUser && mentionedUser.id !== user.id && participantUserIds.includes(mentionedUser.id)) {
            await sendNotification(
              mentionedUser.id,
              user.id,
              'chat',
              'Вас упомянули в чате',
              {
                action: 'mentioned',
                userName: formatUserName(user as any),
                fieldName: 'Сообщение',
                commentPreview: message.content.substring(0, 100),
              },
              `/chat?id=${req.params.chatId}`
            );
          }
        }
      }
      
      participants.forEach(p => {
        io.to(`user:${p.userId}`).emit("chat-update", {
          chatId: req.params.chatId,
          lastMessage: message
        });

        // Trigger push notification for others
        if (p.userId !== user.id) {
          io.to(`user:${p.userId}`).emit("push-notification", {
            title: `Новое сообщение от ${(user as any).firstName || (user as any).username}`,
            body: message.content,
            url: `/chat?id=${req.params.chatId}`
          });
        }
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.patch("/api/messages/:messageId", async (req, res) => {
    try {
      const { content } = req.body;
      const message = await storage.updateMessage(req.params.messageId, content);
      
      // Notify participants about message update
      const participants = await storage.getChatParticipants(message.chatId);
      participants.forEach(p => {
        io.to(`user:${p.userId}`).emit("message-updated", message);
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete("/api/messages/:messageId", async (req, res) => {
    try {
      const message = await storage.getMessage(req.params.messageId);
      if (!message) return res.status(404).json({ message: "Message not found" });

      await storage.deleteMessage(req.params.messageId);
      
      // Notify participants about message deletion
      const participants = await storage.getChatParticipants(message.chatId);
      participants.forEach(p => {
        io.to(`user:${p.userId}`).emit("message-deleted", {
          messageId: req.params.messageId,
          chatId: message.chatId
        });
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.post("/api/chats/:chatId/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;

      await storage.markChatMessagesAsRead(req.params.chatId, user.id);
      
      // Emit read event
      io.to(`chat:${req.params.chatId}`).emit("messages-read", {
        chatId: req.params.chatId,
        userId: user.id
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Chat Folder routes
  app.get("/api/chat-folders", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      const foldersWithItems = await storage.getChatFolders(user.id);
      res.json(foldersWithItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat folders" });
    }
  });

  app.post("/api/chat-folders", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      
      const { name, icon, chatIds } = req.body;
      const folder = await storage.createChatFolder({
        userId: user.id,
        name,
        icon
      });
      
      if (chatIds && Array.isArray(chatIds)) {
        await storage.setChatFolderItems(folder.id, chatIds);
      }
      
      res.status(201).json({ ...folder, chatIds: chatIds || [] });
    } catch (error) {
      res.status(500).json({ message: "Failed to create chat folder" });
    }
  });

  app.patch("/api/chat-folders/:id", async (req, res) => {
    try {
      const { name, icon, chatIds } = req.body;
      const folder = await storage.updateChatFolder(req.params.id, { name, icon });
      
      if (chatIds && Array.isArray(chatIds)) {
        await storage.setChatFolderItems(req.params.id, chatIds);
      }
      
      const updatedChatIds = await storage.getChatFolderItems(req.params.id);
      res.json({ ...folder, chatIds: updatedChatIds });
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat folder" });
    }
  });

  app.delete("/api/chat-folders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      await storage.deleteChatFolder(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat folder" });
    }
  });

  // Call routes
  app.get("/api/calls", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      const calls = await storage.getCallsForUser(user.id);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call history" });
    }
  });

  app.post("/api/calls", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      
      const call = await storage.createCall({
        ...req.body,
        callerId: user.id,
        startedAt: new Date()
      });
      res.status(201).json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to create call record" });
    }
  });

  app.patch("/api/calls/:id", async (req, res) => {
    try {
      const call = await storage.updateCall(req.params.id, {
        ...req.body,
        endedAt: req.body.status !== 'active' ? new Date() : undefined
      });
      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to update call record" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const cacheKey = `user:${user.id}:notifications:page${page}:limit${limit}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const [notifications, total] = await Promise.all([
        storage.getNotifications(user.id, limit, offset),
        storage.getNotificationsCount(user.id)
      ]);

      const result = {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      await setCache(cacheKey, result, 60); // Cache for 1 minute
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const parsed = insertNotificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid notification data", errors: parsed.error.errors });
      }

      const notification = await storage.createNotification(parsed.data);
      
      // Notify user via socket
      io.to(`user:${parsed.data.userId}`).emit("new-notification", notification);
      
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      await storage.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      await storage.deleteNotification(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Push subscription endpoints
  app.post("/api/notifications/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription" });
      }

      // Store subscription in database (we would need a push_subscriptions table)
      // For now, we'll just return success
      console.log("[Push] New subscription from user:", req.user!.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ message: "Failed to subscribe to push" });
    }
  });

  app.delete("/api/notifications/unsubscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { endpoint } = req.body;
      console.log("[Push] Unsubscribed:", req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ message: "Failed to unsubscribe from push" });
    }
  });

  // Reorder tasks
  app.post("/api/tasks/reorder", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) {
        return res.status(400).json({ message: "Tasks must be an array" });
      }
      
      await storage.updateTaskOrders(tasks);
      res.json({ message: "Tasks reordered successfully" });
    } catch (error) {
      console.error("Error reordering tasks:", error);
      res.status(500).json({ message: "Failed to reorder tasks" });
    }
  });

  // Reorder columns
  app.post("/api/columns/reorder", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const { columns } = req.body;
      if (!Array.isArray(columns)) {
        return res.status(400).json({ message: "Columns must be an array" });
      }
      
      // Update each column's order
      for (const col of columns) {
        if (col.id && typeof col.order === 'number') {
          await storage.updateBoardColumn(col.id, { order: col.order });
        }
      }
      
      // Invalidate board cache
      const { invalidatePattern } = await import("./redis");
      await invalidatePattern("board:*");
      
      res.json({ message: "Columns reordered successfully" });
    } catch (error) {
      console.error("Error reordering columns:", error);
      res.status(500).json({ message: "Failed to reorder columns" });
    }
  });

  app.get("/api/tasks/:taskId/subtasks", async (req, res) => {
    try {
      const cacheKey = `task:${req.params.taskId}:subtasks`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const subtasks = await storage.getSubtasksByTask(req.params.taskId);

      // Оптимизация: получаем всех авторов одним запросом
      const authorIds = Array.from(new Set(subtasks.map((s: any) => s.authorId).filter(Boolean)));
      const authors = authorIds.length > 0 ? await storage.getUsersByIds(authorIds as string[]) : [];
      const authorMap = new Map(authors.map((a: any) => [a.id, a]));

      const enrichedSubtasks = subtasks.map((subtask: any) => {
        if (subtask.authorId) {
          const author: any = authorMap.get(subtask.authorId);
          return {
            ...subtask,
            author: author ? {
              name: `${author.firstName || ""} ${author.lastName || ""}`.trim() || author.username,
              avatar: author.avatar
            } : null
          };
        }
        return { ...subtask, author: null };
      });

      await setCache(cacheKey, enrichedSubtasks, 300); // Cache for 5 minutes
      res.json(enrichedSubtasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/tasks/:taskId/subtasks", async (req, res) => {
    console.log("[Subtasks] POST request received");
    console.log("[Subtasks] Request body:", req.body);
    console.log("[Subtasks] Task ID:", req.params.taskId);
    console.log("[Subtasks] Is authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log("[Subtasks] User not authenticated");
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    try {
      const userId = req.user!.id;
      console.log("[Subtasks] Creating subtask with userId:", userId);
      
      const subtaskData = {
        taskId: req.params.taskId,
        title: req.body.title,
        isCompleted: req.body.isCompleted || false,
        order: req.body.order || 0,
        authorId: userId
      };
      console.log("[Subtasks] Subtask data:", subtaskData);
      
      const subtask = await storage.createSubtask(subtaskData);
      
      // Record subtask creation in task history
      try {
        await storage.addTaskHistory({
          taskId: req.params.taskId,
          userId: userId,
          action: 'subtask_created',
          fieldName: 'Подзадача',
          newValue: req.body.title,
        });
      } catch (error) {
        console.error("Error recording subtask history:", error);
      }
      
      console.log("[Subtasks] Created subtask:", subtask);
      
      // Получаем данные об авторе для ответа
      const authorUser = await storage.getUser(userId);
      const author = authorUser ? {
        name: `${authorUser.firstName || ""} ${authorUser.lastName || ""}`.trim() || authorUser.username,
        avatar: authorUser.avatar
      } : null;
      
      console.log("[Subtasks] Author:", author);
      
      // Инвалидируем кэш доски
      await invalidatePattern(`board:full:*`);
      // Инвалидируем кэш подзадач для этой задачи
      await invalidatePattern(`task:${req.params.taskId}:subtasks`);
      
      res.status(201).json({ ...subtask, author });
    } catch (error) {
      console.error("[Subtasks] Error creating subtask:", error);
      res.status(500).json({ message: "Failed to create subtask" });
    }
  });

  app.patch("/api/subtasks/:id", async (req, res) => {
    try {
      const subtask = await storage.updateSubtask(req.params.id, req.body);
      
      // Инвалидируем кэш
      await invalidatePattern(`board:full:*`);
      // Инвалидируем кэш подзадач для этой задачи
      await invalidatePattern(`task:${subtask.taskId}:subtasks`);
      
      res.json(subtask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subtask" });
    }
  });

  app.delete("/api/subtasks/:id", async (req, res) => {
    try {
      const subtask = await storage.getSubtask(req.params.id);
      
      await storage.deleteSubtask(req.params.id);
      
      // Invalidate board cache
      await invalidatePattern(`board:full:*`);
      
      // Invalidate specific task subtasks cache
      if (subtask) {
        await invalidatePattern(`task:${subtask.taskId}:subtasks`);
      } else {
        await invalidatePattern(`task:*:subtasks`);
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("[Subtasks] Error deleting subtask:", error);
      res.status(500).json({ message: "Failed to delete subtask" });
    }
  });

  // Comment routes
  app.get("/api/tasks/:taskId/comments", async (req, res) => {
    try {
      const cacheKey = `task:${req.params.taskId}:comments`;
      console.log(`[Comments] Fetching comments for task ${req.params.taskId}`);
      const cached = await getCache(cacheKey);
      if (cached) {
        const cachedArray = cached as any[];
        console.log(`[Comments] Returning cached comments: ${cachedArray.length} items`);
        return res.json(cached);
      }
      console.log(`[Comments] Cache miss, fetching from DB`);

      const rawComments = await storage.getCommentsByTask(req.params.taskId);

      // Оптимизация: получаем всех авторов одним запросом
      const authorIds = Array.from(new Set(rawComments.map((c: any) => c.authorId).filter(Boolean)));
      const authors = authorIds.length > 0 ? await storage.getUsersByIds(authorIds as string[]) : [];
      const authorMap = new Map(authors.map((a: any) => [a.id, a]));

      const comments = rawComments.map((comment: any) => {
        const author: any = authorMap.get(comment.authorId);
        return {
          ...comment,
          author: author ? {
            name: `${author.firstName || ""} ${author.lastName || ""}`.trim() || author.username,
            avatar: author.avatar
          } : { name: "Неизвестно" }
        };
      });

      console.log(`[Comments] Fetched ${comments.length} comments from DB`);
      await setCache(cacheKey, comments, 300); // Cache for 5 minutes
      console.log(`[Comments] Cached comments for task ${req.params.taskId}`);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/tasks/:taskId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const comment = await storage.createComment({
        ...req.body,
        taskId: req.params.taskId,
        authorId: req.user.id
      });

      // Clear comments cache for this task
      console.log(`[Comments] Clearing cache for task ${req.params.taskId}`);
      await delCache(`task:${req.params.taskId}:comments`);
      console.log(`[Comments] Cache cleared for task ${req.params.taskId}`);
      
      // Record comment in task history
      try {
        await storage.addTaskHistory({
          taskId: req.params.taskId,
          userId: req.user.id,
          action: 'comment_added',
          fieldName: 'Комментарий',
          newValue: req.body.content?.substring(0, 100) || '',
        });
      } catch (error) {
        console.error("Error recording comment history:", error);
      }

      // Get task details for notifications
      const task = await storage.getTask(req.params.taskId);
      if (task) {
        const board = await storage.getBoard(task.boardId);
        const authorName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.username;

        // Notify assignee (if not the comment author)
        if (task.assigneeId && task.assigneeId !== req.user.id) {
          await sendNotification(
            task.assigneeId,
            req.user.id,
            'task_comment',
            'Новый комментарий',
            {
              action: 'comment_added',
              userName: authorName,
              fieldName: 'Комментарий',
              commentPreview: req.body.content?.substring(0, 50) || '',
              taskTitle: task.title,
              boardName: board?.name,
            },
            `/boards/${task.boardId}`
          );
        }

        // Notify reporter (if not the comment author and not already notified as assignee)
        if (task.reporterId && task.reporterId !== req.user.id && task.reporterId !== task.assigneeId) {
          await sendNotification(
            task.reporterId,
            req.user.id,
            'task_comment',
            'Новый комментарий',
            {
              action: 'comment_added',
              userName: authorName,
              fieldName: 'Комментарий',
              commentPreview: req.body.content?.substring(0, 50) || '',
              taskTitle: task.title,
              boardName: board?.name,
            },
            `/boards/${task.boardId}`
          );
        }

        // Check for @mentions in comment content
        const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
        const mentions = req.body.content?.match(mentionRegex);
        if (mentions && mentions.length > 0) {
          const allUsers = await storage.getAllUsers();
          const notifiedUserIds = new Set([task.assigneeId, task.reporterId, req.user.id].filter(Boolean));
          
          for (const mention of mentions) {
            const username = mention.substring(1); // Remove @
            const mentionedUser = allUsers.find(u => u.username === username || u.email === username);
            if (mentionedUser && !notifiedUserIds.has(mentionedUser.id)) {
              await sendNotification(
                mentionedUser.id,
                req.user.id,
                'task',
                'Вас упомянули в комментарии',
                {
                  action: 'mentioned',
                  userName: authorName,
                  fieldName: 'Комментарий',
                  commentPreview: req.body.content?.substring(0, 100) || '',
                  taskTitle: task.title,
                  boardName: board?.name,
                },
                `/boards/${task.boardId}`
              );
              notifiedUserIds.add(mentionedUser.id);
            }
          }
        }
      }
      
      // Возвращаем обогащенный комментарий
      const author = req.user;
      res.status(201).json({
        ...comment,
        author: { 
          name: `${author.firstName || ""} ${author.lastName || ""}`.trim() || author.username, 
          avatar: author.avatar 
        }
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      // Get comment before deletion to clear cache
      const comment = await storage.getComment(req.params.id);
      if (comment) {
        await storage.deleteComment(req.params.id);
        // Clear comments cache for this task
        await delCache(`task:${comment.taskId}:comments`);
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Comment Mentions routes
  app.get("/api/user/mentions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const mentions = await storage.getMentionsByUser(req.user.id);
      res.json(mentions);
    } catch (error) {
      console.error("Error fetching mentions:", error);
      res.status(500).json({ message: "Failed to fetch mentions" });
    }
  });

  app.get("/api/user/mentioned-comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const comments = await storage.getCommentsWithMentions(req.user.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching mentioned comments:", error);
      res.status(500).json({ message: "Failed to fetch mentioned comments" });
    }
  });

  // Task Observer routes
  app.get("/api/tasks/:taskId/observers", async (req, res) => {
    try {
      const observers = await storage.getObserversByTask(req.params.taskId);
      res.json(observers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch observers" });
    }
  });

  app.post("/api/tasks/:taskId/observers", async (req, res) => {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: "userIds must be an array" });
      }
      await storage.updateTaskObservers(req.params.taskId, userIds);
      const updatedObservers = await storage.getObserversByTask(req.params.taskId);
      res.json(updatedObservers);
    } catch (error) {
      res.status(500).json({ message: "Failed to update observers" });
    }
  });

  // Note: Label routes are already defined earlier in the file (around line 543)

  // ==================== REPORT ROUTES ====================

  app.get("/api/reports/overview", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { workspaceId, projectId, boardId, userId, dateFrom, dateTo } = req.query;
      const data = await getReportOverview(
        storage.db,
        workspaceId as string,
        projectId as string,
        boardId as string,
        userId as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching overview report:", error);
      res.status(500).json({ message: "Failed to fetch overview report" });
    }
  });

  app.get("/api/reports/workspaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { workspaceId, projectId, boardId, userId, dateFrom, dateTo } = req.query;
      const data = await getReportWorkspaces(
        storage.db,
        workspaceId as string,
        projectId as string,
        boardId as string,
        userId as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching workspaces report:", error);
      res.status(500).json({ message: "Failed to fetch workspaces report" });
    }
  });

  app.get("/api/reports/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { workspaceId, projectId, boardId, userId, dateFrom, dateTo } = req.query;
      const data = await getReportProjects(
        storage.db,
        workspaceId as string,
        projectId as string,
        boardId as string,
        userId as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching projects report:", error);
      res.status(500).json({ message: "Failed to fetch projects report" });
    }
  });

  app.get("/api/reports/boards", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { projectId, boardId, userId, dateFrom, dateTo } = req.query;
      const data = await getReportBoards(
        storage.db,
        projectId as string,
        boardId as string,
        userId as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching boards report:", error);
      res.status(500).json({ message: "Failed to fetch boards report" });
    }
  });

  app.get("/api/reports/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { workspaceId, projectId, boardId, userId, dateFrom, dateTo } = req.query;
      const data = await getReportUsers(
        storage.db,
        workspaceId as string,
        projectId as string,
        boardId as string,
        userId as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching users report:", error);
      res.status(500).json({ message: "Failed to fetch users report" });
    }
  });

  app.get("/api/reports/tasks/time-tracking", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { workspaceId, projectId, boardId, userId, dateFrom, dateTo } = req.query;
      
      // Get all tasks from database
      let tasks = await storage.db.select().from(schema.tasks);
      
      // Filter by board if specified
      if (boardId) {
        tasks = tasks.filter((t: any) => t.boardId === boardId);
      }
      
      // Filter by user if specified
      if (userId) {
        tasks = tasks.filter((t: any) => t.assigneeId === userId);
      }

      const taskIds = tasks.map((t: any) => t.id);

      // Get all status history and filter by task IDs in JS
      let allHistory = await storage.db.select().from(schema.taskStatusHistory);
      allHistory = allHistory.filter((h: any) => taskIds.includes(h.taskId));
      
      // Filter by date range if specified
      const fromDate = dateFrom ? new Date(dateFrom as string) : null;
      const toDate = dateTo ? new Date(dateTo as string) : new Date();
      
      if (fromDate && toDate) {
        allHistory = allHistory.filter((h: any) => {
          const enteredAt = new Date(h.enteredAt);
          const exitedAt = h.exitedAt ? new Date(h.exitedAt) : null;
          
          // Entry overlaps with period if enteredAt <= toDate AND (exitedAt is null OR exitedAt >= fromDate)
          if (enteredAt > toDate) return false;
          if (exitedAt && exitedAt < fromDate) return false;
          
          return true;
        });
      }

      // Aggregate by status
      const statusStats = new Map<string, { taskIds: Set<string>, totalSeconds: number }>();
      const defaultStatuses = ['В планах', 'В работе', 'На проверке', 'Готово'];
      
      for (const status of defaultStatuses) {
        statusStats.set(status, { taskIds: new Set(), totalSeconds: 0 });
      }

      for (const entry of allHistory) {
        let russianStatus = entry.status;
        
        // Convert English statuses to Russian
        if (entry.status === 'todo') russianStatus = 'В планах';
        else if (entry.status === 'in_progress') russianStatus = 'В работе';
        else if (entry.status === 'done') russianStatus = 'Готово';
        
        if (!statusStats.has(russianStatus)) {
          statusStats.set(russianStatus, { taskIds: new Set(), totalSeconds: 0 });
        }
        
        const stats = statusStats.get(russianStatus)!;
        stats.taskIds.add(entry.taskId);
        
        let duration = entry.durationSeconds || 0;
        if (!entry.exitedAt && entry.enteredAt) {
          duration = Math.floor((new Date().getTime() - new Date(entry.enteredAt).getTime()) / 1000);
        }
        stats.totalSeconds += duration;
      }

      const result = Array.from(statusStats.entries())
        .map(([status, stats]) => ({
          status,
          taskCount: stats.taskIds.size,
          totalSeconds: stats.totalSeconds
        }))
        .sort((a, b) => {
          const order = ['В планах', 'В работе', 'На проверке', 'Готово'];
          const aIndex = order.indexOf(a.status);
          const bIndex = order.indexOf(b.status);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

      res.json({ statusReport: result });
    } catch (error) {
      console.error("Error fetching tasks time tracking:", error);
      res.status(500).json({ message: "Failed to fetch tasks time tracking", error: String(error) });
    }
  });

  // ==================== POINTS SYSTEM ENDPOINTS ====================

  // Points Settings
  app.get("/api/points-settings", async (req, res) => {
    try {
      const settings = await storage.getPointsSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error getting points settings:", error);
      res.status(500).json({ message: "Failed to get points settings" });
    }
  });

  app.post("/api/points-settings", async (req, res) => {
    try {
      const { statusName, pointsAmount, maxTimeInStatus, isActive } = req.body;
      
      if (!statusName || pointsAmount === undefined) {
        return res.status(400).json({ message: "statusName and pointsAmount are required" });
      }

      const setting = await storage.createPointsSetting({
        statusName,
        pointsAmount,
        maxTimeInStatus: maxTimeInStatus || 0,
        isActive: isActive !== false
      });
      
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating points setting:", error);
      res.status(500).json({ message: "Failed to create points setting" });
    }
  });

  app.patch("/api/points-settings/:id", async (req, res) => {
    try {
      const { statusName, pointsAmount, maxTimeInStatus, isActive } = req.body;
      const setting = await storage.updatePointsSetting(req.params.id, {
        statusName,
        pointsAmount,
        maxTimeInStatus,
        isActive
      });
      res.json(setting);
    } catch (error) {
      console.error("Error updating points setting:", error);
      res.status(500).json({ message: "Failed to update points setting" });
    }
  });

  app.delete("/api/points-settings/:id", async (req, res) => {
    try {
      await storage.deletePointsSetting(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting points setting:", error);
      res.status(500).json({ message: "Failed to delete points setting" });
    }
  });

  // Accrual Rules
  app.get("/api/accrual-rules", async (req, res) => {
    try {
      const rules = await storage.getAccrualRules();
      res.json(rules);
    } catch (error) {
      console.error("Error getting accrual rules:", error);
      res.status(500).json({ message: "Failed to get accrual rules" });
    }
  });

  app.post("/api/accrual-rules", async (req, res) => {
    try {
      const { name, type, pointsAmount, description, isActive } = req.body;

      if (!name || !type || pointsAmount === undefined) {
        return res.status(400).json({ message: "name, type, and pointsAmount are required" });
      }

      const rule = await storage.createAccrualRule({
        name,
        type,
        pointsAmount: parseInt(pointsAmount) || 0,
        description,
        isActive: isActive !== false,
      });

      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating accrual rule:", error);
      res.status(500).json({ message: "Failed to create accrual rule" });
    }
  });

  app.patch("/api/accrual-rules/:id", async (req, res) => {
    try {
      const { name, type, pointsAmount, description, isActive } = req.body;
      const rule = await storage.updateAccrualRule(req.params.id, {
        name,
        type,
        pointsAmount: pointsAmount !== undefined ? parseInt(pointsAmount) : undefined,
        description,
        isActive,
      });
      res.json(rule);
    } catch (error) {
      console.error("Error updating accrual rule:", error);
      res.status(500).json({ message: "Failed to update accrual rule" });
    }
  });

  app.delete("/api/accrual-rules/:id", async (req, res) => {
    try {
      await storage.deleteAccrualRule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting accrual rule:", error);
      res.status(500).json({ message: "Failed to delete accrual rule" });
    }
  });

  // User Points
  app.get("/api/users/me/points", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const points = await storage.getUserPoints(req.user!.id);
      res.json(points);
    } catch (error) {
      console.error("Error getting user points:", error);
      res.status(500).json({ message: "Failed to get user points" });
    }
  });

  app.get("/api/users/me/points-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { type, limit, offset } = req.query;
      const transactions = await storage.getUserTransactions(req.user!.id, {
        type: type as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      res.json(transactions);
    } catch (error) {
      console.error("Error getting points history:", error);
      res.status(500).json({ message: "Failed to get points history" });
    }
  });

  // Update user points (add/subtract)
  app.post("/api/users/:id/points", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { amount, operation, comment } = req.body;
      const userId = req.params.id;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentBalance = user.pointsBalance || 0;
      const pointsChange = operation === "subtract" ? -Math.abs(amount) : Math.abs(amount);
      const newBalance = currentBalance + pointsChange;
      
      // Update user points
      await storage.updateUser(userId, { pointsBalance: Math.max(0, newBalance) });
      
      // Create transaction record with changedBy
      await storage.createTransaction({
        userId,
        amount: pointsChange,
        type: operation === "subtract" ? "spent" : "earned",
        description: comment || (operation === "subtract" ? "Списание баллов" : "Начисление баллов"),
        changedBy: req.user!.id,
      });
      
      res.json({ success: true, newBalance: Math.max(0, newBalance) });
    } catch (error) {
      console.error("Error updating user points:", error);
      res.status(500).json({ message: "Failed to update user points" });
    }
  });

  // Get user status history
  app.get("/api/users/:id/status-history", async (req, res) => {
    try {
      const history = await storage.getUserStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error getting user status history:", error);
      res.status(500).json({ message: "Failed to get user status history" });
    }
  });

  // Get user points history
  app.get("/api/users/:id/points-history", async (req, res) => {
    try {
      const history = await storage.getUserTransactions(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error getting user points history:", error);
      res.status(500).json({ message: "Failed to get user points history" });
    }
  });

  // Shop
  app.get("/api/shop/items", async (req, res) => {
    try {
      const items = await storage.getShopItems();
      res.json(items);
    } catch (error) {
      console.error("Error getting shop items:", error);
      res.status(500).json({ message: "Failed to get shop items" });
    }
  });

  app.post("/api/shop/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { itemId, quantity = 1 } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ message: "itemId is required" });
      }

      // Get user points
      const userPoints = await storage.getUserPoints(req.user!.id);
      
      // Get item
      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      const totalCost = item.cost * quantity;

      // Check balance
      if (userPoints.balance < totalCost) {
        return res.status(400).json({ message: "Insufficient points balance" });
      }

      // Create purchase
      const purchase = await storage.createPurchase({
        userId: req.user!.id,
        itemId,
        quantity,
        totalCost,
        status: "pending"
      });

      // Create transaction
      await storage.createTransaction({
        userId: req.user!.id,
        type: "spent",
        amount: -totalCost,
        description: `Покупка "${item.name}"`
      });

      // Update user points
      await storage.updateUserPoints(req.user!.id, -totalCost);

      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get("/api/shop/purchases", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const purchases = await storage.getUserPurchases(req.user!.id);
      res.json(purchases);
    } catch (error) {
      console.error("Error getting purchases:", error);
      res.status(500).json({ message: "Failed to get purchases" });
    }
  });

  // ==================== DASHBOARD ENDPOINT ====================
  app.get("/api/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Get user's tasks with their boards and projects
      const userTasks = await storage.db
        .select({
          task: schema.tasks,
          board: schema.boards,
          project: schema.projects
        })
        .from(schema.tasks)
        .leftJoin(schema.boards, eq(schema.tasks.boardId, schema.boards.id))
        .leftJoin(schema.projects, eq(schema.boards.projectId, schema.projects.id))
        .where(eq(schema.tasks.assigneeId, userId));
      
      const tasks = userTasks.map(r => r.task);
      
      // Calculate statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'Готово' || t.status === 'done').length;
      const inProgressTasks = tasks.filter((t: any) => t.status === 'В работе' || t.status === 'in_progress').length;
      const plannedTasks = tasks.filter((t: any) => t.status === 'В планах' || t.status === 'backlog').length;
      
      // Calculate completion rate for velocity
      const velocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Get today's tasks (due today or high priority)
      const todayTasks = tasks
        .filter((t: any) => {
          const dueDate = t.dueDate ? new Date(t.dueDate) : null;
          const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
          const isHighPriority = t.priority === 'high' || t.priorityId === 'high';
          const isInProgress = t.status === 'В работе' || t.status === 'in_progress';
          return isDueToday || isHighPriority || isInProgress;
        })
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          projectName: userTasks.find((ut: any) => ut.task.id === t.id)?.project?.name || 'Без проекта'
        }));
      
      // Get weekly performance data
      const performanceData = [];
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = dayNames[date.getDay()];
        
        const completedOnDay = tasks.filter((t: any) => {
          if (t.status !== 'Готово' && t.status !== 'done') return false;
          const updatedAt = t.updatedAt ? new Date(t.updatedAt) : null;
          return updatedAt && updatedAt.toDateString() === date.toDateString();
        }).length;
        
        performanceData.push({ name: dayName, tasks: completedOnDay });
      }
      
      // Get team members and their workload
      const teamMembers = await storage.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          avatar: schema.users.avatar,
          position: schema.users.position
        })
        .from(schema.users)
        .where(eq(schema.users.isActive, true))
        .limit(5);
      
      const teamWorkload = await Promise.all(
        teamMembers.map(async (member: any) => {
          const memberTasks = await storage.db
            .select()
            .from(schema.tasks)
            .where(eq(schema.tasks.assigneeId, member.id));
          
          const memberTotal = memberTasks.length;
          const memberCompleted = memberTasks.filter((t: any) => t.status === 'Готово' || t.status === 'done').length;
          const progress = memberTotal > 0 ? Math.round((memberCompleted / memberTotal) * 100) : 0;
          
          return {
            id: member.id,
            name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Без имени',
            role: member.position || 'Сотрудник',
            progress,
            avatar: member.firstName?.[0] || '' + (member.lastName?.[0] || '')
          };
        })
      );
      
      // Get recent projects
      const recentProjects = await storage.db
        .select({
          id: schema.projects.id,
          name: schema.projects.name,
          description: schema.projects.description,
          status: schema.projects.status,
          createdAt: schema.projects.createdAt
        })
        .from(schema.projects)
        .orderBy(desc(schema.projects.createdAt))
        .limit(3);
      
      res.json({
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          plannedTasks,
          velocity
        },
        todayTasks,
        performanceData,
        teamWorkload,
        recentProjects
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // ==================== CALENDAR EVENTS ENDPOINTS ====================
  app.get("/api/calendar/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const events = await storage.getCalendarEvents(userId, start, end);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { title, description, date, time, type, contact, meetingUrl, roomId, reminder, reminderMinutes } = req.body;
      
      console.log("[Calendar Event] Request body:", req.body);
      
      if (!title || !date || !time) {
        return res.status(400).json({ message: "Title, date and time are required" });
      }

      const event = await storage.createCalendarEvent({
        userId: req.user!.id,
        roomId: roomId || null,
        title,
        description,
        date: new Date(date),
        time,
        type: type || "work",
        contact,
        meetingUrl,
        reminder: reminder || false,
        reminderMinutes: reminderMinutes || null
      });

      console.log("[Calendar Event] Created event:", event.id, "roomId:", event.roomId);

      // If event is created in a chat room, send system message to the chat
      if (roomId) {
        console.log("[Calendar Event] Processing chat room:", roomId);
        const io = getIO();
        const eventDate = new Date(date);
        const formattedDate = eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        
        const systemMessage = {
          id: crypto.randomUUID(),
          chatId: roomId,
          senderId: req.user!.id,
          content: `📅 Создано событие: ${title}\n${formattedDate} в ${time}`,
          type: 'system_event',
          eventId: event.id,
          createdAt: new Date().toISOString()
        };
        
        console.log("[Calendar Event] Creating system message in chat:", roomId);
        
        // Save message to DB
        try {
          const savedMessage = await storage.createMessage({
            chatId: roomId,
            senderId: req.user!.id,
            content: systemMessage.content,
            attachments: JSON.stringify([]),
            isRead: false,
            type: 'system_event',
            metadata: JSON.stringify({ eventId: event.id, eventTitle: title, eventTime: time, eventDate: formattedDate })
          } as any);
          console.log("[Calendar Event] Message saved to DB:", savedMessage.id);
          
          // Send to chat room
          io.to(`chat:${roomId}`).emit("new-message", savedMessage);
          io.to(`chat:${roomId}`).emit("calendar:event-created", { event, message: savedMessage });
          console.log("[Calendar Event] Socket events emitted");
        } catch (msgError) {
          console.error("[Calendar Event] Error saving message:", msgError);
        }
      }
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  // Get calendar events by room (chat)
  app.get("/api/rooms/:roomId/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { roomId } = req.params;
      const events = await storage.getCalendarEventsByRoom(roomId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching room calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.patch("/api/calendar/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { title, description, date, time, type, contact, meetingUrl } = req.body;
      
      // Check if event belongs to current user
      const existingEvent = await storage.getCalendarEvent(req.params.id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (existingEvent.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updated = await storage.updateCalendarEvent(req.params.id, {
        title,
        description,
        date: date ? new Date(date) : undefined,
        time,
        type,
        contact,
        meetingUrl
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete("/api/calendar/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      // Check if event belongs to current user
      const existingEvent = await storage.getCalendarEvent(req.params.id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (existingEvent.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteCalendarEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Team Rooms API
  app.get("/api/team-rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const rooms = await storage.getTeamRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching team rooms:", error);
      res.status(500).json({ message: "Failed to fetch team rooms" });
    }
  });

  // Get team rooms with admin status for current user
  app.get("/api/team-rooms/with-admin-status", async (req, res) => {
    console.log("[API] /api/team-rooms/with-admin-status called, user:", req.user?.id);
    if (!req.isAuthenticated()) {
      console.log("[API] Not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      console.log("[API] Fetching rooms for user:", req.user!.id);
      const rooms = await storage.getTeamRooms();
      console.log("[API] Found rooms:", rooms.length);
      
      const roomsWithAdminStatus = await Promise.all(
        rooms.map(async (room) => {
          const isAdmin = await storage.isTeamRoomAdmin(room.id, req.user!.id);
          return { ...room, isAdmin };
        })
      );
      console.log("[API] Returning rooms with admin status:", roomsWithAdminStatus.length);
      res.json(roomsWithAdminStatus);
    } catch (error) {
      console.error("[API] Error fetching team rooms with admin status:", error);
      res.status(500).json({ message: "Failed to fetch team rooms" });
    }
  });

  app.get("/api/team-rooms/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const room = await storage.getTeamRoomById(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }
      res.json(room);
    } catch (error) {
      console.error("Error fetching team room:", error);
      res.status(500).json({ message: "Failed to fetch team room" });
    }
  });

  app.post("/api/team-rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { name, description, slug, accessType, color } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
      }

      // Check if slug already exists
      const existingRoom = await storage.getTeamRoomBySlug(slug);
      if (existingRoom) {
        return res.status(409).json({ message: "Team room with this slug already exists" });
      }

      // Generate invite code
      const inviteCode = generateInviteCode();

      const room = await storage.createTeamRoom({
        name,
        description,
        slug,
        inviteCode,
        accessType: accessType || "open",
        color: color || "#3b82f6",
        createdBy: req.user!.id,
        isActive: true
      });

      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating team room:", error);
      res.status(500).json({ message: "Failed to create team room" });
    }
  });

  app.patch("/api/team-rooms/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { name, description, accessType, color } = req.body;
      
      const existingRoom = await storage.getTeamRoomById(req.params.id);
      if (!existingRoom) {
        return res.status(404).json({ message: "Team room not found" });
      }

      const updated = await storage.updateTeamRoom(req.params.id, {
        name,
        description,
        accessType,
        color
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating team room:", error);
      res.status(500).json({ message: "Failed to update team room" });
    }
  });

  app.delete("/api/team-rooms/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const existingRoom = await storage.getTeamRoomById(req.params.id);
      if (!existingRoom) {
        return res.status(404).json({ message: "Team room not found" });
      }

      await storage.deleteTeamRoom(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team room:", error);
      res.status(500).json({ message: "Failed to delete team room" });
    }
  });

  app.post("/api/team-rooms/:id/regenerate-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const existingRoom = await storage.getTeamRoomById(req.params.id);
      if (!existingRoom) {
        return res.status(404).json({ message: "Team room not found" });
      }

      const updated = await storage.regenerateTeamRoomInviteCode(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code" });
    }
  });

  // Helper function to generate invite code
  function generateInviteCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Call Settings API
  app.get("/api/call-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const settings = await storage.getCallSettings(req.user!.id);
      res.json(settings || {
        userId: req.user!.id,
        micVolume: 100,
        speakerVolume: 100,
        videoQuality: 'medium',
        noiseSuppression: true
      });
    } catch (error) {
      console.error("Error fetching call settings:", error);
      res.status(500).json({ message: "Failed to fetch call settings" });
    }
  });

  app.post("/api/call-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { preferredMic, preferredCamera, preferredSpeaker, micVolume, speakerVolume, videoQuality, noiseSuppression } = req.body;
      
      const settings = await storage.upsertCallSettings({
        userId: req.user!.id,
        preferredMic,
        preferredCamera,
        preferredSpeaker,
        micVolume,
        speakerVolume,
        videoQuality,
        noiseSuppression
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating call settings:", error);
      res.status(500).json({ message: "Failed to update call settings" });
    }
  });

  // Call Participants API
  app.get("/api/team-rooms/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const room = await storage.getTeamRoomById(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }

      const participants = await storage.getCallParticipantsWithUsers(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching call participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  app.post("/api/calls/:roomId/kick", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { userId } = req.body;
      const room = await storage.getTeamRoomById(req.params.roomId);
      
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }

      // Check if user is creator or admin
      const isCreator = room.createdBy === req.user!.id;
      const isAdmin = await storage.isTeamRoomAdmin(req.params.roomId, req.user!.id);
      
      if (!isCreator && !isAdmin) {
        return res.status(403).json({ message: "Only room creator or admins can kick participants" });
      }

      // Cannot kick creator
      if (userId === room.createdBy) {
        return res.status(403).json({ message: "Cannot kick room creator" });
      }

      await storage.kickCallParticipant(req.params.roomId, userId);
      
      // Notify via socket
      const io = getIO();
      io.to(`call-${req.params.roomId}`).emit("call:participant-kicked", { userId, kickedBy: req.user!.id });
      io.to(`user-${userId}`).emit("call:kicked", { roomId: req.params.roomId });

      res.json({ message: "Participant kicked successfully" });
    } catch (error) {
      console.error("Error kicking participant:", error);
      res.status(500).json({ message: "Failed to kick participant" });
    }
  });

  // Team Room Admins API
  app.get("/api/team-rooms/:id/admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const room = await storage.getTeamRoomById(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }

      const admins = await storage.getTeamRoomAdminsWithUsers(req.params.id);
      res.json(admins);
    } catch (error) {
      console.error("Error fetching team room admins:", error);
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  app.post("/api/team-rooms/:id/admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { userId } = req.body;
      const room = await storage.getTeamRoomById(req.params.id);
      
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }

      // Only creator can add admins
      if (room.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Only room creator can add admins" });
      }

      // Cannot add creator as admin (already has all permissions)
      if (userId === room.createdBy) {
        return res.status(400).json({ message: "Room creator is already an admin" });
      }

      const admin = await storage.addTeamRoomAdmin({
        roomId: req.params.id,
        userId,
        grantedBy: req.user!.id
      });

      res.status(201).json(admin);
    } catch (error) {
      console.error("Error adding team room admin:", error);
      res.status(500).json({ message: "Failed to add admin" });
    }
  });

  app.delete("/api/team-rooms/:id/admins/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const room = await storage.getTeamRoomById(req.params.id);
      
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }

      // Only creator can remove admins
      if (room.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Only room creator can remove admins" });
      }

      await storage.removeTeamRoomAdmin(req.params.id, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team room admin:", error);
      res.status(500).json({ message: "Failed to remove admin" });
    }
  });

  // ==================== GUEST INVITATION ROUTES ====================

  // Create guest invitation (requires auth)
  app.post("/api/guest-invitations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { roomId } = req.body;
      if (!roomId) {
        return res.status(400).json({ message: "roomId is required" });
      }
      
      const room = await storage.getTeamRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Team room not found" });
      }
      
      // Check if user is admin of the room
      const isAdmin = await storage.isTeamRoomAdmin(roomId, req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Only room admins can create invitations" });
      }
      
      const invitation = await storage.createGuestInvitation(roomId, req.user!.id, 24);
      
      const inviteUrl = `${req.protocol}://${req.get('host')}/team/${roomId}?invite=${invitation.token}`;
      
      res.json({
        ...invitation,
        inviteUrl
      });
    } catch (error) {
      console.error("Error creating guest invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Get guest invitations for a room (requires auth)
  app.get("/api/guest-invitations/room/:roomId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const isAdmin = await storage.isTeamRoomAdmin(req.params.roomId, req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Only room admins can view invitations" });
      }
      
      const invitations = await storage.getGuestInvitationsByRoom(req.params.roomId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching guest invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Verify guest invitation (public)
  app.get("/api/guest-invitations/:token/verify", async (req, res) => {
    try {
      const invitation = await storage.getGuestInvitationByToken(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ 
          valid: false, 
          message: "Invitation not found" 
        });
      }
      
      // Check if expired
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.json({ 
          valid: false, 
          message: "Invitation has expired" 
        });
      }
      
      // Check if already used
      if (invitation.usedAt) {
        return res.json({ 
          valid: false, 
          message: "Invitation has already been used" 
        });
      }
      
      res.json({
        valid: true,
        invitation: {
          id: invitation.id,
          roomId: invitation.roomId,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      console.error("Error verifying guest invitation:", error);
      res.status(500).json({ message: "Failed to verify invitation" });
    }
  });

  // Use guest invitation (public with device fingerprint)
  app.post("/api/guest-invitations/:token/use", async (req, res) => {
    try {
      const { deviceFingerprint } = req.body;
      
      if (!deviceFingerprint) {
        return res.status(400).json({ message: "deviceFingerprint is required" });
      }
      
      const invitation = await storage.getGuestInvitationByToken(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ 
          success: false,
          message: "Invitation not found" 
        });
      }
      
      // Check if expired
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.json({ 
          success: false,
          message: "Invitation has expired" 
        });
      }
      
      // Check if already used
      if (invitation.usedAt) {
        return res.json({ 
          success: false,
          message: "Invitation has already been used" 
        });
      }
      
      // Bind device fingerprint
      await storage.bindDeviceToInvitation(req.params.token, deviceFingerprint);
      
      // Get room info
      const room = await storage.getTeamRoomById(invitation.roomId);
      
      // Get IP address
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Create guest session
      const session = await storage.createGuestSession(
        invitation.id,
        deviceFingerprint,
        ipAddress,
        24
      );
      
      res.json({
        success: true,
        sessionId: session.id,
        roomId: invitation.roomId,
        roomName: room?.name || 'Team Room'
      });
    } catch (error) {
      console.error("Error using guest invitation:", error);
      res.status(500).json({ message: "Failed to use invitation" });
    }
  });

  // Get guest session (public)
  app.get("/api/guest-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getGuestSessionById(req.params.id);
      
      if (!session) {
        return res.status(404).json({ 
          valid: false,
          message: "Session not found" 
        });
      }
      
      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        return res.json({ 
          valid: false,
          message: "Session has expired" 
        });
      }
      
      // Get invitation to check device fingerprint
      const sessionWithInvitation = await storage.getGuestSessionWithInvitation(req.params.id);
      
      if (!sessionWithInvitation) {
        return res.status(404).json({ 
          valid: false,
          message: "Session not found" 
        });
      }
      
      res.json({
        valid: true,
        session: {
          id: session.id,
          roomId: session.invitationId,
          expiresAt: session.expiresAt
        },
        roomId: sessionWithInvitation.invitation.roomId
      });
    } catch (error) {
      console.error("Error fetching guest session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Verify guest session with device fingerprint (public)
  app.post("/api/guest-sessions/:id/verify", async (req, res) => {
    try {
      const { deviceFingerprint } = req.body;
      
      if (!deviceFingerprint) {
        return res.status(400).json({ 
          valid: false,
          message: "deviceFingerprint is required" 
        });
      }
      
      const session = await storage.getGuestSessionById(req.params.id);
      
      if (!session) {
        return res.status(404).json({ 
          valid: false,
          message: "Session not found" 
        });
      }
      
      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        return res.json({ 
          valid: false,
          message: "Session has expired" 
        });
      }
      
      // Check device fingerprint
      if (session.deviceFingerprint !== deviceFingerprint) {
        return res.json({ 
          valid: false,
          message: "Device mismatch" 
        });
      }
      
      // Get invitation
      const sessionWithInvitation = await storage.getGuestSessionWithInvitation(req.params.id);
      
      if (!sessionWithInvitation) {
        return res.status(404).json({ 
          valid: false,
          message: "Session not found" 
        });
      }
      
      res.json({
        valid: true,
        session: {
          id: session.id,
          roomId: sessionWithInvitation.invitation.roomId,
          expiresAt: session.expiresAt
        }
      });
    } catch (error) {
      console.error("Error verifying guest session:", error);
      res.status(500).json({ message: "Failed to verify session" });
    }
  });

  // End guest session (public)
  app.delete("/api/guest-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getGuestSessionById(req.params.id);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      await storage.deleteGuestSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting guest session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Yandex Calendar routes
  app.use("/api", yandexCalendarRoutes);

  return httpServer;
}
