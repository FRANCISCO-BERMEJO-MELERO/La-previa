import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import { lunaPlayers, verdictSides } from './game-view';
import { LunaLlenaGame } from './LunaLlenaGame';

type Action = (...args: never[]) => Promise<ActionResult<Snapshot>>;

const mocks = vi.hoisted(() => ({
  lunaLlenaContinue: vi.fn<Action>(),
  lunaLlenaCloseNight: vi.fn<Action>(),
  lunaLlenaCloseVote: vi.fn<Action>(),
  lunaLlenaSkipHunter: vi.fn<Action>(),
  lunaLlenaNightAction: vi.fn<Action>(),
  lunaLlenaVote: vi.fn<Action>(),
  lunaLlenaVerdict: vi.fn<Action>(),
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
    />,
  );
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
    mock.mockResolvedValue({ ok: true, data: inLuna() });
  }
});

describe('veredicto', () => {
  it('se condena o se salva con dos botones', async () => {
    renderGame({ phase: 'verdict', day: 1, accused_id: ids.dani });
    expect(screen.getByRole('heading', { name: texts.verdict.title('Dani') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.verdict.spare }));
    await waitFor(() => {
      expect(mocks.lunaLlenaVerdict).toHaveBeenCalledWith(inLuna().room.id, false);
    });
  });

  it('tras votar se espera, sin ver los votos ajenos', () => {
    renderGame({
      phase: 'verdict',
      accused_id: ids.dani,
      my: lunaMy({ vote: { target_id: null, condemn: true } }),
    });
    expect(screen.getByText(texts.verdict.voted(true))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.verdict.condemn })).not.toBeInTheDocument();
  });

  it('el acusado no vota', () => {
    renderGame({ phase: 'verdict', accused_id: ids.fran });
    expect(screen.getByRole('heading', { name: texts.verdict.accusedTitle })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.verdict.condemn })).not.toBeInTheDocument();
  });
});

describe('ejecución', () => {
  const votes = [
    { voter_id: ids.lucia, target_id: null, condemn: true },
    { voter_id: ids.fran, target_id: null, condemn: false },
  ];

  it('separa quién condenó y quién salvó, con el alcalde marcado', () => {
    const game = lunaState({
      phase: 'execution',
      mayor_id: ids.lucia,
      public_votes: { kind: 'verdict', votes },
    });
    expect(verdictSides(game, lunaPlayers(inLuna(), game))).toEqual({
      condemn: [`Lucía ${texts.defense.double}`],
      spare: ['Fran'],
    });
  });

  it('enseña al ahorcado con su carta y los votos', () => {
    renderGame({
      phase: 'execution',
      announcement: {
        kind: 'trial',
        spared: null,
        deaths: [{ user_id: ids.dani, name: 'Dani', role: 'wolf', cause: 'hanged' }],
      },
      public_votes: { kind: 'verdict', votes },
    });
    expect(screen.getByRole('heading', { name: texts.execution.hanged })).toBeInTheDocument();
    expect(screen.getByText('Dani')).toBeInTheDocument();
    expect(screen.getByText('Lobo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: texts.execution.condemnVotes })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.next }));
    expect(mocks.lunaLlenaContinue).toHaveBeenCalled();
  });

  it('o que el acusado se salva', () => {
    renderGame({
      phase: 'execution',
      announcement: { kind: 'trial', spared: 'Dani', deaths: [] },
      public_votes: { kind: 'verdict', votes },
    });
    expect(
      screen.getByRole('heading', { name: texts.execution.spared('Dani') }),
    ).toBeInTheDocument();
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
      screen.queryByRole('heading', { name: texts.execution.condemnVotes }),
    ).not.toBeInTheDocument();
  });
});
