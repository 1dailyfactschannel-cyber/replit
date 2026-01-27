import { type User, type InsertUser, type SiteSettings, type InsertSiteSettings } from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// PostgreSQL Storage Implementation
export class PostgresStorage {
  private db: ReturnType<typeof drizzle>;
  
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const client = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
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

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.db.select().from(schema.users);
    } catch (error) {
      console.error("Error getting all users:", error);
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
      // Try to update existing setting
      const [updated] = await this.db.update(schema.siteSettings)
        .set({ value })
        .where(eq(schema.siteSettings.key, key))
        .returning();
      
      if (updated) return updated;
      
      // If not found, create new setting
      const [newSetting] = await this.db.insert(schema.siteSettings)
        .values({ key, value })
        .returning();
      
      return newSetting;
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
      const [newTask] = await this.db.insert(schema.tasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async getTasksByBoard(boardId: string): Promise<schema.Task[]> {
    try {
      return await this.db.select().from(schema.tasks).where(eq(schema.tasks.boardId, boardId));
    } catch (error) {
      console.error("Error getting tasks by board:", error);
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