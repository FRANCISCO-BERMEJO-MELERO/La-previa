'use client';

import { useEffect, useState } from 'react';
import { impostorCategories as fetchCategories } from './actions';

/**
 * Temáticas de El impostor para el selector de la sala de espera. Se piden una vez al hacer falta;
 * mientras llegan, o si fallan, la lista está vacía y el selector no se enseña.
 */
export function useImpostorCategories(
  enabled: boolean,
  load: typeof fetchCategories = fetchCategories,
): string[] {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void load().then((result) => {
      if (!cancelled && result.ok) setCategories(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  return categories;
}
