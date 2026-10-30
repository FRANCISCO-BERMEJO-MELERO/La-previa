import { expect, test, type Page } from '@playwright/test';
import { pageOf, startedGame } from './players';

const ROLE_TEXT = /^(Tu palabra|Eres el)$/;

function cover(page: Page) {
  return page.getByRole('button', { name: 'Mantén pulsado para ver tu palabra' });
}

test('43.2 · en el reparto, la palabra no se ve sin mantener pulsado', async ({ browser }) => {
  const { players, impostor } = await startedGame(browser, ['Fran', 'Lucía', 'Álvaro']);
  const normal = Object.keys(players).find((name) => name !== impostor) ?? '';

  for (const name of [normal, impostor]) {
    const page = pageOf(players, name);
    // Recién cargada, la tapa está puesta: la misma para el jugador y para el impostor.
    await page.reload();
    await expect(cover(page)).toBeVisible();
    await expect(page.getByText(ROLE_TEXT)).toBeHidden();

    // Con el dedo: se ve mientras se mantiene y se tapa al soltar.
    const box = await cover(page).boundingBox();
    if (!box) throw new Error('La tapa no tiene caja');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.getByText(ROLE_TEXT)).toBeVisible();
    await page.mouse.up();
    await expect(page.getByText(ROLE_TEXT)).toBeHidden();

    // Con el teclado: mientras se mantiene Espacio.
    await cover(page).focus();
    await page.keyboard.down(' ');
    await expect(page.getByText(ROLE_TEXT)).toBeVisible();
    await page.keyboard.up(' ');
    await expect(page.getByText(ROLE_TEXT)).toBeHidden();
  }
});
