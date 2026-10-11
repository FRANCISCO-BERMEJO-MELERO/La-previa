import { expect, test, type Browser, type Page } from '@playwright/test';
import { joinByLink, newPlayer } from './players';

/** Nombres de los botones, enlaces y campos visibles que miden menos de 44 px de lado. */
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

/** Objetivos táctiles de 44 px o más y un solo encabezado principal en la pantalla. */
async function expectTouchable(page: Page): Promise<void> {
  expect(await smallTargets(page)).toEqual([]);
  await expect(page.locator('h1')).toHaveCount(1);
}

/** Pulsa Tab hasta que el elemento tenga el foco, como haría alguien sin ratón. */
async function tabTo(page: Page, target: ReturnType<Page['getByRole']>, maxSteps = 12) {
  for (let step = 0; step < maxSteps; step++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

/** Sala de 3 con el juego elegido y 5 rondas, ya empezada. Devuelve el anfitrión y los demás. */
async function startedRoom(browser: Browser, game: RegExp): Promise<Page[]> {
  const pages = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  const [host, ...rest] = pages;
  if (!host) throw new Error('Sin anfitrión');
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: game }).click();
  await expectTouchable(host);
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const [index, page] of rest.entries()) {
    await joinByLink(page, code, ['Lucía', 'Álvaro'][index] ?? '');
  }
  await expect(host.getByText('3 de 16')).toBeVisible();

  // El selector de rondas se usa con el teclado y su foco se ve.
  const five = host.getByRole('button', { name: '5 rondas', exact: true });
  await tabTo(host, five, 20);
  expect(await five.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await host.keyboard.press('Enter');
  await expect(five).toHaveAttribute('aria-pressed', 'true');
  await expectTouchable(host);
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  return pages;
}

