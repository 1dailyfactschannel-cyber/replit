import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createTablesStepByStep() {
  console.log('🚀 Creating tables step by step...');
  
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
      console.log('1. Creating extensions...');
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('✅ Extensions created');

      console.log('2. Creating users table (without department reference)...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          avatar TEXT,
          department TEXT,
          position TEXT,
          phone TEXT,
          timezone TEXT DEFAULT 'UTC',
          language TEXT DEFAULT 'ru',
          is_active BOOLEAN DEFAULT true,
          is_online BOOLEAN DEFAULT false,
          last_seen TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          telegram_connected BOOLEAN DEFAULT false,
          telegram_id TEXT,
          notes TEXT
        );
      `);
      console.log('✅ Users table created');

      console.log('3. Creating roles table...');
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

      console.log('4. Creating user_roles table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
        );
      `);
      console.log('✅ User roles table created');

      console.log('5. Creating departments table (without manager reference)...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
          color TEXT DEFAULT '#3b82f6',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Departments table created');

      console.log('6. Adding manager_id column to departments...');
      await client.query(`
        ALTER TABLE departments 
        ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
      `);
      console.log('✅ Manager reference added to departments');

      console.log('6. Creating projects table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

      console.log('7. Creating project_members table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_members (
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (project_id, user_id)
        );
      `);
      console.log('✅ Project members table created');

      console.log('8. Creating teams table...');
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

      console.log('9. Creating team_members table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_members (
          team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (team_id, user_id)
        );
      `);
      console.log('✅ Team members table created');

      console.log('10. Creating boards table...');
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

      console.log('11. Creating board_columns table...');
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

      console.log('12. Creating tasks table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          description TEXT,
          board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
          column_id UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
          assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
          reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

      console.log('13. Creating subtasks table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS subtasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          is_completed BOOLEAN DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Subtasks table created');

      console.log('14. Creating task_observers table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_observers (
          task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, user_id)
        );
      `);
      console.log('✅ Task observers table created');

      console.log('15. Creating comments table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          parent_id UUID REFERENCES comments(id) ON DELETE SET NULL,
          attachments JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Comments table created');

      console.log('16. Creating task_history table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          field_name TEXT,
          old_value TEXT,
          new_value TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Task history table created');

      console.log('17. Creating site_settings table...');
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

      console.log('18. Creating sessions table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR(128) PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP(6) WITH TIME ZONE NOT NULL
        );
      `);
      console.log('✅ Sessions table created');

      // Create indexes
      console.log('19. Creating indexes...');
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);');
      console.log('✅ Indexes created');

      // Insert default data
      console.log('20. Inserting default data...');
      
      // Default roles
      await client.query(`
        INSERT INTO roles (name, description, permissions, is_system) VALUES
          ('admin', 'Administrator with full access', '["dashboard","projects","tasks","calendar","chat","team","shop","admin"]', true),
          ('manager', 'Project manager with team management', '["dashboard","projects","tasks","calendar","chat","team"]', true),
          ('developer', 'Developer with task access', '["dashboard","projects","tasks","calendar","chat"]', true),
          ('viewer', 'Read-only access to projects', '["dashboard","projects","calendar"]', true)
        ON CONFLICT (name) DO NOTHING;
      `);
      
      // Default department
      await client.query(`
        INSERT INTO departments (name, description, color) VALUES
          ('IT', 'Information Technology Department', '#3b82f6')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      // Default settings
      await client.query(`
        INSERT INTO site_settings (key, value, description, category) VALUES
          ('site_name', 'TeamSync', 'Application name', 'general'),
          ('theme', 'system', 'Default theme (light/dark/system)', 'appearance'),
          ('language', 'ru', 'Default language', 'general'),
          ('timezone', 'UTC', 'Default timezone', 'general')
        ON CONFLICT (key) DO NOTHING;
      `);
      
      console.log('✅ Default data inserted');

      // Verify all tables
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log('\n📋 Final table list:');
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
      
      console.log(`\n🎉 Successfully created ${result.rowCount} tables!`);
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('❌ Table creation failed:');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the step-by-step creation
createTablesStepByStep();