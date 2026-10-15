import { expect, test, type Browser, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';
import { recordTraffic } from './traffic';

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
  await host.getByRole('button', { name: /El lobo/ }).click();
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
  const confirm = page.getByRole('button', { name: 'Confirmar' });
  await confirm.click();
  // La acción ha llegado cuando el botón desaparece: ya no hay nada que confirmar.
  await expect(confirm).toBeHidden();
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

/** Toca a alguien en una lista para elegir. */
async function pick(page: Page, target: string): Promise<void> {
  await page
    .getByRole('button', { name: new RegExp(`^\\S*\\s*${target}`) })
    .first()
    .click();
}

async function voteFor(page: Page, target: string): Promise<void> {
  await pick(page, target);
  await page.getByRole('button', { name: `Votar a ${target}` }).click();
}

async function narrate(host: Page, label: string): Promise<void> {
  await host.getByRole('button', { name: label }).click();
}

/** Espera a que todos los de la lista vean el texto. */
async function allSee(players: Players, names: readonly string[], text: string | RegExp) {
  for (const name of names) {
    await expect(pageOf(players, name).getByText(text).first()).toBeVisible();
  }
}

/** Un día entero: todos eligen alcalde y acusan a quien se diga, que sube a la horca. */
async function hang(
  players: Players,
  host: Page,
  alive: readonly string[],
  mayor: string,
  accused: string,
): Promise<void> {
  await allSee(players, alive, '¿Quién es el alcalde?');
  for (const name of alive) await voteFor(pageOf(players, name), mayor);
  await allSee(players, alive, 'Móviles boca abajo');
  await narrate(host, 'Abrir votación');
  for (const name of alive) {
    const target = name === accused ? (alive.find((other) => other !== accused) ?? '') : accused;
    await voteFor(pageOf(players, name), target);
  }
  await allSee(players, alive, `Acusado: ${accused}`);
  // Sin segunda votación: tras sus últimas palabras, el narrador lo ahorca.
  await narrate(host, 'A la horca');
  await allSee(
    players,
    alive.filter((other) => other !== accused),
    'A la horca',
  );
}

test('31.7 · partida completa con la composición recomendada para 6', async ({ browser }) => {
  const { players, host } = await lunaRoom(browser, six);
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  const roles = await rolesOf(players);
  const [wolf] = withRole(roles, 'wolf');
  const [seer] = withRole(roles, 'seer');
  const villagers = withRole(roles, 'villager');
  const [victim, ...rest] = villagers;
  if (!wolf || !seer || !victim) throw new Error('Reparto inesperado');

  await narrate(host, 'Que caiga la noche');
  await allSee(players, six, 'Noche 1');
  await act(pageOf(players, wolf), victim);
  await act(pageOf(players, seer), wolf);
  for (const name of villagers) await act(pageOf(players, name), wolf);

  const alive = six.filter((name) => name !== victim);
  await allSee(players, alive, 'Amanece');
  await narrate(host, 'Continuar');
  await hang(players, host, alive, seer, wolf);
  await narrate(host, 'Continuar');

  for (const name of [seer, ...rest]) {
    await expect(
      pageOf(players, name).getByRole('heading', { name: '¡Has ganado!' }),
    ).toBeVisible();
  }
  await expect(pageOf(players, wolf).getByRole('heading', { name: 'Has perdido' })).toBeVisible();
  await expect(host.getByText('Gana el pueblo').first()).toBeVisible();
  await expect(host.getByRole('button', { name: 'Volver a jugar' })).toBeVisible();
});

test('31.7 · nueve jugadores con todos los roles opcionales, hasta el final', async ({
  browser,
}) => {
  const nine = [...six, 'Sergio', 'Nuria', 'Iker'];
  const { players, host } = await lunaRoom(browser, nine);
  await host.getByRole('button', { name: /Bufón/ }).click();
  await host.getByRole('button', { name: /Cupido/ }).click();
  await expect(
    host.getByText('2 lobos · vidente · protector · cazador · bufón · Cupido · 2 aldeanos'),
  ).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  const roles = await rolesOf(players);
  const [w1, w2] = withRole(roles, 'wolf');
  const [seer] = withRole(roles, 'seer');
  const [protector] = withRole(roles, 'protector');
  const [hunter] = withRole(roles, 'hunter');
  const [jester] = withRole(roles, 'jester');
  const [cupid] = withRole(roles, 'cupid');
  const [v1, v2] = withRole(roles, 'villager');
  if (!w1 || !w2 || !seer || !protector || !hunter || !jester || !cupid || !v1 || !v2) {
    throw new Error('Reparto inesperado');
  }

  // Noche 1: Cupido enamora a los aldeanos; los lobos devoran al cazador.
  await narrate(host, 'Que caiga la noche');
  const cupidPage = pageOf(players, cupid);
  await pick(cupidPage, v1);
  await pick(cupidPage, v2);
  await cupidPage.getByRole('button', { name: 'Confirmar' }).click();
  await act(pageOf(players, w1), hunter);
  await act(pageOf(players, w2), hunter);
  await act(pageOf(players, protector), protector);
  await act(pageOf(players, seer), w1);
  for (const name of [hunter, jester, v1, v2]) await act(pageOf(players, name), w1);

  await expect(
    pageOf(players, v1).getByText(`Estás enamorado de ${v2}`, { exact: false }),
  ).toBeVisible();
  await narrate(host, 'Continuar');

  // El cazador muerto se lleva a un lobo.
  const hunterPage = pageOf(players, hunter);
  await expect(hunterPage.getByRole('heading', { name: 'Dispara antes de caer' })).toBeVisible();
  await pick(hunterPage, w1);
  await hunterPage.getByRole('button', { name: `Disparar a ${w1}` }).click();
  await expect(host.getByText(`El cazador dispara. ${w1} cae con él. Era lobo.`)).toBeVisible();
  await narrate(host, 'Continuar');

  // Día 1: el pueblo ahorca al último lobo.
  const alive = nine.filter((name) => name !== hunter && name !== w1);
  await hang(players, host, alive, seer, w2);
  await narrate(host, 'Continuar');

  await allSee(players, nine, 'Gana el pueblo');
  await expect(pageOf(players, jester).getByRole('heading', { name: 'Has perdido' })).toBeVisible();
  await expect(pageOf(players, cupid).getByRole('heading', { name: '¡Has ganado!' })).toBeVisible();
  await expect(host.getByText(`Los enamorados eran ${v1} y ${v2}`)).toBeVisible();
});

test('31.7 · quien recarga de noche conserva su rol y su acción', async ({ browser }) => {
  const { players, host } = await lunaRoom(browser, six);
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  const roles = await rolesOf(players);
  const [villager] = withRole(roles, 'villager');
  const [wolf] = withRole(roles, 'wolf');
  if (!villager || !wolf) throw new Error('Reparto inesperado');
  await narrate(host, 'Que caiga la noche');

  const page = pageOf(players, villager);
  await act(page, wolf);
  await expect(page.getByText(`Sospechas de ${wolf}`)).toBeVisible();
  await page.reload();
  await expect(page.getByText('Noche 1')).toBeVisible();
  await expect(page.getByText(`Sospechas de ${wolf}`)).toBeVisible();
  await page.getByRole('button', { name: 'Mantén para ver tu carta' }).dispatchEvent('pointerdown');
  await expect(page.getByRole('heading', { name: 'Aldeano' })).toBeVisible();
  await page.getByRole('button', { name: 'Suelta para ocultarla' }).dispatchEvent('pointerup');
  await expect(page.getByRole('heading', { name: 'Aldeano' })).toBeHidden();
});

test('31.7 · el narrador muere y sigue pudiendo avanzar la partida', async ({ browser }) => {
  const { players, host } = await lunaRoom(browser, six);
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  const roles = await rolesOf(players);
  const [wolf] = withRole(roles, 'wolf');
  const hostName = six[0] ?? '';
  if (!wolf) throw new Error('Reparto inesperado');
  await narrate(host, 'Que caiga la noche');

  if (wolf === hostName) {
    // El narrador es el lobo: muere ahorcado y aun así da paso al final.
    const victim = six.find((name) => roles[name] === 'villager') ?? '';
    await act(host, victim);
    for (const name of six.filter((other) => other !== wolf)) {
      await act(pageOf(players, name), name === victim ? hostName : victim);
    }
    const alive = six.filter((name) => name !== victim);
    await allSee(players, alive, 'Amanece');
    await narrate(host, 'Continuar');
    const mayor = alive.find((name) => name !== wolf) ?? '';
    await hang(players, host, alive, mayor, wolf);
    await expect(host.getByRole('heading', { name: 'Ahora lo ves todo' })).toBeVisible();
    await narrate(host, 'Continuar');
    await allSee(players, six, 'Gana el pueblo');
  } else {
    // Los lobos devoran al narrador, que sigue narrando como espectador.
    await act(pageOf(players, wolf), hostName);
    for (const name of six.filter((other) => other !== wolf)) {
      await act(pageOf(players, name), wolf);
    }
    await expect(host.getByRole('heading', { name: 'Ahora lo ves todo' })).toBeVisible();
    await expect(
      host.getByText(`Amanece. ${hostName} no ha despertado.`, { exact: false }),
    ).toBeVisible();
    await narrate(host, 'Continuar');
    const alive = six.filter((name) => name !== hostName);
    await allSee(players, alive, '¿Quién es el alcalde?');
    await narrate(host, 'Cerrar la votación');
    await allSee(players, alive, 'Móviles boca abajo');
  }
});

test('31.7 · un aldeano vivo no recibe por la red el rol de nadie vivo', async ({ browser }) => {
  const traffic = new Map<string, () => Promise<string>>();
  const players: Players = {};
  for (const name of six) {
    const page = await newPlayer(browser);
    traffic.set(name, recordTraffic(page));
    players[name] = page;
  }
  const host = pageOf(players, 'Fran');
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /El lobo/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of six.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText('6 de 16')).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();
  const roles = await rolesOf(players);
  const [wolf] = withRole(roles, 'wolf');
  const [villager] = withRole(roles, 'villager');
  if (!wolf || !villager) throw new Error('Reparto inesperado');

  await narrate(host, 'Que caiga la noche');
  await act(pageOf(players, villager), wolf);
  await expect(pageOf(players, villager).getByText(`Sospechas de ${wolf}`)).toBeVisible();
  await act(pageOf(players, wolf), villager);

  const collect = traffic.get(villager);
  if (!collect) throw new Error('Sin tráfico');
  const received = await collect();
  expect(received, 'la captura funciona').toContain('"fellow_wolves"');
  expect(received, 've su propio rol con ese formato').toContain('"role": "villager"');
  for (const secret of ['"wolf"', '"seer"', '"wolf_marks": [{', '"seer_results": [{']) {
    expect(received, `no recibe ${secret}`).not.toContain(secret);
  }
});
