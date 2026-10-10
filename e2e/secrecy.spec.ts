import { expect, test, type Page } from '@playwright/test';
import { pageOf, secretWord, startedGame, vote } from './players';
import { recordTraffic } from './traffic';

async function storageOf(page: Page): Promise<string> {
  return page.evaluate(() => {
    const dump = (storage: Storage) =>
      Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index) ?? '';
        return `${key}=${storage.getItem(key) ?? ''}`;
      }).join('\n');
    return `${dump(localStorage)}\n${dump(sessionStorage)}`;
  });
}

test('6.5 · antes del final, nadie recibe roles ajenos, votos ajenos ni el impostor la palabra', async ({
  browser,
}) => {
  const traffic = new Map<string, () => Promise<string>>();
  const { players, host, impostor } = await startedGame(
    browser,
    ['Fran', 'Lucía', 'Álvaro', 'Marta'],
    (name, page) => {
      traffic.set(name, recordTraffic(page));
    },
  );
  const normals = Object.keys(players).filter((name) => name !== impostor);
  const word = await secretWord(pageOf(players, normals[0] ?? ''));

  // Votación con votos de todos y revelación de un jugador normal: la partida sigue.
  await host.getByRole('button', { name: 'Pasar a votación' }).click();
  const victim = normals.find((name) => name !== 'Fran') ?? '';
  for (const [name, page] of Object.entries(players)) {
    await vote(page, name === victim ? impostor : victim);
  }
  await host.getByRole('button', { name: 'Cerrar votación' }).click();
  for (const page of Object.values(players)) {
    await expect(page.getByText('No era el impostor')).toBeVisible();
  }
  // Una vuelta más de sondeo para que todos hayan pedido la foto de la revelación.
  for (const page of Object.values(players)) await page.reload();
  await expect(pageOf(players, impostor).getByText('No era el impostor')).toBeVisible();

  for (const [name, page] of Object.entries(players)) {
    const collect = traffic.get(name);
    if (!collect) throw new Error(`Sin tráfico de ${name}`);
    const received = await collect();
    const storage = await storageOf(page);

    // La captura funciona: cada jugador ha recibido fotos de la partida.
    expect(received).toContain('"category"');
    // Nadie recibe votos ajenos ni recuentos.
    expect(received).not.toMatch(/"target_id"/);
    expect(received).not.toMatch(/"votes"/);
    // Nadie recibe la lista de impostores antes del final.
    expect(received).not.toContain('impostor_ids');

    if (name === impostor) {
      expect(received, 'el impostor no recibe la palabra').not.toContain(word);
      expect(storage, 'ni la guarda el navegador').not.toContain(word);
    } else {
      expect(received, `${name} recibe la palabra`).toContain(word);
      expect(received, `${name} no recibe el rol de nadie como impostor`).not.toMatch(
        /"role":\s*"impostor"/,
      );
      expect(storage).not.toMatch(/"role":\s*"impostor"/);
    }
  }
});
