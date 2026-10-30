import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { copy } from '@/lib/copy';
import { transitionOf } from '@/lib/motion';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds, lunaMy } from '@/test/fixtures';
import { CardPeek } from './CardPeek';
import { DawnScreen } from './DawnScreen';
import { VoteGroupList } from './DayScreens';
import { ExecutionScreen } from './ExecutionScreen';
import { LunaLlenaGame } from './LunaLlenaGame';
import { ResultScreen } from './ResultScreen';
import { lunaRoles, type LunaRole } from './roles';

const chrome = { aside: null, notice: null, footer: null };
const texts = copy.lunaLlena;

const death = (user_id: string, name: string) =>
  ({ user_id, name, role: 'villager', cause: 'night' }) as const;

function renderGame(previous: Partial<LunaLlenaGameState>, next: Partial<LunaLlenaGameState>) {
  const before = inLuna(previous);
  const snapshot: Snapshot = inLuna(next);
  if (snapshot.game?.type !== 'luna_llena') throw new Error('sin partida de El lobo');
  return render(
    <LunaLlenaGame
      snapshot={snapshot}
      game={snapshot.game}
      pill={(label) => <span>{label}</span>}
      notice={null}
      busy={false}
      run={vi.fn()}
      onChangeGame={vi.fn()}
      transition={transitionOf(before, snapshot, false)}
    />,
  );
}

describe('El lobo en movimiento', () => {
  it.each(lunaRoles)('al anochecer baja el mismo telón para el rol %s', (role: LunaRole) => {
    const { unmount } = renderGame(
      { phase: 'roles', night: 0, my: lunaMy({ role }) },
      { phase: 'night', night: 1, my: lunaMy({ role }) },
    );
    expect(screen.getByTestId('curtain')).toHaveClass('animate-telon-noche');
    expect(screen.getByTestId('curtain')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('curtain')).toHaveClass('pointer-events-none');
    // La pantalla de noche no lleva ninguna animación propia: solo el telón.
    expect(document.querySelectorAll('[class*="animate-"]')).toHaveLength(2);
    unmount();
  });

  it('al amanecer sube el telón y caen los muertos con su sello, en orden', () => {
    renderGame(
      { phase: 'night', night: 1 },
      {
        phase: 'dawn',
        night: 1,
        announcement: {
          kind: 'night',
          spared: null,
          deaths: [death(lunaIds.marta, 'Marta'), death(lunaIds.dani, 'Dani')],
        },
      },
    );
    expect(screen.getByTestId('curtain')).toHaveClass('animate-telon-amanecer');
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveClass('animate-caer');
    expect(rows[1]).toHaveClass('animate-caer');
    const stamps = screen.getAllByText(texts.dawn.deadStamp);
    expect(stamps).toHaveLength(2);
    for (const stamp of stamps) expect(stamp).toHaveClass('animate-sello');
  });

  it('un amanecer tranquilo hace caer una sola fila con sello lime', () => {
    render(
      <DawnScreen {...chrome} deaths={[]} secrets={['Te queda la poción de vida.']} animate />,
    );
    const quiet = screen.getByText(texts.dawn.quietText);
    expect(quiet).toHaveClass('animate-caer', 'bg-lime');
    // Los avisos privados no se animan.
    expect(screen.getByText('Te queda la poción de vida.').className).not.toContain('animate-');
  });

  it('quieto, el amanecer no se mueve', () => {
    render(<DawnScreen {...chrome} deaths={[death(lunaIds.marta, 'Marta')]} secrets={[]} />);
    expect(document.querySelector('[class*="animate-"]')).toBeNull();
    expect(screen.getByText(texts.dawn.deadStamp)).toBeInTheDocument();
  });

  it('al cerrar la votación las filas caen, cuentan y la destacada salta al final', () => {
    const groups = [
      { targetId: 'a', name: 'Dani', weight: 3, voters: [{ name: 'Fran', double: false }] },
      { targetId: 'b', name: 'Marta', weight: 1, voters: [{ name: 'Lucía', double: false }] },
    ];
    render(<VoteGroupList groups={groups} highlightId="a" animate />);
    const [first, second] = screen.getAllByRole('listitem');
    expect(first).toHaveClass('animate-caer', 'anim-delay-0');
    expect(second).toHaveClass('animate-caer');
    expect(first?.firstElementChild).toHaveClass('animate-salto', 'bg-tomato');
    expect(second?.firstElementChild).not.toHaveClass('animate-salto');
    expect(within(first ?? document.body).getByText(texts.defense.votes(3))).toHaveClass('sr-only');
  });

  it('el veredicto planta «Ahorcado» sobre el ahorcado', () => {
    render(
      <ExecutionScreen
        {...chrome}
        deaths={[{ ...death(lunaIds.dani, 'Dani'), cause: 'hanged' }]}
        groups={[]}
        left={false}
        verdict
        fallen={[lunaIds.dani]}
      />,
    );
    expect(
      screen.getByText(texts.dawn.causes.hanged, { selector: 'span.animate-sello' }),
    ).toBeInTheDocument();
  });

  it('el resultado sella el titular y los roles caen de uno en uno', () => {
    const rows = [
      { userId: 'a', name: 'Dani', role: 'wolf', alive: false },
      { userId: 'b', name: 'Marta', role: 'seer', alive: true },
    ] as const;
    render(<ResultScreen {...chrome} winner="village" won rows={rows} lovers={null} animate />);
    expect(screen.getByText(copy.result.won)).toHaveClass('animate-sello');
    for (const row of screen.getAllByRole('listitem')) expect(row).toHaveClass('animate-caer');
  });

  it.each(['wolf', 'villager'] as const)('la carta del rol %s gira igual al mirarla', (role) => {
    render(<CardPeek role={role} pack={[]} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: texts.deal.peek }));
    expect(screen.getByTestId('card-flip')).toHaveClass('animate-girar');
  });
});
