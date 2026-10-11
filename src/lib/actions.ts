import { z } from 'zod';
import type { OptionalRole } from '@/games/luna-llena/roles';
import type { AvatarId } from './avatars';
import { isErrorCode, type ActionError } from './copy';
import { parseSnapshot, type Snapshot } from './snapshot';
import { ensureSession, getSupabase } from './supabase';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

type RpcResponse = { data: unknown; error: { message: string } | null };

/** Dependencias de las acciones; en los tests se sustituyen por dobles. */
export type ActionDeps = {
  ensureSession: () => Promise<string>;
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResponse>;
};

const defaultDeps: ActionDeps = {
  ensureSession: () => ensureSession(),
  rpc: (fn, args) => getSupabase().rpc(fn, args),
};

export function createRoom(name: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'create_room', { name });
}

export function joinRoom(code: string, name: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'join_room', { code, name });
}

export function getRoomState(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'get_room_state', { room_id: roomId });
}

export function setGame(roomId: string, game: Snapshot['room']['game'], deps = defaultDeps) {
  return callForSnapshot(deps, 'set_game', { room_id: roomId, game });
}

export function setAvatar(roomId: string, avatar: AvatarId | null, deps = defaultDeps) {
  return callForSnapshot(deps, 'set_avatar', { room_id: roomId, avatar });
}

export function kickPlayer(roomId: string, userId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'kick_player', { room_id: roomId, user_id: userId });
}

/** Lo que el anfitrión elige antes de empezar El impostor. */
export type ImpostorSettings = {
  impostorCount: number;
  /** Temáticas de la palabra; vacío es todas. */
  categories: readonly string[];
  /** Tiempo para votar en segundos; nulo es sin tiempo. */
  voteSeconds: number | null;
};

export function startGame(roomId: string, settings: ImpostorSettings, deps = defaultDeps) {
  return callForSnapshot(deps, 'start_game', {
    room_id: roomId,
    impostor_count: settings.impostorCount,
    // Sin temáticas no se envían: la base de datos entiende entonces que valen todas.
    ...(settings.categories.length > 0 ? { categories: settings.categories } : {}),
    ...(settings.voteSeconds === null ? {} : { vote_seconds: settings.voteSeconds }),
  });
}

const categoriesSchema = z.array(z.string());

/** Temáticas de El impostor que hay en la base de datos. */
export async function impostorCategories(deps = defaultDeps): Promise<ActionResult<string[]>> {
  const response = await call(deps, 'impostor_categories', {});
  if (!response.ok) return response;
  const parsed = categoriesSchema.safeParse(response.data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'unknown' };
}

export function probableStart(roomId: string, rounds: number, deps = defaultDeps) {
  return callForSnapshot(deps, 'probable_start', { room_id: roomId, rounds });
}

export function probableVote(roomId: string, targetId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'probable_vote', { room_id: roomId, target_id: targetId });
}

export function probableClose(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'probable_close', { room_id: roomId });
}

export function probableNext(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'probable_next', { room_id: roomId });
}

export function quienLoDijoStart(roomId: string, rounds: number, deps = defaultDeps) {
  return callForSnapshot(deps, 'quien_lo_dijo_start', { room_id: roomId, rounds });
}

export function quienLoDijoAnswer(roomId: string, text: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'quien_lo_dijo_answer', { room_id: roomId, text });
}

export function quienLoDijoCloseWriting(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'quien_lo_dijo_close_writing', { room_id: roomId });
}

export function quienLoDijoVote(roomId: string, targetId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'quien_lo_dijo_vote', { room_id: roomId, target_id: targetId });
}

export function quienLoDijoCloseVoting(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'quien_lo_dijo_close_voting', { room_id: roomId });
}

export function quienLoDijoNext(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'quien_lo_dijo_next', { room_id: roomId });
}

export function unaPistaStart(roomId: string, rounds: number, deps = defaultDeps) {
  return callForSnapshot(deps, 'una_pista_start', { room_id: roomId, rounds });
}

export function unaPistaClue(roomId: string, text: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'una_pista_clue', { room_id: roomId, text });
}

export function unaPistaCloseWriting(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'una_pista_close_writing', { room_id: roomId });
}

export function unaPistaToggleClue(roomId: string, userId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'una_pista_toggle_clue', { room_id: roomId, user_id: userId });
}

export function unaPistaShowClues(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'una_pista_show_clues', { room_id: roomId });
}

export function unaPistaMark(
  roomId: string,
  result: 'correct' | 'wrong' | 'pass',
  deps = defaultDeps,
) {
  return callForSnapshot(deps, 'una_pista_mark', { room_id: roomId, result });
}