test.describe('12.5 · accesibilidad de los juegos nuevos', () => {
  test('¿Quién es más probable que…?: objetivos táctiles en votar, esperar y recuento', async ({
    browser,
  }) => {
    const pages = await startedRoom(browser, /más probable/);
    const [host, lucia, alvaro] = pages;
    if (!host || !lucia || !alvaro) throw new Error('Faltan jugadores');
    await expect(host.getByText('¿Quién es más probable que…')).toBeVisible();
    await expectTouchable(host);
    for (const page of [host, lucia]) {
      await page.getByRole('button', { name: /^Lucía/ }).click();
      await page.getByRole('button', { name: 'Votar a Lucía' }).click();
    }
    await expect(host.getByText('Han votado')).toBeVisible();
    await expectTouchable(host);
    await alvaro.getByRole('button', { name: /^Lucía/ }).click();
    await alvaro.getByRole('button', { name: 'Votar a Lucía' }).click();
    await expect(host.getByRole('button', { name: 'Siguiente ronda' })).toBeVisible();
    await expectTouchable(host);
  });

  test('¿Quién lo dijo?: la respuesta se escribe y envía con el teclado', async ({ browser }) => {
    const pages = await startedRoom(browser, /¿Quién lo dijo\?/);
    const [host, ...rest] = pages;
    if (!host) throw new Error('Sin anfitrión');
    const field = host.getByLabel('Tu respuesta');
    await expect(field).toBeVisible();
    await expectTouchable(host);
    await tabTo(host, field);
    await host.keyboard.type('Volar');
    await host.keyboard.press('Enter');
    await expect(host.getByText('Tu respuesta: Volar')).toBeVisible();
    await expectTouchable(host);
    for (const page of rest) {
      await page.getByLabel('Tu respuesta').fill('Ser invisible');
      await page.getByRole('button', { name: 'Enviar respuesta' }).click();
    }
    for (const page of pages) {
      await expect(page.getByText(/^(Es la tuya|Elige a quién votar)$/)).toBeVisible();
      await expectTouchable(page);
    }
  });

  test('Una sola pista: pista con el teclado, revisión y marcar con objetivos táctiles', async ({
    browser,
  }) => {
    const pages = await startedRoom(browser, /Una sola pista/);
    const [host, lucia, alvaro] = pages;
    if (!host || !lucia || !alvaro) throw new Error('Faltan jugadores');
    // Adivina Fran; arbitra Lucía.
    await expect(host.getByRole('heading', { name: 'Te toca adivinar' })).toBeVisible();
    await expectTouchable(host);
    const field = lucia.getByLabel('Tu pista');
    await expect(field).toBeVisible();
    await expectTouchable(lucia);
    await tabTo(lucia, field);
    await lucia.keyboard.type('Kiwiq');
    await lucia.keyboard.press('Enter');
    await expect(lucia.getByText('Tu pista: Kiwiq')).toBeVisible();
    await alvaro.getByLabel('Tu pista').fill('Brumaq');
    await alvaro.getByRole('button', { name: 'Enviar pista' }).click();

    await expect(lucia.getByRole('heading', { name: 'Revisad las pistas' })).toBeVisible();
    await expectTouchable(lucia);
    const toggle = lucia.getByRole('button', { name: 'Anular la pista de Álvaro: Brumaq' });
    await tabTo(lucia, toggle);
    await lucia.keyboard.press('Enter');
    await expect(
      lucia.getByRole('button', { name: 'Recuperar la pista de Álvaro: Brumaq' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await lucia.getByRole('button', { name: 'Enseñar pistas' }).click();
    await expect(lucia.getByRole('button', { name: 'Acertada' })).toBeVisible();
    await expectTouchable(lucia);
    await expectTouchable(host);
  });

  test('¿Qué prefieres?: se elige con el teclado y las pantallas se pueden tocar', async ({
    browser,
  }) => {
    const pages = await startedRoom(browser, /¿Qué prefieres\?/);
    const [host, ...rest] = pages;
    if (!host) throw new Error('Sin anfitrión');
    await expect(host.getByRole('heading', { name: '¿Qué prefieres?' })).toBeVisible();
    await expectTouchable(host);
    const optionB = host.getByRole('button', { name: /^Opción B: / });
    await tabTo(host, optionB);
    expect(await optionB.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      'solid',
    );
    await host.keyboard.press('Enter');
    await expect(optionB).toHaveAttribute('aria-pressed', 'true');
    await tabTo(host, host.getByRole('button', { name: 'Elegir la B' }));
    await host.keyboard.press('Enter');
    await expect(host.getByText('Han elegido')).toBeVisible();
    await expectTouchable(host);
    for (const page of rest) {
      await page.getByRole('button', { name: /^Opción A: / }).click();
      await page.getByRole('button', { name: 'Elegir la A' }).click();
    }
    for (const page of pages) {
      await expect(page.getByText('Gana la mayoría')).toBeVisible();
      await expectTouchable(page);
    }
  });

  test('Palabras prohibidas: se marca el acierto con el teclado y las pantallas se pueden tocar', async ({
    browser,
  }) => {
    const pages = await startedRoom(browser, /Palabras prohibidas/);
    const [host, lucia, alvaro] = pages;
    if (!host || !lucia || !alvaro) throw new Error('Faltan jugadores');
    // Describe Fran, vigila Lucía y adivina Álvaro.
    await expect(host.getByText('Describes tú')).toBeVisible();
    await expectTouchable(host);
    await expect(lucia.getByRole('button', { name: '¡Prohibida!' })).toBeVisible();
    await expectTouchable(lucia);
    await expect(alvaro.getByRole('heading', { name: 'Adivina en voz alta' })).toBeVisible();
    await expectTouchable(alvaro);

    const guesser = host.getByRole('button', { name: /^Álvaro/ });
    await tabTo(host, guesser);
    await host.keyboard.press('Enter');
    await expect(guesser).toHaveAttribute('aria-pressed', 'true');
    await tabTo(host, host.getByRole('button', { name: 'Ha acertado Álvaro' }));
    await host.keyboard.press('Enter');
    for (const page of pages) {
      await expect(page.getByText('Lo acierta Álvaro')).toBeVisible();
      await expectTouchable(page);
    }
  });
});
