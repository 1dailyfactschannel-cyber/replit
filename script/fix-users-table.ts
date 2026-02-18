import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function fixUsersTable() {
  console.log("🔧 Fixing users table...");
  
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

    // Check if role column exists
    const columns = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `;

    if (columns.length === 0) {
      console.log("Adding 'role' column to users table...");
      await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
      console.log("✅ role column added");
    } else {
      console.log("✅ role column already exists");
    }

    // Check if other missing columns exist
    const missingColumns = ['first_name', 'last_name', 'avatar', 'position', 'department', 'coins'];
    for (const col of missingColumns) {
      const colExists = await client`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = ${col}
      `;
      
      if (colExists.length === 0) {
        const defaultValue = col === 'coins' ? '0' : "''";
        const colType = col === 'coins' ? 'INTEGER' : 'TEXT';
        console.log(`Adding '${col}' column to users table...`);
        await client.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${colType} DEFAULT ${defaultValue}`);
        console.log(`✅ ${col} column added`);
      }
    }

    // Check if admin user exists
    const adminExists = await client`SELECT id FROM users WHERE email = 'admin@teamsync.com' LIMIT 1`;
    
    if (adminExists.length === 0) {
      console.log("Creating default admin user...");
      await client`
        INSERT INTO users (email, username, password, first_name, last_name, role)
        VALUES ('admin@teamsync.com', 'admin', 'admin123', 'Admin', 'User', 'admin')
      `;
      console.log("✅ Default admin user created");
      console.log("   Email: admin@teamsync.com");
      console.log("   Password: admin123");
    } else {
      console.log("✅ Admin user already exists");
    }

    // Show all users
    const users = await client`SELECT id, email, username, role FROM users`;
    console.log("\n📋 Current users in database:");
    users.forEach((user: any) => {
      console.log(`   - ${user.email} (${user.username}, ${user.role})`);
    });

    console.log("\n🎉 Database fix completed!");
    
  } catch (error: any) {
    console.error("❌ Failed to fix database:");
    console.error("Error:", error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixUsersTable();
