import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema } from "@shared/schema";
import { setupWebSockets } from "./socket";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq, and, ne } from "drizzle-orm";

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

  // User routes
  app.get("/api/user", async (_req, res) => {
    console.log("GET /api/user hit!");
    try {
      const user = await storage.getFirstUser();
      if (!user) {
        console.log("GET /api/user: No user found in database");
        return res.status(404).json({ message: "User not found" });
      }
      console.log("GET /api/user: Returning user", user.id);
      res.json(user);
    } catch (error) {
      console.error("GET /api/user error:", error);
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  });

  app.patch("/api/user", async (req, res) => {
    console.log("PATCH /api/user hit!");
    try {
      console.log("PATCH /api/user request body:", req.body);
      const user = await storage.getFirstUser();
      if (!user) {
        console.error("PATCH /api/user: User not found");
        return res.status(404).json({ message: "User not found" });
      }
      
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
        return res.status(400).json({ message: "User already exists" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

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
      const projects = await storage.getAllProjects();
      
      // Добавляем статистику для каждого проекта
      const projectsWithStats = await Promise.all(projects.map(async (project) => {
        const boards = await storage.getBoardsByProject(project.id);
        let taskCount = 0;
        let completedTaskCount = 0;
        
        for (const board of boards) {
          const tasks = await storage.getTasksByBoard(board.id);
          taskCount += tasks.length;
          completedTaskCount += tasks.filter(t => t.status === "done" || t.status === "completed").length;
        }
        
        const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 100;
        
        return {
          ...project,
          boardCount: boards.length,
          taskCount,
          progress
        };
      }));
      
      res.json(projectsWithStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    console.log("POST /api/projects hit with body:", req.body);
    try {
      const user = await storage.getFirstUser();
      if (!user) {
        console.error("POST /api/projects: User not found");
        return res.status(404).json({ message: "User not found" });
      }
      
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
      
      // Создаем стандартные колонки для новой доски
      const defaultColumns = ["В планах", "В работе", "На проверке", "Готово"];
      for (let i = 0; i < defaultColumns.length; i++) {
        await storage.createColumn({
          boardId: board.id,
          name: defaultColumns[i],
          order: i,
          color: "#3b82f6"
        });
      }
      
      res.status(201).json(board);
    } catch (error) {
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

  app.post("/api/boards/:boardId/tasks", async (req, res) => {
    try {
      const user = await storage.getFirstUser();
      if (!user) return res.status(404).json({ message: "User not found" });

      const columns = await storage.getColumnsByBoard(req.params.boardId);
      if (columns.length === 0) return res.status(400).json({ message: "Board has no columns" });

      const taskData = {
        ...req.body,
        boardId: req.params.boardId,
        columnId: req.body.columnId || columns[0].id,
        reporterId: user.id,
        status: req.body.status || "todo"
      };

      const task = await storage.createTask(taskData);
      res.status(201).json(task);
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

  // Chat routes
  app.get("/api/chats", async (_req, res) => {
    try {
      const user = await storage.getFirstUser();
      if (!user) return res.status(404).json({ message: "User not found" });
      const chats = await storage.getChatsForUser(user.id);
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
    try {
      const user = await storage.getFirstUser();
      if (!user) return res.status(404).json({ message: "User not found" });
      
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
      const chatWithDetails = {
        ...chat,
        participants: await Promise.all(allParticipants.map(id => storage.getUser(id))),
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
    try {
      const user = await storage.getFirstUser();
      if (!user) return res.status(404).json({ message: "User not found" });
      
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
            title: `Новое сообщение от ${user.name}`,
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
    try {
      const user = await storage.getFirstUser();
      if (!user) return res.status(404).json({ message: "User not found" });

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

  return httpServer;
}
