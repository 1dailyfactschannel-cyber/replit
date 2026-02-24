import { type User, type InsertUser, type SiteSettings, type InsertSiteSettings, type CommentMention, type InsertCommentMention } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Site Settings
  getSiteSetting(key: string): Promise<SiteSettings | undefined>;
  setSiteSetting(key: string, value: string): Promise<SiteSettings>;

  createSubtask(subtask: any): Promise<any>;
  updateSubtask(id: string, updates: Partial<any>): Promise<any>;
  deleteSubtask(id: string): Promise<void>;
  getSubtask(id: string): Promise<any>;

  // Labels
  getLabels(): Promise<any[]>;
  createLabel(label: any): Promise<any>;
  updateLabel(id: string, label: any): Promise<any>;
  deleteLabel(id: string): Promise<void>;

  // Comments
  getCommentsByTask(taskId: string): Promise<any[]>;
  createComment(comment: any): Promise<any>;
  deleteComment(id: string): Promise<void>;

  // Comment Mentions
  getMentionsByUser(userId: string): Promise<any[]>;
  getCommentsWithMentions(userId: string): Promise<any[]>;

  // Board Columns
  updateBoardColumn(id: string, updates: Partial<any>): Promise<any>;
  deleteBoardColumn(id: string): Promise<void>;
  updateTaskColumnId(taskId: string, columnId: string): Promise<void>;
  getBoard(id: string): Promise<any>;
  
  // Chat
  deleteChat(id: string): Promise<void>;
}

import { PostgresStorage } from "./postgres-storage";

export const storage = new PostgresStorage();

