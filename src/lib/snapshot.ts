import { z } from 'zod';

/**
 * Contrato de la foto del estado que devuelven las RPC (docs/CONTEXTO.md §4, "La foto del estado").
 * Todo lo que llega de la base de datos se valida aquí antes de usarse.
 */

const id = z.guid();
const timestamp = z.iso.datetime({ offset: true });

export const roomCodeSchema = z.string().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);

const outcomeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('eliminated'),
    user_id: id,
    name: z.string(),
    was_impostor: z.boolean(),
  }),
  z.object({ type: z.literal('left'), user_id: id, name: z.string(), was_impostor: z.boolean() }),
  z.object({ type: z.literal('tie'), user_ids: z.array(id) }),
]);

const impostorGameSchema = z.object({
  type: z.literal('impostor'),
  id,
  phase: z.enum(['talking', 'voting', 'reveal', 'finished']),
  round: z.int().positive(),
  impostor_count: z.int().positive(),
  impostors_left: z.int().nonnegative(),
  category: z.string(),
  participants: z.array(
    z.object({ user_id: id, name: z.string(), alive: z.boolean(), has_voted: z.boolean() }),
  ),
  my: z.object({
    is_participant: z.boolean(),
    alive: z.boolean(),
    role: z.enum(['player', 'impostor']).nullable(),
    word: z.string().nullable(),
    voted_for: id.nullable(),
  }),
  outcome: outcomeSchema.nullable(),
  game_over: z.boolean(),
  result: z
    .object({
      winner: z.enum(['group', 'impostors']),
      word: z.string(),
      impostor_ids: z.array(id),
    })
    .nullable(),
});

const probableGameSchema = z.object({
  type: z.literal('probable'),
  id,
  phase: z.enum(['voting', 'reveal', 'finished']),
  round: z.int().positive(),
  total_rounds: z.int().positive(),
  prompt: z.string(),
  participants: z.array(
    z.object({
      user_id: id,
      name: z.string(),
      alive: z.boolean(),
      score: z.int().nonnegative(),
      has_responded: z.boolean(),
    }),
  ),
  my: z.object({ is_participant: z.boolean(), alive: z.boolean(), voted_for: id.nullable() }),
  tally: z
    .array(z.object({ user_id: id, votes: z.int().positive(), voter_ids: z.array(id) }))
    .nullable(),
  round_winner_ids: z.array(id).nullable(),
  ranking: z
    .array(z.object({ user_id: id, name: z.string(), score: z.int().nonnegative() }))
    .nullable(),
});

/** La partida en curso, con la forma propia de cada juego (docs/JUEGOS.md §8). */
const gameSchema = z.discriminatedUnion('type', [impostorGameSchema, probableGameSchema]);

export const gameIds = ['impostor', 'probable'] as const;

export const snapshotSchema = z.object({
  server_time: timestamp,
  room: z.object({
    id,
    code: roomCodeSchema,
    game: z.enum(gameIds),
    host_id: id,
    version: z.int().positive(),
  }),
  me: z.object({ user_id: id, name: z.string(), is_host: z.boolean() }),
  players: z.array(
    z.object({ user_id: id, name: z.string(), connected: z.boolean(), joined_at: timestamp }),
  ),
  game: gameSchema.nullable(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export type RoomPlayer = Snapshot['players'][number];
export type GameState = z.infer<typeof gameSchema>;
export type GameId = (typeof gameIds)[number];
export type ImpostorGameState = z.infer<typeof impostorGameSchema>;
export type ProbableGameState = z.infer<typeof probableGameSchema>;
export type Phase = ImpostorGameState['phase'];
export type Outcome = z.infer<typeof outcomeSchema>;

export function parseSnapshot(raw: unknown): Snapshot | null {
  const result = snapshotSchema.safeParse(raw);
  return result.success ? result.data : null;
}
