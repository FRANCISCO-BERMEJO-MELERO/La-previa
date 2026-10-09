import { describe, expect, it } from 'vitest';
import {
  gameState,
  ids,
  inGame,
  inPista,
  inProbable,
  inQuien,
  lobbySnapshot,
  pistaState,
  probableState,
  quienState,
} from '@/test/fixtures';
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

  it('acepta la partida de probable en todas sus fases', () => {
    const voting = inProbable();
    expect(parseSnapshot(voting)).toEqual(voting);
    const reveal = inProbable({
      phase: 'reveal',
      tally: [{ user_id: ids.lucia, votes: 2, voter_ids: [ids.fran, ids.lucia] }],
      round_winner_ids: [ids.lucia],
    });
    expect(parseSnapshot(reveal)).toEqual(reveal);
    const finished = inProbable({
      phase: 'finished',
      ranking: [{ user_id: ids.fran, name: 'Fran', score: 2 }],
    });
    expect(parseSnapshot(finished)).toEqual(finished);
  });

  it('descarta una partida de probable con forma de otro juego', () => {
    expect(
      parseSnapshot({ ...inProbable(), game: { ...probableState(), phase: 'talking' } }),
    ).toBeNull();
    expect(
      parseSnapshot({ ...inProbable(), game: { ...probableState(), total_rounds: null } }),
    ).toBeNull();
    expect(
      parseSnapshot({ ...inProbable(), game: { ...gameState(), type: 'probable' } }),
    ).toBeNull();
  });

  it('acepta la partida de quien_lo_dijo en todas sus fases', () => {
    const writing = inQuien();
    expect(parseSnapshot(writing)).toEqual(writing);
    const voting = inQuien({
      phase: 'voting',
      featured_text: 'Volar',
      vote_progress: { voted: 1, total: 2 },
    });
    expect(parseSnapshot(voting)).toEqual(voting);
    const reveal = inQuien({
      phase: 'reveal',
      featured_text: 'Volar',
      annulled: false,
      author_id: ids.lucia,
      correct_ids: [ids.fran],
      wrong_ids: [],
      answers: [{ user_id: ids.lucia, text: 'Volar' }],
    });
    expect(parseSnapshot(reveal)).toEqual(reveal);
  });

  it('descarta una partida de quien_lo_dijo sin sus datos propios', () => {
    expect(
      parseSnapshot({ ...inQuien(), game: { ...quienState(), my: probableState().my } }),
    ).toBeNull();
    expect(parseSnapshot({ ...inQuien(), game: { ...quienState(), phase: 'talking' } })).toBeNull();
  });

  it('acepta la partida de una_pista, también con las pistas sin autor del adivino', () => {
    const review = inPista({
      phase: 'review',
      clues: [{ user_id: ids.fran, text: 'frío', cancelled: true }],
    });
    expect(parseSnapshot(review)).toEqual(review);
    const guessing = inPista({
      phase: 'guessing',
      word: null,
      category: null,
      clues: [{ text: 'hielo' }],
    });
    expect(parseSnapshot(guessing)).toEqual(guessing);
    const reveal = inPista({ phase: 'reveal', result: 'pass', clues: [] });
    expect(parseSnapshot(reveal)).toEqual(reveal);
  });

  it('descarta una partida de una_pista con un resultado que no existe', () => {
    expect(parseSnapshot({ ...inPista(), game: { ...pistaState(), result: 'casi' } })).toBeNull();
    expect(parseSnapshot({ ...inPista(), game: { ...pistaState(), guesser_id: null } })).toBeNull();
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
