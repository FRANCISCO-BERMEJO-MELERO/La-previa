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

/** Lo común de la foto de los juegos por rondas (docs/JUEGOS.md §8). */
const roundGameShape = {
  id,
  round: z.int().positive(),
  total_rounds: z.int().positive(),
  participants: z.array(
    z.object({
      user_id: id,
      name: z.string(),
      alive: z.boolean(),
      score: z.int().nonnegative(),
      has_responded: z.boolean(),
    }),
  ),
  ranking: z
    .array(z.object({ user_id: id, name: z.string(), score: z.int().nonnegative() }))
    .nullable(),
};

const probableGameSchema = z.object({
  ...roundGameShape,
  type: z.literal('probable'),
  phase: z.enum(['voting', 'reveal', 'finished']),
  prompt: z.string(),
  my: z.object({ is_participant: z.boolean(), alive: z.boolean(), voted_for: id.nullable() }),
  tally: z
    .array(z.object({ user_id: id, votes: z.int().positive(), voter_ids: z.array(id) }))
    .nullable(),
  round_winner_ids: z.array(id).nullable(),
});

const quienLoDijoGameSchema = z.object({
  ...roundGameShape,
  type: z.literal('quien_lo_dijo'),
  phase: z.enum(['writing', 'voting', 'reveal', 'finished']),
  prompt: z.string(),
  my: z.object({
    is_participant: z.boolean(),
    alive: z.boolean(),
    answer: z.string().nullable(),
    is_author: z.boolean(),
    voted_for: id.nullable(),
  }),
  featured_text: z.string().nullable(),
  vote_progress: z
    .object({ voted: z.int().nonnegative(), total: z.int().nonnegative() })
    .nullable(),
  annulled: z.boolean().nullable(),
  author_id: id.nullable(),
  correct_ids: z.array(id).nullable(),
  wrong_ids: z.array(id).nullable(),
  answers: z.array(z.object({ user_id: id, text: z.string() })).nullable(),
});

const unaPistaGameSchema = z.object({
  ...roundGameShape,
  type: z.literal('una_pista'),
  phase: z.enum(['writing', 'review', 'guessing', 'reveal', 'finished']),
  my: z.object({ is_participant: z.boolean(), alive: z.boolean(), clue: z.string().nullable() }),
  guesser_id: id,
  arbiter_id: id.nullable(),
  team_score: z.int().nonnegative(),
  category: z.string().nullable(),
  word: z.string().nullable(),
  // El adivino recibe solo el texto de las vivas; los demás, también autor y si está anulada.
  clues: z
    .array(
      z.object({ text: z.string(), user_id: id.optional(), cancelled: z.boolean().optional() }),
    )
    .nullable(),
  result: z.enum(['correct', 'wrong', 'pass']).nullable(),
});

const option = z.enum(['a', 'b']);

const quePrefieresGameSchema = z.object({
  ...roundGameShape,
  type: z.literal('que_prefieres'),
  phase: z.enum(['voting', 'reveal', 'finished']),
  option_a: z.string(),
  option_b: z.string(),
  my: z.object({ is_participant: z.boolean(), alive: z.boolean(), choice: option.nullable() }),
  choices: z.object({ a: z.array(id), b: z.array(id) }).nullable(),
  majority: option.nullable(),
});

/** La partida en curso, con la forma propia de cada juego (docs/JUEGOS.md §8, JUEGOS-2 §6). */
const gameSchema = z.discriminatedUnion('type', [
  impostorGameSchema,
  probableGameSchema,
  quienLoDijoGameSchema,
  unaPistaGameSchema,
  quePrefieresGameSchema,
]);

export const gameIds = [
  'impostor',
  'probable',
  'quien_lo_dijo',
  'una_pista',
  'que_prefieres',
  'palabras_prohibidas',
] as const;

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
export type GameId = (typeof gameIds)[number];
export type ImpostorGameState = z.infer<typeof impostorGameSchema>;
export type ProbableGameState = z.infer<typeof probableGameSchema>;
export type QuienLoDijoGameState = z.infer<typeof quienLoDijoGameSchema>;
export type UnaPistaGameState = z.infer<typeof unaPistaGameSchema>;
export type QuePrefieresGameState = z.infer<typeof quePrefieresGameSchema>;
export type QuePrefieresOption = z.infer<typeof option>;
/** Lo que comparten las partidas de los juegos por rondas. */
export type RoundGameState = z.infer<z.ZodObject<typeof roundGameShape>>;
export type Phase = ImpostorGameState['phase'];

export function parseSnapshot(raw: unknown): Snapshot | null {
  const result = snapshotSchema.safeParse(raw);
  return result.success ? result.data : null;
}
