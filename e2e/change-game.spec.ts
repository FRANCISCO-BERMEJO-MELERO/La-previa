import { expect, test } from '@playwright/test';
import { createRoom, joinByLink, newPlayer } from './players';

test('D.3 · en la sala, el anfitrión cambia a El lobo desde la píldora y se juega con 4', async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host, 'Fran');
  const lucia = await newPlayer(browser);
  await joinByLink(lucia, code, 'Lucía');
  await expect(host.getByText('2 de 16')).toBeVisible();

  // Solo el anfitrión puede cambiar de juego; para los demás la píldora solo informa.
  await expect(lucia.getByText('El impostor', { exact: true })).toBeVisible();
  await expect(lucia.getByRole('button', { name: /Cambiar de juego/ })).toHaveCount(0);

  const pill = host.getByRole('button', { name: 'Cambiar de juego. Ahora: El impostor' });
  const box = await pill.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await pill.click();

  await expect(host.getByRole('listitem').first()).toContainText('El lobo');
  await host.getByRole('button', { name: /El lobo/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();

  await expect(
    host.getByRole('button', { name: 'Cambiar de juego. Ahora: El lobo' }),
  ).toBeVisible();
  await expect(lucia.getByText('El lobo', { exact: true })).toBeVisible();
  await expect(host.getByText(/Hacen falta al menos 4 jugadores: faltan 2/)).toBeVisible();

  for (const name of ['Álvaro', 'Marta']) await joinByLink(await newPlayer(browser), code, name);
  await expect(host.getByText('4 de 16')).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  await expect(host.getByText('Eres', { exact: true })).toBeVisible();
  await expect(lucia.getByText('Eres', { exact: true })).toBeVisible();
});
