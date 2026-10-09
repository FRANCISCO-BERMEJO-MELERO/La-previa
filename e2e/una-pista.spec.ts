import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';
import { recordTraffic } from './traffic';

const names = ['Fran', 'Lucía', 'Álvaro', 'Marta'];

/** La palabra secreta tal cual está en el DOM, leída de la tarjeta de quien da pista. */
async function secretWordOf(page: Page): Promise<string> {
  const card = page.getByText(/^Categoría: /).locator('..');
  const text = (await card.textContent()) ?? '';
  const word = /^La palabra(.+)Categoría: /.exec(text)?.[1];
  if (!word) throw new Error(`No se ve la palabra: ${text}`);
  return word;
}

async function giveClue(page: Page, clue: string): Promise<void> {
  await page.getByLabel('Tu pista').fill(clue);
  await page.getByRole('button', { name: 'Enviar pista' }).click();
  await expect(page.getByLabel('Tu pista')).toBeHidden();
}

/** La primera página en la que se ve ese botón: la del árbitro o la del anfitrión. */
async function pageWithButton(players: Players, name: string | RegExp): Promise<Page> {
  await expect
    .poll(async () => {
      for (const page of Object.values(players)) {
        if ((await page.getByRole('button', { name }).count()) > 0) return true;
      }
      return false;
    })
    .toBe(true);
  for (const page of Object.values(players)) {
    if ((await page.getByRole('button', { name }).count()) > 0) return page;
  }
  throw new Error(`Nadie tiene el botón ${String(name)}`);
}

test('11.6 · Una sola pista con 4 jugadores y 5 rondas, sin la palabra en la red del adivino', async ({
  browser,
}) => {
  const traffic = new Map<string, () => Promise<string>>();
  const players: Players = {};
  for (const name of names) {
    const page = await newPlayer(browser);
    traffic.set(name, recordTraffic(page));
    players[name] = page;
  }
  const [fran, lucia, alvaro, marta] = names.map((name) => pageOf(players, name));
  if (!fran || !lucia || !alvaro || !marta) throw new Error('Faltan jugadores');

  await fran.goto('/');
  await fran.getByRole('button', { name: 'Crear sala' }).click();
  await fran.getByLabel('Tu nombre').fill('Fran');
  await fran.getByRole('button', { name: 'Entrar' }).click();
  await fran.getByRole('button', { name: /Una sola pista/ }).click();
  await fran.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(fran.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(fran.getByText('4 de 16')).toBeVisible();
  await fran.getByRole('button', { name: '5 rondas', exact: true }).click();
  await fran.getByRole('button', { name: 'Empezar partida' }).click();

  // Ronda 1: adivina Fran (el primero en entrar) y arbitra Lucía (la siguiente).
  await expect(fran.getByRole('heading', { name: 'Te toca adivinar' })).toBeVisible();
  const word = await secretWordOf(lucia);
  await giveClue(lucia, 'Kiwiq');
  await giveClue(alvaro, 'KIWIQ');
  await giveClue(marta, 'Brumaq');

  // Las dos iguales se anulan solas; Lucía anula a mano la de Marta.
  await expect(lucia.getByRole('heading', { name: 'Revisad las pistas' })).toBeVisible();
  await expect(lucia.getByText('Anulada', { exact: true })).toHaveCount(2);
  await lucia.getByRole('button', { name: 'Anular la pista de Marta: Brumaq' }).click();
  await expect(lucia.getByText('Anulada', { exact: true })).toHaveCount(3);
  await lucia.getByRole('button', { name: 'Enseñar pistas' }).click();
  await expect(fran.getByText(/Todas las pistas se han anulado/)).toBeVisible();

  // Antes de la revelación, el adivino no ha recibido la palabra ni ninguna pista.
  const collect = traffic.get('Fran');
  if (!collect) throw new Error('Sin tráfico de Fran');
  const received = await collect();
  expect(received, 'la captura funciona').toContain('"guesser_id"');
  expect(received, 'el adivino no recibe la palabra').not.toContain(JSON.stringify(word));
  expect(received).not.toContain('Kiwiq');
  expect(received).not.toContain('Brumaq');
  expect(received).not.toContain('KIWIQ');

  await lucia.getByRole('button', { name: 'Pasa' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('La palabra era')).toBeVisible();
    await expect(page.getByRole('heading', { name: word })).toBeVisible();
  }

  // Rondas 2 a 5: todos los que no adivinan dan pista y el árbitro marca acertada.
  for (let round = 2; round <= 5; round += 1) {
    const next = await pageWithButton(players, 'Siguiente ronda');
    await next.getByRole('button', { name: 'Siguiente ronda' }).click();
    for (const page of Object.values(players)) {
      await expect(page.getByText(`Ronda ${String(round)} de 5`)).toBeVisible();
      await expect(page.getByText(/^(Tu pista|Te toca adivinar)$/).first()).toBeVisible();
    }
    for (const [index, page] of Object.values(players).entries()) {
      if ((await page.getByLabel('Tu pista').count()) > 0) {
        await giveClue(page, `Zqx${String(round)}${String(index)}`);
      }
    }
    const arbiter = await pageWithButton(players, 'Enseñar pistas');
    await arbiter.getByRole('button', { name: 'Enseñar pistas' }).click();
    await arbiter.getByRole('button', { name: 'Acertada' }).click();
    await expect(arbiter.getByText('¡Acertada!')).toBeVisible();
  }
  const last = await pageWithButton(players, 'Ver resultado');
  await last.getByRole('button', { name: 'Ver resultado' }).click();

  for (const page of Object.values(players)) {
    await expect(page.getByText('Marcador del equipo')).toBeVisible();
    await expect(page.getByRole('heading', { name: '4 de 5' })).toBeVisible();
  }
});
