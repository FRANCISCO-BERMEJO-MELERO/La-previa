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

export function kickPlayer(roomId: string, userId: string, deps = defaultDeps) {
  return callForSnapshot(deps, 'kick_player', { room_id: roomId, user_id: userId });
}

export function startGame(roomId: string, impostorCount: number, deps = defaultDeps) {
  return callForSnapshot(deps, 'start_game', { room_id: roomId, impostor_count: impostorCount });
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
