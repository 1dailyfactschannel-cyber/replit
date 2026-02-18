import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uuid, jsonb, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  department: text("department"),
  position: text("position"),
  phone: text("phone"),
  timezone: text("timezone").default("UTC"),
  language: text("language").default("ru"),
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  telegram: text("telegram"),
  telegramConnected: boolean("telegram_connected").default(false),
  telegramId: text("telegram_id"),
  notes: text("notes"),
}, (table) => ({
  usernameIdx: index("users_username_idx").on(table.username),
  emailIdx: index("users_email_idx").on(table.email),
}));

// Roles table
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(), // Array of permission strings
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles junction table
export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));

// Departments table
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  parentId: uuid("parent_id").references((): any => departments.id),
  managerId: uuid("manager_id").references(() => users.id),
  color: text("color").default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members junction table
export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.teamId, table.userId] }),
}));

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  departmentId: uuid("department_id").references(() => departments.id),
  status: text("status").default("active"), // active, paused, completed, archived
  priorityId: uuid("priority_id").references(() => priorities.id), // New foreign key to priorities table
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: integer("budget"),
  currency: text("currency").default("USD"),
  color: text("color").default("#3b82f6"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project members junction table
export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // owner, admin, member, viewer
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] }),
}));

// Boards table (Kanban boards)
export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  isTemplate: boolean("is_template").default(false),
  templateId: uuid("template_id").references((): any => boards.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Board columns table
export const boardColumns = pgTable("board_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  columnId: uuid("column_id").notNull().references(() => boardColumns.id),
  assigneeId: uuid("assignee_id").references(() => users.id),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  status: text("status").default("todo"), // todo, in_progress, review, done
  priorityId: uuid("priority_id").references(() => priorities.id), // New foreign key to priorities table
  type: text("type").default("task"), // task, bug, feature, story
  storyPoints: integer("story_points"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  order: integer("order").notNull().default(0),
  number: text("number"),
  parentId: uuid("parent_id").references((): any => tasks.id),
  tags: jsonb("tags").default(sql`'[]'::jsonb`), // This will be replaced with task_labels junction table
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  boardIdIdx: index("tasks_board_id_idx").on(table.boardId),
  columnIdIdx: index("tasks_column_id_idx").on(table.columnId),
  assigneeIdIdx: index("tasks_assignee_id_idx").on(table.assigneeId),
  priorityIdIdx: index("tasks_priority_id_idx").on(table.priorityId), // New index
}));


// Subtasks table
export const subtasks = pgTable("subtasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  order: integer("order").notNull().default(0),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  taskIdIdx: index("subtasks_task_id_idx").on(table.taskId),
}));

// Task observers junction table
export const taskObservers = pgTable("task_observers", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.userId] }),
}));

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: uuid("parent_id").references((): any => comments.id),
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  taskIdIdx: index("comments_task_id_idx").on(table.taskId),
  authorIdIdx: index("comments_author_id_idx").on(table.authorId),
  createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
}));

export const insertSubtaskSchema = createInsertSchema(subtasks).pick({
  taskId: true,
  title: true,
  isCompleted: true,
  order: true,
  authorId: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  taskId: true,
  projectId: true,
  authorId: true,
  content: true,
  parentId: true,
  attachments: true,
});

// Task history table
export const taskHistory = pgTable("task_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, updated, moved, assigned, etc.
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site settings table
export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table (for connect-pg-simple)
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 128 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

// Create schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  avatar: true,
  department: true,
  position: true,
  phone: true,
  timezone: true,
  language: true,
  telegramConnected: true,
  telegramId: true,
  notes: true,
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  permissions: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  description: true,
  parentId: true,
  managerId: true,
  color: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  ownerId: true,
  departmentId: true,
  status: true,
  priorityId: true,
  startDate: true,
  endDate: true,
  budget: true,
  currency: true,
  color: true,
  isPublic: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  boardId: true,
  columnId: true,
  assigneeId: true,
  reporterId: true,
  status: true,
  priorityId: true,
  type: true,
  storyPoints: true,
  startDate: true,
  dueDate: true,
  parentId: true,
  tags: true,
  attachments: true,
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).pick({
  key: true,
  value: true,
  description: true,
  category: true,
});

export const insertBoardSchema = createInsertSchema(boards).pick({
  name: true,
  description: true,
  projectId: true,
  isTemplate: true,
  templateId: true,
});

export const insertBoardColumnSchema = createInsertSchema(boardColumns).pick({
  boardId: true,
  name: true,
  order: true,
  color: true,
});

// Priorities table
export const priorities = pgTable("priorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").default("bg-blue-500"),
  level: integer("level").notNull().default(1), // 1-10, where 10 is highest priority
});

export const insertPrioritySchema = createInsertSchema(priorities).pick({
  name: true,
  color: true,
  level: true,
});

export type Priority = typeof priorities.$inferSelect;
export type InsertPriority = z.infer<typeof insertPrioritySchema>;

// Chat folders table
export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").default("bg-blue-500"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLabelSchema = createInsertSchema(labels).pick({
  name: true,
  color: true,
});

// Chat folders table
export const chatFolders = pgTable("chat_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat folder items junction table
export const chatFolderItems = pgTable("chat_folder_items", {
  folderId: uuid("folder_id").notNull().references(() => chatFolders.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.folderId, table.chatId] }),
}));

// Chats table
export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"), // For group chats
  type: text("type").notNull().default("direct"), // direct, group
  avatar: text("avatar"),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat participants junction table
export const chatParticipants = pgTable("chat_participants", {
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.userId] }),
}));

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  chatIdIdx: index("messages_chat_id_idx").on(table.chatId),
  senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
}));

// Message attachments table
export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type"), // image, document, etc.
  size: integer("size"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calls table
export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  callerId: uuid("caller_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  type: text("type").notNull().default("audio"), // audio, video
  status: text("status").notNull().default("missed"), // completed, missed, rejected, busy
  duration: integer("duration"), // in seconds
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Export types
export type User = typeof users.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ChatFolder = typeof chatFolders.$inferSelect;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type Call = typeof calls.$inferSelect;

export const insertChatSchema = createInsertSchema(chats).pick({
  name: true,
  type: true,
  avatar: true,
  description: true,
  ownerId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  senderId: true,
  content: true,
  attachments: true,
});

export const insertChatFolderSchema = createInsertSchema(chatFolders).pick({
  userId: true,
  name: true,
  icon: true,
});

export const insertCallSchema = createInsertSchema(calls).pick({
  chatId: true,
  callerId: true,
  receiverId: true,
  type: true,
  status: true,
  duration: true,
  startedAt: true,
  endedAt: true,
});

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).pick({
  messageId: true,
  name: true,
  url: true,
  type: true,
  size: true,
});

export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertChatFolder = z.infer<typeof insertChatFolderSchema>;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Board = typeof boards.$inferSelect;
export type InsertBoard = z.infer<typeof insertBoardSchema>;

export type BoardColumn = typeof boardColumns.$inferSelect;
export type InsertBoardColumn = z.infer<typeof insertBoardColumnSchema>;

export type Label = typeof labels.$inferSelect;
export type InsertLabel = z.infer<typeof insertLabelSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(), // message, task_assigned, project_update, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to redirect
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  senderId: true,
  type: true,
  title: true,
  message: true,
  link: true,
  isRead: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

