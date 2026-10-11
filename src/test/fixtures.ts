import type {
  ImpostorGameState,
  ProbableGameState,
  QuePrefieresGameState,
  QuienLoDijoGameState,
  UnaPistaGameState,
  Snapshot,
} from '@/lib/snapshot';

// Fotos de ejemplo para los tests, con los datos de la referencia.

export const ids = {
  room: '5b2b2a8e-6d3c-4f6a-9a51-0f4f1c2d3e01',
  game: '5b2b2a8e-6d3c-4f6a-9a51-0f4f1c2d3e02',
  fran: '0a1b2c3d-1111-4aaa-8bbb-000000000001',
  lucia: '0a1b2c3d-1111-4aaa-8bbb-000000000002',
  alvaro: '0a1b2c3d-1111-4aaa-8bbb-000000000003',
  marta: '0a1b2c3d-1111-4aaa-8bbb-000000000004',
} as const;

export function lobbySnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    server_time: '2026-10-08T19:30:00.000000+00:00',
    room: { id: ids.room, code: 'KTRM', game: 'impostor', host_id: ids.fran, version: 3 },
    me: { user_id: ids.fran, name: 'Fran', is_host: true },
    players: [
      { user_id: ids.fran, name: 'Fran', connected: true, joined_at: '2026-10-08T19:00:00+00:00' },
      {
        user_id: ids.lucia,
        name: 'Lucía',
        connected: true,
        joined_at: '2026-10-08T19:01:00+00:00',
      },
      {
        user_id: ids.alvaro,
        name: 'Álvaro',
        connected: false,
        joined_at: '2026-10-08T19:02:00+00:00',
      },
    ],
    game: null,
    ...overrides,
  };
}

export function gameState(overrides: Partial<ImpostorGameState> = {}): ImpostorGameState {
  return {
    type: 'impostor',
    id: ids.game,
    phase: 'talking',
    round: 1,
    impostor_count: 1,
    impostors_left: 1,
    category: 'Comida',
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, has_voted: false },
      { user_id: ids.lucia, name: 'Lucía', alive: true, has_voted: false },
      { user_id: ids.alvaro, name: 'Álvaro', alive: true, has_voted: false },
    ],
    my: { is_participant: true, alive: true, role: 'player', word: 'Paella', voted_for: null },
    outcome: null,
    game_over: false,
    result: null,
    ...overrides,
  };
}

export function inGame(
  game: Partial<ImpostorGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  return lobbySnapshot({ game: gameState(game), ...rest });
}

export function probableState(overrides: Partial<ProbableGameState> = {}): ProbableGameState {
  return {
    type: 'probable',
    id: ids.game,
    phase: 'voting',
    round: 3,
    total_rounds: 10,
    prompt: 'se duerma antes que nadie en una fiesta',
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, score: 2, has_responded: false },
      { user_id: ids.lucia, name: 'Lucía', alive: true, score: 1, has_responded: true },
      { user_id: ids.alvaro, name: 'Álvaro', alive: true, score: 0, has_responded: false },
    ],
    my: { is_participant: true, alive: true, voted_for: null },
    tally: null,
    round_winner_ids: null,
    ranking: null,
    ...overrides,
  };
}

/** Sala con `probable` elegido y la partida dada. */
export function inProbable(
  game: Partial<ProbableGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'probable' },
    game: probableState(game),
    ...rest,
  });
}

export function quienState(overrides: Partial<QuienLoDijoGameState> = {}): QuienLoDijoGameState {
  return {
    type: 'quien_lo_dijo',
    id: ids.game,
    phase: 'writing',
    round: 2,
    total_rounds: 5,
    prompt: '¿Qué superpoder elegirías?',
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, score: 1, has_responded: false },
      { user_id: ids.lucia, name: 'Lucía', alive: true, score: 2, has_responded: true },
      { user_id: ids.alvaro, name: 'Álvaro', alive: true, score: 0, has_responded: false },
    ],
    my: { is_participant: true, alive: true, answer: null, is_author: false, voted_for: null },
    featured_text: null,
    vote_progress: null,
    annulled: null,
    author_id: null,
    correct_ids: null,
    wrong_ids: null,
    answers: null,
    ranking: null,
    ...overrides,
  };
}

/** Sala con `quien_lo_dijo` elegido y la partida dada. */
export function inQuien(
  game: Partial<QuienLoDijoGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'quien_lo_dijo' },
    game: quienState(game),
    ...rest,
  });
}

export function pistaState(overrides: Partial<UnaPistaGameState> = {}): UnaPistaGameState {
  return {
    type: 'una_pista',
    id: ids.game,
    phase: 'writing',
    round: 2,
    total_rounds: 10,
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, score: 0, has_responded: false },
      { user_id: ids.lucia, name: 'Lucía', alive: true, score: 0, has_responded: true },
      { user_id: ids.alvaro, name: 'Álvaro', alive: true, score: 0, has_responded: false },
    ],
    my: { is_participant: true, alive: true, clue: null },
    guesser_id: ids.lucia,
    arbiter_id: ids.fran,
    team_score: 1,
    category: 'Animales',
    word: 'Pingüino',
    clues: null,
    result: null,
    ranking: null,
    ...overrides,
  };
}

/** Sala con `una_pista` elegido y la partida dada. */
export function inPista(
  game: Partial<UnaPistaGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'una_pista' },
    game: pistaState(game),
    ...rest,
  });
}

export function prefieresState(
  overrides: Partial<QuePrefieresGameState> = {},
): QuePrefieresGameState {
  return {
    type: 'que_prefieres',
    id: ids.game,
    phase: 'voting',
    round: 4,
    total_rounds: 10,
    option_a: 'Volar',
    option_b: 'Ser invisible',
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, score: 2, has_responded: false },
      { user_id: ids.lucia, name: 'Lucía', alive: true, score: 1, has_responded: true },
      { user_id: ids.alvaro, name: 'Álvaro', alive: true, score: 0, has_responded: false },
    ],
    my: { is_participant: true, alive: true, choice: null },
    choices: null,
    majority: null,
    ranking: null,
    ...overrides,
  };
}

/** Sala con `que_prefieres` elegido y la partida dada. */
export function inPrefieres(
  game: Partial<QuePrefieresGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'que_prefieres' },
    game: prefieresState(game),
    ...rest,
  });
}
