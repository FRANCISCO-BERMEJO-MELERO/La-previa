import { useEffect } from 'react';

/**
 * Pide que la pantalla no se apague mientras `active` sea cierto, y lo vuelve a pedir al volver
 * a primer plano, porque el navegador lo suelta al ocultar la pestaña (docs/CONTEXTO.md §4).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const request = () => {
      if (document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      navigator.wakeLock.request('screen').then(
        (lock) => {
          if (disposed) void lock.release();
          else sentinel = lock;
        },
        () => {
          // Denegado (batería baja, permisos): se sigue sin él y sin avisar, como pide el contexto.
        },
      );
    };

    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', request);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}
