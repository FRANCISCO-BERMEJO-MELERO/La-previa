import { expect, test } from '@playwright/test';
import {
  createRoom,
  impostorOf,
  joinByCode,
  joinByLink,
  newPlayer,
  rolesOf,
  secretWord,
  vote,
  type Players,
} from './players';

test('6.1 · partida feliz con 3 jugadores, y volver a jugar', async ({ browser }) => {
  const fran = await newPlayer(browser);
  const lucia = await newPlayer(browser);
  const alvaro = await newPlayer(browser);
  const players: Players = { Fran: fran, Lucía: lucia, Álvaro: alvaro };

  const code = await createRoom(fran, 'Fran');
  await joinByCode(lucia, code, 'Lucía');
  await joinByLink(alvaro, code, 'Álvaro');
  await expect(fran.getByText('3 de 16')).toBeVisible();
  await expect(lucia.getByRole('status')).toHaveText('Fran empezará la partida');

  // Reparto: los normales ven la misma palabra; el impostor, solo la categoría.
  await fran.getByRole('button', { name: 'Empezar partida' }).click();
  const roles = await rolesOf(players);
  const impostor = impostorOf(roles);
  const normals = Object.keys(players).filter((name) => name !== impostor);
  const words = new Set<string>();
  for (const [name, page] of Object.entries(players)) {
    if (name === impostor) await expect(page.getByText('Tu pista: la categoría')).toBeVisible();
    else words.add(await secretWord(page));
  }
  expect(words.size).toBe(1);
  const [word = ''] = words;

  // Votación: los normales votan al impostor; el impostor, a uno de ellos.
  await fran.getByRole('button', { name: 'Pasar a votación' }).click();
  for (const [name, page] of Object.entries(players)) {
    await vote(page, name === impostor ? (normals[0] ?? '') : impostor);
  }
  await expect(fran.getByText('3 de 3')).toBeVisible();

  // Revelación y resultado.
  await fran.getByRole('button', { name: 'Cerrar votación' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('El grupo expulsa a')).toBeVisible();
    await expect(page.getByText('Era el impostor')).toBeVisible();
  }
  await fran.getByRole('button', { name: 'Ver resultado' }).click();
  for (const [name, page] of Object.entries(players)) {
    const title = name === impostor ? 'Has perdido' : '¡Has ganado!';
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText(word, { exact: true })).toBeVisible();
    await expect(page.getByText(impostor, { exact: true }).first()).toBeVisible();
  }

  // Volver a jugar: otra partida en la misma sala, con los mismos jugadores.
  await fran.getByRole('button', { name: 'Volver a jugar' }).click();
  await rolesOf(players);
  expect(fran.url()).toContain(`/sala/${code}`);
});
