import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./postgres-storage";
import { insertSiteSettingsSchema, insertUserSchema } from "@shared/schema";

const storage = getStorage();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      const projects = await storage.getAllProjects();
      
      // Для каждого проекта получаем его задачи и считаем прогресс
      const projectsWithStats = await Promise.all(projects.map(async (project) => {
        const boards = await storage.getBoardsByProject(project.id);
        let allTasks: any[] = [];
        
        for (const board of boards) {
          const tasks = await storage.getTasksByBoard(board.id);
          allTasks = [...allTasks, ...tasks];
        }
        
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === "done").length;
        
        // Если задач нет, прогресс 100%, иначе процент выполненных
        const progress = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);
        
        return {
          ...project,
          taskCount: totalTasks,
          completedTaskCount: completedTasks,
          progress,
          boardCount: boards.length
        };
      }));
      
      res.json(projectsWithStats);
    } catch (error) {
      console.error("GET /api/projects error:", error);
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
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  return httpServer;
}
