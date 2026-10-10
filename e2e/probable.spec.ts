import { expect, test, type Page } from '@playwright/test';
import { pageOf, startedGame, vote } from './players';

/** Vota desde la lista de la pregunta y espera a ver la propia elección o el recuento. */
async function voteFor(page: Page, target: string): Promise<void> {
  await expect(page.getByText('¿Quién es más probable que…')).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${target}`) }).click();
  await page.getByRole('button', { name: `Votar a ${target}` }).click();
  await expect(page.getByRole('button', { name: `Votar a ${target}` })).toBeHidden();
}

test('9.9 · en la misma sala, El impostor, cambio a probable y 5 rondas con 3 jugadores', async ({
  browser,
}) => {
  // Una partida de El impostor hasta el final: el grupo expulsa al impostor.
  const { players, host, code, impostor } = await startedGame(browser, ['Fran', 'Lucía', 'Álvaro']);
  const normals = Object.keys(players).filter((name) => name !== impostor);
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  for (const [name, page] of Object.entries(players)) {
    await vote(page, name === impostor ? (normals[0] ?? '') : impostor);
  }
  await host.getByRole('button', { name: 'Cerrar votación' }).click();
  await host.getByRole('button', { name: 'Ver resultado' }).click();

  // Cambiar de juego: el anfitrión elige probable y 5 rondas.
  await host.getByRole('button', { name: 'Cambiar de juego' }).click();
  await host.getByRole('button', { name: /¿Quién es más probable que…\?/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  await host.getByRole('button', { name: '5 rondas', exact: true }).click();
  await expect(pageOf(players, 'Lucía').getByRole('status')).toHaveText('Fran empezará la partida');
  await expect(
    pageOf(players, 'Lucía').getByRole('button', { name: /más probable/ }),
  ).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  // Cada ronda: votan todos, se cierra sola y el anfitrión pasa a la siguiente.
  // Lucía se lleva las rondas 1 a 4; en la 5 empatan los tres a un voto.
  const plan: Record<string, string>[] = [
    { Fran: 'Lucía', Lucía: 'Lucía', Álvaro: 'Lucía' },
    { Fran: 'Lucía', Lucía: 'Fran', Álvaro: 'Lucía' },
    { Fran: 'Lucía', Lucía: 'Álvaro', Álvaro: 'Lucía' },
    { Fran: 'Lucía', Lucía: 'Lucía', Álvaro: 'Fran' },
    { Fran: 'Álvaro', Lucía: 'Fran', Álvaro: 'Lucía' },
  ];
  const prompts = new Set<string>();
  for (const [index, votes] of plan.entries()) {
    const round = index + 1;
    for (const page of Object.values(players)) {
      await expect(page.getByText(`Ronda ${String(round)} de 5`)).toBeVisible();
    }
    prompts.add((await host.getByRole('heading', { level: 1 }).textContent()) ?? '');
    // Mientras falta alguien, nadie ve el recuento.
    const [first, ...rest] = Object.entries(votes);
    if (!first) throw new Error('Ronda sin votos');
    await voteFor(pageOf(players, first[0]), first[1]);
    await expect(pageOf(players, first[0]).getByText('Han votado')).toBeVisible();
    await expect(pageOf(players, first[0]).getByText(`Tu voto: ${first[1]}`)).toBeVisible();
    for (const [voter, target] of rest) await voteFor(pageOf(players, voter), target);

    const button = round === 5 ? 'Ver resultado' : 'Siguiente ronda';
    await expect(host.getByRole('button', { name: button })).toBeVisible();
    const winner = round === 5 ? 'Empate en cabeza' : 'El más votado';
    for (const page of Object.values(players)) await expect(page.getByText(winner)).toBeVisible();
    await host.getByRole('button', { name: button }).click();
  }
  expect(prompts.size).toBe(5);

  // Resultado: Lucía, con 5 puntos, es la más probable de la noche.
  for (const page of Object.values(players)) {
    await expect(page.getByText('El más probable de la noche')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lucía' })).toBeVisible();
    await expect(page.getByText('5 puntos')).toBeVisible();
  }
  await expect(pageOf(players, 'Lucía').getByRole('status')).toHaveText(
    'Fran decide si se vuelve a jugar',
  );

  // Y se vuelve a El impostor en la misma sala.
  await host.getByRole('button', { name: 'Cambiar de juego' }).click();
  await host.getByRole('button', { name: /El impostor/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  await expect(host.getByRole('button', { name: 'Más impostores' })).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  await expect(pageOf(players, 'Lucía').getByText(/^(Tu palabra|Eres el)$/)).toBeVisible();
  expect(host.url()).toContain(`/sala/${code}`);
});
