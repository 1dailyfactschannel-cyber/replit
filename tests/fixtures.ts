import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixture with authentication
 */
export const test = base.extend<{
  auth: {
    login: (email?: string, password?: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: () => Promise<boolean>;
  };
}>({
  auth: async ({ page }, use) => {
    const auth = {
      async login(email: string = 'admin@teamsync.com', password: string = 'admin123') {
        await page.goto('/auth');
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        // Wait for navigation after login
        await page.waitForURL(/\/(projects|tasks|dashboard)?/, { timeout: 10000 }).catch(() => {
          // If not redirected, might be already on auth page - that's ok
        });
      },
      
      async logout() {
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
