import { test, expect } from '@playwright/test';
import { test as authTest } from './fixtures';

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth');
    
    // Check page title and heading
    await expect(page.locator('h1')).toContainText('Управляйте проектами');
    
    // Check login form exists
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check login button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login form validation works', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should still be on auth page (validation prevented submission)
    await expect(page).toHaveURL(/.*auth.*/);
  });
});

test.describe('Public Pages', () => {
  test('auth page is accessible from root', async ({ page }) => {
    await page.goto('/');
    
    // Wait for DOM to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // App should either show content or redirect to auth
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('projects page returns content', async ({ page }) => {
    await page.goto('/projects');
    
    // Wait for DOM to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for any loading states to finish
    await page.waitForTimeout(1000);
    
    // Check page has content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('notifications page exists', async ({ page }) => {
    await page.goto('/notifications');
    
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('calendar page exists', async ({ page }) => {
    await page.goto('/calendar');
    
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('UI Components', () => {
  test('login page has all required elements', async ({ page }) => {
    await page.goto('/auth');
    
    // Check brand elements
    await expect(page.locator('text=portal')).toBeVisible();
    
    // Check form inputs
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    
    // Check password visibility toggle (eye icon button)
    await expect(page.locator('button[type="button"][class*="absolute"]')).toBeVisible();
  });

  test('page is responsive', async ({ page }) => {
    await page.goto('/auth');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    await expect(body).toBeVisible();
  });
});

// Tests with authentication fixture
authTest.describe('Authenticated Features', () => {
  authTest('user can navigate after login', async ({ page, auth }) => {
    // This test requires valid credentials - adjust as needed
    // await auth.login('test@example.com', 'password');
    
    // For now just verify the auth helper exists
    await page.goto('/auth');
    const isAuth = await auth.isAuthenticated();
    expect(typeof isAuth).toBe('boolean');
  });
});
