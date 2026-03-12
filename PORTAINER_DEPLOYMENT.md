# Развертывание m4portal в Portainer

## Подготовка проекта

### 1. Настройка переменных окружения

Создайте файл `.env` в корне проекта (если ещё не создан):

```bash
# PostgreSQL
POSTGRES_USER=m4portal_user
POSTGRES_PASSWORD=your_secure_password_123
POSTGRES_DB=m4portal

# Session Secret (обязательно измените!)
SESSION_SECRET=your_random_secret_key_here

# Allowed Origins (для CORS)
ALLOWED_ORIGINS=http://localhost:8090,https://your-domain.com

# Application URL
APP_URL=https://your-domain.com

# Redis (опционально)
REDIS_URL=redis://redis:6379

# Yandex Calendar (опционально)
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
```

### 2. Создание стека в Portainer

#### Метод 1: Через интерфейс Portainer

1. Откройте Portainer и перейдите в раздел **Stacks**
2. Нажмите **Add stack**
3. Введите имя стека: `m4portal`
4. Вставьте содержимое файла `docker-compose.yml`
5. В разделе **Environment variables** вставьте переменные из `.env` или загрузите файл
6. Нажмите **Deploy the stack**

#### Метод 2: Через командную строку

```bash
# Перейдите в папку проекта
cd /path/to/m4portal

# Запустите стек
docker compose up -d
```

### 3. Проверка развертывания

```bash
# Просмотр контейнеров
docker ps

# Логи сервера
docker logs -f m4portal-server

# Логи клиента
docker logs -f m4portal-client

# Логи базы данных
docker logs -f m4portal-db
```

### 4. Настройка обратного прокси (опционально)

Если используете Nginx как обратный прокси, добавьте конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Архитектура контейнеров

```
┌─────────────────────────────────────────────────────────────┐
│                    Portainer                                 │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: m4portal-network          │
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │   PostgreSQL    │     │     Redis       │               │
│  │   (Database)    │     │  (Caching)      │               │
│  └─────────────────┘     └─────────────────┘               │
│         │                       │                           │
│         └──────────┬────────────┘                           │
│                    ▼                                        │
│            ┌───────────────┐                                │
│            │  Node.js API  │                                │
│            │    Server     │                                │
│            │  (Port 3000)  │                                │
│            └───────────────┘                                │
│                    │                                        │
│                    ▼                                        │
│            ┌───────────────┐                                │
│            │  Nginx Client │                                │
│            │  (Port 80)    │                                │
│            └───────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

## Маппинг портов

| Контейнер | Порт | Описание |
|-----------|------|----------|
| PostgreSQL | 5432 | База данных (только для локального доступа) |
| Redis | 6379 | Кэширование (только для локального доступа) |
| Server | 3245:3000 | API сервер (доступен с хоста) |
| Client | 8090:80 | Frontend приложение |

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

## Резервное копирование

### PostgreSQL

```bash
# Создание бэкапа
docker exec m4portal-db pg_dump -U m4portal_user m4portal > backup.sql

# Восстановление
docker exec -i m4portal-db psql -U m4portal_user -d m4portal < backup.sql
```

### Redis

```bash
# Сохранение данных
docker exec m4portal-redis redis-cli SAVE

# Копирование дампа
docker cp m4portal-redis:/data/dump.rdb ./redis_backup.rdb
```

## Устранение проблем

### Контейнеры не запускаются

```bash
# Просмотр логов
docker logs m4portal-server
docker logs m4portal-db

# Проверка сети
docker network ls
docker network inspect m4portal-network
```

### Ошибки подключения к БД

Убедитесь, что:
- Переменные окружения корректны
- Сеть `m4portal-network` создана
- PostgreSQL успешно запущен

### Проблемы с CORS

Проверьте переменную `ALLOWED_ORIGINS` в `.env`:
- Добавьте все домены, с которых будет доступ
- Для тестирования: `http://localhost:8090,http://localhost:3000,http://127.0.0.1:8090`
- Для продакшена: `https://your-domain.com`

## Безопасность

### Обязательные действия

1. **Измените пароли по умолчанию:**
   - `POSTGRES_PASSWORD` в `.env`
   - `SESSION_SECRET` в `.env`

2. **Используйте HTTPS:**
   - Настройте SSL сертификаты
   - Включите `secure: true` для cookies

3. **Настройте брандмауэр:**
   - Ограничьте доступ к портам 5432, 6379
   - Оставьте только необходимые порты (8090, 3245)

### Управление секретами в Portainer

В Portainer можно использовать Secret Management:
1. Перейдите в **Secrets**
2. Создайте секреты для чувствительных данных
3. Используйте их в stack файле

## Мониторинг

### Включение логирования

В `docker-compose.yml` можно добавить:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Метрики

Для мониторинга можно использовать:
- Portainer monitoring
- Prometheus + Grafana
- cAdvisor для метрик контейнеров

## Ресурсы

- Документация m4portal: `README.md`, `TECH_STACK.md`, `SECURITY.md`
- Docker документация: https://docs.docker.com/
- Portainer документация: https://docs.portainer.io/

---

**Версия документа:** 1.0
**Последнее обновление:** 2026
