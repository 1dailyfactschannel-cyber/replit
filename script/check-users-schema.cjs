const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test'
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('Current users table columns:');
    res.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    // Проверим, какие поля отсутствуют
    const requiredFields = ['department', 'position', 'phone', 'timezone', 'language'];
    const existingFields = res.rows.map(row => row.column_name);
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    console.log('\nMissing fields:', missingFields);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();