import { describe, expect, it } from 'vitest';
import { cuelaIds, cuelaRevealOptions, ids, inCuela } from '@/test/fixtures';
import { parseSnapshot } from '@/lib/snapshot';
import { revealData } from './game-view';

function reveal(overrides: Parameters<typeof inCuela>[0] = {}) {
  const snapshot = inCuela({
    phase: 'reveal',
    options: cuelaRevealOptions,
    explanation: 'Se inventó en 1957 como papel pintado con relieve.',
    round_points: [
      { user_id: ids.fran, points: 1 },
      { user_id: ids.lucia, points: 2 },
      { user_id: ids.alvaro, points: 0 },
    ],
    ...overrides,
  });
  if (snapshot.game?.type !== 'cuela_la_mentira') throw new Error('foto sin partida');
  return revealData(snapshot, snapshot.game);
}

describe('revealData de cuela_la_mentira', () => {
  it('saca la verdad con quien la votó', () => {
    const { truth } = reveal();
    expect(truth?.text).toBe('Como papel pintado');
    expect(truth?.voters.map((player) => player.name)).toEqual(['Lucía']);
  });

  it('pone primero las mentiras votadas y al final las que no votó nadie', () => {
    const { lies } = reveal();
    expect(lies.map((lie) => lie.id)).toEqual([cuelaIds.mine, cuelaIds.other]);
    expect(lies[0]?.authors.map((player) => player.name)).toEqual(['Fran']);
    expect(lies[0]?.voters.map((player) => player.name)).toEqual(['Álvaro']);
  });

  it('una opción sin autores es de la casa', () => {
    const { lies } = reveal({
      options: [
        {
          id: cuelaIds.house,
          text: 'Para aislar invernaderos',
          kind: 'house',
          author_ids: [],
          left_author_ids: [],
          voter_ids: [ids.fran],
        },
      ],
    });
    expect(lies[0]?.authors).toEqual([]);
  });

  it('marca a los autores que se fueron', () => {
    const { lies } = reveal({
      options: [
        {
          id: cuelaIds.other,
          text: 'Para aislar cables',
          kind: 'lie',
          author_ids: [ids.lucia],
          left_author_ids: [ids.lucia],
          voter_ids: [],
        },
      ],
    });
    expect(lies[0]?.leftIds).toEqual([ids.lucia]);
  });

  it('da los puntos de la ronda por jugador', () => {
    expect(reveal().points.map(({ player, points }) => [player.name, points])).toEqual([
      ['Fran', 1],
      ['Lucía', 2],
      ['Álvaro', 0],
    ]);
  });
});

describe('esquema de cuela_la_mentira', () => {
  it('acepta la foto de la votación y la de la revelación', () => {
    expect(parseSnapshot(inCuela({ phase: 'voting' }))).not.toBeNull();
    expect(parseSnapshot(inCuela({ phase: 'reveal', options: cuelaRevealOptions }))).not.toBeNull();
  });

  it('rechaza un tipo de opción que no existe', () => {
    const snapshot = inCuela({ phase: 'reveal', options: cuelaRevealOptions });
    const raw = JSON.parse(JSON.stringify(snapshot).replace('"truth"', '"real"')) as unknown;
    expect(parseSnapshot(raw)).toBeNull();
  });

  it('rechaza una fase de otro juego', () => {
    const raw = JSON.parse(JSON.stringify(inCuela()).replace('"writing"', '"review"')) as unknown;
    expect(parseSnapshot(raw)).toBeNull();
  });
});