export function unaPistaNext(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'una_pista_next', { room_id: roomId });
}

export function quePrefieresStart(roomId: string, rounds: number, deps = defaultDeps) {
  return callForSnapshot(deps, 'que_prefieres_start', { room_id: roomId, rounds });
}

export function quePrefieresChoose(roomId: string, option: 'a' | 'b', deps = defaultDeps) {
  return callForSnapshot(deps, 'que_prefieres_choose', { room_id: roomId, option });
}

export function quePrefieresClose(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'que_prefieres_close', { room_id: roomId });
}

export function quePrefieresNext(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'que_prefieres_next', { room_id: roomId });
}

export function palabrasProhibidasStart(roomId: string, rounds: number, deps = defaultDeps) {
  return callForSnapshot(deps, 'palabras_prohibidas_start', { room_id: roomId, rounds });
}

export function palabrasProhibidasGuessed(roomId: string, userId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'palabras_prohibidas_guessed', { room_id: roomId, user_id: userId });
}

export function palabrasProhibidasPass(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'palabras_prohibidas_pass', { room_id: roomId });
}

export function palabrasProhibidasForbidden(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'palabras_prohibidas_forbidden', { room_id: roomId });
}

export function palabrasProhibidasNext(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'palabras_prohibidas_next', { room_id: roomId });
}

/** Composición de Luna llena; nula para usar la recomendada. */
export type LunaLlenaConfig = { wolves: number; roles: readonly OptionalRole[] } | null;

export function lunaLlenaStart(roomId: string, config: LunaLlenaConfig, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_start', {
    room_id: roomId,
    wolves: config?.wolves ?? null,
    roles: config?.roles ?? null,
  });
}

export function lunaLlenaContinue(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_continue', { room_id: roomId });
}

export function lunaLlenaNightAction(
  roomId: string,
  targetId: string,
  target2Id: string | null,
  deps = defaultDeps,
) {
  return callForSnapshot(deps, 'luna_llena_night_action', {
    room_id: roomId,
    target_id: targetId,
    target2_id: target2Id,
  });
}

export function lunaLlenaCloseNight(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_close_night', { room_id: roomId });
}

export function lunaLlenaVote(roomId: string, targetId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_vote', { room_id: roomId, target_id: targetId });
}

export function lunaLlenaVerdict(roomId: string, condemn: boolean, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_verdict', { room_id: roomId, condemn });
}

export function lunaLlenaCloseVote(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_close_vote', { room_id: roomId });
}

export function lunaLlenaHunterShot(roomId: string, targetId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_hunter_shot', { room_id: roomId, target_id: targetId });
}

export function lunaLlenaSkipHunter(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'luna_llena_skip_hunter', { room_id: roomId });
}

export function openVoting(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'open_voting', { room_id: roomId });
}

export function castVote(roomId: string, targetId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'cast_vote', { room_id: roomId, target_id: targetId });
}

export function closeVoting(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'close_voting', { room_id: roomId });
}

export function continueGame(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'continue_game', { room_id: roomId });
}

export function backToLobby(roomId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'back_to_lobby', { room_id: roomId });
}

export async function leaveRoom(roomId: string, deps = defaultDeps): Promise<ActionResult<null>> {
  const response = await call(deps, 'leave_room', { room_id: roomId });
  return response.ok ? { ok: true, data: null } : response;
}

async function callForSnapshot(
  deps: ActionDeps,
  fn: string,
  args: Record<string, unknown>,
): Promise<ActionResult<Snapshot>> {
  const response = await call(deps, fn, args);
  if (!response.ok) return response;
  const snapshot = parseSnapshot(response.data);
  return snapshot ? { ok: true, data: snapshot } : { ok: false, error: 'unknown' };
}

async function call(
  deps: ActionDeps,
  fn: string,
  args: Record<string, unknown>,
): Promise<ActionResult<unknown>> {
  try {
    await deps.ensureSession();
    const { data, error } = await deps.rpc(fn, args);
    if (error) return { ok: false, error: toActionError(error.message) };
    return { ok: true, data };
  } catch (thrown) {
    // fetch y el inicio de sesión lanzan en vez de devolver error: se traduce igual.
    return { ok: false, error: toActionError(thrown instanceof Error ? thrown.message : '') };
  }
}

export function toActionError(message: string): ActionError {
  if (isErrorCode(message)) return message;
  if (isNetworkFailure(message)) return 'offline';
  return 'unknown';
}

function isNetworkFailure(message: string): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return /failed to fetch|fetch failed|networkerror|load failed/i.test(message);
}
