import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lobbySnapshot } from '@/test/fixtures';
import type { ActionResult } from './actions';
import type { Snapshot } from './snapshot';
import { useRoomSync } from './use-room-sync';

const mocks = vi.hoisted(() => {
  const realtime: { handler?: () => void } = {};
  return {
    getRoomState: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
    on: vi.fn(),
    subscribe: vi.fn(),
    removeChannel: vi.fn(),
    realtime,
  };
});

vi.mock('./actions', () => ({ getRoomState: mocks.getRoomState }));

vi.mock('./supabase', () => {
  const channel = {
    on: (event: string, filter: unknown, handler: () => void) => {
      mocks.on(event, filter);
      mocks.realtime.handler = handler;
      return channel;
    },
    subscribe: () => {
      mocks.subscribe();
      return channel;
    },
  };
  return {
    getSupabase: () => ({
      channel: () => channel,
      removeChannel: (c: unknown) => {
        mocks.removeChannel(c);
        return Promise.resolve('ok');
      },
    }),
  };
});

function version(n: number): Snapshot {
  const base = lobbySnapshot();
  return lobbySnapshot({ room: { ...base.room, version: n } });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.getRoomState.mockReset();
  mocks.on.mockReset();
  mocks.subscribe.mockReset();
  mocks.removeChannel.mockReset();
  mocks.getRoomState.mockResolvedValue({ ok: true, data: version(1) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRoomSync', () => {
  it('pide la foto inicial', async () => {
    const { result } = renderHook(() => useRoomSync('sala'));
    expect(result.current.status).toBe('loading');
    await flush();
    expect(mocks.getRoomState).toHaveBeenCalledWith('sala');
    expect(result.current.status).toBe('ready');
  });

  it('se suscribe a los cambios de su fila de rooms y vuelve a pedir la foto con cada evento', async () => {
    renderHook(() => useRoomSync('sala'));
    await flush();
    expect(mocks.on).toHaveBeenCalledWith('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: 'id=eq.sala',
    });
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
    mocks.getRoomState.mockResolvedValue({ ok: true, data: version(2) });
    act(() => {
      mocks.realtime.handler?.();
    });
    await flush();
    expect(mocks.getRoomState).toHaveBeenCalledTimes(2);
  });

  it('vuelve a pedir la foto cada 10 s', async () => {
    renderHook(() => useRoomSync('sala'));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999);
    });
    expect(mocks.getRoomState).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mocks.getRoomState).toHaveBeenCalledTimes(2);
  });

  it('sin conexión reintenta antes y mantiene la última foto', async () => {
    const { result } = renderHook(() => useRoomSync('sala'));
    await flush();
    mocks.getRoomState.mockResolvedValue({ ok: false, error: 'offline' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.offline).toBe(true);
    expect(result.current.snapshot?.room.version).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(mocks.getRoomState).toHaveBeenCalledTimes(3);
  });

  it('pide la foto al volver a primer plano y al recuperar la conexión', async () => {
    renderHook(() => useRoomSync('sala'));
    await flush();
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    await flush();
    expect(mocks.getRoomState).toHaveBeenCalledTimes(3);
  });

  it('aplica la foto de una acción propia y descarta una más antigua', async () => {
    const { result } = renderHook(() => useRoomSync('sala'));
    await flush();
    act(() => {
      result.current.apply(version(5));
    });
    expect(result.current.snapshot?.room.version).toBe(5);
    act(() => {
      result.current.apply(version(4));
    });
    expect(result.current.snapshot?.room.version).toBe(5);
  });

  it('si la sala desaparece deja de pedir la foto', async () => {
    mocks.getRoomState.mockResolvedValue({ ok: false, error: 'room_not_found' });
    const { result } = renderHook(() => useRoomSync('sala'));
    await flush();
    expect(result.current.status).toBe('gone');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mocks.getRoomState).toHaveBeenCalledTimes(1);
  });

  it('al desmontar limpia la suscripción, el sondeo y las escuchas', async () => {
    const { unmount } = renderHook(() => useRoomSync('sala'));
    await flush();
    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mocks.getRoomState).toHaveBeenCalledTimes(1);
  });
});
