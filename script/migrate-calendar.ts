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
    console.log("Creating calendar_events table...");

    await client`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        time TEXT NOT NULL,
        type TEXT DEFAULT 'work',
        contact TEXT,
        meeting_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ calendar_events table created");

    // Create indexes
    await client`
      CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx ON calendar_events(user_id);
    `;
    await client`
      CREATE INDEX IF NOT EXISTS calendar_events_date_idx ON calendar_events(date);
    `;
    console.log("✅ Indexes created");

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
