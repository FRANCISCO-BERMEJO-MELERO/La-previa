import { z } from 'zod';
import { lunaRoles, optionalRoles } from '@/games/luna-llena/roles';
import { avatarIds } from './avatars';

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
  vote_seconds: z.union([z.literal(30), z.literal(60), z.literal(90)]).nullable(),
  voting_deadline: timestamp.nullable(),
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

const palabrasProhibidasGameSchema = z.object({
  ...roundGameShape,
  type: z.literal('palabras_prohibidas'),
  phase: z.enum(['describing', 'reveal', 'finished']),
  my: z.object({ is_participant: z.boolean(), alive: z.boolean() }),
  describer_id: id,
  watcher_id: id.nullable(),
  // Quien adivina las recibe nulas hasta la revelación.
  word: z.string().nullable(),
  forbidden: z.array(z.string()).nullable(),
  result: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('guessed'), user_id: id }),
      z.object({ type: z.literal('forbidden') }),
      z.object({ type: z.literal('passed') }),
    ])
    .nullable(),
});

const lunaRole = z.enum(lunaRoles);

export const lunaNarrationKeys = [
  'roles',
  'night_first',
  'night',
  'dawn_death',
  'dawn_deaths',
  'dawn_none',
  'hunter',
  'hunter_shot',
  'left',
  'mayor',
  'day',
  'voting',
  'defense',
  'no_accused',
  'executed',
  'win_village',
  'win_wolves',
  'win_jester',
  'win_killer',
] as const;

const lunaRoleOf = z.object({ user_id: id, role: lunaRole });

/** Causas que ve un vivo: de noche no se dice quién ha matado (docs/PLAN-6.md §6). */
export const lunaPublicCauses = ['night', 'hanged', 'hunter', 'heartbreak', 'left'] as const;
/** Causas reales, que solo ven los muertos. */
export const lunaRealCauses = [
  'wolves',
  'killer',
  'poison',
  'hanged',
  'hunter',
  'heartbreak',
  'left',
] as const;

export type LunaCause = (typeof lunaPublicCauses)[number] | (typeof lunaRealCauses)[number];

const lunaPotions = z.object({ life: z.boolean(), poison: z.boolean() });

/** Una acción de la noche. La de la bruja con pociones lleva `use_life` y quizá ningún objetivo. */
const lunaAction = z.object({
  target_id: id.nullable(),
  target2_id: id.nullable(),
  use_life: z.boolean().optional(),
});

/** Luna llena (docs/PLAN-5.md §8). Lo secreto llega nulo o vacío a quien no debe verlo. */
const lunaLlenaGameSchema = z.object({
  type: z.literal('luna_llena'),
  id,
  phase: z.enum([
    'roles',
    'night',
    'dawn',
    'hunter',
    'mayor',
    'day',
    'voting',
    'defense',
    'execution',
    'finished',
  ]),
  night: z.int().nonnegative(),
  day: z.int().nonnegative(),
  mayor_id: id.nullable(),
  accused_id: id.nullable(),
  config: z.object({ wolves: z.int().nonnegative(), roles: z.array(z.enum(optionalRoles)) }),
  participants: z.array(
    z.object({
      user_id: id,
      name: z.string(),
      alive: z.boolean(),
      has_acted: z.boolean(),
      // Solo el de los muertos, y el de todos al terminar.
      role: lunaRole.nullable(),
    }),
  ),
  my: z.object({
    is_participant: z.boolean(),
    alive: z.boolean(),
    role: lunaRole.nullable(),
    fellow_wolves: z.array(id),
    action: lunaAction.nullable(),
    wolf_marks: z.array(z.object({ user_id: id, target_id: id })),
    seer_results: z.array(
      z.object({ night: z.int().positive(), user_id: id, is_wolf: z.boolean() }),
    ),
    lover_id: id.nullable(),
    chosen_lovers: z.array(id).nullable(),
    last_protected_id: id.nullable(),
    // Solo para la bruja: lo que le queda, a quién van a devorar y qué hicieron sus pociones.
    potions: lunaPotions.nullable(),
    wolf_victim: id.nullable(),
    witch_report: z.object({ saved_id: id.nullable(), poisoned_id: id.nullable() }).nullable(),
    vote: z.object({ target_id: id }).nullable(),
  }),
  announcement: z
    .object({
      kind: z.enum(['night', 'trial', 'left']),
      deaths: z.array(
        z.object({
          user_id: id,
          name: z.string(),
          role: lunaRole,
          cause: z.enum(lunaPublicCauses),
        }),
      ),
      spared: z.string().nullable(),
    })
    .nullable(),
  public_votes: z
    .object({
      kind: z.enum(['mayor', 'accuse']),
      votes: z.array(z.object({ voter_id: id, target_id: id })),
    })
    .nullable(),
  narration: z.object({
    key: z.enum(lunaNarrationKeys),
    params: z.object({
      name: z.string().optional(),
      role: lunaRole.optional(),
      names: z.array(z.string()).optional(),
      lover: z.object({ name: z.string(), role: lunaRole }).optional(),
      mayor: z.string().optional(),
    }),
  }),
  spectator: z
    .object({
      roles: z.array(lunaRoleOf),
      lovers: z.array(id).nullable(),
      actions: z.array(lunaAction.extend({ user_id: id })),
      causes: z.array(z.object({ user_id: id, cause: z.enum(lunaRealCauses) })).nullable(),
      potions: lunaPotions.nullable(),
    })
    .nullable(),
  result: z
    .object({
      winner: z.enum(['village', 'wolves', 'jester', 'killer']),
      roles: z.array(lunaRoleOf),
      lovers: z.array(id).nullable(),
    })
    .nullable(),
});

/** La partida en curso, con la forma propia de cada juego (docs/JUEGOS.md §8, JUEGOS-2 §6). */
const gameSchema = z.discriminatedUnion('type', [
  impostorGameSchema,
  probableGameSchema,
  quienLoDijoGameSchema,
  unaPistaGameSchema,
  quePrefieresGameSchema,
  palabrasProhibidasGameSchema,
  lunaLlenaGameSchema,
]);

export const gameIds = [
  'luna_llena',
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
    z.object({
      user_id: id,
      name: z.string(),
      avatar: z.enum(avatarIds).nullable(),
      connected: z.boolean(),
      joined_at: timestamp,
    }),
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
export type PalabrasProhibidasGameState = z.infer<typeof palabrasProhibidasGameSchema>;
export type LunaLlenaGameState = z.infer<typeof lunaLlenaGameSchema>;
export type LunaNarration = LunaLlenaGameState['narration'];
/** Lo que comparten las partidas de los juegos por rondas. */
export type RoundGameState = z.infer<z.ZodObject<typeof roundGameShape>>;
export type Phase = ImpostorGameState['phase'];

export function parseSnapshot(raw: unknown): Snapshot | null {
  const result = snapshotSchema.safeParse(raw);
  return result.success ? result.data : null;
}
