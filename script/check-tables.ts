import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  console.log("🔍 Проверка таблиц базы данных...\n");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Список всех таблиц из schema.ts
  const expectedTables = [
    'users',
    'roles',
    'user_roles',
    'departments',
    'teams',
    'team_members',
    'projects',
    'project_members',
    'boards',
    'board_columns',
    'tasks',
    'subtasks',
    'task_observers',
    'task_history',
    'comments',
    'labels',
    'priorities',
    'chats',
    'chat_participants',
    'messages',
    'message_attachments',
    'chat_folders',
    'chat_folder_items',
    'calls',
    'notifications',
    'site_settings',
    'sessions'
  ];

  try {
    // Получаем список существующих таблиц
    const existingTables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const existingTableNames = existingTables.map((t: any) => t.table_name);
    
    console.log("📋 Существующие таблицы:");
    console.log("========================\n");
    
    let missingCount = 0;
    let existingCount = 0;

    for (const table of expectedTables) {
      const exists = existingTableNames.includes(table);
      const status = exists ? '✅' : '❌';
      const color = exists ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${color}${status}${reset} ${table}`);
      
      if (exists) {
        existingCount++;
        // Получаем количество записей в таблице
        try {
          const count = await client.unsafe(`SELECT COUNT(*) FROM "${table}"`);
          console.log(`   └─ Записей: ${count[0].count}`);
        } catch (e) {
          console.log(`   └─ Нет доступа к данным`);
        }
      } else {
        missingCount++;
      }
    }

    console.log("\n========================");
    console.log(`📊 Всего таблиц: ${expectedTables.length}`);
    console.log(`✅ Существуют: ${existingCount}`);
    console.log(`❌ Отсутствуют: ${missingCount}`);

    // Показываем лишние таблицы (которых нет в схеме)
    const extraTables = existingTableNames.filter((t: string) => !expectedTables.includes(t));
    if (extraTables.length > 0) {
      console.log(`\n⚠️  Дополнительные таблицы (не в схеме):`);
      extraTables.forEach((t: string) => console.log(`   • ${t}`));
    }

    // Проверяем структуру таблицы users
    if (existingTableNames.includes('users')) {
      console.log("\n📋 Структура таблицы 'users':");
      const columns = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;
      columns.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`   • ${col.column_name}: ${col.data_type} (${nullable})`);
      });
    }

    console.log("\n🎉 Проверка завершена!");
    
    if (missingCount > 0) {
      console.log("\n⚠️  Некоторые таблицы отсутствуют. Запустите: npm run db:create-tables-sql");
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error("❌ Ошибка при проверке:");
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTables();
