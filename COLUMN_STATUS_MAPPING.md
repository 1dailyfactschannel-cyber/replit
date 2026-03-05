# Маппинг статусов колонок

Этот документ описывает систему автоматического соответствия статусов задач колонкам канбан-доски.

## 📋 Обзор

Система обеспечивает **автоматическое соответствие** статуса задачи названию колонки, в которой она находится. Это гарантирует, что при перемещении задачи между колонками её статус всегда актуален.

## 🔧 Как это работает

### 1. Централизованный маппинг

Все соответствия хранятся в файле [`shared/column-status-mapping.ts`](shared/column-status-mapping.ts):

```typescript
export const COLUMN_STATUS_MAPPING: Record<string, string> = {
  // Статус "done" (Готово)
  'готово': 'done',
  'done': 'done',
  'completed': 'done',
  
  // Статус "review" (На проверке)
  'на проверке': 'review',
  'review': 'review',
  'testing': 'review',
  
  // Статус "in_progress" (В работе)
  'в работе': 'in_progress',
  'in progress': 'in_progress',
  
  // Статус "todo" (В планах) - по умолчанию
  'в планах': 'todo',
  'todo': 'todo',
};
```

### 2. Автоматическое применение

Система автоматически применяет маппинг в трех местах:

#### При обновлении задачи (PATCH /api/tasks/:id)
Когда задача перемещается в другую колонку, её статус автоматически обновляется:

```typescript
if (updateData.columnId) {
  const column = await storage.getColumn(updateData.columnId);
  if (column && column.name) {
    updateData.status = getStatusByColumnName(column.name);
  }
}
```

#### При создании задачи (POST /api/boards/:boardId/tasks)
Новая задача получает статус, соответствующий колонке:

```typescript
const determinedStatus = targetColumn && targetColumn.name 
  ? getStatusByColumnName(targetColumn.name)
  : 'todo';
```

#### При загрузке задач
При получении задач из API система проверяет и при необходимости исправляет статусы:

```typescript
tasks = await ensureAllTasksStatusMatch(tasks);
```

## ➕ Добавление новых колонок

Чтобы добавить новую колонку с корректным маппингом:

### Шаг 1: Добавьте названия в маппинг

Откройте [`shared/column-status-mapping.ts`](shared/column-status-mapping.ts) и добавьте новые названия:

```typescript
export const COLUMN_STATUS_MAPPING: Record<string, string> = {
  // ... существующие маппинги
  
  // Новая категория (например, "На доработке")
  'на доработке': 'needs_revision',
  'needs revision': 'needs_revision',
  'to revise': 'needs_revision',
  
  // ... остальные маппинги
};
```

### Шаг 2: Используйте в коде (если нужен новый статус)

Если вы добавили совершенно новый статус (не `done`, `review`, `in_progress` или `todo`), убедитесь, что он поддерживается в вашей системе.

## 🎯 Доступные функции

### `getStatusByColumnName(columnName: string): string`
Получает статус по названию колонки.

```typescript
import { getStatusByColumnName } from "@shared/column-status-mapping";

const status = getStatusByColumnName("В работе"); // вернет "in_progress"
const status = getStatusByColumnName("Custom Column"); // вернет "todo" (по умолчанию)
```

### `isStatusMatchingColumn(columnName: string, status: string): boolean`
Проверяет соответствие статуса названию колонки.

```typescript
import { isStatusMatchingColumn } from "@shared/column-status-mapping";

const matches = isStatusMatchingColumn("В работе", "in_progress"); // true
const matches = isStatusMatchingColumn("В работе", "todo"); // false
```

## 🔍 Логирование и отладка

Система логирует все изменения статусов:

```
[PATCH] Column: В работе -> status: in_progress
[STATUS FIX] Task abc-123: status "todo" doesn't match column "В работе". Expected: "in_progress". Updating...
```

## 📝 Примеры использования

### Пример 1: Перемещение задачи
```
Было: Задача в колонке "В планах" со статусом "todo"
Действие: Переместили в колонку "В работе"
Стало: Задача в колонке "В работе" со статусом "in_progress" ✅
```

### Пример 2: Создание задачи
```
Действие: Создали задачу в колонке "На проверке"
Результат: Задача создана со статусом "review" ✅
```

### Пример 3: Исправление рассинхронизации
```
Было: Задача в колонке "В работе" со статусом "todo" (рассинхронизация)
Действие: Загрузили задачи через API
Стало: Задача обновлена на статус "in_progress" ✅
```

## 🌟 Преимущества

1. **Автоматизация**: Не нужно вручную менять статус при перемещении
2. **Гибкость**: Легко добавлять новые колонки
3. **Надежность**: Автоматическое исправление рассинхронизации
4. **Прозрачность**: Полное логирование всех изменений
5. **Универсальность**: Поддержка русских и английских названий

## 🔄 Поддерживаемые статусы

| Статус | Описание | Примеры колонок |
|--------|----------|-----------------|
| `todo` | В планах | В планах, Todo, Backlog, Очередь |
| `in_progress` | В работе | В работе, In Progress, Разработка, Doing |
| `review` | На проверке | На проверке, Review, Testing, QA |
| `done` | Готово | Готово, Done, Completed, Завершено |

---

**Дата последнего обновления**: 2025-03-03  
**Файл конфигурации**: `shared/column-status-mapping.ts`
