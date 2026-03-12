# Развертывание m4portal в Portainer

## Подготовка проекта

### 1. Настройка переменных окружения

Создайте файл `.env` в корне проекта (если ещё не создан):

```bash
# PostgreSQL (подключение к существующей базе)
DATABASE_URL=postgresql://user:password@host:port/database

# Пример:
# DATABASE_URL=postgresql://m4portal_user:password@192.168.1.100:5432/m4portal

# Session Secret (обязательно измените!)
SESSION_SECRET=your_random_secret_key_here

# Allowed Origins (для CORS)
ALLOWED_ORIGINS=http://localhost:8090,https://your-domain.com

# Application URL
APP_URL=https://your-domain.com

# Redis (опционально, если есть внешний Redis)
REDIS_URL=redis://redis-host:6379
# Или оставьте пустым для in-memory cache

# Yandex Calendar (опционально)
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
```

### 2. Настройка подключения к существующей базе данных

Если база данных развернута в другом стеке Portainer:

1. **Убедитесь, что база доступна из сети контейнеров**
   - Оба контейнера должны быть в одной сети Docker
   - Или используйте IP-адрес хоста (host.docker.internal)

2. **Обновите переменную DATABASE_URL:**
   - Формат: `postgresql://user:password@host:port/database`
   - Пример: `postgresql://m4portal_user:pass@db-host:5432/m4portal`

3. **Проверьте доступность базы:**
   ```bash
   # Из контейнера
   docker exec m4portal-server curl -v telnet://db-host:5432
   
   # Или используйте psql
   docker exec m4portal-server psql $DATABASE_URL -c "SELECT 1"
   ```

### 3. Создание стека в Portainer

#### Метод 1: Через интерфейс Portainer

1. Откройте Portainer и перейдите в раздел **Stacks**
2. Нажмите **Add stack**
3. Введите имя стека: `m4portal`
4. Вставьте содержимое файла `docker-compose.yml`
5. В разделе **Environment variables** укажите:
   - `DATABASE_URL` - подключение к существующей базе
   - `SESSION_SECRET` - секретный ключ
   - `ALLOWED_ORIGINS` - домены для CORS
   - `APP_URL` - URL приложения
6. Нажмите **Deploy the stack**

#### Метод 2: Через командную строку

```bash
# Перейдите в папку проекта
cd /path/to/m4portal

# Создайте .env файл (см. выше)
# Затем запустите стек
docker compose up -d
```

### 4. Настройка сети (если база в другом стеке)

Если база данных находится в другом стеке Portainer, нужно создать общую сеть:

**Вариант A: Общая сеть между стеками**
```bash
# Создать общую сеть
docker network create shared-network

# Подключить оба контейнера к сети
# 1. Модифицировать docker-compose.yml:
networks:
  - shared-network

# 2. Добавить сеть в настройках другого стека с базой
```

**Вариант B: Использование host.docker.internal (для Docker Desktop)**
```env
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/database
```

**Вариант C: Использование IP-адреса хоста**
```env
DATABASE_URL=postgresql://user:password@192.168.1.100:5432/database
```

### 5. Проверка развертывания

```bash
# Просмотр контейнеров
docker ps

# Логи сервера
docker logs -f m4portal-server

# Логи клиента
docker logs -f m4portal-client

# Проверка подключения к БД
docker exec m4portal-server node -e "console.log(process.env.DATABASE_URL)"
```

## Архитектура контейнеров

```
┌─────────────────────────────────────────────────────────────┐
│                    Portainer (Stack 1)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Существующая база данных               │    │
│  │                  (PostgreSQL)                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Portainer (Stack 2)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Сеть: shared-network или default       │    │
│  │                                                     │    │
│  │  ┌───────────────┐     ┌───────────────┐          │    │
│  │  │  Node.js API  │     │  Nginx Client │          │    │
│  │  │  (Port 3000)  │────▶│  (Port 80)    │          │    │
│  │  └───────────────┘     └───────────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Маппинг портов

| Контейнер | Порт | Описание |
|-----------|------|----------|
| Server | 3245:3000 | API сервер (доступен с хоста) |
| Client | 8090:80 | Frontend приложение |

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | Подключение к PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Секрет сессий (обязательно!) | `your-random-secret` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:8090` |
| `APP_URL` | URL приложения | `https://your-domain.com` |
| `REDIS_URL` | Redis (опционально) | `redis://host:6379` |

## Обновление приложения

### Обновление через Portainer

1. Перейдите в раздел **Stacks**
2. Выберите ваш стек `m4portal`
3. Нажмите **Update the stack**
4. Вставьте обновлённый `docker-compose.yml`
5. Нажмите **Update the stack**

### Обновление через CLI

```bash
# Остановить контейнеры
docker compose down

# Пересобрать образы
docker compose build --no-cache

# Запустить
docker compose up -d
```

## Устранение проблем

### Контейнеры не запускаются

```bash
# Просмотр логов
docker logs m4portal-server
docker logs m4portal-client

# Проверка сети
docker network ls
docker network inspect m4portal-network
```

### Ошибки подключения к БД

1. **Проверьте DATABASE_URL:**
   ```bash
   docker exec m4portal-server node -e "console.log(process.env.DATABASE_URL)"
   ```

2. **Убедитесь, что хост доступен:**
   ```bash
   docker exec m4portal-server ping -c 1 db-host
   ```

3. **Проверьте порт:**
   ```bash
   docker exec m4portal-server nc -zv db-host 5432
   ```

4. **Проверьте права доступа:**
   - Убедитесь, что пользователь БД существует
   - Убедитесь, что пароль корректен
   - Убедитесь, что база данных существует

### Проблемы с CORS

Проверьте переменную `ALLOWED_ORIGINS`:
- Добавьте все домены, с которых будет доступ
- Для тестирования: `http://localhost:8090,http://localhost:3000`
- Для продакшена: `https://your-domain.com`

## Безопасность

### Обязательные действия

1. **Измените пароли по умолчанию:**
   - `DATABASE_URL` - используйте сложный пароль
   - `SESSION_SECRET` - сгенерируйте случайную строку

2. **Используйте HTTPS:**
   - Настройте SSL сертификаты
   - Включите `secure: true` для cookies (в коде сервера)

3. **Настройте брандмауэр:**
   - Ограничьте доступ к порту 5432 базы данных
   - Оставьте только необходимые порты (8090, 3245)

## Мониторинг

### Просмотр логов

```bash
# Логи сервера
docker logs -f m4portal-server --tail 100

# Логи клиента
docker logs -f m4portal-client --tail 100
```

### Проверка health

```bash
# Проверка API
curl http://localhost:3245/api/user

# Проверка frontend
curl http://localhost:8090
```

## Ресурсы

- Документация m4portal: `README.md`, `TECH_STACK.md`, `SECURITY.md`
- Docker документация: https://docs.docker.com/
- Portainer документация: https://docs.portainer.io/

---

**Версия документа:** 1.1
**Последнее обновление:** 2026
