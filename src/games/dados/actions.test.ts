import { describe, expect, it, vi } from 'vitest';
import { dadosPlace, dadosStart, type ActionDeps } from '@/lib/actions';
import { inDados } from '@/test/fixtures';

function deps(response: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn<ActionDeps['rpc']>(() => Promise.resolve(response));
  const ensureSession = vi.fn(() => Promise.resolve('u1'));
  return { rpc, ensureSession };
}

describe('acciones de A dados', () => {
  it('llaman a su RPC con sus argumentos', async () => {
    const d = deps({ data: inDados(), error: null });
    await dadosStart('sala', '2v2', { A: ['u1', 'u3'], B: ['u2', 'u4'] }, d);
    await dadosPlace('sala', 2, d);
    expect(d.rpc.mock.calls).toEqual([
      ['dados_start', { room_id: 'sala', mode: '2v2', team_a: ['u1', 'u3'], team_b: ['u2', 'u4'] }],
      ['dados_place', { room_id: 'sala', column_index: 2 }],
    ]);
  });

  it('devuelven la foto validada', async () => {
    const snapshot = inDados();
    const d = deps({ data: snapshot, error: null });
    expect(await dadosPlace('sala', 0, d)).toEqual({ ok: true, data: snapshot });
  });

  it('traducen sus códigos de error', async () => {
    for (const code of [
      'invalid_mode',
      'invalid_teams',
      'not_your_turn',
      'column_full',
      'invalid_column',
    ] as const) {
      const d = deps({ data: null, error: { message: code } });
      expect(await dadosPlace('sala', 0, d)).toEqual({ ok: false, error: code });
    }
  });
});
