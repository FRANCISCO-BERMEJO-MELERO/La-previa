import type {
  DadosGameState,
  ImpostorGameState,
  PalabrasProhibidasGameState,
  ProbableGameState,
  QuePrefieresGameState,
  QuienLoDijoGameState,
  UnaPistaGameState,
  LunaLlenaGameState,
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
      {
        user_id: ids.fran,
        name: 'Fran',
        avatar: null,
        connected: true,
        joined_at: '2026-10-08T19:00:00+00:00',
      },
      {
        user_id: ids.lucia,
        name: 'Lucía',
        avatar: null,
        connected: true,
        joined_at: '2026-10-08T19:01:00+00:00',
      },
      {
        user_id: ids.alvaro,
        name: 'Álvaro',
        avatar: null,
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
    vote_seconds: null,
    voting_deadline: null,
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

/** Describe Lucía y vigila Álvaro; Fran (quien mira en `lobbySnapshot`) y Marta adivinan. */
export function palabrasState(
  overrides: Partial<PalabrasProhibidasGameState> = {},
): PalabrasProhibidasGameState {
  return {
    type: 'palabras_prohibidas',
    id: ids.game,
    phase: 'describing',
    round: 2,
    total_rounds: 10,
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, score: 1, has_responded: false },
      { user_id: ids.lucia, name: 'Lucía', alive: true, score: 2, has_responded: false },
      { user_id: ids.alvaro, name: 'Álvaro', alive: true, score: 0, has_responded: false },
      { user_id: ids.marta, name: 'Marta', alive: true, score: 0, has_responded: false },
    ],
    my: { is_participant: true, alive: true },
    describer_id: ids.lucia,
    watcher_id: ids.alvaro,
    word: null,
    forbidden: null,
    result: null,
    ranking: null,
    ...overrides,
  };
}

/** La tarjeta de la pizza, tal como la reciben quien describe y quien vigila. */
export const pizzaCard = {
  word: 'Pizza',
  forbidden: ['Italia', 'Queso', 'Masa', 'Horno', 'Tomate'],
};

/** Sala con `palabras_prohibidas` elegido y la partida dada. */
export function inPalabras(
  game: Partial<PalabrasProhibidasGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'palabras_prohibidas' },
    game: palabrasState(game),
    ...rest,
  });
}

/** Los seis jugadores de las partidas de Luna llena: los de la referencia y dos más. */
export const lunaIds = {
  ...ids,
  dani: '0a1b2c3d-1111-4aaa-8bbb-000000000005',
  paula: '0a1b2c3d-1111-4aaa-8bbb-000000000006',
} as const;

const lunaNames = [
  [lunaIds.fran, 'Fran'],
  [lunaIds.lucia, 'Lucía'],
  [lunaIds.alvaro, 'Álvaro'],
  [lunaIds.marta, 'Marta'],
  [lunaIds.dani, 'Dani'],
  [lunaIds.paula, 'Paula'],
] as const;

export function lunaMy(
  overrides: Partial<LunaLlenaGameState['my']> = {},
): LunaLlenaGameState['my'] {
  return {
    is_participant: true,
    alive: true,
    role: 'villager',
    fellow_wolves: [],
    action: null,
    wolf_marks: [],
    seer_results: [],
    lover_id: null,
    chosen_lovers: null,
    last_protected_id: null,
    potions: null,
    wolf_victim: null,
    witch_report: null,
    vote: null,
    ...overrides,
  };
}

/** Primera noche de una partida de seis vista por Fran, aldeano y anfitrión. */
export function lunaState(overrides: Partial<LunaLlenaGameState> = {}): LunaLlenaGameState {
  return {
    type: 'luna_llena',
    id: ids.game,
    phase: 'night',
    night: 1,
    day: 0,
    mayor_id: null,
    accused_id: null,
    config: { wolves: 1, roles: [] },
    participants: lunaNames.map(([user_id, name]) => ({
      user_id,
      name,
      alive: true,
      has_acted: false,
      role: null,
    })),
    my: lunaMy(),
    announcement: null,
    public_votes: null,
    narration: { key: 'night_first', params: {} },
    spectator: null,
    result: null,
    ...overrides,
  };
}

/** Sala de seis con `luna_llena` elegido y la partida dada. */
export function inLuna(
  game: Partial<LunaLlenaGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'luna_llena' },
    players: lunaNames.map(([user_id, name], index) => ({
      user_id,
      name,
      avatar: null,
      connected: true,
      joined_at: `2026-10-08T19:0${String(index)}:00+00:00`,
    })),
    game: lunaState(game),
    ...rest,
  });
}

/** Fran (A) contra Lucía (B) en 1 contra 1; le toca a Fran con un 5. Álvaro mira. */
export function dadosState(overrides: Partial<DadosGameState> = {}): DadosGameState {
  return {
    type: 'dados',
    id: ids.game,
    phase: 'playing',
    mode: '1v1',
    sides: [
      {
        side: 'A',
        members: [{ user_id: ids.fran, name: 'Fran' }],
        board: [[4], [5, 5, 4], [3]],
        column_scores: [4, 24, 3],
        total: 31,
      },
      {
        side: 'B',
        members: [{ user_id: ids.lucia, name: 'Lucía' }],
        board: [[6, 6], [2], []],
        column_scores: [24, 2, 0],
        total: 26,
      },
    ],
    turn_order: [ids.fran, ids.lucia],
    turn: { user_id: ids.fran, side: 'A' },
    pending_die: 5,
    my: { side: 'A', is_spectator: false, is_my_turn: true },
    result: null,
    ...overrides,
  };
}

/** Fran (A con Marta) contra Lucía y Álvaro (B) en 2 contra 2; le toca a Marta con un 3. */
export function dadosTeamsState(overrides: Partial<DadosGameState> = {}): DadosGameState {
  return dadosState({
    mode: '2v2',
    sides: [
      {
        side: 'A',
        members: [
          { user_id: ids.fran, name: 'Fran' },
          { user_id: ids.marta, name: 'Marta' },
        ],
        board: [[3], [6, 6], [4, 4]],
        column_scores: [3, 24, 16],
        total: 43,
      },
      {
        side: 'B',
        members: [
          { user_id: ids.lucia, name: 'Lucía' },
          { user_id: ids.alvaro, name: 'Álvaro' },
        ],
        board: [[4, 2, 2], [], [1]],
        column_scores: [12, 0, 1],
        total: 13,
      },
    ],
    turn_order: [ids.fran, ids.lucia, ids.marta, ids.alvaro],
    turn: { user_id: ids.marta, side: 'A' },
    pending_die: 3,
    my: { side: 'A', is_spectator: false, is_my_turn: false },
    ...overrides,
  });
}

/** Sala de cuatro con A dados elegido y la partida dada. */
export function inDados(
  game: Partial<DadosGameState> = {},
  rest: Partial<Snapshot> = {},
): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({
    room: { ...base.room, game: 'dados' },
    players: [
      ...base.players,
      {
        user_id: ids.marta,
        name: 'Marta',
        avatar: null,
        connected: true,
        joined_at: '2026-10-08T19:03:00+00:00',
      },
    ],
    game: dadosState(game),
    ...rest,
  });
}
