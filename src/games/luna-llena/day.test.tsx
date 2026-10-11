import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import { liveMayorId, lunaPlayers, voteGroups } from './game-view';
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

describe('elección de alcalde', () => {
  it('cualquiera vota a cualquier vivo, a sí mismo incluido', async () => {
    renderGame({ phase: 'mayor', day: 1 });
    expect(screen.getByRole('heading', { name: texts.vote.mayorTitle })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fran/ }));
    fireEvent.click(screen.getByRole('button', { name: texts.vote.submit('Fran') }));
    await waitFor(() => {
      expect(mocks.lunaLlenaVote).toHaveBeenCalledWith(inLuna().room.id, ids.fran);
    });
  });

  it('tras votar solo ve su voto y cuántos faltan', () => {
    const { participants } = lunaState();
    renderGame({
      phase: 'mayor',
      day: 1,
      participants: participants.map((p, index) => ({ ...p, has_acted: index < 5 })),
      my: lunaMy({ vote: { target_id: ids.marta, condemn: null } }),
    });
    expect(screen.getByText(texts.vote.voted('Marta'))).toBeInTheDocument();
    expect(screen.getByText(texts.vote.pending(1))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Votar a/ })).not.toBeInTheDocument();
  });
});

describe('debate y acusación', () => {
  it('tras elegir alcalde se ve cómo votó cada uno, sin voto doble', () => {
    renderGame({
      phase: 'day',
      day: 1,
      mayor_id: ids.lucia,
      public_votes: {
        kind: 'mayor',
        votes: [
          { voter_id: ids.lucia, target_id: ids.lucia, condemn: null },
          { voter_id: ids.fran, target_id: ids.lucia, condemn: null },
        ],
      },
    });
    expect(screen.getByRole('heading', { name: texts.day.mayorVotesTitle })).toBeInTheDocument();
    expect(screen.getByText('Lucía y Fran')).toBeInTheDocument();
    expect(screen.getByText(texts.defense.votes(2))).toBeInTheDocument();
  });

  it('el debate pide los móviles boca abajo y dice quién es el alcalde', () => {
    renderGame({ phase: 'day', day: 1, mayor_id: ids.lucia });
    expect(screen.getByRole('heading', { name: texts.day.title })).toBeInTheDocument();
    expect(screen.getByText(texts.day.mayor('Lucía'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.openVoting }));
    expect(mocks.lunaLlenaContinue).toHaveBeenCalled();
  });

  it('al acusar nadie se elige a sí mismo y el alcalde lleva su distintivo', () => {
    renderGame({ phase: 'voting', day: 1, mayor_id: ids.lucia });
    expect(screen.queryByRole('button', { name: /^\S*\s*Fran/ })).not.toBeInTheDocument();
    const lucia = screen.getByRole('button', { name: /Lucía/ });
    expect(within(lucia).getByText(texts.mayorBadge)).toBeInTheDocument();
  });

  it('un alcalde muerto ya no lleva distintivo', () => {
    const { participants } = lunaState();
    const game = lunaState({
      mayor_id: ids.lucia,
      participants: participants.map((p) => (p.user_id === ids.lucia ? { ...p, alive: false } : p)),
    });
    expect(liveMayorId(game, lunaPlayers(inLuna(), game))).toBeNull();
  });
});

describe('defensa', () => {
  const votes = [
    { voter_id: ids.lucia, target_id: ids.marta, condemn: null },
    { voter_id: ids.fran, target_id: ids.dani, condemn: null },
    { voter_id: ids.alvaro, target_id: ids.dani, condemn: null },
  ];

  it('agrupa los votos por acusado contando doble el del alcalde', () => {
    const game = lunaState({
      phase: 'defense',
      mayor_id: ids.lucia,
      public_votes: { kind: 'accuse', votes },
    });
    const groups = voteGroups(game, lunaPlayers(inLuna(), game), 'accuse');
    expect(groups.map((group) => [group.name, group.weight])).toEqual([
      ['Marta', 2],
      ['Dani', 2],
    ]);
    expect(groups[0]?.voters).toEqual([{ name: 'Lucía', double: true }]);
  });

  it('enseña quién votó a quién y al acusado', () => {
    renderGame({
      phase: 'defense',
      accused_id: ids.dani,
      public_votes: { kind: 'accuse', votes },
    });
    expect(
      screen.getByRole('heading', { name: texts.defense.accused('Dani') }),
    ).toBeInTheDocument();
    expect(screen.getByText(texts.defense.speak('Dani'))).toBeInTheDocument();
    expect(screen.getByText('Fran y Álvaro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.toVerdict }));
    expect(mocks.lunaLlenaContinue).toHaveBeenCalled();
  });

  it('el acusado sabe que le toca defenderse y sin acusado se dice', () => {
    renderGame({ phase: 'defense', accused_id: ids.fran, public_votes: { kind: 'accuse', votes } });
    expect(screen.getByText(texts.defense.youSpeak)).toBeInTheDocument();
  });

  it('sin acusado no hay juicio', () => {
    renderGame({ phase: 'defense', accused_id: null, public_votes: { kind: 'accuse', votes: [] } });
    expect(screen.getByRole('heading', { name: texts.defense.noAccused })).toBeInTheDocument();
    expect(screen.getByText(texts.defense.noVotes)).toBeInTheDocument();
  });
});
