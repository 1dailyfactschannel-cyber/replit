import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function dropTables() {
  const tables = [
    'projects',
    'comments',
    'departments',
    'project_members',
    'roles',
    'sessions',
    'site_settings',
    'boards',
    'task_observers',
    'tasks',
    'subtasks',
    'task_history',
    'team_members',
    'teams',
    'user_roles',
    'board_columns',
    'users',
    'chat_folder_items',
    'message_attachments',
    'chat_folders',
    '__drizzle_migrations',
    'chats',
    'chat_participants',
    'messages',
    'calls',
    'notifications',
    'priorities',
    'labels',
    'task_labels'
  ];

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    for (const table of tables) {
      console.log(`Dropping table: ${table}`);
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

dropTables();
