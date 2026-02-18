import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function createTaskStatusHistoryTable() {
  console.log("🔧 Creating task_status_history table...");
  
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
      WHERE table_name = 'task_status_history'
    `;

    if (tableExists.length > 0) {
      console.log("✅ task_status_history table already exists");
      await client.end();
      return;
    }

    // Create task_status_history table
    await client`
      CREATE TABLE task_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        entered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        exited_at TIMESTAMP,
        duration_seconds INTEGER
      )
    `;
    console.log("✅ task_status_history table created");

    // Create indexes
    await client`
      CREATE INDEX IF NOT EXISTS task_status_history_task_id_idx ON task_status_history(task_id)
    `;
    console.log("✅ Index task_id created");

    await client`
      CREATE INDEX IF NOT EXISTS task_status_history_status_idx ON task_status_history(status)
    `;
    console.log("✅ Index status created");

    console.log("\n🎉 Task status history table created successfully!");
    
  } catch (error: any) {
    console.error("❌ Failed to create table:");
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTaskStatusHistoryTable();
