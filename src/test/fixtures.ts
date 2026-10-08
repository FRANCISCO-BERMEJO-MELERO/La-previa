import type { GameState, Snapshot } from '@/lib/snapshot';

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

export function gameState(overrides: Partial<GameState> = {}): GameState {
  return {
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

export function inGame(game: Partial<GameState> = {}, rest: Partial<Snapshot> = {}): Snapshot {
  return lobbySnapshot({ game: gameState(game), ...rest });
}
