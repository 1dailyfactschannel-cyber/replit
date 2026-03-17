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
    console.log("Renaming min_time_in_status to max_time_in_status...");

    // Rename column
    await client`
      ALTER TABLE points_settings 
        RENAME COLUMN min_time_in_status TO max_time_in_status;
    `;
    console.log("✅ Column renamed");

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
