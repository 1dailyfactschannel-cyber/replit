# Техническое задание: Страница "Сотрудники"

## Общее описание
Страница для отображения списка всех активных сотрудников компании с их текущим статусом, должностью и комментариями.

## 1. Структура файлов

```
src/
├── app/
│   └── dashboard/
│       └── employees/
│           └── page.tsx          # Основная страница
├── components/
│   ├── status-badge.tsx          # Компонент отображения статуса
│   └── ui/                       # UI компоненты
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── table.tsx
├── context/
│   └── auth-provider.tsx         # Контекст для получения данных
├── lib/
│   ├── data-fetching.ts          # Функции загрузки данных
│   ├── data.ts                   # Типы данных
│   └── utils.ts                  # Утилиты
```

## 2. Типы данных (TypeScript)

### User (сотрудник)
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Email сотрудника
  firstName: string;             // Имя
  lastName: string;              // Фамилия
  position: string;              // Должность
  role: 'admin' | 'employee';    // Роль
  status: 'online' | 'offline' | 'busy';  // Статус
  statusComment: string;         // Комментарий к статусу
  balance: number;               // Баланс баллов
  avatar: string | null;         // URL аватара
  isRemote: boolean;             // Работает ли удаленно
  disabled: boolean;             // Заблокирован ли
  lastSeen: string;              // Последняя активность
  telegram: string | null;       // Telegram username
  telegramChatId: string | null; // ID чата Telegram
}
```

### Status (статус)
```typescript
type Status = 'online' | 'offline' | 'busy';
```

## 3. Компоненты интерфейса

### 3.1. Основная страница (EmployeesPage)
**Файл:** `src/app/dashboard/employees/page.tsx`

**Функциональность:**
- Загрузка списка сотрудников через AuthContext
- Поиск по имени, должности, статусу и комментарию
- Отображение сотрудников в табличном виде
- Сортировка: сначала "online", затем "busy", затем "offline"
- Фильтрация: только активные сотрудники (disabled = false)

**Состояния:**
- `loading` - загрузка данных
- `query` - строка поиска
- `users` - список сотрудников

### 3.2. StatusBadge (Индикатор статуса)
**Файл:** `src/components/status-badge.tsx`

**Props:**
```typescript
interface StatusBadgeProps {
  status: Status;
  className?: string;
}
```

**Отображение:**
- `online` - зеленый badge "В сети"
- `offline` - серый badge "Не в сети"
- `busy` - красный badge "Занят"

### 3.3. Avatar (Аватар с индикатором статуса)
**Файл:** `src/components/ui/avatar.tsx`

**Props:**
```typescript
interface AvatarProps {
  src?: string;
  alt?: string;
  status?: Status;
  className?: string;
}
```

**Функциональность:**
- Отображение изображения аватара
- Fallback на инициалы (первая буква имени и фамилии)
- Цветная рамка в зависимости от статуса

## 4. API и данные

### 4.1. Получение списка сотрудников

**Функция:** `fetchUsersMinimal()`
**Файл:** `src/lib/data-fetching.ts`

**Запрос:**
```sql
SELECT 
  id, email, first_name, last_name, position, role, 
  status, status_comment, balance, avatar, is_remote, 
  disabled, last_seen, telegram, telegram_chat_id
FROM users
WHERE disabled = false
ORDER BY last_seen DESC
LIMIT 100;
```

**Возвращает:** `Promise<User[]>`

### 4.2. AuthContext

**Файл:** `src/context/auth-provider.tsx`

**Предоставляет:**
```typescript
{
  users: User[];           // Список всех сотрудников
  loading: boolean;        // Состояние загрузки
  refreshUsers: () => Promise<void>;  // Обновить список
}
```

## 5. Логика работы

### 5.1. Загрузка данных
1. При монтировании компонента вызывается `refreshUsers()` из AuthContext
2. AuthContext загружает список через `fetchUsersMinimal()`
3. Данные сохраняются в состоянии `users`
4. Устанавливается `loading = false`

### 5.2. Фильтрация и сортировка

**Фильтрация (visibleEmployees):**
- Убирает заблокированных (`disabled = true`)
- Убирает пустые объекты
- Удаляет дубликаты по `id`

**Сортировка:**
1. Сначала "online" (приоритет 0)
2. Затем "busy" (приоритет 1)
3. Затем "offline" (приоритет 2)
4. Внутри группы по фамилии (lastName)

**Поиск (filteredEmployees):**
- Поиск по: имени, фамилии, должности, статусу, комментарию
- Регистронезависимый поиск
- Работает через `useDeferredValue` для оптимизации

### 5.3. Отображение таблицы

**Колонки:**
1. **Сотрудник** (30%)
   - Аватар с индикатором статуса
   - Имя и фамилия
   - Иконка Telegram (если указан)
   
2. **Должность** (20%)
   - Текст должности
   
3. **Удаленка** (12%)
   - Иконка компьютера, если `isRemote = true`
   
4. **Статус** (18%)
   - StatusBadge с цветом
   
5. **Комментарий** (20%)
   - Текст комментария к статусу

## 6. UI/UX

### 6.1. Состояния загрузки
- Отображается спиннер Loader2 в центре экрана
- Текст: "Загрузка..."

### 6.2. Пустое состояние
- Текст: "Нет данных о сотрудниках"
- Отображается когда filteredEmployees.length === 0

### 6.3. Поиск
- Поле ввода с иконкой лупы
- Placeholder: "Поиск по имени, статусу, должности, комментарию"
- Фильтрация в реальном времени
- Debounce через useDeferredValue

### 6.4. Адаптивность
- Контейнер: `container mx-auto px-4 py-6`
- Таблица: `overflow-x-auto` для горизонтального скролла
- Минимальные ширины колонок для мобильных

## 7. Код страницы

```tsx
"use client";

