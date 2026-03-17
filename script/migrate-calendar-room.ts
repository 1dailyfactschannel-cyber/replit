import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("Connecting to database...");
  const client = postgres(process.env.DATABASE_URL);

  try {
    console.log("Adding new columns to calendar_events table...");

    // Add room_id column
    await client`
      ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES chats(id) ON DELETE CASCADE;
    `;
    console.log("✅ Added room_id column");

    // Add reminder column
    await client`
      ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder BOOLEAN DEFAULT FALSE;
    `;
    console.log("✅ Added reminder column");

    // Add reminder_minutes column
    await client`
      ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;
    `;
    console.log("✅ Added reminder_minutes column");

    // Create index for room_id
    await client`
      CREATE INDEX IF NOT EXISTS calendar_events_room_id_idx ON calendar_events(room_id);
    `;
    console.log("✅ Created room_id index");

    // Add type column to messages table
    await client`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'message';
    `;
    console.log("✅ Added type column to messages");

    // Add metadata column to messages table
    await client`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;
    `;
    console.log("✅ Added metadata column to messages");

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate();
