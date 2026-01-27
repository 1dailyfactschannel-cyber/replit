import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../shared/schema";

// Load environment variables
dotenv.config();

async function createTables() {
  console.log("🚀 Creating database tables...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  try {
    // Create connection
    const client = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    const db = drizzle(client, { schema });
    
    console.log("✅ Connected to database");
    
    // Create tables using Drizzle
    console.log("📋 Creating tables...");
    
    // The tables will be created automatically by Drizzle when we run the migration
    // But let's verify the connection and show what tables will be created
    
    const tableNames = Object.keys(schema).filter(key => 
      !key.startsWith('insert') && 
      !key.startsWith('Insert') && 
      !key.endsWith('Schema') &&
      key !== 'default'
    );
    
    console.log("Following tables will be created:");
    tableNames.forEach(name => console.log(`  - ${name}`));
    
    // Close connection
    await client.end();
    console.log("✅ Tables creation process completed");
    
    // Run the actual migration
    console.log("🔄 Running database migration...");
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Migration completed successfully");
    
  } catch (error: any) {
    console.error("❌ Failed to create tables:");
    console.error("Error:", error.message);
    
    if (error.code) {
      console.error("Error Code:", error.code);
    }
    
    if (error.detail) {
      console.error("Detail:", error.detail);
    }
    
    process.exit(1);
  }
}

// Run the table creation
createTables();