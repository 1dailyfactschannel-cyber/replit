FROM node:22-slim AS base
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Установка зависимостей (включая devDependencies для сборки)
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Сборка проекта
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Удаляем devDependencies перед копированием в продакшен
RUN npm prune --production && rm -rf /app/node_modules/.cache

# Production stage - минимальный alpine образ
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Создание непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Копирование только необходимых файлов
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/script/migrate.js ./script/migrate.js
COPY --from=builder --chown=nodejs:nodejs /app/startup.sh ./startup.sh

RUN chmod +x startup.sh

USER nodejs

EXPOSE 3000

CMD ["./startup.sh"]
