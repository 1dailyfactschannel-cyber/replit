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

  createSubtask(subtask: any): Promise<any>;
  updateSubtask(id: string, updates: Partial<any>): Promise<any>;
  deleteSubtask(id: string): Promise<void>;
  getSubtask(id: string): Promise<any>;
}

import { PostgresStorage } from "./postgres-storage";

export const storage = new PostgresStorage();

