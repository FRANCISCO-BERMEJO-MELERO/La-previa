import { expect, test, type Locator, type Page } from '@playwright/test';

/** Pulsa Tab hasta que el elemento tenga el foco, como haría alguien sin ratón. */
async function tabTo(page: Page, target: Locator, maxSteps = 6): Promise<void> {
  for (let step = 0; step < maxSteps; step++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test.describe('7.1 · accesibilidad', () => {
  test('se puede crear una sala solo con el teclado y el foco se ve', async ({ page }) => {
    await page.goto('/');

    await tabTo(page, page.getByLabel('Código de la sala'));
    const create = page.getByRole('button', { name: 'Crear sala' });
    await tabTo(page, create);
    expect(await create.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      'solid',
    );

    await page.keyboard.press('Enter');
    await tabTo(page, page.getByLabel('Tu nombre'));
    await page.keyboard.type('Fran');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: '¿A qué jugamos?' })).toBeVisible();
    await tabTo(page, page.getByRole('button', { name: 'Abrir la sala' }));
    await page.keyboard.press('Enter');
    await expect(page.getByText('Código de la sala')).toBeVisible();

    // Los diálogos se abren y se cierran con el teclado.
    await tabTo(page, page.getByRole('button', { name: 'Mostrar QR' }), 10);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Escanea para entrar' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('los objetivos táctiles visibles miden al menos 44 px', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Crear sala' }).click();
    await page.getByLabel('Tu nombre').fill('Fran');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('button', { name: 'Abrir la sala' }).click();
    await expect(page.getByText('Código de la sala')).toBeVisible();

    const small = await page
      .locator('main button, main a, main input, header button')
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            name: element.getAttribute('aria-label') ?? element.textContent,
            box: element.getBoundingClientRect(),
          }))
          // Los botones de diálogos cerrados no se ven ni se pueden tocar.
          .filter(({ box }) => box.width > 0 && box.height > 0)
          .filter(({ box }) => box.height < 44 || box.width < 44)
          .map(({ name }) => name),
      );
    expect(small).toEqual([]);
  });

  test('con movimiento reducido los botones no se animan', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const transition = await page
      .getByRole('button', { name: 'Crear sala' })
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(transition).toBe('0s');
  });
});
