import { roomCodeSchema } from './snapshot';

/**
 * Código de sala de lo que ha leído el escáner: el enlace que dibuja "Mostrar QR"
 * (`https://…/sala/ABCD`) o las cuatro letras a secas. Cualquier otra cosa no es una sala.
 */
export function roomCodeFromScan(text: string): string | null {
  const trimmed = text.trim();
  const fromUrl = /\/sala\/([^/?#]+)\/?(?:[?#].*)?$/.exec(trimmed)?.[1];
  const candidate = (fromUrl ?? trimmed).toUpperCase();
  const parsed = roomCodeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
