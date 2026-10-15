import { describe, expect, it } from 'vitest';
import { ids, inPrefieres, prefieresState } from '@/test/fixtures';
import { optionRows, optionText } from './game-view';

describe('datos de que_prefieres', () => {
  it('el texto de cada opción', () => {
    const game = prefieresState();
    expect(optionText(game, 'a')).toBe('Volar');
    expect(optionText(game, 'b')).toBe('Ser invisible');
  });

  it('eligiendo, las dos opciones sin nadie y sin mayoría', () => {
    const snapshot = inPrefieres();
    const game = prefieresState();
    expect(
      optionRows(snapshot, game).map((row) => [row.option, row.text, row.choosers, row.majority]),
    ).toEqual([
      ['a', 'Volar', [], false],
      ['b', 'Ser invisible', [], false],
    ]);
  });

  it('en la revelación, quién eligió cada una y cuál es la mayoritaria', () => {
    const game = prefieresState({
      phase: 'reveal',
      choices: { a: [ids.lucia], b: [ids.fran, ids.alvaro] },
      majority: 'b',
    });
    const rows = optionRows(inPrefieres(game), game);
    expect(rows.map((row) => row.choosers.map((player) => player.name))).toEqual([
      ['Lucía'],
      ['Fran', 'Álvaro'],
    ]);
    expect(rows.map((row) => row.majority)).toEqual([false, true]);
  });

  it('en un empate ninguna es mayoritaria', () => {
    const game = prefieresState({
      phase: 'reveal',
      choices: { a: [ids.lucia], b: [ids.fran] },
      majority: null,
    });
    expect(optionRows(inPrefieres(game), game).map((row) => row.majority)).toEqual([false, false]);
  });
});
