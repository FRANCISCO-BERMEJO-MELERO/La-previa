import type { ActionError } from './copy';
import type { Snapshot } from './snapshot';

/** Cada cuánto se vuelve a pedir la foto: latido y red de seguridad de Realtime. */
export const POLL_INTERVAL_MS = 10_000;
const FIRST_RETRY_MS = 1_000;

export type SyncStatus = 'loading' | 'ready' | 'gone' | 'error';

export type SyncState = {
  snapshot: Snapshot | null;
  /**
   * La foto de antes de la última versión nueva, si se ha visto pasar de una a otra. Sin ella no
   * se anima nada (docs/PLAN-8.md §3): al cargar, tras un fallo o al volver a la pestaña.
   */
  previous: Snapshot | null;
  /** Si la foto actual sigue el hilo de la anterior; la siguiente versión podrá animarse. */
  live: boolean;
  status: SyncStatus;
  offline: boolean;
  /** Fallos seguidos; deciden cuándo reintentar. */
  failures: number;
  /** Respuestas recibidas; cada una programa la siguiente petición. */
  responses: number;
};

export type SyncEvent =
  | { type: 'snapshot'; snapshot: Snapshot }
  | { type: 'failed'; error: ActionError }
  // Vuelta a primer plano o de la conexión: lo que llegue después no sigue el hilo.
  | { type: 'resync' };

export const initialSyncState: SyncState = {
  snapshot: null,
  previous: null,
  live: false,
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
  if (event.type === 'resync') return { ...state, previous: null, live: false };

  const responses = state.responses + 1;

  if (event.type === 'snapshot') {
    const ready = { status: 'ready', offline: false, failures: 0, responses } as const;
    const current = state.snapshot;
    if (!isNewer(current, event.snapshot)) return { ...state, ...ready };
    // La misma versión, más reciente, solo trae otra hora del servidor: no es una transición,
    // pero confirma que se sigue el hilo y la próxima versión ya podrá animarse.
    if (current?.room.version === event.snapshot.room.version) {
      return { ...state, ...ready, snapshot: event.snapshot, live: true };
    }
    return {
      ...ready,
      snapshot: event.snapshot,
      previous: state.live ? current : null,
      live: true,
    };
  }

  // La sala ya no existe o ya no somos miembros: no tiene sentido seguir pidiendo.
  if (event.error === 'room_not_found' || event.error === 'not_member') {
    return {
      snapshot: null,
      previous: null,
      live: false,
      status: 'gone',
      offline: false,
      failures: 0,
      responses,
    };
  }

  return {
    snapshot: state.snapshot,
    previous: null,
    live: false,
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
