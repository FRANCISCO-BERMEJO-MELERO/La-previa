import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';

const names = ['Fran', 'Lucía', 'Álvaro'];

/** Elige una opción del dilema y espera a la pantalla de espera o al reparto. */
async function choose(page: Page, option: 'A' | 'B'): Promise<void> {
  await expect(page.getByRole('heading', { name: '¿Qué prefieres?' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^Opción ${option}: `) }).click();
  await page.getByRole('button', { name: `Elegir la ${option}` }).click();
  await expect(page.getByRole('button', { name: `Elegir la ${option}` })).toBeHidden();
}

test('15.8 · ¿Qué prefieres? con 3 jugadores y 5 rondas, con mayoría y con empate', async ({
  browser,
}) => {
  const players: Players = {};
  for (const name of names) players[name] = await newPlayer(browser);
  const host = pageOf(players, 'Fran');
  const lucia = pageOf(players, 'Lucía');

  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /¿Qué prefieres\?/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText('3 de 16')).toBeVisible();
  await host.getByRole('button', { name: '5 rondas', exact: true }).click();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  // Ronda 3: Álvaro no elige y el anfitrión cierra con una A y una B, así que empatan.
  const plan: Partial<Record<string, 'A' | 'B'>>[] = [
    { Fran: 'A', Lucía: 'A', Álvaro: 'B' },
    { Fran: 'B', Lucía: 'B', Álvaro: 'B' },
    { Fran: 'A', Lucía: 'B' },
    { Fran: 'B', Lucía: 'A', Álvaro: 'A' },
    { Fran: 'A', Lucía: 'A', Álvaro: 'A' },
  ];
  const dilemmas = new Set<string>();
  for (const [index, choices] of plan.entries()) {
    const round = index + 1;
    for (const page of Object.values(players)) {
      await expect(page.getByText(`Ronda ${String(round)} de 5`)).toBeVisible();
    }
    dilemmas.add(
      (await host.getByRole('button', { name: /^Opción A: / }).getAttribute('aria-label')) ?? '',
    );

    // Quien ya ha elegido ve su elección y el contador, pero no el reparto.
    await choose(host, choices.Fran ?? 'A');
    await expect(host.getByText('Han elegido')).toBeVisible();
    await expect(host.getByText(/^Tu elección: /)).toBeVisible();
    await expect(lucia.getByText('lo prefiere')).toHaveCount(0);
    if (choices.Lucía) await choose(lucia, choices.Lucía);
    if (choices.Álvaro) await choose(pageOf(players, 'Álvaro'), choices.Álvaro);
    else await host.getByRole('button', { name: 'Cerrar elecciones' }).click();

    const button = round === 5 ? 'Ver resultado' : 'Siguiente ronda';
    await expect(host.getByRole('button', { name: button })).toBeVisible();
    const outcome = round === 3 ? 'Empate' : 'Gana la mayoría';
    for (const page of Object.values(players)) {
      await expect(page.getByText(outcome, { exact: true })).toBeVisible();
    }
    await host.getByRole('button', { name: button }).click();
  }
  expect(dilemmas.size).toBe(5);

  // Fran 3, Lucía 4 y Álvaro 3: Lucía es quien mejor conoce al grupo.
  for (const page of Object.values(players)) {
    await expect(page.getByText('Quien mejor conoce al grupo')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lucía' })).toBeVisible();
    await expect(page.getByText('4 puntos')).toBeVisible();
    await expect(page.getByText('3 puntos')).toHaveCount(2);
  }
  await expect(lucia.getByRole('status')).toHaveText('Fran decide si se vuelve a jugar');
});
