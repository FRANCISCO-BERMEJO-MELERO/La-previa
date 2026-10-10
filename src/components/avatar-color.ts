const avatarColors = ['tomato', 'sky', 'lime', 'lilac', 'orange'] as const;

export type AvatarColor = (typeof avatarColors)[number];

/** Color estable según la posición del jugador en el orden de entrada a la sala. */
export function avatarColor(joinIndex: number): AvatarColor {
  const count = avatarColors.length;
  const index = ((joinIndex % count) + count) % count;
  return avatarColors[index] ?? 'tomato';
}

export function initialOf(name: string): string {
  const [first] = Array.from(name.trim());
  return first?.toLocaleUpperCase('es') ?? '';
}
