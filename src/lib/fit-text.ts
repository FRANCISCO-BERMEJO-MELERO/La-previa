/**
 * Tamaño de titular en Archivo Black según la palabra más larga, para que la palabra secreta
 * o un nombre quepan sin partirse en una tarjeta protagonista a 360 px (250 px de ancho útil).
 * Los umbrales salen de medir en el navegador las 200 palabras: en mayúsculas, la palabra más
 * ancha de cada longitud ocupa como mucho 0,86 em por letra.
 */
const sizes = [
  { maxLetters: 4, className: 'text-display-lg' },
  { maxLetters: 6, className: 'text-display-md' },
  { maxLetters: 8, className: 'text-display-sm' },
  { maxLetters: 9, className: 'text-display-xs' },
  { maxLetters: 11, className: 'text-display-2xs' },
  { maxLetters: 12, className: 'text-2xl' },
] as const;

type DisplaySize = (typeof sizes)[number]['className'];

const FALLBACK = 'text-xl';

export function longestWord(text: string): number {
  return Math.max(0, ...text.split(/\s+/).map((word) => Array.from(word).length));
}

/** `largest` limita el tamaño máximo para titulares que en la referencia son más pequeños. */
export function fitDisplay(text: string, largest: DisplaySize = 'text-display-lg'): string {
  const letters = longestWord(text);
  const start = sizes.findIndex((size) => size.className === largest);
  const fitting = sizes.slice(start).find((size) => letters <= size.maxLetters);
  return fitting?.className ?? FALLBACK;
}
