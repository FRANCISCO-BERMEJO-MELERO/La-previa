import { expect, test, type Page } from '@playwright/test';
import { pageOf, startedGame, vote } from './players';

/** Ningún elemento de la pantalla se está moviendo ni va a moverse. */
async function expectStill(page: Page): Promise<void> {
  await expect(page.locator('[class*="animate-"]')).toHaveCount(0);
  await expect(page.getByTestId('phase-ghosts')).toBeEmpty();
}

test('46.1 · El impostor: recargar a mitad de la votación la pinta quieta y al día', async ({
  browser,
}) => {
  const { players, host, impostor } = await startedGame(browser, ['Fran', 'Lucía', 'Álvaro']);
  const [first = '', second = ''] = Object.keys(players).filter((name) => name !== 'Fran');
  await host.getByRole('button', { name: 'Pasar a votación' }).click();

  // El primero vota y espera; el voto del segundo cae en su pantalla.
  const waiting = pageOf(players, first);
  await vote(waiting, first === impostor ? second : impostor);
  await vote(pageOf(players, second), second === impostor ? first : impostor);
  await expect(waiting.getByText('2 de 3', { exact: true }).first()).toBeVisible();
  await expect(waiting.locator('.animate-caer').first()).toBeAttached();

  // Recargada, la pantalla aparece en su estado final, sin animar.
  await waiting.reload();
  await expect(waiting.getByRole('heading', { name: 'Votos recibidos' })).toBeVisible();
  await expect(waiting.getByText('2 de 3', { exact: true }).first()).toBeVisible();
  await expectStill(waiting);

  // A 360 px, la tarjeta de la revelación entra desde fuera sin que la página desborde.
  await waiting.setViewportSize({ width: 360, height: 780 });
  await vote(host, impostor === 'Fran' ? first : impostor);
  await host.getByRole('button', { name: 'Cerrar votación' }).click();
  await expect(waiting.getByText('El grupo expulsa a')).toBeVisible();
  await expect(waiting.locator('.animate-entrar').first()).toBeAttached();
  const overflow = await waiting.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, 'la tarjeta que entra no desborda').toBeLessThanOrEqual(0);
});
