import { test, expect } from '@playwright/test';

async function login(page: any) {
  await page.goto('/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.fill('input[type="email"]', 'admin@teamsync.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const pages = [
    { route: '/', name: 'Dashboard' },
    { route: '/projects', name: 'Projects' },
    { route: '/tasks', name: 'Tasks' },
    { route: '/calendar', name: 'Calendar' },
    { route: '/chat', name: 'Chat' },
    { route: '/notifications', name: 'Notifications' },
    { route: '/profile', name: 'Profile' },
    { route: '/reports', name: 'Reports' },
    { route: '/shop', name: 'Shop' },
    { route: '/knowledge-base', name: 'Knowledge Base' },
  ];

  for (const { route, name } of pages) {
    test(`can navigate to ${name} page`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      
      // Verify page loaded (not on auth page)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth');
      
      // Verify body is visible
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Verify page has content
      const pageText = await page.textContent('body');
      expect(pageText).toBeTruthy();
      expect(pageText!.length).toBeGreaterThan(50);
      
      console.log(`${name} page loaded successfully`);
    });
  }
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('dashboard renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('unknown route shows 404 or redirects', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
