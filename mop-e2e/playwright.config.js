// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Cada test debe ser autosuficiente; sin estado compartido entre ejecuciones
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // En monitorización un fallo puntual puede ser un flake de red: 1 reintento
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Timeout generoso: SSR + cold start de Fly.io puede tardar
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'https://themopbookstore.com',
    locale: 'es-ES',
    // Solo guardamos traza/screenshot cuando algo falla (barato)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Descomenta si quieres cubrir Safari/WebKit (recomendable dado tu
    // histórico de incidencias Safari-específicas)
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
