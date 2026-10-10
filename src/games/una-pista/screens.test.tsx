import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import { ids, inPista, pistaState } from '@/test/fixtures';
import { ClueList } from './ClueList';
import { clueRows, nameOf, type ClueRow } from './game-view';
import {
  ClueScreen,
  GuesserScreen,
  GuessScreen,
  GuessWaitScreen,
  MarkControls,
  ResultScreen,
  RevealScreen,
} from './screens';

const chrome = {
  aside: <span>Ronda 2 de 10</span>,
  notice: null,
  footer: <p>pie</p>,
};

function p(name: string): Player {
  return {
    userId: `id-${name}`,
    name,
    joinIndex: 0,
    active: true,
    score: 0,
    hasResponded: false,
    connected: true,
  };
}

function row(text: string, author: string | null, cancelled = false): ClueRow {
  return { author: author ? p(author) : null, text, cancelled };
}

describe('datos de una_pista', () => {
  it('las pistas llevan autor si la foto lo da', () => {
    const game = pistaState({
      phase: 'review',
      clues: [
        { user_id: ids.fran, text: 'frío', cancelled: true },
        { user_id: ids.alvaro, text: 'hielo', cancelled: false },
      ],
    });
    expect(
      clueRows(inPista(), game).map((clue) => [clue.author?.name, clue.text, clue.cancelled]),
    ).toEqual([
      ['Fran', 'frío', true],
      ['Álvaro', 'hielo', false],
    ]);
    expect(nameOf(inPista(), game, game.arbiter_id)).toBe('Fran');
  });

  it('para el adivino, sin autor y vivas', () => {
    const game = pistaState({ phase: 'guessing', clues: [{ text: 'hielo' }] });
    expect(clueRows(inPista(), game)).toEqual([{ author: null, text: 'hielo', cancelled: false }]);
  });
});

describe('pantallas de una_pista', () => {
  it('el adivino espera sin mirar', () => {
    render(<GuesserScreen {...chrome} reviewing />);
    expect(screen.getByRole('heading', { name: 'Te toca adivinar' })).toBeInTheDocument();
    expect(screen.getByText('Los demás están revisando las pistas.')).toBeInTheDocument();
  });

  it('quien da pista ve la palabra y escribe una de hasta 20', () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn<(value: string) => void>();
    render(
      <ClueScreen
        aside={chrome.aside}
        notice={null}
        word="Pingüino"
        category="Animales"
        value="frío"
        busy={false}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pingüino');
    expect(screen.getByText('Categoría: Animales')).toBeInTheDocument();
    const field = screen.getByLabelText('Tu pista');
    expect(field).toHaveAttribute('maxLength', '20');
    fireEvent.change(field, { target: { value: 'hielo' } });
    expect(onChange).toHaveBeenCalledWith('hielo');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pista' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('la revisión deja anular y recuperar pistas a quien ha dado una', () => {
    const onToggle = vi.fn<(id: string) => void>();
    render(
      <ClueList clues={[row('frío', 'Fran', true), row('hielo', 'Álvaro')]} onToggle={onToggle} />,
    );
    expect(screen.getByText('Anulada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recuperar la pista de Fran: frío' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anular la pista de Álvaro: hielo' }));
    expect(onToggle.mock.calls).toEqual([['id-Fran'], ['id-Álvaro']]);
  });

  it('sin poder anular, las pistas no son botones', () => {
    render(<ClueList clues={[row('hielo', 'Álvaro')]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('el adivino ve sus pistas, o que no le queda ninguna', () => {
    const { unmount } = render(<GuessScreen {...chrome} clues={[row('hielo', null)]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tus pistas');
    expect(screen.getByText('hielo')).toBeInTheDocument();
    expect(screen.getByText('Di tu respuesta en voz alta.')).toBeInTheDocument();
    unmount();
    render(<GuessScreen {...chrome} clues={[]} />);
    expect(screen.getByText(/Todas las pistas se han anulado/)).toBeInTheDocument();
  });

  it('una pista larga va más pequeña y sin mayúsculas para caber en una línea', () => {
    render(
      <GuessScreen {...chrome} clues={[row('hielo', null), row('Supercalifragilisti', null)]} />,
    );
    expect(screen.getByText('hielo')).toHaveClass('uppercase');
    expect(screen.getByText('Supercalifragilisti')).toHaveClass('text-base');
    expect(screen.getByText('Supercalifragilisti')).not.toHaveClass('uppercase');
  });

  it('el árbitro marca acertada, fallada o pasa; los demás esperan', () => {
    const onMark = vi.fn<(result: 'correct' | 'wrong' | 'pass') => void>();
    const { unmount } = render(
      <MarkControls isArbiter waiting="Fran marcará la respuesta" busy={false} onMark={onMark} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Acertada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fallada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pasa' }));
    expect(onMark.mock.calls).toEqual([['correct'], ['wrong'], ['pass']]);
    unmount();
    render(
      <MarkControls
        isArbiter={false}
        waiting="Fran marcará la respuesta"
        busy={false}
        onMark={onMark}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Fran marcará la respuesta');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mientras el adivino piensa, los demás ven la palabra como encabezado y las pistas', () => {
    render(
      <GuessWaitScreen
        {...chrome}
        word="Pingüino"
        category="Animales"
        clues={[row('hielo', 'Álvaro')]}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pingüino');
    expect(screen.getByText('hielo')).toBeInTheDocument();
  });

  it('la revelación enseña la palabra, cómo ha ido y todas las pistas', () => {
    render(
      <RevealScreen
        {...chrome}
        word="Pingüino"
        result="correct"
        clues={[row('frío', 'Fran', true), row('hielo', 'Álvaro')]}
      />,
    );
    expect(screen.getByText('¡Acertada!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pingüino' })).toBeInTheDocument();
    expect(screen.getByText('frío')).toBeInTheDocument();
    expect(screen.getByText('Álvaro')).toBeInTheDocument();
  });

  it.each([
    [10, 10, '¡Pleno!'],
    [8, 10, 'Muy bien.'],
    [7, 10, 'No está mal.'],
    [4, 10, 'Hay que practicar más.'],
    [0, 5, 'Hay que practicar más.'],
  ])('el resultado %i de %i dice la frase de su tramo', (score, total, phrase) => {
    render(<ResultScreen {...chrome} score={score} total={total} />);
    expect(
      screen.getByRole('heading', { name: `${String(score)} de ${String(total)}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`^${phrase.replace(/[.¡!]/g, '\\$&')}`)),
    ).toBeInTheDocument();
  });
});
