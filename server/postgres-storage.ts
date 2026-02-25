import { 
  type User, 
  type InsertUser, 
  type SiteSettings, 
  type InsertSiteSettings,
  type ChatFolder,
  type InsertChatFolder,
  type Call,
  type InsertCall,
  type MessageAttachment,
  type InsertMessageAttachment,
  type Notification,
  type InsertNotification,
  type CommentMention,
  type InsertCommentMention
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, or, desc, ne, sql, inArray, isNull } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { getCache, setCache, delCache, invalidatePattern } from "./redis";

// Load environment variables
dotenv.config();

// PostgreSQL Storage Implementation
export class PostgresStorage {
  public db: ReturnType<typeof drizzle>;
  
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    console.log("Connecting to database:", process.env.DATABASE_URL.split('@')[1] || "local");

    const client = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: (notice) => console.log("Postgres Notice:", notice),
    });
    
    this.db = drizzle(client, { schema });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await this.db.insert(schema.users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: string, update: Partial<User>): Promise<User> {
    try {
      const [user] = await this.db.update(schema.users).set(update).where(eq(schema.users.id, id)).returning();
      if (!user) throw new Error("User not found");
      return user;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.db.delete(schema.users).where(eq(schema.users.id, id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.db.select().from(schema.users);
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    try {
      if (ids.length === 0) return [];
      return await this.db.select().from(schema.users).where(inArray(schema.users.id, ids));
    } catch (error) {
      console.error("Error getting users by ids:", error);
      return [];
    }
  }

  // Chat methods
  async getChatsForUser(userId: string) {
    try {
      const cacheKey = `user:${userId}:chats`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      // 1. Get all chats for the user
      const userChats = await this.db
        .select({
          id: schema.chats.id,
          name: schema.chats.name,
          type: schema.chats.type,
          avatar: schema.chats.avatar,
          description: schema.chats.description,
          ownerId: schema.chats.ownerId,
          createdAt: schema.chats.createdAt,
          updatedAt: schema.chats.updatedAt,
        })
        .from(schema.chats)
        .innerJoin(
          schema.chatParticipants,
          eq(schema.chats.id, schema.chatParticipants.chatId)
        )
        .where(eq(schema.chatParticipants.userId, userId))
        .orderBy(desc(schema.chats.updatedAt));

      if (userChats.length === 0) return [];

      const chatIds = userChats.map(c => c.id);

      // 2. Get all participants for these chats in one query
      const allParticipants = await this.db
        .select({
          chatId: schema.chatParticipants.chatId,
          id: schema.users.id,
          username: schema.users.username,
          avatar: schema.users.avatar,
        })
        .from(schema.users)
        .innerJoin(
          schema.chatParticipants,
          eq(schema.users.id, schema.chatParticipants.userId)
        )
        .where(sql`${schema.chatParticipants.chatId} IN ${chatIds}`);

      // 3. Get last messages for these chats
      // We'll use a slightly more complex query to get only the latest message per chat
      const lastMessages = await this.db
        .select()
        .from(schema.messages)
        .where(sql`${schema.messages.id} IN (
          SELECT DISTINCT ON (chat_id) id 
          FROM messages 
          WHERE chat_id IN ${chatIds} 
          ORDER BY chat_id, created_at DESC
        )`);

      // 4. Combine everything
      const chatsWithDetails = userChats.map(chat => {
        return {
          ...chat,
          participants: allParticipants.filter(p => p.chatId === chat.id),
          lastMessage: lastMessages.find(m => m.chatId === chat.id)
        };
      });

      await setCache(cacheKey, chatsWithDetails, 300); // Cache for 5 minutes
      return chatsWithDetails;
    } catch (error) {
      console.error("Error getting chats for user:", error);
      return [];
    }
  }

  async getChat(id: string) {
    try {
      const [chat] = await this.db.select().from(schema.chats).where(eq(schema.chats.id, id)).limit(1);
      if (!chat) return undefined;

      const participants = await this.db
        .select({
          id: schema.users.id,
          username: schema.users.username,
          avatar: schema.users.avatar,
        })
        .from(schema.users)
        .innerJoin(
          schema.chatParticipants,
          eq(schema.users.id, schema.chatParticipants.userId)
        )
        .where(eq(schema.chatParticipants.chatId, chat.id));

      const [lastMessage] = await this.db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.chatId, chat.id))
        .orderBy(desc(schema.messages.createdAt))
        .limit(1);

      return {
        ...chat,
        participants,
        lastMessage,
      };
    } catch (error) {
      console.error("Error getting chat:", error);
      return undefined;
    }
  }

  async updateChatParticipants(chatId: string, participantIds: string[]) {
    try {
      // Remove old participants
      await this.db.delete(schema.chatParticipants).where(eq(schema.chatParticipants.chatId, chatId));
      
      // Add new participants
      if (participantIds.length > 0) {
        const participants = participantIds.map(userId => ({
          chatId,
          userId,
        }));
        await this.db.insert(schema.chatParticipants).values(participants);
      }
      return true;
    } catch (error) {
      console.error("Error updating chat participants:", error);
      throw error;
    }
  }

  async getMessages(chatId: string) {
    try {
      return await this.db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.chatId, chatId))
        .orderBy(schema.messages.createdAt);
    } catch (error) {
      console.error("Error getting messages:", error);
      return [];
    }
  }

  async createChat(insertChat: schema.InsertChat, participantIds: string[]) {
    try {
      const [chat] = await this.db.insert(schema.chats).values(insertChat).returning();
      
      if (participantIds.length > 0) {
        const participants = participantIds.map(userId => ({
          chatId: chat.id,
          userId: userId,
        }));
        await this.db.insert(schema.chatParticipants).values(participants);
      }
      
      return chat;
    } catch (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
  }

  async getMessage(id: string) {
    try {
      const [message] = await this.db.select().from(schema.messages).where(eq(schema.messages.id, id)).limit(1);
      return message;
    } catch (error) {
      console.error("Error getting message:", error);
      return undefined;
    }
  }

  async createMessage(insertMessage: schema.InsertMessage) {
    try {
      const [message] = await this.db.insert(schema.messages).values(insertMessage).returning();
      
      // Update chat's updatedAt timestamp
      await this.db.update(schema.chats)
        .set({ updatedAt: new Date() })
        .where(eq(schema.chats.id, message.chatId));

      // Handle message attachments if they are in the JSONB field
      const attachments = insertMessage.attachments as any[];
      if (attachments && Array.isArray(attachments)) {
        for (const attachment of attachments) {
          await this.createMessageAttachment({
            messageId: message.id,
            name: attachment.name,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size
          });
        }
      }
        
      return message;
    } catch (error) {
      console.error("Error creating message:", error);
      throw error;
    }
  }

  async updateChat(id: string, update: Partial<schema.Chat>) {
    try {
      const [chat] = await this.db.update(schema.chats).set({ ...update, updatedAt: new Date() }).where(eq(schema.chats.id, id)).returning();
      if (!chat) throw new Error("Chat not found");
      return chat;
    } catch (error) {
      console.error("Error updating chat:", error);
      throw error;
    }
  }

  async deleteChat(id: string) {
    try {
      await this.db.delete(schema.chats).where(eq(schema.chats.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  }

  async getChatParticipants(chatId: string) {
    try {
      return await this.db
        .select()
        .from(schema.chatParticipants)
        .where(eq(schema.chatParticipants.chatId, chatId));
    } catch (error) {
      console.error("Error getting chat participants:", error);
      return [];
    }
  }

  async updateMessage(id: string, content: string) {
    try {
      const [message] = await this.db.update(schema.messages)
        .set({ content })
        .where(eq(schema.messages.id, id))
        .returning();
      return message;
    } catch (error) {
      console.error("Error updating message:", error);
      throw error;
    }
  }

  async deleteMessage(id: string) {
    try {
      await this.db.delete(schema.messages).where(eq(schema.messages.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }

  async markMessageAsRead(id: string) {
    try {
      await this.db.update(schema.messages)
        .set({ isRead: true })
        .where(eq(schema.messages.id, id));
      return true;
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  }

  async markChatMessagesAsRead(chatId: string, userId: string) {
    try {
      await this.db.update(schema.messages)
        .set({ isRead: true })
        .where(and(
          eq(schema.messages.chatId, chatId),
          ne(schema.messages.senderId, userId),
          eq(schema.messages.isRead, false)
        ));
      
      await this.db.update(schema.chatParticipants)
        .set({ lastReadAt: new Date() })
        .where(and(
          eq(schema.chatParticipants.chatId, chatId),
          eq(schema.chatParticipants.userId, userId)
        ));
      return true;
    } catch (error) {
      console.error("Error marking chat messages as read:", error);
      return false;
    }
  }

  // Chat Folder methods
  async getChatFolders(userId: string): Promise<any[]> {
    try {
      const cacheKey = `user:${userId}:chat_folders`;
      const cached = await getCache<any[]>(cacheKey);
      if (cached) return cached;

      const folders = await this.db
        .select()
        .from(schema.chatFolders)
        .where(eq(schema.chatFolders.userId, userId));

      if (folders.length === 0) return [];

      const folderIds = folders.map(f => f.id);
      const items = await this.db
        .select()
        .from(schema.chatFolderItems)
        .where(sql`${schema.chatFolderItems.folderId} IN ${folderIds}`);

      const foldersWithItems = folders.map(folder => ({
        ...folder,
        chatIds: items.filter(item => item.folderId === folder.id).map(item => item.chatId)
      }));

      await setCache(cacheKey, foldersWithItems, 300);
      return foldersWithItems;
    } catch (error) {
      console.error("Error getting chat folders:", error);
      return [];
    }
  }

  async getChatFolderItems(folderId: string): Promise<string[]> {
    try {
      const result = await this.db.select({ chatId: schema.chatFolderItems.chatId })
        .from(schema.chatFolderItems)
        .where(eq(schema.chatFolderItems.folderId, folderId));
      return result.map(r => r.chatId);
    } catch (error) {
      console.error("Error getting chat folder items:", error);
      return [];
    }
  }

  async createChatFolder(folder: InsertChatFolder): Promise<ChatFolder> {
    try {
      const [newFolder] = await this.db.insert(schema.chatFolders).values(folder).returning();
      return newFolder;
    } catch (error) {
      console.error("Error creating chat folder:", error);
      throw error;
    }
  }

  async updateChatFolder(id: string, update: Partial<ChatFolder>): Promise<ChatFolder> {
    try {
      const [folder] = await this.db.update(schema.chatFolders).set(update).where(eq(schema.chatFolders.id, id)).returning();
      return folder;
    } catch (error) {
      console.error("Error updating chat folder:", error);
      throw error;
    }
  }

  async deleteChatFolder(id: string): Promise<void> {
    try {
      await this.db.delete(schema.chatFolders).where(eq(schema.chatFolders.id, id));
    } catch (error) {
      console.error("Error deleting chat folder:", error);
      throw error;
    }
  }

  async setChatFolderItems(folderId: string, chatIds: string[]): Promise<void> {
    try {
      await this.db.delete(schema.chatFolderItems).where(eq(schema.chatFolderItems.folderId, folderId));
      if (chatIds.length > 0) {
        await this.db.insert(schema.chatFolderItems).values(chatIds.map(chatId => ({ folderId, chatId })));
      }
    } catch (error) {
      console.error("Error setting chat folder items:", error);
      throw error;
    }
  }

  // Call methods
  async createCall(call: InsertCall): Promise<Call> {
    try {
      const [newCall] = await this.db.insert(schema.calls).values(call).returning();
      return newCall;
    } catch (error) {
      console.error("Error creating call:", error);
      throw error;
    }
  }

  async updateCall(id: string, update: Partial<Call>): Promise<Call> {
    try {
      const [updatedCall] = await this.db.update(schema.calls).set(update).where(eq(schema.calls.id, id)).returning();
      return updatedCall;
    } catch (error) {
      console.error("Error updating call:", error);
      throw error;
    }
  }

  async getCallsForUser(userId: string): Promise<Call[]> {
    try {
      return await this.db.select()
        .from(schema.calls)
        .where(or(eq(schema.calls.callerId, userId), eq(schema.calls.receiverId, userId)))
        .orderBy(desc(schema.calls.startedAt));
    } catch (error) {
      console.error("Error getting calls for user:", error);
      return [];
    }
  }

  // Attachment methods
  async createMessageAttachment(attachment: InsertMessageAttachment): Promise<MessageAttachment> {
    try {
      const [newAttachment] = await this.db.insert(schema.messageAttachments).values(attachment).returning();
      return newAttachment;
    } catch (error) {
      console.error("Error creating message attachment:", error);
      throw error;
    }
  }

  async getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
    try {
      return await this.db.select().from(schema.messageAttachments).where(eq(schema.messageAttachments.messageId, messageId));
    } catch (error) {
      console.error("Error getting message attachments:", error);
      return [];
    }
  }

  // Site Settings methods
  async getSiteSetting(key: string): Promise<SiteSettings | undefined> {
    try {
      const result = await this.db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, key)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting site setting:", error);
      return undefined;
    }
  }

  async setSiteSetting(key: string, value: string): Promise<SiteSettings> {
    try {
      const existing = await this.getSiteSetting(key);
      let setting: SiteSettings;
      
      if (existing) {
        [setting] = await this.db.update(schema.siteSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(schema.siteSettings.key, key))
          .returning();
      } else {
        [setting] = await this.db.insert(schema.siteSettings)
          .values({ key, value })
          .returning();
      }

      await setCache(`setting:${key}`, setting);
      return setting;
    } catch (error) {
      console.error("Error setting site setting:", error);
      throw error;
    }
  }

  async getAllSiteSettings(): Promise<SiteSettings[]> {
    try {
      return await this.db.select().from(schema.siteSettings);
    } catch (error) {
      console.error("Error getting all site settings:", error);
      return [];
    }
  }

  // Role methods
  async getUserRoles(userId: string): Promise<schema.Role[]> {
    try {
      const result = await this.db.select({
        id: schema.roles.id,
        name: schema.roles.name,
        description: schema.roles.description,
        permissions: schema.roles.permissions,
        isSystem: schema.roles.isSystem,
        createdAt: schema.roles.createdAt,
        updatedAt: schema.roles.updatedAt
      })
        .from(schema.roles)
        .innerJoin(schema.userRoles, eq(schema.roles.id, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, userId));
      
      return result as schema.Role[];
    } catch (error) {
      console.error("Error getting user roles:", error);
      return [];
    }
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.db.insert(schema.userRoles).values({ userId, roleId }).onConflictDoNothing();
    } catch (error) {
      console.error("Error assigning role to user:", error);
      throw error;
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.db.delete(schema.userRoles).where(
        and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.roleId, roleId))
      );
    } catch (error) {
      console.error("Error removing role from user:", error);
      throw error;
    }
  }

  // Project methods
  async getProject(id: string): Promise<schema.Project | undefined> {
    try {
      const result = await this.db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting project:", error);
      return undefined;
    }
  }

  async createProject(project: schema.InsertProject): Promise<schema.Project> {
    try {
      const [newProject] = await this.db.insert(schema.projects).values(project).returning();
      return newProject;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  }

  async getProjectsByUser(userId: string): Promise<schema.Project[]> {
    try {
      return await this.db.select().from(schema.projects).where(eq(schema.projects.ownerId, userId));
    } catch (error) {
      console.error("Error getting projects by user:", error);
      return [];
    }
  }

  async getAllProjects(): Promise<schema.Project[]> {
    try {
      return await this.db.select().from(schema.projects);
    } catch (error) {
      console.error("Error getting all projects:", error);
      return [];
    }
  }

  async getProjectsWithStats(workspaceId?: string, status?: string): Promise<any[]> {
    const startTime = Date.now();
    try {
      const cacheKey = workspaceId 
        ? `projects:stats:workspace:${workspaceId}:${status || "all"}` 
        : `projects:stats:all:${status || "all"}`;
      const cached = await getCache<any[]>(cacheKey);
      if (cached) {
        console.log(`[DB] getProjectsWithStats: cached (${cached.length} projects)`);
        return cached;
      }

      // Optimized: Get projects with board counts in a single efficient query
      let projectsWithBoards: any[];
      
      const conditions = [];
      if (workspaceId) {
        conditions.push(eq(schema.projects.workspaceId, workspaceId));
      }
      if (status) {
        conditions.push(eq(schema.projects.status, status));
      }
      
      if (workspaceId) {
        projectsWithBoards = await this.db
          .select({
            project: schema.projects,
            boardCount: sql<number>`count(distinct ${schema.boards.id})`,
          })
          .from(schema.projects)
          .leftJoin(schema.boards, eq(schema.projects.id, schema.boards.projectId))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(schema.projects.id);
      } else {
        const whereCondition = status ? eq(schema.projects.status, status) : undefined;
        projectsWithBoards = await this.db
          .select({
            project: schema.projects,
            boardCount: sql<number>`count(distinct ${schema.boards.id})`,
          })
          .from(schema.projects)
          .leftJoin(schema.boards, eq(schema.projects.id, schema.boards.projectId))
          .where(whereCondition)
          .groupBy(schema.projects.id);
      }

      // Get task stats separately to avoid complex joins
      console.log('projectsWithBoards:', projectsWithBoards);
      const boardIds = projectsWithBoards
        .map(p => p.project.id);
      
      let taskStats: Map<string, { taskCount: number; completedTaskCount: number }> = new Map();
      
      if (boardIds.length > 0) {
        const boardsForProjects = await this.db
          .select({
            projectId: schema.boards.projectId,
            boardId: schema.boards.id,
          })
          .from(schema.boards)
          .where(inArray(schema.boards.projectId, boardIds));

        const allBoardIds = boardsForProjects.map(b => b.boardId);
        
        if (allBoardIds.length > 0) {
          const taskCounts = await this.db
            .select({
              boardId: schema.tasks.boardId,
              taskCount: sql<number>`count(*)`,
              completedCount: sql<number>`count(*) filter (where ${schema.tasks.status} in ('done', 'completed', 'Готово'))`,
            })
            .from(schema.tasks)
            .where(inArray(schema.tasks.boardId, allBoardIds))
            .groupBy(schema.tasks.boardId);

          // Aggregate stats by project
          const boardToProject = new Map(boardsForProjects.map(b => [b.boardId, b.projectId]));
          
          for (const stat of taskCounts) {
            const projectId = boardToProject.get(stat.boardId);
            if (projectId) {
              const existing = taskStats.get(projectId) || { taskCount: 0, completedTaskCount: 0 };
              existing.taskCount += Number(stat.taskCount);
              existing.completedTaskCount += Number(stat.completedCount);
              taskStats.set(projectId, existing);
            }
          }
        }
      }

      const projectsWithStats = projectsWithBoards.map((row) => {
        const stats = taskStats.get(row.project.id) || { taskCount: 0, completedTaskCount: 0 };
        const taskCount = stats.taskCount;
        const completedTaskCount = stats.completedTaskCount;
        const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 100;

        return {
          ...row.project,
          boardCount: Number(row.boardCount || 0),
          taskCount,
          progress,
        };
      });

      const duration = Date.now() - startTime;
      console.log(`[DB] getProjectsWithStats: ${projectsWithStats.length} projects in ${duration}ms`);
      
      await setCache(cacheKey, projectsWithStats, 300); // Cache for 5 minutes
      return projectsWithStats;
    } catch (error) {
      console.error("Error getting projects with stats:", error);
      return [];
    }
  }

  async updateProject(id: string, update: Partial<schema.Project>): Promise<schema.Project> {
    try {
      const [project] = await this.db.update(schema.projects).set(update).where(eq(schema.projects.id, id)).returning();
      if (!project) throw new Error("Project not found");
      return project;
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await this.db.delete(schema.projects).where(eq(schema.projects.id, id));
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  }

  // Board methods
  async getBoard(id: string): Promise<schema.Board | undefined> {
    try {
      const [board] = await this.db.select().from(schema.boards).where(eq(schema.boards.id, id));
      return board;
    } catch (error) {
      console.error("Error getting board:", error);
      return undefined;
    }
  }

  async getBoardsByProject(projectId: string): Promise<schema.Board[]> {
    try {
      return await this.db.select().from(schema.boards).where(eq(schema.boards.projectId, projectId));
    } catch (error) {
      console.error("Error getting boards by project:", error);
      return [];
    }
  }

  async createBoard(board: schema.InsertBoard): Promise<schema.Board> {
    try {
      const [newBoard] = await this.db.insert(schema.boards).values(board).returning();
      return newBoard;
    } catch (error) {
      console.error("Error creating board:", error);
      throw error;
    }
  }

  async updateBoard(id: string, update: Partial<schema.Board>): Promise<schema.Board> {
    try {
      const [board] = await this.db.update(schema.boards).set(update).where(eq(schema.boards.id, id)).returning();
      if (!board) throw new Error("Board not found");
      return board;
    } catch (error) {
      console.error("Error updating board:", error);
      throw error;
    }
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      return await this.db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId))
        .orderBy(desc(schema.notifications.createdAt));
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await this.db
        .insert(schema.notifications)
        .values(notification)
        .returning();
      return newNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    try {
      const [notification] = await this.db
        .update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, id))
        .returning();
      if (!notification) throw new Error("Notification not found");
      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await this.db
        .update(schema.notifications)
        .set({ isRead: true })
        .where(and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false)
        ));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await this.db
        .delete(schema.notifications)
        .where(eq(schema.notifications.id, id));
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  async deleteBoard(id: string): Promise<void> {
    try {
      await this.db.delete(schema.boards).where(eq(schema.boards.id, id));
    } catch (error) {
      console.error("Error deleting board:", error);
      throw error;
    }
  }

  // Board Column methods
  async getColumnsByBoard(boardId: string): Promise<schema.BoardColumn[]> {
    try {
      return await this.db.select().from(schema.boardColumns).where(eq(schema.boardColumns.boardId, boardId)).orderBy(schema.boardColumns.order);
    } catch (error) {
      console.error("Error getting columns by board:", error);
      return [];
    }
  }

  async createColumn(column: schema.InsertBoardColumn): Promise<schema.BoardColumn> {
    try {
      const [newColumn] = await this.db.insert(schema.boardColumns).values(column).returning();
      return newColumn;
    } catch (error) {
      console.error("Error creating column:", error);
      throw error;
    }
  }

  async createColumns(columns: schema.InsertBoardColumn[]): Promise<schema.BoardColumn[]> {
    try {
      if (columns.length === 0) return [];
      return await this.db.insert(schema.boardColumns).values(columns).returning();
    } catch (error) {
      console.error("Error creating multiple columns:", error);
      throw error;
    }
  }

  async getColumn(id: string): Promise<schema.BoardColumn | undefined> {
    try {
      const [column] = await this.db.select().from(schema.boardColumns).where(eq(schema.boardColumns.id, id)).limit(1);
      return column;
    } catch (error) {
      console.error("Error getting column:", error);
      return undefined;
    }
  }

  async updateBoardColumn(id: string, updates: Partial<schema.BoardColumn>): Promise<schema.BoardColumn> {
    try {
      const [updated] = await this.db
        .update(schema.boardColumns)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.boardColumns.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating board column:", error);
      throw error;
    }
  }

  async deleteBoardColumn(id: string): Promise<void> {
    try {
      await this.db.delete(schema.boardColumns).where(eq(schema.boardColumns.id, id));
    } catch (error) {
      console.error("Error deleting board column:", error);
      throw error;
    }
  }

  async updateTaskColumnId(taskId: string, columnId: string): Promise<void> {
    try {
      await this.db
        .update(schema.tasks)
        .set({ columnId, updatedAt: new Date() })
        .where(eq(schema.tasks.id, taskId));
    } catch (error) {
      console.error("Error updating task column:", error);
      throw error;
    }
  }

  // Task methods
  async getTask(id: string): Promise<schema.Task | undefined> {
    try {
      const result = await this.db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting task:", error);
      return undefined;
    }
  }

  async createTask(task: schema.InsertTask): Promise<schema.Task> {
    try {
      // Если исполнитель не указан, берем последнего зарегистрированного пользователя по умолчанию
      if (!task.assigneeId) {
        const lastUser = await this.getFirstUser();
        if (lastUser) {
          task.assigneeId = lastUser.id;
        }
      }

      const [newTask] = await this.db.insert(schema.tasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(id: string, update: Partial<schema.Task>): Promise<schema.Task> {
    try {
      const [updatedTask] = await this.db.update(schema.tasks)
        .set({ ...update, updatedAt: new Date() })
        .where(eq(schema.tasks.id, id))
        .returning();
      if (!updatedTask) throw new Error("Task not found");
      return updatedTask;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  async updateTaskOrders(tasks: { id: string, order: number }[]): Promise<void> {
    try {
      if (tasks.length === 0) return;
      
      // Используем транзакцию для атомарности и производительности
      await this.db.transaction(async (tx) => {
        for (const task of tasks) {
          await tx.update(schema.tasks)
            .set({ order: task.order, updatedAt: new Date() })
            .where(eq(schema.tasks.id, task.id));
        }
      });
    } catch (error) {
      console.error("Error updating task orders:", error);
      throw error;
    }
  }

  async getTasksByBoard(boardId: string): Promise<schema.Task[]> {
    try {
      return await this.db.select().from(schema.tasks)
        .where(and(eq(schema.tasks.boardId, boardId), sql`(${schema.tasks.archived} = false OR ${schema.tasks.archived} IS NULL)`))
        .orderBy(schema.tasks.order);
    } catch (error) {
      console.error("Error getting tasks by board:", error);
      return [];
    }
  }

  // Optimized method: get tasks with assignee and reporter in single query (no N+1)
  async getTasksByBoardWithUsers(boardId: string, limit: number = 100): Promise<any[]> {
    const startTime = Date.now();
    try {
      // Get tasks first - exclude archived
      const tasks = await this.db
        .select()
        .from(schema.tasks)
        .where(and(eq(schema.tasks.boardId, boardId), sql`(${schema.tasks.archived} = false OR ${schema.tasks.archived} IS NULL)`))
        .orderBy(schema.tasks.order)
        .limit(limit);

      if (tasks.length === 0) {
        return [];
      }

      // Get all unique user IDs from tasks
      const userIds = Array.from(new Set(tasks.flatMap(t => [t.assigneeId, t.reporterId]).filter((id): id is string => !!id)));
      
      // Fetch all users in one query
      const users = userIds.length > 0 
        ? await this.db.select().from(schema.users).where(inArray(schema.users.id, userIds))
        : [];
      
      const userMap = new Map(users.map(u => [u.id, u]));

      // Get all subtasks for these tasks
      const taskIds = tasks.map(t => t.id);
      let subtasks: any[] = [];
      if (taskIds.length > 0) {
        subtasks = await this.db
          .select()
          .from(schema.subtasks)
          .where(inArray(schema.subtasks.taskId, taskIds))
          .orderBy(schema.subtasks.order);
      }
      
      // Create subtasks map
      const subtasksMap = new Map<string, any[]>();
      for (const subtask of subtasks) {
        const existing = subtasksMap.get(subtask.taskId) || [];
        existing.push(subtask);
        subtasksMap.set(subtask.taskId, existing);
      }

      const duration = Date.now() - startTime;
      console.log(`[DB] getTasksByBoardWithUsers: ${tasks.length} tasks, ${subtasks.length} subtasks in ${duration}ms`);

      return tasks.map((task) => {
        const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;
        const reporter = task.reporterId ? userMap.get(task.reporterId) : null;
        
        const formatName = (user: any) => {
          if (!user) return null;
          const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
          return fullName || user.username || "Пользователь";
        };

        return {
          ...task,
          assignee: assignee ? { 
            name: formatName(assignee), 
            avatar: assignee.avatar 
          } : null,
          creator: { 
            name: formatName(reporter) || "Система", 
            avatar: reporter?.avatar || null,
            date: task.createdAt ? new Date(task.createdAt).toLocaleString("ru-RU") : ""
          },
          subtasks: subtasksMap.get(task.id) || []
        };
      });
    } catch (error) {
      console.error("Error getting tasks by board with users:", error);
      return [];
    }
  }

  async getFirstUser(): Promise<User | undefined> {
    try {
      // Получаем последнего зарегистрированного пользователя, 
      // чтобы видеть именно того, кто только что создал аккаунт
      const result = await this.db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting last user:", error);
      return undefined;
    }
  }

  // Subtask methods
  async getSubtasksByTask(taskId: string): Promise<schema.Subtask[]> {
    try {
      return await this.db.select()
        .from(schema.subtasks)
        .where(eq(schema.subtasks.taskId, taskId))
        .orderBy(schema.subtasks.order);
    } catch (error) {
      console.error("Error getting subtasks:", error);
      return [];
    }
  }

  async createSubtask(subtask: schema.InsertSubtask): Promise<schema.Subtask> {
    try {
      const [newSubtask] = await this.db.insert(schema.subtasks).values(subtask).returning();
      return newSubtask;
    } catch (error) {
      console.error("Error creating subtask:", error);
      throw error;
    }
  }

  async updateSubtask(id: string, update: Partial<schema.Subtask>): Promise<schema.Subtask> {
    try {
      const [updatedSubtask] = await this.db.update(schema.subtasks)
        .set({ ...update, updatedAt: new Date() })
        .where(eq(schema.subtasks.id, id))
        .returning();
      if (!updatedSubtask) throw new Error("Subtask not found");
      return updatedSubtask;
    } catch (error) {
      console.error("Error updating subtask:", error);
      throw error;
    }
  }

  async deleteSubtask(id: string): Promise<void> {
    try {
      await this.db.delete(schema.subtasks).where(eq(schema.subtasks.id, id));
    } catch (error) {
      console.error("Error deleting subtask:", error);
      throw error;
    }
  }

  async getSubtask(id: string): Promise<schema.Subtask | undefined> {
    try {
      const [subtask] = await this.db.select().from(schema.subtasks).where(eq(schema.subtasks.id, id)).limit(1);
      return subtask;
    } catch (error) {
      console.error("Error getting subtask:", error);
      return undefined;
    }
  }

  // Comment methods
  async getCommentsByTask(taskId: string): Promise<schema.Comment[]> {
    try {
      return await this.db.select()
        .from(schema.comments)
        .where(eq(schema.comments.taskId, taskId))
        .orderBy(desc(schema.comments.createdAt));
    } catch (error) {
      console.error("Error getting comments:", error);
      return [];
    }
  }

  async createComment(comment: schema.InsertComment): Promise<schema.Comment> {
    try {
      const [newComment] = await this.db.insert(schema.comments).values(comment).returning();
      return newComment;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }

  async deleteComment(id: string): Promise<void> {
    try {
      await this.db.delete(schema.comments).where(eq(schema.comments.id, id));
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }

  // Comment Mentions methods
  async getMentionsByUser(userId: string): Promise<any[]> {
    try {
      const mentions = await this.db.select({
        mention: schema.commentMentions,
        comment: schema.comments,
        task: {
          id: schema.tasks.id,
          title: schema.tasks.title,
        },
        project: {
          id: schema.projects.id,
          name: schema.projects.name,
        },
        author: {
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          username: schema.users.username,
          avatar: schema.users.avatar,
        },
      })
        .from(schema.commentMentions)
        .innerJoin(schema.comments, eq(schema.commentMentions.commentId, schema.comments.id))
        .innerJoin(schema.tasks, eq(schema.comments.taskId, schema.tasks.id))
        .innerJoin(schema.boards, eq(schema.tasks.boardId, schema.boards.id))
        .innerJoin(schema.projects, eq(schema.boards.projectId, schema.projects.id))
        .innerJoin(schema.users, eq(schema.comments.authorId, schema.users.id))
        .where(eq(schema.commentMentions.userId, userId))
        .orderBy(desc(schema.commentMentions.createdAt));

      return mentions.map(m => ({
        ...m.mention,
        comment: m.comment,
        task: m.task,
        project: m.project,
        author: {
          name: `${m.author.firstName || ""} ${m.author.lastName || ""}`.trim() || m.author.username,
          avatar: m.author.avatar,
        },
      }));
    } catch (error) {
      console.error("Error getting mentions by user:", error);
      return [];
    }
  }

  async getCommentsWithMentions(userId: string): Promise<any[]> {
    try {
      // Get comments where user is mentioned
      const mentions = await this.db.select({
        commentId: schema.commentMentions.commentId,
      })
        .from(schema.commentMentions)
        .where(eq(schema.commentMentions.userId, userId));

      const commentIds = mentions.map(m => m.commentId);
      
      if (commentIds.length === 0) return [];

      const comments = await this.db.select()
        .from(schema.comments)
        .where(inArray(schema.comments.id, commentIds))
        .orderBy(desc(schema.comments.createdAt));

      // Enrich with authors
      const authorIds = Array.from(new Set(comments.map(c => c.authorId).filter(Boolean)));
      const authors = authorIds.length > 0 
        ? await this.db.select().from(schema.users).where(inArray(schema.users.id, authorIds))
        : [];
      const authorMap = new Map(authors.map(a => [a.id, a]));

      return comments.map(comment => {
        const author = authorMap.get(comment.authorId);
        return {
          ...comment,
          author: author ? {
            name: `${author.firstName || ""} ${author.lastName || ""}`.trim() || author.username,
            avatar: author.avatar,
          } : { name: "Неизвестно" },
        };
      });
    } catch (error) {
      console.error("Error getting comments with mentions:", error);
      return [];
    }
  }

  // Task Observer methods
  async getObserversByTask(taskId: string): Promise<User[]> {
    try {
      const result = await this.db.select({
        user: schema.users
      })
        .from(schema.users)
        .innerJoin(schema.taskObservers, eq(schema.users.id, schema.taskObservers.userId))
        .where(eq(schema.taskObservers.taskId, taskId));
      
      return result.map(r => r.user);
    } catch (error) {
      console.error("Error getting task observers:", error);
      return [];
    }
  }

  async addTaskObserver(taskId: string, userId: string): Promise<void> {
    try {
      await this.db.insert(schema.taskObservers)
        .values({ taskId, userId })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Error adding task observer:", error);
      throw error;
    }
  }

  async removeTaskObserver(taskId: string, userId: string): Promise<void> {
    try {
      await this.db.delete(schema.taskObservers)
        .where(and(
          eq(schema.taskObservers.taskId, taskId),
          eq(schema.taskObservers.userId, userId)
        ));
    } catch (error) {
      console.error("Error removing task observer:", error);
      throw error;
    }
  }

  async updateTaskObservers(taskId: string, userIds: string[]): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        // Remove all current observers
        await tx.delete(schema.taskObservers).where(eq(schema.taskObservers.taskId, taskId));
        
        // Add new observers
        if (userIds.length > 0) {
          const values = userIds.map(userId => ({ taskId, userId }));
          await tx.insert(schema.taskObservers).values(values);
        }
      });
    } catch (error) {
      console.error("Error updating task observers:", error);
      throw error;
    }
  }

  // Labels
  async getLabels(): Promise<schema.Label[]> {
    try {
      return await this.db.select().from(schema.labels).orderBy(schema.labels.name);
    } catch (error) {
      console.error("Error getting labels:", error);
      return [];
    }
  }

  async createLabel(label: schema.InsertLabel): Promise<schema.Label> {
    try {
      const [newLabel] = await this.db.insert(schema.labels).values(label).returning();
      return newLabel;
    } catch (error) {
      console.error("Error creating label:", error);
      throw error;
    }
  }

  async updateLabel(id: string, update: Partial<schema.InsertLabel>): Promise<schema.Label> {
    try {
      const [updatedLabel] = await this.db.update(schema.labels)
        .set(update)
        .where(eq(schema.labels.id, id))
        .returning();
      if (!updatedLabel) throw new Error("Label not found");
      return updatedLabel;
    } catch (error) {
      console.error("Error updating label:", error);
      throw error;
    }
  }

  async deleteLabel(id: string): Promise<void> {
    try {
      await this.db.delete(schema.labels).where(eq(schema.labels.id, id));
    } catch (error) {
      console.error("Error deleting label:", error);
      throw error;
    }
  }

  // Task Status History methods
  async recordTaskStatusEntry(taskId: string, status: string): Promise<schema.TaskStatusHistory> {
    try {
      // First, close any open status entry for this task
      await this.closeTaskStatusEntry(taskId);
      
      // Create new status entry
      const [entry] = await this.db.insert(schema.taskStatusHistory)
        .values({
          taskId,
          status,
          enteredAt: new Date(),
        })
        .returning();
      return entry;
    } catch (error) {
      console.error("Error recording task status entry:", error);
      throw error;
    }
  }

  async closeTaskStatusEntry(taskId: string): Promise<void> {
    try {
      // Find the most recent open status entry (without exitedAt)
      const openEntries = await this.db.select()
        .from(schema.taskStatusHistory)
        .where(and(
          eq(schema.taskStatusHistory.taskId, taskId),
          sql`${schema.taskStatusHistory.exitedAt} IS NULL`
        ))
        .orderBy(desc(schema.taskStatusHistory.enteredAt))
        .limit(1);

      if (openEntries.length > 0) {
        const entry = openEntries[0];
        const exitedAt = new Date();
        const durationSeconds = Math.floor((exitedAt.getTime() - new Date(entry.enteredAt).getTime()) / 1000);
        
        await this.db.update(schema.taskStatusHistory)
          .set({
            exitedAt,
            durationSeconds,
          })
          .where(eq(schema.taskStatusHistory.id, entry.id));
      }
    } catch (error) {
      console.error("Error closing task status entry:", error);
      throw error;
    }
  }

  async getTaskStatusHistory(taskId: string): Promise<schema.TaskStatusHistory[]> {
    try {
      return await this.db.select()
        .from(schema.taskStatusHistory)
        .where(eq(schema.taskStatusHistory.taskId, taskId))
        .orderBy(desc(schema.taskStatusHistory.enteredAt));
    } catch (error) {
      console.error("Error getting task status history:", error);
      return [];
    }
  }

  async getTaskStatusSummary(taskId: string): Promise<{ status: string; totalSeconds: number; count: number }[]> {
    try {
      const history = await this.getTaskStatusHistory(taskId);
      const summary = new Map<string, { totalSeconds: number; count: number }>();
      const now = new Date();
      
      for (const entry of history) {
        let duration = entry.durationSeconds || 0;
        
        // If still in this status (no exitedAt), calculate current duration
        if (!entry.exitedAt && entry.enteredAt) {
          duration = Math.floor((now.getTime() - new Date(entry.enteredAt).getTime()) / 1000);
        }
        
        const existing = summary.get(entry.status) || { totalSeconds: 0, count: 0 };
        summary.set(entry.status, {
          totalSeconds: existing.totalSeconds + duration,
          count: existing.count + 1,
        });
      }
      
      return Array.from(summary.entries()).map(([status, data]) => ({
        status,
        totalSeconds: data.totalSeconds,
        count: data.count,
      }));
    } catch (error) {
      console.error("Error getting task status summary:", error);
      return [];
    }
  }

  // Task History methods
  async addTaskHistory(entry: {
    taskId: string;
    userId?: string;
    action: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
  }): Promise<schema.TaskHistory> {
    try {
      const [history] = await this.db.insert(schema.taskHistory)
        .values({
          taskId: entry.taskId,
          userId: entry.userId || null,
          action: entry.action,
          fieldName: entry.fieldName || null,
          oldValue: entry.oldValue || null,
          newValue: entry.newValue || null,
        })
        .returning();
      return history;
    } catch (error) {
      console.error("Error adding task history:", error);
      throw error;
    }
  }

  async getTaskHistory(taskId: string): Promise<(schema.TaskHistory & { user?: schema.User })[]> {
    try {
      const history = await this.db.select({
        history: schema.taskHistory,
        user: schema.users,
      })
        .from(schema.taskHistory)
        .leftJoin(schema.users, eq(schema.taskHistory.userId, schema.users.id))
        .where(eq(schema.taskHistory.taskId, taskId))
        .orderBy(desc(schema.taskHistory.createdAt));

      return history.map(h => ({
        ...h.history,
        user: h.user || undefined,
      }));
    } catch (error) {
      console.error("Error getting task history:", error);
      return [];
    }
  }

  // Database health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  // Close database connection
  async close(): Promise<void> {
    // Drizzle doesn't expose the underlying client directly
    // In production, you might want to manage the postgres client separately
  }
}

// Export singleton instance
let storageInstance: PostgresStorage | null = null;

export function getStorage(): PostgresStorage {
  if (!storageInstance) {
    storageInstance = new PostgresStorage();
  }
  return storageInstance;
}

// For backward compatibility
export const storage = getStorage();