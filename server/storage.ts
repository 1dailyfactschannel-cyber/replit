import { type User, type InsertUser, type SiteSettings, type InsertSiteSettings } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  
  // Site Settings
  getSiteSetting(key: string): Promise<SiteSettings | undefined>;
  setSiteSetting(key: string, value: string): Promise<SiteSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private settings: Map<string, SiteSettings>;

  constructor() {
    this.users = new Map();
    this.settings = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      notes: insertUser.notes ?? null,
      department: insertUser.department ?? null,
      telegramConnected: insertUser.telegramConnected ?? "false",
      telegramId: insertUser.telegramId ?? null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, update: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...update };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Site Settings implementation
  async getSiteSetting(key: string): Promise<SiteSettings | undefined> {
    return Array.from(this.settings.values()).find(s => s.key === key);
  }

  async setSiteSetting(key: string, value: string): Promise<SiteSettings> {
    const existing = await this.getSiteSetting(key);
    if (existing) {
      const updated = { ...existing, value };
      this.settings.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newSetting = { id, key, value };
    this.settings.set(id, newSetting);
    return newSetting;
  }
}

export const storage = new MemStorage();
