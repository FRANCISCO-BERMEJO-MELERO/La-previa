import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';
import { recordTraffic } from './traffic';

const names = ['Fran', 'Lucía', 'Álvaro', 'Marta'];

function answerOf(name: string, round: number): string {
  return `Respuesta de ${name} en la ronda ${String(round)}`;
}

/** El nombre del jugador cuya pantalla dice que la respuesta elegida es la suya. */
async function authorOf(players: Players): Promise<string> {
  for (const page of Object.values(players)) {
    await expect(page.getByText(/^(Es la tuya|Elige a quién votar)$/)).toBeVisible();
  }
  for (const [name, page] of Object.entries(players)) {
    if ((await page.getByText('Es la tuya').count()) > 0) return name;
  }
  throw new Error('Nadie es el autor');
}

async function vote(page: Page, target: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${target}`) }).click();
  await page.getByRole('button', { name: `Votar a ${target}` }).click();
  await expect(page.getByRole('button', { name: `Votar a ${target}` })).toBeHidden();
}

test('10.9 · ¿Quién lo dijo? con 4 jugadores y 5 rondas, sin autor en la red antes de revelarlo', async ({
  browser,
}) => {
  const traffic = new Map<string, () => Promise<string>>();
  const players: Players = {};
  for (const name of names) {
    const page = await newPlayer(browser);
    traffic.set(name, recordTraffic(page));
    players[name] = page;
  }
  const host = pageOf(players, 'Fran');

  // Fran crea la sala con ¿Quién lo dijo? y entran los demás.
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /¿Quién lo dijo\?/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText('4 de 16')).toBeVisible();
  await host.getByRole('button', { name: '5 rondas', exact: true }).click();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  for (let round = 1; round <= 5; round += 1) {
    // Escriben todos; con la última respuesta se pasa sola a votar.
    for (const [name, page] of Object.entries(players)) {
      await expect(page.getByText(`Ronda ${String(round)} de 5`)).toBeVisible();
      await page.getByLabel('Tu respuesta').fill(answerOf(name, round));
      await page.getByRole('button', { name: 'Enviar respuesta' }).click();
    }
    const author = await authorOf(players);
    const guessers = names.filter((name) => name !== author);

    if (round === 1) {
      // Antes de la revelación, nadie que no sea el autor ha recibido el autor ni las respuestas
      // ajenas que no son la elegida.
      for (const name of guessers) {
        const collect = traffic.get(name);
        if (!collect) throw new Error(`Sin tráfico de ${name}`);
        const received = await collect();
        expect(received, 'la captura funciona').toContain(answerOf(author, 1));
        expect(received, `${name} no recibe el autor`).not.toMatch(/"author_id":\s*"/);
        expect(received).not.toContain('subject_id');
        expect(received).not.toMatch(/"is_author":\s*true/);
        for (const other of guessers.filter((guesser) => guesser !== name)) {
          expect(received, `${name} no recibe la respuesta de ${other}`).not.toContain(
            answerOf(other, 1),
          );
        }
      }
    }

    // Aciertan todos menos el primero, que vota a otro.
    const [wrongGuesser, ...rightGuessers] = guessers;
    const decoy = guessers.find((name) => name !== wrongGuesser) ?? '';
    await vote(pageOf(players, wrongGuesser ?? ''), decoy);
    for (const name of rightGuessers) await vote(pageOf(players, name), author);

    for (const page of Object.values(players)) {
      await expect(page.getByText('Lo dijo')).toBeVisible();
      await expect(page.getByRole('heading', { name: author })).toBeVisible();
      await expect(page.getByText(`Fallaron: ${wrongGuesser ?? ''}`)).toBeVisible();
    }
    // Ya revelado, se ven todas las respuestas con su autor.
    await expect(pageOf(players, author).getByText(answerOf(decoy, round))).toBeVisible();
    await host
      .getByRole('button', { name: round === 5 ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }

  for (const page of Object.values(players)) {
    await expect(page.getByText('Gana la partida')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible();
  }
  await expect(pageOf(players, 'Lucía').getByRole('status')).toHaveText(
    'Fran decide si se vuelve a jugar',
  );
});
