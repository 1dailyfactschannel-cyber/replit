import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
  console.log("Starting manual migration...");

  try {
    // 1. Create chat_folders table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("Created chat_folders table");

    // Ensure icon column exists (in case table was created without it)
    try {
      await sql`ALTER TABLE chat_folders ADD COLUMN IF NOT EXISTS icon TEXT`;
      console.log("Ensured icon column exists in chat_folders");
    } catch (e) {
      // Ignore if column already exists or other issues
    }

    // 2. Create chat_folder_items table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_folder_items (
        folder_id UUID NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        PRIMARY KEY (folder_id, chat_id)
      )
    `;
    console.log("Created chat_folder_items table");

    // 3. Create message_attachments table
    await sql`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("Created message_attachments table");

    // 4. Create calls table
    await sql`
      CREATE TABLE IF NOT EXISTS calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        caller_id UUID NOT NULL REFERENCES users(id),
        receiver_id UUID NOT NULL REFERENCES users(id),
        type TEXT NOT NULL DEFAULT 'audio',
        status TEXT NOT NULL DEFAULT 'missed',
        duration INTEGER,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP
      )
    `;
    console.log("Created calls table");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

migrate();
