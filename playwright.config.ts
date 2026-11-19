import { defineConfig, devices } from '@playwright/test';

const apiBaseURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8090';
const uiBaseURL = process.env.PLAYWRIGHT_UI_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],
  outputDir: 'test-results',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      testMatch: '**/*.api.spec.ts',
      use: {
        baseURL: apiBaseURL,
      },
    },
    {
      name: 'ui',
      testMatch: '**/*.ui.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL === 'chrome' ? 'chrome' : undefined,
        headless: process.env.PLAYWRIGHT_HEADED !== 'true',
        baseURL: uiBaseURL,
        screenshot: 'on',
        video: 'on',
        launchOptions: {
        slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO ?? 500),
      },
      },
    },
  ],
});
