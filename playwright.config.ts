import { defineConfig } from '@playwright/test';

const PORT = 3123;

// Contra el entorno local: Supabase en Docker (`npx supabase start`) y Next en desarrollo.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    // Chrome del sistema: no hace falta descargar navegadores.
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx next dev -p ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
