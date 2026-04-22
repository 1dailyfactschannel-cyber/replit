import { getStorage } from "../postgres-storage";

const systemPermissions = [
  // Pages - view
  { key: "dashboard:view", name: "Просмотр дашборда", category: "pages" },
  { key: "projects:view", name: "Просмотр проектов", category: "pages" },
  { key: "projects:create", name: "Создание проектов", category: "pages" },
  { key: "projects:edit", name: "Редактирование проектов", category: "pages" },
  { key: "projects:delete", name: "Удаление проектов", category: "pages" },
  { key: "tasks:view", name: "Просмотр задач", category: "pages" },
  { key: "tasks:create", name: "Создание задач", category: "pages" },
  { key: "tasks:edit", name: "Редактирование задач", category: "pages" },
  { key: "tasks:delete", name: "Удаление задач", category: "pages" },
  { key: "tasks:accept", name: "Принятие задач", category: "pages" },
  { key: "calendar:view", name: "Просмотр календаря", category: "pages" },
  { key: "calendar:create", name: "Создание событий", category: "pages" },
  { key: "calendar:edit", name: "Редактирование событий", category: "pages" },
  { key: "calendar:delete", name: "Удаление событий", category: "pages" },
  { key: "chat:view", name: "Просмотр чата", category: "pages" },
  { key: "chat:create", name: "Создание чатов", category: "pages" },
  { key: "messages:send", name: "Отправка сообщений", category: "pages" },
  { key: "messages:edit", name: "Редактирование сообщений", category: "pages" },
  { key: "messages:delete", name: "Удаление сообщений", category: "pages" },
  { key: "files:upload", name: "Загрузка файлов", category: "pages" },
  { key: "call:view", name: "Просмотр звонков", category: "pages" },
  { key: "call:create", name: "Создание звонков", category: "pages" },
  { key: "team:view", name: "Просмотр команды", category: "pages" },
  { key: "team:manage", name: "Управление командой", category: "pages" },
  { key: "team:create", name: "Добавление сотрудников", category: "pages" },
  { key: "team:edit", name: "Редактирование сотрудников", category: "pages" },
  { key: "team:delete", name: "Удаление сотрудников", category: "pages" },
  { key: "team:block", name: "Блокировка сотрудников", category: "pages" },
  { key: "reports:view", name: "Просмотр отчётов", category: "pages" },
  { key: "shop:view", name: "Просмотр магазина", category: "pages" },
  { key: "shop:purchase", name: "Покупки в магазине", category: "pages" },
  { key: "profile:view", name: "Просмотр профиля", category: "pages" },
  { key: "profile:edit", name: "Редактирование профиля", category: "pages" },
  { key: "settings:view", name: "Просмотр настроек", category: "pages" },
  { key: "settings:change_password", name: "Смена пароля", category: "pages" },
  { key: "settings:notifications", name: "Настройка уведомлений", category: "pages" },
  { key: "management:view", name: "Доступ к управлению", category: "pages" },
  { key: "notifications:view", name: "Просмотр уведомлений", category: "pages" },
  { key: "notifications:read", name: "Отметка уведомлений прочитанными", category: "pages" },
  { key: "notifications:delete", name: "Удаление уведомлений", category: "pages" },

  // Boards & Columns
  { key: "boards:create", name: "Создание досок", category: "boards" },
  { key: "boards:edit", name: "Редактирование досок", category: "boards" },
  { key: "boards:delete", name: "Удаление досок", category: "boards" },
  { key: "columns:create", name: "Создание колонок", category: "boards" },
  { key: "columns:edit", name: "Редактирование колонок", category: "boards" },
  { key: "columns:delete", name: "Удаление колонок", category: "boards" },
  { key: "workspaces:create", name: "Создание рабочих пространств", category: "boards" },
  { key: "workspaces:edit", name: "Редактирование рабочих пространств", category: "boards" },

  // Management
  { key: "management:team", name: "Управление командой", category: "management" },
  { key: "management:projects", name: "Управление проектами", category: "management" },
  { key: "management:security", name: "Безопасность", category: "management" },
  { key: "management:roles", name: "Роли и права", category: "management" },
  { key: "management:calls", name: "Звонки", category: "management" },
  { key: "management:integrations", name: "Интеграции", category: "management" },
  { key: "management:balance", name: "Баланс", category: "management" },
  { key: "management:invite", name: "Приглашения", category: "management" },
  { key: "management:statuses", name: "Управление статусами", category: "management" },
  { key: "management:archive", name: "Архив", category: "management" },
  { key: "management:departments", name: "Управление отделами", category: "management" },

  // Roles
  { key: "roles:create", name: "Создание ролей", category: "roles" },
  { key: "roles:edit", name: "Редактирование ролей", category: "roles" },
  { key: "roles:delete", name: "Удаление ролей", category: "roles" },

  // Departments
  { key: "departments:create", name: "Создание отделов", category: "departments" },
  { key: "departments:edit", name: "Редактирование отделов", category: "departments" },
  { key: "departments:delete", name: "Удаление отделов", category: "departments" },

  // Statuses
  { key: "statuses:create", name: "Создание статусов", category: "statuses" },
  { key: "statuses:edit", name: "Редактирование статусов", category: "statuses" },
  { key: "statuses:delete", name: "Удаление статусов", category: "statuses" },

  // Integrations
  { key: "integrations:telegram", name: "Telegram интеграция", category: "integrations" },
  { key: "integrations:yandex_calendar", name: "Яндекс Календарь", category: "integrations" },
  { key: "integrations:manage", name: "Управление интеграциями", category: "integrations" },
];

