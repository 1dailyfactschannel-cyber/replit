import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3005';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../client/public/screenshots/kb');

// Ensure directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page: any, route: string, filename: string, options: any = {}) {
  try {
    console.log(`📸 Screenshotting ${route}...`);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ 
      path: filepath, 
      fullPage: false,
      type: 'png',
      ...options 
    });
    console.log(`✅ Saved: ${filepath}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to screenshot ${route}:`, (err as Error).message);
    return false;
  }
}

async function registerAndLogin(page: any): Promise<boolean> {
  try {
    console.log('\n🔑 Registering test user...');
    
    // Try to register a test user via API
    const timestamp = Date.now();
    const testEmail = `screenshot_${timestamp}@test.com`;
    const testPassword = 'TestPass123!';
    
    const registerRes = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: `screenshot_${timestamp}`,
        password: testPassword,
        firstName: 'Screenshot',
        lastName: 'Bot',
      }),
    });
    
    if (!registerRes.ok && registerRes.status !== 409) {
      console.log(`⚠️ Registration failed with status ${registerRes.status}. Trying login with existing test credentials...`);
    } else {
      console.log('✅ Test user registered');
    }
    
    // Now login
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/auth');
    
    if (isLoggedIn) {
      console.log('✅ Login successful!\n');
    } else {
      console.log('⚠️ Login failed. Will try with pre-existing admin credentials...\n');
      
      // Try admin credentials from seed scripts
      await page.goto(`${BASE_URL}/auth`);
      await page.fill('input[type="email"]', 'admin@teamsync.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      const urlAfterAdmin = page.url();
      if (!urlAfterAdmin.includes('/auth')) {
        console.log('✅ Admin login successful!\n');
        return true;
      }
    }
    
    return isLoggedIn;
  } catch (err) {
    console.error('❌ Login attempt failed:', (err as Error).message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting documentation screenshots...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Public pages (no auth required)
  await takeScreenshot(page, '/auth', 'auth-login.png');
  
  // Try to login
  const isLoggedIn = await registerAndLogin(page);
  
  if (isLoggedIn) {
    // Take screenshots of authenticated pages
    await takeScreenshot(page, '/', 'dashboard.png');
    await takeScreenshot(page, '/projects', 'projects.png');
    await takeScreenshot(page, '/tasks', 'tasks.png');
    await takeScreenshot(page, '/calendar', 'calendar.png');
    await takeScreenshot(page, '/chat', 'chat.png');
    await takeScreenshot(page, '/notifications', 'notifications.png');
    await takeScreenshot(page, '/profile', 'profile.png');
    await takeScreenshot(page, '/management', 'management.png');
    await takeScreenshot(page, '/reports', 'reports.png');
    await takeScreenshot(page, '/shop', 'shop.png');
    await takeScreenshot(page, '/knowledge-base', 'knowledge-base.png');
    
    // Try to capture task detail modal
    try {
      await page.goto(`${BASE_URL}/projects`);
      await page.waitForTimeout(2000);
      
      // Look for a task card and click it
      const taskSelectors = [
        '[class*="task"]',
        '[class*="card"]',
        '[draggable="true"]',
        '.group',
      ];
      
      for (const selector of taskSelectors) {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          await elements[0].click();
          await page.waitForTimeout(1500);
          await page.screenshot({ 
            path: path.join(SCREENSHOTS_DIR, 'task-detail.png'),
            type: 'png'
          });
          console.log('✅ Saved: task-detail.png');
          break;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not capture task detail modal');
    }
  } else {
    console.log('\n⚠️ Could not authenticate. Only public pages were captured.');
    console.log('💡 To get authenticated screenshots:');
    console.log('   1. Manually login to the app');
    console.log('   2. Or update credentials in this script\n');
  }

  await browser.close();
  
  // List all generated screenshots
  const files = fs.readdirSync(SCREENSHOTS_DIR);
  console.log(`\n📁 Generated ${files.length} screenshots in ${SCREENSHOTS_DIR}:`);
  files.forEach(f => console.log(`   - ${f}`));
  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
