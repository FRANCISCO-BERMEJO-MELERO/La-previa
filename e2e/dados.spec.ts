import { expect, test } from '@playwright/test';
import { boardOf, chooseColumn, myDie, placeButtons, roomOf, whoseTurn } from './dados';
import { pageOf, type Players } from './players';

test('40.1 · A dados en 1 contra 1: turnos, ataque, columna llena, recarga y volver a jugar', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const players = await roomOf(browser, ['Fran', 'Lucía']);
  const fran = pageOf(players, 'Fran');
  const lucia = pageOf(players, 'Lucía');
  const rivalOf: Record<string, string> = { Fran: 'Lucía', Lucía: 'Fran' };

  await expect(fran.getByRole('button', { name: '1 contra 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(fran.getByLabel('Equipo A: 1 de 1')).toBeVisible();
  await expect(lucia.getByRole('status')).toHaveText('Fran empezará la partida');
  await fran.getByRole('button', { name: 'Empezar partida' }).click();

  for (const page of [fran, lucia])
    await expect(page.getByText('A dados', { exact: true })).toBeVisible();

  let attacks = 0;
  let sawFullColumn = false;
  let reloaded = false;
  for (let turn = 0; turn < 120; turn++) {
    const name = await whoseTurn(players);
    if (name === null) break;
    const page = pageOf(players, name);
    const other = pageOf(players, rivalOf[name] ?? '');

    // Solo coloca quien tiene el turno; el otro ve el mismo dado esperando.
    await expect(placeButtons(other)).toHaveCount(0);
    const value = await myDie(page);
    await expect(other.getByRole('status')).toHaveText(
      `Le toca a ${name}. Decide dónde va el ${String(value)}.`,
    );

    const mine = await boardOf(page.getByRole('region', { name: 'Tu tablero' }));
    const rival = await boardOf(
      page.getByRole('region', { name: `Tablero de ${rivalOf[name] ?? ''}` }),
    );
    for (const [column, dice] of mine.entries()) {
      if (dice.length === 3) {
        await expect(placeButtons(page).nth(column)).toBeDisabled();
        sawFullColumn = true;
      }
    }

    // Recarga a media partida: vuelven los tableros, el turno y el dado.
    if (!reloaded && turn === 4) {
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Te toca' })).toBeVisible();
      expect(await myDie(page)).toBe(value);
      expect(await boardOf(page.getByRole('region', { name: 'Tu tablero' }))).toEqual(mine);
      reloaded = true;
    }

    const choice = chooseColumn(mine, rival, value);
    await page
      .getByRole('button', { name: `Colocar el dado en la columna ${String(choice.column + 1)}` })
      .click();
    await expect(page.getByRole('heading', { name: 'Te toca' })).toBeHidden();

    // Si esa jugada cierra la partida, ya no hay tableros que mirar.
    await expect(
      other.getByRole('heading', { name: 'Te toca' }).or(other.getByText('Fin de la partida')),
    ).toBeVisible();
    const over = await other.getByText('Fin de la partida').isVisible();
    if (choice.attack && !over) {
      // El ataque se ve en los dos móviles: la columna rival pierde todos los dados de ese valor.
      const expected = (rival[choice.column] ?? []).filter((die) => die !== value);
      await expect
        .poll(
          async () =>
            (
              await boardOf(page.getByRole('region', { name: `Tablero de ${rivalOf[name] ?? ''}` }))
            )[choice.column],
        )
        .toEqual(expected);
      await expect
        .poll(
          async () =>
            (await boardOf(other.getByRole('region', { name: 'Tu tablero' })))[choice.column],
        )
        .toEqual(expected);
      attacks += 1;
    }
  }

  expect(reloaded).toBe(true);
  expect(attacks).toBeGreaterThan(0);
  expect(sawFullColumn).toBe(true);

  // Resultado en los dos móviles, con titular personal y marcador.
  for (const page of [fran, lucia]) {
    await expect(page.getByText('Fin de la partida')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^(Has ganado|Has perdido|Empate)$/,
    );
    await expect(page.getByText(/la mesa: \d+ a \d+\.|^Empate a \d+ puntos\.$/)).toBeVisible();
  }
  await expect(lucia.getByRole('status')).toHaveText(
    'Fran elige si jugáis otra o cambiáis de juego',
  );

  // Volver a jugar: mismos jugadores y tableros vacíos.
  await fran.getByRole('button', { name: 'Volver a jugar' }).click();
  for (const page of [fran, lucia]) {
    await expect(page.getByText('Fin de la partida')).toBeHidden();
    await expect(page.getByRole('region', { name: 'Tu tablero' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tu tablero' }).getByRole('img')).toHaveCount(0);
  }
  expect(await whoseTurn(players)).not.toBeNull();
});

test('40.1 · A dados en 2 contra 2 con un espectador: cada turno, solo coloca quien toca', async ({
  browser,
}) => {
  test.setTimeout(420_000);
  const names = ['Fran', 'Lucía', 'Marta', 'Dani', 'Álvaro'];
  const players = await roomOf(browser, names);
  const host = pageOf(players, 'Fran');
  const alvaro = pageOf(players, 'Álvaro');

  await host.getByRole('button', { name: '2 contra 2' }).click();
  // Por defecto: Fran y Marta en A, Lucía y Dani en B, Álvaro mira.
  await expect(host.getByRole('button', { name: 'Marta juega en el equipo A' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(host.getByRole('button', { name: 'Álvaro mira' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Si los equipos no cuadran, no se puede empezar.
  await host.getByRole('button', { name: 'Dani mira' }).click();
  await expect(
    host.getByText('En 2 contra 2 van dos personas en cada equipo. El resto mira.'),
  ).toBeVisible();
  await expect(host.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();
  await host.getByRole('button', { name: 'Dani juega en el equipo B' }).click();
  await expect(host.getByLabel('Equipo B: 2 de 2')).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  const team: Record<string, 'A' | 'B'> = { Fran: 'A', Marta: 'A', Lucía: 'B', Dani: 'B' };
  const gamers = Object.keys(team);
  const playing: Players = Object.fromEntries(gamers.map((name) => [name, pageOf(players, name)]));
  for (const page of Object.values(players)) {
    await expect(page.getByText('A dados · 2 contra 2')).toBeVisible();
  }

  const sequence: string[] = [];
  for (let turn = 0; turn < 160; turn++) {
    const name = await whoseTurn(playing);
    if (name === null) break;
    const page = pageOf(players, name);

    // Nadie más tiene botones: ni el compañero, ni el otro equipo, ni quien mira.
    for (const other of names.filter((n) => n !== name)) {
      await expect(placeButtons(pageOf(players, other))).toHaveCount(0);
    }
    await expect(alvaro.getByRole('status')).toContainText(`Le toca a ${name}`);
    await expect(
      alvaro.getByRole('list', { name: 'Orden de turnos' }).getByText(name),
    ).toHaveAttribute('aria-current', 'step');

    const value = await myDie(page);
    const rivalSide = team[name] === 'A' ? 'B' : 'A';
    const mine = await boardOf(page.getByRole('region', { name: 'Tablero de tu equipo' }));
    const rival = await boardOf(
      page.getByRole('region', { name: `Tablero del equipo ${rivalSide}` }),
    );
    const choice = chooseColumn(mine, rival, value);
    await page
      .getByRole('button', { name: `Colocar el dado en la columna ${String(choice.column + 1)}` })
      .click();
    await expect(page.getByRole('heading', { name: 'Te toca' })).toBeHidden();
    sequence.push(name);
  }

  // Alternan los equipos, nadie repite y el orden de cuatro se mantiene toda la partida.
  expect(sequence.length).toBeGreaterThanOrEqual(9);
  for (const [index, name] of sequence.entries()) {
    const previous = sequence[index - 1];
    if (previous) expect(team[name]).not.toBe(team[previous]);
    const cycle = sequence[index - 4];
    if (cycle) expect(name).toBe(cycle);
  }
  expect(new Set(sequence.slice(0, 4)).size).toBe(4);

  for (const page of Object.values(players))
    await expect(page.getByText('Fin de la partida')).toBeVisible();
  await expect(alvaro.getByRole('heading', { level: 1 })).toHaveText(
    /^(Gana el equipo A|Gana el equipo B|Empate)$/,
  );
  await expect(pageOf(players, 'Marta').getByRole('heading', { level: 1 })).toHaveText(
    /^(Habéis ganado|Habéis perdido|Empate)$/,
  );
});

test('46.1 · A dados: recargar justo después de un ataque pinta la mesa quieta', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const players = await roomOf(browser, ['Fran', 'Lucía']);
  const rivalOf: Record<string, string> = { Fran: 'Lucía', Lucía: 'Fran' };
  await pageOf(players, 'Fran').getByRole('button', { name: 'Empezar partida' }).click();

  for (let turn = 0; turn < 120; turn++) {
    const name = await whoseTurn(players);
    if (name === null) break;
    const page = pageOf(players, name);
    const other = pageOf(players, rivalOf[name] ?? '');
    const value = await myDie(page);
    const mine = await boardOf(page.getByRole('region', { name: 'Tu tablero' }));
    const rival = await boardOf(
      page.getByRole('region', { name: `Tablero de ${rivalOf[name] ?? ''}` }),
    );
    const choice = chooseColumn(mine, rival, value);
    await page
      .getByRole('button', { name: `Colocar el dado en la columna ${String(choice.column + 1)}` })
      .click();
    await expect(
      other.getByRole('heading', { name: 'Te toca' }).or(other.getByText('Fin de la partida')),
    ).toBeVisible();
    if (!choice.attack || (await other.getByText('Fin de la partida').isVisible())) continue;

    // Quien recibe el ataque ve reventar sus dados; recargado, la mesa está quieta y al día.
    await expect(other.getByTestId('popped')).toBeAttached();
    const board = await boardOf(other.getByRole('region', { name: 'Tu tablero' }));
    await other.reload();
    await expect(other.getByRole('heading', { name: 'Te toca' })).toBeVisible();
    expect(await boardOf(other.getByRole('region', { name: 'Tu tablero' }))).toEqual(board);
    await expect(other.getByTestId('popped')).toHaveCount(0);
    await expect(other.locator('[class*="animate-"]')).toHaveCount(0);
    return;
  }
  throw new Error('La partida acabó sin ningún ataque');
});
