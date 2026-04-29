import { test as base, expect, Page } from '@playwright/test';

export type AuthFixture = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => Promise<boolean>;
};

export const test = base.extend<{ auth: AuthFixture }>({
  page: async ({ page }, use) => {
    // Completely block WebGL before any page loads
    await page.addInitScript(() => {
      const noop = () => null;
      // @ts-ignore
      window.WebGLRenderingContext = noop;
      // @ts-ignore
      window.WebGL2RenderingContext = noop;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type: string) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return origGetContext.call(this, type as any);
      };
    });
    await use(page);
  },

  auth: async ({ page }, use) => {
    const auth: AuthFixture = {
      async login(email: string, password: string) {
        await page.goto('/auth');
        await page.fill('input#email', email);
        await page.fill('input#password', password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(projects|tasks|dashboard)/, { timeout: 10000 });
      },
      async logout() {
        await page.goto('/api/logout');
        await page.waitForTimeout(500);
      },
      async isAuthenticated() {
        const currentUrl = page.url();
        return !currentUrl.includes('/auth');
      },
    };
    await use(auth);
  },
});

export { expect };

export async function takeScreenshot(page: Page, name: string) {
  const dir = 'test e2e/screenshots';
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
}
