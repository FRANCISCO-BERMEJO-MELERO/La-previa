import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from './use-wake-lock';

type FakeLock = { released: boolean; release: () => Promise<void> };

function installWakeLock({ deny = false }: { deny?: boolean } = {}) {
  const locks: FakeLock[] = [];
  const request = vi.fn(() => {
    if (deny) return Promise.reject(new DOMException('denegado', 'NotAllowedError'));
    const lock: FakeLock = {
      released: false,
      release: vi.fn(() => {
        lock.released = true;
        return Promise.resolve();
      }),
    };
    locks.push(lock);
    return Promise.resolve(lock);
  });
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
  return { request, locks };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('useWakeLock', () => {
  it('pide mantener la pantalla encendida mientras está activo', async () => {
    const { request } = installWakeLock();
    renderHook(() => {
      useWakeLock(true);
    });
    await flush();
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('no pide nada si no está activo', () => {
    const { request } = installWakeLock();
    renderHook(() => {
      useWakeLock(false);
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('lo vuelve a pedir al volver a primer plano si el navegador lo soltó', async () => {
    const { request, locks } = installWakeLock();
    renderHook(() => {
      useWakeLock(true);
    });
    await flush();
    const first = locks[0];
    if (first) first.released = true;
    setVisibility('hidden');
    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('no repite la petición si sigue teniéndolo', async () => {
    const { request } = installWakeLock();
    renderHook(() => {
      useWakeLock(true);
    });
    await flush();
    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('lo suelta al desmontar', async () => {
    const { locks } = installWakeLock();
    const { unmount } = renderHook(() => {
      useWakeLock(true);
    });
    await flush();
    unmount();
    expect(locks[0]?.released).toBe(true);
  });

  it('si se deniega, sigue sin él y sin romper nada', async () => {
    const { request } = installWakeLock({ deny: true });
    renderHook(() => {
      useWakeLock(true);
    });
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('si el navegador no lo soporta, no hace nada', () => {
    expect(() =>
      renderHook(() => {
        useWakeLock(true);
      }),
    ).not.toThrow();
  });
});
