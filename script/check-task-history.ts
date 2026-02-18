import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkTaskHistory() {
  console.log("🔍 Checking task_history data...");
  
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

    // Check all records in task_history
    const allRecords = await client`
      SELECT * FROM task_history ORDER BY created_at DESC LIMIT 20
    `;
    
    console.log("\n📋 All task_history records:");
    console.log(`Found ${allRecords.length} records`);
    
    allRecords.forEach((record: any) => {
      console.log(`  ID: ${record.id}`);
      console.log(`  Task: ${record.task_id}`);
      console.log(`  User: ${record.user_id}`);
      console.log(`  Action: ${record.action}`);
      console.log(`  Field: ${record.field}`);
      console.log(`  Old Value: ${record.old_value}`);
      console.log(`  New Value: ${record.new_value}`);
      console.log(`  Created: ${record.created_at}`);
      console.log('---');
    });

    // Check table structure
    const columns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_history'
      ORDER BY ordinal_position
    `;
    
    console.log("\n📋 Table structure:");
    columns.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTaskHistory();
