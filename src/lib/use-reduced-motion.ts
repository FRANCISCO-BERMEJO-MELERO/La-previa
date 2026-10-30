import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function media(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const list = media();
  list?.addEventListener('change', onChange);
  return () => {
    list?.removeEventListener('change', onChange);
  };
}

/** Sin forma de preguntarlo, quieto: es lo que nunca molesta. */
function reduced(): boolean {
  return media()?.matches ?? true;
}

/** Si quien mira ha pedido menos movimiento (docs/PLAN-8.md §1.5). En el servidor, quieto. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, reduced, () => true);
}
