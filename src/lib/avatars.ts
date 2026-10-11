/** Avatares de la galería, con los mismos nombres que acepta la base de datos (`private.avatar_ids`). */
export const avatarIds = [
  'avocado',
  'egg',
  'ghost',
  'cactus',
  'banana',
  'pizza',
  'cloud',
  'toast',
  'octopus',
  'donut',
  'rocket',
  'penguin',
] as const;

export type AvatarId = (typeof avatarIds)[number];
