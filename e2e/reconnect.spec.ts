import { expect, test } from '@playwright/test';
import { pageOf, peek, secretWord, startedGame, vote } from './players';

test('6.2 · quien recarga a media partida sigue viendo su palabra y su voto', async ({
  browser,
}) => {
  const { players, host, impostor } = await startedGame(browser, ['Fran', 'Lucía', 'Álvaro']);
  const normal =
    Object.keys(players).find((name) => name !== impostor && name !== 'Fran') ?? 'Fran';
  const normalPage = pageOf(players, normal);
  const impostorPage = pageOf(players, impostor);

  // Hablando: recargar no cambia la palabra ni pide el nombre otra vez.
  const word = await secretWord(normalPage);
  await normalPage.reload();
  expect(await secretWord(normalPage)).toBe(word);
  await expect(normalPage.getByLabel('Tu nombre')).toHaveCount(0);

  await impostorPage.reload();
  await peek(impostorPage);
  await expect(impostorPage.getByText('Eres el')).toBeVisible();

  // Votando: tras votar y recargar, sigue en la espera con su voto.
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  const target = Object.keys(players).find((name) => name !== normal) ?? '';
  await vote(normalPage, target);
  await normalPage.reload();
  await expect(normalPage.getByText(`Tu voto: ${target}`)).toBeVisible();

  // Una pestaña nueva del mismo navegador es el mismo jugador.
  const sameBrowser = await normalPage.context().newPage();
  await sameBrowser.goto(normalPage.url());
  await expect(sameBrowser.getByText(`Tu voto: ${target}`)).toBeVisible();
});
