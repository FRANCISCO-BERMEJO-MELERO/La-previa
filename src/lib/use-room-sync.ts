import { useCallback, useEffect, useReducer } from 'react';
import { getRoomState } from './actions';
import type { Snapshot } from './snapshot';
import { getSupabase } from './supabase';
import { initialSyncState, nextPollDelay, syncReducer, type SyncState } from './sync';

export type RoomSync = SyncState & {
  /** Vuelve a pedir la foto. */
  refresh: () => void;
  /** Aplica la foto que devuelve una acción propia. */
  apply: (snapshot: Snapshot) => void;
};

/**
 * Mantiene la foto de la sala al día (docs/CONTEXTO.md §4, "Sincronización"):
 * foto inicial, Realtime, sondeo, vuelta a primer plano y vuelta de la conexión.
 */
export function useRoomSync(roomId: string, initial: Snapshot | null = null): RoomSync {
  const [state, dispatch] = useReducer(syncReducer, initial, (snapshot): SyncState =>
    snapshot ? { ...initialSyncState, snapshot, status: 'ready' } : initialSyncState,
  );

  const refresh = useCallback(() => {
    void getRoomState(roomId).then((result) => {
      dispatch(
        result.ok
          ? { type: 'snapshot', snapshot: result.data }
          : { type: 'failed', error: result.error },
      );
    });
  }, [roomId]);

  const apply = useCallback((snapshot: Snapshot) => {
    dispatch({ type: 'snapshot', snapshot });
  }, []);

  const gone = state.status === 'gone';

  // Foto inicial.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sondeo: cada respuesta programa la siguiente petición.
  useEffect(() => {
    if (gone || state.responses === 0) return;
    const timer = setTimeout(refresh, nextPollDelay(state.failures));
    return () => {
      clearTimeout(timer);
    };
  }, [refresh, gone, state.responses, state.failures]);

  // Realtime: cualquier cambio en la fila de la sala significa "pide la foto otra vez".
  const subscribed = state.status === 'ready';
  useEffect(() => {
    if (!subscribed) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refresh, subscribed]);

  // Vuelta a primer plano y vuelta de la conexión.
  useEffect(() => {
    if (gone) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [refresh, gone]);

  return { ...state, refresh, apply };
}
