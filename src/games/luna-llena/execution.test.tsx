import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds } from '@/test/fixtures';
import { LunaLlenaGame } from './LunaLlenaGame';

type Action = (...args: never[]) => Promise<ActionResult<Snapshot>>;

const mocks = vi.hoisted(() => ({
  lunaLlenaContinue: vi.fn<Action>(),
  lunaLlenaCloseNight: vi.fn<Action>(),
  lunaLlenaCloseVote: vi.fn<Action>(),
  lunaLlenaSkipHunter: vi.fn<Action>(),
  lunaLlenaNightAction: vi.fn<Action>(),
  lunaLlenaVote: vi.fn<Action>(),
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

describe('ejecución', () => {
  const votes = [
    { voter_id: ids.lucia, target_id: ids.dani },
    { voter_id: ids.fran, target_id: ids.dani },
    { voter_id: ids.dani, target_id: ids.lucia },
  ];

  it('tras la defensa el narrador ahorca al acusado, sin segunda votación', () => {
    renderGame({ phase: 'defense', accused_id: ids.dani, public_votes: { kind: 'accuse', votes } });
    expect(screen.queryByRole('button', { name: /Condenar|Salvar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.toGallows }));
    expect(mocks.lunaLlenaContinue).toHaveBeenCalledWith(inLuna().room.id);
  });

  it('enseña al ahorcado con su carta y quién votó a quién', () => {
    renderGame({
      phase: 'execution',
      announcement: {
        kind: 'trial',
        spared: null,
        deaths: [{ user_id: ids.dani, name: 'Dani', role: 'wolf', cause: 'hanged' }],
      },
      public_votes: { kind: 'accuse', votes },
    });
    expect(
      screen.getByRole('heading', { level: 1, name: texts.execution.hanged }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lobo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: texts.defense.votesTitle })).toBeInTheDocument();
    expect(screen.getByText('Lucía y Fran')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.next }));
    expect(mocks.lunaLlenaContinue).toHaveBeenCalled();
  });

  it('quien se va de la sala se anuncia sin votos', () => {
    renderGame({
      phase: 'execution',
      announcement: {
        kind: 'left',
        spared: null,
        deaths: [{ user_id: ids.marta, name: 'Marta', role: 'seer', cause: 'left' }],
      },
    });
    expect(screen.getByText(texts.dawn.causes.left)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: texts.defense.votesTitle }),
    ).not.toBeInTheDocument();
  });
});
