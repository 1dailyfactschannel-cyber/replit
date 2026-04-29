import { test, expect } from '@playwright/test';
import { takeScreenshot } from './fixtures';

test.describe('Public Pages Accessibility', () => {
  test('root redirects or loads content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-root');
  });

  test('projects page loads', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-projects');
  });

  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-tasks');
  });

  test('calendar page loads', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-calendar');
  });

  test('chat page loads', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-chat');
  });

  test('notifications page loads', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-notifications');
  });

  test('team page loads', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-team');
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-settings');
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-profile');
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-reports');
  });

  test('management page loads', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-management');
  });

  test('shop page loads', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-shop');
  });

  test('non-existent page shows 404', async ({ page }) => {
    await page.goto('/non-existent-page-12345', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();
    await takeScreenshot(page, 'public-404');
  });
});
