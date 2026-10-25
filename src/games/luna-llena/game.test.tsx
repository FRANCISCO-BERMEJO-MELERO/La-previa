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
  lunaLlenaWitchAction: vi.fn<Action>(),
}));

vi.mock('@/lib/actions', () => mocks);

const texts = copy.lunaLlena;
const ids = lunaIds;

function renderGame(game: Partial<LunaLlenaGameState> = {}, host = true) {
  const base = inLuna(game);
  const snapshot: Snapshot = host
    ? base
    : {
        ...base,
        me: { user_id: ids.fran, name: 'Fran', is_host: false },
        room: { ...base.room, host_id: ids.lucia },
      };
  if (snapshot.game?.type !== 'luna_llena') throw new Error('sin partida de Luna llena');
  const run = vi.fn(async (action: () => Promise<ActionResult<Snapshot>>) => (await action()).ok);
  render(
    <LunaLlenaGame
      snapshot={snapshot}
      game={snapshot.game}
      pill={(label) => <span>{label}</span>}
      notice={null}
      busy={false}
      run={run}
      onChangeGame={vi.fn()}
    />,
  );
  return run;
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
    mock.mockResolvedValue({ ok: true, data: inLuna() });
  }
});

describe('LunaLlenaGame: reparto', () => {
  it('el narrador ve la carta, el guion y da paso a la noche', () => {
    renderGame({ phase: 'roles', narration: { key: 'roles', params: {} } });
    expect(screen.getByRole('heading', { level: 1, name: 'Aldeano' })).toBeInTheDocument();
    expect(screen.getByText(texts.script.roles)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.deal.peek })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.startNight }));
    expect(mocks.lunaLlenaContinue).toHaveBeenCalledWith(inLuna().room.id);
  });

  it('los demás esperan al narrador y no ven el guion', () => {
    renderGame({ phase: 'roles', narration: { key: 'roles', params: {} } }, false);
    expect(screen.getByText(texts.deal.waiting)).toBeInTheDocument();
    expect(screen.queryByText(texts.script.roles)).not.toBeInTheDocument();
  });

  it('quien llegó tarde espera a la siguiente partida', () => {
    renderGame({ my: lunaMy({ is_participant: false, alive: false, role: null }) });
    expect(screen.getByText(copy.late.text)).toBeInTheDocument();
  });
});

describe('LunaLlenaGame: noche', () => {
  it('un aldeano elige de quién sospecha, sin poder elegirse', async () => {
    renderGame();
    expect(screen.getByRole('heading', { name: texts.night.titles.suspect })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Fran/ })).not.toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: texts.night.confirm });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Marta/ }));
    fireEvent.click(confirm);
    await waitFor(() => {
      expect(mocks.lunaLlenaNightAction).toHaveBeenCalledWith(inLuna().room.id, ids.marta, null);
    });
  });

  it('el asesino elige a quién mata', async () => {
    renderGame({ my: lunaMy({ role: 'killer' }) });
    expect(screen.getByRole('heading', { name: texts.night.titles.killer })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lucía/ }));
    fireEvent.click(screen.getByRole('button', { name: texts.night.confirm }));
    await waitFor(() => {
      expect(mocks.lunaLlenaNightAction).toHaveBeenCalledWith(inLuna().room.id, ids.lucia, null);
    });
  });

  it('la bruja ve a la víctima, puede usar las dos pociones a la vez', async () => {
    renderGame({
      my: lunaMy({ role: 'witch', potions: { life: true, poison: true }, wolf_victim: ids.marta }),
    });
    expect(screen.getByRole('heading', { name: texts.night.titles.witch })).toBeInTheDocument();
    expect(screen.getByText(texts.night.witch.victim('Marta'))).toBeInTheDocument();
    const life = screen.getByRole('button', { name: texts.night.witch.life });
    expect(life).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(life);
    expect(life).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Dani/ }));
    fireEvent.click(screen.getByRole('button', { name: texts.night.confirm }));
    await waitFor(() => {
      expect(mocks.lunaLlenaWitchAction).toHaveBeenCalledWith(inLuna().room.id, true, ids.dani);
    });
  });

  it('la bruja puede no usar nada', async () => {
    renderGame({ my: lunaMy({ role: 'witch', potions: { life: true, poison: true } }) });
    expect(screen.getByText(texts.night.witch.undecided)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.night.confirm }));
    await waitFor(() => {
      expect(mocks.lunaLlenaWitchAction).toHaveBeenCalledWith(inLuna().room.id, false, null);
    });
  });

  it('con la de vida gastada no la puede usar ni ve a la víctima', () => {
    renderGame({
      my: lunaMy({ role: 'witch', potions: { life: false, poison: true }, wolf_victim: null }),
    });
    expect(screen.getByRole('button', { name: texts.night.witch.lifeUsed })).toBeDisabled();
    expect(screen.queryByText(texts.night.witch.undecided)).not.toBeInTheDocument();
  });

  it('tras usar sus pociones, la bruja espera y ve lo que ha hecho', () => {
    renderGame({
      my: lunaMy({
        role: 'witch',
        potions: { life: true, poison: true },
        action: { target_id: ids.dani, target2_id: null, use_life: false },
      }),
    });
    expect(screen.getByText(texts.night.witch.done(false, 'Dani'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.night.confirm })).not.toBeInTheDocument();
  });

  it('un aldeano no ve nada de la bruja', () => {
    renderGame({ my: lunaMy({ wolf_victim: null }) });
    expect(screen.queryByRole('button', { name: texts.night.witch.life })).not.toBeInTheDocument();
    expect(screen.queryByText(texts.night.witch.undecided)).not.toBeInTheDocument();
  });

  it('tras actuar espera al amanecer y ve cuántos faltan', () => {
    const { participants } = lunaState();
    renderGame({
      participants: participants.map((participant, index) => ({
        ...participant,
        has_acted: index < 4,
      })),
      my: lunaMy({ action: { target_id: ids.marta, target2_id: null } }),
    });
    expect(screen.getByText(texts.night.done.suspect('Marta'))).toBeInTheDocument();
    expect(screen.getByText(texts.night.waiting)).toBeInTheDocument();
    expect(screen.getByText(texts.night.pending(2))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.night.confirm })).not.toBeInTheDocument();
  });

  it('un lobo ve las marcas de la manada y puede cambiar la suya', () => {
    renderGame({
      my: lunaMy({
        role: 'wolf',
        fellow_wolves: [ids.lucia],
        action: { target_id: ids.marta, target2_id: null },
        wolf_marks: [
          { user_id: ids.fran, target_id: ids.marta },
          { user_id: ids.lucia, target_id: ids.dani },
        ],
      }),
    });
    expect(screen.queryByText('Lucía')).not.toBeInTheDocument();
    expect(screen.getByText(texts.night.marks(['Lucía']))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marta/ })).toHaveAttribute('aria-pressed', 'true');
    const change = screen.getByRole('button', { name: texts.night.changeMark });
    expect(change).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Dani/ }));
    expect(change).toBeEnabled();
  });

  it('Cupido elige a dos la primera noche', async () => {
    renderGame({ my: lunaMy({ role: 'cupid' }) });
    const confirm = screen.getByRole('button', { name: texts.night.confirm });
    fireEvent.click(screen.getByRole('button', { name: /Fran/ }));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Paula/ }));
    fireEvent.click(confirm);
    await waitFor(() => {
      expect(mocks.lunaLlenaNightAction).toHaveBeenCalledWith(
        inLuna().room.id,
        ids.fran,
        ids.paula,
      );
    });
  });

  it('la vidente conserva lo que ha visto', () => {
    renderGame({
      night: 2,
      my: lunaMy({
        role: 'seer',
        action: { target_id: ids.dani, target2_id: null },
        seer_results: [
          { night: 1, user_id: ids.marta, is_wolf: false },
          { night: 2, user_id: ids.dani, is_wolf: true },
        ],
      }),
    });
    expect(screen.getByText(texts.night.seerResult(1, 'Marta', false))).toBeInTheDocument();
    expect(screen.getByText(texts.night.seerResult(2, 'Dani', true))).toBeInTheDocument();
  });

  it('el narrador puede hacer que amanezca y todos pueden volver a ver su carta', () => {
    renderGame();
    expect(screen.getByRole('button', { name: texts.deal.peek })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.narrator.forceDawn }));
    expect(mocks.lunaLlenaCloseNight).toHaveBeenCalledWith(inLuna().room.id);
  });
});

