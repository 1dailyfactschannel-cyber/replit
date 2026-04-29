import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000,
  reporter: [
    ['html', { open: 'never', outputFolder: './report' }],
    ['list'],
  ],
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /authenticated\.spec\.ts/,
    },
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
      testMatch: /authenticated\.spec\.ts/,
    },
    {
      name: 'firefox-public',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /authenticated\.spec\.ts/,
    },
    {
      name: 'webkit-public',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /authenticated\.spec\.ts/,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: /authenticated\.spec\.ts/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: /authenticated\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
