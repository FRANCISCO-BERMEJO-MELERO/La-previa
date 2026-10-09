import { describe, expect, it } from 'vitest';
import { gameState, ids, inGame, lobbySnapshot } from '@/test/fixtures';
import { parseSnapshot, roomCodeSchema } from './snapshot';

describe('parseSnapshot', () => {
  it('acepta la foto de la sala de espera', () => {
    const snapshot = lobbySnapshot();
    expect(parseSnapshot(snapshot)).toEqual(snapshot);
  });

  it('acepta la foto con partida y revelación', () => {
    const snapshot = inGame({
      phase: 'reveal',
      outcome: { type: 'eliminated', user_id: ids.alvaro, name: 'Álvaro', was_impostor: false },
    });
    expect(parseSnapshot(snapshot)).toEqual(snapshot);
  });

  it('acepta un empate sin votos y un resultado final', () => {
    expect(
      parseSnapshot(inGame({ phase: 'reveal', outcome: { type: 'tie', user_ids: [] } })),
    ).not.toBeNull();
    expect(
      parseSnapshot(
        inGame({
          phase: 'finished',
          result: { winner: 'group', word: 'Paella', impostor_ids: [ids.marta] },
        }),
      ),
    ).not.toBeNull();
  });

  it('acepta los datos del jugador que llegó tarde', () => {
    const game = gameState({
      my: { is_participant: false, alive: false, role: null, word: null, voted_for: null },
    });
    expect(parseSnapshot(lobbySnapshot({ game }))).not.toBeNull();
  });

  it('la partida dice de qué juego es', () => {
    expect(parseSnapshot(inGame())?.game?.type).toBe('impostor');
    const untyped: Record<string, unknown> = { ...gameState() };
    delete untyped.type;
    expect(parseSnapshot({ ...inGame(), game: untyped })).toBeNull();
    expect(parseSnapshot({ ...inGame(), game: { ...gameState(), type: 'parchis' } })).toBeNull();
  });

  it('acepta las fechas tal como las devuelve Postgres', () => {
    expect(
      parseSnapshot(lobbySnapshot({ server_time: '2026-10-08T19:30:00.123456+00:00' })),
    ).not.toBeNull();
  });

  it('descarta lo que no cumple el contrato', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({})).toBeNull();
    expect(
      parseSnapshot({ ...lobbySnapshot(), room: { ...lobbySnapshot().room, version: '3' } }),
    ).toBeNull();
    expect(parseSnapshot(inGame({ phase: 'voting' }))).not.toBeNull();
    expect(parseSnapshot({ ...inGame(), game: { ...gameState(), phase: 'lobby' } })).toBeNull();
    expect(
      parseSnapshot({
        ...inGame(),
        game: { ...gameState(), my: { ...gameState().my, role: 'rey' } },
      }),
    ).toBeNull();
  });

  it('no deja pasar campos que no están en el contrato', () => {
    const parsed = parseSnapshot({ ...lobbySnapshot(), secret: 'impostor' });
    expect(parsed).not.toHaveProperty('secret');
  });
});

describe('roomCodeSchema', () => {
  it('acepta cuatro letras del alfabeto permitido', () => {
    expect(roomCodeSchema.safeParse('KTRM').success).toBe(true);
  });

  it.each(['KTRL', 'ktrm', 'KTR', 'KTRMA', 'K0RM'])('rechaza %s', (code) => {
    expect(roomCodeSchema.safeParse(code).success).toBe(false);
  });
});
