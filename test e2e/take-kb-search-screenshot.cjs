const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: path.join(__dirname, '.auth', 'user.json'),
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3005/knowledge-base', { timeout: 60000 });
  await page.waitForTimeout(8000);
  
  // Try to find search input
  const inputs = await page.locator('input').all();
  console.log('Found', inputs.length, 'inputs');
  for (let i = 0; i < inputs.length; i++) {
    const placeholder = await inputs[i].getAttribute('placeholder');
    const type = await inputs[i].getAttribute('type');
    console.log(`Input ${i}: type=${type}, placeholder=${placeholder}`);
  }
  
  // Type "kanban" in search
  const searchInput = page.locator('input').first();
  await searchInput.fill('kanban');
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'knowledge-base-search-kanban.png'), fullPage: false });
  console.log('Kanban search screenshot saved');
  
  await browser.close();
})();
