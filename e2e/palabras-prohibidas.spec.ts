import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';
import { recordTraffic } from './traffic';

const names = ['Fran', 'Lucía', 'Álvaro', 'Marta'];

/** La palabra y las prohibidas tal como las ve quien describe. */
async function cardOf(page: Page): Promise<{ word: string; forbidden: string[] }> {
  await expect(page.getByText('Describes tú')).toBeVisible();
  const word = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const forbidden = await page.getByRole('list').first().getByRole('listitem').allTextContents();
  if (!word || forbidden.length !== 5) throw new Error('No se ve la tarjeta');
  return { word, forbidden };
}

async function markGuessed(page: Page, guesser: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${guesser}`) }).click();
  await page.getByRole('button', { name: `Ha acertado ${guesser}` }).click();
}

test('16.8 · Palabras prohibidas con 4 jugadores y 5 rondas, sin la tarjeta en la red de quien adivina', async ({
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
  await fran.getByRole('button', { name: /Palabras prohibidas/ }).click();
  await fran.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(fran.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(fran.getByText('4 de 16')).toBeVisible();
  await fran.getByRole('button', { name: '5 rondas', exact: true }).click();
  await fran.getByRole('button', { name: 'Empezar partida' }).click();

  // Ronda 1: describe Fran (el primero en entrar), vigila Lucía y adivinan Álvaro y Marta.
  const card = await cardOf(fran);
  await expect(lucia.getByText('Vigilas tú')).toBeVisible();
  await expect(lucia.getByRole('heading', { name: card.word })).toBeVisible();
  for (const page of [alvaro, marta]) {
    await expect(page.getByRole('heading', { name: 'Adivina en voz alta' })).toBeVisible();
    await expect(page.getByText(/^Fran describe una palabra/)).toBeVisible();
  }
  await expect(fran.getByRole('button', { name: /^Lucía/ })).toHaveCount(0);

  // Antes de la revelación, quien adivina no ha recibido la palabra ni las prohibidas.
  for (const name of ['Álvaro', 'Marta']) {
    const collect = traffic.get(name);
    if (!collect) throw new Error(`Sin tráfico de ${name}`);
    const received = await collect();
    expect(received, 'la captura funciona').toContain('"describer_id"');
    for (const secret of [card.word, ...card.forbidden]) {
      expect(received, `${name} no recibe ${secret}`).not.toContain(JSON.stringify(secret));
    }
  }

  await markGuessed(fran, 'Marta');
  for (const page of Object.values(players)) {
    await expect(page.getByText('Lo acierta Marta')).toBeVisible();
    await expect(page.getByRole('heading', { name: card.word })).toBeVisible();
  }
  await expect(fran.getByText('+1 para Marta y +1 para Fran')).toBeVisible();

  // Ronda 2: describe Lucía y Álvaro, que vigila, canta una prohibida.
  await fran.getByRole('button', { name: 'Siguiente ronda' }).click();
  await expect(lucia.getByText('Describes tú')).toBeVisible();
  await alvaro.getByRole('button', { name: '¡Prohibida!' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('Se dijo una prohibida')).toBeVisible();
  }

  // Ronda 3: describe Álvaro y pasa.
  await fran.getByRole('button', { name: 'Siguiente ronda' }).click();
  await expect(marta.getByText('Vigilas tú')).toBeVisible();
  await alvaro.getByRole('button', { name: 'Pasar' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('Álvaro ha pasado')).toBeVisible();
  }

  // Ronda 4: describe Marta, vigila Fran dando la vuelta, y acierta Lucía.
  await fran.getByRole('button', { name: 'Siguiente ronda' }).click();
  await expect(fran.getByText('Vigilas tú')).toBeVisible();
  await expect(marta.getByText('Describes tú')).toBeVisible();
  await markGuessed(marta, 'Lucía');
  await expect(fran.getByText('Lo acierta Lucía')).toBeVisible();

  // Ronda 5: vuelve a describir Fran y acierta Álvaro.
  await fran.getByRole('button', { name: 'Siguiente ronda' }).click();
  await expect(fran.getByText('Ronda 5 de 5')).toBeVisible();
  await markGuessed(fran, 'Álvaro');
  await fran.getByRole('button', { name: 'Ver resultado' }).click();

  // Fran y Marta empatan a 2 puntos; Lucía y Álvaro tienen 1.
  for (const page of Object.values(players)) {
    await expect(page.getByText('Gana la partida')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fran y Marta' })).toBeVisible();
    await expect(page.getByText('2 puntos')).toHaveCount(2);
    await expect(page.getByText('1 punto', { exact: true })).toHaveCount(2);
  }
});
