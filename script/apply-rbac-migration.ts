import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  console.log("Connecting to database...");

  const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log("Applying RBAC migration...");

    // 1. Add fields to user_roles table
    await sql`
      ALTER TABLE user_roles 
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL
    `;
    console.log("✓ Added fields to user_roles table");

    // 2. Create permissions table
    await sql`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✓ Created permissions table");

    // 3. Create unique index on permissions.key
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS permissions_key_idx ON permissions(key)
    `;
    console.log("✓ Created unique index on permissions.key");

    // 4. Create user_hidden_objects table
    await sql`
      CREATE TABLE IF NOT EXISTS user_hidden_objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        object_type TEXT NOT NULL,
        object_id UUID NOT NULL,
        hidden_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, object_type, object_id)
      )
    `;
    console.log("✓ Created user_hidden_objects table");

    // 5. Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS user_hidden_objects_user_idx ON user_hidden_objects(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS user_hidden_objects_type_idx ON user_hidden_objects(object_type)
    `;
    console.log("✓ Created indexes on user_hidden_objects");

    // 6. Add indexes on user_roles
    await sql`
      CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role_id)
    `;
    console.log("✓ Created indexes on user_roles");

    // 7. Ensure is_system column exists on roles table
    await sql`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE
    `;
    console.log("✓ Added is_system column to roles table");

    console.log("\n✅ RBAC migration applied successfully!");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
