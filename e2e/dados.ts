import { expect, type Browser, type Locator, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';

// Los dados los tira el servidor de verdad: cada turno se lee el dado y se elige columna. Si el
// dado coincide con alguno del rival en una columna con hueco, se ataca ahí.

export type Board = number[][];

/** Los dados de un tablero, por columnas y en orden de colocación. */
export async function boardOf(region: Locator): Promise<Board> {
  return region.evaluate((element) =>
    Array.from(element.children).map((column) =>
      Array.from(column.querySelectorAll('[role="img"]')).map((die) =>
        Number((die.getAttribute('aria-label') ?? '').replace(/\D/g, '')),
      ),
    ),
  );
}

export const placeButtons = (page: Page) => page.getByRole('button', { name: /^Colocar el dado/ });

/** El dado que le ha salido a quien tiene el turno. */
export async function myDie(page: Page): Promise<number> {
  const text = await page.getByText(/^Te ha salido un \d\./).textContent();
  return Number(/(\d)/.exec(text ?? '')?.[1]);
}

export type Placement = { column: number; value: number; attack: boolean };

/**
 * Elige columna: ataca si puede; si no, la primera con hueco en la que el rival también tenga
 * hueco, para que pueda atacar. Colocar sin más en la primera libre deja un 1,5 % de partidas
 * sin ningún ataque; así queda en un 0,07 % (DECISIONES 40).
 */
export function chooseColumn(mine: Board, rival: Board, value: number): Placement {
  const free = [0, 1, 2].filter((column) => (mine[column]?.length ?? 3) < 3);
  const attack = free.find((column) => rival[column]?.includes(value));
  if (attack !== undefined) return { column: attack, value, attack: true };
  const first = free.find((column) => (rival[column]?.length ?? 3) < 3) ?? free[0];
  if (first === undefined) throw new Error('No queda ninguna columna con hueco');
  return { column: first, value, attack: false };
}

/** Quién tiene ahora la pantalla "Te toca"; null si la partida ha terminado. */
export async function whoseTurn(players: Players): Promise<string | null> {
  await expect
    .poll(async () => {
      for (const [name, page] of Object.entries(players)) {
        if (await page.getByText('Fin de la partida').isVisible()) return 'fin';
        if (await page.getByRole('heading', { name: 'Te toca' }).isVisible()) return name;
      }
      return '';
    })
    .not.toBe('');
  for (const [name, page] of Object.entries(players)) {
    if (await page.getByRole('heading', { name: 'Te toca' }).isVisible()) return name;
  }
  return null;
}

export async function createDadosRoom(host: Page, name: string): Promise<string> {
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill(name);
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /A dados/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  await expect(host.getByText('Código de la sala')).toBeVisible();
  return /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
}

export async function roomOf(browser: Browser, names: string[]): Promise<Players> {
  const players: Players = {};
  for (const name of names) players[name] = await newPlayer(browser);
  const [hostName, ...rest] = names;
  const code = await createDadosRoom(pageOf(players, hostName ?? ''), hostName ?? '');
  for (const name of rest) await joinByLink(pageOf(players, name), code, name);
  await expect(
    pageOf(players, hostName ?? '').getByText(`${String(names.length)} de 16`),
  ).toBeVisible();
  return players;
}
