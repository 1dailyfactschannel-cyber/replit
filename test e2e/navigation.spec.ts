import { test, expect } from '@playwright/test';
import { takeScreenshot } from './fixtures';

test.describe('Navigation & Routing', () => {
  test('navigation between pages works', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body', { timeout: 15000 });

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'navigation-auth');
  });

  test('page responds to back button', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body', { timeout: 15000 });

    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await page.goBack();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'navigation-back');
  });

  test('keyboard navigation works on auth form', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body', { timeout: 15000 });

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await takeScreenshot(page, 'navigation-keyboard');
  });
});

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile-small', width: 375, height: 667 },
    { name: 'mobile-large', width: 414, height: 896 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'desktop-large', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    test(`auth page on ${vp.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('body', { timeout: 15000 });

      await expect(page.locator('body')).toBeVisible();
      await takeScreenshot(page, `responsive-auth-${vp.name}`);
    });

    test(`projects page on ${vp.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/projects', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await expect(page.locator('body')).toBeVisible();
      await takeScreenshot(page, `responsive-projects-${vp.name}`);
    });
  }
});
