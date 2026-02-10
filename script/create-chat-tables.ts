import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createChatTables() {
  console.log('🚀 Creating chat tables in the environment database...');
  
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
      // 0. Enable extension
      console.log('0. Enabling uuid-ossp extension...');
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

      // 1. Chats table
      console.log('1. Creating chats table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS chats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT,
          type TEXT NOT NULL DEFAULT 'direct',
          avatar TEXT,
          description TEXT,
          owner_id UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Chats table created');

      // 2. Chat participants table
      console.log('2. Creating chat_participants table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT NOW(),
          last_read_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (chat_id, user_id)
        );
      `);
      console.log('✅ Chat participants table created');

      // 3. Messages table
      console.log('3. Creating messages table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES users(id),
          content TEXT NOT NULL,
          attachments JSONB DEFAULT '[]'::jsonb,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Messages table created');

      // 4. Chat folders table
      console.log('4. Creating chat_folders table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_folders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Chat folders table created');

      // 5. Chat folder items table (junction for folders and chats)
      console.log('5. Creating chat_folder_items table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_folder_items (
          folder_id UUID NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
          chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          PRIMARY KEY (folder_id, chat_id)
        );
      `);
      console.log('✅ Chat folder items table created');

      // 6. Message attachments table (for more detailed file info)
      console.log('6. Creating message_attachments table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS message_attachments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          file_name TEXT NOT NULL,
          file_type TEXT,
          file_size INTEGER,
          file_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Message attachments table created');

      // Create indexes for better performance
      console.log('7. Creating indexes...');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_folders_user_id ON chat_folders(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);`);
      console.log('✅ Indexes created');

      // Final verification
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('chats', 'chat_participants', 'messages', 'chat_folders', 'chat_folder_items', 'message_attachments')
      `);
      
      console.log('\n📋 Verified tables:');
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
      
    } finally {
      client.release();
    }
    
    console.log('\n🎉 Chat tables created successfully!');
    
  } catch (error: any) {
    console.error('❌ Table creation failed:');
    console.error('Error:', error);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createChatTables();
