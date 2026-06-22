// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { stores, storeIds } from './stores/index.js';

export default defineConfig({
  testDir: './tests',
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60_000 : 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: storeIds.map((id) => ({
    name: id,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: stores[id].baseURL,
      locale: stores[id].locale,
    },
  })),
});
