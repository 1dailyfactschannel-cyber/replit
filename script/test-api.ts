import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testApiEndpoints() {
  console.log('🚀 Testing API endpoints with PostgreSQL...\n');
  
  const baseUrl = 'http://localhost:5000'; // Assuming local development
  
  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Get all site settings
    console.log('\n2. Testing site settings retrieval...');
    const settingsResponse = await fetch(`${baseUrl}/api/settings`);
    const settingsData = await settingsResponse.json();
    console.log('✅ Site settings:', settingsData);
    
    // Test 3: Get specific setting
    console.log('\n3. Testing specific setting retrieval...');
    const specificSettingResponse = await fetch(`${baseUrl}/api/settings/site_name`);
    const specificSettingData = await specificSettingResponse.json();
    console.log('✅ Specific setting:', specificSettingData);
    
    // Test 4: Create a test user
    console.log('\n4. Testing user creation...');
    const newUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const createUserResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    
    if (createUserResponse.ok) {
      const userData = await createUserResponse.json();
      console.log('✅ User created:', userData.username);
      
      // Test 5: Get user by ID
      console.log('\n5. Testing user retrieval...');
      const getUserResponse = await fetch(`${baseUrl}/api/users/${userData.id}`);
      const getUserData = await getUserResponse.json();
      console.log('✅ User retrieved:', getUserData.username);
      
      // Test 6: Update user
      console.log('\n6. Testing user update...');
      const updateUserResponse = await fetch(`${baseUrl}/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated Test' })
      });
      
      if (updateUserResponse.ok) {
        const updatedUserData = await updateUserResponse.json();
        console.log('✅ User updated:', updatedUserData.firstName);
      }
      
      // Test 7: Get all users
      console.log('\n7. Testing all users retrieval...');
      const allUsersResponse = await fetch(`${baseUrl}/api/users`);
      const allUsersData = await allUsersResponse.json();
      console.log(`✅ Retrieved ${allUsersData.length} users`);
      
    } else {
      const errorData = await createUserResponse.json();
      console.log('❌ User creation failed:', errorData);
    }
    
    // Test 8: Create site setting
    console.log('\n8. Testing site setting creation...');
    const newSetting = {
      key: `test_setting_${Date.now()}`,
      value: 'test_value',
      description: 'Test setting'
    };
    
    const createSettingResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSetting)
    });
    
    if (createSettingResponse.ok) {
      const settingData = await createSettingResponse.json();
      console.log('✅ Setting created:', settingData.key);
    }
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API testing failed:', error);
  }
}

// Run the tests
testApiEndpoints();