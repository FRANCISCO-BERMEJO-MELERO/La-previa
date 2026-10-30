import { describe, expect, it } from 'vitest';
import { lobbySnapshot } from '@/test/fixtures';
import {
  POLL_INTERVAL_MS,
  initialSyncState,
  isNewer,
  nextPollDelay,
  syncReducer,
  type SyncState,
} from './sync';

function withVersion(version: number, serverTime = '2026-10-08T19:30:00+00:00') {
  const base = lobbySnapshot();
  return lobbySnapshot({ room: { ...base.room, version }, server_time: serverTime });
}

describe('isNewer', () => {
  it('acepta la primera foto', () => {
    expect(isNewer(null, withVersion(1))).toBe(true);
  });

  it('acepta una versión mayor y descarta una menor', () => {
    expect(isNewer(withVersion(4), withVersion(5))).toBe(true);
    expect(isNewer(withVersion(5), withVersion(4))).toBe(false);
  });

  it('con la misma versión, se queda con la más reciente del servidor', () => {
    const earlier = withVersion(5, '2026-10-08T19:30:00+00:00');
    const later = withVersion(5, '2026-10-08T19:30:10+00:00');
    expect(isNewer(earlier, later)).toBe(true);
    expect(isNewer(later, earlier)).toBe(false);
  });
});

describe('syncReducer', () => {
  it('la primera foto deja la sala lista', () => {
    const state = syncReducer(initialSyncState, { type: 'snapshot', snapshot: withVersion(1) });
    expect(state).toMatchObject({ status: 'ready', offline: false, failures: 0, responses: 1 });
    expect(state.snapshot?.room.version).toBe(1);
  });

  it('descarta una foto antigua que llega tarde', () => {
    const fresh = syncReducer(initialSyncState, { type: 'snapshot', snapshot: withVersion(7) });
    const state = syncReducer(fresh, { type: 'snapshot', snapshot: withVersion(6) });
    expect(state.snapshot?.room.version).toBe(7);
    expect(state.responses).toBe(2);
  });

  it('sin conexión conserva la última foto y avisa', () => {
    const ready = syncReducer(initialSyncState, { type: 'snapshot', snapshot: withVersion(3) });
    const state = syncReducer(ready, { type: 'failed', error: 'offline' });
    expect(state).toMatchObject({ status: 'ready', offline: true, failures: 1 });
    expect(state.snapshot?.room.version).toBe(3);
  });

  it('al volver la conexión quita el aviso y reinicia los fallos', () => {
    let state = syncReducer(initialSyncState, { type: 'failed', error: 'offline' });
    state = syncReducer(state, { type: 'failed', error: 'offline' });
    state = syncReducer(state, { type: 'snapshot', snapshot: withVersion(2) });
    expect(state).toMatchObject({ status: 'ready', offline: false, failures: 0 });
  });

  it('un fallo sin foto previa es un error, no una carga infinita', () => {
    const state = syncReducer(initialSyncState, { type: 'failed', error: 'unknown' });
    expect(state).toMatchObject({ status: 'error', offline: false, failures: 1 });
  });

  it.each(['room_not_found', 'not_member'] as const)('con %s la sala desaparece', (error) => {
    const ready = syncReducer(initialSyncState, { type: 'snapshot', snapshot: withVersion(3) });
    expect(syncReducer(ready, { type: 'failed', error })).toMatchObject({
      status: 'gone',
      snapshot: null,
    });
  });
});

describe('syncReducer: foto anterior para animar', () => {
  const snapshotOf = (version: number, serverTime?: string) =>
    ({ type: 'snapshot', snapshot: withVersion(version, serverTime) }) as const;

  it('la primera foto no tiene anterior', () => {
    expect(syncReducer(initialSyncState, snapshotOf(1)).previous).toBeNull();
  });

  it('una versión nueva tras seguir el hilo guarda la anterior', () => {
    let state = syncReducer(initialSyncState, snapshotOf(3));
    state = syncReducer(state, snapshotOf(4));
    expect(state.previous?.room.version).toBe(3);
    expect(state.snapshot?.room.version).toBe(4);
  });

  it('la foto inicial confirmada por una respuesta de la misma versión ya sigue el hilo', () => {
    let state: SyncState = { ...initialSyncState, snapshot: withVersion(3), status: 'ready' };
    state = syncReducer(state, snapshotOf(3));
    expect(state.previous).toBeNull();
    state = syncReducer(state, snapshotOf(4));
    expect(state.previous?.room.version).toBe(3);
  });

  it('la foto inicial sin confirmar no se anima al llegar otra versión', () => {
    const state = { ...initialSyncState, snapshot: withVersion(3), status: 'ready' as const };
    expect(syncReducer(state, snapshotOf(5)).previous).toBeNull();
  });

  it('la misma versión más reciente no cambia la anterior', () => {
    let state = syncReducer(initialSyncState, snapshotOf(3));
    state = syncReducer(state, snapshotOf(4));
    state = syncReducer(state, snapshotOf(4, '2026-10-08T19:30:10+00:00'));
    expect(state.previous?.room.version).toBe(3);
    expect(state.snapshot?.server_time).toBe('2026-10-08T19:30:10+00:00');
  });

  it('tras un fallo la siguiente versión llega sin anterior', () => {
    let state = syncReducer(initialSyncState, snapshotOf(3));
    state = syncReducer(state, snapshotOf(4));
    state = syncReducer(state, { type: 'failed', error: 'offline' });
    expect(state.previous).toBeNull();
    state = syncReducer(state, snapshotOf(5));
    expect(state.previous).toBeNull();
  });

  it('al volver a la pestaña se olvida la anterior y no cuenta como respuesta', () => {
    let state = syncReducer(initialSyncState, snapshotOf(3));
    state = syncReducer(state, snapshotOf(4));
    const resynced = syncReducer(state, { type: 'resync' });
    expect(resynced.previous).toBeNull();
    expect(resynced.responses).toBe(state.responses);
    expect(syncReducer(resynced, snapshotOf(6)).previous).toBeNull();
  });
});

describe('nextPollDelay', () => {
  it('sin fallos espera el intervalo normal de 10 s', () => {
    expect(nextPollDelay(0)).toBe(POLL_INTERVAL_MS);
    expect(POLL_INTERVAL_MS).toBe(10_000);
  });

  it('tras fallar reintenta antes, doblando la espera', () => {
    expect([1, 2, 3, 4].map(nextPollDelay)).toEqual([1_000, 2_000, 4_000, 8_000]);
  });

  it('nunca espera más que el intervalo normal', () => {
    expect(nextPollDelay(5)).toBe(POLL_INTERVAL_MS);
    expect(nextPollDelay(50)).toBe(POLL_INTERVAL_MS);
  });
});