import { useMemo, useState, useDeferredValue } from "react";
import { useAuth } from "@/context/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Computer, Search, Send as SendIcon } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function EmployeesStatusesPage() {
  const { users, loading } = useAuth();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Фильтрация и сортировка сотрудников
  const visibleEmployees = useMemo(() => {
    const valid = users.filter((u) => u && Object.keys(u).length > 0 && !u.disabled);
    
    // Удаление дубликатов
    const uniqueUsers = Array.from(new Map(valid.map(u => [u.id, u])).values());
    
    // Сортировка по статусу и фамилии
    const rank = (s: string | undefined) => s === "online" ? 0 : s === "offline" ? 2 : 1;
    return uniqueUsers.sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return (a.lastName || "").localeCompare(b.lastName || "");
    });
  }, [users]);

  // Поиск по запросу
  const filteredEmployees = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return visibleEmployees;
    return visibleEmployees.filter((emp) => {
      const fullName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.toLowerCase();
      const position = (emp.position ?? "").toLowerCase();
      const status = (emp.status ?? "").toLowerCase();
      const comment = (emp.statusComment ?? "").toLowerCase();
      return (
        fullName.includes(q) ||
        position.includes(q) ||
        status.includes(q) ||
        comment.includes(q)
      );
    });
  }, [visibleEmployees, deferredQuery]);

  // Состояние загрузки
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Сотрудники</CardTitle>
          <CardDescription>Список статусов и комментариев</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по имени, статусу, должности, комментарию"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных о сотрудниках</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%] min-w-[200px]">Сотрудник</TableHead>
                    <TableHead className="w-[20%] min-w-[160px]">Должность</TableHead>
                    <TableHead className="w-[12%] min-w-[120px]">Удаленка</TableHead>
                    <TableHead className="w-[18%] min-w-[160px]">Статус</TableHead>
                    <TableHead className="w-[20%] min-w-[200px]">Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8" status={emp.status || 'offline'}>
                            <AvatarImage 
                              src={emp.avatar || undefined} 
                              alt={`${emp.firstName} ${emp.lastName}`}
                              loading="lazy"
                              decoding="async"
                            />
                            <AvatarFallback>
                              {emp.firstName?.[0] ?? "?"}
                              {emp.lastName?.[0] ?? ""}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium leading-tight truncate flex items-center gap-2">
                              <span className="truncate">{emp.firstName} {emp.lastName}</span>
                              {emp.telegram && (
                                <SendIcon
                                  className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://t.me/${emp.telegram!.replace('@', '')}`, '_blank');
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground truncate">{emp.position || "—"}</div>
                      </TableCell>
                      <TableCell>
                        {emp.isRemote ? <Computer className="h-4 w-4 text-muted-foreground" /> : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={emp.status || "offline"} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground break-words">{emp.statusComment || ""}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## 8. Дополнительные требования

### 8.1. Оптимизации
- Использовать `useMemo` для фильтрации и сортировки
- Использовать `useDeferredValue` для поиска
- Добавить `loading="lazy"` для изображений аватаров
- Использовать `key={emp.id}` для стабильности React

### 8.2. Доступность
- Alt-тексты для аватаров
- ARIA-метки для интерактивных элементов
- Контрастные цвета для статусов

### 8.3. Обработка ошибок
- Проверка наличия данных перед отображением
- Fallback на инициалы если нет аватара
- Обработка null/undefined значений

## 9. Тестирование

### Тест-кейсы:
1. **Загрузка страницы** - отображается список сотрудников
2. **Поиск по имени** - фильтрует список
3. **Поиск по должности** - фильтрует список
4. **Пустой поиск** - отображает "Нет данных"
5. **Сортировка** - online сотрудники первые
6. **Аватары** - отображаются или показываются инициалы
7. **Telegram** - иконка открывает чат
8. **Удаленка** - иконка отображается

## 10. Будущие улучшения

- Пагинация для больших списков
- Фильтры по ролям и отделам
- Экспорт списка в CSV
- Редактирование профиля inline
- Drag & drop для сортировки
- Группировка по отделам