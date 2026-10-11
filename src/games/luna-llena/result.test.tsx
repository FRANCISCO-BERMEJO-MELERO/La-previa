import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import { hasWon } from './game-view';
import { LunaLlenaGame } from './LunaLlenaGame';

type Action = (...args: never[]) => Promise<ActionResult<Snapshot>>;

const mocks = vi.hoisted(() => ({
  lunaLlenaContinue: vi.fn<Action>(),
  lunaLlenaCloseNight: vi.fn<Action>(),
  lunaLlenaCloseVote: vi.fn<Action>(),
  lunaLlenaSkipHunter: vi.fn<Action>(),
  lunaLlenaNightAction: vi.fn<Action>(),
  lunaLlenaVote: vi.fn<Action>(),
  lunaLlenaStart: vi.fn<Action>(),
  backToLobby: vi.fn<Action>(),
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
describe('resultado', () => {
  const roles = [
    { user_id: ids.fran, role: 'villager' as const },
    { user_id: ids.lucia, role: 'wolf' as const },
    { user_id: ids.alvaro, role: 'seer' as const },
    { user_id: ids.marta, role: 'jester' as const },
    { user_id: ids.dani, role: 'cupid' as const },
    { user_id: ids.paula, role: 'villager' as const },
  ];
  const finished = (
    winner: 'village' | 'wolves' | 'jester',
    role: (typeof roles)[number]['role'],
  ) =>
    lunaState({
      phase: 'finished',
      my: lunaMy({ role }),
      result: { winner, roles, lovers: [ids.dani, ids.paula] },
      narration: { key: `win_${winner}`, params: {} },
    });

  it('el titular es personal según el bando', () => {
    expect(hasWon(finished('village', 'cupid'))).toBe(true);
    expect(hasWon(finished('village', 'jester'))).toBe(false);
    expect(hasWon(finished('village', 'wolf'))).toBe(false);
    expect(hasWon(finished('wolves', 'wolf'))).toBe(true);
    expect(hasWon(finished('jester', 'jester'))).toBe(true);
    expect(hasWon(finished('jester', 'villager'))).toBe(false);
    expect(
      hasWon({
        ...finished('village', 'villager'),
        my: lunaMy({ is_participant: false, role: null }),
      }),
    ).toBeNull();
  });

  it('enseña el bando ganador, todos los roles y los enamorados', () => {
    const game = finished('wolves', 'villager');
    renderGame(game);
    expect(screen.getByRole('heading', { level: 1, name: copy.result.lost })).toBeInTheDocument();
    expect(screen.getByText(texts.result.winner.wolves)).toBeInTheDocument();
    expect(screen.getByText(texts.result.lovers('Dani', 'Paula'))).toBeInTheDocument();
    expect(screen.getByText('Lobo')).toBeInTheDocument();
    expect(screen.getByText('Bufón')).toBeInTheDocument();
    expect(screen.getByText(texts.script.winWolves)).toBeInTheDocument();
  });

  it('el anfitrión vuelve a jugar con la misma composición', async () => {
    renderGame({ ...finished('village', 'villager'), config: { wolves: 1, roles: ['hunter'] } });
    fireEvent.click(screen.getByRole('button', { name: copy.result.playAgain }));
    await waitFor(() => {
      expect(mocks.lunaLlenaStart).toHaveBeenCalledWith(inLuna().room.id, {
        wolves: 1,
        roles: ['hunter'],
      });
    });
  });

  it('si la composición ya no vale, vuelve a jugar con la recomendada', async () => {
    mocks.lunaLlenaStart.mockResolvedValueOnce({ ok: false, error: 'invalid_config' });
    renderGame(finished('village', 'villager'));
    fireEvent.click(screen.getByRole('button', { name: copy.result.playAgain }));
    await waitFor(() => {
      expect(mocks.lunaLlenaStart).toHaveBeenLastCalledWith(inLuna().room.id, null);
    });
  });
});
