/** Límites del selector de impostores: siempre menos que jugadores normales (2 × impostores < jugadores). */
export function impostorLimits(playerCount: number): { min: number; max: number } {
  return { min: 1, max: Math.max(1, Math.floor((playerCount - 1) / 2)) };
}

export function clampImpostors(wanted: number, playerCount: number): number {
  const { min, max } = impostorLimits(playerCount);
  return Math.min(max, Math.max(min, wanted));
}
