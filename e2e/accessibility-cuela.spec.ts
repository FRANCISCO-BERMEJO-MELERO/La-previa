import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer } from './players';

const widths = [360, 390, 430];

/** Mentiras de 80 caracteres; una con una palabra larguísima, que tiene que partirse. */
const lies = [
  'Para que los marineros pudieran colgar las redes mojadas sin que se enredaran al',
  'Supercalifragilisticoespialidosamente pensado para afinar guitarras en el puerto',
  'Los panaderos de Toledo lo usaban para marcar cada hogaza con el nombre del amo.',
];

/** Lo que sobresale por la derecha, en píxeles, a cada ancho. */
async function overflowAt(page: Page): Promise<number[]> {
  const result: number[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    result.push(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  return result;
}

/** Botones y campos visibles de menos de 44 px de lado. */
async function smallTargets(page: Page): Promise<(string | null)[]> {
  return page.locator('main button, main input, header button').evaluateAll((elements) =>
    elements
      .map((element) => ({ name: element.textContent, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .filter(({ box }) => box.height < 44 || box.width < 44)
      .map(({ name }) => name),
  );
}

async function expectFits(page: Page): Promise<void> {
  expect(await overflowAt(page)).toEqual([0, 0, 0]);
  expect(await smallTargets(page)).toEqual([]);
  await expect(page.locator('h1')).toHaveCount(1);
}

test('51.2 · Cuela la mentira cabe a 360, 390 y 430 px con mentiras de 80 caracteres', async ({
  browser,
}) => {
  const pages = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  const [host, lucia, alvaro] = pages;
  if (!host || !lucia || !alvaro) throw new Error('Faltan jugadores');
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /Cuela la mentira/ }).click();
  expect(await overflowAt(host)).toEqual([0, 0, 0]);
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  await joinByLink(lucia, code, 'Lucía');
  await joinByLink(alvaro, code, 'Álvaro');
  await expect(host.getByText('3 de 16')).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  // Escribir: el campo, el contador y el botón.
  await expect(host.getByLabel('Tu mentira')).toBeVisible();
  await host.getByLabel('Tu mentira').fill(lies[0] ?? '');
  await expect(host.getByText('80/80')).toBeVisible();
  await expectFits(host);
  await host.getByRole('button', { name: 'Colar mentira' }).click();
  await expectFits(host);
  for (const [index, page] of [lucia, alvaro].entries()) {
    await page.getByLabel('Tu mentira').fill(lies[index + 1] ?? '');
    await page.getByRole('button', { name: 'Colar mentira' }).click();
  }

  // Votar: las opciones largas ocupan varias líneas y se eligen con el teclado.
  await expect(host.getByRole('heading', { name: '¿Cuál es la de verdad?' })).toBeVisible();
  await expectFits(host);
  const option = lucia.getByRole('button', { name: lies[0] ?? '' });
  for (let step = 0; step < 15; step++) {
    if (await option.evaluate((element) => element === document.activeElement)) break;
    await lucia.keyboard.press('Tab');
  }
  await expect(option).toBeFocused();
  expect(await option.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await lucia.keyboard.press('Enter');
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await lucia.getByRole('button', { name: 'Es esta' }).click();

  for (const page of [host, alvaro]) {
    await page.getByRole('list').getByRole('button', { disabled: false }).first().click();
    await page.getByRole('button', { name: 'Es esta' }).click();
  }

  // Revelación con las tres mentiras largas.
  await expect(host.getByText('La verdad', { exact: true })).toBeVisible();
  await expect(host.getByText(`«${lies[1] ?? ''}»`)).toBeVisible();
  expect(await overflowAt(host)).toEqual([0, 0, 0]);
  await expect(host.locator('h1')).toHaveCount(1);
  expect(await smallTargets(host)).toEqual([]);
});
