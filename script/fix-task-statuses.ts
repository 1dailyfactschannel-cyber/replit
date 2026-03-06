import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  await sql.unsafe('UPDATE tasks SET status = (SELECT name FROM board_columns WHERE id = tasks.column_id) WHERE column_id IS NOT NULL');
  console.log('Updated');
}
main().finally(() => sql.end());
