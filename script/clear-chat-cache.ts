import { delCache, invalidatePattern } from "../server/redis.js";
import dotenv from "dotenv";

dotenv.config();

async function clearChatCache() {
  console.log('🧹 Clearing chat cache...');
  
  try {
    // Delete the global users cache
    await delCache("users:all");
    console.log('✅ Cleared users:all cache');
    
    // Invalidate all user chat caches using pattern
    await invalidatePattern("user:*:chats");
    console.log('✅ Cleared all user chat caches (user:*:chats)');
    
    console.log('✅ Chat cache cleared successfully!');
    console.log('   The chat list will be refreshed with correct names on next load.');
    
  } catch (error: any) {
    console.error('❌ Error clearing cache:', error.message);
    console.log('   You can also clear cache by restarting the server.');
  } finally {
    // Exit process since Redis connection might keep it alive
    setTimeout(() => process.exit(0), 500);
  }
}

clearChatCache();
