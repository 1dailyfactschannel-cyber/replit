import Redis from "ioredis";
import NodeCache from "node-cache";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let isRedisAvailable = false;

// Fallback in-memory cache
const localCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      isRedisAvailable = false;
      console.warn("Redis is unavailable, switching to local in-memory cache.");
      return null;
    }
    return Math.min(times * 100, 2000);
  },
  enableOfflineQueue: false,
});

redis.on("error", (err) => {
  if (isRedisAvailable) {
    console.error("Redis error:", err);
  }
  isRedisAvailable = false;
});

redis.on("connect", () => {
  console.log("Connected to Redis");
  isRedisAvailable = true;
});

export const CACHE_TTL = 3600; // 1 hour in seconds

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (isRedisAvailable) {
      const data = await redis.get(key);
      if (data) return JSON.parse(data) as T;
    }
    // Fallback to local cache
    const localData = localCache.get<T>(key);
    return localData || null;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  try {
    if (isRedisAvailable) {
      const data = JSON.stringify(value);
      await redis.set(key, data, "EX", ttl);
    }
    // Always set in local cache as well for consistency if Redis fails later
    localCache.set(key, value, ttl);
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    if (isRedisAvailable) {
      await redis.del(key);
    }
    localCache.del(key);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    if (isRedisAvailable) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    
    // For local cache, we need to manually filter keys if pattern is used
    // node-cache doesn't support glob patterns directly for deletion
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const keys = localCache.keys();
      const matches = keys.filter(k => regex.test(k));
      localCache.del(matches);
    } else {
      localCache.del(pattern);
    }
  } catch (error) {
    console.error(`Error invalidating pattern ${pattern}:`, error);
  }
}
