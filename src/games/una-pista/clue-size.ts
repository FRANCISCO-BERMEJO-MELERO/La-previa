import { fitDisplay } from '@/lib/fit-text';

/**
 * Tamaño de una pista según su longitud. Las cortas van en mayúsculas al tamaño pedido; las largas
 * (hasta 20 letras) van sin mayúsculas y más pequeñas, que en Archivo Black ocupan bastante menos:
 * así una pista de 20 letras anchas ("ZQWXZ…") cabe en una línea a 360 px.
 */
export function clueSize(text: string, largest: 'text-display-sm' | 'text-xl'): string {
  const letters = Array.from(text).length;
  if (letters > 16) return 'text-base';
  if (letters > 12) return 'text-lg';
  return largest === 'text-xl' ? 'uppercase text-xl' : `uppercase ${fitDisplay(text, largest)}`;
}
