import { expect, test, type Browser, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';

const six = ['Fran', 'Lucía', 'Álvaro', 'Marta', 'Dani', 'Paula'];

const roleNames = {
  Lobo: 'wolf',
  Aldeano: 'villager',
  Vidente: 'seer',
  Protector: 'protector',
  Cazador: 'hunter',
  Bufón: 'jester',
  Cupido: 'cupid',
} as const;

type Role = (typeof roleNames)[keyof typeof roleNames];

function isRoleName(text: string): text is keyof typeof roleNames {
  return text in roleNames;
}

/** Sala de Luna llena con estos jugadores; el primero es el anfitrión y narrador. */
async function lunaRoom(browser: Browser, names: readonly string[]) {
  const players: Players = {};
  for (const name of names) players[name] = await newPlayer(browser);
  const host = pageOf(players, names[0] ?? '');
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill(names[0] ?? '');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /Luna llena/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText(`${String(names.length)} de 16`)).toBeVisible();
  return { players, host, code };
}

/** El rol de cada uno, leído de su carta en el reparto. */
async function rolesOf(players: Players): Promise<Record<string, Role>> {
  const roles: Record<string, Role> = {};
  for (const [name, page] of Object.entries(players)) {
    await expect(page.getByText('Eres', { exact: true })).toBeVisible();
    const text = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
    if (!isRoleName(text)) throw new Error(`Rol desconocido para ${name}: ${text}`);
    roles[name] = roleNames[text];
  }
  return roles;
}

function withRole(roles: Record<string, Role>, role: Role): string[] {
  return Object.keys(roles).filter((name) => roles[name] === role);
}

/** Elige a alguien en la lista de la noche y confirma. */
async function act(page: Page, target: string): Promise<void> {
  await page
    .getByRole('button', { name: new RegExp(`^\\S*\\s*${target}`) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
}

test('30 · seis jugadores: reparto, una noche y el amanecer', async ({ browser }) => {
  const { players, host } = await lunaRoom(browser, six);
  await expect(host.getByText('1 lobo · vidente · 4 aldeanos')).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  const roles = await rolesOf(players);
  const [wolf] = withRole(roles, 'wolf');
  const [seer] = withRole(roles, 'seer');
  if (!wolf || !seer) throw new Error('Falta el lobo o la vidente');
  expect(withRole(roles, 'villager')).toHaveLength(4);
  await expect(host.getByText('Bienvenidos al pueblo.', { exact: false })).toBeVisible();
  await expect(
    pageOf(players, 'Lucía').getByText('El narrador dará paso a la noche'),
  ).toBeVisible();

  await host.getByRole('button', { name: 'Que caiga la noche' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('Noche 1')).toBeVisible();
  }

  // El lobo devora a la vidente; la vidente mira al lobo; los demás sospechan del lobo.
  await act(pageOf(players, wolf), seer);
  await act(pageOf(players, seer), wolf);
  await expect(pageOf(players, seer).getByText(`Noche 1 · ${wolf}: es lobo`)).toBeVisible();
  const others = six.filter((name) => name !== wolf && name !== seer);
  for (const name of others) {
    await act(pageOf(players, name), name === others[0] ? (others[1] ?? '') : (others[0] ?? ''));
  }

  // La vidente ya está muerta y pasa a verlo todo como espectadora.
  for (const name of six.filter((player) => player !== seer)) {
    const page = pageOf(players, name);
    await expect(page.getByText('Amanece', { exact: true })).toBeVisible();
    await expect(page.getByText('Devorado por los lobos')).toBeVisible();
    await expect(page.getByText(seer, { exact: true }).first()).toBeVisible();
  }
  await expect(host.getByText(`Amanece. ${seer} no ha despertado. Era vidente.`)).toBeVisible();
});
