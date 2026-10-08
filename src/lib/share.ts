export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/**
 * Comparte el enlace con la hoja del sistema si existe y, si no, lo copia al portapapeles
 * (docs/CONTEXTO.md §6, "QR y enlace").
 */
export async function shareRoomLink(
  url: string,
  title: string,
  nav: ShareNavigator = navigator,
): Promise<ShareOutcome> {
  if (nav.share) {
    try {
      await nav.share({ url, title });
      return 'shared';
    } catch (error) {
      // Cerrar la hoja de compartir no es un fallo: el jugador ha cambiado de idea.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  if (!nav.clipboard) return 'failed';
  try {
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
