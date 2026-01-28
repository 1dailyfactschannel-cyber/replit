const { Client } = require('pg');

async function testPositionField() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test'
  });

  try {
    await client.connect();
    
    // Найдем пользователя
    const userRes = await client.query('SELECT id, username, position FROM users WHERE position IS NOT NULL LIMIT 1');
    
    let userId;
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      console.log('Found user with existing position:', userRes.rows[0]);
    } else {
      // Если нет пользователей с должностью, возьмем любого
      const anyUserRes = await client.query('SELECT id, username, position FROM users LIMIT 1');
      if (anyUserRes.rows.length === 0) {
        console.log('No users found');
        return;
      }
      userId = anyUserRes.rows[0].id;
      console.log('Using user:', anyUserRes.rows[0]);
    }
    
    // Проверим текущее значение
    const currentRes = await client.query('SELECT position FROM users WHERE id = $1', [userId]);
    console.log('Current position:', currentRes.rows[0].position);
    
    // Обновим поле position
    const newPosition = 'Тестовая должность ' + Date.now();
    console.log('Setting position to:', newPosition);
    
    const updateRes = await client.query(
      'UPDATE users SET position = $1 WHERE id = $2 RETURNING id, username, position',
      [newPosition, userId]
    );
    
    console.log('Update result:', updateRes.rows[0]);
    
    // Проверим, сохранилось ли
    const verifyRes = await client.query('SELECT position FROM users WHERE id = $1', [userId]);
    console.log('Verification result:', verifyRes.rows[0]);
    
    // Проверим через SELECT *
    const fullRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    console.log('Full user record position field:', fullRes.rows[0].position);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testPositionField();