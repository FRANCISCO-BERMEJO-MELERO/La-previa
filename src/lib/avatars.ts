/** Avatares de la galería, con los mismos nombres que acepta la base de datos (`private.avatar_ids`). */
export const avatarIds = [
  'olive',
  'churro',
  'croquette',
  'dice',
  'watermelon',
  'lemon',
  'omelette',
  'popcorn',
  'lantern',
  'flip_flop',
  'moon',
] as const;

export type AvatarId = (typeof avatarIds)[number];

/** Imagen de cada avatar en `public/avatars`. */
export const avatarImages: Record<AvatarId, string> = {
  olive: '/avatars/aceituna.webp',
  churro: '/avatars/churro.webp',
  croquette: '/avatars/croqueta.webp',
  dice: '/avatars/dado.webp',
  watermelon: '/avatars/sandia.webp',
  lemon: '/avatars/limon.webp',
  omelette: '/avatars/tortilla.webp',
  popcorn: '/avatars/palomita.webp',
  lantern: '/avatars/farolillo.webp',
  flip_flop: '/avatars/chancla.webp',
  moon: '/avatars/luna.webp',
};
