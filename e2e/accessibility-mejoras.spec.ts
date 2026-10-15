import { expect, test, type Page } from '@playwright/test';

/** Nombres de lo pulsable visible que mide menos de 44 px de lado, dentro de `scope`. */
async function smallTargets(page: Page, scope: string): Promise<(string | null)[]> {
  return page.locator(`${scope} button, ${scope} a, ${scope} input`).evaluateAll((elements) =>
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

async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

async function check(page: Page, scope: string): Promise<void> {
  expect(await smallTargets(page, scope)).toEqual([]);
  expect(await noHorizontalScroll(page)).toBe(true);
}

for (const width of [360, 390, 430]) {
  test(`26.1 · lo nuevo a ${String(width)} px: sin desbordes y con objetivos de 44 px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Escanear QR' })).toBeVisible();
    await check(page, 'main');

    await page.getByRole('button', { name: 'Crear sala' }).click();
    await page.getByLabel('Tu nombre').fill('Mmmmmmmmmmmm01');
    await page.getByRole('button', { name: 'Nube enfadada' }).click();
    await check(page, 'main');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('button', { name: 'Abrir la sala' }).click();
    await expect(page.getByRole('button', { name: 'Salir de la sala' })).toBeVisible();
    await check(page, 'main, header');

    // Los tres diálogos de la sala de espera.
    await page.getByRole('button', { name: 'Elegir temáticas' }).click();
    await check(page, 'dialog[open]');
    await page.getByRole('button', { name: 'Listo' }).click();

    await page.getByRole('button', { name: 'Cambiar tu avatar' }).click();
    await check(page, 'dialog[open]');
    await page.getByRole('button', { name: 'Listo' }).click();

    await page.getByRole('button', { name: 'Cómo se juega' }).click();
    await check(page, 'dialog[open]');
  });
}

test('26.1 · el tutorial se recorre y se cierra solo con el teclado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear sala' }).click();
  await page.getByLabel('Tu nombre').fill('Fran');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Abrir la sala' }).click();
  await page.getByRole('button', { name: 'Cómo se juega' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  const next = page.getByRole('button', { name: 'Siguiente' });
  await next.focus();
  expect(await next.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Paso 2 de 3')).toBeHidden();
});
