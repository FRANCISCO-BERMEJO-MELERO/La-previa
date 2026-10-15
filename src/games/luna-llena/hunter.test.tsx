import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import { LunaLlenaGame } from './LunaLlenaGame';

type Action = (...args: never[]) => Promise<ActionResult<Snapshot>>;

const mocks = vi.hoisted(() => ({
  lunaLlenaContinue: vi.fn<Action>(),
  lunaLlenaCloseNight: vi.fn<Action>(),
  lunaLlenaCloseVote: vi.fn<Action>(),
  lunaLlenaSkipHunter: vi.fn<Action>(),
  lunaLlenaNightAction: vi.fn<Action>(),
  lunaLlenaVote: vi.fn<Action>(),
  lunaLlenaHunterShot: vi.fn<Action>(),
}));

vi.mock('@/lib/actions', () => mocks);

const texts = copy.lunaLlena;
const ids = lunaIds;

function renderGame(game: Partial<LunaLlenaGameState> = {}) {
  const snapshot = inLuna(game);
  if (snapshot.game?.type !== 'luna_llena') throw new Error('sin partida de Luna llena');
  render(
    <LunaLlenaGame
      snapshot={snapshot}
      game={snapshot.game}
      pill={(label) => <span>{label}</span>}
      notice={null}
      busy={false}
      run={async (action) => (await action()).ok}
      onChangeGame={vi.fn()}
    />,
  );
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
    mock.mockResolvedValue({ ok: true, data: inLuna() });
  }
});
describe('cazador', () => {
  const deadHunter = lunaState().participants.map((p) =>
    p.user_id === ids.fran ? { ...p, alive: false, role: 'hunter' as const } : p,
  );

  it('el cazador muerto elige a un vivo y dispara', async () => {
    renderGame({
      phase: 'hunter',
      participants: deadHunter,
      my: lunaMy({ alive: false, role: 'hunter' }),
    });
    expect(screen.getByRole('heading', { name: texts.hunter.title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^\S*\s*Fran/ })).not.toBeInTheDocument();
    const shoot = screen.getByRole('button', { name: texts.hunter.chooseTarget });
    expect(shoot).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Marta/ }));
    fireEvent.click(screen.getByRole('button', { name: texts.hunter.submit('Marta') }));
    await waitFor(() => {
      expect(mocks.lunaLlenaHunterShot).toHaveBeenCalledWith(inLuna().room.id, ids.marta);
    });
  });

  it('los demás esperan su disparo y el narrador puede seguir sin él', () => {
    const hunterIsLucia = lunaState().participants.map((p) =>
      p.user_id === ids.lucia ? { ...p, alive: false, role: 'hunter' as const } : p,
    );
    renderGame({ phase: 'hunter', participants: hunterIsLucia });
    expect(screen.getAllByText(texts.hunter.waiting('Lucía')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.skipHunter }));
    expect(mocks.lunaLlenaSkipHunter).toHaveBeenCalled();
  });
});
