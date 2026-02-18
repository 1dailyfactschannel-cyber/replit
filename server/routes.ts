import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema, insertNotificationSchema, insertLabelSchema, priorities } from "@shared/schema";
import { setupWebSockets } from "./socket";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq, and, ne } from "drizzle-orm";
import { getCache, setCache, invalidatePattern } from "./redis";
import { format } from "date-fns";

const storage = getStorage();
let io: SocketIOServer;

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  io = setupWebSockets(httpServer);
  console.log("Registering API routes...");
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
      // console.log("PATCH /api/user request body:", req.body);
      const user = req.user;
      
      // Маппинг полей из фронтенда (telegram) в поля базы данных (telegram)
      const updateData = { ...req.body };
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
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
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
      const projectsWithStats = await storage.getProjectsWithStats();
      res.json(projectsWithStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
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
        status: "active"
      };
      
      console.log("POST /api/projects: Creating project with data:", projectData);
      const project = await storage.createProject(projectData);
      console.log("POST /api/projects: Project created successfully:", project.id);
      res.status(201).json(project);
    } catch (error) {
      console.error("POST /api/projects error:", error);
      res.status(500).json({ message: "Failed to create project", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
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
        'title', 'description', 'status', 'priority', 'type', 
        'storyPoints', 'startDate', 'dueDate', 'completedAt', 
        'order', 'columnId', 'boardId', 'assigneeId', 'reporterId',
        'parentId', 'tags', 'attachments', 'number'
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
      
      // Обогащаем задачу данными об исполнителе и репортере перед отправкой
      const [assignee, reporter] = await Promise.all([
        task.assigneeId ? storage.getUser(task.assigneeId) : null,
        task.reporterId ? storage.getUser(task.reporterId) : null
      ]);

      const formatName = (user: any) => {
        if (!user) return null;
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName || user.username || "Пользователь";
      };

      const enrichedTask = {
        ...task,
        assignee: assignee ? { 
          name: formatName(assignee), 
          avatar: assignee.avatar 
        } : null,
        creator: { 
          name: formatName(reporter) || "Система", 
          avatar: reporter?.avatar || null,
          date: task.createdAt ? new Date(task.createdAt).toISOString() : ""
        }
      };

      // Инвалидируем кэш статистики проектов и данные доски
      await invalidatePattern("projects:stats:*");
      await invalidatePattern(`board:full:${task.boardId}`);
      
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

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const [assignee, reporter] = await Promise.all([
        task.assigneeId ? storage.getUser(task.assigneeId) : null,
        task.reporterId ? storage.getUser(task.reporterId) : null
      ]);

      const formatName = (user: any) => {
        if (!user) return null;
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName || user.username || "Пользователь";
      };

      const enrichedTask = {
        ...task,
        assignee: assignee ? { 
          name: formatName(assignee), 
          avatar: assignee.avatar 
        } : null,
        creator: { 
          name: formatName(reporter) || "Система", 
          avatar: reporter?.avatar || null,
          date: task.createdAt ? new Date(task.createdAt).toISOString() : ""
        }
      };

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

      const columns = await storage.getColumnsByBoard(req.params.boardId);
      if (columns.length === 0) return res.status(400).json({ message: "Board has no columns" });

      const taskData = {
        ...req.body,
        boardId: req.params.boardId,
        columnId: req.body.columnId || columns[0].id,
        reporterId: user.id,
        status: req.body.status || "todo"
      };
      console.log("[API] Task data prepared:", taskData);

      const task = await storage.createTask(taskData);
      console.log("[API] Task created:", task);
      
      // Обогащаем задачу данными об исполнителе и репортере перед отправкой
      const [assignee, reporter] = await Promise.all([
        task.assigneeId ? storage.getUser(task.assigneeId) : null,
        task.reporterId ? storage.getUser(task.reporterId) : null
      ]);

      const formatName = (user: any) => {
        if (!user) return null;
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName || user.username || "Пользователь";
      };

      const enrichedTask = {
        ...task,
        assignee: assignee ? { 
          name: formatName(assignee), 
          avatar: assignee.avatar 
        } : null,
        creator: { 
          name: formatName(reporter) || "Система", 
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
      const messages = await storage.getMessages(req.params.chatId);
      res.json(messages);
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

  app.post("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    try {
      const user = req.user;
      
      const message = await storage.createMessage({
        chatId: req.params.chatId,
        senderId: user.id,
        content: req.body.content,
        attachments: req.body.attachments || []
      });
      
      // Emit to all users in the chat room
      io.to(`chat:${req.params.chatId}`).emit("new-message", message);
      
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
