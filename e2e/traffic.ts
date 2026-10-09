import type { Page } from '@playwright/test';

/** Todo lo que recibe una página de Supabase: respuestas de la API y mensajes de Realtime. */
export function recordTraffic(page: Page) {
  const received: string[] = [];
  const pending: Promise<void>[] = [];
  page.on('response', (response) => {
    if (!response.url().includes('/rest/v1/') && !response.url().includes('/auth/v1/')) return;
    pending.push(
      response.text().then(
        (body) => {
          received.push(body);
        },
        // Las respuestas sin cuerpo (preflight, redirecciones) no tienen nada que comprobar;
        // que la captura funciona lo asegura la comprobación de "category" más abajo.
        () => undefined,
      ),
    );
  });
  page.on('websocket', (socket) => {
    socket.on('framereceived', (frame) => {
      received.push(String(frame.payload));
    });
  });
  return async () => {
    await Promise.all(pending);
    return received.join('\n');
  };
}
