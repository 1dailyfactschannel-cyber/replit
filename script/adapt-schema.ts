import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function adaptSchemaToExistingDB() {
  console.log('🚀 Adapting schema to existing database structure...');
  
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
      // Check existing users table structure
      const usersStructure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      console.log('Existing users table structure:');
      usersStructure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Create remaining tables with compatible data types
      console.log('\n1. Creating user_roles table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id VARCHAR NOT NULL,
          role_id UUID NOT NULL,
          PRIMARY KEY (user_id, role_id)
        );
      `);
      
      await client.query(`
        ALTER TABLE user_roles 
        ADD CONSTRAINT fk_user_roles_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      `);
      
      await client.query(`
        ALTER TABLE user_roles 
        ADD CONSTRAINT fk_user_roles_role 
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
      `);
      
      console.log('✅ User roles table created');

      console.log('2. Creating departments table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          parent_id UUID,
          manager_id VARCHAR,
          color TEXT DEFAULT '#3b82f6',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      await client.query(`
        ALTER TABLE departments 
        ADD CONSTRAINT fk_departments_parent 
        FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL;
      `);
      
      await client.query(`
        ALTER TABLE departments 
        ADD CONSTRAINT fk_departments_manager 
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
      `);
      
      console.log('✅ Departments table created');

      console.log('3. Creating projects table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          owner_id VARCHAR NOT NULL,
          department_id UUID,
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
      
      await client.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT fk_projects_owner 
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
      `);
      
      await client.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT fk_projects_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
      `);
      
      console.log('✅ Projects table created');

      console.log('4. Creating project_members table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_members (
          project_id UUID NOT NULL,
          user_id VARCHAR NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (project_id, user_id)
        );
      `);
      
      await client.query(`
        ALTER TABLE project_members 
        ADD CONSTRAINT fk_project_members_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      `);
      
      await client.query(`
        ALTER TABLE project_members 
        ADD CONSTRAINT fk_project_members_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      `);
      
      console.log('✅ Project members table created');

      console.log('5. Creating teams table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS teams (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          project_id UUID,
          department_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      await client.query(`
        ALTER TABLE teams 
        ADD CONSTRAINT fk_teams_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      `);
      
      await client.query(`
        ALTER TABLE teams 
        ADD CONSTRAINT fk_teams_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
      `);
      
      console.log('✅ Teams table created');

      console.log('6. Creating team_members table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_members (
          team_id UUID NOT NULL,
          user_id VARCHAR NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (team_id, user_id)
        );
      `);
      
      await client.query(`
        ALTER TABLE team_members 
        ADD CONSTRAINT fk_team_members_team 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
      `);
      
      await client.query(`
        ALTER TABLE team_members 
        ADD CONSTRAINT fk_team_members_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      `);
      
      console.log('✅ Team members table created');

      // Insert default data
      console.log('7. Inserting default data...');
      
      // Default department
      await client.query(`
        INSERT INTO departments (name, description, color) VALUES
          ('IT', 'Information Technology Department', '#3b82f6')
        ON CONFLICT (name) DO NOTHING;
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
    console.error('❌ Schema adaptation failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the adaptation
adaptSchemaToExistingDB();