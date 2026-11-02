import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { joinByLink, newPlayer, pageOf, type Players } from './players';
import { recordTraffic } from './traffic';

const names = ['Fran', 'Lucía', 'Álvaro'];

/** La verdad de cada pregunta, sacada del listado del banco (docs/MENTIRAS.md). */
function truths(): Map<string, string> {
  const map = new Map<string, string>();
  const lines = readFileSync('docs/MENTIRAS.md', 'utf8').split('\n');
  let question = '';
  for (const line of lines) {
    const heading = /^## \d+\. (.+)$/.exec(line);
    if (heading?.[1]) question = heading[1];
    const truth = /^- \*\*Verdad:\*\* (.+)$/.exec(line);
    if (truth?.[1] && question) map.set(question, truth[1]);
  }
  return map;
}

async function questionOf(page: Page): Promise<string> {
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  return (await heading.textContent()) ?? '';
}

async function writeLie(page: Page, text: string): Promise<void> {
  await page.getByLabel('Tu mentira').fill(text);
  await page.getByRole('button', { name: 'Colar mentira' }).click();
  await expect(page.getByLabel('Tu mentira')).toBeHidden();
}

async function voteFor(page: Page, text: string): Promise<void> {
  await page.getByRole('button', { name: text, exact: true }).click();
  await page.getByRole('button', { name: 'Es esta' }).click();
  await expect(page.getByRole('heading', { name: '¿Cuál es la de verdad?' })).toBeHidden();
}

