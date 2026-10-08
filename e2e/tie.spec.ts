import { expect, test } from '@playwright/test';
import { pageOf, startedGame, vote } from './players';

test('6.4 · empate y segunda votación', async ({ browser }) => {
  const { players, host, impostor } = await startedGame(browser, [
    'Fran',
    'Lucía',
    'Álvaro',
    'Marta',
  ]);
  const [a = '', b = '', c = '', d = ''] = Object.keys(players);

  // a y d votan a c; b y c votan a d: empate entre c y d.
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  await vote(pageOf(players, a), c);
  await vote(pageOf(players, b), d);
  await vote(pageOf(players, c), d);
  await vote(pageOf(players, d), c);
  await expect(host.getByText('4 de 4')).toBeVisible();
  await host.getByRole('button', { name: 'Cerrar votación' }).click();

  for (const page of Object.values(players)) {
    await expect(page.getByRole('heading', { name: 'Empate' })).toBeVisible();
    await expect(page.getByText(`${c} y ${d} empatan a votos.`, { exact: false })).toBeVisible();
  }

  // Nadie queda fuera: todos vuelven a hablar en la ronda siguiente.
  await host.getByRole('button', { name: 'Seguir hablando' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText(/^(Tu palabra|Eres el)$/)).toBeVisible();
  }

  // Segunda votación: todos contra el impostor.
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  const someoneElse = Object.keys(players).find((name) => name !== impostor) ?? '';
  for (const [name, page] of Object.entries(players)) {
    await vote(page, name === impostor ? someoneElse : impostor);
  }
  await host.getByRole('button', { name: 'Cerrar votación' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('El grupo expulsa a')).toBeVisible();
    await expect(page.getByRole('heading', { name: impostor })).toBeVisible();
  }
});
