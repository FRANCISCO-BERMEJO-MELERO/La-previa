import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';

// Nombres de 14 caracteres, el máximo, distintos desde el principio para elegirlos por prefijo.
const names = Array.from(
  { length: 16 },
  (_, index) => `Nombrelargo${String(index + 1).padStart(3, '0')}`,
);

const roleNames: Record<string, string> = {
  Lobo: 'wolf',
  Aldeano: 'villager',
  Vidente: 'seer',
  Protector: 'protector',
  Cazador: 'hunter',
  Bufón: 'jester',
  Cupido: 'cupid',
};

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

async function pick(page: Page, target: string): Promise<void> {
  await page
    .getByRole('button', { name: new RegExp(`^\\S*\\s*${target}`) })
    .first()
    .click();
}

async function act(page: Page, target: string): Promise<void> {
  await pick(page, target);
  const confirm = page.getByRole('button', { name: 'Confirmar' });
  await confirm.click();
  // La acción ha llegado cuando el botón desaparece: ya no hay nada que confirmar.
  await expect(confirm).toBeHidden();
}

async function voteFor(page: Page, target: string): Promise<void> {
  await pick(page, target);
  await page.getByRole('button', { name: `Votar a ${target}` }).click();
}

test('32.2 y 32.3 · Luna llena con 16 jugadores y nombres de 14 a 360, 390 y 430 px', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const players: Players = {};
  for (const name of names) players[name] = await newPlayer(browser);
  const hostName = names[0] ?? '';
  const host = pageOf(players, hostName);
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill(hostName);
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /Luna llena/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText('16 de 16')).toBeVisible();
  await expect(
    host.getByText('3 lobos · vidente · protector · cazador · bufón · Cupido · 8 aldeanos'),
  ).toBeVisible();
  await fits(host, 'sala de espera');
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  const roles: Record<string, string> = {};
  for (const name of names) {
    const page = pageOf(players, name);
    await expect(page.getByText('Eres', { exact: true })).toBeVisible();
    roles[name] =
      roleNames[(await page.getByRole('heading', { level: 1 }).textContent()) ?? ''] ?? '';
  }
  const withRole = (role: string) => names.filter((name) => roles[name] === role);
  const wolves = withRole('wolf');
  const [w1] = wolves;
  const [seer] = withRole('seer');
  const [protector] = withRole('protector');
  const [cupid] = withRole('cupid');
  const [v1, v2, v3, v4, v5] = withRole('villager');
  if (!w1 || !seer || !protector || !cupid || !v1 || !v2 || !v3 || !v4 || !v5) {
    throw new Error('Reparto inesperado');
  }
  await fits(pageOf(players, w1), 'carta del lobo');
  await fits(pageOf(players, v1), 'carta del aldeano');

  // Noche 1.
  await host.getByRole('button', { name: 'Que caiga la noche' }).click();
  const cupidPage = pageOf(players, cupid);
  await pick(cupidPage, v1);
  await pick(cupidPage, v2);
  await cupidPage.getByRole('button', { name: 'Confirmar' }).click();
  for (const wolf of wolves) await act(pageOf(players, wolf), v3);
  await fits(pageOf(players, w1), 'noche del lobo con las marcas de la manada');
  await act(pageOf(players, protector), protector);
  await act(pageOf(players, seer), w1);
  await fits(pageOf(players, seer), 'noche de la vidente');
  const rest = names.filter(
    (name) => !wolves.includes(name) && ![seer, protector, cupid].includes(name),
  );
  await fits(pageOf(players, rest[0] ?? ''), 'noche de quien sospecha');
  for (const name of rest) await act(pageOf(players, name), w1);

  // Amanecer: muere v3.
  const alive = names.filter((name) => name !== v3);
  await expect(host.getByRole('button', { name: 'Continuar' })).toBeVisible();
  await fits(pageOf(players, v1), 'amanecer con el aviso de los enamorados');
  await fits(pageOf(players, v3), 'espectador');
  await host.getByRole('button', { name: 'Continuar' }).click();

  // Alcalde, debate, acusación con muchos votos, defensa y ejecución.
  await expect(
    pageOf(players, v1).getByRole('heading', { name: '¿Quién es el alcalde?' }),
  ).toBeVisible();
  await fits(pageOf(players, v1), 'elección de alcalde');
  for (const name of alive) await voteFor(pageOf(players, name), seer);
  await expect(
    pageOf(players, v1).getByRole('heading', { name: 'Móviles boca abajo' }),
  ).toBeVisible();
  await fits(pageOf(players, v1), 'debate con los votos del alcalde');
  await host.getByRole('button', { name: 'Abrir votación' }).click();
  await expect(
    pageOf(players, v1).getByRole('heading', { name: '¿A quién acusáis?' }),
  ).toBeVisible();
  await fits(pageOf(players, v1), 'acusación');
  for (const name of alive) await voteFor(pageOf(players, name), name === v4 ? v5 : v4);
  await expect(pageOf(players, v1).getByText(`Acusado: ${v4}`)).toBeVisible();
  await fits(pageOf(players, v1), 'defensa con muchos votos');
  await fits(pageOf(players, v4), 'últimas palabras del acusado');
  await host.getByRole('button', { name: 'A la horca' }).click();
  await expect(pageOf(players, v1).getByRole('heading', { name: 'A la horca' })).toBeVisible();
  await fits(pageOf(players, v1), 'ejecución');

  // Los lobos se van de la sala y el pueblo gana.
  for (const wolf of wolves) {
    const page = pageOf(players, wolf);
    await page.getByRole('button', { name: 'Salir de la sala' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  const stayed = names.filter((name) => !wolves.includes(name));
  // Si el anfitrión era lobo, narra quien le sustituye en cuanto le llega la foto nueva.
  const narratorName = async (): Promise<string | null> => {
    for (const name of stayed) {
      const button = pageOf(players, name).getByRole('button', { name: 'Continuar' });
      if (await button.isVisible()) return name;
    }
    return null;
  };
  await expect.poll(narratorName).not.toBeNull();
  const narrator = pageOf(players, (await narratorName()) ?? '');
  await narrator.getByRole('button', { name: 'Continuar' }).click();
  await expect(pageOf(players, v1).getByText('Gana el pueblo').first()).toBeVisible();
  await fits(pageOf(players, v1), 'resultado');
  await fits(narrator, 'resultado del narrador');
});
