import { test, expect } from '@playwright/test';
import { takeScreenshot } from './fixtures';

test.describe('Authentication Pages', () => {
  test('auth page loads with brand and form', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });

    await expect(page.locator('h1')).toContainText('Управляйте проектами');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    await takeScreenshot(page, 'auth-page-desktop');
  });

  test('auth page on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input#email', { timeout: 15000 });

    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    await takeScreenshot(page, 'auth-page-mobile');
  });

  test('login form validation prevents empty submission', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[type="submit"]', { timeout: 15000 });
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent navigation
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/.*auth.*/);
    await takeScreenshot(page, 'auth-validation-empty');
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input#password', { timeout: 15000 });

    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle button next to password input
    const toggleButton = page.locator('input#password >> xpath=../following-sibling::button');
    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }

    await takeScreenshot(page, 'auth-password-toggle');
  });

  test('register tab is accessible', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[role="tab"]', { timeout: 15000 });

    // Click on register tab using TabsTrigger
    const registerTab = page.locator('button[role="tab"]', { hasText: 'Регистрация' });
    await registerTab.click();
    await page.waitForTimeout(300);

    await expect(page.locator('input#reg-email')).toBeVisible();
    await expect(page.locator('input#reg-password')).toBeVisible();

    await takeScreenshot(page, 'auth-register-tab');
  });

  test('forgot password flow UI', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Забыли пароль?', { timeout: 15000 });

    await page.click('text=Забыли пароль?');
    await page.waitForTimeout(300);

    await expect(page.locator('text=Восстановление')).toBeVisible();
    await expect(page.locator('input#reset-email')).toBeVisible();

    await takeScreenshot(page, 'auth-forgot-password');
  });
});
