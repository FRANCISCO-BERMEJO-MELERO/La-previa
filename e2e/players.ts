import { expect, type Browser, type Page } from '@playwright/test';

/** Un jugador es una página en su propio contexto: su propia sesión anónima, como un móvil. */
export async function newPlayer(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

/** Crea la sala, abre El impostor y devuelve el código. */
export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear sala' }).click();
  await page.getByLabel('Tu nombre').fill(name);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Abrir la sala' }).click();
  await expect(page.getByText('Código de la sala')).toBeVisible();
  const code = /\/sala\/([A-Z]{4})/.exec(page.url())?.[1];
  if (!code) throw new Error(`La URL no tiene código de sala: ${page.url()}`);
  return code;
}

export async function joinByCode(page: Page, code: string, name: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Código de la sala').fill(code);
  await page.getByRole('button', { name: 'Unirse' }).click();
  await page.getByLabel('Tu nombre').fill(name);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export async function joinByLink(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/sala/${code}`);
  await page.getByLabel('Tu nombre').fill(name);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export type Players = Record<string, Page>;

/** Rol de cada jugador, leído de su pantalla de reparto. */
export async function rolesOf(players: Players): Promise<Record<string, 'player' | 'impostor'>> {
  const roles: Record<string, 'player' | 'impostor'> = {};
  for (const [name, page] of Object.entries(players)) {
    await expect(page.getByText(/^(Tu palabra|Eres el)$/)).toBeVisible();
    roles[name] = (await page.getByText('Eres el').count()) > 0 ? 'impostor' : 'player';
  }
  return roles;
}

export function impostorOf(roles: Record<string, 'player' | 'impostor'>): string {
  const name = Object.keys(roles).find((player) => roles[player] === 'impostor');
  if (!name) throw new Error('No hay impostor');
  return name;
}

/** La palabra tal cual está en el DOM (la pantalla la muestra en mayúsculas por CSS). */
export async function secretWord(page: Page): Promise<string> {
  await expect(page.getByText('Tu palabra')).toBeVisible();
  const word = await page.locator('main p.font-display').first().textContent();
  if (!word) throw new Error('No se ve la palabra');
  return word;
}

/** Vota desde la pantalla 08 y espera a la 09. */
export async function vote(page: Page, target: string): Promise<void> {
  await expect(page.getByRole('heading', { name: '¿Quién es el impostor?' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${target}`) }).click();
  await page.getByRole('button', { name: `Votar a ${target}` }).click();
  await expect(page.getByText('Votos recibidos')).toBeVisible();
}
