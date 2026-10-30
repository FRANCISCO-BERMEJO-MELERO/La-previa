import { expect, test, type Page } from '@playwright/test';
import { impostorOf, pageOf, peek, rolesOf, startedGame, vote, type Players } from './players';

/** La primera página en la que se ve ese botón. */
async function pageWithButton(players: Players, name: string): Promise<Page> {
  await expect
    .poll(async () => {
      for (const page of Object.values(players)) {
        if ((await page.getByRole('button', { name, exact: true }).count()) > 0) return true;
      }
      return false;
    })
    .toBe(true);
  for (const page of Object.values(players)) {
    if ((await page.getByRole('button', { name, exact: true }).count()) > 0) return page;
  }
  throw new Error(`Nadie tiene el botón ${name}`);
}

async function changeGame(host: Page, game: RegExp): Promise<void> {
  await host.getByRole('button', { name: 'Cambiar de juego' }).click();
  await host.getByRole('button', { name: game }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  await host.getByRole('button', { name: '5 rondas', exact: true }).click();
  await host.getByRole('button', { name: 'Empezar partida' }).click();
}

/** Todos ven la ronda; devuelve cuando cada página ha cambiado de pantalla. */
async function roundStarted(players: Players, round: number): Promise<void> {
  for (const page of Object.values(players)) {
    await expect(page.getByText(`Ronda ${String(round)} de 5`)).toBeVisible();
  }
}

test('12.6 y 17.4 · una sala, los seis juegos seguidos y una recarga a mitad de cada uno', async ({
  browser,
}) => {
  test.setTimeout(360_000);

  // El impostor: Lucía recarga en el reparto y sigue viendo su papel. ---------------------------
  const { players, host, impostor } = await startedGame(browser, [
    'Fran',
    'Lucía',
    'Álvaro',
    'Marta',
  ]);
  const lucia = pageOf(players, 'Lucía');
  const before = (await lucia.getByText(/^(Tu palabra|Eres el)$/).textContent()) ?? '';
  await lucia.reload();
  await peek(lucia);
  await expect(lucia.getByText(before, { exact: true })).toBeVisible();
  expect(impostorOf(await rolesOf(players))).toBe(impostor);
  const normals = Object.keys(players).filter((name) => name !== impostor);
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  for (const [name, page] of Object.entries(players)) {
    await vote(page, name === impostor ? (normals[0] ?? '') : impostor);
  }
  await host.getByRole('button', { name: 'Cerrar votación' }).click();
  await host.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(lucia.getByText('Gana el grupo')).toBeVisible();

  // ¿Quién es más probable que…?: Álvaro recarga tras votar y conserva su voto. -----------------
  await changeGame(host, /más probable/);
  const alvaro = pageOf(players, 'Álvaro');
  for (let round = 1; round <= 5; round += 1) {
    await roundStarted(players, round);
    for (const [name, page] of Object.entries(players)) {
      await page.getByRole('button', { name: /^Marta/ }).click();
      await page.getByRole('button', { name: 'Votar a Marta' }).click();
      if (round === 2 && name === 'Álvaro') {
        await alvaro.reload();
        await expect(alvaro.getByText('Tu voto: Marta')).toBeVisible();
      }
    }
    await host
      .getByRole('button', { name: round === 5 ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }
  await expect(alvaro.getByText('El más probable de la noche')).toBeVisible();
  await expect(alvaro.getByRole('heading', { name: 'Marta' })).toBeVisible();

  // ¿Quién lo dijo?: Lucía recarga tras responder (aún faltan otros) y ve su respuesta. ---------------------------
  await changeGame(host, /¿Quién lo dijo\?/);
  const marta = pageOf(players, 'Marta');
  for (let round = 1; round <= 5; round += 1) {
    await roundStarted(players, round);
    for (const [name, page] of Object.entries(players)) {
      await page.getByLabel('Tu respuesta').fill(`Respuesta de ${name}`);
      await page.getByRole('button', { name: 'Enviar respuesta' }).click();
      if (round === 3 && name === 'Lucía') {
        await lucia.reload();
        await expect(lucia.getByText('Tu respuesta: Respuesta de Lucía')).toBeVisible();
      }
    }
    // Votan todos menos el autor, a cualquiera de su lista; con el último voto se revela.
    for (const page of Object.values(players)) {
      await expect(page.getByText(/^(Es la tuya|Elige a quién votar)$/)).toBeVisible();
      if ((await page.getByText('Es la tuya').count()) > 0) continue;
      await page.getByRole('list').getByRole('button').first().click();
      await page.getByRole('button', { name: /^Votar a/ }).click();
    }
    await expect(host.getByText('Lo dijo')).toBeVisible();
    await host
      .getByRole('button', { name: round === 5 ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }
  await expect(marta.getByText('Gana la partida')).toBeVisible();

  // Una sola pista: el adivino recarga en la revisión y sigue sin ver la palabra. ---------------
  await changeGame(host, /Una sola pista/);
  for (let round = 1; round <= 5; round += 1) {
    await roundStarted(players, round);
    let guesser: Page | undefined;
    for (const page of Object.values(players)) {
      await expect(page.getByText(/^(Tu pista|Te toca adivinar)$/).first()).toBeVisible();
      if ((await page.getByLabel('Tu pista').count()) === 0) {
        guesser = page;
        continue;
      }
      await page
        .getByLabel('Tu pista')
        .fill(`Zq${String(round)}${String(Object.values(players).indexOf(page))}`);
      await page.getByRole('button', { name: 'Enviar pista' }).click();
    }
    if (!guesser) throw new Error('Nadie adivina');
    if (round === 1) {
      await guesser.reload();
      await expect(guesser.getByRole('heading', { name: 'Te toca adivinar' })).toBeVisible();
      await expect(guesser.getByText('Los demás están revisando las pistas.')).toBeVisible();
    }
    const arbiter = await pageWithButton(players, 'Enseñar pistas');
    await arbiter.getByRole('button', { name: 'Enseñar pistas' }).click();
    await arbiter.getByRole('button', { name: 'Acertada' }).click();
    await arbiter
      .getByRole('button', { name: round === 5 ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }
  for (const page of Object.values(players)) {
    await expect(page.getByRole('heading', { name: '5 de 5' })).toBeVisible();
  }

  // ¿Qué prefieres?: Álvaro recarga tras elegir (aún falta Marta) y conserva su elección. -------
  await changeGame(host, /¿Qué prefieres\?/);
  for (let round = 1; round <= 5; round += 1) {
    await roundStarted(players, round);
    for (const [name, page] of Object.entries(players)) {
      await page.getByRole('button', { name: /^Opción A: / }).click();
      await page.getByRole('button', { name: 'Elegir la A' }).click();
      if (round === 2 && name === 'Álvaro') {
        await alvaro.reload();
        await expect(alvaro.getByText(/^Tu elección: /)).toBeVisible();
      }
    }
    await host
      .getByRole('button', { name: round === 5 ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }
  await expect(marta.getByText('Quien mejor conoce al grupo')).toBeVisible();

  // Palabras prohibidas: quien vigila recarga y sigue viendo la tarjeta; quien adivina, no. ----
  await changeGame(host, /Palabras prohibidas/);
  for (let round = 1; round <= 5; round += 1) {
    await roundStarted(players, round);
    if (round === 1) {
      // Describe Fran, vigila Lucía y adivinan Álvaro y Marta.
      const word = (await host.getByRole('heading', { level: 1 }).textContent()) ?? '';
      await lucia.reload();
      await expect(lucia.getByText('Vigilas tú')).toBeVisible();
      await expect(lucia.getByRole('heading', { name: word })).toBeVisible();
      await alvaro.reload();
      await expect(alvaro.getByRole('heading', { name: 'Adivina en voz alta' })).toBeVisible();
      await expect(alvaro.getByText(word, { exact: true })).toHaveCount(0);
    }
    const describer = await pageWithButton(players, 'Pasar');
    await describer.getByRole('button', { name: 'Pasar' }).click();
    await host
      .getByRole('button', { name: round === 5 ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }
  for (const page of Object.values(players)) {
    await expect(page.getByText('Gana la partida')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nadie ha sumado puntos' })).toBeVisible();
  }
});
