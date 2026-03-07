import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("Connecting to database...");
  const client = postgres(process.env.DATABASE_URL);

  try {
    console.log("Creating points system tables...");

    // 1. Shop items table - drop and recreate if exists without proper columns
    await client`DROP TABLE IF EXISTS shop_purchases CASCADE;`;
    await client`DROP TABLE IF EXISTS shop_items CASCADE;`;
    
    await client`
      CREATE TABLE shop_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        cost INTEGER NOT NULL,
        image TEXT,
        category TEXT,
        stock INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ shop_items table created");

    // 2. Shop purchases table
    await client`
      CREATE TABLE IF NOT EXISTS shop_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES shop_items(id),
        quantity INTEGER DEFAULT 1,
        total_cost INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        purchased_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ shop_purchases table created");

    // 3. Points settings table
    await client`DROP TABLE IF EXISTS points_settings CASCADE;`;
    
    await client`
      CREATE TABLE points_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status_name TEXT NOT NULL UNIQUE,
        points_amount INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ points_settings table created");

    // 4. User points transactions table
    await client`DROP TABLE IF EXISTS user_points_transactions CASCADE;`;
    
    await client`
      CREATE TABLE user_points_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        status_name TEXT,
        type TEXT CHECK (type IN ('earned', 'spent', 'reverted')),
        amount INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(task_id, status_name, type)
      );
    `;
    console.log("✅ user_points_transactions table created");

    // 5. Add columns to users table
    await client`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_points_spent INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
    `;
    console.log("✅ Users table updated with points columns");

    // 6. Create indexes
    await client`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON user_points_transactions(user_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_transactions_task_id ON user_points_transactions(task_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON user_points_transactions(created_at);`;
    await client`CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON shop_purchases(user_id);`;
    console.log("✅ Indexes created");

    // 7. Insert default shop items
    await client`
      INSERT INTO shop_items (name, description, cost, image, category, stock) VALUES
      ('Худи TeamSync', 'Удобное оверсайз худи с фирменным логотипом. 100% хлопок.', 3500, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&h=400&auto=format&fit=crop', 'Мерч', 12),
      ('Термокружка', 'Сохраняет тепло до 12 часов. Идеально для офиса.', 1200, 'https://images.unsplash.com/photo-1517254456976-ee8682099819?q=80&w=400&h=400&auto=format&fit=crop', 'Аксессуары', 25),
      ('Сертификат OZON', 'Номинал 2000 рублей. Придет на почту сразу после одобрения.', 2000, 'https://images.unsplash.com/photo-1549463591-2439834430ad?q=80&w=400&h=400&auto=format&fit=crop', 'Сертификаты', 50),
      ('Рюкзак для ноутбука', 'Вмещает ноутбук до 16 дюймов. Влагостойкий материал.', 5000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=400&h=400&auto=format&fit=crop', 'Мерч', 5),
      ('Беспроводная мышь', 'Эргономичный дизайн, тихие клавиши. Подключение по Bluetooth.', 2500, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400&h=400&auto=format&fit=crop', 'Техника', 8),
      ('Коврик для йоги', 'Нескользящее покрытие, толщина 6мм. Чехол в комплекте.', 1800, 'https://images.unsplash.com/photo-1592432676556-382946c8b9cc?q=80&w=400&h=400&auto=format&fit=crop', 'Здоровье', 15);
    `;
    console.log("✅ Default shop items inserted");

    // 8. Insert default points settings
    await client`
      INSERT INTO points_settings (status_name, points_amount, is_active) VALUES
      ('В планах', 1, true),
      ('В работе', 1, true),
      ('Готово', 1, true)
      ON CONFLICT (status_name) DO NOTHING;
    `;
    console.log("✅ Default points settings inserted");

    console.log("\n🎉 Points system migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
