import { test, expect } from '@playwright/test';

test.describe('Application Health', () => {
  test('server is running and responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('auth page is accessible', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('static assets are served', async ({ request }) => {
    const response = await request.get('/favicon.png');
    expect(response.status()).toBe(200);
  });
});
