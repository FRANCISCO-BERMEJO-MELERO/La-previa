import type { ActionError } from './copy';
import type { Snapshot } from './snapshot';

/** Cada cuánto se vuelve a pedir la foto: latido y red de seguridad de Realtime. */
export const POLL_INTERVAL_MS = 10_000;
const FIRST_RETRY_MS = 1_000;

export type SyncStatus = 'loading' | 'ready' | 'gone' | 'error';

export type SyncState = {
  snapshot: Snapshot | null;
  status: SyncStatus;
  offline: boolean;
  /** Fallos seguidos; deciden cuándo reintentar. */
  failures: number;
  /** Respuestas recibidas; cada una programa la siguiente petición. */
  responses: number;
};

export type SyncEvent =
  { type: 'snapshot'; snapshot: Snapshot } | { type: 'failed'; error: ActionError };

export const initialSyncState: SyncState = {
  snapshot: null,
  status: 'loading',
  offline: false,
  failures: 0,
  responses: 0,
};

/** Una foto se acepta si no es más antigua que la que ya se tiene. */
export function isNewer(current: Snapshot | null, incoming: Snapshot): boolean {
  if (!current) return true;
  if (incoming.room.version !== current.room.version) {
    return incoming.room.version > current.room.version;
  }
  return Date.parse(incoming.server_time) >= Date.parse(current.server_time);
}

export function syncReducer(state: SyncState, event: SyncEvent): SyncState {
  const responses = state.responses + 1;

  if (event.type === 'snapshot') {
    const snapshot = isNewer(state.snapshot, event.snapshot) ? event.snapshot : state.snapshot;
    return { snapshot, status: 'ready', offline: false, failures: 0, responses };
  }

  // La sala ya no existe o ya no somos miembros: no tiene sentido seguir pidiendo.
  if (event.error === 'room_not_found' || event.error === 'not_member') {
    return { snapshot: null, status: 'gone', offline: false, failures: 0, responses };
  }

  return {
    snapshot: state.snapshot,
    status: state.snapshot ? 'ready' : 'error',
    offline: event.error === 'offline',
    failures: state.failures + 1,
    responses,
  };
}

/** Tras un fallo se reintenta antes (1, 2, 4, 8 s) sin pasar nunca del intervalo normal. */
export function nextPollDelay(failures: number): number {
  if (failures === 0) return POLL_INTERVAL_MS;
  return Math.min(POLL_INTERVAL_MS, FIRST_RETRY_MS * 2 ** (failures - 1));
}
