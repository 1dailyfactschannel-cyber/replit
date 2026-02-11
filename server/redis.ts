import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1, // Уменьшаем количество попыток для локальной разработки
  retryStrategy(times) {
    // Если Redis не запущен, не будем бесконечно спамить ошибками
    if (times > 3) return null; 
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
  enableOfflineQueue: false, // Не накапливать команды, если Redis оффлайн
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

export const CACHE_TTL = 3600; // 1 hour in seconds

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  try {
    const data = JSON.stringify(value);
    await redis.set(key, data, "EX", ttl);
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`Error invalidating pattern ${pattern}:`, error);
  }
}
