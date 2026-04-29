import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixture with authentication
 * 
 * Usage:
 *   test('my test', async ({ page, auth }) => {
 *     await auth.login('user@example.com', 'password');
 *     // ... test logic
 *   });
 */
export const test = base.extend<{
  auth: {
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: () => Promise<boolean>;
  };
}>({
  auth: async ({ page }, use) => {
    const auth = {
      async login(email: string, password: string) {
        await page.goto('/auth');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        // Wait for navigation after login
        await page.waitForURL(/\/(projects|tasks|dashboard)?/);
      },
      
      async logout() {
        // Click user menu or navigate to logout
        await page.goto('/auth');
      },
      
      async isAuthenticated() {
        const currentUrl = page.url();
        return !currentUrl.includes('/auth');
      }
    };
    
    await use(auth);
  }
});

export { expect };
