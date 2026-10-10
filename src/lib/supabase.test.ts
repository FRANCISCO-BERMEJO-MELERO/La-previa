import { describe, expect, it, vi } from 'vitest';
import { ensureSession, type SessionAuth } from './supabase';

function fakeAuth({
  sessionUserId,
  signInUserId = 'nuevo',
  signInFails = false,
}: {
  sessionUserId?: string;
  signInUserId?: string;
  signInFails?: boolean;
}) {
  const signInAnonymously = vi.fn(() =>
    Promise.resolve(
      signInFails
        ? { data: { user: null }, error: new Error('auth caído') }
        : { data: { user: { id: signInUserId } }, error: null },
    ),
  );
  const auth: SessionAuth = {
    getSession: () =>
      Promise.resolve({
        data: { session: sessionUserId ? { user: { id: sessionUserId } } : null },
      }),
    signInAnonymously,
  };
  return { auth, signInAnonymously };
}

describe('ensureSession', () => {
  it('reutiliza la sesión guardada sin crear otra', async () => {
    const { auth, signInAnonymously } = fakeAuth({ sessionUserId: 'u1' });
    await expect(ensureSession(auth)).resolves.toBe('u1');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('inicia sesión anónima si no hay sesión', async () => {
    const { auth, signInAnonymously } = fakeAuth({ signInUserId: 'u2' });
    await expect(ensureSession(auth)).resolves.toBe('u2');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('las llamadas simultáneas comparten un único inicio de sesión', async () => {
    const { auth, signInAnonymously } = fakeAuth({ signInUserId: 'u3' });
    const ids = await Promise.all([ensureSession(auth), ensureSession(auth), ensureSession(auth)]);
    expect(ids).toEqual(['u3', 'u3', 'u3']);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('falla con not_authenticated si el inicio anónimo falla, y se puede reintentar', async () => {
    const { auth, signInAnonymously } = fakeAuth({ signInFails: true });
    await expect(ensureSession(auth)).rejects.toThrow('not_authenticated');
    await expect(ensureSession(auth)).rejects.toThrow('not_authenticated');
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });
});