test('51.1 · Cuela la mentira: verdad rechazada, mentiras iguales, engaño, recarga y otra partida', async ({
  browser,
}) => {
  const bank = truths();
  expect(bank.size, 'el listado del banco se lee').toBe(40);
  const traffic = new Map<string, () => Promise<string>>();
  const players: Players = {};
  for (const name of names) {
    const page = await newPlayer(browser);
    traffic.set(name, recordTraffic(page));
    players[name] = page;
  }
  const host = pageOf(players, 'Fran');
  const lucia = pageOf(players, 'Lucía');
  const alvaro = pageOf(players, 'Álvaro');

  // Fran crea la sala con Cuela la mentira: el selector de rondas se pone en 5.
  await host.goto('/');
  await host.getByRole('button', { name: 'Crear sala' }).click();
  await host.getByLabel('Tu nombre').fill('Fran');
  await host.getByRole('button', { name: 'Entrar' }).click();
  await host.getByRole('button', { name: /Cuela la mentira/ }).click();
  await host.getByRole('button', { name: 'Abrir la sala' }).click();
  const code = /\/sala\/([A-Z]{4})/.exec(host.url())?.[1] ?? '';
  for (const name of names.slice(1)) await joinByLink(pageOf(players, name), code, name);
  await expect(host.getByText('3 de 16')).toBeVisible();
  await expect(host.getByRole('button', { name: '5 rondas', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  // Ronda 1 -------------------------------------------------------------------------------------
  await expect(host.getByText('Ronda 1 de 5')).toBeVisible();
  const question = await questionOf(host);
  const truth = bank.get(question);
  if (!truth) throw new Error(`Pregunta fuera del banco: ${question}`);

  // Lucía escribe la verdad: se le avisa y no pierde lo escrito ni el envío.
  await lucia.getByLabel('Tu mentira').fill(truth);
  await lucia.getByRole('button', { name: 'Colar mentira' }).click();
  await expect(
    lucia.getByRole('alert').filter({ hasText: '¡Has dado con la verdad!' }),
  ).toBeVisible();
  await expect(lucia.getByLabel('Tu mentira')).toHaveValue(truth);

  // Fran y Álvaro escriben la misma mentira de dos formas: será una sola opción con dos autores.
  await writeLie(host, 'Para guardar secretos');
  const luciaWriting = await traffic.get('Lucía')?.();
  expect(luciaWriting, 'mientras se escribe no llega la mentira ajena').not.toContain(
    'Para guardar secretos',
  );
  expect(luciaWriting, 'ni la verdad').not.toContain(truth);
  await writeLie(lucia, 'Mentira de Lucía');
  await writeLie(alvaro, '  para GUARDAR secretos. ');

  // Votación: tres opciones, en el mismo orden para todos, sin nada que delate la verdad.
  const order = async (page: Page) => page.getByRole('list').getByRole('button').allTextContents();
  await expect(host.getByRole('heading', { name: '¿Cuál es la de verdad?' })).toBeVisible();
  await expect(alvaro.getByRole('heading', { name: '¿Cuál es la de verdad?' })).toBeVisible();
  const hostOrder = (await order(host)).map((text) => text.replace('Tu mentira', ''));
  expect(hostOrder).toHaveLength(3);
  expect((await order(lucia)).map((text) => text.replace('Tu mentira', ''))).toEqual(hostOrder);
  await expect(host.getByRole('button', { name: /Para guardar secretos/ })).toBeDisabled();
  await expect(alvaro.getByRole('button', { name: /Para guardar secretos/ })).toBeDisabled();

  for (const name of names) {
    const received = await traffic.get(name)?.();
    expect(received, `${name}: la captura funciona`).toContain('Mentira de Lucía');
    expect(received, `${name} no recibe el tipo de opción`).not.toContain('"kind"');
    expect(received, `${name} no recibe autores`).not.toContain('author_ids');
    expect(received, `${name} no recibe votos ajenos`).not.toContain('voter_ids');
    expect(received, `${name} no recibe la explicación`).not.toMatch(/"explanation":\s*"/);
  }

  // Lucía se traga la mentira de Fran y Álvaro; Fran acierta.
  await voteFor(lucia, 'Para guardar secretos');
  await voteFor(host, truth);

  // Álvaro recarga a mitad de la votación: sigue en su pantalla, con su mentira marcada.
  await alvaro.reload();
  await expect(alvaro.getByRole('heading', { name: '¿Cuál es la de verdad?' })).toBeVisible();
  await expect(alvaro.getByRole('button', { name: /Para guardar secretos/ })).toBeDisabled();
  await voteFor(alvaro, 'Mentira de Lucía');

  // Revelación.
  for (const page of Object.values(players)) {
    await expect(page.getByRole('heading', { name: truth, exact: true })).toBeVisible();
    await expect(page.getByText(/^La coló (Fran y Álvaro|Álvaro y Fran)$/)).toBeVisible();
    await expect(page.getByText('La coló Lucía')).toBeVisible();
    await expect(page.getByText('La acertaron: Fran')).toBeVisible();
  }
  await host.getByRole('button', { name: 'Siguiente ronda' }).click();

  // Ronda 2: escriben todos y aciertan todos.
  await expect(host.getByText('Ronda 2 de 5')).toBeVisible();
  const second = bank.get(await questionOf(host));
  if (!second) throw new Error('Segunda pregunta fuera del banco');
  expect(second).not.toBe(truth);
  for (const name of names) await writeLie(pageOf(players, name), `Trola de ${name}`);
  for (const name of names) await voteFor(pageOf(players, name), second);
  const guessed = host.getByText(/^La acertaron: /);
  for (const name of names) await expect(guessed).toContainText(name);

  // Las rondas que quedan las cierra el anfitrión sin esperar a los demás.
  for (let round = 2; round <= 4; round += 1) {
    await host.getByRole('button', { name: 'Siguiente ronda' }).click();
    await expect(host.getByText(`Ronda ${String(round + 1)} de 5`)).toBeVisible();
    await writeLie(host, `Trola de Fran en la ronda ${String(round + 1)}`);
    await host.getByRole('button', { name: 'Cerrar mentiras' }).click();
    await host.getByRole('list').getByRole('button', { disabled: false }).first().click();
    await host.getByRole('button', { name: 'Es esta' }).click();
    await host.getByRole('button', { name: 'Cerrar votación' }).click();
  }
  await host.getByRole('button', { name: 'Ver resultado' }).click();

  // Fran: 2 + 1 + 2; Álvaro: 1 + 2; Lucía: 1 + 2.
  for (const page of Object.values(players)) {
    await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible();
  }
  await host.getByRole('button', { name: 'Volver a jugar' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('Ronda 1 de 5')).toBeVisible();
    await expect(page.getByLabel('Tu mentira')).toBeVisible();
  }
});
