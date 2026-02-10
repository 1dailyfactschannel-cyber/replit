# Database Schema Documentation

## Overview
This document describes the database schema for TeamSync - a comprehensive project management system.

## Core Entities

### 1. Users (`users`)
Main user entity storing all user-related information.

**Fields:**
- `id` - UUID primary key
- `username` - Unique username
- `email` - Unique email address
- `password` - Hashed password
- `firstName`, `lastName` - User's name
- `avatar` - Profile picture URL
- `department` - User's department
- `position` - Job position
- `phone` - Contact phone number
- `timezone` - User's timezone (default: UTC)
- `language` - Preferred language (default: ru)
- `isActive` - Account status
- `isOnline` - Online status
- `lastSeen` - Last activity timestamp
- `createdAt`, `updatedAt` - Timestamps
- `telegramConnected` - Telegram integration status
- `telegramId` - Telegram user ID
- `notes` - Additional notes

### 2. Roles (`roles`)
Role-based access control system.

**Fields:**
- `id` - UUID primary key
- `name` - Unique role name
- `description` - Role description
- `permissions` - JSON array of permissions
- `isSystem` - System role flag
- `createdAt`, `updatedAt` - Timestamps

### 3. Departments (`departments`)
Organization structure management.

**Fields:**
- `id` - UUID primary key
- `name` - Unique department name
- `description` - Department description
- `parentId` - Parent department (self-reference)
- `managerId` - Department manager reference
- `color` - Visual identifier color
- `createdAt`, `updatedAt` - Timestamps

### 4. Projects (`projects`)
Main project containers.

**Fields:**
- `id` - UUID primary key
- `name` - Project name
- `description` - Project description
- `ownerId` - Project owner reference
- `departmentId` - Associated department
- `status` - Project status (active, paused, completed, archived)
- `priority` - Priority level (low, medium, high, critical)
- `startDate`, `endDate` - Project timeline
- `budget` - Budget amount
- `currency` - Currency code
- `color` - Visual identifier
- `isPublic` - Public access flag
- `createdAt`, `updatedAt` - Timestamps

### 5. Teams (`teams`)
Cross-functional groups for collaboration.

**Fields:**
- `id` - UUID primary key
- `name` - Team name
- `description` - Team description
- `projectId` - Associated project
- `departmentId` - Associated department
- `createdAt`, `updatedAt` - Timestamps

### 6. Boards (`boards`)
Kanban-style project boards.

**Fields:**
- `id` - UUID primary key
- `name` - Board name
- `description` - Board description
- `projectId` - Parent project
- `isTemplate` - Template flag
- `templateId` - Template reference (self-reference)
- `createdAt`, `updatedAt` - Timestamps

### 7. Board Columns (`board_columns`)
Kanban board columns (statuses).

**Fields:**
- `id` - UUID primary key
- `boardId` - Parent board
- `name` - Column name
- `order` - Display order
- `color` - Visual identifier
- `createdAt`, `updatedAt` - Timestamps

### 8. Tasks (`tasks`)
Individual work items.

**Fields:**
- `id` - UUID primary key
- `title` - Task title
- `description` - Detailed description
- `boardId` - Parent board
- `columnId` - Current column/status
- `assigneeId` - Assigned user
- `reporterId` - Reporting user
- `status` - Task status (todo, in_progress, review, done)
- `priority` - Priority level
- `type` - Task type (task, bug, feature, story)
- `storyPoints` - Estimation points
- `startDate`, `dueDate` - Timeline
- `completedAt` - Completion timestamp
- `order` - Display order
- `parentId` - Parent task (subtasks)
- `tags` - JSON array of tags
- `attachments` - JSON array of attachments
- `createdAt`, `updatedAt` - Timestamps

### 9. Subtasks (`subtasks`)
Task decomposition items.

**Fields:**
- `id` - UUID primary key
- `taskId` - Parent task
- `title` - Subtask title
- `isCompleted` - Completion status
- `order` - Display order
- `createdAt`, `updatedAt` - Timestamps

### 10. Comments (`comments`)
Discussion and feedback system.

**Fields:**
- `id` - UUID primary key
- `taskId` - Associated task
- `projectId` - Associated project
- `authorId` - Comment author
- `content` - Comment text
- `parentId` - Parent comment (threading)
- `attachments` - JSON array of attachments
- `createdAt`, `updatedAt` - Timestamps

### 11. Task History (`task_history`)
Audit trail for task changes.

**Fields:**
- `id` - UUID primary key
- `taskId` - Associated task
- `userId` - User who made change
- `action` - Action type
- `fieldName` - Modified field
- `oldValue`, `newValue` - Change values
- `createdAt` - Timestamp

### 12. Junction Tables

#### User Roles (`user_roles`)
Many-to-many relationship between users and roles.
- Composite primary key: (userId, roleId)

#### Team Members (`team_members`)
Many-to-many relationship between teams and users.
- Composite primary key: (teamId, userId)
- `role` - Member role within team

#### Project Members (`project_members`)
Many-to-many relationship between projects and users.
- Composite primary key: (projectId, userId)
- `role` - Member role (owner, admin, member, viewer)

#### Task Observers (`task_observers`)
Many-to-many relationship for task watchers.
- Composite primary key: (taskId, userId)

### 13. System Tables

#### Site Settings (`site_settings`)
Application configuration storage.
- `id` - UUID primary key
- `key` - Unique setting key
- `value` - Setting value
- `description` - Setting description
- `category` - Setting category
- `createdAt`, `updatedAt` - Timestamps

#### Sessions (`sessions`)
Session storage for connect-pg-simple.
- `sid` - Session ID
- `sess` - Session data (JSON)
- `expire` - Expiration timestamp

## Relationships Overview

```
Departments 1---∞ Projects
Departments 1---∞ Teams
Departments 1---∞ Users (manager)

Users 1---∞ Projects (owner)
Users 1---∞ Tasks (assignee, reporter)
Users 1---∞ Comments (author)
Users 1---∞ TaskHistory (user)

Projects 1---∞ Teams
Projects 1---∞ Boards
Projects 1---∞ Comments

Teams ∞---∞ Users (team_members)
Projects ∞---∞ Users (project_members)

Boards 1---∞ BoardColumns
Boards 1---∞ Tasks

BoardColumns 1---∞ Tasks

Tasks 1---∞ Subtasks
Tasks 1---∞ Comments
Tasks 1---∞ TaskHistory
Tasks ∞---∞ Users (task_observers)

Roles ∞---∞ Users (user_roles)
```

## Index Strategy

### Primary Keys
All tables use UUID primary keys for distributed scalability.

### Foreign Keys
- All foreign key relationships include `ON DELETE CASCADE` where appropriate
- Self-references use explicit typing to avoid circular dependencies

### Performance Considerations
- Frequently queried fields should have indexes
- JSON fields are used for flexible data structures
- Timestamps for audit trails and analytics

## Data Integrity Rules

1. **Cascade Deletes**: Child records are automatically deleted when parents are removed
2. **Unique Constraints**: Username, email, role names, department names, setting keys
3. **NotNull Constraints**: Essential fields like usernames, emails, passwords
4. **Default Values**: Sensible defaults for optional fields
5. **Validation**: Zod schemas for data validation at application level

## Migration Strategy

1. Use Drizzle Kit for schema generation
2. Version-controlled migrations
3. Automated deployment scripts
4. Backward compatibility maintained
5. Rollback procedures documented

This schema supports the full TeamSync feature set including project management, team collaboration, task tracking, and system administration.