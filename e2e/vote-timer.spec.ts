import { expect, test } from '@playwright/test';
import { impostorOf, joinByLink, newPlayer, pageOf, rolesOf, type Players } from './players';

const names = ['Fran', 'Lucía', 'Álvaro'];

test('23.3 · con 30 segundos para votar, la votación se cierra sola sin el anfitrión', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const players: Players = {};
  for (const name of names) players[name] = await newPlayer(browser);
  const host = pageOf(players, 'Fran');

  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText('3 de 16')).toBeVisible();
  await host.getByRole('button', { name: '30 segundos para votar' }).click();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  const impostor = impostorOf(await rolesOf(players));
  await host.getByRole('button', { name: 'Pasar a votación' }).click();

  // Todos ven la cuenta atrás; solo vota uno, contra el impostor (o contra Fran si lo es él).
  for (const page of Object.values(players)) {
    await expect(page.getByText(/^Votación · 0:[0-3]\d$/)).toBeVisible();
  }
  const voter = impostor === 'Lucía' ? 'Álvaro' : 'Lucía';
  const target = impostor === voter ? 'Fran' : impostor;
  const voterPage = pageOf(players, voter);
  await voterPage.getByRole('button', { name: new RegExp(`^${target}`) }).click();
  await voterPage.getByRole('button', { name: `Votar a ${target}` }).click();

  // Nadie pulsa "Cerrar votación": al acabarse el tiempo se revela con el único voto.
  for (const page of Object.values(players)) {
    await expect(page.getByText('El grupo expulsa a')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: target })).toBeVisible();
  }
});
