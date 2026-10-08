import { expect, test } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, rolesOf, startedGame, vote } from './players';

test('6.3 · quien entra con la partida empezada juega la siguiente', async ({ browser }) => {
  const { players, host, code, impostor } = await startedGame(browser, ['Fran', 'Lucía', 'Álvaro']);

  // Sergio llega tarde: está en la sala pero no juega esta partida.
  const sergio = await newPlayer(browser);
  await joinByLink(sergio, code, 'Sergio');
  await expect(sergio.getByRole('heading', { name: 'Llegas tarde, Sergio' })).toBeVisible();
  await expect(sergio.getByText('3 jugando')).toBeVisible();
  await expect(sergio.getByText('Tu palabra')).toHaveCount(0);
  await expect(sergio.getByText('Eres el')).toHaveCount(0);

  // Se acaba la partida expulsando al impostor.
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  const someoneElse = Object.keys(players).find((name) => name !== impostor) ?? '';
  for (const [name, page] of Object.entries(players)) {
    await vote(page, name === impostor ? someoneElse : impostor);
  }
  await expect(sergio.getByRole('heading', { name: 'Llegas tarde, Sergio' })).toBeVisible();
  await host.getByRole('button', { name: 'Cerrar votación' }).click();
  await host.getByRole('button', { name: 'Ver resultado' }).click();

  // Ve el resultado neutro, sin ganar ni perder.
  await expect(sergio.getByRole('heading', { name: 'Fin de la partida' })).toBeVisible();
  await expect(sergio.getByText('Gana el grupo')).toBeVisible();

  // En la siguiente juega como uno más.
  await host.getByRole('button', { name: 'Volver a jugar' }).click();
  const roles = await rolesOf({ ...players, Sergio: sergio });
  expect(Object.keys(roles)).toHaveLength(4);
  await expect(pageOf(players, 'Fran').getByText('4 conectados')).toBeVisible();
});
