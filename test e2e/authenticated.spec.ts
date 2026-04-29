import { test, expect } from '@playwright/test';
import { takeScreenshot } from './fixtures';

test.describe('Authenticated Pages', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-dashboard');
  });

  test('projects page loads', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-projects');
  });

  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-tasks');
  });

  test('calendar page loads', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-calendar');
  });

  test('chat page loads', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-chat');
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-profile');
  });

  test('team page loads', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-team');
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-settings');
  });

  test('notifications page loads', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-notifications');
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-reports');
  });

  test('management page loads', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-management');
  });

  test('shop page loads', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await takeScreenshot(page, 'auth-shop');
  });
});
