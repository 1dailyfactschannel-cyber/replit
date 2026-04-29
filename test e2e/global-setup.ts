import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const timestamp = Date.now();
  const testEmail = `e2e-test-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `e2euser_${timestamp}`;

  const context = await request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005',
  });

  // Try to register with retry
  let registered = false;
  for (let i = 0; i < 3; i++) {
    const registerRes = await context.post('/api/register', {
      data: {
        email: testEmail,
        password: testPassword,
        username: testUsername,
      },
    });

    if (registerRes.ok()) {
      registered = true;
      break;
    }

    const body = await registerRes.text();
    console.log(`Registration attempt ${i + 1} response:`, body);

    if (body.includes('rate') || body.includes('попыток')) {
      console.log('Rate limited, waiting 60s...');
      await new Promise((r) => setTimeout(r, 60000));
    } else {
      break;
    }
  }

  // Try to login with retry
  for (let i = 0; i < 3; i++) {
    const loginRes = await context.post('/api/login', {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });

    if (loginRes.ok()) {
      await context.storageState({ path: AUTH_FILE });
      await context.dispose();
      console.log('Global setup complete: test user authenticated');
      return;
    }

    const body = await loginRes.text();
    console.log(`Login attempt ${i + 1} failed:`, body);

    if (body.includes('Too many') || body.includes('rate')) {
      console.log('Rate limited on login, waiting 60s...');
      await new Promise((r) => setTimeout(r, 60000));
    } else {
      break;
    }
  }

  await context.dispose();
  throw new Error('Failed to login test user during global setup');
}

export default globalSetup;
