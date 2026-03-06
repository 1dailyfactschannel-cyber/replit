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

  console.log("Creating task_user_time_tracking table...");
  
  await client`
    CREATE TABLE IF NOT EXISTS task_user_time_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMP,
      duration_seconds INTEGER
    );
  `;

  await client`
    CREATE INDEX IF NOT EXISTS task_user_time_task_id_idx ON task_user_time_tracking(task_id);
  `;

  await client`
    CREATE INDEX IF NOT EXISTS task_user_time_user_id_idx ON task_user_time_tracking(user_id);
  `;

  await client`
    CREATE INDEX IF NOT EXISTS task_user_time_status_idx ON task_user_time_tracking(status);
  `;

  console.log("✅ task_user_time_tracking table created successfully!");
  
  await client.end();
}

migrate().catch(console.error);
