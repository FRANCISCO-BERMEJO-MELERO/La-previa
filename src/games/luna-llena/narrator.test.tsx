import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { copy } from '@/lib/copy';
import { lunaIds, lunaState } from '@/test/fixtures';
import { narratorAction } from './narrator';
import { NarratorBox } from './NarratorBox';

const labels = copy.lunaLlena.narrator;

describe('narratorAction', () => {
  it.each([
    ['roles', 'continue', labels.startNight],
    ['night', 'close_night', labels.forceDawn],
    ['dawn', 'continue', labels.next],
    ['hunter', 'skip_hunter', labels.skipHunter],
    ['mayor', 'close_vote', labels.closeVote],
    ['day', 'continue', labels.openVoting],
    ['voting', 'close_vote', labels.closeVote],
    ['verdict', 'close_vote', labels.closeVote],
    ['execution', 'continue', labels.next],
  ] as const)('en %s el botón hace %s', (phase, step, label) => {
    expect(narratorAction(lunaState({ phase }))).toEqual({ step, label });
  });

  it('en la defensa, con acusado se pasa al veredicto y sin él cae la noche', () => {
    expect(narratorAction(lunaState({ phase: 'defense', accused_id: lunaIds.lucia }))).toEqual({
      step: 'continue',
      label: labels.toVerdict,
    });
    expect(narratorAction(lunaState({ phase: 'defense', accused_id: null }))).toEqual({
      step: 'continue',
      label: labels.startNight,
    });
  });

  it('al terminar no hay botón de avanzar', () => {
    expect(narratorAction(lunaState({ phase: 'finished' }))).toBeNull();
  });
});

describe('NarratorBox', () => {
  it('pide leer en voz alta el guion y avanza con su botón', () => {
    const onAction = vi.fn();
    render(
      <NarratorBox
        lines={['Primera frase.', 'Segunda frase.']}
        actionLabel={labels.next}
        busy={false}
        onAction={onAction}
      />,
    );
    expect(screen.getByRole('region', { name: labels.title })).toBeInTheDocument();
    expect(screen.getByText('Primera frase.')).toBeInTheDocument();
    expect(screen.getByText('Segunda frase.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: labels.next }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('mientras avanza no se puede pulsar otra vez y enseña el error', () => {
    render(
      <NarratorBox
        lines={['Frase.']}
        actionLabel={labels.next}
        busy
        error="Algo ha fallado."
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: labels.next })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Algo ha fallado.');
  });

  it('sin acción solo se lee', () => {
    render(<NarratorBox lines={['Frase.']} actionLabel={null} busy={false} onAction={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