describe('LunaLlenaGame: amanecer', () => {
  const deaths = [
    { user_id: ids.marta, name: 'Marta', role: 'seer', cause: 'night' },
    { user_id: ids.dani, name: 'Dani', role: 'villager', cause: 'heartbreak' },
  ] as const;

  it('enseña a los muertos con su rol y avisa en privado al enamorado', () => {
    renderGame({
      phase: 'dawn',
      announcement: { kind: 'night', deaths: [...deaths], spared: null },
      my: lunaMy({ lover_id: ids.paula }),
    });
    expect(screen.getByText('Marta')).toBeInTheDocument();
    expect(screen.getByText(texts.dawn.causes.night)).toBeInTheDocument();
    expect(screen.getByText(texts.dawn.causes.heartbreak)).toBeInTheDocument();
    expect(screen.getByText(texts.dawn.lover('Paula'))).toBeInTheDocument();
  });

  it('la bruja ve en privado qué han hecho sus pociones y cuáles le quedan', () => {
    renderGame({
      phase: 'dawn',
      night: 2,
      announcement: { kind: 'night', deaths: [...deaths], spared: null },
      my: lunaMy({
        role: 'witch',
        potions: { life: false, poison: true },
        witch_report: { saved_id: ids.paula, poisoned_id: null },
      }),
    });
    expect(screen.getByText(texts.dawn.witchSaved('Paula'))).toBeInTheDocument();
    expect(screen.getByText(texts.dawn.potionsLeft(false, true))).toBeInTheDocument();
  });

  it('quien no es la bruja no recibe aviso de pociones', () => {
    renderGame({
      phase: 'dawn',
      night: 2,
      announcement: { kind: 'night', deaths: [...deaths], spared: null },
    });
    expect(screen.queryByText(/poción|pociones/)).not.toBeInTheDocument();
  });

  it('Cupido sabe a quién enlazó y, sin muertes, la noche es tranquila', () => {
    renderGame({
      phase: 'dawn',
      announcement: { kind: 'night', deaths: [], spared: null },
      my: lunaMy({ role: 'cupid', chosen_lovers: [ids.marta, ids.dani] }),
    });
    expect(screen.getByText(texts.dawn.quietTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.dawn.cupid('Marta', 'Dani'))).toBeInTheDocument();
  });

  it('desde la segunda noche ya no se repite el aviso', () => {
    renderGame({
      phase: 'dawn',
      night: 2,
      announcement: { kind: 'night', deaths: [], spared: null },
      my: lunaMy({ lover_id: ids.paula }),
    });
    expect(screen.queryByText(texts.dawn.lover('Paula'))).not.toBeInTheDocument();
  });
});
