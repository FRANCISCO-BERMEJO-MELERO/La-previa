import { expect, test, type Page } from '@playwright/test';
import { boardOf, chooseColumn, myDie, roomOf, whoseTurn } from './dados';
import { pageOf, type Players } from './players';

// Nombres de 14 caracteres, el máximo.
const names = Array.from(
  { length: 6 },
  (_, index) => `Nombrelargo${String(index + 1).padStart(3, '0')}`,
);

/** Nombres de los botones visibles que miden menos de 44 px de lado. */
async function smallTargets(page: Page): Promise<(string | null)[]> {
  return page.locator('main button, main a, main input, header button').evaluateAll((elements) =>
    elements
      .map((element) => ({
        name: element.getAttribute('aria-label') ?? element.textContent,
        box: element.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .filter(({ box }) => box.height < 44 || box.width < 44)
      .map(({ name }) => name),
  );
}

/** A 360, 390 y 430 px: nada desborda, todo se puede tocar y hay un solo titular. */
async function fits(page: Page, label: string): Promise<void> {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${label} a ${String(width)} px desborda`).toBeLessThanOrEqual(0);
    expect(await smallTargets(page), `${label} a ${String(width)} px`).toEqual([]);
    await expect(page.locator('h1'), label).toHaveCount(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test('40.2 · A dados en 2 contra 2 con nombres de 14 a 360, 390 y 430 px', async ({ browser }) => {
  test.setTimeout(300_000);
  const players = await roomOf(browser, names);
  const host = pageOf(players, names[0] ?? '');
  const spectator = pageOf(players, names[5] ?? '');

  await host.getByRole('button', { name: '2 contra 2' }).click();
  await fits(host, 'sala de espera con seis');
  await host.getByRole('button', { name: `${names[3] ?? ''} mira` }).click();
  await fits(host, 'sala de espera con el aviso de equipos');
  await host.getByRole('button', { name: `${names[3] ?? ''} juega en el equipo B` }).click();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  const team: Record<string, 'A' | 'B'> = {
    [names[0] ?? '']: 'A',
    [names[1] ?? '']: 'B',
    [names[2] ?? '']: 'A',
    [names[3] ?? '']: 'B',
  };
  const playing: Players = Object.fromEntries(
    Object.keys(team).map((name) => [name, pageOf(players, name)]),
  );

  let checked = false;
  for (let turn = 0; turn < 160; turn++) {
    const name = await whoseTurn(playing);
    if (name === null) break;
    const page = pageOf(players, name);
    // Se mira a media partida, con dados en los dos tableros.
    if (!checked && turn === 6) {
      await fits(page, 'partida, te toca');
      const waiting = Object.keys(team).find((other) => other !== name) ?? '';
      await fits(pageOf(players, waiting), 'partida, esperando con el orden de turnos');
      await fits(spectator, 'partida, mirando');
      checked = true;
    }
    const rivalSide = team[name] === 'A' ? 'B' : 'A';
    const mine = await boardOf(page.getByRole('region', { name: 'Tablero de tu equipo' }));
    const rival = await boardOf(
      page.getByRole('region', { name: `Tablero del equipo ${rivalSide}` }),
    );
    const choice = chooseColumn(mine, rival, await myDie(page));
    await page
      .getByRole('button', { name: `Colocar el dado en la columna ${String(choice.column + 1)}` })
      .click();
    await expect(page.getByRole('heading', { name: 'Te toca' })).toBeHidden();
  }
  expect(checked).toBe(true);

  await expect(host.getByText('Fin de la partida')).toBeVisible();
  await fits(host, 'resultado del anfitrión');
  await fits(spectator, 'resultado de quien mira');
});
