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
    // Sin animaciones por defecto; las pruebas de movimiento lo activan (docs/PLAN-8.md §10).
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    // Las pruebas de siempre, quietas; las de movimiento (46.1) solo corren con movimiento.
    { name: 'quieto', grepInvert: /46\.1/ },
    {
      // Una partida corta por juego con movimiento, cada acción en cuanto el botón está
      // disponible, y las recargas a mitad de una secuencia (docs/PLAN-8.md §10).
      name: 'movimiento',
      use: { reducedMotion: 'no-preference' },
      grep: [
        /6\.1 · partida feliz/,
        /31\.7 · partida completa con la composición recomendada/,
        /40\.1 · A dados en 1 contra 1/,
        /46\.1/,
      ],
    },
  ],
  webServer: {
    command: `npx next dev -p ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
