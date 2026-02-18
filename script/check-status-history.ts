import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkStatusHistory() {
  console.log("🔍 Checking task_status_history data...");
  
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

    // Check all records in task_status_history
    const allRecords = await client`
      SELECT * FROM task_status_history ORDER BY entered_at DESC LIMIT 10
    `;
    
    console.log("\n📋 All task_status_history records:");
    console.log(`Found ${allRecords.length} records`);
    
    allRecords.forEach((record: any) => {
      console.log(`  Task: ${record.task_id}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Entered: ${record.entered_at}`);
      console.log(`  Exited: ${record.exited_at}`);
      console.log(`  Duration: ${record.duration_seconds}s`);
      console.log('---');
    });

    // Check tasks
    const tasks = await client`
      SELECT id, title, status FROM tasks LIMIT 5
    `;
    
    console.log("\n📋 Tasks:");
    tasks.forEach((task: any) => {
      console.log(`  ${task.id}: ${task.title} (${task.status})`);
    });

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkStatusHistory();
