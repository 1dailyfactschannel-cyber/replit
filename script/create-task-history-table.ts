import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function createTaskHistoryTable() {
  console.log("🔧 Creating task_history table...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log("✅ Connected to database");

    // Check if table exists
    const tableExists = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'task_history'
    `;

    if (tableExists.length > 0) {
      console.log("✅ task_history table already exists");
      await client.end();
      return;
    }

    // Create task_history table
    await client`
      CREATE TABLE task_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        field TEXT,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ task_history table created");

    // Create indexes
    await client`
      CREATE INDEX IF NOT EXISTS task_history_task_id_idx ON task_history(task_id)
    `;
    console.log("✅ Index task_id created");

    await client`
      CREATE INDEX IF NOT EXISTS task_history_created_at_idx ON task_history(created_at DESC)
    `;
    console.log("✅ Index created_at created");

    console.log("\n🎉 Task history table created successfully!");
    
  } catch (error: any) {
    console.error("❌ Failed to create table:");
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTaskHistoryTable();
