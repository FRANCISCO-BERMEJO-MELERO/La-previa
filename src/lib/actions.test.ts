import { afterEach, describe, expect, it, vi } from 'vitest';
import { lobbySnapshot } from '@/test/fixtures';
import {
  createRoom,
  getRoomState,
  joinRoom,
  kickPlayer,
  leaveRoom,
  setGame,
  toActionError,
  type ActionDeps,
} from './actions';

function deps(response: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn<ActionDeps['rpc']>(() => Promise.resolve(response));
  const ensureSession = vi.fn(() => Promise.resolve('u1'));
  return { rpc, ensureSession };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('acciones', () => {
  it('cada acción llama a su RPC con los argumentos de la base de datos', async () => {
    const d = deps({ data: lobbySnapshot(), error: null });
    await createRoom('Fran', d);
    await joinRoom('KTRM', 'Lucía', d);
    await getRoomState('sala', d);
    await setGame('sala', 'impostor', d);
    await kickPlayer('sala', 'u2', d);
    expect(d.rpc.mock.calls).toEqual([
      ['create_room', { name: 'Fran' }],
      ['join_room', { code: 'KTRM', name: 'Lucía' }],
      ['get_room_state', { room_id: 'sala' }],
      ['set_game', { room_id: 'sala', game: 'impostor' }],
      ['kick_player', { room_id: 'sala', user_id: 'u2' }],
    ]);
  });

  it('inicia sesión antes de llamar', async () => {
    const d = deps({ data: lobbySnapshot(), error: null });
    await createRoom('Fran', d);
    expect(d.ensureSession).toHaveBeenCalledTimes(1);
  });

  it('devuelve la foto validada', async () => {
    const snapshot = lobbySnapshot();
    await expect(getRoomState('sala', deps({ data: snapshot, error: null }))).resolves.toEqual({
      ok: true,
      data: snapshot,
    });
  });

  it('una foto que no cumple el contrato es un error inesperado', async () => {
    await expect(getRoomState('sala', deps({ data: { room: 'x' }, error: null }))).resolves.toEqual(
      {
        ok: false,
        error: 'unknown',
      },
    );
  });

  it('traduce el código de error de la base de datos', async () => {
    await expect(
      joinRoom('KTRM', 'Fran', deps({ data: null, error: { message: 'name_taken' } })),
    ).resolves.toEqual({ ok: false, error: 'name_taken' });
  });

  it('salir de la sala no devuelve foto', async () => {
    const d = deps({ data: null, error: null });
    await expect(leaveRoom('sala', d)).resolves.toEqual({ ok: true, data: null });
    expect(d.rpc).toHaveBeenCalledWith('leave_room', { room_id: 'sala' });
  });

  it('si fetch lanza, es falta de conexión', async () => {
    const d = deps({ data: null, error: null });
    d.rpc.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(getRoomState('sala', d)).resolves.toEqual({ ok: false, error: 'offline' });
  });

  it('si no se puede iniciar sesión, lo dice', async () => {
    const d = deps({ data: null, error: null });
    d.ensureSession.mockImplementation(() => Promise.reject(new Error('not_authenticated')));
    await expect(createRoom('Fran', d)).resolves.toEqual({ ok: false, error: 'not_authenticated' });
    expect(d.rpc).not.toHaveBeenCalled();
  });
});

describe('toActionError', () => {
  it('conserva los códigos conocidos', () => {
    expect(toActionError('room_full')).toBe('room_full');
  });

  it('un error técnico desconocido es inesperado', () => {
    expect(toActionError('JWT expired')).toBe('unknown');
  });

  it('sin red siempre es falta de conexión', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(toActionError('JWT expired')).toBe('offline');
  });
});
