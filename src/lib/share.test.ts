import { describe, expect, it, vi } from 'vitest';
import { shareRoomLink } from './share';

const url = 'https://laprevia.app/sala/KTRM';

describe('shareRoomLink', () => {
  it('usa la hoja de compartir del sistema si existe', async () => {
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    await expect(shareRoomLink(url, 'Sala', { share, clipboard: { writeText } })).resolves.toBe(
      'shared',
    );
    expect(share).toHaveBeenCalledWith({ url, title: 'Sala' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('si el jugador cierra la hoja, no copia nada', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('cancelado', 'AbortError')));
    const writeText = vi.fn(() => Promise.resolve());
    await expect(shareRoomLink(url, 'Sala', { share, clipboard: { writeText } })).resolves.toBe(
      'cancelled',
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it('si compartir falla por otra razón, copia el enlace', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('no permitido', 'NotAllowedError')));
    const writeText = vi.fn(() => Promise.resolve());
    await expect(shareRoomLink(url, 'Sala', { share, clipboard: { writeText } })).resolves.toBe(
      'copied',
    );
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it('sin hoja de compartir, copia el enlace al portapapeles', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    await expect(shareRoomLink(url, 'Sala', { clipboard: { writeText } })).resolves.toBe('copied');
  });

  it('si tampoco se puede copiar, lo dice', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('sin permiso')));
    await expect(shareRoomLink(url, 'Sala', { clipboard: { writeText } })).resolves.toBe('failed');
    await expect(shareRoomLink(url, 'Sala', {})).resolves.toBe('failed');
  });
});
