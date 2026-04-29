const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // Login via API
  const response = await page.request.post('http://localhost:3005/api/login', {
    data: { email: 'e2e-test@example.com', password: 'TestPassword123!' }
  });

  if (!response.ok()) {
    const reg = await page.request.post('http://localhost:3005/api/register', {
      data: { email: 'e2e-test@example.com', password: 'TestPassword123!', username: 'e2etest' }
    });
    console.log('Register status:', reg.status());
  }

  // Go to knowledge base
  await page.goto('http://localhost:3005/knowledge-base', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test e2e/screenshots/knowledge-base-full.png', fullPage: true });
  console.log('Full screenshot saved');

  // Screenshot another article - Projects
  await page.click('text=Страница проектов (Kanban-доска)');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test e2e/screenshots/knowledge-base-projects.png', fullPage: true });
  console.log('Projects article screenshot saved');

  await browser.close();
})();
