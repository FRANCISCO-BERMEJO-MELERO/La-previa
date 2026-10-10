const alphabet = new Set('ABCDEFGHJKMNPQRSTUVWXYZ');

export const ROOM_CODE_LENGTH = 4;

/** Lo que se escribe en el campo de código: mayúsculas y solo letras del alfabeto de salas. */
export function normalizeCodeInput(raw: string): string {
  return Array.from(raw.toUpperCase())
    .filter((char) => alphabet.has(char))
    .slice(0, ROOM_CODE_LENGTH)
    .join('');
}

export function roomPath(code: string): string {
  return `/sala/${code}`;
}
