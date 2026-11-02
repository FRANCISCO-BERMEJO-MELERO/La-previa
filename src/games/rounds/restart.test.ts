import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import type { Snapshot } from '@/lib/snapshot';
import { lobbySnapshot } from '@/test/fixtures';
import { restartOrLobby } from './restart';

const backToLobby = vi.hoisted(() => vi.fn());
vi.mock('@/lib/actions', () => ({ backToLobby }));

const lobby: ActionResult<Snapshot> = { ok: true, data: lobbySnapshot() };

beforeEach(() => {
  backToLobby.mockReset();
  backToLobby.mockResolvedValue(lobby);
});

describe('restartOrLobby', () => {
  it('si empieza otra, se queda con ella', async () => {
    const started: ActionResult<Snapshot> = { ok: true, data: lobbySnapshot() };
    await expect(restartOrLobby('sala', () => Promise.resolve(started))).resolves.toBe(started);
    expect(backToLobby).not.toHaveBeenCalled();
  });

  it.each(['not_enough_players', 'too_many_players'] as const)(
    'con %s vuelve a la sala de espera',
    async (error) => {
      await expect(
        restartOrLobby('sala', () => Promise.resolve({ ok: false, error })),
      ).resolves.toBe(lobby);
      expect(backToLobby).toHaveBeenCalledWith('sala');
    },
  );

  it('con otro error, lo devuelve tal cual', async () => {
    await expect(
      restartOrLobby('sala', () => Promise.resolve({ ok: false, error: 'offline' })),
    ).resolves.toEqual({ ok: false, error: 'offline' });
    expect(backToLobby).not.toHaveBeenCalled();
  });
});
