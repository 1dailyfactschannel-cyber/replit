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
    console.log("Adding min_time_in_status column to points_settings...");

    // Add min_time_in_status column
    await client`
      ALTER TABLE points_settings 
        ADD COLUMN IF NOT EXISTS min_time_in_status INTEGER DEFAULT 0;
    `;
    console.log("✅ min_time_in_status column added");

    // Update existing settings to have default values
    await client`
      UPDATE points_settings 
        SET min_time_in_status = 0 
        WHERE min_time_in_status IS NULL;
    `;
    console.log("✅ Existing settings updated with default values");

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
