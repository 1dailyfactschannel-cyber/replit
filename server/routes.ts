import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema, insertNotificationSchema, insertLabelSchema, priorities } from "@shared/schema";
import * as schema from "@shared/schema";
import { setupWebSockets } from "./socket";
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

const storage = getStorage();
let io: SocketIOServer;

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" }
});

// Helper function to send notification
async function sendNotification(userId: string, senderId: string | null, type: string, title: string, message: string, link?: string) {
  try {
    await storage.createNotification({
      userId,
      senderId,
      type,
      title,
      message,
      link: link || null,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    // Get safe extension
    const originalExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(originalExt) ? originalExt : '.bin';
    cb(null, uniqueSuffix + safeExt);
  },
});

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
  io = setupWebSockets(httpServer);
  console.log("Registering API routes...");

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
      const allowedFields = ['firstName', 'lastName', 'avatar', 'department', 'position', 'phone', 'timezone', 'language', 'telegram', 'notes'];
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

  // File upload route
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        url: fileUrl,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      // Invalidate cache
      await delCache("users:all");
      res.json(user);
    } catch (error) {
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

  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
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
            `${creatorName} создал новый проект "${project.name}"`,
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

  app.delete("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    
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
      
      const boardData = { columns, tasks };
      
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

  app.delete("/api/boards/:id", async (req, res) => {
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
      
      // Enrich tasks with board and project info
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
        'title', 'description', 'status', 'priority', 'priorityId', 'type', 
        'storyPoints', 'startDate', 'dueDate', 'completedAt', 
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
      if (updateData.completedAt && typeof updateData.completedAt === 'string') {
        updateData.completedAt = new Date(updateData.completedAt);
      }
      
      // Если задача перемещается в колонку "Готово", обновляем её статус
      if (updateData.columnId) {
        const column = await storage.getColumn(updateData.columnId);
        if (column && column.name === "Готово") {
          updateData.status = "done";
        } else if (column) {
          // Если перемещаем из "Готово" в другую колонку, меняем статус обратно
          updateData.status = "todo";
        }
      }

      const task = await storage.updateTask(taskId, updateData);
      
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
      
      // Batch fetch all needed users
      const usersMap = new Map<string, any>();
      if (userIdsToFetch.size > 0) {
        const users = await storage.getUsersByIds(Array.from(userIdsToFetch));
        users.forEach(u => usersMap.set(u.id, u));
      }
      
      // Record history for each changed field
      for (const [key, newValue] of Object.entries(updateData)) {
        let action = 'updated';
        let fieldName = key;
        let oldValueStr = '';
        let newValueStr = String(newValue || '');
        
        // Special handling for different fields
        if (key === 'assigneeId') {
          action = 'assignee_changed';
          fieldName = 'Исполнитель';
          if (newValue) {
            const user = usersMap.get(String(newValue));
            newValueStr = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : String(newValue);
          }
          oldValueStr = '';
        } else if (key === 'status') {
          action = 'status_changed';
          fieldName = 'Статус';
          oldValueStr = '';
        } else if (key === 'priorityId') {
          action = 'priority_changed';
          fieldName = 'Приоритет';
          oldValueStr = '';
        } else if (key === 'title') {
          action = 'title_changed';
          fieldName = 'Название';
          oldValueStr = '';
        } else if (key === 'description') {
          action = 'description_changed';
          fieldName = 'Описание';
          oldValueStr = '';
        } else if (key === 'dueDate') {
          action = 'due_date_changed';
          fieldName = 'Срок';
          oldValueStr = '';
        } else if (key === 'tags') {
          action = 'labels_changed';
          fieldName = 'Метки';
          oldValueStr = '';
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
            `${formatUserName(currentUser!)} назначил(а) вам задачу "${task.title}"${board ? ` в доске "${board.name}"` : ''}`,
            `/boards/${task.boardId}`
          );
        }
      }

      // Send notification to reporter about task updates (except for assignee changes)
      if (task.reporterId && task.reporterId !== userId && !updateData.assigneeId) {
        const changedFields = Object.keys(updateData);
        if (changedFields.length > 0) {
          const board = await storage.getBoard(task.boardId);
          const fieldNames: Record<string, string> = {
            'status': 'статус',
            'priority': 'приоритет',
            'title': 'название',
            'description': 'описание',
            'dueDate': 'срок',
            'columnId': 'колонку'
          };
          const changedFieldNames = changedFields.map(f => fieldNames[f] || f).join(', ');
          await sendNotification(
            task.reporterId,
            userId!,
            'task_updated',
            'Задача обновлена',
            `Задача "${task.title}" обновлена: ${changedFieldNames}`,
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
      res.status(500).json({ message: "Failed to update task" });
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

  app.post("/api/boards/:boardId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
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
      const allowedFields = ['title', 'description', 'status', 'priorityId', 'type', 'storyPoints', 'startDate', 'dueDate', 'columnId', 'assigneeId', 'tags', 'parentId'];
      const sanitizedBody: Record<string, any> = { title: req.body.title.trim() };
      
      for (const field of allowedFields.slice(1)) {
        if (req.body[field] !== undefined) {
          sanitizedBody[field] = req.body[field];
        }
      }

      const taskData = {
        ...sanitizedBody,
        boardId: req.params.boardId,
        columnId: req.body.columnId || columns[0].id,
        reporterId: user.id,
        status: req.body.status || "todo"
      } as any;
      console.log("[API] Task data prepared:", taskData);

      const task = await storage.createTask(taskData);
      console.log("[API] Task created:", task);
      
      // Start timer for initial status
      try {
        const initialStatus = task.status || "todo";
        await storage.recordTaskStatusEntry(task.id, initialStatus);
        console.log("[API] Started timer for status:", initialStatus);
      } catch (error) {
        console.error("Error starting task timer:", error);
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
          `Вам назначена задача "${task.title}"${board ? ` в доске "${board.name}"` : ''}`,
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
              `Создана задача "${task.title}" в проекте "${project.name}"`,
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
      const { name } = req.body;
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
        color: null
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
      const { name } = req.body;
      console.log("[API] Attempting to update column with name:", name);
      
      // Get board ID before updating
      const column = await storage.db.select().from(schema.boardColumns).where(eq(schema.boardColumns.id, req.params.columnId));
      const boardId = column[0]?.boardId;
      
      const updated = await storage.updateBoardColumn(req.params.columnId, { name });
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
      const cacheKey = `user:${user.id}:notifications`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const notifications = await storage.getNotifications(user.id);
      await setCache(cacheKey, notifications, 60); // Cache for 1 minute
      res.json(notifications);
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
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

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

      await setCache(cacheKey, comments, 300); // Cache for 5 minutes
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
            `${authorName} прокомментировал задачу "${task.title}"`,
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
            `${authorName} прокомментировал задачу "${task.title}"`,
            `/boards/${task.boardId}`
          );
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
    try {
      await storage.deleteComment(req.params.id);
      res.status(204).end();
    } catch (error) {
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

  return httpServer;
}