const systemRoles = [
  {
    name: "Администратор",
    description: "Полный доступ ко всем функциям системы",
    color: "#ef4444",
    permissions: systemPermissions.map(p => p.key),
    isSystem: true
  },
  {
    name: "Менеджер",
    description: "Управление проектами и командой",
    color: "#3b82f6",
    permissions: [
      // Pages
      "dashboard:view", "projects:view", "projects:create", "projects:edit",
      "tasks:view", "tasks:create", "tasks:edit",
      "calendar:view", "calendar:create", "calendar:edit",
      "chat:view", "chat:create", "messages:send", "messages:edit", "files:upload",
      "call:view", "call:create",
      "team:view", "team:manage", "team:create", "team:edit",
      "reports:view", "shop:view", "shop:purchase",
      "profile:view", "profile:edit",
      "settings:view", "settings:change_password", "settings:notifications",
      "notifications:view", "notifications:read",
      // Boards
      "boards:create", "boards:edit", "boards:delete",
      "columns:create", "columns:edit", "columns:delete",
      "workspaces:create", "workspaces:edit",
      // Departments
      "departments:create", "departments:edit",
      // Statuses
      "statuses:create", "statuses:edit", "statuses:delete",
    ],
    isSystem: true
  },
  {
    name: "Сотрудник",
    description: "Базовый доступ к рабочим инструментам",
    color: "#22c55e",
    permissions: [
      // Pages
      "dashboard:view", "projects:view",
      "tasks:view", "tasks:create", "tasks:edit",
      "calendar:view", "calendar:create",
      "chat:view", "chat:create", "messages:send", "files:upload",
      "call:view", "call:create",
      "team:view",
      "reports:view", "shop:view", "shop:purchase",
      "profile:view", "profile:edit",
      "settings:view", "settings:change_password", "settings:notifications",
      "notifications:view", "notifications:read",
      // Boards
      "boards:create", "boards:edit",
      "columns:create", "columns:edit",
    ],
    isSystem: true
  },
  {
    name: "Гость",
    description: "Только просмотр",
    color: "#64748b",
    permissions: [
      // Pages
      "dashboard:view", "projects:view",
      "tasks:view",
      "calendar:view",
      "chat:view", "messages:send",
      "call:view",
      "team:view",
      "profile:view", "profile:edit",
      "notifications:view", "notifications:read",
    ],
    isSystem: true
  }
];

export async function initializeRolesAndPermissions() {
  const storage = getStorage();

  console.log("Initializing system permissions...");

  // Create permissions
  for (const perm of systemPermissions) {
    try {
      const existing = await storage.getPermission(perm.key);
      if (!existing) {
        await storage.createPermission({
          key: perm.key,
          name: perm.name,
          description: "",
          category: perm.category
        });
        console.log(`Created permission: ${perm.key}`);
      }
    } catch (error) {
      console.log(`Permission ${perm.key} already exists or error:`, error);
    }
  }

  console.log("Initializing system roles...");

  // Create roles
  for (const role of systemRoles) {
    try {
      const roles = await storage.getAllRoles();
      const existing = roles.find(r => r.name === role.name);

      if (!existing) {
        await storage.createRole({
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: role.isSystem
        } as any);
        console.log(`Created role: ${role.name}`);
      } else {
        // Don't overwrite existing role permissions - they may have been customized via UI
        console.log(`Role exists: ${role.name} (keeping existing permissions)`);
      }
    } catch (error) {
      console.log(`Role ${role.name} error:`, error);
    }
  }

  console.log("Roles and permissions initialized successfully!");
}

export async function ensureAdminUsers() {
  const storage = getStorage();

  try {
    const roles = await storage.getAllRoles();
    const adminRole = roles.find(r => r.name === "Администратор");
    if (!adminRole) {
      console.log("[ensureAdminUsers] Admin role not found, skipping");
      return;
    }

    const users = await storage.getAllUsers();
    const adminUser = users.find(u => u.email === "qw1e1@mail.ru");
    if (!adminUser) {
      console.log("[ensureAdminUsers] User qw1e1@mail.ru not found, skipping");
      return;
    }

    const userRoles = await storage.getUserRoles(adminUser.id);
    const hasAdminRole = userRoles.some(r => r.name === "Администратор");

    if (!hasAdminRole) {
      console.log(`[ensureAdminUsers] Assigning admin role to ${adminUser.email} (${adminUser.id})`);
      await storage.assignRoleToUser(adminUser.id, adminRole.id);
      console.log("[ensureAdminUsers] Admin role assigned successfully");
    } else {
      console.log("[ensureAdminUsers] User already has admin role");
    }
  } catch (error) {
    console.error("[ensureAdminUsers] Error:", error);
  }
}

// Don't auto-run - called from server/index.ts instead
