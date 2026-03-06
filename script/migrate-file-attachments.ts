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

  console.log("Creating file_attachments table...");
  
  await client`
    CREATE TABLE IF NOT EXISTS file_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      data TEXT NOT NULL,
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await client`
    CREATE INDEX IF NOT EXISTS file_attachments_uploaded_by_idx ON file_attachments(uploaded_by);
  `;

  await client`
    CREATE INDEX IF NOT EXISTS file_attachments_created_at_idx ON file_attachments(created_at);
  `;

  console.log("✅ file_attachments table created successfully!");
  
  await client.end();
}

migrate().catch(console.error);
