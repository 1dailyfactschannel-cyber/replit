import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createMinimalCompatibleSchema() {
  console.log('🚀 Creating minimal compatible schema...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  try {
    const client = await pool.connect();
    
    try {
      console.log('1. Adding missing columns to users table...');
      
      // Add columns that are missing but needed
      const addColumns = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT", 
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ru'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN DEFAULT false",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT"
      ];
      
      for (const sql of addColumns) {
        try {
          await client.query(sql);
          console.log(`✅ Added column: ${sql.split(' ')[5]}`);
        } catch (error: any) {
          if (error.code !== '42701') { // Column already exists
            console.warn(`⚠️  Warning adding column: ${error.message}`);
          }
        }
      }

      console.log('2. Creating roles table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          permissions JSONB NOT NULL,
          is_system BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Roles table created');

      console.log('3. Creating user_roles table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id VARCHAR NOT NULL,
          role_id UUID NOT NULL,
          PRIMARY KEY (user_id, role_id)
        );
      `);
      
      // Add foreign keys with validation
      try {
        await client.query(`
          ALTER TABLE user_roles 
          ADD CONSTRAINT fk_user_roles_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        `);
        console.log('✅ User foreign key added');
      } catch (error: any) {
        if (error.code !== '42710') {
          console.warn(`⚠️  Warning adding user FK: ${error.message}`);
        }
      }
      
      try {
        await client.query(`
          ALTER TABLE user_roles 
          ADD CONSTRAINT fk_user_roles_role 
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
        `);
        console.log('✅ Role foreign key added');
      } catch (error: any) {
        if (error.code !== '42710') {
          console.warn(`⚠️  Warning adding role FK: ${error.message}`);
        }
      }
      
      console.log('✅ User roles table created');

      console.log('4. Creating departments table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
          manager_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
          color TEXT DEFAULT '#3b82f6',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Departments table created');

      console.log('5. Creating projects table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
          status TEXT DEFAULT 'active',
          priority TEXT DEFAULT 'medium',
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          budget INTEGER,
          currency TEXT DEFAULT 'USD',
          color TEXT DEFAULT '#3b82f6',
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Projects table created');

      console.log('6. Creating project_members table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_members (
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (project_id, user_id)
        );
      `);
      console.log('✅ Project members table created');

      console.log('7. Creating teams table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS teams (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Teams table created');

      console.log('8. Creating team_members table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_members (
          team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (team_id, user_id)
        );
      `);
      console.log('✅ Team members table created');

      console.log('9. Creating boards table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS boards (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          is_template BOOLEAN DEFAULT false,
          template_id UUID REFERENCES boards(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Boards table created');

      console.log('10. Creating board_columns table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS board_columns (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          "order" INTEGER NOT NULL,
          color TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Board columns table created');

      console.log('11. Creating tasks table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          description TEXT,
          board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
          column_id UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
          assignee_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
          reporter_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT DEFAULT 'todo',
          priority TEXT DEFAULT 'medium',
          type TEXT DEFAULT 'task',
          story_points INTEGER,
          start_date TIMESTAMP,
          due_date TIMESTAMP,
          completed_at TIMESTAMP,
          "order" INTEGER NOT NULL DEFAULT 0,
          parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
          tags JSONB DEFAULT '[]'::jsonb,
          attachments JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Tasks table created');

      console.log('12. Creating site_settings table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Site settings table created');

      // Insert default data
      console.log('13. Inserting default data...');
      
      await client.query(`
        INSERT INTO roles (name, description, permissions, is_system) VALUES
          ('admin', 'Administrator with full access', '["dashboard","projects","tasks","calendar","chat","team","shop","admin"]', true),
          ('manager', 'Project manager with team management', '["dashboard","projects","tasks","calendar","chat","team"]', true),
          ('developer', 'Developer with task access', '["dashboard","projects","tasks","calendar","chat"]', true),
          ('viewer', 'Read-only access to projects', '["dashboard","projects","calendar"]', true)
        ON CONFLICT (name) DO NOTHING;
      `);
      
      await client.query(`
        INSERT INTO departments (name, description, color) VALUES
          ('IT', 'Information Technology Department', '#3b82f6')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      await client.query(`
        INSERT INTO site_settings (key, value, description, category) VALUES
          ('site_name', 'TeamSync', 'Application name', 'general'),
          ('theme', 'system', 'Default theme (light/dark/system)', 'appearance'),
          ('language', 'ru', 'Default language', 'general'),
          ('timezone', 'UTC', 'Default timezone', 'general')
        ON CONFLICT (key) DO NOTHING;
      `);
      
      console.log('✅ Default data inserted');

      // Final verification
      const finalResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log('\n📋 Final table list:');
      finalResult.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
      
      console.log(`\n🎉 Successfully created ${finalResult.rowCount} tables!`);
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('❌ Schema creation failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the creation
createMinimalCompatibleSchema();