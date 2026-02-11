
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";
import dotenv from "dotenv";

dotenv.config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
  const users = await db.select().from(schema.users).limit(5);
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

main();
