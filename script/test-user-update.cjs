const { Client } = require('pg');

async function testUpdate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test'
  });

  try {
    await client.connect();
    
    // Найдем тестового пользователя
    const userRes = await client.query('SELECT id, username, email, first_name, last_name, department, position, phone FROM users LIMIT 1');
    
    if (userRes.rows.length === 0) {
      console.log('No users found');
      return;
    }
    
    const user = userRes.rows[0];
    console.log('Current user data:', user);
    
    // Попробуем обновить поля
    const updateRes = await client.query(
      'UPDATE users SET department = $1, position = $2, phone = $3 WHERE id = $4 RETURNING *',
      ['Тестовый отдел', 'Тестовая должность', '+79991234567', user.id]
    );
    
    console.log('Updated user data:', updateRes.rows[0]);
    
    // Проверим, сохранилось ли
    const checkRes = await client.query('SELECT department, position, phone FROM users WHERE id = $1', [user.id]);
    console.log('Verification:', checkRes.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testUpdate();