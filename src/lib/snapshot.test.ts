import { describe, expect, it } from 'vitest';
import {
  gameState,
  ids,
  inGame,
  inLuna,
  inPalabras,
  inPista,
  inPrefieres,
  inProbable,
  inQuien,
  lobbySnapshot,
  lunaIds,
  lunaMy,
  lunaState,
  palabrasState,
  pizzaCard,
  pistaState,
  prefieresState,
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

  it('acepta la pista del impostor y exige que venga, aunque sea nula', () => {
    const impostor = gameState({
      hint: 'Valencia',
      my: { is_participant: true, alive: true, role: 'impostor', word: null, voted_for: null },
    });
    expect(parseSnapshot(inGame(impostor))?.game).toEqual(impostor);
    const withoutHint: Record<string, unknown> = { ...gameState() };
    delete withoutHint.hint;
    expect(parseSnapshot({ ...inGame(), game: withoutHint })).toBeNull();
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

  it('acepta la partida de que_prefieres en todas sus fases', () => {
    const voting = inPrefieres({ my: { is_participant: true, alive: true, choice: 'a' } });
    expect(parseSnapshot(voting)).toEqual(voting);
    const reveal = inPrefieres({
      phase: 'reveal',
      choices: { a: [ids.fran], b: [ids.lucia, ids.alvaro] },
      majority: 'b',
    });
    expect(parseSnapshot(reveal)).toEqual(reveal);
    const tie = inPrefieres({ phase: 'reveal', choices: { a: [], b: [] }, majority: null });
    expect(parseSnapshot(tie)).toEqual(tie);
  });

  it('descarta una partida de que_prefieres con una opción que no existe', () => {
    expect(
      parseSnapshot({ ...inPrefieres(), game: { ...prefieresState(), majority: 'c' } }),
    ).toBeNull();
    expect(
      parseSnapshot({
        ...inPrefieres(),
        game: { ...prefieresState(), my: { is_participant: true, alive: true, choice: 'A' } },
      }),
    ).toBeNull();
    expect(
      parseSnapshot({ ...inPrefieres(), game: { ...prefieresState(), option_b: null } }),
    ).toBeNull();
  });

  it('acepta la partida de palabras_prohibidas, con y sin la tarjeta', () => {
    const guessing = inPalabras();
    expect(parseSnapshot(guessing)).toEqual(guessing);
    const describing = inPalabras(pizzaCard);
    expect(parseSnapshot(describing)).toEqual(describing);
    for (const result of [
      { type: 'guessed', user_id: ids.marta } as const,
      { type: 'forbidden' } as const,
      { type: 'passed' } as const,
    ]) {
      const reveal = inPalabras({ phase: 'reveal', ...pizzaCard, result });
      expect(parseSnapshot(reveal)).toEqual(reveal);
    }
  });

  it('descarta una partida de palabras_prohibidas con un resultado que no existe', () => {
    expect(
      parseSnapshot({ ...inPalabras(), game: { ...palabrasState(), result: { type: 'casi' } } }),
    ).toBeNull();
    expect(
      parseSnapshot({
        ...inPalabras(),
        game: { ...palabrasState(), result: { type: 'guessed' } },
      }),
    ).toBeNull();
    expect(
      parseSnapshot({ ...inPalabras(), game: { ...palabrasState(), describer_id: null } }),
    ).toBeNull();
  });

  it('acepta el avatar de la galería y descarta cualquier otro', () => {
    const base = lobbySnapshot();
    const withAvatar = lobbySnapshot({
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, avatar: 'popcorn' as const } : player,
      ),
    });
    expect(parseSnapshot(withAvatar)).toEqual(withAvatar);
    expect(
      parseSnapshot({
        ...base,
        players: base.players.map((player) => ({ ...player, avatar: 'unicornio' })),
      }),
    ).toBeNull();
    expect(
      parseSnapshot({
        ...base,
        players: base.players.map((player) => ({ ...player, avatar: 'ghost' })),
      }),
    ).toBeNull();
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

describe('parseSnapshot de Luna llena', () => {
  it('acepta la foto de un vivo de noche', () => {
    const snapshot = inLuna();
    expect(parseSnapshot(snapshot)).toEqual(snapshot);
  });

  it('acepta un amanecer con muertes, un muerto con su vista y un final', () => {
    const deaths = [
      { user_id: lunaIds.marta, name: 'Marta', role: 'seer', cause: 'night' },
      { user_id: lunaIds.dani, name: 'Dani', role: 'cupid', cause: 'heartbreak' },
    ] as const;
    expect(
      parseSnapshot(
        inLuna({
          phase: 'dawn',
          announcement: { kind: 'night', deaths: [...deaths], spared: null },
          narration: {
            key: 'dawn_deaths',
            params: { names: ['Marta', 'Dani'], lover: { name: 'Dani', role: 'cupid' } },
          },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseSnapshot(
        inLuna({
          my: lunaMy({ alive: false }),
          spectator: {
            roles: [{ user_id: lunaIds.fran, role: 'wolf' }],
            lovers: [lunaIds.marta, lunaIds.dani],
            actions: [{ user_id: lunaIds.fran, target_id: lunaIds.lucia, target2_id: null }],
            causes: [{ user_id: lunaIds.marta, cause: 'wolves' }],
            potions: null,
          },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseSnapshot(
        inLuna({
          phase: 'finished',
          result: {
            winner: 'jester',
            roles: [{ user_id: lunaIds.fran, role: 'jester' }],
            lovers: null,
          },
          narration: { key: 'win_jester', params: {} },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseSnapshot(
        inLuna({
          phase: 'finished',
          result: {
            winner: 'killer',
            roles: [{ user_id: lunaIds.fran, role: 'killer' }],
            lovers: null,
          },
          narration: { key: 'win_killer', params: {} },
        }),
      ),
    ).not.toBeNull();
  });

  it('acepta lo que recibe la bruja y lo que ven los muertos de ella', () => {
    expect(
      parseSnapshot(
        inLuna({
          my: lunaMy({
            role: 'witch',
            action: { target_id: null, target2_id: null, use_life: true },
            potions: { life: true, poison: false },
            wolf_victim: lunaIds.marta,
            witch_report: { saved_id: null, poisoned_id: lunaIds.dani },
          }),
        }),
      ),
    ).not.toBeNull();
    expect(
      parseSnapshot(
        inLuna({
          my: lunaMy({ alive: false }),
          spectator: {
            roles: [{ user_id: lunaIds.fran, role: 'witch' }],
            lovers: null,
            actions: [
              {
                user_id: lunaIds.fran,
                target_id: lunaIds.lucia,
                target2_id: null,
                use_life: false,
              },
            ],
            causes: [{ user_id: lunaIds.marta, cause: 'killer' }],
            potions: { life: false, poison: false },
          },
        }),
      ),
    ).not.toBeNull();
  });

  it('acepta los votos ya cerrados', () => {
    expect(
      parseSnapshot(
        inLuna({
          phase: 'execution',
          public_votes: {
            kind: 'accuse',
            votes: [{ voter_id: lunaIds.lucia, target_id: lunaIds.marta }],
          },
        }),
      ),
    ).not.toBeNull();
  });

  it('rechaza roles, fases y claves del guion que no existen', () => {
    const broken = (game: Record<string, unknown>) => ({
      ...inLuna(),
      game: { ...lunaState(), ...game },
    });
    expect(parseSnapshot(broken({ my: { ...lunaMy(), role: 'wizard' } }))).toBeNull();
    expect(parseSnapshot(broken({ phase: 'reveal' }))).toBeNull();
    // Un vivo nunca recibe la causa real de una muerte nocturna.
    expect(
      parseSnapshot(
        broken({
          phase: 'dawn',
          announcement: {
            kind: 'night',
            deaths: [{ user_id: lunaIds.marta, name: 'Marta', role: 'seer', cause: 'poison' }],
            spared: null,
          },
        }),
      ),
    ).toBeNull();
    expect(parseSnapshot(broken({ narration: { key: 'chat', params: {} } }))).toBeNull();
    expect(parseSnapshot(inLuna({ config: { wolves: -1, roles: [] } }))).toBeNull();
    expect(parseSnapshot(inLuna({ config: { wolves: 0, roles: ['seer'] } }))).not.toBeNull();
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
