import { getStorage } from "../postgres-storage";

const systemPermissions = [
  // Pages
  { key: "dashboard:view", name: "Просмотр дашборда", category: "pages" },
  { key: "projects:view", name: "Просмотр проектов", category: "pages" },
  { key: "projects:create", name: "Создание проектов", category: "pages" },
  { key: "tasks:view", name: "Просмотр задач", category: "pages" },
  { key: "tasks:create", name: "Создание задач", category: "pages" },
  { key: "calendar:view", name: "Просмотр календаря", category: "pages" },
  { key: "chat:view", name: "Просмотр чата", category: "pages" },
  { key: "call:view", name: "Просмотр звонков", category: "pages" },
  { key: "call:create", name: "Создание комнат звонков", category: "pages" },
  { key: "team:view", name: "Просмотр команды", category: "pages" },
  { key: "team:manage", name: "Управление командой", category: "pages" },
  { key: "reports:view", name: "Просмотр отчётов", category: "pages" },
  { key: "shop:view", name: "Просмотр магазина", category: "pages" },
  { key: "profile:view", name: "Просмотр профиля", category: "pages" },
  { key: "settings:view", name: "Просмотр настроек", category: "pages" },
  { key: "management:view", name: "Доступ к управлению", category: "pages" },
  
  // Management
  { key: "management:team", name: "Управление командой", category: "management" },
  { key: "management:projects", name: "Управление проектами", category: "management" },
  { key: "management:security", name: "Безопасность", category: "management" },
  { key: "management:roles", name: "Роли и права", category: "management" },
  { key: "management:calls", name: "Звонки", category: "management" },
  { key: "management:integrations", name: "Интеграции", category: "management" },
  { key: "management:balance", name: "Баланс", category: "management" },
];

const systemRoles = [
  {
    name: "Администратор",
    description: "Полный доступ ко всем функциям системы",
    color: "#ef4444",
    permissions: [
      "dashboard:view", "projects:view", "projects:create",
      "tasks:view", "tasks:create",
      "calendar:view", "chat:view",
      "call:view", "call:create",
      "team:view", "team:manage",
      "reports:view", "shop:view",
      "profile:view", "settings:view",
      "management:view",
      "management:team", "management:projects", "management:security",
      "management:roles", "management:calls", "management:integrations", "management:balance"
    ],
    isSystem: true
  },
  {
    name: "Менеджер",
    description: "Управление проектами и командой",
    color: "#3b82f6",
    permissions: [
      "dashboard:view", "projects:view", "projects:create",
      "tasks:view", "tasks:create",
      "calendar:view", "chat:view",
      "call:view", "call:create",
      "team:view", "team:manage",
      "reports:view", "shop:view",
      "profile:view", "settings:view",
    ],
    isSystem: true
  },
  {
    name: "Сотрудник",
    description: "Базовый доступ к рабочим инструментам",
    color: "#22c55e",
    permissions: [
      "dashboard:view", "projects:view",
      "tasks:view", "tasks:create",
      "calendar:view", "chat:view",
      "call:view",
      "team:view",
      "reports:view", "shop:view",
      "profile:view", "settings:view",
    ],
    isSystem: true
  },
  {
    name: "Гость",
    description: "Только просмотр",
    color: "#64748b",
    permissions: [
      "dashboard:view", "projects:view",
      "tasks:view",
      "calendar:view", "chat:view",
      "team:view",
      "profile:view",
    ],
    isSystem: true
  }
];

export async function initializeRolesAndPermissions() {
  const storage = getStorage();
  
  console.log("Initializing system permissions...");
  
  // Create permissions
  for (const perm of systemPermissions) {
    const existing = await storage.getPermission(perm.key);
    if (!existing) {
      await storage.createPermission({
        key: perm.key,
        name: perm.name,
        description: "",
        category: perm.category,
        parentKey: null,
        isSystem: true
      } as any);
      console.log(`Created permission: ${perm.key}`);
    }
  }
  
  console.log("Initializing system roles...");
  
  // Create roles
  for (const role of systemRoles) {
    const roles = await storage.getAllRoles();
    const existing = roles.find(r => r.name === role.name);
    
    if (!existing) {
      await storage.createRole({
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: role.permissions,
        isSystem: role.isSystem
      } as any);
      console.log(`Created role: ${role.name}`);
    } else {
      // Update existing role permissions
      await storage.updateRolePermissions(existing.id, role.permissions);
      console.log(`Updated role: ${role.name}`);
    }
  }
  
  console.log("Roles and permissions initialized successfully!");
}

// Run if called directly
initializeRolesAndPermissions().catch(console.error);
