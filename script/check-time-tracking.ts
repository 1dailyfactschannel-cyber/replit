import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function checkData() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set");
    return;
  }

  const client = postgres(process.env.DATABASE_URL);
  
  try {
    // Check if table exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_user_time_tracking'
      );
    `;
    console.log("Table exists:", tableExists[0].exists);
    
    if (tableExists[0].exists) {
      // Count records
      const count = await client`SELECT COUNT(*) FROM task_user_time_tracking`;
      console.log("Total records:", count[0].count);
      
      // Get all records
      const records = await client`SELECT * FROM task_user_time_tracking LIMIT 10`;
      console.log("Records:", JSON.stringify(records, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
  
  await client.end();
}

checkData();
