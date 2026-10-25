import { render, screen } from '@testing-library/react';
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
describe('espectador', () => {
  const dead = lunaState().participants.map((p) =>
    p.user_id === ids.fran ? { ...p, alive: false, role: 'villager' as const } : p,
  );
  const spectator = {
    roles: [
      { user_id: ids.fran, role: 'villager' as const },
      { user_id: ids.lucia, role: 'wolf' as const },
      { user_id: ids.alvaro, role: 'seer' as const },
      { user_id: ids.marta, role: 'cupid' as const },
      { user_id: ids.dani, role: 'villager' as const },
      { user_id: ids.paula, role: 'villager' as const },
    ],
    lovers: [ids.dani, ids.paula],
    actions: [
      { user_id: ids.lucia, target_id: ids.alvaro, target2_id: null },
      { user_id: ids.marta, target_id: ids.dani, target2_id: ids.paula },
    ],
    causes: null,
    potions: null,
  };

  it('ve la acción de la bruja, sus pociones y la causa real de cada muerte', () => {
    renderGame({
      phase: 'dawn',
      participants: dead,
      my: lunaMy({ alive: false }),
      announcement: {
        kind: 'night',
        deaths: [{ user_id: ids.fran, name: 'Fran', role: 'villager', cause: 'night' }],
        spared: null,
      },
      spectator: {
        ...spectator,
        causes: [{ user_id: ids.fran, cause: 'poison' }],
        potions: { life: true, poison: false },
      },
    });
    expect(screen.getByText(texts.dawn.causes.poison)).toBeInTheDocument();
    expect(screen.queryByText(texts.dawn.causes.night)).not.toBeInTheDocument();
    expect(screen.getByText(texts.spectator.potions(true, false))).toBeInTheDocument();
  });

  it('de noche ve lo que hace la bruja', () => {
    renderGame({
      participants: dead,
      my: lunaMy({ alive: false }),
      spectator: {
        ...spectator,
        actions: [{ user_id: ids.dani, target_id: ids.lucia, target2_id: null, use_life: true }],
      },
    });
    expect(screen.getByText(texts.spectator.witch('Dani', true, 'Lucía'))).toBeInTheDocument();
  });

  it('de noche ve todos los roles, los enamorados y lo que marca cada uno', () => {
    renderGame({ participants: dead, my: lunaMy({ alive: false }), spectator });
    expect(screen.getByRole('heading', { name: texts.spectator.title })).toBeInTheDocument();
    expect(screen.getByText(texts.spectator.text)).toBeInTheDocument();
    expect(screen.getByText(texts.spectator.lovers('Dani', 'Paula'))).toBeInTheDocument();
    expect(screen.getByText(texts.spectator.action('Lucía', 'Álvaro'))).toBeInTheDocument();
    expect(screen.getByText(texts.spectator.pair('Marta', 'Dani', 'Paula'))).toBeInTheDocument();
    expect(screen.getByText('Lobo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.deal.peek })).not.toBeInTheDocument();
  });

  it('de día no hay acciones de noche que enseñar', () => {
    renderGame({ phase: 'day', participants: dead, my: lunaMy({ alive: false }), spectator });
    expect(
      screen.queryByRole('heading', { name: texts.spectator.actionsTitle }),
    ).not.toBeInTheDocument();
  });

  it('el narrador muerto sigue narrando', () => {
    renderGame({ participants: dead, my: lunaMy({ alive: false }), spectator });
    expect(screen.getByRole('button', { name: texts.narrator.forceDawn })).toBeInTheDocument();
  });
});
